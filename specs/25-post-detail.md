# SPEC 25 — Detalle de publicación (ruta única para ambos roles)

> **Estado:** Implementado 
> **Depende de:** SPEC 16 (staff post publishing), SPEC 17 (feed likes and comments), SPEC 24 (family feed)
> **Fecha:** 2026-11-21
> **Objetivo:** Crear la ruta `/posts/[id]` que muestra una publicación completa (cabecera, cuerpo, fotos, likes y comentarios) siguiendo `references/pantallas/detalle-publicacion.dc.html`, accesible desde ambos feeds.

## Alcance

**Incluye:**

1. **Ruta `/posts/[id]`** (`app/posts/[id]/page.tsx`): queda fuera de los prefijos `/staff` y `/family`, así que el guard del proxy solo exige sesión; la visibilidad del post la define RLS (SPEC 09/16). Estados: carga (fallback de Suspense), encontrado y no encontrado ("No se encontró la publicación." + link de vuelta).
2. **Vista de detalle** (`app/_components/post-detail-view.tsx`), según la referencia:
   - Link `Volver al feed` → `/family` para parent, `/staff` para staff (resuelto desde el rol de la sesión).
   - Cabecera: avatar/nombre del niño, `HH:MM · autor · sala`, pill del tipo (`postKindStyles`).
   - Cuerpo del post y fotos mostradas como imagen normal (**sin link** al visor de fotos).
   - Texto `A N personas les gusta` con el contador real de reacciones.
   - Botón `Me encanta` (toggle de like, misma action de la SPEC 17) y botón `Comentar` (da foco al input de comentarios).
   - Sección de comentarios reutilizando `CommentSection` (SPEC 17), con el **sufijo de rol** junto al autor (`· familia` / `· staff`).
3. **Tarjetas clickeables**: las tarjetas del feed familiar (`family-feed-view.tsx`) y del feed staff (`feed-view.tsx` / `post-card.tsx`) pasan a navegar a `/posts/{id}` al hacer clic. Los botones de engagement/acciones de la tarjeta **no** navegan (detienen la propagación).

**No incluye (fuera de esta spec):**

- Visor de fotos (`foto.dc.html`) y pantalla de avisos (`avisos.dc.html`).
- Avatares apilados de quienes dieron like (solo el contador).
- Editar/borrar el post desde el detalle (siguen en el feed staff).
- Publicación desde la familia, cambios de RLS o de visibilidad de posts.
- Tablas nuevas o migraciones de base de datos.

## Modelo de datos

Sin cambios de schema. Cambios de query:

- **Nuevo** `fetchPostById(supabase, postId)` en `app/_data/posts.ts`: mismo `select` que `fetchPosts` filtrado por `.eq("id", postId).maybeSingle()`. RLS devuelve `null` si el post no es visible para el usuario.
- `fetchPosts` y `fetchPostById` pasan a pedir `users ( full_name, role )` en el embed de comentarios → `Comment` (`app/_data/feed.ts`) gana `authorRole: string | null`.

## Plan de implementación

1. **Data**: añadir `fetchPostById` en `app/_data/posts.ts` y sumar `role` al embed de comentarios; exponer `authorRole` en el tipo `Comment` (`app/_data/feed.ts`). Verificar que RLS de `users` (SPEC 17) permite leer `role`.
2. **Ruta**: crear `app/posts/[id]/page.tsx` (server component con `connection()` + Suspense) que resuelve la sesión y el post, y renderiza `PostDetailView` o el estado "no encontrado".
3. **Componente** `app/_components/post-detail-view.tsx` ("use client"): `Volver al feed` role-aware + card del post (header, pill, cuerpo, foto como imagen, `A N personas les gusta`) + botones `Me encanta` y `Comentar` (foco al input) + `CommentSection` con las actions de engagement de la SPEC 17.
4. **`CommentSection`**: sumar el sufijo de rol (`· familia` / `· staff`) junto al nombre del autor.
5. **Links desde los feeds**: en las tarjetas, navegación a `/posts/{id}` con `stopPropagation` en los botones de like/comentario/editar/borrar; el feed staff conserva sus acciones.
6. **Verificación**: Playwright como parent y como staff (navegación desde cada feed, like, comentarios, estado no encontrado), capturas 1440/768/375, `npm run lint`, `npx tsc --noEmit`, `npm run build`.

## Criterios de aceptación

- [x] `/posts/{id}` renderiza sin errores para un `parent` y para un `staff` con sesión válida, cada uno con su sidebar.
- [x] La cabecera muestra avatar/nombre del niño, `HH:MM · autor · sala`, pill del tipo y cuerpo del post.
- [x] Si el post tiene fotos, se muestran como imagen y **no** son un link al visor de fotos.
- [x] `A N personas les gusta` refleja el contador real de reacciones.
- [x] `Me encanta` alterna el like (misma action de la SPEC 17) y actualiza el texto al instante.
- [x] `Comentar` da foco al input de comentarios.
- [x] Los comentarios se listan con nombre, sufijo de rol (`· familia` / `· staff`) y hora; crear, editar y borrar comentarios propios sigue funcionando.
- [x] Al hacer clic en una tarjeta del **feed familiar** se navega al detalle de esa publicación.
- [x] Al hacer clic en una tarjeta del **feed staff** se navega al detalle; Editar/Borrar de la tarjeta siguen funcionando sin navegar.
- [x] Los botones de like/comentario dentro de una tarjeta **no** disparan la navegación al detalle.
- [x] `Volver al feed` lleva a `/family` siendo parent y a `/staff` siendo staff.
- [x] Un id inexistente o un post no visible por RLS muestra "No se encontró la publicación." sin errores en consola.
- [x] La vista se ve correcta en 1440, 768 y 375 px (capturas en `.playwright-mcp/`).
- [x] `npm run lint` y `npx tsc --noEmit` sin errores.

## Decisiones tomadas y descartadas

**Del usuario:**

1. **Ruta única `/posts/[id]` para ambos roles** (la referencia es de familia, pero RLS ya filtra quién ve qué): descartado `/family/posts/[id]`, que obligaría a duplicar la pantalla para staff.
2. **Tarjetas de ambos feeds clickeables**: descartado dejar la ruta sin links (quedaría inalcanzable salvo por URL directa) y descartado linkear solo desde el feed familiar.
3. **Solo contador de likes** (`A N personas les gusta`): descartados los avatares apilados de la referencia (requeriría fetch extra de `reactions` con embed de `users` por ahora sin aporte real).
4. **Foto como imagen normal sin link**: descartado el bloque punteado placeholder de la referencia (la imagen real ya existe en `post_photos`; el visor queda para su propia spec).
5. **Reutilizar `CommentSection` + sufijo de rol**: descartado crear un componente de comentarios aparte para el detalle (duplicaría lógica de CRUD de la SPEC 17).

**Del implementador:**

6. **`fetchPostById` propio** en vez de reusar `fetchPosts` y filtrar en memoria: el feed no debe cargar todos los posts para mostrar uno.
7. **Navegación por `onClick` + `stopPropagation` en la tarjeta** en vez de envolver en `<Link>`: `<a>` no puede contener `<button>` (HTML inválido) y rompería los botones de like/comentario.
8. **Rol del comentarista**: `parent` → `· familia`, `staff`/`admin` → `· staff`. Descartados «mamá»/«maestra» de la referencia (el género no está en el modelo de datos).
9. **La ruta vive fuera de `/staff` y `/family`**: el guard por prefijo del proxy no la cubre, solo exige sesión; la autorización real es RLS (mismo modelo que el resto de los datos).

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Clic en la tarjeta navega al hacer clic en un botón de la tarjeta | `stopPropagation` en los botones; criterio de aceptación dedicado. |
| `role` de `users` no legible por RLS en el embed de comentarios | Verificar en el paso 1 con una query de prueba; si falla, mostrar el detalle sin sufijo en vez de romper el fetch. |
| Post inexistente o no visible devuelve `null` | Estado "No se encontró la publicación." amigable + link de vuelta, sin error 500. |
| Duplicar lógica de engagement (likes/comentarios) entre feed y detalle | Reutilizar las actions de la SPEC 17 y `CommentSection` tal cual, sin copiar lógica. |

## What is **not** in this spec

- Visor de fotos (`foto.dc.html`) y avisos (`avisos.dc.html`).
- Avatares de usuarios que dieron like.
- Editar/borrar publicación desde el detalle.
- Tablas nuevas, migraciones o cambios de RLS.
- Notificaciones o contador de "quién vio" la publicación.
