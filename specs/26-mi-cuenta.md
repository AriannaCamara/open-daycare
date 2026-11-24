# SPEC 26 — Mi cuenta (perfil, notificaciones y contraseña)

> **Estado:** Implementado
> **Depende de:** SPEC 01 (users table), SPEC 09 (auth y protección de rutas), SPEC 18 (family child profile)
> **Fecha:** 2026-11-23
> **Objetivo:** Crear la ruta `/account` con la pantalla de ajustes de cuenta (perfil, preferencias de notificación, contraseña y hijos con consentimiento de fotos) siguiendo `references/pantallas/mi-cuenta.dc.html` y `familia-cuenta.dc.html`.

## Alcance

**Incluye:**

1. **Ruta `/account`** (`app/account/page.tsx`): queda fuera de los prefijos `/staff` y `/family`, así que el guard del proxy solo exige sesión (mismo modelo que `/posts/[id]`, SPEC 25). El contenido se resuelve según el rol de la sesión.
2. **Tarjeta de perfil**: avatar con inicial, nombre, email (leído de `auth.getUser()`) y subtítulo según rol (staff → `roleLabel`; parent → "Familia de {hijos}" si tiene hijos). Botón **Editar** alterna un campo de nombre en línea → server action que actualiza `users.full_name` (el grant de update ya existe desde la migración de hardening).
3. **Sección NOTIFICACIONES** con dos toggles que persisten en columnas existentes (`notify_on_post`, `daily_summary_enabled`), con el copy de la referencia según panel:
   - staff: "Nuevos comentarios de familias" y "Recordatorio de resumen (17:00)".
   - familia: "Avisos cuando se publica algo" y "Resumen diario (19:00)".
4. **Sección MIS HIJOS** (solo parent): lista los hijos vinculados (reusa `fetchFamilyChildren`, SPEC 18) con el toggle **Fotos** por hijo → `children.photo_consent` (mismo campo que SPEC 16/18). Sin hijos → la sección no se renderiza.
5. **Cambiar contraseña**: fila que despliega formulario en línea (nueva + confirmar) → `supabase.auth.updateUser({ password })`, con validación y errores inline.
6. **Cerrar sesión** al pie de la página (mismo flujo que el botón del sidebar).
7. **Sidebar**: nuevo item "Mi cuenta" en ambos paneles (staff y familia) → `/account`.

**No incluye (fuera de esta spec):**

- Cambio de email o de avatar (subida de imágenes).
- Fila "Ayuda y soporte" (sin contenido definido; se agrega cuando exista).
- Envío real de notificaciones: los toggles guardan la preferencia, pero no hay sistema de emails/push detrás.
- Migraciones de base de datos o cambios de RLS (todo usa columnas y policies existentes).
- Editar datos de los hijos desde acá (sigue en el perfil del niño, SPEC 18).

## Modelo de datos

Sin cambios de schema.

- Lectura: fila propia de `users` (`full_name`, `notify_on_post`, `daily_summary_enabled`) vía policy `users_select_own`; email de `supabase.auth.getUser()`; hijos vía `fetchFamilyChildren` (ya expone `photo_consent` y `rooms(name)`).
- **Nuevo** `app/_actions/account.ts` con:
  - `updateProfileName(name)` → valida no vacío → `update users set full_name`.
  - `updateNotificationSettings(notifyOnPost, dailySummaryEnabled)` → update de las dos columnas.
  - `setChildPhotoConsent(childId, enabled)` → update **solo** de `photo_consent` con lista blanca de columna (RLS `children_update_parent_linked` de la SPEC 18 ya lo permite). No reutiliza `updateChildProfile` porque esa action exige reenviar `medical_notes` y `allergy_tags`.
  - `changePassword(newPassword, confirmPassword)` → valida igualdad y largo ≥ 6 → `supabase.auth.updateUser({ password })`.

## Plan de implementación

1. **Actions**: crear `app/_actions/account.ts` con las cuatro actions (validación server-side: nombre no vacío, contraseñas iguales y ≥ 6 chars, solo columnas de la lista blanca). → actions unit-testables.
2. **Ruta**: crear `app/account/page.tsx` (server component con `connection()` + Suspense) que resuelve sesión, fila de users, email e hijos, y renderiza `AccountView`.
3. **Componente** `app/_components/account-view.tsx` ("use client"): tarjeta de perfil en modo vista/edición, sección de notificaciones con toggles, sección de hijos, fila cambiar contraseña (formulario en línea) y botón cerrar sesión; estados `saving`/`saved`/error inline (mismos patrones que los modales existentes).
4. **Sidebar**: añadir `{ href: "/account", label: "Mi cuenta", icon: <UserIcon /> }` a los `navItems` de staff y de familia en `app/_components/sidebar.tsx`.
5. **Verificación**: Playwright como parent y como staff — editar nombre persiste al recargar y se refleja en el sidebar, toggles persisten, cambio de contraseña con datos inválidos muestra error y con válidos funciona (logout/login), toggle Fotos del hijo persiste y se respeta en el bloqueo de consentimiento de la SPEC 16; capturas 1440/768/375; `npm run lint`, `npx tsc --noEmit`, `npm run build`.

## Criterios de aceptación

- [x] `/account` renderiza con sesión válida para un `parent` y para un `staff`, cada uno con su sidebar y el item "Mi cuenta" activo.
- [x] La tarjeta muestra avatar con inicial, nombre, email y subtítulo según rol.
- [x] Editar el nombre y guardar actualiza `full_name`, persiste al recarga y se refleja en el sidebar.
- [x] Editar con nombre vacío muestra error y no envía la action.
- [x] Los dos toggles de notificaciones cambian de estado y persisten al recargar.
- [x] Un `parent` ve la sección Mis hijos con sus hijos reales y su sala; un `staff` no ve la sección.
- [x] El toggle Fotos de un hijo persiste `photo_consent` y se refleja en el bloqueo de fotos de la SPEC 16.
- [x] Un `parent` sin hijos no ve la sección Mis hijos.
- [x] Cambiar contraseña con contraseñas distintas o menores a 6 chars muestra error inline y no cambia nada.
- [x] Cambiar contraseña con datos válidos actualiza la contraseña (verificado con logout + login).
- [x] Cerrar sesión lleva a `/login`.
- [x] La vista se ve correcta en 1440, 768 y 375 px (capturas en `.playwright-mcp/`).
- [x] `npm run lint` y `npx tsc --noEmit` sin errores.

## Decisiones tomadas y descartadas

**Del usuario:**

1. **Ruta única `/account` resuelta por rol** (la referencia existe en dos paneles): descartado `/staff/account` + `/family/account`, que duplicaría la pantalla.
2. **Solo `full_name` editable**: descartado editar email (requiere `updateUser` en Auth y flujo de confirmación de correo).
3. **Toggles en columnas existentes**: descartada una tabla nueva de preferencias (`notify_on_post` y `daily_summary_enabled` ya existen con grant de update).
4. **Toggle Fotos reusa `children.photo_consent`**: descartada una columna nueva (mismo campo que SPEC 16/18; sin migración).
5. **"Ayuda y soporte" fuera de alcance**: descartado link `mailto:` (sin contenido definido).

**Del implementador:**

6. **`setChildPhotoConsent` propia** en vez de reusar `updateChildProfile` (SPEC 18): esa action exige reenviar `medical_notes` y `allergy_tags`; el toggle solo cambia una columna.
7. **Subtítulo sin género ni sala**: staff → `roleLabel`; parent → "Familia de {hijos}". Descartados «Maestra · Soles» y «Mamá de Mateo y Sofía» de la referencia (`users` no tiene columna de sala ni de género).
8. **Labels de notificaciones por panel** (copy de cada referencia) mapeando a las mismas dos columnas.
9. **Contraseña ≥ 6 chars** (mínimo de Supabase Auth) + igualdad, validada en cliente y servidor.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `updateUser({ password })` puede pedir re-autenticación reciente | Mostrar el error de Auth inline; el resto de la pantalla sigue funcionando. |
| Email no existe en `public.users` | Se lee de `auth.getUser()` en el server component; si falta, se omite el texto en vez de romper. |
| `/account` queda fuera del guard por prefijo de panel | Solo exige sesión (igual que `/posts/[id]`); el contenido se limita por RLS (`users_select_own`, `children_update_parent_linked`). |

## What is **not** in this spec

- Cambio de email o avatar.
- "Ayuda y soporte".
- Envío real de notificaciones (los toggles solo persisten la preferencia).
- Migraciones o cambios de RLS.
- Edición de datos de los hijos desde acá.
