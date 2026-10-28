# SPEC 15 — Conteo real de padres activos en las tarjetas de /kids

> **Estado:** Implementado
> **Depende de:** SPEC 11 (datos reales del perfil), SPEC 12 (invitación y activación de padres)
> **Fecha:** 2026-10-28
> **Objetivo:** Que la tarjeta de cada niño en /kids muestre el conteo real de padres activos vinculados en lugar del "sin padres vinculados" hardcodeado.

## Por qué existe esta spec

El modelo de datos ya soporta la relación padre–hijo (`parent_children` + `invitations`, SPEC 12) y el perfil `/kids/[id]` la muestra bien vía `fetchChildParents` (SPEC 11). Falta propagarla al listado: `mapChildRow` (`app/_data/child-mapper.ts:67`) fuerza `parents: []`, así que `KidCard` siempre lee longitud 0 y todas las tarjetas muestran "sin padres vinculados" + pill VINCULAR, incluso cuando el niño sí tiene padres activos.

## Alcance

**Incluye:**

- Cambiar el tipo `Child.parents: Parent[]` por `Child.parentsCount: number` en `app/_data/children.ts` (el único consumidor del array era `KidCard` leyendo `.length`; el perfil usa `fetchChildParents` aparte).
- Actualizar el array mock `children` de `app/_data/children.ts` (lo usa `create-post-modal.tsx`): reemplazar cada `parents: [...]` por `parentsCount` contando solo los padres con `status: "active"`.
- `mapChildRow(row, index, parentsCount = 0)` en `app/_data/child-mapper.ts`: tercer parámetro opcional con default 0.
- `KidCard` usa `child.parentsCount` para el label ("sin padres vinculados" / "1 padre vinculado" / "N padres vinculados") y para el pill VINCULAR.
- Helper `fetchParentsCountByChild(childIds)` en `app/_data/parents.ts`: query batch a `parent_children` (`.in("child_id", ids)` + join `users(status)`), devuelve `Map<childId, number>` contando solo `users.status === "active"`.
- `app/kids/kids-view-server.tsx`: tras obtener los niños activos, llama al helper y pasa el conteo a `mapChildRow`.

**No incluye (specs futuras):**

- Incluir invitaciones pendientes en el conteo de la tarjeta (decisión: solo padres activos; un niño con solo una invitación pending muestra "sin padres vinculados" + VINCULAR).
- Restringir /kids a staff/admin (hoy un rol parent que abra /kids ve solo sus propios vínculos por RLS y el conteo puede ser menor al real; comportamiento aceptado, ver Riesgos).
- Refresco del conteo en el cliente al invitar/aceptar un padre sin recargar (al abrir el perfil y volver ya se recarga el server component).
- Cambiar el panel del perfil (`ParentsPanel`) o `fetchChildParents`: siguen mostrando activos + pendientes como hasta ahora.
- Migraciones o cambios de RLS.

## Modelo de datos

No introduce estructuras en la DB. Cambios de tipos en la app:

```ts
// app/_data/children.ts — Child deja de arrastrar el array de padres
export interface Child {
  // ...campos existentes sin cambio...
  parentsCount: number; // reemplaza parents: Parent[]
}

// app/_data/parents.ts — nuevo helper
export async function fetchParentsCountByChild(
  childIds: string[],
): Promise<Map<string, number>>; // childId → padres activos
```

El tipo `Parent` y `fetchChildParents` se mantienen intactos (los sigue usando `ParentsPanel`).

## Plan de implementación

1. **Tipo y mocks.** En `app/_data/children.ts`: `Child.parents` → `parentsCount: number`; convertir el array mock (contando solo `status: "active"`: Mateo 1, Sofía 1, Benjamín 2, Valentina 0, Tomás 1, Emma 1, Lucas 1, Olivia 1). En el mismo paso, `child-mapper.ts` acepta `parentsCount = 0` y `kid-card.tsx` lee `child.parentsCount`. → Compila (`npx tsc --noEmit`); la UI no cambia: el server aún no pasa conteos y todos muestran 0.
2. **Helper batch.** Agregar `fetchParentsCountByChild` en `app/_data/parents.ts`: `parent_children.select("child_id, users(status)")`, `.in("child_id", ids)` solo si `ids` no está vacío, agrupa contando `users?.status === "active"`. → Compila; sin consumidor todavía.
3. **Wiring en el listado.** `kids-view-server.tsx`: extraer los ids de los niños resultantes, llamar al helper (después del fetch de children; RLS ya limita `parent_children` a los vínculos visibles del usuario) y pasar `parentsCount` a cada `mapChildRow`. `kids-view.tsx` (alta de niño) no cambia: el default 0 es correcto para un niño recién creado. → Verificable en el navegador en `/kids`.
4. **Verificación.** Playwright en `/kids` (1440/768/375), contraste del conteo con una query de control en DB, `npm run lint` y `npx tsc --noEmit`.

## Criterios de aceptación

- [x] Con sesión staff, /kids muestra "1 padre vinculado" o "N padres vinculados" para los niños que tienen filas en `parent_children` con `users.status = 'active'`.
- [x] El conteo de cada tarjeta coincide con: `select count(*) from parent_children pc join users u on u.id = pc.parent_id where pc.child_id = <id> and u.status = 'active'`.
- [x] Un niño solo con invitaciones pendientes (sin `parent_children`) muestra "sin padres vinculados" y el pill VINCULAR.
- [x] Un niño con alergia sigue mostrando el pill de alergia en lugar de VINCULAR (prioridad existente intacta).
- [x] Al crear un niño desde el modal, su tarjeta muestra "sin padres vinculados" + VINCULAR sin recargar.
- [x] El perfil /kids/[id] sigue mostrando padres activos + pendientes en el panel (sin regresión).
- [x] `npm run lint` y `npx tsc --noEmit` sin errores.

## Decisiones tomadas y descartadas

- **Sí:** contar solo padres activos (`parent_children` + `users.status = 'active'`) — decisión del usuario; "vinculado" implica vínculo real, una invitación pending no lo es. Coincide con el filtro de `fetchChildParents`.
- **No:** incluir `invitations` pending en el conteo — decisión del usuario; evita mostrar "2 padres vinculados" cuando uno aún no aceptó.
- **Sí:** `parentsCount: number` en `Child` — decisión del usuario; el único consumidor del array era `.length` en `KidCard`, y no se descargan nombres que la tarjeta no muestra.
- **No:** mantener `parents: Parent[]` poblado — traería nombres/relación/tono sin uso; si algún día la tarjeta los muestra, se retoma en otra spec.
- **Sí:** query batch con `.in("child_id", ids)` en el server — decisión del usuario; una query extra por request, sin migración, sin N+1.
- **No:** agregación embebida `parent_children(count)` desde `children` — cuenta filas visibles pero no puede filtrar por `users.status`, que sí es requisito.
- **No:** vista/RPC en Postgres — requeriría migración para un conteo simple que el server ya puede agrupar en JS.
- **Sí:** default `parentsCount = 0` en `mapChildRow` — el perfil y el alta de niño (client) no necesitan cambios y un niño nuevo nace sin padres.
- **No:** restringir /kids a staff — decisión del usuario; fuera de alcance, documentado como riesgo.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Un rol parent en /kids solo ve sus propios vínculos (RLS `parent_children_select_own_or_staff`), así que su conteo puede ser menor al real | Aceptado fuera de alcance; la lista es de uso staff. Si algún día se restringe /kids, va en su propia spec |
| `users.status` podría filtrar padres reales si una cuenta quedó `pending` | El filtro replica el comportamiento ya validado en el perfil (`fetchChildParents`); coherente entre ambas vistas |
| Lista de ids vacía en `.in("child_id", [])` | El helper no lanza la query si `childIds` está vacío y devuelve un Map vacío |

## Lo que **no** está en esta spec

- Contar invitaciones pendientes en la tarjeta.
- Restringir /kids a staff/admin.
- Actualización en vivo del conteo al invitar/aceptar padres sin recargar.
- Cambios en `ParentsPanel` o `fetchChildParents`.

Cada uno, si llega, va en su propia spec.
