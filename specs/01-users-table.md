# SPEC 01 — Tabla users y enums de usuario

> **Status:** Aprobado
> **Depends on:** — (requiere `public.daycares`, ya creada en migración `20261018164749`)
> **Date:** 2026-10-19
> **Objective:** Crear la tabla `public.users` con sus enums (`user_role`, `user_status`), un trigger que crea el perfil al registrarse vía Supabase Auth, RLS de filas propias y un usuario staff de prueba loginable.

## Scope

**In:**

- Enums `user_role` (`staff`/`parent`/`admin`) y `user_status` (`pending`/`active`).
- Tabla `public.users` (columnas del diccionario `07-DB-Schema`), `daycare_id NOT NULL` FK → `daycares`, índice en `daycare_id`.
- Trigger `SECURITY DEFINER` `AFTER INSERT` en `auth.users` que crea la fila de perfil usando `raw_user_meta_data` (`daycare_id`, `role`, `full_name`).
- Trigger `before update` que mantiene `updated_at`.
- RLS habilitado: `SELECT`/`UPDATE` solo de la propia fila (`id = auth.uid()`).
- Seed en la migración: usuario staff loginable (`staff@opendaycare.dev` / `StaffTest123!`, uuid fijo) en `auth.users` + `auth.identities`; el perfil en `public.users` lo crea el trigger.
- Migración versionada en `supabase/migrations/`, commiteada y aplicada vía MCP.

**Out of scope (for future specs):**

- Cliente `@supabase/ssr` / pantallas de login o perfil.
- Flujo de signup/invitaciones (el trigger solo reacciona a inserts en `auth.users`).
- Tablas `parent_children`, `invitations`, `rooms`, `children`, `posts`, etc.
- Enums de otras entidades (`relationship_type`, `post_type`, `child_status`, `invitation_status`).
- Política de lectura de usuarios del mismo daycare.
- Baja/borrado de usuarios.

## Data model

```sql
create type public.user_role as enum ('staff', 'parent', 'admin');
create type public.user_status as enum ('pending', 'active');

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
```

Convenciones: identificadores y valores de enum en inglés; el trigger usa `coalesce(full_name, split_part(email,'@',1))` como fallback; policies con `(select auth.uid()) = id` a rol `authenticated`.

## Implementation plan

1. Escribir `supabase/migrations/20261019HHMMSS_create_users.sql` con enums + tabla + índice. Commit del archivo.
2. Aplicar vía MCP `apply_migration` (mismo nombre). Verificar enums y tabla con queries a `pg_type` / `information_schema`.
3. Verificar el trigger: insertar un `auth.users` temporal con metadata válida y confirmar que aparece su fila en `public.users`; limpiar el temporal.
4. Verificar RLS: en transacción `set local role authenticated` + `request.jwt.claims` con el uuid del staff → `select` devuelve solo su fila; con otro uuid → 0 filas; `update` de la propia fila funciona y mueve `updated_at`.
5. Verificar el seed: fila en `auth.users` con email confirmado + fila en `auth.identities` + perfil con `role='staff'`, `status='active'` y `daycare_id` del daycare existente.

## Acceptance criteria

- [ ] Existen los enums `user_role` y `user_status` con los valores del diccionario.
- [ ] Existe `public.users` con las columnas del diccionario, `daycare_id NOT NULL` con FK a `daycares` y el índice `users_daycare_id_idx`.
- [ ] RLS está habilitado en `public.users`.
- [ ] Insertar en `auth.users` con metadata válida crea automáticamente la fila en `public.users` (trigger).
- [ ] Un `authenticated` con `sub` = uuid del staff ve exactamente su propia fila con `select * from users`.
- [ ] Un `authenticated` con otro uuid no ve ninguna fila del staff.
- [ ] `update` de la propia fila como `authenticated` funciona y actualiza `updated_at`.
- [ ] El staff seed tiene filas en `auth.users` (email confirmado), `auth.identities` y `public.users` con `role='staff'` y el `daycare_id` existente.
- [ ] La migración está commiteada en `supabase/migrations/` y aplicada vía MCP con el mismo nombre.
- [ ] `npm run lint` y `npx tsc --noEmit` pasan sin errores.

## Decisions

- **Yes:** trigger en `auth.users` ahora — definido en el diccionario; evita duplicar lógica cuando llegue el spec de signup.
- **No:** email/password en `public.users` — ya los gestiona Supabase Auth.
- **Yes:** staff seed loginable — permite probar RLS hoy y el login más adelante.
- **No:** políticas de lectura por daycare — se agregan cuando existan invitaciones/feed.
- **Yes:** `daycare_id NOT NULL` — el modelo es centrado en el daycare.
- **No:** `FORCE ROW LEVEL SECURITY` — rompería los seeds (el dueño debe bypassear RLS).
- **Yes:** password de prueba `StaffTest123!` documentado en la migración — aceptable en dev; rotar si algún día hay staging compartido.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Seed de `auth.users`/`auth.identities` falla por cambios de columnas en GoTrue | Usar solo columnas documentadas; si `apply_migration` falla, inspeccionar la estructura actual de `auth` y ajustar antes de re-aplicar. |
| Signup sin metadata → violación NOT NULL | Fallback de `full_name` desde el email; faltar `daycare_id`/`role` falla a propósito (mejor fallar que crear perfil sin tenant). |

## What is **not** in this spec

- Login UI, cliente Supabase en la app, signup/invitaciones.
- Resto de tablas y enums del diccionario.
- Lectura de usuarios del mismo daycare.
- Baja de usuarios.
