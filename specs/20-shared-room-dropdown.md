# SPEC 20 — Dropdown de sala compartido con estilo de listbox

> **Estado:** Implementado
> **Depende de:** SPEC 02 (lista de niños `/kids`), SPEC 16 (dropdown de sala en el modal de publicación)
> **Fecha:** 2026-11-15
> **Objetivo:** Reemplazar los `<select>` nativos de sala por un componente de dropdown compartido con el mismo estilo de listbox que ya usa el filtro de `/kids`.

## Alcance

**Incluye:**

- Nuevo archivo `app/_components/select-dropdown.tsx` que exporta `SelectDropdown`, extraído del `RoomDropdown` actual (`app/_components/kids-directory.tsx`).
- API: `options: { id: string; label: string }[]`, `value: string`, `onChange: (id: string) => void`, `ariaLabel: string`, `placeholder: string`, `fullWidth?: boolean`, `hasError?: boolean` (borde `#D9583C` en reposo; ampliación aprobada en fase de implementación para conservar el borde de error de "Agregar niño").
- Estética de la imagen 2 (literal del `RoomDropdown` actual): trigger `rounded-[14px] border-[1.5px] border-[#EADFD0] bg-white px-4 py-3 text-[15px] font-bold text-ink`, hover/foco `border-[#B3452E]` + anillo `focus:outline-2 focus:outline-offset-2 focus:outline-[#B3452E]`, chevron 16px `#B0A290` que rota 180° al abrir.
- Menú `role="listbox"` (`rounded-[16px] border border-[#ECE0D0] bg-[#FBF4EC] p-1.5` + sombra `shadow-[0_16px_36px_-16px_rgba(63,54,46,0.28)]`), opción activa `bg-accent-ghost text-accent`, hover `bg-[#F4ECE1]`; cierra con Escape y con click afuera.
- Tres usos: filtro de sala de `/kids` (reemplaza `RoomDropdown`), sección **SALA** de `app/_components/create-post-modal.tsx`, sección **SALA** de `app/_components/add-child-modal.tsx`.
- En el modal de publicación se conservan las opciones (salas + "Toda la guardería" con `id: ""` al final) y el default = primera sala.
- En "Agregar niño" se conserva el default `Soles` y la validación `errors.roomId`.

**No incluye (fuera de esta spec):**

- Agregar "Toda la guardería" al filtro de `/kids`.
- Cambiar la lógica de datos, validación o el contrato de `PostInput.roomId`.
- Labels, placeholders y errores (SPEC 21).
- Búsqueda dentro del menú, multi-selección, animaciones o scroll en el menú.
- Otros controles nativos (`type="date"`, checkboxes).

## Modelo de datos

Este feature no introduce estructuras nuevas. El componente declara localmente `SelectOption { id, label }`; las opciones siguen saliendo de `rooms` (`RoomOption` de `app/_data/feed.ts`) más el literal `{ id: "", label: "Toda la guardería" }` que ya existe en el modal.

## Plan de implementación

1. **Crear** `app/_components/select-dropdown.tsx` con `SelectDropdown` (trigger + chevron + menú + handlers de Escape/click-outside + atributos `aria-haspopup`/`aria-expanded`/`role`) → compila con `npx tsc --noEmit`.
2. **Reemplazar** `RoomDropdown` en `app/_components/kids-directory.tsx` por `SelectDropdown` con ancho `sm:w-[168px]` → captura de `/kids` con menú abierto **idéntica** a la actual.
3. **Reemplazar** el `<select>` de SALA de `create-post-modal.tsx` por `SelectDropdown` (`fullWidth`, opciones = salas + "Toda la guardería") → abrir el modal, elegir sala y publicar: `roomId` enviado igual que antes.
4. **Reemplazar** el `<select>` de SALA de `add-child-modal.tsx` por `SelectDropdown` (`fullWidth`) → abrir el modal, elegir sala y guardar: el niño queda en la sala elegida.
5. **Verificación**: Playwright en 1440/768/375 + `npm run lint` + `npx tsc --noEmit`.

## Criterios de aceptación

- [x] Existe `app/_components/select-dropdown.tsx` exportando `SelectDropdown`; ninguno de los 3 archivos de uso contiene `<select>`.
- [x] El trigger muestra el nombre de la sala, texto `font-bold` 15px y chevron 16px `#B0A290` que rota al abrir.
- [x] El trigger tiene borde `#EADFD0` en reposo y `#B3452E` con anillo de foco al enfocar/hover (estilo imagen 2).
- [x] El menú tiene `role="listbox"`, cada fila `role="option"` con `aria-selected`, y `aria-expanded`/`aria-haspopup` en el trigger.
- [x] La opción seleccionada se resalta con fondo `bg-accent-ghost` y texto `text-accent`.
- [x] Escape y un click fuera del componente cierran el menú; el listener se limpia al desmontar (sin fugas).
- [x] El filtro de `/kids` se ve igual que antes (captura con menú abierto comparada con la actual).
- [x] El modal "Nueva publicación" lista las salas + "Toda la guardería" al final, arranca en la primera sala y el `roomId` que llega al action es el mismo de antes.
- [x] El modal "Agregar niño" lista las salas, guarda la sala elegida y la validación "Elegí una sala." sigue funcionando.
- [x] En 1440/768/375 el menú no se corta ni queda tapado por otros elementos dentro del modal.
- [x] `npm run lint` y `npx tsc --noEmit` sin errores.

## Decisiones tomadas y descartadas

**Del usuario:**

1. **Componente compartido** (`SelectDropdown` en un solo archivo). Descartado: duplicar el markup en cada pantalla (mantiene la duplicación).
2. **Foco = estilo del `RoomDropdown`/imagen 2** (borde `#B3452E` + anillo actual); los inputs de texto conservan su anillo. Descartado: quitar el anillo de foco en toda la app.
3. **Mismas opciones y default** en el modal de publicación. Descartado: quitar "Toda la guardería" (rompería `PostInput.roomId`) y agregarla al filtro de `/kids` (cambia el comportamiento del listado).
4. **Auditoría de armonía aparte** → SPEC 21. Descartado: una sola spec con todo.

**Técnicas:**

- **Sí:** librería propia sin dependencias. **No:** Radix/Headless UI — peso nuevo y dependencia para 3 usos.
- **Sí:** extraer del `RoomDropdown` existente (la imagen 2 ya es este código). **No:** rediseñar el menú.
- **Sí:** eliminar el `<select>` nativo. **No:** ocultarlo con CSS (sigue siendo el control pobre de estilo).
- **Sí:** opciones como prop (`id`/`label`), así "Toda la guardería" (`id: ""`) entra sin casos especiales.
- **Sí:** Escape manejado en el `onKeyDown` del contenedor con `stopPropagation()`. **No:** listener en `window` — se pisan con el del modal y lo cerraba junto con el menú (riesgo verificado en fase de implementación).
- **Sí:** sin `max-h`/scroll en el menú (hay 3 salas). **No:** virtualización.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El menú se corta dentro del modal (overlay con `overflow-y-auto`) | Paso 5 con capturas en 3 viewports; si se corta, ajustar `z-index`/posición |
| Regresión visual en `/kids` al refactorizar `RoomDropdown` | Captura antes/después en el paso 2; el estilo se copia literal |
| Escape del menú y Escape del modal (que cierra) se pisen | El menú solo está montado cuando `open`; verificar abrir/cerrar con teclado |

## Lo que **no** está en esta spec

- Labels, placeholders y estilo de errores → SPEC 21.
- "Toda la guardería" como opción en el filtro de `/kids`.
- Cambios de datos/validación en los modales.
- Controles nativos distintos al `<select>` (fecha, checkboxes).

Cada uno de esos, si llega, va en su propia spec.
