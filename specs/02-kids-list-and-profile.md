# SPEC 02 — Lista de niños y perfil de niño (`/kids`, `/kids/[id]`)

**Estado:** Aprobado
**Fecha:** 2026-10-15
**Depende de:** SPEC 01
**Objetivo:** Portar las pantallas `ninos.dc.html` y `perfil-nino.dc.html` a las rutas `/kids` y `/kids/[id]` con diseño responsive, búsqueda en cliente y datos mock tipados.

## Alcance

**Incluye:**

- Ruta `/kids` (`app/kids/page.tsx`): header "GESTIÓN / Niños", botón "Agregar niño", buscador con filtrado en cliente, separador "SALA SOLES · 8 niños", grid de 2 columnas con las 8 tarjetas.
- Ruta `/kids/[id]` (`app/kids/[id]/page.tsx`): link "Volver a Niños", avatar + nombre + "3 años · Sala Soles", botón "Editar", caja de alerta "Alergias y notas", ficha (fecha de nacimiento / sala / ingreso), columna derecha con botón "Resumen del día" y card "Padres vinculados" (2 padres con pills ACTIVA/PENDIENTE + "Vincular otro padre").
- Componentes reutilizables: `Avatar`, `KidCard`, `KidsDirectory` (buscador + grid + estado vacío), `ParentsPanel`.
- Shell responsive: `Sidebar` pasa a cliente con drawer móvil (hamburguesa + overlay); topbar móvil con logo.
- Renombrado de URLs a inglés en toda la nav: `/ninos`→`/kids`, `/avisos`→`/announcements`, `/mi-cuenta`→`/account`, `/crear-publicacion`→`/create-post` (afecta `sidebar.tsx`, `page.tsx`, `post-card.tsx`).
- Datos mock tipados en `app/_data/children.ts`, listos para migrar a DB.
- Estados: vacío de búsqueda; id inexistente → `notFound()` (404 nativo).

**No incluye (fuera de esta spec):**

- Backend, base de datos o fetch.
- Login/autenticación.
- Pantallas `/add-child`, `/daily-summary`, `/link-parent` (solo se enlazan).
- Edición real de datos; los padres son solo visuales.
- Renombrar rutas futuras de avisos/mi cuenta (solo cambian los links del sidebar).
- Dark mode, tests, persistencia de la búsqueda.

## Modelo de datos

Nuevo archivo `app/_data/children.ts`. Identificadores en inglés, copy en español (convención de la spec 01). Se reutilizan `sessionUser` y `room` de `app/_data/feed.ts`.

```ts
export type AvatarTone = "sky" | "pink" | "mint" | "yellow" | "lilac" | "blue";

export type ParentStatus = "active" | "pending";
export type ParentRelation = "mother" | "father";

export interface Parent {
  id: string;
  fullName: string;      // "Lucía Fernández"
  relation: ParentRelation;
  initial: string;       // "L"
  tone: AvatarTone;
  status: ParentStatus;
}

export interface Child {
  id: string;            // "mateo-fernandez"
  fullName: string;
  ageYears: number;
  roomName: string;      // "Soles"
  initial: string;
  tone: AvatarTone;
  allergyLabel?: string; // "MANÍ" | "LACTOSA"
  allergiesNote?: string;
  birthDateLabel: string; // "12 mar 2022"
  admissionLabel: string; // "feb 2025"
  parents: Parent[];
}

export const avatarToneStyles: Record<AvatarTone, { background: string; text: string }>;
export const parentStatusLabels: Record<ParentStatus, string>;  // ACTIVA / PENDIENTE
export const parentStatusStyles: Record<ParentStatus, { background: string; text: string }>;
export const children: Child[];                                   // los 8 del template
export function getChildById(id: string): Child | undefined;
```

Los hex de avatares y pills viven en los mapas de estilos, no en los datos (misma regla que la spec 01).

## Plan de implementación

1. **Renombrar URLs a inglés.** En `sidebar.tsx` (navItems + botón), `page.tsx` y `post-card.tsx`: `/ninos`→`/kids`, `/avisos`→`/announcements`, `/mi-cuenta`→`/account`, `/crear-publicacion`→`/create-post`. → app compila, nav en inglés.
2. **Datos mock.** Crear `app/_data/children.ts` con tipos, mapas de estilos, `getChildById` y los 8 niños (padres solo en Mateo). → sin UI.
3. **Avatar.** Crear `app/_components/avatar.tsx`: initial + `tone`, variante `child` (texto oscuro sobre pastel) y `parent` (texto blanco). → montable aislado.
4. **KidCard.** Crear `app/_components/kid-card.tsx`: avatar, nombre, "N años · X padres vinculados", pill de alergía / pill "VINCULAR" / chevron, hover `#F2A78E` + `translateY(-2px)`. → montable aislado.
5. **Lista `/kids`.** Crear `app/_components/kids-directory.tsx` (`"use client"`: estado de búsqueda, filtro por nombre normalizado —sin acentos ni mayúsculas—, grid, estado vacío con "Sin resultados" + limpiar) y `app/kids/page.tsx` (header, botón, separador). → ruta `/kids` completa; screenshot vs `references/screenshots/ninos.png`.
6. **Perfil `/kids/[id]` (estructura + izquierda).** Crear `app/kids/[id]/page.tsx`: `await params`, `getChildById` + `notFound()`, link de vuelta, header con avatar/nombre/edad, botón Editar, caja de alergias, ficha de 3 filas. → columna izquierda renderiza.
7. **Perfil (derecha).** Crear `app/_components/parents-panel.tsx` (botón "Resumen del día" + card de padres) y montarlo en la página. → ruta `/kids/[id]` completa; comparación lado a lado con `perfil-nino.dc.html`.
8. **Sidebar responsive.** `sidebar.tsx` pasa a `"use client"`: estado `open`, botón hamburguesa + overlay en `<lg`, drawer deslizante; exportar topbar móvil. → `/` y `/kids` con nav funcional en móvil.
9. **Verificación.** Playwright a 1440px / 768px / 375px en `/`, `/kids`, `/kids/mateo-fernandez`, `/kids/no-existe`; `npm run lint` y `npx tsc --noEmit`. → sin errores y match visual.

## Criterios de aceptación

- [ ] `/kids` y `/kids/[id]` renderizan sin errores de consola ni de build.
- [ ] Sidebar desktop idéntico al template; nav "Niños" activa (bg `#FBE3D8`, texto `#D9583C`).
- [ ] Links del sidebar en inglés: `/kids`, `/announcements`, `/account`, `/create-post`; el feed ya no apunta a `/crear-publicacion`.
- [ ] Header de lista: "GESTIÓN" + "Niños" + botón "Agregar niño".
- [ ] Buscar "sofia" encuentra "Sofía Méndez" (filtro sin acentos ni mayúsculas, en cliente).
- [ ] Grid de 2 columnas con las 8 tarjetas: avatar con color correcto, nombre, "N años · X padres vinculados", pill "MANÍ"/"LACTOSA", pill "VINCULAR" (Valentina) o chevron.
- [ ] Hover de tarjeta: borde `#F2A78E` y desplazamiento `-2px`.
- [ ] Búsqueda sin resultados muestra estado vacío con el texto buscado y botón limpiar.
- [ ] Cada tarjeta navega a `/kids/[id]` con su `id`.
- [ ] `/kids/mateo-fernandez` muestra alerta de alergias (`#FBDAD6`), ficha (12 mar 2022 / Soles / feb 2025), botón "Resumen del día" y los 2 padres con pills ACTIVA/PENDIENTE + "Vincular otro padre".
- [ ] `/kids/id-inexistente` devuelve 404.
- [ ] A 375px: sidebar oculta, hamburguesa abre drawer con overlay, contenido apilado en 1 columna.
- [ ] `npm run lint` y `npx tsc --noEmit` sin errores.

## Decisiones tomadas y descartadas

- **Sí:** rutas en inglés (`/kids`, `/kids/[id]`) y renombrado completo de la nav a inglés en este spec — URLs consistentes; evita nav mixta aunque solo se implementen 2 rutas.
- **Sí:** drawer móvil con hamburguesa en lugar de bottom tabs — mismo shell que desktop, un solo componente.
- **Sí:** búsqueda con `useState` en componente cliente — sin backend; el server page pasa los datos estáticos.
- **Sí:** `notFound()` nativo para id desconocido — cero código custom de 404.
- **Sí:** mock en `app/_data/children.ts` con tipos preparados para migrar a DB cuando llegue.
- **Sí:** `Avatar` con tonos nombrados y mapa de estilos — sin hex en los datos.
- **Descartado:** bottom tab bar; redirect de id inexistente a `/kids`; debounce/búsqueda server; persistir el filtro.

## Riesgos

- **Sin screenshot de perfil:** verificar `perfil-nino` abriendo el `.dc.html` lado a lado con Playwright.
- **Sidebar compartido con `/`:** el cambio a drawer puede alterar el desktop del home; verificar también `/`.
- **`cacheComponents: true`:** datos como constantes estáticas (sin fetch); `params` es async en `[id]`.
- **Hover en táctil:** en móvil no hay hover; el drawer y los `active` states cubren la interacción.
