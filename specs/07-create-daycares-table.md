# SPEC 07 — Crear tabla `daycares` en Supabase

> **Estado:** Aprobado
> **Depende de:** — (primera spec de BD)
> **Fecha:** 2026-10-18
> **Objetivo:** Crear la tabla `public.daycares` en Supabase vía `apply_migration`, con RLS habilitado sin policies y una fila seed de prueba.

## Alcance

**Incluye:**

- Migración remota vía MCP `apply_migration` (nombre: `create_daycares`).
- DDL de `public.daycares` según la referencia `07-DB-Schema/opendaycare-database-schema.md` §1:
  - `id uuid PK default gen_random_uuid()`
  - `name text not null`
  - `created_at timestamptz not null default now()`
- `alter table ... enable row level security` sin policies (deny-all para `anon`/`authenticated`).
- Seed: una fila `'Guardería Sala Soles'`.
- Verificación post-migración: columnas, RLS activo, fila seed, advisors de seguridad.

**No incluye (fuera de esta spec):**

- Cualquier otra tabla del esquema (`users`, `rooms`, `children`, …).
- Policies de RLS (llegan cuando exista Auth/`users`).
- Grants a `anon`/`authenticated` para el Data API.
- Instalación de `@supabase/supabase-js` / `@supabase/ssr` o cliente Next.js.
- Carpeta local `supabase/` ni archivos `.sql` en el repo.
- Seed de más guarderías o datos relacionados.
- Actualizar el estado en `AGENTS.md`.

## Modelo de datos

```sql
create table public.daycares (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.daycares enable row level security;

insert into public.daycares (name) values ('Guardería Sala Soles');
```

## Plan de implementación

1. **Aplicar migración.** MCP `apply_migration` con `name: "create_daycares"` y el SQL anterior. → Migración registrada en el historial de Supabase.
2. **Verificar esquema.** MCP `list_tables` + `execute_sql`: existen las 3 columnas, PK en `id`, `rowsecurity = true`. → Esquema correcto.
3. **Verificar datos y RLS.** `execute_sql`: `select * from daycares` devuelve 1 fila; sin policy no hay lectura pública. → Seed OK, deny-all OK.
4. **Advisors.** MCP `get_advisors` (security). → Sin issues nuevos atribuibles a `daycares`.

## Criterios de aceptación

- [ ] `public.daycares` existe con columnas `id`, `name`, `created_at`.
- [ ] `id` es `uuid` PK con default `gen_random_uuid()`.
- [ ] `name` es `text` y no admite nulos.
- [ ] `created_at` es `timestamptz` con default `now()`.
- [ ] RLS está habilitado en la tabla.
- [ ] No hay policies creadas.
- [ ] Existe exactamente una fila: `name = 'Guardería Sala Soles'`.
- [ ] La migración `create_daycares` aparece en el historial de migraciones.
- [ ] Advisors de seguridad sin issues nuevos por esta tabla.

## Decisiones tomadas y descartadas

- **Sí:** columnas exactas de la referencia (`id`, `name`, `created_at`) — decisión del usuario; sin `updated_at`.
- **Sí:** solo MCP `apply_migration`, sin carpeta `supabase/` local — recomendación confirmada (AGENTS.md).
- **Sí:** RLS sin policies — decisión del usuario; deny-all hasta que exista Auth/`users`.
- **Sí:** seed `'Guardería Sala Soles'` — decisión del usuario; da un `daycare_id` real de referencia.
- **Sí:** `name not null` — constraint razonable; la referencia no especifica nulabilidad.
- **No:** grants a `anon`/`authenticated` — innecesarios con deny-all; se agregan con las primeras policies.
- **No:** `updated_at` — la referencia no lo incluye en `daycares`.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Data API podría no exponer tablas nuevas | Con RLS deny-all da igual; al exponer, revisar grants. |
| Sin `updated_at`, ediciones futuras no tienen timestamp | Aceptar; se agrega en migración aparte si hace falta. |
| Migración remota sin rollback local | `apply_migration` deja historial; reversión = migración `down` manual si se necesita. |

## Lo que **no** está en esta spec

- Otras tablas del esquema o relaciones FK.
- Policies de RLS o grants del Data API.
- Integración con la app Next.js o seed adicional.
