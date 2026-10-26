# SPEC 13 — Sesión real en la UI, activación con cuenta existente y permisos de padre

> **Estado:** Aprobado
> **Depende de:** SPEC 09 (auth + guard), SPEC 12 (invitaciones + `/activate-account` + `accept_parent_invitation`)
> **Fecha:** 2026-10-26
> **Objetivo:** Corregir la activación de invitaciones cuando el email ya tiene cuenta, reemplazar el mock "Caro" por el usuario de la sesión real (nombre, inicial y rol) y ocultar "Agregar niño" a los padres.

## Alcance

**Incluye:**

- **Activación con cuenta existente** (`app/_components/activate-account-form.tsx`): cuando `signUp` responde `user_already_exists`/`email_exists`, el formulario pasa a **modo iniciar sesión** en la misma página: email solo lectura, campo "CONTRASEÑA" (la de la cuenta existente), se oculta el checkbox de fotos, botón "Iniciar sesión y aceptar". Al enviar: `signInWithPassword` → `rpc("accept_parent_invitation")` → `router.push("/")` + `refresh()`. Credenciales malas → `Email o contraseña incorrectos.` inline. La invitación queda `accepted` y se crea `parent_children` **sin tocar** `users.full_name` de la cuenta existente.
- **Sesión real en la UI**: nuevo server component `app/_components/app-sidebar.tsx` que hace fetch de la sesión (`fetchSessionUser` extendido con `full_name`) y renderiza el `Sidebar` client existente con nombre real, inicial (una letra del nombre) y rol en español. Se usa en `/` (feed), `/kids` y `/kids/[id]`. Se borra el mock `sessionUser` de `app/_data/feed.ts`.
- **Helpers de sesión** (`app/_data/session.ts`): `fetchSessionUser` pasa a devolver `{ id, role, fullName }`; nuevos helpers `roleLabel(role)` (`staff`→"Staff", `parent`→"Padre", `admin`→"Admin") e `initialFromName(fullName)` (primera letra en mayúscula). El tipo `SessionUser` canónico vive en `session.ts` (FeedView/Sidebar dejan de importarlo de `feed.ts`).
- **Saludo del feed**: `FeedView` saluda con el primer nombre del usuario real (`user.name.split(" ")[0]`) en vez de `room.greetingName`; se elimina `greetingName` del mock `room`. El resto del mock de room (`roomName`, `childCount`, `dateLabel`) se mantiene.
- **"Agregar niño" solo staff**: `KidsViewServer` fetch de sesión y pasa `canAddChild={isStaffRole(role)}` a `KidsView`; el botón se renderiza solo si `canAddChild`. La RLS `children_insert` (`is_staff()`) ya bloquea el insert a padres — no cambia DB.

**No incluye:**

- Actualizar `users.full_name` desde la invitación aceptada.
- Gate de "Nueva publicación", "Editar" del perfil del niño ni "Resumen del día".
- Filtrar el directorio `/kids` por rol (el padre ve la lista completa, como hoy).
- Reenviar/cancelar invitaciones desde la UI, feed por rol, `/forgot-password`.
- Cambios de RLS o migraciones (ninguna es necesaria: `accept_parent_invitation` ya valida `email(auth.uid()) = invitations.email` y funciona con cuentas existentes).

## Modelo de datos

No introduce estructuras nuevas. Ajustes de tipos en `app/_data/session.ts`:

```ts
export interface SessionUser {
  id: string;
  role: SessionRole | null;
  fullName: string | null;
}

// staff → "Staff" | parent → "Padre" | admin → "Admin"
export function roleLabel(role: SessionRole | null): string;

// "Caro Giménez" → "C"
export function initialFromName(fullName: string | null): string;
```

En `app/_data/feed.ts` se borra `export const sessionUser` y `RoomSummary.greetingName`; el tipo `SessionUser` de feed.ts se elimina ( los imports pasan a `session.ts`).

Caso de datos real para probar (ya existe en la DB):

```
invitations: Maria, email ariannaisabel795@gmail.com, code CWNPU, status pending
auth.users: 58ff3c2b…, mismo email, cuenta existente (full_name "Harry")
```

## Plan de implementación

1. **Helpers de sesión.** Extender `fetchSessionUser` (select `role, full_name`), mover/definir `SessionUser` canónico en `session.ts`, agregar `roleLabel` e `initialFromName`. Actualizar imports de `SessionUser` en `sidebar.tsx` y `feed-view.tsx`. → Compila; la UI sigue igual (mock aún no borrado).
2. **AppSidebar + borrar mock.** Crear `app/_components/app-sidebar.tsx` (async: `connection()`, fetch sesión, render `Sidebar` con `{ name, role: roleLabel, initial }` y `room` mock). Reemplazar `<Sidebar user={sessionUser} …/>` por `<AppSidebar …/>` en `app/page.tsx` (envolver en Suspense), `app/kids/page.tsx` y `app/kids/[id]/page.tsx`. Borrar `sessionUser` de `feed.ts`; `FeedView` saluda con `user.name.split(" ")[0]` y se quita `greetingName`. → Con sesión staff se ve "Staff Test"/"Staff"; "Caro" desaparece de la app.
3. **Modo sign-in en activación.** `activate-account-form.tsx`: en `user_already_exists`/`email_exists`, cambiar a estado `signInMode`; ocultar checkbox, botón "Iniciar sesión y aceptar", `signInWithPassword` → `rpc` → redirect; error de credenciales en español. → Con `CWNPU` y la contraseña de la cuenta existente la invitación queda `accepted` y el padre aparece ACTIVO en el panel.
4. **Agregar niño por rol.** `kids-view-server.tsx`: fetch sesión, `canAddChild={isStaffRole(role)}`; `kids-view.tsx` condiciona el botón. → Padre logueado no ve el botón; staff sí.
5. **Verificación.** Playwright (1440/768/375) de los criterios; queries de verificación en DB (invitación `accepted`, `parent_children` creado); `npm run lint` y `npx tsc --noEmit`.

## Criterios de aceptación

- [ ] `/activate-account?code=CWNPU` (email con cuenta existente) muestra el modo "iniciá sesión para aceptar la invitación" tras enviar el formulario.
- [ ] Con la contraseña correcta de la cuenta existente, la invitación pasa a `accepted`, se crea `parent_children` y se navega a `/`.
- [ ] Con contraseña incorrecta se muestra `Email o contraseña incorrectos.` y la invitación sigue `pending`.
- [ ] Al aceptar con cuenta existente, `users.full_name` no cambia (sigue "Harry").
- [ ] Con sesión staff, la sidebar muestra "Staff Test" y "Staff"; el feed saluda "Buenas, Staff". No aparece "Caro" en ninguna pantalla.
- [ ] Con sesión parent, la sidebar muestra el nombre real del padre, su inicial (una letra) y rol "Padre".
- [ ] El avatar de la sidebar y el del feed muestran la inicial real del usuario logueado.
- [ ] En `/kids` con sesión parent no se ve el botón "Agregar niño"; con sesión staff sí.
- [ ] "Vincular otro padre" sigue oculto para padres (comportamiento de SPEC 12 intacto).
- [ ] Sin cambios de DB: migraciones aplicadas = las que ya existían.
- [ ] `npm run lint` y `npx tsc --noEmit` sin errores.

## Decisiones tomadas y descartadas

- **Sí:** modo iniciar sesión en la misma página de activación — decisión del usuario; acepta la invitación sin salir del flujo del correo.
- **Sí:** no actualizar `users.full_name` al aceptar — decisión del usuario; evita que nombres de prueba pisen el nombre real de la cuenta.
- **Sí:** rol en español ("Staff"/"Padre"/"Admin") — decisión del usuario; la DB no tiene sala del docente, "Maestra · Soles" no es reproducible con datos reales.
- **Sí:** inicial de una letra — decisión del usuario; mantiene el diseño actual del componente `Avatar`.
- **Sí:** ocultar solo "Agregar niño" a padres — decisión del usuario; "Nueva publicación" y "Editar" quedan para otra spec si se deciden.
- **Sí:** `AppSidebar` server component — reuso DRY en las tres pantallas con sidebar; mismo patrón de fetch server que `KidsViewServer`.
- **Sí:** `SessionUser` canónico en `session.ts` — una sola fuente de verdad; el mock de feed deja de definir tipos de sesión.
- **Sí:** saludo con `user.name.split(" ")[0]` — quita `greetingName` del mock room sin tocar el diseño.
- **Sí:** doble fetch de sesión en `/kids/[id]` (AppSidebar + KidProfile para `canInvite`) — aceptado; costo menor vs. prop-drilling across Suspense.
- **No:** migración o fix de `accept_parent_invitation` — verificado en la DB: ya valida email vs `auth.uid()` y acepta cuentas existentes.
- **No:** gate de "Nueva publicación"/"Editar", filtrado del directorio de niños, actualización de nombre desde invitación.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `cacheComponents: true` + fetch de sesión en AppSidebar | `await connection()` + `<Suspense>` en cada page que lo usa (mismo patrón SPEC 11/12) |
| "Confirm email" activo rompe el sign-in mode | El sign-in mode usa `signInWithPassword`, no `signUp`; no depende de la confirmación de email |
| Staff de prueba se llama "Staff Test" → saludo "Buenas, Staff" | Esperado en dev; el criterio verifica que no aparezca "Caro" |

## Lo que **no** está en esta spec

- Actualización de `users.full_name` al aceptar invitaciones.
- Permisos de "Nueva publicación" ni "Editar" por rol.
- Directorio de niños filtrado por rol (padre solo ve sus hijos).
- Feed exclusivo de la familia.

Cada uno, si llega, va en su propia spec.
