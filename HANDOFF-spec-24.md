# HANDOFF — SPEC 24: Feed de familia

> Contexto para la próxima sesión de OpenCode.
> Última actualización: 2026-11-20 — **SPEC 24 CERRADA**

## Estado en una línea

**SPEC 24 completada y mergeada.** PR #34 fusionado en `master`.
No queda nada pendiente de esta spec.

## Git

```
origin/master = master = f9d975b   (Merge pull request #34 from AriannaCamara/spec-24-family-feed)
                                └─ 2979d2e  implementación
                                └─ 65aa12c  creación de specs/24-family-feed.md
```

- `git status` limpio (solo `HANDOFF-spec-24.md` sin trackear).
- La rama `spec-24-family-feed` **fue borrada de origin** al mergear;
  aún existe **localmente** → se puede borrar:
  ```powershell
  git branch -d spec-24-family-feed
  ```
- `specs/24-family-feed.md` en HEAD con `**Estado:** Implementado` y los
  12 criterios en `[x]`.

## Qué implementa la SPEC 24

Reemplaza el `/family` (feed genérico de solo lectura) por la vista de
`references/pantallas/familia-feed.dc.html`:

- Cabecera `TU FAMILIA` / `Hola, {nombre}` / `Así va el día de hoy`.
- **Pills de filtro por hijo** + `Todos` (activo por defecto, oscuro `#3F362E`).
- Separador `HOY · VIERNES 20 NOV` (fecha en español, mayúsculas).
- Tarjetas con `HH:MM · autor · sala` y contadores ❤/💬.
- **Filtrado client-side** por `post.childIds` (`post_children`).

Fuera de alcance (no tocado, posible material para specs futuras): detalle de
publicación, publicar desde familia, cambios de RLS, `/staff`, fotos/avisos/cuenta.

## Archivos que introdujo

| Archivo | Cambio |
|---|---|
| `app/_components/family-feed-view.tsx` | **nuevo** — cabecera + pills + separador + tarjetas + engagement |
| `app/_data/posts.ts` | `fetchPosts` suma embeds `users ( full_name )` y `rooms ( name )` → `authorName` / `roomName` |
| `app/_data/feed.ts` | `Post` gana `authorName: string` y `roomName: string` |
| `app/_components/post-card.tsx` | props **opcionales** `subtitle` y `showAudience`; Editar/Borrar solo si se pasan handlers |
| `app/family/page.tsx` | renderiza `FamilyFeedView` en vez de `FeedView`; `dateLabel` desde `fetchFeedSummary` |
| `specs/24-family-feed.md` | estado `Aprobado` → `Implementado`; 12 checkboxes marcados |

## Decisiones vigentes (no reabrir sin motivo)

1. **`HH:MM · autor · sala` vía extensión de `fetchPosts`** (elegido por la usuaria):
   embeds `users`/`rooms` en la misma query. Es cambio de query, **no de schema**;
   RLS lo permite (`users_select_same_daycare_members` de SPEC 17 + `rooms_select`).
2. **Tarjetas reutilizan `PostCard`** con props opcionales — sin duplicar markup.
   El feed staff queda idéntico porque `FeedView` no pasa esas props.
3. **Filtro client-side**, no `searchParams` (decisión de la spec).
4. `postChildren` de la spec = el **`childIds`** que expone `fetchPosts`.
5. Fecha del separador reutiliza `summary.dateLabel` → evita mismatch de
   hidratación de `new Date()` en el cliente.
6. Anuncios sin `post_children` solo se ven en `Todos` (comportamiento esperado).

## Verificación hecha (12/12 criterios ✓)

- `npm run lint` → **0 errores** (4 warnings preexistentes de `<img>`, no son de esta spec).
- `npx tsc --noEmit` → ✓
- `npm run build` → ✓ (`/family` en ◐ PPR, correcto con `connection()` + Suspense).
- Playwright como parent en `/family`: cabecera, pills, separador, filtro por hijo,
  like 0→1→0, comentario crear/borrar, estado vacío con Ashlie, `/staff` intacto.
- Capturas: `.playwright-mcp/family-feed-{1440,768,375}.png` + `staff-feed-check.png`.
- Datos de prueba limpiados (like y comentario de prueba removidos).

## Entorno

- **Dev server activo en `http://localhost:3000`** (proceso aparte, PID 15376).
  No levantar otro: `next dev` se niega si ya hay uno corriendo.
- **Credenciales de prueba** (ya en el repo, en texto plano):
  - parent → `supabase/migrations/20261103125652_seed_parent_test_user.sql`
  - staff  → `specs/09-auth-and-route-protection.md`
- Playwright MCP reutiliza la sesión del navegador; si la ventana está en `/login`,
  reloguear antes de verificar.
- Rama actual: **`master`**.

## Limpieza opcional pendiente

- Borrar la rama local `spec-24-family-feed` (ya mergeada).
- Borrar este archivo (`HANDOFF-spec-24.md`) o commitearlo si querés conservarlo.
