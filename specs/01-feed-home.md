# SPEC 01 — Feed como Home (`/`)

**Estado:** Borrador
**Fecha:** 2026-10-13
**Depende de:** —
**Objetivo:** Portar la pantalla `references/pantallas/feed.dc.html` a la ruta `/` de Next.js con estilo visual idéntico, usando datos mock tipados y sin autenticación ni base de datos.

## Alcance

**Incluye:**

- Ruta `/` (`app/page.tsx`) que renderiza el feed.
- Shell con sidebar: logo OpenDayCare / Sala Soles, botón "Nueva publicación", nav Feed/Niños/Avisos/Mi cuenta, footer con "Caro Giménez" y botón cerrar sesión.
- Header "GUARDERÍA · SALA SOLES" / "Buenas, Caro" / "12 niños · martes 17 jun".
- Composer "Compartí un momento…".
- Sección "PUBLICADO HOY" con 3 tarjetas: logro, actividad (con placeholder de foto) y anuncio.
- Paleta, tipografías (Fredoka/Nunito), radios, sombras y espaciados idénticos al template.
- Datos mock tipados en `app/_data/feed.ts`.

**No incluye (fuera de esta spec):**

- Autenticación/login real.
- Base de datos o fetch a backend.
- Crear/editar publicaciones; los links apuntan a rutas futuras pero no se implementan.
- Interactividad de likes/comentarios (solo visual).
- Otras pantallas (niños, avisos, mi cuenta, detalle, foto).
- Dark mode.
- Responsive móvil específico (el template es desktop con sidebar fijo).
- Tests.

## Modelo de datos

Nuevo archivo `app/_data/feed.ts`:

Los identificadores del código van en inglés (regla de clean code del repo); los textos visibles quedan en español.

```ts
export type PostKind = "achievement" | "activity" | "announcement";

export const postKindLabels: Record<PostKind, string> = {
  achievement: "LOGRO",
  activity: "ACTIVIDAD",
  announcement: "ANUNCIO",
};

export interface Post {
  id: string;
  kind: PostKind;
  childName?: string;   // solo achievement/activity
  time: string;         // "14:20"
  audience: string;     // "familia de Mateo" | "toda la sala"
  body: string;
  likes: number;
  comments: number;
  photoLabel?: string;  // solo activity
}

export interface SessionUser {
  name: string;   // "Caro Giménez"
  role: string;   // "Maestra · Soles"
  initial: string; // "C"
}

export interface RoomSummary {
  roomName: string;     // "Sala Soles"
  greetingName: string; // "Caro"
  childCount: number;   // 12
  dateLabel: string;    // "martes 17 jun"
}

export const posts: Post[];              // los 3 posts del template
export const sessionUser: SessionUser;
export const room: RoomSummary;
```

Los colores de avatar y de las pills se derivan de `kind` en el componente (no se guardan valores hex en los datos).

## Plan de implementación

1. **Fuentes y tema global.** En `app/layout.tsx`: reemplazar Geist/Geist_Mono por `Fredoka` y `Nunito` (`next/font/google`), `lang="es"`, quitar clases de dark. En `app/globals.css`: definir tokens `@theme` (paleta y familias Fredoka/Nunito), `body` con `bg #F6ECDF`, color `#3F362E`, fuente Nunito; eliminar el bloque `prefers-color-scheme`. → la app compila con la paleta base.
2. **Datos mock.** Crear `app/_data/feed.ts` con los tipos y los valores del template (3 posts, usuario, sala). → sin UI todavía.
3. **Sidebar (shell).** Crear `app/_components/sidebar.tsx`, parametrizable (`user`, `room`, `activeHref`), con logo, botón nueva publicación, nav con Feed en estado activo, links a rutas reales futuras y footer con usuario + cerrar sesión. → montable aislado.
4. **PostCard.** Crear `app/_components/post-card.tsx` con variante por `kind` (pill, avatar/ícono, audience, body, placeholder de foto, footer likes/comentarios/Editar). → montable aislado.
5. **Ensamblar home.** Reescribir `app/page.tsx`: layout flex (sidebar + main), header guardería, composer enlazado a `/crear-publicacion`, separador "PUBLICADO HOY" y map de `posts` a `PostCard`. → ruta `/` completa.
6. **Verificación.** `npm run dev`, captura con Playwright a 1440px y comparación contra `references/screenshots/feed.png`; correr `npm run lint` y `npx tsc --noEmit`. → sin errores y match visual.

## Criterios de aceptación

- [ ] `/` renderiza sin errores de consola ni de build.
- [ ] Sidebar con logo, subtítulo "Sala Soles", botón "Nueva publicación", nav con Feed en estado activo (fondo `#FBE3D8`, texto `#D9583C`) y footer "Caro Giménez / Maestra · Soles".
- [ ] Header muestra "GUARDERÍA · SALA SOLES", "Buenas, Caro" y "12 niños · martes 17 jun".
- [ ] Composer "Compartí un momento…" presente.
- [ ] 3 posts con pill correcta (LOGRO verde, ACTIVIDAD celeste, ANUNCIO azul), audience, cuerpo, likes (3/5/8) y comentarios (1/2/0).
- [ ] Post de actividad muestra placeholder "Foto · pintando con témperas".
- [ ] Main con ancho máx ~760px y bg `#F6ECDF`; tarjetas bg `#FFFDF9`, borde `#ECE0D0`, radio 20px.
- [ ] Tipografías: títulos Fredoka 600, cuerpo Nunito.
- [ ] Links del sidebar apuntan a rutas reales (`/ninos`, etc.), no `#`.
- [ ] `npm run lint` y `npx tsc --noEmit` sin errores.

## Decisiones tomadas y descartadas

- **Solo `/`, links a rutas futuras:** no se crean placeholders; cada pantalla se difiere a su propia spec.
- **Datos mock en módulo tipado** en lugar de hardcode dentro del componente, para migrar a DB sin reescribir la UI.
- **Tailwind v4 + tokens `@theme`** en `globals.css` en lugar de estilos inline; se permiten valores arbitrarios para clavar el pixel.
- **Shell reutilizable parametrizable** (`activeHref`) porque el sidebar se repite en todas las pantallas.
- **Identificadores en inglés, copy en español:** los tipos, variables y `kind` (`achievement`/`activity`/`announcement`) van en inglés; las etiquetas visibles (LOGRO/ACTIVIDAD/ANUNCIO) se resuelven con un mapa (`postKindLabels`) solo para la UI.
- **Descartado:** interactividad con `useState` para likes, CSS Modules, autenticación, dark mode y persistencia.
- **Definición con clarificación detallada** (no hubo atajo de la fase de preguntas).

## Riesgos

- **Fidelidad de fuentes:** las métricas de Fredoka/Nunito vía `next/font` pueden diferir levemente de las del template; verificar con screenshot.
- **Rendering inline vs. Tailwind:** posibles diferencias de sombras/antialiasing; mitigar usando valores exactos y comparando contra `references/screenshots/feed.png`.
- **`cacheComponents: true`:** los datos deben quedar como constantes estáticas (sin fetch) y no dependen de `<Suspense>`.
