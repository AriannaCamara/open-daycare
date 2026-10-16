# SPEC 04 — Modal "Agregar niño" en `/kids`

**Estado:** Implementado
**Fecha:** 2026-10-16
**Depende de:** SPEC 02
**Objetivo:** Implementar el formulario de `agregar-nino.dc.html` como modal sobre `/kids`, con nombre, fecha de nacimiento y sala obligatorios, que al guardar agrega el niño a la lista visible.

## Alcance

**Incluye:**

- Botón "Agregar niño" en el header de `/kids`: deja de navegar a `/add-child` y abre un modal.
- Modal nuevo `app/_components/add-child-modal.tsx` (`"use client"`): overlay oscuro + card centrada (max 520px, radius 24, bg `#FBF4EC`) con header "Cancelar / Agregar niño / Guardar" y 5 campos en el orden del template:
  - NOMBRE COMPLETO (texto, obligatorio)
  - FECHA DE NACIMIENTO (`input type="date"`, obligatoria, no futura)
  - SALA (select con única opción "Soles", preseleccionada)
  - ALERGIAS (ETIQUETAS) (texto, opcional)
  - NOTAS MÉDICAS (textarea, opcional)
- Validación al enviar con mensajes inline en español; borde de error `#D9583C`, texto `#C5503A` (mismo estilo que SPEC 03).
- Cierre con Cancelar, clic en el overlay y Esc; al cerrar se resetea el formulario.
- `app/_components/kids-view.tsx` (`"use client"`): concentra header, `KidsDirectory` y el modal; mantiene la lista de niños en estado local y agrega el nuevo al guardar.
- `app/kids/page.tsx` pasa a montar `KidsView` con los datos iniciales (Sidebar sigue en la page server).

**No incluye (fuera de esta spec):**

- Ruta `/add-child` (el modal la reemplaza; el `Link` existente se elimina).
- Backend, base de datos, fetch o persistencia (localStorage): al recargar, la lista vuelve al mock.
- Perfil `/kids/[id]` para los niños creados en sesión (su tarjeta linkea y daría 404 — limitación aceptada).
- Editar o eliminar un niño ya agregado.
- Selector de múltiples salas o gestión de salas.
- Autocompletado/etiquetas chip para alergias (es un input de texto simple).
- Tests automatizados.

## Modelo de datos

No hay persistencia nueva. Solo tipos locales del modal y construcción del `Child` (tipo de SPEC 02):

```ts
// add-child-modal.tsx
type AddChildValues = {
  fullName: string;      // "Martina López"
  birthDate: string;     // "2023-05-12" (ISO del input type="date")
  roomName: string;      // "Soles"
  allergies: string;     // "Maní, Lactosa" → opcional
  medicalNotes: string;  // "Indicaciones…" → opcional
};
```

Reglas de validación (al enviar):

| Campo | Regla | Mensaje |
| --- | --- | --- |
| fullName | requerido (trim) | `Ingresá el nombre completo.` |
| birthDate | requerido | `Ingresá la fecha de nacimiento.` |
| birthDate | no futura (hoy inclusive válida) | `La fecha no puede ser futura.` |
| roomName | requerido | `Elegí una sala.` (nunca vacío: "Soles" preseleccionado) |

Construcción del `Child` al guardar:

- `id`: slug del nombre en minúsculas y sin acentos (`"martina-lopez"`); si ya existe, sufijo incremental (`-2`, `-3`…).
- `ageYears`: calculado desde `birthDate` hasta hoy.
- `birthDateLabel`: formato `"12 mar 2022"` (meses en español en minúscula).
- `admissionLabel`: mes/año actual (`"oct 2026"`).
- `initial`: primera letra del nombre en mayúscula.
- `tone`: rota sobre las claves de `avatarToneStyles` según `kids.length`.
- `allergyLabel`: valor de ALERGIAS en mayúsculas; `allergiesNote`: NOTAS MÉDICAS; ambos `undefined` si el campo está vacío.
- `parents: []` (la tarjeta muestra "sin padres vinculados" + pill VINCULAR, igual que Valentina).

## Plan de implementación

1. **Esqueleto del modal.** Crear `app/_components/add-child-modal.tsx` (`"use client"`) con props `open`, `onClose`, `onSave`: overlay + card + header (Cancelar / "Agregar niño" / Guardar) + los 5 campos controlados vacíos, estilos del template. → montable con `open={true}`.
2. **Validación.** Estado `values`/`errors`, validar al submit con la tabla anterior, errores inline bajo cada campo; `onSave` solo se emite si pasa. → modal valida.
3. **Cierre y reset.** Cancelar, clic en el overlay y tecla Esc cierran (`useEffect` con `keydown`); cerrar resetea el form al estado inicial. → interacción completa.
4. **`kids-view.tsx`.** Crear `app/_components/kids-view.tsx` (`"use client"`): estado `kids` (inicializado con los datos) y `open`; header "GESTIÓN / Niños" + botón "Agregar niño" (reemplaza el `Link`); separador "SALA SOLES · N niños" con contador vivo; montar `KidsDirectory` y el modal; `handleSave` construye el `Child` (reglas anteriores), lo agrega a `kids` y cierra. → `/kids` con flujo completo.
5. **Página.** Simplificar `app/kids/page.tsx`: quitar el `Link` a `/add-child` y el header propio; montar `<KidsView initialKids={children} />` junto al Sidebar. → ruta funcional.
6. **Verificación.** Playwright a 1440px / 768px / 375px en `/kids`: abrir modal, probar validaciones, guardar, verificar tarjeta y contador; comparar el modal con `references/pantallas/agregar-nino.dc.html`; `npm run lint` y `npx tsc --noEmit`. → sin errores y match visual.

## Criterios de aceptación

- [x] `/kids` renderiza sin errores de consola ni de build.
- [x] El botón "Agregar niño" abre el modal y no navega a `/add-child`.
- [x] El modal muestra los 5 campos en el orden del template y "Soles" preseleccionado en SALA.
- [x] Submit con nombre vacío muestra "Ingresá el nombre completo." y no agrega ni cierra.
- [x] Submit con fecha vacía muestra "Ingresá la fecha de nacimiento." y no agrega ni cierra.
- [x] Una fecha futura muestra "La fecha no puede ser futura." y no agrega ni cierra.
- [x] Con nombre y fecha válidos, Guardar cierra el modal y agrega la tarjeta al grid con nombre, edad calculada, "sin padres vinculados" y pill VINCULAR.
- [x] El contador del separador pasa de 8 a 9 tras guardar.
- [x] Si se completó ALERGIAS, la tarjeta muestra la pill con ese texto en mayúsculas.
- [x] Cancelar cierra el modal sin agregar nada.
- [x] Clic en el overlay cierra el modal sin agregar nada.
- [x] Presionar Esc cierra el modal sin agregar nada.
- [x] Tras guardar (o cancelar), reabrir el modal muestra nombre/fecha vacíos y SALA en "Soles".
- [x] A 375px el modal cabe en pantalla sin scroll horizontal.
- [x] `npm run lint` y `npx tsc --noEmit` sin errores.

## Decisiones tomadas y descartadas

- **Sí:** modal en lugar de ruta `/add-child` — decisión explícita del usuario; el `Link` actual se elimina.
- **Sí:** el niño agregado aparece en la lista visible (estado local en el cliente) — feedback real sin backend.
- **Sí:** 5 campos (los 3 obligatorios + alergias y notas opcionales) — mismo orden y copy que el template.
- **Sí:** `input type="date"` nativo — picker, formato y validación locales sin código extra; el template usaba texto `dd/mm/aaaa`.
- **Sí:** SALA solo con "Soles" — única sala del mock; el campo es requerido en el modelo aunque nunca llegue vacío.
- **Sí:** cerrar con Cancelar, clic fuera y Esc; reset al cerrar — comportamiento estándar de modales.
- **Sí:** `KidsView` cliente concentra header + listado + modal — el estado de la lista debe vivir en cliente; la page se queda server con el Sidebar (mismo patrón que SPEC 03: page server + form cliente).
- **Sí:** slug con sufijo incremental ante colisión — evita ids duplicados sin lógica compleja.
- **Sí:** `admissionLabel` = mes actual — no hay dato real de ingreso; se deriva del momento del alta.
- **Sí:** alergias como una sola pill en mayúsculas — `Child.allergyLabel` es un string único en el modelo de SPEC 02.
- **Descartado:** persistencia (localStorage/DB), ruta `/add-child`, focus trap completo, chips de alergias, edición del niño creado, validación de solapamiento de nombres (solo de ids).

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La tarjeta del niño nuevo linkea a `/kids/[id]` y daría 404 (KidCard siempre navega) | Limitación aceptada y documentada en el alcance; arreglarlo requiere spec de perfil para niños de sesión. |
| Slug colisionante ("Mateo López" vs "Mateo Lopez") | Sufijo incremental `-2`, `-3`… al detectar id existente. |
| `ageYears` con fecha futura daría -1 | Validación "La fecha no puede ser futura." bloquea el submit. |
| `cacheComponents: true` | Todo es componente cliente con datos estáticos como props; sin fetch, no requiere `<Suspense>`. |

## Lo que **no** está en esta spec

- Ruta `/add-child` ni edición/eliminación de niños.
- Persistencia de los niños agregados (se pierden al recargar).
- Perfil de los niños creados en sesión.
- Gestión de múltiples salas.

Cada uno de esos, si llega, va en su propia spec.
