# SPEC 11 — Perfil de niño con datos reales (`/kids/[id]`)

> **Estado:** Aprobado
> **Depende de:** SPEC 02 (UI del perfil), SPEC 10 (tablas `rooms`/`children` + `/kids` real)
> **Fecha:** 2026-10-22
> **Objetivo:** Conectar `/kids/[id]` a Supabase para que el perfil muestre al niño real de la DB (hoy: Martina López) en lugar de los mocks.

## Alcance

**Incluye:**

- Reescribir `app/kids/[id]/page.tsx`: fetch del niño por `id` (uuid) con el cliente server (`utils/supabase/server.ts`) — `select` con `rooms(name)`, `eq("status", "active")`, dentro de `<Suspense>` + `await connection()` (mismo patrón que `KidsViewServer` de SPEC 10, obligatorio por `mapChildRow` usando `new Date()`).
- Reutilizar `ChildRow` + `mapChildRow` de `app/_data/child-mapper.ts` (sin duplicar formateo de fechas/edad).
- `notFound()` si el id no existe o el niño no está `active`.
- Eliminar `generateStaticParams` basado en el mock (la ruta pasa a ser dinámica).
- Panel de padres: `ParentsPanel` con `parents: []` — card vacía solo con el CTA "Vincular otro padre" que abre el `LinkParentModal` mock (agrega en memoria, no persiste).
- Links "Editar" → `/add-child` y "Resumen del día" → `/daily-summary` quedan intactos (solo se enlazan, como en la SPEC 10).
- Caja de alertas: se mantiene la lógica actual (solo se muestra si hay `medical_notes`; Martina tiene tags pero sin notas → no se muestra).

**No incluye:**

- Tablas `parents`/`parent_children` o vinculación persistente de padres.
- Editar/archivar el niño; pantalla de resumen del día.
- Fotos, consentimiento editado desde UI.
- Cambios en la lista `/kids` (ya funciona; sus links a uuid empezarán a funcionar solos).
- Borrar el archivo mock `app/_data/children.ts` (sigue vivo para tipos y mapas de estilos).

## Modelo de datos

No introduce estructuras nuevas. Reutiliza `ChildRow` y `mapChildRow` de SPEC 10. Única fila real:

```
children: Martina López (uuid), birth_date 2024-03-12, enrolled_at 2026-10-22,
          medical_notes null, allergy_tags ["Maní"], room Soles, status active
```

## Plan de implementación

1. **Fetch real en el perfil.** Reescribir `KidProfile` en `app/kids/[id]/page.tsx`: `await connection()`, `createClient()`, `from("children").select("id, full_name, birth_date, enrolled_at, medical_notes, allergy_tags, rooms(name)").eq("id", id).eq("status", "active").maybeSingle()`, `notFound()` si null, mapear con `mapChildRow(row, 0)` y renderizar la UI existente. → `/kids/<uuid-de-Martina>` muestra sus datos; quitar `generateStaticParams`.
2. **Panel de padres vacío.** Pasar `parents={[]}` a `ParentsPanel` (el modal mock ya funciona sin padres). → card vacía + CTA funcional en memoria.
3. **Verificación.** Playwright a 1440/768/375: desde `/kids` clic en la tarjeta de Martina → perfil con datos correctos; uuid inexistente y `/kids/mateo-fernandez` → 404; sin sesión → `/login`; `npm run lint` y `npx tsc --noEmit`.

## Criterios de aceptación

- [ ] Desde `/kids`, la tarjeta de Martina navega a `/kids/<su uuid>` y el perfil muestra "Martina López", la edad calculada de `birth_date` (2 años) y "Sala Soles".
- [ ] La ficha muestra "12 mar 2024" (nacimiento), "Soles" (sala) y "oct 2026" (ingreso).
- [ ] No se muestra la caja roja de alergias (Martina tiene `allergy_tags` pero `medical_notes` es null).
- [ ] "PADRES VINCULADOS" muestra la card sin padres y el CTA "Vincular otro padre"; el modal abre y agrega el padre en memoria (se pierde al recargar).
- [ ] "Editar" linkea a `/add-child` y "Resumen del día" a `/daily-summary` (sin páginas, links intactos).
- [ ] `/kids/<uuid-inexistente>` y `/kids/mateo-fernandez` devuelven 404.
- [ ] Sin sesión, `/kids/<uuid>` redirige a `/login` (guard de SPEC 09 intacto).
- [ ] `npm run lint` y `npx tsc --noEmit` sin errores.

## Decisiones tomadas y descartadas

- **Sí:** card de padres vacía con CTA mock (opción a del usuario) — mantiene el diseño sin crear tablas.
- **Sí:** modal "Vincular otro padre" sigue mock — decisión del usuario; la persistencia de padres es otra spec.
- **Sí:** links "Editar"/"Resumen del día" intactos — recomendación aceptada; mismo criterio que SPEC 10.
- **Sí:** retiro del mock en `[id]` — uuids reales; los ids slug dan 404, igual que la lista ya decidido en SPEC 10.
- **Sí:** `connection()` + `<Suspense>` + cliente server — patrón probado en `kids-view-server.tsx`; obligatorio por `cacheComponents`.
- **Sí:** `mapChildRow(row, 0)` con tono fijo — el tono es decorativo y no se persiste.
- **No:** tablas de padres/`parent_children` — futuro spec.
- **No:** editar niño, daily summary, borrar el mock `children.ts` (aún aporta tipos).

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `cacheComponents: true` + `new Date()` en `mapChildRow` | `await connection()` antes del fetch, dentro de `<Suspense>` (mismo fix que SPEC 10) |
| Clic en tarjeta de la lista parecía roto (404) | Este spec lo arregla; verificar el flujo completo lista → perfil en Playwright |
| Id no-uuid en la URL | `eq("id", uuid)` de Supabase falla → manejar error como `notFound()` |

## Lo que **no** está en esta spec

- Padres reales en DB y vinculación persistente.
- Edición/archivado de niños.
- Resumen del día.
- Cambios en el modal "Agregar niño" o la lista `/kids`.
