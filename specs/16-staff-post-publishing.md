# SPEC 16 — Publicar, editar y borrar posts del staff (con fotos reales)

> **Estado:** Aprobado
> **Depende de:** SPEC 06 (modal), SPEC 10 (rooms/children), migraciones `create_posts` y `create_feed_engagement`
> **Fecha:** 2026-10-30
> **Objetivo:** Pasar el feed de mocks a datos reales de Supabase: el staff crea publicaciones (con o sin fotos) desde el modal existente, y puede editarlas y borrarlas. Las fotos se suben a un bucket privado de Supabase Storage y el feed las renderiza con URLs firmadas.

## Alcance

**Incluye:**

- Feed `/` lee posts reales (`published_at desc`, todo el daycare) en lugar de los 3 mocks; los mocks pasan a seed de migración.
- Server action única de **crear** post: `posts` + `post_children` + subida de fotos + `post_photos`, con rollback si algo falla.
- Server actions de **editar** (todo el formulario con prefill, incluidas fotos) y **borrar** (filas + archivos del bucket).
- Fotos reales: bucket privado `post-photos` + signed URLs (1h) generadas al renderizar. Máx **5 fotos / 5 MB** (jpg/png/webp), validado en cliente, server y en la config del bucket.
- Control de consentimiento: si el post lleva fotos y algún niño etiquetado tiene `children.photo_consent = false`, se **bloquea** (el mismo post sin fotos se puede publicar).
- Dropdown de **sala** en el modal (Soles / Estrellas / Lunas / "Toda la guardería"); "Toda la sala" = post de la sala elegida sin niños etiquetados.
- Pills "PARA" con **niños reales** (activos), mismo patrón que `/kids`.
- `mood` agregado al enum `post_type` (7 tipos como la UI).
- `can_read_post()` actualizada: los padres también leen posts **de sala sin niños etiquetados** (no solo anuncios).
- CTA "+Nueva publicación", composer y acciones Editar/Borrar **solo para staff/admin** (`isStaffRole`); los padres solo leen.
- "Editar" del PostCard deja de apuntar a `/create-post` (404) y abre el modal en modo edición del post propio.

**No incluye (fuera de esta spec):**

- Gallery de varias fotos en el feed: `PostCard` muestra la **primera** foto (igual que hoy); carrusel en spec aparte.
- Likes, comentarios y notificaciones a familias (tablas existen; contadores quedan en 0).
- Paginación del feed (se cargan todos los posts del daycare).
- UI de gestión de consentimiento (`photo_consent` se respeta, no se administra acá).
- Muestra del autor en el PostCard (hoy dice "publicado por vos"; unificar copy con autor real va en otra spec).
- Título de post (`posts.title` existe pero el formulario no lo tiene; se guarda `null`).
- Limpieza de huérfanos en el bucket (el flujo normal borra todo; un cron de janitor es otra spec).

## Modelo de datos

### DB (ya existente, cambios mínimos)

- `posts` (SPEC DB create_posts): `author_id`, `room_id`, `type`, `body`, `published_at`. Sin cambios de columnas.
- `post_type`: **+ `mood`** (migración `ALTER TYPE … ADD VALUE IF NOT EXISTS 'mood'`).
- `post_photos.url`: guarda el **storage path** (`{daycare_id}/{post_id}/{i}-{uuid}.{ext}`), no una URL firmada. La URL firmada se genera en cada lectura y nunca se persiste.
- `can_read_post()` se actualiza: además de hoy, un padre lee un post **sin niños etiquetados** si su `room_id` es una sala donde tiene un hijo, o si es anuncio con `room_id null` (toda la guardería).

### Storage

- Bucket **privado** `post-photos`: `public=false`, `file_size_limit=5242880`, `allowed_mime_types=['image/jpeg','image/png','image/webp']`.
- Path: `{daycare_id}/{post_id}/{index}-{uuid}.{ext}`. El `post_id` en el path permite policies que delegan en los helpers de posts.
- Policies `storage.objects` (a `authenticated`):
  - `insert`: staff y `can_edit_post(path[2])` (solo el autor sube a su post).
  - `select`: `can_read_post(path[2])` (necesaria para `createSignedUrl` y para que los padres vean fotos de posts legibles).
  - `delete`: `can_edit_post(path[2])` (autor borra sus archivos al editar/borrar).
- Subida y borrado se hacen **desde la server action con el cliente SSR del usuario** (no service role): las policies ya modelan quién puede.

### View model (`app/_data/feed.ts`)

```ts
export interface Post {
  id: string;               // uuid
  kind: PostKind;
  givenNames: string[];     // [] si es post de sala/día
  time: string;             // "14:20" — published_at en America/Argentina/Buenos_Aires
  audience: string;         // "familia de X, Y" | "toda la sala" | "toda la guardería"
  roomId: string | null;
  authorId: string;
  body: string;
  likes: number;            // 0 (engagement fuera de alcance)
  comments: number;         // 0
  photoUrl?: string;        // signed URL (1h) de la primera foto
}

export interface PillChild {
  id: string;
  fullName: string;         // given name para el pill y el card
  avatarTone: AvatarTone;   // mismo mapeo por índice que /kids
}

export interface RoomOption {
  id: string;
  name: string;
}
```

- Se elimina `photoLabel` (solo existía para el placeholder del mock).
- Query de feed (`app/_data/posts.ts`): `posts` + `post_children(children(full_name))` + `post_photos(id, url, position)` + `order published_at desc`; luego `createSignedUrl` para la primera foto de cada post.

### Entrada de las actions (`app/_actions/posts.ts`)

```ts
interface PostInput {
  kind: PostKind;
  body: string;             // trim
  roomId: string | null;    // null = toda la guardería
  childIds: string[];       // [] = post de sala (sin etiquetas)
}

createPost(input: PostInput, photoFiles: File[]): Promise<ActionResult>
updatePost(postId: string, input: PostInput, photoFiles: File[], keptPhotoIds: string[]): Promise<ActionResult>
deletePost(postId: string): Promise<ActionResult>
```

`ActionResult = { ok: true; postId: string } | { ok: false; error: string }`. Las actions validan todo server-side (defensa en profundidad) y la UI muestra el mensaje inline.

### Validaciones (cliente + server)

| Campo | Regla | Mensaje |
| --- | --- | --- |
| kind | requerido (nulo al abrir) | `Elegí un tipo.` |
| body | requerido (trim) | `Escribí una descripción.` |
| PARA | `childIds.length > 0` o "toda la sala" (no aplica a anuncio, que fuerza sala) | `Elegí al menos un niño o Toda la sala.` |
| fotos | ≤ 5 archivos | `Máximo 5 fotos.` |
| fotos | ≤ 5 MB por archivo | `Cada foto debe pesar menos de 5 MB.` |
| fotos | jpg/png/webp | `Formatos permitidos: JPG, PNG o WebP.` |
| consent | server: fotos > 0 y algún niño con `photo_consent=false` | `No se puede publicar con fotos: {nombres} tienen desactivado el consentimiento de fotos.` |
| storage | server: fallo de subida | `No se pudieron subir las fotos. Intentá de nuevo.` (con rollback) |

## Plan de implementación

1. **Migración A** `supabase/migrations/<ts>_add_mood_and_post_read.sql`:
   - `alter type public.post_type add value if not exists 'mood';`
   - `create or replace function public.can_read_post(…)` con la rama extendida de sala (padres leen posts sin etiquetas de sus salas; anuncio `room_id null` = guardería).
   - Seed idempotente de los 3 posts (uuids fijos + `on conflict (id) do nothing`): autor = staff seed, `room_id` = sala "Soles" (lookup por nombre), `published_at` hoy 07:50 / 09:40 / 14:20 (TZ AR), tipos announcement / activity / achievement, **sin `post_children` ni fotos**. → `apply_migration` + prueba con un padre si existe.
2. **Migración B** `supabase/migrations/<ts>_create_post_photos_storage.sql`: bucket privado `post-photos` (límite 5 MB, mime types) + policies de `insert`/`select`/`delete` en `storage.objects` según el modelo. → bucket visible en el dashboard y upload denegado con `anon`.
3. **Data layer.** Nuevo `app/_data/posts.ts`: `fetchPosts(supabase)` (query + signed URLs + mapper a `Post`) y `fetchPostOptions(supabase)` (children activos → `PillChild[]` + rooms → `RoomOption[]`). Quitar el array `posts` mock de `feed.ts` (se borra `photoLabel`; se agrega `roomId`/`authorId`). → `tsc` pasa con el feed vacío.
4. **Server actions.** Crear `app/_actions/posts.ts` con `createPost`/`updatePost`/`deletePost`: validan igual que la tabla, chequean consentimiento (query de `children.photo_consent` de los `childIds` cuando hay fotos), insertan post + hijos, suben archivos al path `{daycare}/{postId}/{i}-{uuid}.{ext}` e insertan `post_photos`; **rollback** (borrar archivos subidos + post creado) si falla una subida. `updatePost` borra del storage las fotos no conservadas; `deletePost` lista paths, borra storage y luego la fila (cascade). → acciones testeables desde un route handler temporal o llamadas directas.
5. **Page.** `app/page.tsx`: dentro de `FeedWithSession` (ya dinámica con `connection()`), pasa `initialPosts` reales, `canPublish={isStaffRole(session.role)}`, `rooms` y `children` reales a `FeedView`. → el feed muestra el seed.
6. **Modal.** `create-post-modal.tsx`: props `mode: "create" | "edit"`, `initialPost?`, `children: PillChild[]`, `rooms: RoomOption[]`, `onSaved`. Estado de fotos como `File[]` (+ miniaturas `objectURL`); en edición, miniaturas existentes desde `photoUrl` con X y `keptPhotoIds`. Nueva sección **SALA** (dropdown, default primera sala; "Toda la guardería" = `roomId null`); Anuncio conserva la sala elegida y fuerza "toda la sala" como antes. Submit deshabilitado con "Publicando…"/"Guardando…", errores inline (incluidos los de la action). → modal funcional en modo creación con datos reales.
7. **FeedView.** `feed-view.tsx`: `handlePublish`/`handleEdit`/`handleDelete` llaman a las actions y hacen `router.refresh()` tras éxito; composer y botón del sidebar solo si `canPublish`; si la action falla, muestra el error y no cierra. → flujo crear completo en `/`.
8. **PostCard.** Nuevas props `authorId`, `currentUserId`, `onDelete`: "Editar" pasa de `Link` a `/create-post` a `button` que abre el modal prefill (solo si `authorId === currentUserId`); se agrega "Borrar" con confirmación modal (Cancelar / Borrar, estilo SPEC 04); audience "toda la guardería" cuando `roomId` es null y no hay nombres; foto desde `photoUrl` (primera). → card con acciones reales.
9. **Verificación.** Playwright 1440/768/375: crear post con 2 fotos, crear anuncio sin foto, recargar y ver persistencia, editar (quitar una foto, cambiar tipo), borrar con confirmación, feed con seed; probar que un post con fotos de un niño `photo_consent=false` devuelve el error. `npm run lint` y `npx tsc --noEmit`.

## Criterios de aceptación

- [x] `/` renderiza los 3 posts seed desde la DB, orden `published_at desc`, sin errores de consola ni de build.
- [x] El usuario staff ve composer y "+Nueva publicación"; un usuario parent no los ve (el feed solo lectura).
- [x] El modal muestra la sección SALA (dropdown con Soles/Estrellas/Lunas + "Toda la guardería", default Soles) y los pills de niños reales activos.
- [x] Submit sin tipo muestra "Elegí un tipo."; sin descripción "Escribí una descripción."; sin niños ni "toda la sala" "Elegí al menos un niño o Toda la sala."
- [x] Publicar sin fotos crea el post en la DB (`posts` + `post_children`), cierra el modal y el post aparece arriba del feed tras `router.refresh()`.
- [x] Publicar con 2 fotos sube los archivos al bucket `post-photos`, crea 2 filas `post_photos` y el feed muestra la primera foto vía signed URL.
- [x] Subir una foto de 6 MB o un GIF muestra el error inline y no llama a la action.
- [x] Con más de 5 fotos: "Máximo 5 fotos."
- [x] Si algún niño etiquetado tiene `photo_consent=false`, publicar con fotos muestra el mensaje de consentimiento y no crea el post; el mismo post sin fotos sí se publica.
- [x] Si la subida falla a mitad, no queda post, ni filas, ni archivos huérfanos (rollback).
- [x] Recargar `/` mantiene todo lo publicado (persistencia real).
- [x] "Editar" (solo en posts propios) abre el modal con prefill completo: tipo, sala, niños, descripción y miniaturas de las fotos existentes.
- [x] Editar quitando una foto borra el archivo del bucket y su fila; el resto se conserva.
- [x] "Borrar" muestra confirmación; al confirmar se borran la fila (cascade) y todos los archivos del bucket del post.
- [x] Un post sin niños etiquetados creado en "Soles" es visible para un padre con hijo en Soles, y **no** para un padre solo de Estrellas.
- [x] Un anuncio con "Toda la guardería" (`room_id null`) es visible para todos los padres.
- [x] El tipo Ánimo (`mood`) persiste y religa correctamente en la DB.
- [x] El post seed sin niños muestra "Toda la sala" / audience correcta en el card (sin romper el layout).
- [x] `npm run lint` y `npx tsc --noEmit` sin errores; verificación Playwright en 1440/768/375.

## Decisiones tomadas y descartadas

Decisiones del usuario (sesión de grilling):

- **Feed 100% real + seed:** los 3 mocks migran a seed (sin `post_children`, porque no hay niños seed — decisión "sin niños seed" de la SPEC 10).
- **CRUD completo:** crear, editar y borrar; el alcance no quedó en solo crear.
- **`mood` al enum** en lugar de quitar Ánimo de la UI.
- **Pills de niños reales** desde la DB.
- **Engagement fuera de alcance** (likes/comentarios en 0).
- **Bucket privado + signed URLs** en lugar de bucket público (fotos de niños no accesibles con link permanente).
- **5 fotos / 5 MB** como límite.
- **Bloqueo de consentimiento** (no solo aviso): `photo_consent=false` impide las fotos, no el post.
- **Edición de todo el formulario** con prefill.
- **Selector de sala en el modal** (el staff no tiene sala propia en `users`).
- **Server action única + spinner**, sin optimistic UI.
- **Borrado de archivos del bucket** siempre (al editar y al borrar).
- **Feed = todo el daycare, desc, sin paginación.**

Decisiones técnicas del spec:

- **`post_photos.url` guarda el storage path:** la URL firmada caduca; persistirla rompería el feed al día siguiente. Firmar en cada lectura.
- **Subida/borrado desde la action con el cliente del usuario** (no service role): las policies de `storage.objects` ya modelan autoría y lectura; no hay que distribuir claves.
- **Bucket con `file_size_limit` y `allowed_mime_types`:** validación en la plataforma además de cliente/server (no se puede saltar con curl).
- **Path con `post_id` en la carpeta:** permite que las policies de storage deleguen en `can_edit_post`/`can_read_post` sin tablas auxiliares.
- **Seed con uuids fijos + `on conflict do nothing`:** idempotente al re-ejecutar la migración.
- **`can_read_post` extendida a posts de sala sin etiquetas:** sin esto, un "Siesta de toda la sala" sería invisible para los padres de esa sala; los posts **con etiquetas** siguen viéndolos solo las familias de esos niños (evita filtrar logros individuales al resto de la sala).
- **PostCard muestra solo la primera foto** (consistente con SPEC 06); el carrusel es otra spec.
- **Spec en la raíz de `specs/`** (patrón SPEC 12): es una feature full-stack con migraciones adentro, no un trabajo de DB puro.

Descartado: optimistic unshift, bucket público, editar solo texto, seed con niños ficticios, mostrar CTA a padres, paginación, guardar URLs firmadas en DB, service role para storage.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `can_read_post()` es la puerta de seguridad del feed | Cambio acotado a la rama "sin etiquetas"; prueba explícita con usuario parent (Estrellas vs Soles) en el paso 9. |
| Subida parcial (falla a mitad) deja huérfanos | Rollback explícito en la action: borrar archivos subidos + post antes de responder error. |
| `createSignedUrl` exige `select` en `storage.objects` | Policy de select con `can_read_post`; sin ella el feed no mostraría fotos a nadie. |
| `ALTER TYPE` sobre enum con datos | `ADD VALUE IF NOT EXISTS` es seguro en Postgres 12+ (valor nuevo, sin rewrite). |
| `cacheComponents: true` | `fetchPosts` vive en la sección dinámica de `page.tsx` (ya envuelta en `connection()` + `<Suspense>`); nada nuevo en prerender. |
| Seed sin niños muestra posts "Toda la sala" poco naturales (logro sin nombre) | Aceptado por el usuario; desaparece en cuanto el staff publica o se etiquetan niños reales. |
| Signed URLs de 1h expiran en sesiones largas | Se regeneran en cada request del feed (no se cachean en DB); documentado en el data layer. |

## Lo que **no** está en esta spec

- Carrusel/galería de varias fotos en el feed.
- Likes, comentarios y notificaciones.
- Paginación o virtualización del feed.
- UI de consentimiento de fotos.
- Muestra de autor real en el PostCard.
- Limpieza periódica de archivos huérfanos del bucket.

Cada uno de esos, si llega, va en su propia spec.
