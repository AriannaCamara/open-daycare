# Proposal

## Why

Hoy staff y familia comparten la misma URL tree y la misma navegación: la "separación" se reduce a esconder botones (`canPublish`, `canAddChild`, `canInvite`) dentro de pantallas comunes. Un padre logueado puede entrar directo a `/kids` y ver el directorio completo de niños con sus notas médicas, y los prototipos de referencia (`references/pantallas/index.dc.html`) ya definen dos paneles con navegación distinta que la app no refleja.

## What Changes

- **BREAKING**: se reubican las rutas existentes bajo prefijos de rol: `/` → `/staff` (feed staff), `/kids` → `/staff/kids`, `/kids/[id]` → `/staff/kids/[id]`. El árbol sin prefijo se elimina.
- Se crea el árbol `/family/*` con su propio feed (hoy solo falta la ruta; la UI es la actual sin CTA de publicar) y espacio para futuras pantallas (`/family/resumen-dia`, `/family/account`).
- `proxy.ts` pasa a guardar por prefijo: `/staff/*` exige rol `staff`/`admin`, `/family/*` exige rol `parent`; el incumplimiento redirige al panel del rol real. La raíz `/` redirige al panel según rol, e igual el login tras autenticarse.
- La sidebar se vuelve por rol: staff ve Feed y Niños (más "Nueva publicación"); familia ve solo Feed, con subtítulo "Familia" en lugar del nombre de sala.
- Se corrigen todos los links internos afectados por el renombre (`href="/"`, `href="/kids"`, "Volver a Niños", etc.).

Fuera de alcance (cambios aparte): RLS de `children` (hoy `using (true)`), pantallas nuevas (`resumen-dia`, `announcements`, `account`), y el feed visual de familia (header "TU FAMILIA", pills de los hijos del padre).

## Capabilities

### New Capabilities

- `panel-access`: partición de rutas por rol (`/staff/*`, `/family/*`, compartidas), guard en proxy por prefijo y redirecciones de raíz/login según rol.
- `panel-navigation`: navegación (sidebar) distinta por panel — items, CTA de publicación y subtítulo según el rol de la sesión.

### Modified Capabilities

<!-- Ninguna: el proyecto aún no tiene specs (openspec list --specs vacío). -->

## Impact

- **Código**: `proxy.ts` + `utils/supabase/middleware.ts` (guard y redirects), `app/page.tsx` → `app/staff/page.tsx`, `app/kids/**` → `app/staff/kids/**`, nuevo `app/family/page.tsx`, `app/_components/sidebar.tsx` + `app-sidebar.tsx` (nav por rol), `app/_components/login-form.tsx` (redirect por rol), `app/_components/post-card.tsx` y cualquier `href` interno.
- **Datos**: sin cambios de base de datos ni migraciones.
- **Comportamiento observable**: URLs existentes dejan de funcionar (breaking); el acceso por rol pasa a ser enforced en el proxy, no solo UI.
