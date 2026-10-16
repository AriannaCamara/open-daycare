# SPEC 05 — Modal "Vincular padre" en `/kids/[id]`

**Estado:** Borrador
**Fecha:** 2026-10-16
**Depende de:** SPEC 02
**Objetivo:** Implementar la pantalla `vincular-padre.dc.html` como modal que se abre al hacer clic en "Vincular otro padre" del perfil del niño, y que al enviar la invitación agrega el nuevo padre a la lista con estado PENDIENTE.

## Alcance

**Incluye:**

- Botón "Vincular otro padre" en `app/_components/parents-panel.tsx`: deja de ser un `Link` a `/link-parent` (ruta inexistente → 404) y abre un modal.
- Modal nuevo `app/_components/link-parent-modal.tsx` (`"use client"`): overlay + card centrada (max 480px, radius 24, bg `#FBF4EC`) con:
  - Header: "Vincular padre" + subtítulo "a {nombre del niño}" y botón X (34×34, bg `#F0E6D8`).
  - Banner azul `#E3ECFB`: "Le enviaremos un correo con un código para que active su cuenta. Solo verá el feed de {nombre del niño}."
  - NOMBRE DEL PADRE/MADRE (obligatorio, placeholder "Ej. Diego Fernández").
  - EMAIL (obligatorio, formato, placeholder "correo@ejemplo.com").
  - PARENTESCO: pills "Mamá" / "Papá" / "Tutor/a", con "Mamá" preseleccionado (bg `#CCD8F4`, borde `#9FB8EC`, texto `#4E72C8`).
  - Caja de código `#FBF1D6` dashed `#E6D08A`: "CÓDIGO DE INVITACIÓN" / `7K4P9` / "Vence en 7 días".
  - Botón "Enviar invitación" con ícono de avión, gradiente `#F4977E → #EE8164`.
- Validación inline en español (borde `#D9583C`, texto `#C5503A`, igual SPEC 03/04).
- Cierre con X, clic en overlay y Esc; al cerrar se resetea el form.
- `parents-panel.tsx` pasa a `"use client"`: lista de padres en estado local; al enviar agrega el padre con `status: "pending"` y cierra.
- `app/_data/children.ts`: `ParentRelation` gana `"tutor"`; `parentStatusLabels` pasa a función `parentStatusLabel(relation, status)` (ACTIVA / ACTIVO / PENDIENTE).
- `app/kids/[id]/page.tsx` pasa `childName={child.fullName}`.

**No incluye (fuera de esta spec):**

- Ruta `/link-parent` (se elimina el `Link` muerto).
- Backend/DB/fetch/persistencia: al recargar, la lista vuelve al mock.
- Envío real de correo o verificación del email/código.
- Abrir el modal desde la pill VINCULAR de `KidCard` en `/kids`.
- Actualizar el contador de padres de `KidCard` (estado en otra página).
- Edición/eliminación de padres vinculados.
- Tests automatizados.

## Modelo de datos

```ts
// children.ts
export type ParentRelation = "mother" | "father" | "tutor";
export function parentStatusLabel(relation: ParentRelation, status: ParentStatus): string;
// mother+active → "ACTIVA"; father/tutor+active → "ACTIVO"; pending → "PENDIENTE"

// link-parent-modal.tsx
type LinkParentValues = {
  fullName: string;            // "Diego Fernández"
  email: string;               // "correo@ejemplo.com"
  relation: ParentRelation;    // "mother" (preseleccionado)
};

const inviteCode = "7K4P9";    // + "Vence en 7 días"
```

| Campo | Regla | Mensaje |
| --- | --- | --- |
| fullName | requerido (trim) | `Ingresá el nombre completo.` |
| email | requerido | `Ingresá el email.` |
| email | formato | `El email no tiene un formato válido.` |
| relation | requerido | `Elegí un parentesco.` (nunca vacío: Mamá preseleccionado) |

Construcción del `Parent` al enviar:

- `id`: slug minúsculas sin acentos; si existe en `child.parents`, sufijo incremental (`-2`, `-3`…).
- `initial`: primera letra en mayúscula.
- `tone`: rota sobre `avatarToneStyles` según `parents.length`.
- `status`: siempre `"pending"`.
- `relation`: la opción elegida.

## Plan de implementación

1. **Tipos y labels.** `children.ts`: agregar `"tutor"` y reemplazar `parentStatusLabels` por `parentStatusLabel(...)`; actualizar su único consumidor (`parents-panel.tsx:2`). → tsc pasa; Pablo Ruiz muestra "ACTIVO".
2. **Esqueleto del modal.** Crear `link-parent-modal.tsx` con props `open`, `onClose`, `onInvite`, `childName`: overlay + card 480px + header + banner + 2 inputs + pills + caja de código + botón. → montable con `open={true}`.
3. **Validación y cierre.** `values`/`errors`, errores inline; X, overlay y Esc cierran y resetean. → interacción completa.
4. **Panel cliente.** `parents-panel.tsx` a `"use client"`: estado `parents` + `open`; el `Link` a `/link-parent` (`parents-panel.tsx:103`) pasa a `<button>`; `handleInvite` construye el `Parent`, lo agrega y cierra. → flujo completo.
5. **Página.** `app/kids/[id]/page.tsx:140` pasa `childName={child.fullName}`. → header/banner con nombre real.
6. **Verificación.** Playwright 1440/768/375 en `/kids/mateo-fernandez` contra `vincular-padre.dc.html`; `npm run lint` y `npx tsc --noEmit`.

## Criterios de aceptación

- [ ] `/kids/mateo-fernandez` renderiza sin errores de consola ni de build.
- [ ] "Vincular otro padre" abre el modal y no navega (no existe el `Link` a `/link-parent`).
- [ ] Header muestra "Vincular padre" y "a Mateo Fernández".
- [ ] Banner azul muestra "...Solo verá el feed de Mateo."
- [ ] PARENTESCO arranca con "Mamá" seleccionado.
- [ ] Caja de código muestra "7K4P9" y "Vence en 7 días".
- [ ] Submit con nombre vacío muestra "Ingresá el nombre completo." y no agrega ni cierra.
- [ ] Submit con email vacío muestra "Ingresá el email." y no agrega ni cierra.
- [ ] Email `caro@` muestra "El email no tiene un formato válido."
- [ ] Enviar con datos válidos cierra el modal y agrega el padre con pill PENDIENTE y subtítulo "invitación enviada".
- [ ] Enviando con "Tutor/a", el padre nuevo muestra "Tutor/a · invitación enviada".
- [ ] Overlay, Esc y la X cierran sin agregar nada.
- [ ] Tras cerrar, reabrir muestra nombre/email vacíos y "Mamá" preseleccionado.
- [ ] Padres activos: mamá "ACTIVA", papá/tutor "ACTIVO" (Pablo Ruiz ya no muestra "ACTIVA").
- [ ] A 375px el modal cabe sin scroll horizontal.
- [ ] `npm run lint` y `npx tsc --noEmit` sin errores.

## Decisiones tomadas y descartadas

- **Sí:** modal en lugar de ruta — decisión del usuario; el `Link` actual apuntaba a una ruta inexistente.
- **Sí:** `"tutor"` en `ParentRelation` — decisión explícita; `Record<ParentRelation, string>` fuerza el label en build.
- **Sí:** al enviar se agrega con PENDIENTE y cierra — feedback real sin backend (criterio SPEC 04).
- **Sí:** código fijo `7K4P9` — idéntico al de `/activate-account` (SPEC 03).
- **Sí:** "Mamá" preseleccionado — como el template; la validación de relation queda como red (igual que SALA en SPEC 04).
- **Sí:** solo desde el perfil — decisión explícita; la pill VINCULAR de `KidCard` sigue linkeando al perfil.
- **Sí:** `ParentsPanel` cliente con estado local — patrón SPEC 04 (page server + componente cliente).
- **Sí:** `parentStatusLabel(relation, status)` — corrige el bug latente de Pablo Ruiz (padre activo mostraba "ACTIVA").
- **Sí:** card de 480px — medida del template (SPEC 04 usaba 520px con 5 campos).
- **Descartado:** persistencia, ruta `/link-parent`, envío de correo, verificación, navegación tras enviar, modal desde tarjetas, focus trap.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Extender `ParentRelation` rompe `Record<ParentRelation, string>` incompletos | Se actualiza `relationLabels` en el paso 1; TS falla en build si falta. |
| Panel cliente bajo `<Suspense>` con `cacheComponents: true` | Props planas serializables; sin fetch no requiere `<Suspense>` extra. |
| Estado local se pierde al navegar/recargar | Limitación aceptada en el alcance (criterio SPEC 04). |
| Slug colisionante | Sufijo incremental `-2`, `-3`… en `child.parents`. |
| Sin screenshot de referencia | Verificar lado a lado con Playwright contra el `.dc.html`. |

## Lo que **no** está en esta spec

- Ruta `/link-parent` ni persistencia de los padres agregados.
- Envío real de correos o verificación del código.
- Modal desde las tarjetas de `/kids` o su contador de padres.
- Edición o eliminación de padres vinculados.

Cada uno de esos, si llega, va en su propia spec.
