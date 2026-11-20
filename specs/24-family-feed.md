# SPEC 24 — Feed de familia (vista propia con filtro por hijo)

> **Estado:** Implementado
> **Depende de:** SPEC 16 (staff post publishing), SPEC 17 (feed likes and comments), SPEC 18 (family child profile)
> **Fecha:** 2026-11-19
> **Objetivo:** Reemplazar el `/family` actual (feed genérico de solo lectura) por la vista definida en `references/pantallas/familia-feed.dc.html`: cabecera personalizada, filtro de posts por hijo y tarjetas con métricas de engagement.

## Alcance

**Incluye:**

1. **Vista familiar `/family`** (`app/family/page.tsx`), rediseñada según `references/pantallas/familia-feed.dc.html`:
   - Cabecera: eyebrow `TU FAMILIA` (color accent `#D9583C`), saludo `Hola, {nombre}` (nombre del parent logueado) y subtítulo `Así va el día de hoy`.
   - **Pills de filtro** debajo de la cabecera: una por hijo vinculado (avatar + nombre de pila) + pill `Todos`. Pill activo oscuro (`#3F362E`/blanco), inactivo con borde `#ECE0D0` (mismos estilos que las pestañas de la SPEC 23).
   - **Separador de fecha**: `HOY · {DÍA} {N} {MES}` en mayúsculas + línea divisoria.
   - **Tarjetas de post** (solo lectura): avatar, nombre del niño etiquetado, `HH:MM · autor · sala`, pill del tipo (`postKindStyles`), cuerpo, fotos si las hay, y footer con contadores de ❤ y 💬.
2. **Filtro por hijo (client-side)**: al elegir un hijo se muestran solo los posts etiquetados con él vía `post_children`; `Todos` muestra el feed completo (comportamiento actual de visibilidad por RLS, sin cambios).
3. **Data**: reutiliza `fetchPosts` y `fetchFeedSummary` existentes. `FamilyFeed` pasa a resolver también los hijos del parent con `fetchFamilyChildren` para las pills.
4. **Engagement**: likes y comentarios siguen funcionando igual que en el feed staff (actions de la SPEC 17, sin cambios de backend).

**No incluye (fuera de esta spec):**

- Página de detalle de publicación (`detalle-publicacion`): la referencia linkea a ella, pero la ruta no existe (el SPEC 17 eliminó el link muerto). **Las tarjetas no son links.**
- Publicar desde la familia: el feed familiar sigue siendo de solo lectura (`canPublish={false}`).
- Cambios en RLS o en la visibilidad de posts (hoy: posts de los hijos del parent + anuncios de su sala, definido en SPEC 09/16).
- Vista de fotos (`foto.dc.html`), avisos ni pantalla de cuenta.
- El feed staff (`/staff`) no se toca.

## Modelo de datos

Sin cambios de schema. Fuentes existentes:

- `fetchPosts(supabase, userId)` (`app/_data/posts.ts`) — ya aplica RLS y devuelve `post_children` por post.
- `fetchFamilyChildren(supabase, parentId)` (`app/_data/family-children.ts`) — hijos vinculado para las pills.
- `postKindStyles` / `postKindLabels` (`app/_data/feed.ts`) — colores de pill por tipo.

## Plan de implementación

1. **Data**: en `app/family/page.tsx`, resolver `fetchFamilyChildren` junto a `summary` y `posts` (mismo `Promise.all` + `connection()` que ya usa).
2. **Componente** `app/_components/family-feed-view.tsx` ("use client"): cabecera + pills de filtro (estado `selectedChildId | "all"`) + separador de fecha + lista de tarjetas. Filtrado client-side por `post.postChildren` (o el campo equivalente que expone `fetchPosts`).
3. **Tarjetas**: reutilizar el markup/estilo de las tarjetas del feed existente (`post-card.tsx` o el equivalente en `feed-view.tsx`), quitando opciones de edición/borrado y los links a detalle. Contadores de ❤/💬 visibles.
4. **Página**: `app/family/page.tsx` pasa a renderizar `FamilyFeedView` en lugar de `FeedView` (el fallback de Suspense se mantiene/ajusta al nuevo layout).
5. **Estado vacío**: sin hijos vinculados → no se muestran pills (solo `Todos`); sin posts → mensaje breve "Todavía no hay publicaciones.".
6. **Verificación**: Playwright como parent en `/family` (filtro funcionando, pill activo, engagement clickeable), capturas 1440/768/375, `npm run lint`, `npx tsc --noEmit`, `npm run build`.

## Criterios de aceptación

- [x] `/family` renderiza sin errores para un `parent` con sesión válida y muestra la cabecera `TU FAMILIA` / `Hola, {nombre}` / `Así va el día de hoy`.
- [x] Se muestran pills con los hijos vinculados al parent + pill `Todos` (activo por defecto, estilo oscuro).
- [x] Al elegir un hijo, solo se listan los posts etiquetados con él (`post_children`); al volver a `Todos` se ve el feed completo.
- [x] El separador de fecha muestra `HOY · …` con el día de hoy en español y mayúsculas.
- [x] Cada tarjeta muestra avatar, nombre del niño, `HH:MM · autor · sala`, pill del tipo y cuerpo del post.
- [x] Los contadores de ❤ y 💬 se ven en el footer y el like sigue funcionando (misma action que el feed staff).
- [x] Las tarjetas **no** son `<a>`/`<Link>` a rutas inexistentes (sin 404).
- [x] Sin posts (o sin resultados en el filtro), se ve el estado vacío.
- [x] El feed familiar sigue sin CTA de publicación ni opciones de editar/borrar.
- [x] `/staff` (feed staff) queda visual y funcionalmente sin cambios.
- [x] La vista se ve correcta en 1440, 768 y 375 px (capturas en `.playwright-mcp/`).
- [x] `npm run lint` y `npx tsc --noEmit` sin errores.

## Decisiones tomadas y descartadas

**Del usuario:**

1. **Spec nueva para el feed de familia** (SPEC 24) en lugar de meterlo en otra spec, para implementarla en una sesión aparte con `/spec-impl`.
2. **Filtro por hijo client-side** (los posts ya vienen con `post_children`): descartado un filtro server-side con `searchParams` (más complejidad, recarga de ruta, y no aporta con pocos hijos).

**Del implementador:**

3. **Componente nuevo `family-feed-view.tsx`** en vez de complicar `FeedView` con más props: descartado por ahora reutilizar `FeedView` (sus props —`room`, `canPublish`, `childPills`, `rooms`— son del flujo staff y ensuciarían la vista familiar).
4. **Tarjetas sin link**: descartado crear `/family/posts/[id]` (sería otra spec; el SPEC 17 ya eliminó el link muerto por el mismo motivo).
5. **Mantener `canPublish={false}`**: descartado habilitar publicación para familias (el SPEC 01 lo define como fuera de alcance; si se pide, va en su propia spec).

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Posts sin `post_children` (anuncios de sala) desaparecen al filtrar por hijo | Es el comportamiento esperado: solo se ven en `Todos`. Documentado en el criterio de filtro. |
| Duplicar markup de tarjetas del feed staff al crear `family-feed-view` | Reutilizar `post-card.tsx` (o extraerlo si está acoplado a `FeedView`); si hay que tocarlo, mantener el feed staff idéntico (criterio de aceptación). |
| `fetchFamilyChildren` agrega un fetch extra por request | Ya se usa en `/family/kids` y `/family/daily-summary`; va en el mismo `Promise.all`, sin waterfall. |

## What is **not** in this spec

- Página de detalle de publicación.
- Publicación desde la familia.
- Filtro server-side / por fecha / por tipo de post.
- Vista de fotos, avisos o cuenta (pantallas de referencia pendientes).
- Cambios de RLS o de visibilidad de posts.
