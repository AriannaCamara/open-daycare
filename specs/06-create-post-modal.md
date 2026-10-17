# SPEC 06 — Modal "Nueva publicación" en el feed

> **Estado:** Implementado
> **Depende de:** SPEC 01
> **Fecha:** 2026-10-17
> **Objetivo:** Implementar la pantalla `crear-publicacion.dc.html` como modal sobre el feed, con selección múltiple de niños y los 7 tipos de publicación, que al publicar agrega la publicación arriba del feed.

## Alcance

**Incluye:**

- Modal nuevo `app/_components/create-post-modal.tsx` (`"use client"`): overlay + card (max 580px, radius 24, bg `#FBF4EC`) con header "Cancelar / Nueva publicación / Publicar" y las 4 secciones del template:
  - **PARA**: pills multi-select con avatar de cada uno de los 8 niños de `children.ts` + pill "Toda la sala". Selección múltiple; "Toda la sala" es exclusiva (activarla limpia los niños y viceversa).
  - **TIPO**: 7 pills — Comida, Siesta, Actividad, Logro, Ánimo, Foto, Anuncio — con los colores del template. Ninguna preseleccionada.
  - **DESCRIPCIÓN**: textarea, placeholder "Contá cómo le fue hoy…".
  - **FOTOS**: `input type="file" multiple` oculto tras el tile "Agregar"; miniaturas 96px con X para quitar; sin límite de fotos.
- **Anuncio fuerza "Toda la sala"**: con tipo Anuncio, PARA queda en modo "Toda la sala" deshabilitado (la selección individual no se muta ni se pierde; al volver a otro tipo se conserva).
- Validación inline en español (borde `#D9583C`, texto `#C5503A`, estilo SPEC 03/04).
- Cierre con Cancelar, clic en overlay y Esc; al cerrar se resetea todo (selección, tipo, descripción, fotos).
- `app/_components/feed-view.tsx` (`"use client"`): concentra Sidebar + saludo + composer + lista de posts + modal; mantiene `posts` en estado local y al publicar hace `unshift` del post nuevo.
- `app/page.tsx` (server) pasa a montar `<FeedView>` con los datos; el Sidebar deja de renderizarse ahí.
- `app/_components/sidebar.tsx`: nueva prop opcional `onNewPost?: () => void`. Si existe, el botón "+Nueva publicación" la llama; si no (`/kids`, `/kids/[id]`), el botón linkea a `/` (hoy apunta a `/create-post` → 404).
- Composer "Compartí un momento…" de `app/page.tsx`: pasa de `Link` a `button` que abre el modal.
- `app/_data/feed.ts`: `PostKind` ampliado a 7; `postKindStyles` (label + colores sólidos del modal + colores de pill del feed) usado por modal y PostCard; `childName?` → `givenNames: string[]`; nuevo `photoUrl?: string`.
- `app/_components/post-card.tsx`: pill de tipo desde `postKindStyles`; header y línea "Para:" construidos desde `givenNames`; si `photoUrl` existe renderiza `<img>` donde hoy va el bloque placeholder.

**No incluye (fuera de esta spec):**

- Ruta `/create-post` (el modal la reemplaza en sidebar y composer; el `Link` se elimina de ambos).
- El link "Editar" de `post-card.tsx:165` — sigue apuntando a `/create-post` (404 preexistente); el prefill de edición va en otra spec.
- Backend, DB, fetch o persistencia: al recargar, la publicación desaparece (patrón SPEC 04).
- Subida real de fotos a servidor; las imágenes son previews locales (`URL.createObjectURL`).
- Gallery de varias fotos por post en el feed (PostCard muestra la primera).
- Envío/notificationes a familias, likes/comentarios nuevos.
- Tests automatizados.

## Modelo de datos

```ts
// feed.ts
export type PostKind =
  | "meal" | "nap" | "activity" | "achievement"
  | "mood" | "photo" | "announcement";

export const postKindLabels: Record<PostKind, string> = {
  meal: "COMIDA", nap: "SIESTA", activity: "ACTIVIDAD",
  achievement: "LOGRO", mood: "ÁNIMO", photo: "FOTO",
  announcement: "ANUNCIO",
};

export const postKindStyles: Record<PostKind, {
  label: string;
  solid: { bg: string; text: string };   // pills del modal (template)
  pill:  { bg: string; text: string };   // pill del feed (PostCard)
}>;

export interface Post {
  id: string;
  kind: PostKind;
  givenNames: string[];   // ["Mateo","Sofía"]; [] si es "toda la sala"
  time: string;           // "14:20" (hora actual al publicar)
  audience: string;       // "familia de Mateo, Sofía" | "toda la sala"
  body: string;
  likes: number;          // 0 en posts nuevos
  comments: number;       // 0 en posts nuevos
  photoLabel?: string;    // mocks existentes
  photoUrl?: string;      // objectURL de la primera foto (posts nuevos)
}
```

| Campo | Regla | Mensaje |
| --- | --- | --- |
| kind | requerido (nulo al abrir) | `Elegí un tipo.` |
| body | requerido (trim) | `Escribí una descripción.` |
| PARA | `givenNames.length > 0` o "toda la sala" | `Elegí al menos un niño o Toda la sala.` |

Construcción del post al publicar:

- `id`: `post-${Date.now()}`.
- `givenNames`: nombres de los ids seleccionados en orden de `children[]`. Si `effectiveRoom` (toda la sala activa **o** tipo Anuncio), `[]`.
- `audience`: sala → `"toda la sala"`; si no → `` `familia de ${givenNames.join(", ")}` ``.
- `time`: hora actual formato `HH:MM` (24h, cero a la izquierda).
- `photoUrl`: `URL.createObjectURL` de la primera foto elegida; si no hay fotos, `undefined`.
- `likes`/`comments`: `0`.

Display en `PostCard`:

- Avatar/nombre: con `givenNames` → avatar del primer niño + `givenNames.join(", ")`; sin nombres → ícono megáfono + `"Anuncio general"` (announcement) o `"Toda la sala"` (resto).
- Línea `Para: {audience}`.
- Foto: `photoUrl` → `<img>`; si solo hay `photoLabel` → bloque placeholder actual.

Colores de TIPO (solid modal / pill feed):

| Tipo | solid | pill |
| --- | --- | --- |
| Comida | `#F4DC8E` / `#9A7B1E` | `#F3E7C4` / `#9A7B1E` |
| Siesta | `#E7DCF6` / `#7B5FC0` | igual |
| Actividad | `#2E89A6` / `#fff` | `#C7E7F1` / `#1F7A93` |
| Logro | `#CFEBD8` / `#3E9B6C` | igual |
| Ánimo | `#F9D2DE` / `#C56486` | igual |
| Foto | `#FBD8CC` / `#D9684A` | igual |
| Anuncio | `#CCD8F4` / `#4E72C8` | igual |

## Plan de implementación

1. **Tipos.** `feed.ts`: ampliar `PostKind` a 7, agregar `postKindStyles`, cambiar `childName` → `givenNames: string[]`, agregar `photoUrl?`, ajustar los 3 posts mock. → `tsc` pasa; feed se ve igual.
2. **PostCard.** `post-card.tsx`: pill desde `postKindStyles`; header y "Para:" desde `givenNames` (caso `[]` → megáfono); render de `photoUrl` con `<img>`. → feed igual con los mocks.
3. **Esqueleto del modal.** Crear `create-post-modal.tsx` con props `open`, `onClose`, `onPublish`: overlay + card + header + las 4 secciones estáticas (pills de niños, 7 tipos, textarea, tile "Agregar"). → montable con `open={true}`.
4. **Selección.** Estado `selectedIds`, `room`, `kind`; toggle de pills, exclusividad de "Toda la sala", `effectiveRoom = room || kind === "announcement"` (Anuncio muestra sala forzada sin mutar `selectedIds`). → multi-selección completa.
5. **Validación y cierre.** `values`/`errors` con la tabla anterior, errores inline; Cancelar, overlay y Esc cierran y resetean (incluye fotos). → interacción completa.
6. **Fotos.** `input file multiple` + miniaturas con X (`URL.revokeObjectURL` al quitar). → preview funcional.
7. **Sidebar.** `sidebar.tsx`: prop `onNewPost`; con handler → `<button>`, sin handler → `<Link href="/">`. → `/kids` navega al feed.
8. **FeedView.** Crear `feed-view.tsx`: estado `posts` + `open`; composer como `button`; montar Sidebar con `onNewPost` y el modal; `handlePublish` hace `unshift` y cierra. Simplificar `app/page.tsx` a `<FeedView user room initialPosts />`. → flujo completo en `/`.
9. **Verificación.** Playwright 1440/768/375 en `/` y `/kids` contra `crear-publicacion.dc.html`; `npm run lint` y `npx tsc --noEmit`.

## Criterios de aceptación

- [ ] `/` renderiza sin errores de consola ni de build.
- [ ] El botón "+Nueva publicación" del sidebar abre el modal y no navega.
- [ ] El composer "Compartí un momento…" abre el modal.
- [ ] El modal muestra header Cancelar/Nueva publicación/Publicar y las secciones PARA, TIPO (7 pills), DESCRIPCIÓN, FOTOS.
- [ ] TIPO arranca sin ninguna pill seleccionada.
- [ ] Se pueden seleccionar 3 niños a la vez y las 3 pills quedan activas.
- [ ] Clic en un niño ya seleccionado lo deselecciona.
- [ ] Activar "Toda la sala" deselecciona todos los niños; elegir un niño desactiva "Toda la sala".
- [ ] Submit sin tipo muestra "Elegí un tipo." y no publica ni cierra.
- [ ] Submit con descripción vacía muestra "Escribí una descripción."
- [ ] Submit sin niños ni sala muestra "Elegí al menos un niño o Toda la sala."
- [ ] Con tipo Anuncio, PARA queda en "Toda la sala" deshabilitado; al volver a "Actividad" se conserva la selección previa de niños.
- [ ] Publicar válido cierra el modal y agrega el post arriba del feed con hora actual, `likes 0`, pill del tipo elegido y "Para: familia de Mateo, Sofía…".
- [ ] Publicando un Anuncio, el post muestra "Para: toda la sala" y el ícono megáfono.
- [ ] Elegir una foto muestra la miniatura en el modal y la imagen en el post del feed.
- [ ] Quitar la miniatura antes de publicar → el post sale sin imagen.
- [ ] Cancelar, clic en overlay y Esc cierran y resetean (reabrir: vacío, sin tipo, sin fotos).
- [ ] A 375px el modal cabe sin scroll horizontal.
- [ ] En `/kids` el botón del sidebar linkea a `/` (no rompe).
- [ ] `npm run lint` y `npx tsc --noEmit` sin errores.

## Decisiones tomadas y descartadas

- **Sí:** modal en lugar de ruta — decisión del usuario; `/create-post` no existe y daría 404.
- **Sí:** sidebar **y** composer abren el modal; "Editar" queda fuera (prefill = spec aparte).
- **Sí:** ampliar a 7 tipos — el template los define; un solo `postKindStyles` evita desfases entre modal y feed.
- **Sí:** selección múltiple de niños — requerimiento explícito (actividad grupal).
- **Sí:** "Toda la sala" exclusiva — `audience` de un solo string, igual al anuncio actual.
- **Sí:** Anuncio fuerza sala vía `effectiveRoom` calculado, sin mutar `selectedIds` — conserva la selección sin estado extra.
- **Sí:** `givenNames: string[]` + texto unido — decisión del usuario; `childIds` con lookup descartado por acoplar `feed.ts` a `children.ts`.
- **Sí:** estado local en `FeedView` con `unshift` — patrón SPEC 04 (sin backend).
- **Sí:** fotos con `input file` + `objectURL`, sin límite; PostCard muestra la primera — decisión del usuario; límite de 4 descartado.
- **Sí:** modal solo en el feed; sidebar en otras páginas linkea a `/` — decisión del usuario.
- **Sí:** `FeedView` cliente concentra Sidebar + feed + modal — desde una page server no se puede pasar un callback a un componente cliente.
- **Sí:** ningún tipo preseleccionado (a diferencia de SALA en SPEC 04) — decisión del usuario; la validación cubre el caso.
- **Sí:** card max 580px — medida del template (SPEC 04: 520px, SPEC 05: 480px).
- **Descartado:** localStorage, query param `?nueva=1`, abrir desde `/kids`, límite de fotos, focus trap, edición de posts.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `URL.createObjectURL` sin `revoke` filtra memoria | Revocar al quitar miniatura y al resetear/cerrar el modal. |
| Sidebar compartido en 3 páginas | Prop opcional `onNewPost`; sin ella el botón conserva un `Link` (verificar en `/kids`). |
| `cacheComponents: true` | Todo el flujo es componente cliente con props estáticas; sin fetch no requiere `<Suspense>`. |
| Posts mock migrados a `givenNames` | Paso 1 + 2 verifican feed idéntico antes de tocar el modal. |
| "Editar" sigue en `/create-post` (404) | Preexistente y documentado como fuera de alcance. |

## Lo que **no** está en esta spec

- Ruta `/create-post` ni persistencia de las publicaciones.
- Edición de publicaciones (link "Editar" y prefill).
- Subida real de fotos o galería múltiple en el feed.
- Likes, comentarios o notificaciones a familias.

Cada uno de esos, si llega, va en su propia spec.
