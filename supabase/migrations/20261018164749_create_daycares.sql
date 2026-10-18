-- Migración: create_daycares (ya aplicada vía MCP apply_migration, versión 20261018164749)
-- Espejo del SQL aplicado en SPEC 07. Fuente de verdad versionable del historial local.

create table public.daycares (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.daycares enable row level security;

insert into public.daycares (name) values ('Guardería Sala Soles');
