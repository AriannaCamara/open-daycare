-- Migración: create_users (SPEC 01)
-- Enums de usuario, tabla public.users, trigger de perfil, trigger de updated_at,
-- RLS de fila propia y seed de usuario staff loginable.
-- Aplicada vía MCP apply_migration con nombre "create_users".

-- 1. Enums ------------------------------------------------------------------

create type public.user_role as enum ('staff', 'parent', 'admin');
create type public.user_status as enum ('pending', 'active');

-- 2. Tabla ------------------------------------------------------------------

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  daycare_id uuid not null references public.daycares(id),
  role public.user_role not null,
  status public.user_status not null default 'active',
  full_name text not null,
  avatar_url text,
  notify_on_post boolean not null default true,
  daily_summary_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_daycare_id_idx on public.users (daycare_id);

-- 3. RLS: cada usuario solo ve/edita su propia fila --------------------------

alter table public.users enable row level security;

create policy "users_select_own"
  on public.users
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "users_update_own"
  on public.users
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

grant select, update on public.users to authenticated;

-- 4. Trigger: crea el perfil en public.users al insertar en auth.users ------
-- SECURITY DEFINER porque auth.users no es escribible por el rol del signup.
-- Falla a propósito si faltan daycare_id/role en los metadatos (mejor fallar
-- que crear un perfil sin tenant).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, daycare_id, role, full_name)
  values (
    new.id,
    (new.raw_user_meta_data ->> 'daycare_id')::uuid,
    (new.raw_user_meta_data ->> 'role')::public.user_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 5. Trigger: mantiene updated_at en cada update ----------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_users_updated_at
  before update on public.users
  for each row
  execute function public.set_updated_at();

-- 6. Seed: staff loginable (staff@opendaycare.dev / StaffTest123!) ----------
-- El perfil en public.users lo crea el trigger de arriba.

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-4111-a111-111111111111',
  'authenticated',
  'authenticated',
  'staff@opendaycare.dev',
  extensions.crypt('StaffTest123!', extensions.gen_salt('bf')),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  jsonb_build_object(
    'daycare_id', (select id from public.daycares limit 1),
    'role', 'staff',
    'full_name', 'Staff Test'
  ),
  now(),
  now()
);

insert into auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  email,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  u.id::text,
  u.id,
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true,
    'phone_verified', false,
    'provider', 'email'
  ),
  'email',
  u.email,
  now(),
  now(),
  now()
from auth.users u
where u.email = 'staff@opendaycare.dev';
