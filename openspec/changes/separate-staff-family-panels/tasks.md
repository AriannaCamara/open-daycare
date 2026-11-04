# Tasks

## 1. Migración del árbol staff (design D5)

- [x] 1.1 Mover rutas con `git mv`: `app/page.tsx` → `app/staff/page.tsx` y `app/kids/` → `app/staff/kids/`; verificar que `git status` muestra moves (no delete+add) y que `npx tsc --noEmit` sigue compilando los archivos movidos
- [x] 1.2 Actualizar todos los hrefs internos (`"/"` → `"/staff"`, `"/kids"` → `"/staff/kids"`, "Volver a Niños", imports) con grep `href="/` y `router.push("/`; verificar con `npx tsc --noEmit` que no queden referencias a rutas viejas en tipos y con grep que no sobreviva ningún `href="/kids"` ni `href="/"` sin prefijo en `app/`
- [x] 1.3 Regenerar tipos de ruta con `npx next typegen`; verificar que `npx tsc --noEmit` pasa sin errores de `PageProps`/`LayoutProps`

## 2. Guard de rol en el proxy (design D1, D2)

- [x] 2.1 Extender `updateSession()` en `utils/supabase/middleware.ts`: con sesión válida, leer `public.users.role` y aplicar el guard por prefijo (`/staff/*` exige staff/admin → si no redirect `/family`; `/family/*` exige parent → si no redirect `/staff`; `/` → redirect al panel según rol); verificar con Playwright: login como parent y navegar a `/staff/kids` redirige a `/family`, login como staff navegar a `/family` redirige a `/staff`, y `/` lleva a cada uno a su panel
- [x] 2.2 Verificar que sin sesión todo sigue yendo a `/login` y que `/login` y `/activate-account` quedan fuera del guard (rutas públicas); verificar con Playwright abriendo `/staff` sin sesión → redirect a `/login`
- [x] 2.3 Confirmar que `login-form.tsx` sigue con `router.push("/")` y que el ciclo de login queda en el panel correcto (staff → `/staff`, parent → `/family`); verificar con Playwright: login completo de cada rol aterriza en su panel

## 3. Layouts por árbol y sidebar por rol (design D3, D4)

- [x] 3.1 Crear `app/staff/layout.tsx` y `app/family/layout.tsx` con el shell (sidebar + main) y el fetch de sesión (`await connection()` + `fetchSessionUser`); mover el feed a `app/family/page.tsx` reutilizando `FeedView` sin CTA de publicar ni `fetchPostOptions`; verificar con `npm run build` que ambas rutas compilan y con Playwright que `/family` muestra el feed sin botón "Nueva publicación"
- [x] 3.2 Reescribir `sidebar.tsx`: nav por rol (staff = Feed `/staff` + Niños `/staff/kids`; family = Feed `/family`), subtítulo "Familia" en panel familia vs nombre de sala en staff, item activo derivado con `usePathname()`, y eliminar la prop `activeHref`; verificar con Playwright: la sidebar staff muestra 2 items + CTA, la de familia 1 item sin CTA con subtítulo "Familia", y navegando a `/staff/kids` el item "Niños" queda resaltado
- [x] 3.3 Eliminar `AppSidebar`/`SidebarFallback` y los montajes por página (todas las páginas usan el layout); verificar con grep que no quedan importaciones de `AppSidebar` y con `npx tsc --noEmit` que no hay errores por props huérfanas

## 4. Verificación integral

- [x] 4.1 Correr `npm run lint` y `npx tsc --noEmit`; ambos en cero (cero errores, cero warnings nuevos)
- [x] 4.2 Correr `npm run build`; el build pasa (cacheComponents no rompe los layouts nuevos)
- [x] 4.3 Smoke Playwright cubriendo el flujo completo: login staff → `/staff` → `/staff/kids` → perfil `/staff/kids/[id]` → "Volver a Niños"; login parent → `/family` con feed sin CTA y sin item Niños; intentos cruzados (`/staff` con parent, `/family` con staff) redirigen al panel correcto; capturas en `.playwright-mcp/`

## Workflow follow-up

- Archivar el cambio cuando la revisión del proyecto lo indique (`openspec archive`).
