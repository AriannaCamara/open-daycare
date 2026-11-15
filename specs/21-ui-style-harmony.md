# SPEC 21 — Armonía de estilos: labels, placeholders y errores

> **Estado:** Implementado
> **Depende de:** SPEC 20
> **Fecha:** 2026-11-15
> **Objetivo:** Unificar en toda la app los labels de formulario, el color de placeholder y el error global de envío según las referencias `references/pantallas/*.dc.html`.

## Alcance

**Incluye** (4 patrones canónicos, tomados de las referencias):

1. **Labels de formulario/sección** → `text-[12px] font-extrabold tracking-[0.7px] text-[#94887B]`. Se corrigen: `app/_components/create-post-modal.tsx` (`sectionLabelClassName`), `app/_components/add-child-modal.tsx`, `app/_components/link-parent-modal.tsx`, `app/_components/child-notes.tsx`, `app/_components/child-care-modal.tsx` (2), `app/_components/login-form.tsx` (2), `app/_components/activate-account-form.tsx` (2). Hoy hay `font-bold text-muted` y `text-muted-strong`.
2. **Placeholder** → `#B6A99B` en todos los inputs/textarea. Se corrigen: `child-care-modal.tsx`, `create-post-modal.tsx` (textarea), `add-child-modal.tsx`, `activate-account-form.tsx` (2), `child-notes.tsx`, `link-parent-modal.tsx`, `login-form.tsx` (2), `app/_components/kids-directory.tsx` (búsqueda). `app/_components/comment-section.tsx` ya es correcto.
3. **"Cancelar" de cabecera de modales** → `text-[15px] font-bold text-[#94887B]` en `create-post-modal.tsx`, `add-child-modal.tsx`, `child-care-modal.tsx` (hoy `text-muted-strong`). El botón "X" de `link-parent-modal.tsx` ya es `#94887B`.
4. **Error global de envío** → caja `rounded-[12px] border border-[#F0B4A4] bg-[#F9D2DE] px-4 py-3 text-[13.5px] font-semibold text-[#B3452E]`. Se corrige `create-post-modal.tsx` (`submitError`, hoy texto plano); `add-child-modal.tsx` y `child-care-modal.tsx` ya la usan. El error de campo sigue siendo texto rojo plano `text-[13px] font-semibold text-[#B3452E]`.
5. **Barrido final**: recorrer pantalla por pantalla contra `references/screenshots/*.png` y corregir cualquier desviación de esos 4 patrones, sin cambiar comportamiento.

**No incluye (fuera de esta spec):**

- Cambiar métricas de padding de inputs: `13px 16px` (modales) y `14px 16px` (login/activación) **ya coinciden** con su referencia; el input de búsqueda de `/kids` (`border` 1px, `padding 12px 16px`, `bg-surface`) también.
- Quitar el anillo de foco `#B3452E` (decidido mantenerlo; las referencias lo omiten, nosotros no).
- Cabeceras dentro de tarjetas (`12.5px / .8px / #8A7C6D`) y eyebrows `#D9583C` — ya coinciden con las referencias.
- Radios distintos por tipo de componente (post `rounded-[20px]`, kid `rounded-[18px]`, bloques `rounded-[16px]`, modales `rounded-[24px]`): son capas distintas, no desviaciones.
- El dropdown de SPEC 20, rediseño de pantallas, dark mode, cambios de comportamiento.

## Modelo de datos

Este feature no introduce datos ni componentes nuevos: son cambios de clases Tailwind sobre componentes existentes.

## Plan de implementación

1. **Labels**: aplicar el patrón 1 en los 7 archivos → captura de `/login` y del modal "Nueva publicación".
2. **Placeholders**: aplicar el patrón 2 en los 8 archivos → captura de `/login` y `/kids`.
3. **"Cancelar" de cabecera**: patrón 3 en los 3 modales → captura de los 3 modales abiertos.
4. **Error de envío**: patrón 4 en `create-post-modal.tsx` → se ve como caja rosa igual que los otros modales.
5. **Barrido**: comparar cada pantalla contra `references/screenshots/*.png` y corregir desviaciones restantes de los 4 patrones; si algo requiere cambio de comportamiento, se anota y **no** se toca en esta spec.
6. **Verificación**: Playwright en 1440/768/375 + `npm run lint` + `npx tsc --noEmit`.

## Criterios de aceptación

- [x] Ningún label de formulario usa `font-bold` + `text-muted` ni `text-muted-strong`; todos son `text-[12px] font-extrabold tracking-[0.7px] text-[#94887B]`.
- [x] Ningún placeholder usa `#7E7264`; todos usan `#B6A99B`.
- [x] Los modales "Nueva publicación", "Agregar niño" y el de cuidados muestran "Cancelar" en `#94887B` bold 15px.
- [x] El error global de envío del modal de publicación se renderiza como caja rosa con texto `#B3452E` (mismo estilo que "Agregar niño").
- [x] Los errores de campo siguen siendo texto rojo plano (sin caja) en todos los modales.
- [x] Ninguna métrica de input cambió respecto a su referencia (padding 13px/14px, border 1.5px, radius 14px).
- [ ] Capturas de `/login`, `/activate`, `/feed`, `/kids`, `/family`, perfil de niño y los 4 modales sin desviaciones de los 4 patrones. — 19 capturas en `.playwright-mcp/spec21-*.png` (1440/768/375); **salvedad:** `/activate` solo se capturó con el estado "Código no válido" porque sin SMTP no existe una invitación `pending` válida; su formulario se verificó por revisión de código (`activate-account-form.tsx` → labels/placeholder canónicos).
- [x] `npm run lint` y `npx tsc --noEmit` sin errores.

## Decisiones tomadas y descartadas

**Del usuario:**

1. **Auditoría a app completa, solo desviaciones** de los patrones canónicos. Descartado: limitar a modales, o arreglar "lo que sea" sin patrón de referencia.
2. **Label canónico = referencia** (`extrabold` + `#94887B`, color literal fuera de los tokens). Descartado: `text-muted-strong` (token existente pero más oscuro) y `font-bold text-muted` (mayoría actual).
3. **Inputs = métricas de referencia** y placeholder `#B6A99B`. Descartado: placeholder `#7E7264` y no tocar inputs.
4. **Campo = texto plano, envío = caja rosa.** Descartado: todo texto o todo caja.
5. **Dos specs** (20 dropdown, 21 auditoría). Descartado: una sola spec con fases.
6. **Verificación con Playwright + lint + tsc.** Descartado: solo lint/tsc.

**Técnicas:**

- **Sí:** constantes de clases por archivo (patrón ya usado en el repo: `sectionLabelClassName`, `baseInputClassName`…). **No:** módulo central de estilos — los inputs varían 13px/14px por pantalla según su propia referencia y centralizar obligaría a parámetros por variante.
- **Sí:** referencias `.dc.html` como fuente de verdad. **No:** decidir por gusto.
- **Sí:** 4 patrones explícitos. **No:** "arreglar lo que se vea raro" (no verificable).

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `#B6A99B` tiene menos contraste que `#7E7264` en placeholders | Es el color de las 16 referencias; si el chequeo de accesibilidad lo marca, se revierte solo el placeholder |
| Un cambio de color rompa contraste en botones claros | Los cambios son solo en labels/placeholder/error; botones no se tocan |
| El barrido final alcance cambios de comportamiento | Regla explícita: solo clases; lo funcional queda fuera y se anota |

## Lo que **no** está en esta spec

- Dropdown de sala (SPEC 20).
- Padding/bordes de inputs y búsqueda de `/kids` (ya correctos).
- Quitar el anillo de foco.
- Radios, sombras y tarjetas por tipo de componente.
- Cualquier cambio de comportamiento o de datos.

Cada uno de esos, si llega, va en su propia spec.
