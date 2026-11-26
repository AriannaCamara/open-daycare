# SPEC 28 — Visor de fotos (ruta propia desde detalle y tarjetas)

> **Estado:** Implementado
> **Depende de:** SPEC 16 (staff post publishing + fotos), SPEC 24 (family feed), SPEC 25 (post detail)
> **Fecha:** 2026-11-23
> **Objetivo:** Crear la ruta `/posts/[id]/photos/[photoId]` con el visor de fotos a pantalla completa siguiendo `references/pantallas/foto.dc.html`, accesible desde el detalle y las tarjetas de ambos feeds.

## Alcance

**Incluye:**

1. **Ruta `/posts/[id]/photos/[photoId]`** (`app/posts/[id]/photos/[photoId]/page.tsx`): fuera de los prefijos `/staff` y `/family`, así que el guard del proxy solo exige sesión; la visibilidad la define RLS vía `fetchPostById` (SPEC 25). Estados: carga (fallback de Suspense), encontrado y no encontrado ("No se encontró la foto." + link de vuelta a `/posts/{id}`).
2. **Vista** (`app/_components/photo-viewer.tsx`), según la referencia:
   - Fondo oscuro `#1A1714` a pantalla completa.
   - Barra superior: botón **X** (círculo translúcido) → link a `/posts/{id}`; centro: nombre del niño + `HH:MM · autor · sala` (reusa `buildSubtitle`); botón **Descargar** (círculo translúcido, `<a href={signedUrl} download>`).
   - Foto centrada: `max-w-[760px]`, esquinas redondeadas, sin borde punteado placeholder (la imagen real ya existe en `post_photos`).
   - Pie: cuerpo del post (`post.body`) centrado, máximo 560px.
3. **Puntos de entrada**:
   - En el **detalle** (`post-detail-view.tsx`): cada foto pasa a ser un link a `/posts/{id}/photos/{photoId}`.
   - En las **tarjetas** (`post-card.tsx`, usado por ambos feeds): la primera foto pasa a ser un link a la ruta del visor, con `stopPropagation` para que el clic no dispare también la navegación de la tarjeta al detalle.

**No incluye (fuera de esta spec):**

- Navegación prev/next entre fotos del mismo post (la referencia no la tiene).
- Zoom, rotación o fullscreen del navegador.
- Lightbox/modal sobre el detalle (descartado: se eligió ruta propia).
- Descarga con nombre de archivo personalizado (limitación cross-origin aceptada).
- Tablas nuevas, migraciones o cambios de RLS.

## Modelo de datos

Sin cambios de schema ni nuevas queries. Reutiliza:

- `fetchPostById(supabase, postId)` (SPEC 25) → devuelve `Post` con `photos: PostPhoto[]` (`id`, signed `url`), `body`, `givenNames`, `time`, `authorName`, `roomName`.
- La foto se selecciona en memoria: `post.photos.find((p) => p.id === photoId)`; si no existe o el post es `null` → estado "no encontrado".

## Plan de implementación

1. **Vista**: crear `app/_components/photo-viewer.tsx` con la barra (X → `/posts/{id}`, cabecera con `buildSubtitle(post)`, descarga con `<a download>`), la imagen y el caption. → componente puro, sin fetch.
2. **Ruta**: crear `app/posts/[id]/photos/[photoId]/page.tsx` (server component con `connection()` + Suspense) que resuelve sesión, llama `fetchPostById`, busca la foto y renderiza `PhotoViewer` o el estado "No se encontró la foto.".
3. **Detalle**: en `post-detail-view.tsx`, envolver cada `<img>` de `post.photos` en un `Link` a `/posts/{id}/photos/{photo.id}`.
4. **Tarjeta**: en `post-card.tsx`, envolver la primera foto en un `Link` con `onClick={(e) => e.stopPropagation()}` para que no navegue también al detalle.
5. **Verificación**: Playwright como parent y como staff — abrir el visor desde el detalle y desde la tarjeta de cada feed, X vuelve al detalle, botón atrás del navegador, descarga con href correcto, id inexistente, capturas 1440/768/375, `npm run lint`, `npx tsc --noEmit`, `npm run build`.

## Criterios de aceptación

- [x] `/posts/{id}/photos/{photoId}` renderiza la foto a pantalla completa con fondo oscuro para un `parent` y para un `staff` con sesión válida.
- [x] La barra superior muestra X, nombre del niño + `HH:MM · autor · sala` y el botón de descarga.
- [x] X lleva a `/posts/{id}`; el botón atrás del navegador también vuelve al detalle.
- [x] El botón de descarga tiene `href` = signed URL de la foto y atributo `download`.
- [x] El pie muestra el cuerpo del post centrado, máximo 560px.
- [x] Al hacer clic en una foto del **detalle** se abre el visor de esa foto.
- [x] Al hacer clic en la primera foto de una **tarjeta** (feed staff y feed familiar) se abre el visor y **no** se navega al detalle.
- [x] El resto de la tarjeta sigue navegando al detalle al hacer clic (sin regresión de la SPEC 25).
- [x] Un `photoId` que no pertenece al post muestra "No se encontró la foto." + link a `/posts/{id}` sin errores en consola.
- [x] Un `postId` inexistente o no visible por RLS muestra el mismo estado sin error 500.
- [x] La vista se ve correcta en 1440, 768 y 375 px (capturas en `.playwright-mcp/`).
- [x] `npm run lint` y `npx tsc --noEmit` sin errores.

## Decisiones tomadas y descartadas

**Del usuario:**

1. **Ruta propia** `/posts/[id]/photos/[photoId]`: descartado el modal/lightbox sobre el detalle (la referencia es una pantalla completa con X y URL compartible; la ruta da botón atrás nativo).
2. **Puntos de entrada: detalle + tarjetas**: descartado solo el detalle (las tarjetas de ambos feeds ya muestran la foto; sin link quedaría inalcanzable desde el feed).
3. **Descarga como `<a href download>`**: descartado omitir el botón; limitación aceptada — al ser cross-origin el navegador puede abrir la foto en una pestaña en vez de descargarla.
4. **Caption = cuerpo del post**: descartado sin caption (la referencia muestra el texto del post debajo de la foto).

**Del implementador:**

5. **Selección en memoria** de la foto desde `fetchPostById`: descartada una query nueva a `post_photos` (ya está embebida en el `select` de la SPEC 25 y RLS la filtra junto al post).
6. **X como `Link` a `/posts/{id}`** en vez de `router.back()`: con acceso directo por URL no hay historial; el link funciona en ambos casos.
7. **`stopPropagation` en la foto de la tarjeta**: mismo patrón que los botones de la SPEC 25 — el contenedor de la tarjeta tiene `onClick={onOpen}` y el clic burbujearía hacia la navegación al detalle.
8. **El nombre de la cabecera usa `givenNames`** (primer nombre, como el pill del feed); si el post no tiene niños (anuncio), se muestra el tipo de post en lugar del nombre.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Clic en la foto de la tarjeta navega también al detalle | `stopPropagation` en el Link; criterio de aceptación dedicado por feed. |
| Signed URL caduca (TTL 1h) | La página firma en cada lectura (mismo comportamiento que feed y detalle); recargar la página la renueva. |
| Post sin fotos o `photoId` inventado | Estado "No se encontró la foto." + link de vuelta, sin 500. |
| Duplicar markup del visor respecto al detalle | `PhotoViewer` es un componente propio; solo comparte `buildSubtitle` (ya exportado). |

## What is **not** in this spec

- Navegación prev/next entre fotos.
- Zoom, rotación o fullscreen.
- Lightbox/modal sobre el detalle.
- Descarga con nombre de archivo personalizado.
- Tablas nuevas, migraciones o cambios de RLS.
