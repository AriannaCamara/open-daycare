-- Migración: create_child_profile_and_notes (SPEC 18)
-- Tablas child_profile (1:1 con children) y child_notes, índices, triggers
-- updated_at, helper is_parent_of_child() (security definer), RLS + grants.
-- Aplicada vía MCP apply_migration con nombre "create_child_profile_and_notes".

-- 1. Tabla child_profile ------------------------------------------------------
-- 1:1 con children: campos de cuidados que aporta el padre.
-- La primera edición la crea vía upsert (on conflict child_id).

create table public.child_profile (
  child_id uuid primary key references public.children(id) on delete cascade,
  emergency_contact text,
  pickup_authorization text,
  diet text,
  medication text,
  nap_schedule text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Tabla child_notes --------------------------------------------------------
-- Aclaraciones que el padre agrega, edita y borra una por una.

create table public.child_notes (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  author_id uuid not null references public.users(id),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Para el fetch del detalle: notas de un niño por fecha.
create index child_notes_child_id_idx on public.child_notes (child_id);

-- 3. Triggers: mantienen updated_at en cada update ---------------------------
-- Reutiliza public.set_updated_at() de SPEC 01.

create trigger set_child_profile_updated_at
  before update on public.child_profile
  for each row
  execute function public.set_updated_at();

create trigger set_child_notes_updated_at
  before update on public.child_notes
  for each row
  execute function public.set_updated_at();

-- 4. Helper is_parent_of_child() ---------------------------------------------
-- SECURITY DEFINER para evitar recursión RLS: verifica el vínculo en
-- parent_children sin que las policies de esa tabla se re-evalúen.
-- Igual patrón que public.is_staff() de SPEC 10.

create or replace function public.is_parent_of_child(p_child_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.parent_children
    where child_id = p_child_id
      and parent_id = (select auth.uid())
  )
$$;

-- 5. RLS ----------------------------------------------------------------------

alter table public.child_profile enable row level security;
alter table public.child_notes enable row level security;

-- child_profile: select staff o padre vinculado; insert/update solo el padre
-- vinculado. Sin policy de delete (la ficha no se borra).

create policy "child_profile_select_staff_or_parent"
  on public.child_profile
  for select
  to authenticated
  using (
    public.is_staff()
    or public.is_parent_of_child(child_id)
  );

create policy "child_profile_insert_parent"
  on public.child_profile
  for insert
  to authenticated
  with check (public.is_parent_of_child(child_id));

create policy "child_profile_update_parent"
  on public.child_profile
  for update
  to authenticated
  using (public.is_parent_of_child(child_id))
  with check (public.is_parent_of_child(child_id));

-- child_notes: select staff o padre vinculado; insert solo el padre vinculado
-- y solo como autor; update/delete solo el autor de la nota.

create policy "child_notes_select_staff_or_parent"
  on public.child_notes
  for select
  to authenticated
  using (
    public.is_staff()
    or public.is_parent_of_child(child_id)
  );

create policy "child_notes_insert_parent_author"
  on public.child_notes
  for insert
  to authenticated
  with check (
    public.is_parent_of_child(child_id)
    and author_id = (select auth.uid())
  );

create policy "child_notes_update_author"
  on public.child_notes
  for update
  to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

create policy "child_notes_delete_author"
  on public.child_notes
  for delete
  to authenticated
  using (author_id = (select auth.uid()));

-- children: el padre vinculado puede update (medical_notes, allergy_tags,
-- photo_consent). RLS no distingue columnas: la lista blanca vive en la
-- action. Como policy permissiva, se combina en OR con children_update (staff).

create policy "children_update_parent_linked"
  on public.children
  for update
  to authenticated
  using (public.is_parent_of_child(id))
  with check (public.is_parent_of_child(id));

-- 6. Grants -------------------------------------------------------------------
-- select en ambas a authenticated; insert/update en child_profile;
-- insert/update/delete en child_notes.

grant select, insert, update on public.child_profile to authenticated;
grant select, insert, update, delete on public.child_notes to authenticated;

-- 7. Execute del helper -------------------------------------------------------
-- is_parent_of_child solo para autenticados (patrón de is_staff).

revoke execute on function public.is_parent_of_child(uuid) from public, anon;
grant execute on function public.is_parent_of_child(uuid) to authenticated;
