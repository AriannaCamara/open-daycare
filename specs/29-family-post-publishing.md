# SPEC 29 — Publicación desde la familia

> **Estado:** Aprobado
> **Depende de:** SPEC 16 (staff post publishing), SPEC 24 (family feed), SPEC 25 (post detail), SPEC 09 (RLS)
> **Fecha:** 2026-11-26
> **Objetivo:** Permitir al parent crear, editar y borrar sus propias publicaciones con fotos desde el feed familiar, reusando el modal de la SPEC 16 con una variante acotada.

## Alcance

**Incluye:**

1. **Migración RLS** (`supabase/migrations/20261126120000_family_post_publishing.sql`): relajar la escritura de `posts` para que el autor autenticado pueda insertar/updatear/borrar sus propios posts sin exigir `is_staff()`:
   - Reemplazar `posts_insert_staff_author`, `posts_update_author` y `posts_delete_author` por policies de autor (`author_id = (select auth.uid())`).
   - Para no-staff: `type <> 'announcement'` (los anuncios son exclusivos del staff) y `room_id` null o perteneciente a una sala de alguno de sus hijos.
   - Reescribir `can_edit_post(p_post_id)` quitando el `and public.is_staff()` (queda: autor = usuario actual). `post_children`, `post_photos` y `storage.objects` delegan en esta función, así que heredan la relajación sin tocar sus policies.
   - `can_read_post` no cambia: el post del parent lo ven los mismos lectores de siempre (staff + familiares de sus hijos).
2. **Actions** (`app/_actions/posts.ts`): en `createPost` y `updatePost`, el guard `isStaffRole` pasa a permitir parent con reglas extra:
   - `kind` permitido para parent: `activity`, `mood`, `photo` (sin `meal`/`nap`/`achievement`/`announcement`).
   - `childIds` = exactamente los hijos vinculados al parent (leídos de `parent_children` en el servidor; no se confía en el input).
   - `roomId` resuelto en el servidor = `room_id` del primer hijo vinculado (null si ninguno tiene sala).
   - `deletePost`: solo se quita el guard de staff (la policy ya acota al autor).
3. **Modal** (`app/_components/create-post-modal.tsx`): nueva prop `variant?: "staff" | "family"` (default `"staff"`, sin cambios para el staff). En `family`:
   - `kindOrder` filtrado a Actividad / Ánimo / Foto.
   - Se ocultan las secciones de pills de hijos, de sala y de audiencia (el post se etiqueta solo y la audiencia es automática).
4. **Feed familiar** (`app/_components/family-feed-view.tsx`):
   - Botón **Crear publicación** en el header del feed (bloque del saludo, alineado a la derecha). Se oculta si `familyChildren` está vacío.
   - Estado de apertura del `CreatePostModal` en `variant="family"`, `mode="create"`; al guardar → `router.refresh()` (mismo patrón sin optimistic UI que FeedView).
   - Pasar `onEdit` / `onDelete` al `PostCard` para los posts con `post.authorId === user.id`, con el mismo flujo de edición (`mode="edit"` con `initialPost`) y borrado en dos pasos (`pendingDelete` + `deletePost` + `router.refresh()`) que FeedView (SPEC 16).
   - Los `PostCard` ajenos siguen sin mostrar Editar/Borrar (el `isAuthor` del card ya lo filtra).

**No incluye (fuera de esta spec):**

- Publicación desde la familia en otras rutas (solo `/family`).
- Selector de audiencia o de sala para el parent (siempre automático).
- Tipos `meal`/`nap`/`achievement`/`announcement` para parent.
- Cambios a `can_read_post` o a la visibilidad existente de los posts.
- Notificación/avisos al staff cuando un parent publica.
- Filtro server-side del feed, reacciones o comentarios nuevos (ya existen).
- Tablas nuevas ni columnas nuevas.

## Modelo de datos

Sin tablas nuevas ni columnas nuevas. Cambian las **policies** de `posts` (insert/update/delete) y la función `can_edit_post`. La forma de `PostInput` no cambia; lo que cambia es quién puede llamar y con qué valores.

## Plan de implementación

1. **Migración RLS**: crear `supabase/migrations/20261126120000_family_post_publishing.sql` con las policies nuevas y `can_edit_post` reescrita, aplicarla por MCP (`apply_migration` con el mismo nombre) y verificar con queries de prueba (parent inserta su post; parent no inserta anuncio ni sala ajena; staff sigue funcionando). → Escritura habilitada para parent a nivel de base de datos.
2. **Actions**: en `createPost`/`updatePost`, rama para parent con validación de tipo, hijos propios y `roomId` servidor-side; en `deletePost`, quitar el guard de staff. → Un parent logueado puede crear/editar/borrar por API sin regresión para staff.
3. **Modal variante family**: prop `variant` que filtra `kindOrder` y oculta pills/sala/audiencia. → El modal en variante `family` muestra solo lo permitido (aún sin botón que lo abra).
4. **Feed familiar**: botón en el header (oculto sin hijos), apertura del modal, `onEdit`/`onDelete` en el `PostCard` propio con el flujo de FeedView. → Flujo completo desde `/family`.
5. **Verificación**: Playwright como parent (crear con foto, editar, borrar, botón sin hijos) y como staff (feed staff muestra el post; SPEC 16 sin regresión), capturas 1440/768/375 en `.playwright-mcp/`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.

## Criterios de aceptación

- [x] Con sesión parent, el botón "Crear publicación" aparece en el header de `/family` y abre el modal.
- [x] El modal familiar muestra solo los tipos Actividad, Ánimo y Foto (no Comida/Siesta/Logro/Anuncio).
- [x] El modal familiar no muestra pills de hijos, ni sala, ni audiencia.
- [x] Publicar con foto desde `/family` crea el post: se ve en el feed familiar (en la pestaña de cada hijo y en "Todos") y en el feed staff.
- [x] El post creado queda con `author_id` = parent, la sala del primer hijo (o sin sala) y todos sus hijos etiquetados en `post_children`.
- [x] La action rechaza `kind: "announcement"` (o cualquier tipo fuera del subconjunto) cuando el autor es parent.
- [x] En la tarjeta familiar, los posts propios del parent muestran Editar y Borrar; los posts ajenos no muestran esos botones.
- [x] Editar desde la tarjeta familiar abre el modal con la variante family, guarda los cambios y refresca el feed.
- [x] Borrar desde la tarjeta familiar elimina el post del feed familiar y del staff.
- [x] El staff sigue creando, editando y borrando posts igual que antes (sin regresión de la SPEC 16).
- [x] Un parent no puede editar ni borrar posts ajenos (action lo rechaza y la RLS lo bloquea).
- [x] Un parent no puede insertar un post con `type = announcement` ni con una sala que no sea la de sus hijos (verificable por la policy).
- [x] Si `familyChildren` está vacío, el botón "Crear publicación" no se muestra.
- [x] `npm run lint` y `npx tsc --noEmit` sin errores; capturas 1440/768/375 en `.playwright-mcp/`.

## Decisiones tomadas y descartadas

**Del usuario:**

1. **Reusar `create-post-modal` con prop `variant`**: descartado un modal nuevo familiar (DRY: el flujo de fotos, validaciones y edición ya existe y es común).
2. **Subconjunto de tipos Actividad/Ánimo/Foto**: descartado que el parent elija todos los tipos (meal/nap/achievement son datos operativos del staff) y descartado tipo automático (el parent sí elige entre los tres).
3. **Audiencia y sala automáticas**: descartado que el parent elija audiencia o sala (evita errores de visibilidad RLS; sala = primer hijo vinculado).
4. **Todos los hijos etiquetados** (`post_children`): descartado etiquetar solo el hijo del pill activo (los hermanos no lo verían en su pestaña).
5. **Botón en el header del feed familiar**: descartado FAB y item de sidebar (contexto de publicación = feed).
6. **Editar y borrar el post propio en la tarjeta familiar**: descartado dejarlo para otra spec (el parent quedaría sin poder corregir lo que publica) y descartado solo-borrar (el modal de edición ya existe).
7. **Ocultar el botón si no hay hijos**: descartado botón con aviso (no hay audiencia posible, no hay nada que publicar).

**Del implementador:**

8. **Migración RLS**: la policy actual `posts_insert_staff_author` y `can_edit_post` exigen `is_staff()` — sin tocar la base de datos el parent nunca puede insertar, aunque la action lo permita. `post_children`, `post_photos` y `storage.objects` delegan en `can_edit_post`, así que relajando esa función se habilita todo el flujo de fotos con una sola change.
9. **Excluir `announcement` para no-staff en la policy**: la validación de tipos vive en la action, pero un cliente directo a la API la esquivaría; la policy es el respaldo de seguridad.
10. **`room_id` y `childIds` resueltos en el servidor**: no se confía en el input del parent (podría etiquetar hijos ajenos o meter una sala que no le corresponde).
11. **`variant` con default `"staff"`**: el feed staff no se toca — los llamados existentes quedan idénticos.

## Riesgos

| Riesgo | Mitigation |
| --- | --- |
| Parent con API directa inserta anuncio o sala ajena | La policy excluye `announcement` para no-staff y valida que `room_id` sea null o de sus hijos; la action valida lo mismo. |
| Relajar `can_edit_post` rompe algo staff | La función solo agrega el caso "autor no-staff"; el caso staff (`is_staff()` + autor) sigue siendo verdadero. Verificación de regresión SPEC 16 en el paso 5. |
| El parent publica contenido que el staff no espera ver | Es el comportamiento pedido: el post es visible en el feed staff con `author_id` del parent (misma RLS de lectura, sin cambios). |
| Post del parent queda sin sala si ningún hijo tiene `room_id` | `roomId = null` → audience "toda la guardería" según las helpers existentes; comportamiento consistente con los posts de sala. |

## What is **not** in this spec

- Publicación familiar fuera de `/family`.
- Selector de audiencia/sala para el parent.
- Tipos Comida/Siesta/Logro/Anuncio para parent.
- Notificaciones al staff por publicación familiar.
- Cambios de lectura (`can_read_post`) o visibilidad.
- Tablas, columnas o índices nuevos.
