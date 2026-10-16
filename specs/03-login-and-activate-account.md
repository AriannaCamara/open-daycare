# SPEC 03 — Login y activación de cuenta (`/login`, `/activate-account`)

**Estado:** Aprobado
**Fecha:** 2026-10-16
**Depende de:** SPEC 01, SPEC 02
**Objetivo:** Portar `login.dc.html` y `activar-cuenta.dc.html` a las rutas `/login` y `/activate-account` con formularios validados en cliente, sin selector de rol Personal/Familia.

## Alcance

**Incluye:**

- Ruta `/login` (`app/login/page.tsx` + `app/_components/login-form.tsx`): panel promo naranja con copy y "🌿 Guardería Sala Soles" (oculto a <768px), título "Iniciar sesión", campos email y contraseña, "¿Olvidaste tu contraseña?" como texto inactivo, botón "Iniciar sesión" que navega a `/` si la validación pasa, y link "Activá tu cuenta" → `/activate-account`.
- Sin bloque "INGRESO COMO": no se implementan los botones Personal/Familia.
- Ruta `/activate-account` (`app/activate-account/page.tsx` + `app/_components/activate-account-form.tsx`): logo, título "Bienvenida a OpenDayCare", card de invitación ("Te invitaron a seguir a / Mateo · Sala Soles") leída de `getChildById("mateo-fernandez")`, campo código prellenado `7K4P9`, email prellenado `lucia.fernandez@gmail.com`, "Crear contraseña" vacío, checkbox obligatorio de autorización de fotos, botón "Activar mi cuenta" → `/`, link "Iniciar sesión" → `/login`.
- Validación básica en cliente con mensajes de error en español e inline bajo cada campo.
- Estados de error: borde del campo `#D9583C`, texto `#C5503A`.
- Responsive: a <768px el panel promo del login se oculta y el formulario ocupa todo el ancho.

**No incluye (fuera de esta spec):**

- Autenticación real, backend, base de datos o fetch.
- Selector de rol Personal/Familia (decisión explícita: no se implementa).
- Recuperación de contraseña (`/forgot-password`).
- Verificación real del código de invitación o creación de cuenta.
- Estado de sesión persistente (localStorage/cookie) y guard de rutas.
- Pantallas de la familia (`familia-feed`, etc.).
- Tests automatizados.

## Modelo de datos

Esta spec no introduce estructuras nuevas persistentes. Solo estado local de los formularios:

```ts
// login-form.tsx
type LoginValues = { email: string; password: string };
type FieldErrors<K> = Partial<Record<K, string>>; // { email?: string; password?: string }

// activate-account-form.tsx
type ActivateValues = {
  inviteCode: string;   // "7K4P9"
  email: string;        // "lucia.fernandez@gmail.com"
  password: string;     // ""
  photoConsent: boolean;
};
```

Constante local en `activate-account-form.tsx`:

```ts
const invite = { code: "7K4P9", email: "lucia.fernandez@gmail.com", childId: "mateo-fernandez" };
```

La card de invitación se resuelve con `getChildById(invite.childId)` de `app/_data/children.ts` (SPEC 02); avatar y tono salen del niño.

Reglas de validación (al enviar):

| Campo | Regla | Mensaje |
| --- | --- | --- |
| email (login) | requerido | `Ingresá tu email.` |
| email (login/activate) | formato | `El email no tiene un formato válido.` |
| password (login) | requerido | `Ingresá tu contraseña.` |
| código (activate) | requerido, 5 caracteres | `Ingresá el código de invitación.` |
| password (activate) | mínimo 8 caracteres | `Usá al menos 8 caracteres.` |
| checkbox (activate) | obligatorio | `Necesitamos tu autorización para continuar.` |

## Plan de implementación

1. **`/login` estructura.** Crear `app/login/page.tsx` (server) y `app/_components/login-form.tsx` (`"use client"`): grid 2 columnas, panel promo naranja con círculos decorativos, logo, título y copy; columna derecha con header e inputs email/password estilados (radio 14, borde `#EADFD0`). → `/login` renderiza.
2. **`/login` validación y navegación.** Agregar `useState` de valores/errores, validar al submit, mostrar errores inline, `useRouter().push("/")` solo si pasa. Link "¿Olvidaste tu contraseña?" como span inactivo; link "Activá tu cuenta" → `/activate-account`. → flujo de login completo.
3. **`/activate-account` estructura.** Crear `app/activate-account/page.tsx` y `app/_components/activate-account-form.tsx`: card de invitación desde `getChildById`, inputs código/email (prellenados) y contraseña (vacía), checkbox en caja `#FBF1D6`. → pantalla renderiza.
4. **`/activate-account` validación y navegación.** Validar código/email/contraseña/checkbox al submit con los mensajes de la tabla; si pasa, `push("/")`. Link "Iniciar sesión" → `/login`. → flujo completo.
5. **Responsive.** Ocultar el panel promo del login con `hidden md:flex` y verificar apilado a 375px. → sin scroll horizontal.
6. **Verificación.** Playwright a 1440px / 768px / 375px en `/login` y `/activate-account`, comparadas lado a lado con los `.dc.html`; `npm run lint` y `npx tsc --noEmit`. → sin errores y match visual.

## Criterios de aceptación

- [ ] `/login` y `/activate-account` renderizan sin errores de consola ni de build.
- [ ] `/login` no muestra el bloque "INGRESO COMO" ni los botones Personal/Familia.
- [ ] `/login` muestra el panel promo con el título "El día de cada niño, compartido con su familia." y "🌿 Guardería Sala Soles".
- [ ] Al cargar `/login`, email y contraseña están vacíos.
- [ ] Submit vacío muestra "Ingresá tu email." e "Ingresá tu contraseña." y no navega.
- [ ] Email `caro@` muestra "El email no tiene un formato válido."
- [ ] Con credenciales válidas, "Iniciar sesión" navega a `/`.
- [ ] "¿Olvidaste tu contraseña?" no navega ni ejecuta ninguna acción.
- [ ] El link "Activá tu cuenta" lleva a `/activate-account`.
- [ ] `/activate-account` muestra la card "Te invitaron a seguir a / Mateo · Sala Soles" con el avatar de Mateo desde `children.ts`.
- [ ] Código `7K4P9` y email `lucia.fernandez@gmail.com` vienen prellenados; "Crear contraseña" arranca vacío.
- [ ] Submit con el checkbox desmarcado muestra "Necesitamos tu autorización para continuar." y no navega.
- [ ] Contraseña de 7 caracteres muestra "Usá al menos 8 caracteres."
- [ ] Con código, email, contraseña ≥8 y checkbox marcado, "Activar mi cuenta" navega a `/`.
- [ ] "Iniciar sesión" desde `/activate-account` lleva a `/login`.
- [ ] A 375px el panel promo está oculto, el formulario ocupa el ancho completo y no hay scroll horizontal.
- [ ] `npm run lint` y `npx tsc --noEmit` sin errores.

## Decisiones tomadas y descartadas

- **Sí:** rutas en inglés `/login` y `/activate-account` — consistente con la convención de la SPEC 02 y con el link existente de la sidebar.
- **Sí:** sin selector de rol Personal/Familia — decisión explícita del usuario; el login siempre lleva al feed `/`.
- **Sí:** validar y navegar a `/` — da feedback real sin inventar autenticación.
- **Sí:** validación básica con `useState` y mensajes inline, sin librerías — un solo formulario por pantalla no justifica react-hook-form/zod.
- **Sí:** sin estado de sesión — la sidebar ya linkea a `/login` en "cerrar sesión"; persistencia va en otra spec.
- **Sí:** formularios en componentes cliente bajo `app/_components/` con page server — mismo patrón que `KidsDirectory` (SPEC 02).
- **Sí:** card de invitación desde `getChildById("mateo-fernandez")` — reutiliza datos y evita duplicar copy/colores.
- **Sí:** contraseña de activación mínimo 8 caracteres — criterio propio del form de creación; el login solo pide no vacío.
- **Descartado:** `/forgot-password` (texto inactivo), medidor de fortaleza de contraseña, prefill del login (`caro@opendaycare.com`), localStorage/cookie de sesión, guard de rutas, apilar el panel promo en móvil (prefiere ocultarlo).

## Riesgos

- **Sin screenshot en `references/screenshots/`:** verificar lado a lado con `references/pantallas/login.dc.html` y `activar-cuenta.dc.html` abiertos con Playwright.
- **Fuentes:** el template carga Fredoka/Nunito de Google Fonts y la app usa `next/font` (SPEC 01); pesos 400–800 ya están cargados, pero comparar tipografía en las capturas.
- **`cacheComponents: true`:** todo es estático o componente cliente, sin fetch; no debe requerir `<Suspense>`.

## Lo que **no** está en esta spec

- Selector de rol Personal/Familia.
- Autenticación, backend o sesión persistente.
- Recuperación de contraseña.
- Registro/activación real de cuentas (el código no se verifica).
- Pantallas de la familia.

Cada uno de esos, si llega, va en su propia spec.
