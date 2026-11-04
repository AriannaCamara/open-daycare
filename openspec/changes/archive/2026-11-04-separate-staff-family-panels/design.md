# Design

## Context

Ver `proposal.md` — Why. Contexto técnico relevante:

- `proxy.ts` (Next 16, reemplaza a `middleware`) ya ejecuta `updateSession()` en todas las rutas: verifica sesión con `getClaims()` y redirige sin sesión → `/login` o con sesión en ruta pública → `/`. `PUBLIC_PATHS = ["/login", "/activate-account"]`.
- El rol vive en `public.users.role` (`staff | parent | admin`). `fetchSessionUser()` (app/_data/session.ts) ya hace esa query desde Server Components con RLS `users_select_own` (cada usuario lee su propia fila) — no se necesita service role key.
- Cada página compone a mano `<AppSidebar>` + `<main>` y pasa `activeHref` hardcodeado; `AppSidebar` (server) hace `await connection()` + fetch de sesión para `canPublish`.
- `next.config.ts` tiene `cacheComponents: true`: los fetch de sesión deben ir detrás de `connection()`.
- `login-form.tsx` hace `router.push("/")` tras un login exitoso.

## Goals / Non-Goals

**Goals:**
- Que el guard de rol viva en el servidor (proxy), antes de renderizar cualquier página.
- Un solo lugar que traduzca rol → panel (sin lógica de rol duplicada en el cliente).
- Shell de cada panel (sidebar + main) en un layout por árbol, en vez de repetirse en cada página.

**Non-Goals:**
- Cambios de base de datos o RLS (cambio aparte).
- Pantallas nuevas (`resumen-dia`, `announcements`, `account`) ni el feed visual de familia.
- Arreglar `/detalle-publicacion` (link en `post-card` que ya apunta a una ruta inexistente hoy; se queda como está).

## Decisions

### D1: Guard de rol en `updateSession()`, no por página

Extender `utils/supabase/middleware.ts` dentro del flujo ya existente:

```
getClaims() -> sin sesion: (comportamiento actual)
            -> con sesion: query ligera a public.users (rol)
               /staff/*  y rol no staff/admin -> redirect /family
               /family/* y rol no parent      -> redirect /staff
               "/"       -> redirect /staff o /family segun rol
               ruta publica -> redirect "/" (el ciclo siguiente resuelve el panel)
```

- La query al rol usa el mismo `createServerClient` con cookies de la request: RLS `users_select_own` deja leer la fila propia; es una query por request sobre la primary key.
- **Alternativa descartada**: guard por layout/página (`await connection()` + check). Se puede saltear con un prefetch estático y hay que repetirlo en cada ruta nueva; el proxy cubre todo el árbol de una.
- **Alternativa descartada**: claim de rol en el JWT. Requeriría un trigger/custom claim en Supabase Auth y refresh del token al cambiar de rol — complejidad de infraestructura que no justifica una query simple.

### D2: Login empuja a `/` y el proxy resuelve el panel

`login-form.tsx` sigue haciendo `router.push("/")`; el proxy (D1) redirige según rol. Una sola fuente de verdad rol→panel en el servidor, sin leer el rol en el cliente.

- **Alternativa descartada**: leer el rol tras `signInWithPassword` y pushear directo a `/staff` o `/family`. Duplica el mapeo rol→panel en el cliente y puede quedar desfasado.

### D3: Layout por árbol en vez de sidebar por página

```
app/
  staff/
    layout.tsx        -> <StaffSidebar> + shell   (obtiene sesión, canPublish)
    page.tsx          -> feed (hoy app/page.tsx)
    kids/
      page.tsx
      [id]/page.tsx
  family/
    layout.tsx        -> <FamilySidebar> + shell
    page.tsx          -> feed sin CTA
  login/, activate-account/   -> quedan fuera de los prefijos
```

- Cada layout resuelve sesión una vez por request y decide la nav; las páginas dejan de montar `AppSidebar` por su cuenta. **Problema**: un layout no recibe props de sus páginas, así que `activeHref` ya no puede pasarse por página. **Decisión**: la sidebar (client) deriva el item activo con `usePathname()` — match por prefijo (`/staff/kids` activa "Niños") — y se elimina la prop `activeHref`.
- **Alternativa descartada**: seguir montando la sidebar en cada página con un helper. Menos archivos movidos, pero el shell se repite y una página futura puede olvidarse de montarla.

### D4: Sidebar parametrizada por rol, un solo componente

Unificar en `sidebar.tsx` (client):

- `navItems` deja de ser constante global: staff = `[Feed(/staff), Niños(/staff/kids)]`, family = `[Feed(/family)]`.
- Subtítulo: staff = `room.roomName` ("Sala Soles"), family = `"Familia"` (fijo).
- CTA "Nueva publicación" solo se renderiza si el panel es staff (hoy: `canPublish`; en la práctica staff layout siempre lo pasa como `true`, el rol ya está garantizado por el proxy).
- `AppSidebar` se reemplaza por el fetch de sesión de cada layout (mismo patrón `await connection()` + `fetchSessionUser`).

### D5: Migración de rutas con grep de hrefs

Renombrar con git history (carpetas, no reescribir archivos):

1. `git mv app/page.tsx app/staff/page.tsx` y `git mv app/kids app/staff/kids`.
2. Grep de todos los `href="/` y `router.push("/` en `app/`: actualizar `"/kids"`, `"/kids/[id]"`, "Volver a Niños", y los `activeHref` (estos desaparecen con D3).
3. `login-form` queda en `push("/")` (D2). `/login` y `/activate-account` no se mueven.
4. Regenerar tipos con `npx next typegen` (los `PageProps<'/kids/...'>` generados cambian de ruta).

### D6: `/family` es el feed actual con `canPublish=false`

Sin query nueva ni componente nuevo: `app/family/page.tsx` reutiliza `FeedView` sin CTA y sin `fetchPostOptions` (mismo camino que hoy sigue un `parent`). El feed de familia visual (header, pills) es otro cambio.

## Risks / Trade-offs

- [Query extra al rol en cada request del proxy] → es una lectura por primary key dentro del request ya existente; si se volviera cuello, cachear en memoria de módulo por `user_id` con TTL corto. Se acepta por ahora.
- [Links internos rotos tras el renombre (hrefs olvidados, "Volver a Niños", `activeHref`)] → grep exhaustivo de `href="/` y `router.push("/` + `npm run build` (falla en rutas que referencien tipos inexistentes) + smoke test con Playwright.
- [`PageProps`/`LayoutProps` de `next typegen` desactualizados] → regenerar con `npx next typegen` después del mv; si tsc falla, es eso.
- [Doble redirect en rutas públicas con sesión (`/login` → `/` → panel)] → un salto extra imperceptible; se mantiene porque simplifica el ciclo (D2).
- [El guard es solo de UI/servidor: RLS de `children` sigue abierto] → aceptado y acordado: cambio aparte de seguridad. El proxy bloquea las pantallas, no los datos.

## Migration Plan

1. Renombrar árbol staff + arreglar hrefs (paso 3 de D5) — la app queda funcional con las URLs nuevas pero sin guard (cualquiera entra a `/family`).
2. Agregar el guard en `updateSession()` (D1) + login (D2).
3. Extraer layouts y reescribir la sidebar por rol (D3, D4).
4. `npx next typegen`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, smoke Playwright.

Rollback: los pasos 1–3 son moves/edits en un solo commit revertible; no hay migración de datos que revertir.

## Open Questions

Ninguna. Las decisiones de alcance (RLS aparte, pantallas nuevas aparte, URLs en inglés) están fijadas en el proposal.
