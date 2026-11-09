# SPEC 17 — Likes y comentarios en el feed (con filtro de groserías)

> **Estado:** Aprobado
> **Depende de:** SPEC 16 (feed real), migración `create_feed_engagement` (tablas `reactions` y `comments` con RLS)
> **Fecha:** 2026-11-09
> **Objetivo:** Que cualquier persona que vea el feed pueda dar "me gusta" y comentar las publicaciones, rechazando los comentarios con groserías en el cliente, en la server action y en la base de datos.

## Alcance

**Incluye:**

- Corazón del `PostCard` como botón de like real: alterna la reacción `love` del usuario actual sobre el post y muestra el total real de `reactions`.
- Ícono 💬 como botón que abre y cierra, bajo el post, la sección de comentarios: lista completa (autor, hora, cuerpo), contador real y formulario para comentar.
- Server actions nuevas `toggleLike`, `addComment`, `updateComment`, `deleteComment` en `app/_actions/engagement.ts`.
- Filtro de groserías en español e inglés con mensaje único `Tu comentario contiene palabras no permitidas. Revisalo.`:
  - pre-check instantáneo en el formulario (lista propia en `utils/profanity.ts`, sin request);
  - piso de seguridad en la DB: trigger sobre `comments` (`insert` y `update`) que rechaza cualquier cuerpo con lenguaje no permitido, incluso si se salta el cliente y la action (curl / PostgREST directo).
- El autor edita y borra sus propios comentarios (la RLS de `comments` ya lo permite; el staff no borra comentarios ajenos).
- Likes y comentarios para todo el que pueda leer el post (staff y familias), en `/staff` y `/family`.
- El ícono 💬 deja de linkear a `/detalle-publicacion` (ruta que no existe).

**No incluye (fuera de esta spec):**

- Filtro de groserías en la descripción de los posts (`posts.body`), que hoy no se valida.
- Notificaciones a las familias cuando alguien comenta o da like.
- Moderación: comentarios ocultos hasta aprobación, denuncias, borrar comentarios ajenos.
- Tipos de reacción distintos del corazón (solo `love`).
- Paginación de comentarios (se muestran todos).
- UI para gestionar la lista de groserías (se edita en el código y en la migración).
- Detección de groserías evadidas con números o símbolos (`put0`, `p.u.t.o`).
- Página `/detalle-publicacion` (el link muerto se elimina, no se crea la ruta).

## Modelo de datos

### DB (sin tablas nuevas; solo un trigger)

- `reactions` y `comments` ya existen con RLS (migración `create_feed_engagement`): no cambian columnas, policies ni grants.
- Nueva migración `supabase/migrations/<ts>_guard_comments_profanity.sql`:
  - Array de palabras groseras en español e inglés (minúsculas, solo letras), espejo de `utils/profanity.ts`.
  - `public.has_profanity(p_text text) returns boolean`: compara `p_text` contra el array con `~*` y límites de palabra (`(^|[^[:alpha:]])` y `([^[:alpha:]]|$)`), para que `computo` no matchee `puto`.
  - Trigger `comments_profanity_guard` (`before insert or update on public.comments for each row`): si `has_profanity(NEW.body)` entonces `raise exception 'comment_profanity_blocked'`.

### Módulo compartido cliente/servidor

```ts
// utils/profanity.ts — isomórfico: lo importa el formulario del comentario
export const profanityWords: string[];      // es + en, minúsculas, solo letras
export const PROFANITY_ERROR: string;       // "Tu comentario contiene palabras no permitidas. Revisalo."
export function containsProfanity(text: string): boolean;
```

`containsProfanity` pasa el texto a minúsculas, lo tokeniza por letras (`/[^\p{L}]+/u`) y devuelve `true` si algún token está en la lista.

### View model (`app/_data/feed.ts`)

```ts
export interface Comment {
  id: string;          // uuid de comments
  authorId: string;    // users.id
  authorName: string;  // users.full_name
  body: string;
  time: string;        // "14:20" — mismo formateo TZ que los posts
}

export interface Post extends EditablePost {
  // …campos existentes sin cambios…
  likes: number;          // total real de reactions (antes 0)
  likedByMe: boolean;     // el usuario actual ya reaccionó
  commentsCount: number;  // comments.length (antes: comments era number)
  comments: Comment[];    // todos, ordenados created_at asc
}
```

### Query (`app/_data/posts.ts`)

- `fetchPosts(supabase, userId)` agrega al select existente:
  - `reactions ( user_id )` → `likes = length` y `likedByMe = some(user_id === userId)` en una sola query;
  - `comments ( id, author_id, body, created_at, users ( full_name ) )` → se ordenan en JS por `created_at` asc y se mapean con `formatPostTime`.
- `app/staff/page.tsx` y `app/family/page.tsx` pasan `session.id` a `fetchPosts`.

### Actions (`app/_actions/engagement.ts`)

```ts
export type ActionResult = { ok: true } | { ok: false; error: string };

toggleLike(postId: string): Promise<ActionResult>
addComment(postId: string, body: string): Promise<ActionResult>
updateComment(commentId: string, body: string): Promise<ActionResult>
deleteComment(commentId: string): Promise<ActionResult>
```

| Acción | Validación | Errores |
| --- | --- | --- |
| todas | sesión (`fetchSessionUser`) | `SESSION_ERROR` (compartido, ver decisiones) |
| `toggleLike` | busca reacción `love` propia: existe → delete; no existe → insert (`unique(post_id,user_id)`) | `No podés reaccionar a esta publicación.` si el insert viola `can_read_post` |
| `addComment` | `body.trim()` requerido | `Escribí un comentario.` / `comment_profanity_blocked` → `PROFANITY_ERROR` / `No podés comentar esta publicación.` |
| `updateComment` | `.update(…).eq("id").select("id")` debe devolver 1 fila | `No podés modificar este comentario.` si 0 filas (RLS de autor) / `PROFANITY_ERROR` |
| `deleteComment` | `.delete(…).eq("id").select("id")` debe devolver 1 fila | `No podés modificar este comentario.` |

La action no valida groserías por su cuenta: intercepta el error `comment_profanity_blocked` del trigger y devuelve `PROFANITY_ERROR` (la DB es la única autoridad).

## Plan de implementación

1. **Migración.** Crear `supabase/migrations/<ts>_guard_comments_profanity.sql` con el array (espejo de `utils/profanity.ts`), `has_profanity()` y el trigger `comments_profanity_guard`; aplicarla con MCP `apply_migration` (mismo nombre que el archivo). Prueba con `execute_sql`: un `insert` en `comments` con una palabra de la lista falla con `comment_profanity_blocked`, y uno sin grosería pasa. → DB protegida.
2. **Filtro compartido.** Crear `utils/profanity.ts` (lista espejo, `PROFANITY_ERROR`, `containsProfanity`). → `npx tsc --noEmit` pasa.
3. **Tipos y data layer.** `Comment` en `feed.ts`, campos nuevos de `Post` y `comments: Comment[]`; `fetchPosts(supabase, userId)` con los dos embeds; páginas `/staff` y `/family` pasan `session.id`. → feed compila con contadores y `likedByMe` reales (aún sin UI).
4. **Actions.** Crear `app/_actions/errors.ts` con `SESSION_ERROR` (moverla de `posts.ts`, que pasa a importarla) y `app/_actions/engagement.ts` con las 4 actions y su mapeo de errores. → actions invocables desde cualquier componente cliente.
5. **Footer interactivo.** `post-card.tsx`: corazón pasa a `<button>` (relleno `#E0654A` solo si `likedByMe`, contorno si no, `aria-label="Me gusta"`); ícono 💬 pasa de `Link` a `<button>` que alterna la sección de comentarios (`aria-label="Comentarios"`); contadores reales. `feed-view.tsx`: handlers `onToggleLike` / `onAddComment` / `onUpdateComment` / `onDeleteComment` que llaman a las actions y hacen `router.refresh()` solo en ok, con flag de pendiente para ignorar dobles clics. → like funciona end-to-end en `/staff` y `/family`.
6. **Sección de comentarios (lectura).** Nuevo `app/_components/comment-section.tsx`: lista de `post.comments` (autor, hora, cuerpo) y estado de apertura en `PostCard` (sin navegación). → sección expandible visible.
7. **Sección de comentarios (escritura).** En `comment-section.tsx`: formulario (input + botón, Enter envía) con estado `submitting`, pre-check `containsProfanity` antes de llamar a la action, error inline sin cerrar la sección, limpieza del input tras éxito. → comentario nuevo aparece en la lista y persiste al recargar.
8. **Editar y borrar.** Botones "Editar"/"Borrar" solo en comentarios propios (visibles al hover): editar reemplaza el cuerpo por el input precargado con Guardar/Cancelar; borrar llama a la action directo. → CRUD de comentarios completo.
9. **Verificación.** Playwright en 1440/768/375 sobre `/staff` y `/family`: like con toggle y persistencia, apertura/cierre de la sección, comentario válido (client y reload), comentario con grosería bloqueado en el formulario y con insert directo en SQL, editar/borrar propios y ausencia de esos botones en ajenos, vista como parent. `npm run lint` y `npx tsc --noEmit`.

## Criterios de aceptación

- [ ] Clic en el corazón likea el post: el contador sube a 1 y el corazón queda relleno; un segundo clic quita el like, el contador vuelve a 0 y el corazón queda en contorno.
- [ ] El corazón relleno depende del usuario: si A likea, B ve el contador en 1 y su propio corazón sin rellenar (y viceversa).
- [ ] `likedByMe` y los contadores sobreviven a recargar la página (leen de `reactions`).
- [ ] El ícono 💬 abre y cierra la sección de comentarios debajo del post, sin navegar a otra ruta; el contador muestra `comments.length` real.
- [ ] Enviar un comentario válido lo guarda en `comments`, aparece en la lista con `full_name` del autor y la hora, y persiste al recargar; el input queda vacío y la sección sigue abierta.
- [ ] Enviar un comentario vacío muestra inline `Escribí un comentario.` y no llama a la action.
- [ ] Escribir una palabra grosera (es o en) muestra inline `Tu comentario contiene palabras no permitidas. Revisalo.`, no se guarda nada y el texto se conserva en el input.
- [ ] Un `insert` directo en `comments` con una palabra de la lista falla con `comment_profanity_blocked` (el filtro no se salta ni con PostgREST/curl), y uno sin grosería entra sin problemas.
- [ ] El autor ve "Editar" y "Borrar" en sus comentarios: editar reemplaza el cuerpo (y vuelve a pasar por el filtro) y borrar lo elimina.
- [ ] En comentarios ajenos no hay botones de editar/borrar, y llamar a `updateComment`/`deleteComment` sobre uno ajeno devuelve `No podés modificar este comentario.`
- [ ] Un usuario parent (que solo puede leer) puede dar like y comentar en los posts que ve, en `/family`.
- [ ] El ícono 💬 no es un `Link` a `/detalle-publicacion` en el HTML resultante.
- [ ] Sin errores de consola ni de build; `npm run lint` y `npx tsc --noEmit` sin errores; verificación Playwright en 1440/768/375.

## Decisiones tomadas y descartadas

Decisiones del usuario (fase de preguntas):

- **1 — Lista propia, validada en la action + piso en la DB**, sin API externa de moderación. Sin costo, sin API key, sin latencia.
- **2 — Rechazo con mensaje amigable inline** (no se guarda nada). Descartado censurar con asteriscos y cola de moderación.
- **3 — El filtro cubre solo comentarios**, no la descripción de los posts.
- **4 — Lista en español e inglés** (los usuarios escriben en cualquiera de los dos).
- **5 — Cualquiera que pueda leer el post comenta y likea** (staff y familias), tal como ya permite la RLS.
- **6 — Sección expandible bajo el post**, sin modal ni ruta aparte.
- **7 — Toggle de like**: se puede poner y quitar; el corazón se rellena solo si el usuario ya reaccionó; contador real.
- **8 — El autor edita/borra lo suyo; el staff no borra comentarios ajenos.**
- **9 — Se muestran todos los comentarios**, sin paginación.

Decisiones técnicas del spec:

- **La DB es la única autoridad del filtro:** el trigger rechaza y la action traduce `comment_profanity_blocked` a `PROFANITY_ERROR`. El pre-check del cliente es solo UX (ahorra el viaje), no seguridad.
- **Lista espejo en dos archivos** (`utils/profanity.ts` y el array de la migración), misma semántica de límites de palabra. Descartado: tabla `profanity_words` + RLS + fetch extra por una lista que no es dato de usuario.
- **Matching por límites de palabra, no por substring:** evita falsos positivos (`computo` no debe matchear `puto`).
- **Sin detección de leetspeak/símbolos:** fuera de alcance, anotado como riesgo.
- **`reactions` con `type='love'` y `unique(post_id,user_id)`:** el toggle es insert o delete; no hay selector de tipo de reacción.
- **`likedByMe` sale del embed `reactions(user_id)` del propio post:** una query para totales y estado propio, sin consulta adicional por usuario.
- **Sin optimistic UI:** mismo patrón que SPEC 16 (action + `router.refresh()`); el doble clic se cubre con un flag de pendiente en `FeedView`.
- **Comentarios se traen junto con el feed:** tráfico bajo, igual que los posts; nada de lazy loading.
- **`SESSION_ERROR` se mueve a `app/_actions/errors.ts`** para compartirla entre `posts.ts` y `engagement.ts` (un solo literal, DRY).
- **Borrar comentario sin modal de confirmación:** acción de bajo valor (se puede reescribir); el de posts sí conserva su confirmación.
- **Se elimina el `Link` a `/detalle-publicacion`:** era un link muerto.

Descartado: API de moderación (Perspective/OpenAI), moderación con comentarios pendientes de aprobación, notificaciones de comentarios, paginación, estados intermedios de carga en el corazón, UI para editar la lista de groserías.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Deriva entre la lista TS y la de la migración | La DB es el piso: cualquier palabra que falte en el cliente aún se bloquea en el insert. Criterio de aceptación con insert directo; comentario "mantener en sincronía" en ambos archivos. |
| Evade el filtro con números/símbolos (`put0`) | Aceptado y fuera de alcance; el matching es por palabra. Ampliar la lista no lo resuelve, haría falta otra estrategia. |
| Cambio de `post.comments` de `number` a `Comment[]` | Toca `feed.ts`, `posts.ts` y `post-card.tsx` en el mismo paso; `tsc --noEmit` en cada paso del plan. |
| `router.refresh()` completo por cada like | Mismo costo que ya asume SPEC 16 para crear/editar/borrar; feed chico, sin paginación. |
| `cacheComponents: true` | `fetchPosts` sigue viviendo en la sección dinámica de las páginas (ya envuelta en `connection()` + `<Suspense>`); nada nuevo en prerender. |
| El trigger también corre al editar un comentario | Deseado: la edición vuelve a pasar por el filtro. |

## Lo que **no** está en esta spec

- Filtro de groserías en `posts.body` (la descripción de los posts).
- Notificaciones de likes/comentarios.
- Moderación: aprobación previa, denuncias, borrar comentarios ajenos.
- Reacciones múltiples (solo el corazón `love`).
- Paginación o "cargar más" en los comentarios.
- Pantalla para administrar la lista de groserías.
- Página de detalle `/detalle-publicacion`.

Cada uno de esos, si llega, va en su propia spec.
