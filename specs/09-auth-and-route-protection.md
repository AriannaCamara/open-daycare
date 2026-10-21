# SPEC 09 — Autenticación real (email/password) y protección de rutas

> **Estado:** Aprobado
> **Depende de:** SPEC 03 (login UI), SPEC 01 `users` (usuario seed loginable)
> **Fecha:** 2026-10-21
> **Objetivo:** Conectar el login a Supabase Auth con email y contraseña, cerrar sesión real desde la sidebar y proteger todas las rutas de la app con el guard del proxy.

## Alcance

**Incluye:**

- **Login real** en `app/_components/login-form.tsx`: `signInWithPassword` con el cliente browser de `utils/supabase/client.ts`. La validación de SPEC 03 se mantiene; si pasa, se llama a Supabase.
  - Botón deshabilitado mientras se envía (`submitting`).
  - Errores de Supabase mapeados a español, inline, con el mismo estilo de error existente (borde `#D9583C`, texto `#C5503A`):
    - credenciales inválidas → `Email o contraseña incorrectos.`
    - email sin confirmar → `Tu email aún no está confirmado.`
    - cualquier otro error o fallo de red → `No pudimos iniciar sesión. Intentá de nuevo.`
  - Éxito → `router.push("/")` + `router.refresh()`.
- **Guard de rutas en `utils/supabase/middleware.ts`** (la lógica vive en `updateSession`; `proxy.ts` no cambia):
  - Tras `getClaims()`: sin claims y ruta protegida → `NextResponse.redirect` a `/login`.
  - Con claims y ruta pública (`/login`, `/activate-account`) → redirect a `/` (evita bucles y re-login innecesario).
  - Las cookies y headers de cache del `supabaseResponse` se copian al redirect (patrón Supabase; sin eso se pierde el refresh de sesión).
  - Rutas públicas: solo `/login` y `/activate-account`. Todo lo demás (`/`, `/kids`, `/kids/[id]` y cualquier ruta futura) queda protegido por defecto.
- **Logout real** en `app/_components/sidebar.tsx`: el `Link href="/login"` pasa a ser `<button>` con `handleLogout` → `supabase.auth.signOut()` → `router.push("/login")` + `router.refresh()`. Funciona igual desde `/`, `/kids` y `/kids/[id]` (el sidebar se comparte).

**No incluye (fuera de esta spec):**

- Signup/activación real: `/activate-account` sigue siendo maqueta (SPEC 03), sin `signUp`.
- Recuperación de contraseña (`/forgot-password`).
- Usuario real en la sidebar: `sessionUser` mock de `app/_data/feed.ts` no cambia.
- `getUser()`/`getClaims()` en las pages server (decisión: solo guard en el proxy).
- Autorización por roles (staff/parent/admin), OAuth, magic link, MFA.
- Tests automatizados.

## Modelo de datos

Esta spec no introduce estructuras nuevas. Las credenciales las gestiona Supabase Auth (`auth.users`) y el perfil ya lo crea el trigger de SPEC 01 (`public.users`). Solo hay estado local en el formulario:

```ts
// login-form.tsx
const [submitting, setSubmitting] = useState(false);
// errores: FieldErrors<keyof LoginValues> + "form" para el error de Supabase
```

Constante de rutas públicas en `utils/supabase/middleware.ts`:

```ts
const PUBLIC_PATHS = ["/login", "/activate-account"];
```

## Plan de implementación

1. **Login real.** `login-form.tsx`: estado `submitting`, `createClient().auth.signInWithPassword({ email, password })`, mapeo de errores a los 3 mensajes en español, `push("/")` + `refresh()` en éxito. → Con `staff@opendaycare.dev` / `StaffTest123!` entra al feed; con credenciales malas muestra el error y no navega; el feed sigue accesible sin sesión (todavía no hay guard).
2. **Guard en el proxy.** `utils/supabase/middleware.ts`: capturar el resultado de `getClaims()`, aplicar la lógica de redirect de ambas direcciones copiando cookies/headers. → `/`, `/kids`, `/kids/[id]` sin sesión redirigen a `/login`; con sesión, `/login` redirige a `/`.
3. **Logout real.** `sidebar.tsx`: reemplazar el `Link` de "Cerrar sesión" por `button` con `handleLogout` (`signOut` + `push` + `refresh`). → Cierra sesión de verdad y cae en `/login`.
4. **Verificación.** Playwright: los criterios de aceptación a 1440/768/375; `npm run lint` y `npx tsc --noEmit`.

## Criterios de aceptación

- [ ] Sin sesión, abrir `/`, `/kids` y `/kids/[id]` redirige a `/login`.
- [ ] Sin sesión, `/login` y `/activate-account` renderizan sin redirección.
- [ ] El formulario vacío muestra "Ingresá tu email." e "Ingresá tu contraseña." (validación de SPEC 03 intacta).
- [ ] Email sin `@` muestra "El email no tiene un formato válido." y no llama a Supabase.
- [ ] Con `staff@opendaycare.dev` / `StaffTest123!` el login navega a `/` y la sesión persiste al recargar.
- [ ] Con credenciales incorrectas se muestra "Email o contraseña incorrectos." y no navega.
- [ ] El botón "Iniciar sesión" queda deshabilitado mientras se envía.
- [ ] Con sesión, abrir `/login` redirige a `/`.
- [ ] "Cerrar sesión" en la sidebar borra la sesión, queda en `/login` y `/` vuelve a redirigir a `/login`.
- [ ] El logout funciona desde `/`, `/kids` y `/kids/[id]`.
- [ ] `/activate-account` sigue sin crear ninguna cuenta (maqueta).
- [ ] El nombre/initial del usuario en la sidebar sigue siendo el mock `sessionUser`.
- [ ] `npm run lint` y `npx tsc --noEmit` sin errores.

## Decisiones tomadas y descartadas

- **Sí:** guard solo en el proxy (`updateSession`) — decisión del usuario; evita leer `cookies()` en pages con `cacheComponents: true`.
- **Sí:** `getClaims()` en vez de `getUser()` — docs Supabase: `getClaims` es el método para verificar identidad/proteger páginas, refresca la sesión y no hace network call por request; ya se invoca en `updateSession`.
- **Sí:** el guard vive en `utils/supabase/middleware.ts`, importado por `proxy.ts` — Next.js permite organizar la lógica del proxy en módulos importados (doc `proxy.mdx`); solo puede haber un `proxy.ts` por proyecto.
- **Sí:** runtime `nodejs` de `proxy` en Next 16 (edge no soportado) — necesario para la verificación de firma de `getClaims()` (WebCrypto/JWKS); sin cambios extra.
- **Sí:** redirect inverso de `/login` y `/activate-account` a `/` — evita bucles y permite que un usuario logueado vuelva al feed.
- **Sí:** whitelist corta (`PUBLIC_PATHS`) — las rutas futuras quedan protegidas por defecto.
- **Sí:** logout real con `signOut` — decisión del usuario; sin esto la sesión nunca termina.
- **Sí:** `/activate-account` queda como maqueta — decisión del usuario; el alta real requiere invite codes/tablas que SPEC 01 dejó fuera.
- **Sí:** sidebar conserva `sessionUser` mock — decisión del usuario; mínimo alcance.
- **Sí:** cliente browser (`utils/supabase/client.ts`) en formularios — el login y el logout corren en componentes cliente y escriben cookies desde el navegador.
- **Sí:** mensajes de error de Supabase traducidos y reutilizando el estilo de error de SPEC 03 — consistencia visual y copy en español.
- **Descartado:** `getUser()` en cada page server, `signUp` en activate-account, usuario real en sidebar, `/forgot-password`, OAuth/magic link, parámetro `?redirect=` post-login.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Redirect sin copiar cookies de `supabaseResponse` rompe el refresh de sesión | Copiar `cookies` y `headers` al `NextResponse.redirect` (patrón documentado por Supabase); verificar recargando `/` tras login. |
| `cacheComponents: true` | El guard vive en el proxy; las pages no leen `cookies()`, así que su modo de render no cambia. |
| Proyecto con "Confirm email" activo rechaza logins | Manejar `email_not_confirmed` con su mensaje; el seed de SPEC 01 ya está confirmado. |
| Navegación post-login/logout sin refrescar datos | Llamar `router.refresh()` además de `push` en ambos flujos. |
| Client-side navigation no dispara el proxy | En App Router cada navegación hace fetch RSC que sí pasa por el proxy; verificar en Playwright navegando por la UI. |
| Futura necesidad de runtime `edge` | `proxy` en Next 16 solo corre en `nodejs`; si algún día se necesita edge, habría que volver a `middleware.ts`. No aplica hoy. |

## Lo que **no** está en esta spec

- Alta/activación real de cuentas (`signUp`, invitaciones).
- Recuperación de contraseña.
- Usuario real en la sidebar o datos de perfil.
- Autorización por roles y pantallas exclusivas de la familia.

Cada uno de esos, si llega, va en su propia spec.
