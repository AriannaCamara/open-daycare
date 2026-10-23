-- Migración: create_parent_invitations (SPEC 12)
-- Enums relationship_type e invitation_status, tablas parent_children e
-- invitations, índices, helper is_staff_of_child() (security definer),
-- funciones get_invitation_by_code() / accept_parent_invitation(),
-- RLS + grants. Aplicada vía MCP apply_migration con nombre
-- "create_parent_invitations".

-- 1. Enums -------------------------------------------------------------------

create type public.relationship_type as enum ('father', 'mother', 'guardian');
create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'cancelled');

-- 2. Tabla parent_children ---------------------------------------------------

create table public.parent_children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  relationship public.relationship_type not null,
  created_at timestamptz not null default now(),
  unique (parent_id, child_id)
);

create index parent_children_child_id_idx on public.parent_children (child_id);

-- 3. Tabla invitations -------------------------------------------------------

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  invited_by uuid not null references public.users(id),
  full_name text not null,
  email text not null,
  relationship public.relationship_type not null,
  code text not null unique,
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Para el fetch del panel: invitaciones pendientes de un niño.
create index invitations_child_id_status_idx on public.invitations (child_id, status);

-- 4. Helper is_staff_of_child() ---------------------------------------------
-- SECURITY DEFINER para evitar recursión RLS: verifica que el usuario actual
-- sea staff/admin de la misma guardería que el niño (children → rooms).
-- Igual patrón que public.is_staff() de SPEC 10.

create or replace function public.is_staff_of_child(p_child_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.children c
    join public.rooms r on r.id = c.room_id
    join public.users u
      on u.daycare_id = r.daycare_id
     and u.id = (select auth.uid())
    where c.id = p_child_id
      and u.role in ('staff', 'admin')
  )
$$;

-- 5. Función get_invitation_by_code() ----------------------------------------
-- Ruta pública (/activate-account): devuelve solo campos seguros de la
-- invitación pendiente y no vencida; null si no existe.

create or replace function public.get_invitation_by_code(p_code text)
returns table (
  id uuid,
  email text,
  full_name text,
  relationship public.relationship_type,
  child_full_name text,
  room_name text,
  daycare_id uuid,
  expires_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select
    i.id,
    i.email,
    i.full_name,
    i.relationship,
    c.full_name as child_full_name,
    r.name as room_name,
    r.daycare_id,
    i.expires_at
  from public.invitations i
  join public.children c on c.id = i.child_id
  join public.rooms r on r.id = c.room_id
  where i.code = p_code
    and i.status = 'pending'
    and i.expires_at > now()
$$;

-- 6. Función accept_parent_invitation() --------------------------------------
-- Marcada accepted e inserta parent_children. Solo el usuario autenticado
-- cuyo email coincide con la invitación.

create or replace function public.accept_parent_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_invitation record;
begin
  if v_uid is null then
    raise exception 'No estás autenticado.';
  end if;

  select email into v_email
  from auth.users
  where id = v_uid;

  select * into v_invitation
  from public.invitations
  where id = p_invitation_id;

  if not found then
    raise exception 'La invitación no es válida o está vencida.';
  end if;

  if v_invitation.status <> 'pending' or v_invitation.expires_at <= now() then
    raise exception 'La invitación no es válida o está vencida.';
  end if;

  if v_email is null or lower(v_email) <> lower(v_invitation.email) then
    raise exception 'El email de tu cuenta no coincide con la invitación.';
  end if;

  update public.invitations
  set status = 'accepted',
      accepted_at = now()
  where id = p_invitation_id
    and status = 'pending'
    and expires_at > now();

  if not found then
    raise exception 'La invitación no es válida o está vencida.';
  end if;

  insert into public.parent_children (parent_id, child_id, relationship)
  values (v_uid, v_invitation.child_id, v_invitation.relationship)
  on conflict (parent_id, child_id) do nothing;
end;
$$;

-- 7. RLS ---------------------------------------------------------------------

alter table public.parent_children enable row level security;
alter table public.invitations enable row level security;

-- Helper: daycare_id del usuario actual. Security definer para evitar
-- recursión RLS al consultar public.users desde una policy de users.
create or replace function public.auth_daycare_id()
returns uuid
language sql
security definer
set search_path = ''
as $$
  select daycare_id from public.users where id = (select auth.uid())
$$;

-- Policy en users: el staff/admin ve los usuarios de su misma guardería.
-- Sin esto, el join parent_children → users devuelve null para el nombre
-- del padre (la policy own de users solo deja ver la fila propia).
create policy "users_select_same_daycare_staff"
  on public.users
  for select
  to authenticated
  using (
    public.is_staff()
    and daycare_id = public.auth_daycare_id()
  );

-- parent_children: el propio padre ve su vínculo; el staff/admin del daycare
-- del niño también. Sin policy de insert/update para clientes: lo hace la
-- función accept_parent_invitation (security definer).

create policy "parent_children_select_own_or_staff"
  on public.parent_children
  for select
  to authenticated
  using (
    parent_id = (select auth.uid())
    or public.is_staff_of_child(child_id)
  );

-- invitations: solo staff/admin del mismo daycare del niño (select/update);
-- insert solo si el usuario es staff de ese niño y es quien firma como
-- invitante. La aceptación en la activación va por la función security definer.

create policy "invitations_select_staff"
  on public.invitations
  for select
  to authenticated
  using (public.is_staff_of_child(child_id));

create policy "invitations_insert_staff"
  on public.invitations
  for insert
  to authenticated
  with check (
    public.is_staff_of_child(child_id)
    and invited_by = (select auth.uid())
  );

create policy "invitations_update_staff"
  on public.invitations
  for update
  to authenticated
  using (public.is_staff_of_child(child_id))
  with check (public.is_staff_of_child(child_id));

-- Delete para que la server action pueda limpiar la invitación si falla el
-- envío del correo (sin policy de delete, el delete falla en silencio por RLS).
create policy "invitations_delete_staff"
  on public.invitations
  for delete
  to authenticated
  using (public.is_staff_of_child(child_id));

-- 8. Grants ------------------------------------------------------------------

grant select on public.parent_children to authenticated;
grant select, insert, update, delete on public.invitations to authenticated;

-- 9. Execute de funciones ----------------------------------------------------
-- get_invitation_by_code es pública (la ruta de activación es anónima);
-- accept_parent_invitation solo para autenticados.

revoke execute on function public.get_invitation_by_code(text) from public;
grant execute on function public.get_invitation_by_code(text) to anon, authenticated;

revoke execute on function public.accept_parent_invitation(uuid) from public;
grant execute on function public.accept_parent_invitation(uuid) to authenticated;

revoke execute on function public.auth_daycare_id() from public;
grant execute on function public.auth_daycare_id() to authenticated;
