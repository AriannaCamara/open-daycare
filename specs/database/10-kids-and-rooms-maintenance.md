# SPEC 10 — Mantenimiento de niños y salas (`/kids` + tablas `rooms` / `children`)

> **Estado:** Aprobado
> **Depende de:** SPEC 02 (UI de `/kids`), SPEC 04 (modal "Agregar niño"), SPEC 07 (`daycares`), SPEC 09 (auth/guard)
> **Fecha:** 2026-10-22
> **Objetivo:** Crear las tablas `rooms` y `children` con 3 salas por defecto (Soles, Estrellas, Lunas), sin niños seed, y conectar `/kids` y el modal "Agregar niño" a Supabase para que el alta y el listado sean reales.

## Alcance

**Incluye:**

- **Migración** `supabase/migrations/<timestamp>_create_rooms_children.sql` (aplicada con MCP `apply_migration`):
  - Enum `child_status` (`active` / `archived`).
  - Tabla `rooms` (`id`, `daycare_id` FK → `daycares`, `name`, `created_at`; `unique (daycare_id, name)`).
  - Tabla `children` (según `@db-schema`: `room_id` FK → `rooms`, `full_name`, `birth_date`, `enrolled_at`, `medical_notes`, `allergy_tags text[]`, `photo_consent` default true, `status`, `created_at`/`updated_at`).
  - Índices: `rooms (daycare_id)`, `children (room_id)`.
  - Trigger `updated_at` en `children` (reutiliza `set_updated_at()` de SPEC 01).
  - **Seed:** 3 salas en la primera guardería: `Soles`, `Estrellas`, `Lunas`. **Cero niños.**
  - **RLS habilitada** en ambas tablas:
    - `rooms`: `select` para `authenticated`.
    - `children`: `select` para `authenticated`; `insert`/`update` solo para staff/admin vía helper `public.is_staff()` (`security definer`, evita recursión con RLS de `users`).
    - Grants: `select` a `authenticated`; `insert, update` en `children` a `authenticated` (RLS acota a staff).
- **Lectura real en `/kids`:** `app/kids/page.tsx` consulta `children` (status `active`) + `rooms` con el cliente server (`utils/supabase/server.ts`), dentro de un `<Suspense>` (obligatorio por `cacheComponents: true`), y pasa datos + salas a `KidsView`.
- **Listado agrupado por sala:** una sección por sala con su separador `SALA SOLES · N niños` (las 3 salas siempre visibles, aunque tengan 0); estado vacío global nuevo ("Todavía no hay niños…") cuando no hay ningún niño; el estado vacío de búsqueda ("Sin resultados") se mantiene.
- **Alta real desde el modal:** `AddChildModal` recibe `rooms: { id, name }[]` (select con value = `room_id`, "Soles" preseleccionado); al guardar hace `insert` en `children` con el cliente browser (`utils/supabase/client.ts`), agrega la fila devuelta a la lista y cierra el modal. Errores de Supabase → mensaje inline genérico ("No pudimos guardar el niño. Intentá de nuevo.").
- **Mapeo DB → vista:** `full_name`, nombre de sala, `birth_date` → edad + etiqueta, `enrolled_at` → etiqueta de ingreso, `allergy_tags[0]` en mayúsculas como pill, `medical_notes`, `parents: []` (pill VINCULAR), `tone` por rotación de índice (no se persiste).
- `app/_data/children.ts`: el array mock de 8 deja de usarse en `/kids` (el archivo se conserva intacto para `/kids/[id]`, fuera de alcance).

**No incluye:**

- Editar, archivar o eliminar niños; CRUD de salas desde UI.
- Perfil `/kids/[id]` con datos reales (sigue con los mocks; las tarjetas de la DB linkean a uuid y darán 404 — limitación aceptada).
- `parent_children`, fotos, consentimiento editado desde UI.
- Normalización de `allergy_tags` a valores en inglés (`peanut`…).
- Tests automatizados.

## Modelo de datos

Migración (resumen; el SQL completo vive en el archivo):

```sql
create type public.child_status as enum ('active', 'archived');

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  daycare_id uuid not null references public.daycares(id),
  name text not null,
  created_at timestamptz not null default now(),
  unique (daycare_id, name)
);

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

create or replace function public.is_staff() returns boolean
language sql security definer set search_path = ''
as $$ select exists (
  select 1 from public.users
  where id = (select auth.uid()) and role in ('staff','admin')
) $$;
```

Policies: `rooms_select` (`to authenticated`), `children_select`, `children_insert` / `children_update` (`using`/`with check` `public.is_staff()`).

Vista (el tipo `Child` de SPEC 02 se mantiene; solo cambia el origen):

```ts
// kids/page.tsx → async KidsViewServer (dentro de <Suspense>)
const supabase = await createClient();
// rooms: select id, name order by name; children: select + rooms(name) where status = 'active'
<KidsView initialKids={mapped} rooms={rooms} />
```

```ts
// add-child-modal.tsx — rooms desde props
rooms: { id: string; name: string }[];  // value del select = room_id
// kids-view.tsx — handleSave
supabase.from("children").insert({ full_name, birth_date, room_id,
  enrolled_at: today, medical_notes: nullIfEmpty,
  allergy_tags: allergies ? [allergies] : [] }).select().single();
```

## Plan de implementación

1. **Migración SQL.** Escribir el `.sql` completo (enums, tablas, índices, trigger, `is_staff()`, policies, grants, seed de 3 salas), commitearlo y aplicarlo con `apply_migration` (mismo nombre). → `list_tables` muestra `rooms` y `children` con RLS on; 3 filas en `rooms`, 0 en `children`.
2. **Query server + Suspense.** Crear `app/kids/kids-view-server.tsx` (async: fetch rooms + children, mapear a `Child` + `rooms`) y reescribir `app/kids/page.tsx`: Sidebar + `<Suspense fallback>` → `KidsViewServer`. → `/kids` renderiza sin mocks.
3. **Agrupar por sala + estado vacío.** Ajustar `kids-view.tsx` y `kids-directory.tsx`: secciones por sala con su separador y contador, estado vacío global. → 3 secciones visibles (Soles/Estrellas/Lunas con 0).
4. **Modal con salas reales + insert.** `add-child-modal.tsx` con select de `rooms` (props); `kids-view.tsx` `handleSave` inserta con cliente browser, agrega la fila devuelta y cierra. → alta persistente.
5. **Verificación.** Playwright a 1440/768/375 (lista vacía, alta, recarga con persistencia, validaciones del modal intactas); `execute_sql` confirma la fila; `npm run lint` y `npx tsc --noEmit`.

## Criterios de aceptación

- [ ] Existe `supabase/migrations/<ts>_create_rooms_children.sql` y su contenido coincide con la BD.
- [ ] `rooms` y `children` existen con RLS habilitada; `children` tiene 0 filas tras la migración.
- [ ] Hay exactamente 3 salas: Soles, Estrellas, Lunas (en la guardería seed).
- [ ] `/kids` (con sesión) muestra 3 secciones con su separador y contador "0 niños", y el estado vacío global.
- [ ] El modal muestra SALA con las 3 opciones y "Soles" preseleccionado.
- [ ] Guardar un niño válido inserta la fila en `children` (verificable con `execute_sql`) y la tarjeta aparece con nombre, edad, sala y pill VINCULAR.
- [ ] Tras recargar `/kids`, el niño sigue en la lista (persistencia real).
- [ ] Las validaciones del modal (nombre, fecha no futura, sala) siguen mostrando sus mensajes y no insertan.
- [ ] Sin sesión, `/kids` redirige a `/login` (SPEC 09 intacta).
- [ ] Buscar sin resultados muestra "Sin resultados"; la búsqueda agrupa igual por sala.
- [ ] `npm run lint` y `npx tsc --noEmit` sin errores.

## Decisiones tomadas y descartadas

- **Sí:** 3 secciones de sala siempre visibles aunque estén vacías — visibilidad de las salas por defecto y del contador real.
- **Sí:** mantener el mock de `children.ts` para `/kids/[id]` — decisión del usuario ("vamos paso a paso"); el perfil real va en otra spec.
- **Sí:** insert con cliente browser + append de la fila devuelta — mismo patrón que el login (SPEC 09); evita sincronizar props de server tras `refresh()`.
- **Sí:** `is_staff()` `security definer` para las policies de escritura — evita recursión RLS con la tabla `users`.
- **Sí:** `allergy_tags` guarda el texto del input como un único elemento crudo — el input es texto libre; normalizar a tags en inglés queda fuera.
- **Sí:** `unique (daycare_id, name)` en `rooms` — evita salas duplicadas por bug de UI.
- **Sí:** `enrolled_at = current_date` en el alta — reemplaza el `admissionLabel` derivado del reloj.
- **Sí:** `tone` por rotación de índice al mapear — no se persiste; mismo efecto visual que el mock.
- **Descartado:** editar/archivar niños, gestión de salas desde UI, perfil con datos reales, borrar el archivo mock, tags de alergias normalizados/chips.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `cacheComponents: true` falla el build si hay fetch uncached fuera de `<Suspense>` | Query vive en `KidsViewServer` montado bajo `<Suspense>`; fallback mínimo |
| RLS recursion: policy de `children` consultando `users` | Helper `is_staff()` `security definer` |
| Tarjeta de niño real linkea a `/kids/[id]` (uuid) → 404 | Limitación aceptada y documentada; el perfil es otra spec |
| Fallo de red/permiso al insertar | Mensaje inline genérico; la lista no se altera si el insert falla |
