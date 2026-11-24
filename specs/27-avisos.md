# SPEC 27 — Avisos (actividad reciente de familias para staff)

> **Estado:** Aprobado
> **Depende de:** SPEC 12 (parent invite and activation), SPEC 16 (staff post publishing), SPEC 17 (feed likes and comments), SPEC 25 (post detail)
> **Fecha:** 2026-11-23
> **Objetivo:** Crear la ruta `/staff/announcements` que lista la actividad reciente de las familias (comentarios, reacciones y activaciones) siguiendo `references/pantallas/avisos.dc.html`.

## Alcance

**Incluye:**

1. **Ruta `/staff/announcements`** (`app/staff/announcements/page.tsx`): bajo el prefijo `/staff`, así que el guard del proxy ya exige rol staff/admin (SPEC 09). Estados: carga (fallback de Suspense), con eventos y vacío ("Todavía no hay avisos.").
2. **Data** (`app/_data/announcements.ts`): unión de 4 queries sobre tablas existentes, sin schema nuevo:
   - `comments` con embed `users(full_name, role)` y `posts(id, post_children(children(full_name)))` → evento `comment`.
   - `reactions` con los mismos embeds → evento `reaction`.
   - `invitations` (`status='accepted'`, `accepted_at NOT NULL`) con embed `children(full_name, parent_children(parent_id, created_at))` → evento `activation`.
   - `users(full_name)` de los `parent_id` resueltos para el nombre del padre; si RLS lo oculta o no hay vínculo en la ventana, se usa el `email` de la invitación.
   - Orden: mezcla los tres tipos por fecha descendente. Límite inicial **20**, página siguiente de **20** ("Cargar más").
3. **Vista** (`app/_components/announcements-view.tsx`): cabecera `ACTIVIDAD` / `Avisos`, tarjetas según la referencia:
   - `comment`: «{nombre} comentó en la publicación de {niño}.» → link a `/posts/{id}`.
   - `reaction`: «{nombre} reaccionó a la publicación de {niño}.» → link a `/posts/{id}`.
   - `activation`: «{nombre} activó su cuenta y ya sigue a {niño}.» → **sin link** (como la referencia).
   - Tiempo relativo en español, precalculado en el servidor (`Hace 12 min` / `Hace 1 h` / `DD/MM HH:MM`).
4. **"Cargar más"**: server action `loadMoreAnnouncements(offset)` que devuelve `{ events, hasMore }`; el botón se oculta cuando `hasMore` es falso.
5. **Sidebar staff**: item **Avisos** (icono de campana) en `navItems` de staff, entre "Niños" y "Mi cuenta".

**No incluye (fuera de esta spec):**

- Recordatorio "enviá el resumen del día" (requiere lógica de horario/cron).
- Panel familiar: Avisos es solo staff (decisión del usuario).
- Tabla `events`, triggers, índices nuevos o cualquier migración.
- Marcar como leído, contador de no leídos o notificaciones push/email.
- Realtime: la pantalla muestra los datos al cargar; no se actualiza sola.

## Modelo de datos

Sin cambios de schema. Nuevo tipo en `app/_data/announcements.ts`:

```ts
export interface AnnouncementEvent {
  id: string;
  kind: "comment" | "reaction" | "activation";
  actorName: string; // users.full_name; fallback: email de la invitación
  childName: string | null; // given name del niño ("" si el post no tiene niños)
  postId: string | null; // "/posts/{id}"; null en activation
  timeLabel: string; // "Hace 12 min" — formateado en el servidor
  createdAt: string; // ISO — orden mezclado
}
```

Algoritmo de página (`fetchAnnouncements(supabase, offset, limit)`):

1. Cada query pide las primeras `offset + limit + 1` filas ordenadas por fecha desc (`+1` para detectar si hay más).
2. Se unen en un solo array, se ordenan por `createdAt` desc y se corta `[offset, offset + limit)`.
3. `hasMore = true` si alguna query devolvió más de `offset + limit` filas.

RLS (verificar con query de prueba en el paso 1): `comments_select_readable` / `reactions_select_readable` (SPEC 17) filtran por `can_read_post`; `invitations` solo devuelve las de `is_staff_of_child`; `parent_children_select_own_or_staff` (SPEC 12) permite leer los vínculos; `users_select_same_daycare_members` permite leer `full_name`/`role` de miembros de la misma guardería.

## Plan de implementación

1. **Data**: crear `app/_data/announcements.ts` con `AnnouncementEvent`, `formatRelativeTime(iso)` (server-side, TZ `America/Argentina/Buenos_Aires`) y `fetchAnnouncements` con las 4 queries + merge + resolución de nombre de activación (fallback email). → verificar con una query de prueba que los embeds de RLS devuelven datos como staff.
2. **Action**: crear `app/_actions/announcements.ts` con `loadMoreAnnouncements(offset)` que reusa `fetchAnnouncements` (limit 20) y devuelve `{ events, hasMore }`.
3. **Ruta**: crear `app/staff/announcements/page.tsx` (server component con `connection()` + Suspense) que resuelve la sesión, llama `fetchAnnouncements(supabase, 0, 20)` y renderiza `AnnouncementsView`.
4. **Componente** `app/_components/announcements-view.tsx` ("use client"): cabecera, lista de tarjetas (link en comment/reaction con `stopPropagation` no requerido — son elementos propios; div plano en activation), botón "Cargar más" con estado pending (ignora dobles clics, mismo patrón que el feed), estado vacío.
5. **Sidebar**: añadir `{ href: "/staff/announcements", label: "Avisos", icon: <BellIcon /> }` a los `navItems` de staff en `app/_components/sidebar.tsx`.
6. **Verificación**: Playwright como staff (ver eventos creados en la sesión: comentario, reacción y activación de la invitación de prueba; links al detalle; cargar más; estado vacío con datos limpios), capturas 1440/768/375, `npm run lint`, `npx tsc --noEmit`, `npm run build`.

## Criterios de aceptación

- [ ] `/staff/announcements` renderiza con sesión staff, con sidebar staff y el item "Avisos" activo.
- [ ] Un `parent` que navega a la URL es redirigido a `/family` (guard existente del proxy).
- [ ] La cabecera muestra `ACTIVIDAD` y `Avisos` según la referencia.
- [ ] Un comentario nuevo de una familia aparece como «{nombre} comentó en la publicación de {niño}.» y navega a `/posts/{id}` al hacer clic.
- [ ] Una reacción nueva aparece como «{nombre} reaccionó a la publicación de {niño}.» y navega a `/posts/{id}`.
- [ ] Una invitación aceptada aparece como «{nombre} activó su cuenta y ya sigue a {niño}.» **sin link**; si el nombre no se resuelve, muestra el email de la invitación.
- [ ] Los eventos de los tres tipos están ordenados del más reciente al más antiguo, mezclados.
- [ ] Solo se muestran eventos de familias (`role = parent`) en comentarios y reacciones.
- [ ] Los tiempos se muestran en español (`Hace 12 min` / `Hace 1 h` / `DD/MM HH:MM`) sin errores de hidratación en consola.
- [ ] Con 21+ eventos, "Cargar más" agrega 20 y se oculta al no haber más; con menos de 20 no se muestra.
- [ ] Sin eventos, muestra "Todavía no hay avisos."
- [ ] Recargar la página muestra los mismos eventos (datos reales, no estado local).
- [ ] La vista se ve correcta en 1440, 768 y 375 px (capturas en `.playwright-mcp/`).
- [ ] `npm run lint` y `npx tsc --noEmit` sin errores.

## Decisiones tomadas y descartadas

**Del usuario:**

1. **Solo staff**: descartado el panel familiar (la referencia de familia no incluye el item; los eventos de activación no le son útiles).
2. **Unión de queries, sin tabla `events`**: descartados triggers/migración — las tablas `comments`, `reactions` e `invitations` ya registran todo con fecha.
3. **"Cargar más" de 20**: descartado límite fijo sin botón y descartado scroll infinito.
4. **Tres tipos de evento** (comentarios, reacciones, activaciones): descartado el recordatorio de resumen del día (requiere cron/horario).
5. **Nombre del padre con fallback al email**: descartado mostrar solo el email (se desvía de la referencia) y descartado una columna nueva de `parent_id` en `invitations` (migración innecesaria).

**Del implementador:**

6. **Solo eventos de familias** (`role = parent`) en comentarios/reacciones: la actividad del propio staff ya la ve en el feed; la referencia solo muestra acciones familiares y el toggle de notificación se llama "Nuevos comentarios de familias". Descartado mostrar todo.
7. **Tiempo relativo precalculado en el servidor** (`timeLabel`): descartado formatear en el cliente (rompería la hidratación, misma restricción que el `dateLabel` de la SPEC 24).
8. **Página con `offset + limit + 1` por query**: descartado offset SQL sobre cada tabla por separado sin `+1` (no permitiría saber si hay más sin una llamada extra).
9. **Resolución de nombre del padre por ventana temporal**: se busca el vínculo `parent_children` del mismo `child_id` creado junto a `accepted_at` (la acción `accept_invitation` inserta ambos en la misma transacción); si RLS o la ventana no lo resuelven → email. Descartado hacer N+1 queries por evento: el embed trae todos los vínculos del niño y se empareja en memoria.
10. **Posición del item en el sidebar** (después de "Niños") para respetar el orden de la referencia: Feed → Niños → Avisos → Mi cuenta.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| RLS oculta `parent_children`/`users` del padre activado | Fallback al `email` de la invitación (criterio de aceptación dedicado). |
| Los embeds de `posts → post_children → children` no devuelven nombres por RLS | `childName` queda `null` y el texto usa «en una publicación»; no rompe el fetch. |
| Sin índice global en `created_at` de `comments`/`reactions`, el orden mezclado degrada con volumen | Límite de 20 por página lo mantiene acotado; si crece, se migra a tabla `events` (fuera de alcance). |
| Modificar `sidebar.tsx` choca con la SPEC 26 (también agrega un item) | Es una línea por spec; resolver el orden al mergear (Avisos antes de Mi cuenta). |
| Invitaciones aceptadas muy antiguas ensucian el feed | Sin límite de antigüedad en v1 (decisión anotada); el "Cargar más" las alcanza. |

## What is **not** in this spec

- Recordatorio de resumen del día.
- Avisos en el panel familiar.
- Tabla `events`, triggers, migraciones o índices nuevos.
- Estados de leído/no leído y notificaciones push/email.
- Actualización en tiempo real (Realtime).
