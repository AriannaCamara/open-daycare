-- Migración: create_rooms_children (SPEC 10)
-- Enum child_status, tablas rooms y children, índices, trigger updated_at,
-- helper is_staff() (security definer), RLS + grants y seed de 3 salas.
-- Aplicada vía MCP apply_migration con nombre "create_rooms_children".

-- 1. Enum -------------------------------------------------------------------

create type public.child_status as enum ('active', 'archived');

-- 2. Tabla rooms ------------------------------------------------------------

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  daycare_id uuid not null references public.daycares(id),
  name text not null,
  created_at timestamptz not null default now(),
  unique (daycare_id, name)
);

create index rooms_daycare_id_idx on public.rooms (daycare_id);

-- 3. Tabla children ---------------------------------------------------------

create table public.children (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id),
  full_name text not null,
  birth_date date not null,
  enrolled_at date not null default current_date,
  medical_notes text,
  allergy_tags text[] not null default '{}',
  photo_consent boolean not null default true,
  status public.child_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index children_room_id_idx on public.children (room_id);

-- 4. Trigger: mantiene updated_at en cada update de children ----------------
-- Reutiliza public.set_updated_at() de SPEC 01.

create trigger set_children_updated_at
  before update on public.children
  for each row
  execute function public.set_updated_at();

-- 5. Helper is_staff() ------------------------------------------------------
-- SECURITY DEFINER para evitar recursión RLS: la policy de children consulta
-- public.users, que a su vez tiene RLS. Ejecuta con los privilegios del
-- creador (postgres, bypassrls) y con search_path vacío.

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users
    where id = (select auth.uid())
      and role in ('staff', 'admin')
  )
$$;

-- 6. RLS --------------------------------------------------------------------

alter table public.rooms enable row level security;
alter table public.children enable row level security;

create policy "rooms_select"
  on public.rooms
  for select
  to authenticated
  using (true);

create policy "children_select"
  on public.children
  for select
  to authenticated
  using (true);

create policy "children_insert"
  on public.children
  for insert
  to authenticated
  with check (public.is_staff());

create policy "children_update"
  on public.children
  for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- 7. Grants -----------------------------------------------------------------
-- select a authenticated en ambas tablas; insert/update en children a
-- authenticated (RLS acota a staff via is_staff()).

grant select on public.rooms to authenticated;
grant select, insert, update on public.children to authenticated;

-- 8. Seed: 3 salas en la primera guardería, cero niños ----------------------

insert into public.rooms (daycare_id, name)
select id, room_name
from public.daycares
cross join (values ('Soles'), ('Estrellas'), ('Lunas')) as t(room_name)
where id = (select id from public.daycares order by created_at limit 1);
