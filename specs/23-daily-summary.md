# SPEC 23 — Resumen del día (vista familiar + registro del staff)

> **Estado:** Aprobado
> **Depende de:** SPEC 16 (staff post publishing), SPEC 18 (family child profile)
> **Fecha:** 2026-11-18
> **Objetivo:** Permitir a la familia ver el "Resumen del día" de cada hijo (métricas, ánimo, momento destacado y línea de momentos) y al staff registrarlo desde el perfil del niño.

## Alcance

**Incluye:**

1. **Tabla `daily_summaries`** (schema de referencia `@db-schema` §12): un registro por niño por día, con `UNIQUE (child_id, date)`. Migración en `supabase/migrations/20261118000000_create_daily_summaries.sql`.
2. **RLS en `daily_summaries`:**
   - `SELECT` para `parent` solo si el niño está vinculado vía `parent_children` (mismo patrón que `children`).
   - `SELECT`, `INSERT`, `UPDATE` para `staff` y `admin`.
   - Sin acceso para `anon`.
3. **Vista familiar `/family/daily-summary`** (`app/family/daily-summary/page.tsx`), basada en `references/pantallas/resumen-dia.dc.html`:
   - Cabecera con pestañas por hijo (como `kids-directory`).
   - Título "El día de {nombre}" + fecha de hoy en español.
   - 3 tarjetas de métricas: comidas, siesta (formato `1h 30`), momentos.
   - Tarjeta "Ánimo del día".
   - Bloque "Lo más lindo de hoy".
   - Línea de tiempo de momentos con hora (`HH:MM`), tomada de los `posts` del día etiquetados con el niño vía `post_children`.
4. **Server action** `app/_actions/daily-summary.ts`: `upsertDailySummary` (staff/admin, por `child_id` + `date` de hoy).
5. **Data layer** `app/_data/daily-summary.ts`: lectura del resumen del día y de los momentos del día.
6. **Modal staff** `app/_components/daily-summary-modal.tsx` (campos: comidas, siesta en minutos, momentos, ánimo, "lo más lindo"), abierto desde el botón "Resumen del día" de `app/_components/parents-panel.tsx`. **Se reemplaza el `<Link href="/daily-summary">` actual, que hoy apunta a una ruta inexistente (404).**
7. **Nav familiar**: item `{ href: "/family/daily-summary", label: "Resumen del día" }` en `navItemsByPanel.family` de `app/_components/sidebar.tsx`.

**No incluye (fuera de esta spec):**

- Historial de días anteriores ni calendario: la vista es **solo el día de hoy**.
- Generación automática del resumen (cron/trigger): lo escribe el staff a mano.
- Edición del resumen por parte de la familia: la familia solo lee.
- Acceso al resumen desde el perfil familiar del hijo (`/family/kids/[id]`): solo la pantalla dedicada.
- Tabla `devices` ni notificaciones (push/email del resumen).
- Cambios en el feed o en las publicaciones.

## Modelo de datos

```sql
-- supabase/migrations/20261118000000_create_daily_summaries.sql
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
```

- `sleep_minutes` se guarda en minutos; la UI lo formatea como `1h 30`.
- "Momentos" de la línea de tiempo **no** es una columna: se calcula leyendo `posts` del día (`created_at` de hoy) con `post_children.child_id = {child}`.
- Convención de fecha: `date` se compara con `current_date` del servidor Supabase (UTC). Ver riesgos.

## Plan de implementación

1. **Migración**: crear el archivo con la tabla + políticas RLS → `apply_migration` por MCP → verificar con query de prueba (select como parent vinculado y como parent no vinculado).
2. **Data layer** `app/_data/daily-summary.ts`: `getDailySummary(childId)` (fila de hoy o `null`) y `getDailyMoments(childId)` (posts de hoy con hora) → log de verificación en dev.
3. **Server action** `app/_actions/daily-summary.ts`: `upsertDailySummary` con guarda de rol (`staff`/`admin`) usando el patrón de `app/_actions/posts.ts` → probar desde el REPL de Server Actions o al guardar en el paso 5.
4. **Modal staff** `app/_components/daily-summary-modal.tsx`: formulario con los 5 campos, precarga si ya existe registro, errores con la caja rosa canónica (SPEC 21) → abrirlo desde `parents-panel.tsx` en lugar del `Link` colgante.
5. **Vista familiar** `app/family/daily-summary/page.tsx`: pestañas de hijos + tarjetas + línea de tiempo, con estado vacío "Todavía no hay resumen para hoy" → verificar en `/family/daily-summary`.
6. **Nav**: item en `sidebar.tsx` → verificar resaltado del item activo.
7. **Verificación final**: Playwright en 1440/768/375 + `npm run lint` + `npx tsc --noEmit`.

## Criterios de aceptación

- [ ] `/family/daily-summary` renderiza sin errores para un `parent` con sesión válida.
- [ ] Con registro existente, se muestran comidas, siesta formateada (`1h 30`), momentos, ánimo y "lo más lindo" del día de hoy.
- [ ] Sin registro, se ve el estado vacío "Todavía no hay resumen para hoy".
- [ ] La línea de tiempo lista los posts de hoy etiquetados con el niño, con su hora `HH:MM`, y está vacía si no hay posts.
- [ ] El staff guarda el resumen desde el modal y, al recargar la vista familiar, los datos persisten.
- [ ] Un `parent` **no** puede hacer `INSERT`/`UPDATE` en `daily_summaries` (verificado por RLS, no por UI).
- [ ] Un `parent` **no** ve resúmenes de niños no vinculados a él (verificado por RLS).
- [ ] `anon` no tiene acceso a la tabla.
- [ ] El botón "Resumen del día" del perfil de niño staff abre el modal (ya no navega a 404).
- [ ] El item "Resumen del día" aparece en el sidebar familiar y se resalta en `/family/daily-summary`.
- [ ] La vista se ve correcta en 1440, 768 y 375 px (capturas en `.playwright-mcp/`).
- [ ] `npm run lint` y `npx tsc --noEmit` sin errores.

## Decisiones tomadas y descartadas

**Del usuario:**

1. **Tabla guardada `daily_summaries`.** Descartado: calcular en vivo agregando los posts (el "ánimo" y "lo más lindo" no salen de ningún lado) y el híbrido (dos orígenes de datos para un mismo bloque).
2. **Staff escribe, familia lee.** Descartado: generación automática con cron (más infraestructura de la necesaria) y que la familia edite (rol de lectura).
3. **Solo pantalla dedicada `/family/daily-summary`.** Descartado por ahora: acceso también desde `/family/kids/[id]`.
4. **Solo fecha actual, sin historial.** Descartado: calendario / días anteriores (spec aparte si algún día se pide).
5. **Momentos = posts del día existentes** (`post_children`). Descartado: tabla nueva de momentos (duplicaría datos con el feed).
6. **Modal del staff en `parents-panel.tsx`.** Descartado: página propia `/staff/kids/[id]/summary` (rompería el patrón de modales del proyecto y el botón ya existe ahí).
7. **Ruta `/family/daily-summary` con item de nav.** Descartado: reutilizar la ruta colgante `/daily-summary` (queda fuera del prefijo `/family/*` que protege el proxy).

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| RLS incompleta en `daily_summaries` filtra datos entre guarderías | Copiar el patrón de políticas de `children` y verificar con las queries de prueba del paso 1 antes de continuar. |
| `current_date` (UTC) vs fecha local del staff: un registro creado tarde puede caer en "otro día" | Usar siempre `current_date` del servidor en escritura y lectura (consistente entre ambos lados). Si se reporta desfase, migrar a fecha local del daycare en otra spec. |
| Posts sin `post_children` (niño no etiquetado) no aparecen en la línea de tiempo | Es el comportamiento deseado (mismo criterio que el feed). Documentado en el estado vacío del bloque. |

## What is **not** in this spec

- Historial de resúmenes anteriores / calendario.
- Generación automática del resumen.
- Edición familiar del resumen.
- Acceso al resumen desde el perfil del hijo.
- Notificaciones ni tabla `devices`.
