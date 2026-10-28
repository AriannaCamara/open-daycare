# SPEC 14 — Contador de niños real y fecha actual en el header del feed

> **Estado:** Implementado
> **Depende de:** SPEC 13 (sesión real + saludo del feed)
> **Fecha:** 2026-10-28
> **Objetivo:** Reemplazar el mock "12 niños · martes 17 jun" del header del feed por el conteo real de niños activos en la base de datos y la fecha del día actual.

## Alcance

**Incluye:**

- Helper `fetchFeedSummary(supabase)` en `app/_data/feed.ts`: cuenta `children` con `status = 'active'` (todas las salas) vía el cliente server y devuelve `{ childCount, dateLabel }`.
- `dateLabel`: fecha de hoy con `Intl.DateTimeFormat("es-AR", …)` con `timeZone: "America/Argentina/Buenos_Aires"`, normalizada al formato exacto `"martes 28 oct"` (minúsculas, sin coma ni punto).
- Pluralización: `1 niño` / `0-2+ niños`.
- `app/page.tsx`: `FeedWithSession` arma el `RoomSummary` real y lo pasa a `FeedView`.
- Tipo `SidebarRoom { roomName }`: `AppSidebar`/`Sidebar` dejan de recibir `childCount`/`dateLabel` (dejan de arrastrar números mock).

**No incluye:**

- Cambiar "Sala Soles" por el nombre real de sala o guardería (decisión del usuario: queda mock).
- Migraciones o cambios de RLS (ya existe `children_select` para `authenticated`).
- Refresco de la fecha con la pestaña abierta (se actualiza al navegar/recargar).
- Los posts del feed siguen siendo mock.

## Modelo de datos

No introduce estructuras en la DB. Cambios de tipos en `app/_data/feed.ts`:

```ts
export interface SidebarRoom {
  roomName: string;
}

export interface RoomSummary extends SidebarRoom {
  childCount: number;
  dateLabel: string; // "martes 28 oct"
}

export async function fetchFeedSummary(
  supabase: SupabaseClient,
): Promise<Pick<RoomSummary, "childCount" | "dateLabel">>;
```

El mock exportado `room` pasa a ser solo `{ roomName: "Sala Soles" }`.

## Plan de implementación

1. **Helpers en `feed.ts`.** Agregar `formatTodayLabel()` (Intl es-AR + normalización + zona horaria fija) y `fetchFeedSummary(supabase)` (count con `head: true`, `eq("status", "active")`), sin tocar el mock todavía. → Compila y la UI no cambia.
2. **Feed con datos reales.** En `app/page.tsx`, `FeedWithSession` compone `room = { ...room, ...await fetchFeedSummary(supabase) }`. → El header muestra el conteo real y la fecha de hoy (ya es verificable en el navegador).
3. **Tipos `SidebarRoom`.** `AppSidebar` y `Sidebar` pasan a recibir `SidebarRoom`; el mock `room` se reduce a `{ roomName }`; `page.tsx` arma el `RoomSummary` completo solo para `FeedView`. → Compila, sidebar sigue mostrando "Sala Soles".
4. **Verificación.** Playwright en `/` (1440/768/375), query de conteo en DB, `npm run lint` y `npx tsc --noEmit`.

## Criterios de aceptación

- [x] `/` muestra el resultado de `select count(*) from children where status = 'active'` (hoy: 2).
- [x] La fecha es la del día actual en `America/Argentina/Buenos_Aires` con formato exacto `"martes 28 oct"`.
- [x] Con 1 niño activo el texto es `1 niño`; con 0 es `0 niños`.
- [x] `"12 niños"` y `"martes 17 jun"` ya no están hardcodeados en el código.
- [x] La sidebar y el header siguen mostrando "Sala Soles" (mock intacto).
- [x] Al crear un niño activo y recargar `/`, el contador sube.
- [x] Con sesión parent el contador da el mismo número que con staff.
- [x] `npm run lint` y `npx tsc --noEmit` sin errores.

## Decisiones tomadas y descartadas

- **Sí:** contar activos de todas las salas — decisión del usuario; la línea habla de "GUARDERÍA" y evita "0 niños" por sala vacía.
- **Sí:** zona horaria fija `America/Argentina/Buenos_Aires` — decisión del usuario; el día no se desfasa aunque el servidor esté en UTC.
- **Sí:** mostrar "0 niños" sin estados condicionales — decisión del usuario.
- **Sí:** pluralización (`1 niño`) — legibilidad, costo nulo.
- **Sí:** `connection()` ya existente en `FeedWithSession` → fecha y conteo se calculan por request, sin caché.
- **Sí:** tipo `SidebarRoom` — la sidebar solo usa `roomName`; evita arrastrar contadores mock que nadie ve.
- **No:** nombre real de sala/guardería — decisión del usuario; queda mock.
- **No:** timer en cliente para actualizar la fecha con la pestaña abierta — se refresca al navegar; otro spec si algún día se quiere.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Intl puede devolver "martes, 28 oct." (coma/punto) | Normalizar quitando `,` y `.` y en minúsculas; criterio de aceptación verifica el formato exacto |
| Servidor en UTC | `timeZone` explícito en `Intl`, no depende del TZ del host |

## Lo que **no** está en esta spec

- Nombre real de sala o guardería en el header/sidebar.
- Posts del feed con datos reales.
- Actualización en vivo de la fecha sin recargar.

Cada uno, si llega, va en su propia spec.
