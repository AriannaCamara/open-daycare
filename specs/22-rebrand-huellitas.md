# SPEC 22 — Rebrand visual a "Huellitas": nombre y huella

> **Estado:** Implementado
> **Depende de:** —
> **Fecha:** 2026-11-16
> **Objetivo:** Reemplazar en toda la capa visual de la app el nombre "OpenDayCare" por "Huellitas" y el logo de sol por una huella de perrito, sin tocar nada interno ni las referencias del curso.

## Alcance

**Incluye:**

1. **Nuevo archivo `app/_components/brand.tsx`** que exporta:
   - `PawIcon({ size = 21 }: { size?: number })` — SVG de huella de perrito, `viewBox 0 0 24 24`, `stroke="#fff"`, `strokeWidth="2.2"`, `strokeLinecap/strokeLinejoin="round"`, `fill="none"` (mismo lenguaje que el `SunIcon` actual).
   - `BRAND_NAME = "Huellitas"` — constante con el nombre visible.
2. **`app/_components/sidebar.tsx`:** eliminar el `SunIcon` local; usar `PawIcon` y `BRAND_NAME` en los 2 logos (sidebar desktop ~línea 209 y header móvil ~línea 301) y sus 2 textos.
3. **`app/_components/login-form.tsx`:** eliminar el `SunIcon` local; usar `PawIcon` + `BRAND_NAME` en el bloque de logo (~líneas 103–107).
4. **`app/_components/activate-account-form.tsx`:** eliminar el `SunIcon` local; `PawIcon` en los 2 estados (código inválido ~línea 57, bienvenida ~línea 219) y textos → `"Bienvenida a Huellitas"` y `"Este email ya tiene una cuenta en Huellitas. …"`.
5. **Metadatos:** `app/layout.tsx` → `title: "Huellitas"`; `app/login/page.tsx` → `title: "Iniciar sesión · Huellitas"`.
6. **`app/favicon.ico`:** regenerarlo con el mismo estilo que el logo del sidebar (cuadrado gradiente `#F8C3A8 → #F2937A` + huella blanca).

**No incluye (fuera de esta spec):**

- Renombrar repo, carpetas, `package.json`, emails (`staff@opendaycare.dev`, `hola@opendaycare.com`), BD o docs internos.
- Tocar `references/pantallas/*.dc.html` (quedan como histórico del curso).
- Cambiar el sol del botón "Resumen del día" en `parents-panel.tsx`.
- Cambiar textos de seed como "Sala Soles" o el email `hola@opendaycare.com` de la SPEC 19.

## Modelo de datos

Este feature no introduce datos ni estructuras nuevas. Es un cambio de textos, un componente visual y un asset.

## Plan de implementación

1. **Crear `app/_components/brand.tsx`** con `PawIcon` y `BRAND_NAME` → `npx tsc --noEmit` pasa.
2. **Sidebar:** reemplazar el `SunIcon` local por los imports de `brand.tsx` en los 2 logos + 2 textos → captura de `/` en 1440 y en 375 (header móvil).
3. **Login:** ídem en `login-form.tsx` → captura de `/login`.
4. **Activación:** ídem en `activate-account-form.tsx` (2 iconos + 2 textos) → captura de `/activate` con estado "Código no válido".
5. **Metadatos:** actualizar los 2 `title` → verificar el título de la pestaña en el navegador.
6. **Favicon:** generar la huella sobre gradiente, rasterizar a PNG (Playwright) y envolver en `app/favicon.ico` (contenedor ICO con PNG embebido, script Node sin dependencias) → verificar en la pestaña con hard refresh.
7. **Verificación final:** grep de "OpenDayCare" en `app/` sin resultados + Playwright en 1440/768/375 + `npm run lint` + `npx tsc --noEmit`.

## Criterios de aceptación

- [x] `grep -ri "opendaycare" app/` no devuelve ningún resultado.
- [x] Existe `app/_components/brand.tsx` exportando `PawIcon` y `BRAND_NAME`; sidebar, login y activate los importan (sin `SunIcon` local en esos 3 archivos).
- [x] Sidebar desktop y header móvil muestran la huella + "Huellitas".
- [x] `/login` muestra la huella + "Huellitas".
- [x] `/activate` muestra "Bienvenida a Huellitas" y "…cuenta en Huellitas".
- [x] Títulos de pestaña: "Huellitas" (raíz) e "Iniciar sesión · Huellitas" (`/login`).
- [x] El botón "Resumen del día" de `parents-panel.tsx` sigue mostrando el sol.
- [x] `app/favicon.ico` muestra la huella sobre gradiente en la pestaña.
- [x] `git status` no muestra cambios en `references/`.
- [x] `npm run lint` y `npx tsc --noEmit` sin errores.

## Decisiones tomadas y descartadas

**Del usuario:**

1. **Solo capa visual.** Descartado: renombrar repo/`package.json`/emails/BD — cero beneficio visual y rompería specs anteriores (01, 03, 09, 19).
2. **Huella stroke blanco** (trazo 2.2, 24×24). Descartado: huella rellena — pesada y fuera del lenguaje de iconos de la app.
3. **No tocar `references/*.dc.html`.** Descartado: actualizarlas — son el diseño histórico del curso y la SPEC 21 compara contra ellas; el logo queda exento de esa comparación.
4. **Componente compartido `brand.tsx`.** Descartado: reemplazar el SVG en cada archivo — 4 copias hoy, cambiar la marca después sería 4 cambios.
5. **Favicon = estilo del logo** (gradiente + huella blanca). Descartado: huella naranja sin fondo.
6. **Mantener el sol en "Resumen del día".** Descartado: cambiarlo a huella — es icono semántico de "día", no marca.

**Técnicas:**

- **Sí:** constante `BRAND_NAME` para no repetir el string en 7 lugares. **No:** hardcodear "Huellitas" en cada archivo.
- **Sí:** conservar `SunIcon` propio en `parents-panel.tsx` (es el único uso). **No:** exportarlo desde `brand.tsx` (mezclaría marca con icono semántico).
- **Sí:** ICO con PNG embebido generado por script Node sin dependencias. **No:** agregar `sharp` u otras deps solo para el favicon.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El `.ico` regenerado no sea válido | Verificar en pestaña en el paso 6; si falla, dejar `app/icon.svg` (convención Next) como respaldo |
| Safari/Chrome cachean el favicon viejo | Hard refresh / pestaña privada durante la verificación |
| Quitar `SunIcon` local rompa otro uso no detectado | Grep de `<SunIcon` antes de eliminar cada definición |

## Lo que **no** está en esta spec

- Renombrar identificadores internos (repo, `package.json`, emails, BD).
- Actualizar `references/pantallas/*.dc.html`.
- Cambiar el sol de "Resumen del día".
- Cambiar el favicon a `icon.svg` vectorial.

Cada uno de esos, si llega, va en su propia spec.
