-- Migración: create_daily_summaries (SPEC 23)
-- Tabla daily_summaries (un registro por niño por día, UNIQUE child_id+date),
-- trigger updated_at, RLS (staff/admin escribe y lee; parent vinculado solo
-- lee; anon sin acceso) y grants. Reutiliza is_staff() de SPEC 10 y
-- is_parent_of_child() de SPEC 18.
-- Aplicada vía MCP apply_migration con nombre "create_daily_summaries".

-- 1. Tabla -------------------------------------------------------------------

create table public.daily_summaries (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  date date not null,
  meals_count int,
  sleep_minutes int,
  activities_count int,
  mood text,
  highlight text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (child_id, date)
);

-- 2. Trigger: mantiene updated_at en cada update ----------------------------
-- Reutiliza public.set_updated_at() de SPEC 01.

create trigger set_daily_summaries_updated_at
  before update on public.daily_summaries
  for each row
  execute function public.set_updated_at();

-- 3. RLS ---------------------------------------------------------------------
-- Lectura: staff/admin (is_staff()) o padre vinculado al niño
-- (is_parent_of_child, mismo patrón que child_notes/child_profile).
-- Escritura: solo staff/admin. Todas las policies son "to authenticated":
-- anon no tiene ninguna vía de lectura ni de escritura.

alter table public.daily_summaries enable row level security;

create policy "daily_summaries_select_staff_or_parent"
  on public.daily_summaries
  for select
  to authenticated
  using (
    public.is_staff()
    or public.is_parent_of_child(child_id)
  );

create policy "daily_summaries_insert_staff"
  on public.daily_summaries
  for insert
  to authenticated
  with check (public.is_staff());

create policy "daily_summaries_update_staff"
  on public.daily_summaries
  for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Sin policy de delete: el resumen no se borra (mismo criterio que child_profile).

-- 4. Grants ------------------------------------------------------------------
-- select/insert/update a authenticated (RLS acota a los roles); revoke total
-- de anon para que la única vía de acceso sea autenticada (defensa en
-- profundidad, patrón de revoke_anon_feed_table_privileges).

grant select, insert, update on public.daily_summaries to authenticated;
revoke all on public.daily_summaries from anon;
