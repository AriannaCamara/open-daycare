# SPEC 18 — Ficha completa del hijo en el panel familiar (edición del padre)

> **Estado:** Implemented
> **Depende de:** SPEC 10 (tablas `rooms`/`children`), SPEC 11 (UI del perfil de niño), SPEC 12 (vínculos `parent_children`)
> **Fecha:** 2026-11-11
> **Objetivo:** Una pantalla en el panel familiar donde el padre ve toda la información de su hijo (datos, cuidados y aclaraciones) y puede editarla, agregar notas y borrarlas.

## Alcance

**Incluye:**

- Nuevo item **"Mis hijos"** en el sidebar familiar (`navItemsByPanel.family` en `app/_components/sidebar.tsx`), junto a "Feed".
- Lista `/family/kids` con los hijos vinculados al padre (vía `parent_children`), estilo `KidCard` actual (avatar, nombre, edad, pill de alergía). Estado vacío si no tiene hijos.
- Pantalla `/family/kids/[id]`: reutiliza el layout de `/staff/kids/[id]` y agrega dos bloques:
  - **CUIDADOS:** contacto de emergencia, persona autorizada a retirar, dieta/restricciones, medicación, siesta/rutinas, notas médicas, alergias y consentimiento de fotos.
  - **ACLARACIONES:** notas que el padre agrega, edita y borra una por una (con fecha).
- Botón **"Editar"** → modal `child-care-modal.tsx` con los campos de Cuidados. Los campos administrativos (nombre, nacimiento, ingreso, sala) se muestran pero **no** se editan.
- Actions en `app/_actions/child-profile.ts`: `updateChildProfile`, `addChildNote`, `updateChildNote`, `deleteChildNote`.
- Migración con dos tablas nuevas: `child_profile` (1:1 con `children`) y `child_notes`.
- RLS: el padre vinculado escribe; el staff solo lee los bloques nuevos.
- Ficha staff `/staff/kids/[id]` ampliada con **Cuidados** y **Aclaraciones** en solo lectura.

**No incluye (fuera de esta spec):**

- Edición de datos administrativos por el padre.
- Que el staff escriba en `child_notes` / `child_profile`.
- Cambios en el "Editar" del staff (`/add-child` intacto).
- Resumen del día, panel de padres en la vista familiar, fotos de perfil.
- Invitación/vinculación de padres desde la vista familiar.
- Paginación de notas o de la lista; notificaciones al staff.

## Modelo de datos

### DB (migración `supabase/migrations/<ts>_create_child_profile_and_notes.sql`)

```sql
create table public.child_profile (
  child_id uuid primary key references public.children(id) on delete cascade,
  emergency_contact text,
  pickup_authorization text,
  diet text,
  medication text,
  nap_schedule text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.child_notes (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  author_id uuid not null references public.users(id),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

- Trigger `set_updated_at` en ambas (reutiliza `public.set_updated_at()` de SPEC 01).
- Helper `public.is_parent_of_child(p_child_id uuid)` (`security definer`, `search_path` vacío, patrón de `is_staff()`): comprueba el vínculo en `parent_children` sin recursión RLS.
- **RLS:**
  - `child_profile`: `select` staff o padre vinculado; `insert`/`update` solo padre vinculado. Sin `delete`.
  - `child_notes`: `select` staff o padre vinculado; `insert` padre vinculado (`author_id = auth.uid()`); `update`/`delete` solo el autor.
  - `children`: nueva policy `children_update_parent_linked` (`is_parent_of_child(id)`), combinada en OR con la existente `children_update` de staff. Permite al padre cambiar `medical_notes`, `allergy_tags`, `photo_consent`. **RLS no distingue columnas**: la lista blanca vive en la action (decisión del usuario).
- **Grants:** `select` en ambas a `authenticated`; `insert`/`update` en `child_profile` e `insert`/`update`/`delete` en `child_notes`.

### View model (`app/_data/family-children.ts`)

```ts
export interface FamilyChild {
  id: string; fullName: string; ageYears: number; roomName: string;
  initial: string; tone: AvatarTone; allergyLabel?: string;
}

export interface ChildCare {
  emergencyContact: string | null;
  pickupAuthorization: string | null;
  diet: string | null;
  medication: string | null;
  napSchedule: string | null;
  medicalNotes: string | null;
  allergyTags: string[];
  photoConsent: boolean;
}

export interface ChildNote { id: string; body: string; createdAt: string; }

export interface ChildFullProfile {
  child: Child;              // reutiliza mapChildRow (SPEC 10/11)
  care: ChildCare;
  notes: ChildNote[];        // order created_at asc
}
```

### Queries

- `fetchFamilyChildren(supabase, parentId)`: `parent_children` → `select("children(id, full_name, birth_date, enrolled_at, medical_notes, allergy_tags, rooms(name))").eq("parent_id", parentId)`.
- `fetchChildFullProfile(supabase, childId)`: `children` + `child_profile` (`maybeSingle`) + `child_notes` en `Promise.all`; verifica vínculo → `notFound()` si no es hijo del padre de sesión.
- Staff: mismo select agregando `child_profile` y `child_notes`, sin verificar vínculo.

### Actions (`app/_actions/child-profile.ts`)

```ts
export type ActionResult = { ok: true } | { ok: false; error: string };

interface ChildProfileInput {
  emergencyContact: string; pickupAuthorization: string; diet: string;
  medication: string; napSchedule: string; medicalNotes: string;
  allergyTags: string[];        // "Maní, Lactosa" → ["Maní", "Lactosa"]
  photoConsent: boolean;
}

updateChildProfile(childId: string, input: ChildProfileInput): Promise<ActionResult>
addChildNote(childId: string, body: string): Promise<ActionResult>
updateChildNote(noteId: string, body: string): Promise<ActionResult>
deleteChildNote(noteId: string): Promise<ActionResult>
```

| Acción | Validación | Errores |
| --- | --- | --- |
| todas | sesión (`fetchSessionUser`) | `SESSION_ERROR` (`app/_actions/errors.ts`) |
| `updateChildProfile` | textos `.trim()` opcional (vacío = null); `allergyTags` sin vacíos; `photoConsent` boolean | `Este niño no es hijo tuyo.` (0 filas por RLS) / `No se pudo guardar. Intentá de nuevo.` |
| `addChildNote` | `body.trim()` requerido | `Escribí una aclaración.` |
| `updateChildNote` | `body.trim()`; update debe devolver 1 fila | `Escribí una aclaración.` / `No podés modificar esta aclaración.` |
| `deleteChildNote` | delete debe devolver 1 fila | `No podés modificar esta aclaración.` |

`updateChildProfile`: primero `.update({ medical_notes, allergy_tags, photo_consent }).eq("id", childId).eq("status","active").select("id")` sobre `children` (si 0 filas → error y no sigue), después `upsert` en `child_profile` (`onConflict: "child_id"`). **Nunca** acepta ni envía `full_name`, `birth_date`, `enrolled_at`, `room_id`, `status`.

## Plan de implementación

1. **Migración** con tablas, trigger, `is_parent_of_child()`, policies y grants → aplicar con MCP `apply_migration` y probar con `execute_sql` (select como staff OK; update como padre vinculado OK; sin vínculo, denegado).
2. **Data layer** `app/_data/family-children.ts` (tipos + `fetchFamilyChildren` + `fetchChildFullProfile`) → `npx tsc --noEmit` pasa.
3. **Actions** `app/_actions/child-profile.ts` con la tabla de errores → invocables desde cliente.
4. **Nav familiar**: `{ href: "/family/kids", label: "Mis hijos", icon: <UsersIcon /> }` en `sidebar.tsx` → item visible.
5. **Lista** `app/family/kids/page.tsx` (server, `connection()` + `<Suspense>` + skeleton, patrón SPEC 11): tarjetas estilo `KidCard` (con `href` parametrizable a `/family/kids/[id]`) + estado vacío → lista real.
6. **Detalle** `app/family/kids/[id]/page.tsx` solo lectura: layout staff + bloques CUIDADOS (7 campos, vacíos = "—") y ACLARACIONES; `notFound()` si no existe o no está vinculado → pantalla completa.
7. **Modal** `app/_components/child-care-modal.tsx` (patrón `add-child-modal`: Escape, errores inline, "Guardando…"): 7 campos + toggle de consentimiento, sin campos administrativos; `updateChildProfile` + `router.refresh()` → edición persiste.
8. **Notas CRUD**: formulario "Agregar aclaración" + Editar/Borrar por nota (confirmación estilo SPEC 16) → alta/edición/borrado funcionan.
9. **Ficha staff ampliada** en `app/staff/kids/[id]/page.tsx`: bloques nuevos en solo lectura → el staff ve lo que cargó el padre.
10. **Verificación**: Playwright 1440/768/375 (nav, lista, detalle, editar+persistir, notas, nota vacía, 404 no vinculado, ficha staff) + `npm run lint` + `npx tsc --noEmit`.

## Criterios de aceptación

- [ ] El sidebar familiar tiene "Mis hijos" que navega a `/family/kids` y se resalta activo.
- [ ] La lista muestra exactamente los hijos vinculados al padre de sesión (2 hijos → 2 tarjetas; hijo de otra familia no aparece).
- [ ] Cada tarjeta muestra avatar, nombre, edad y pill de alergía, y navega a `/family/kids/<uuid>`.
- [ ] Un padre sin hijos ve el estado vacío, sin errores de consola.
- [ ] `/family/kids/<uuid>` muestra nombre, edad · sala, nacimiento, sala, ingreso + bloques CUIDADOS y ACLARACIONES con datos reales.
- [ ] La caja roja de alertas aparece solo si hay `medical_notes` o `allergy_tags`.
- [ ] Los campos administrativos se muestran como texto, sin input ni botón de edición para el padre.
- [ ] "Editar" abre el modal precargado (incluido el toggle de consentimiento).
- [ ] Guardar modifica `child_profile` y `children` (medical_notes, allergy_tags, photo_consent) y persiste al recargar.
- [ ] Guardar con todos los campos vacíos es válido (null) sin errores.
- [ ] El modal no contiene inputs de nombre, fecha de nacimiento ni sala.
- [ ] Agregar una aclaración la inserta con `author_id` del padre, aparece con su fecha y persiste.
- [ ] Aclaración vacía muestra inline `Escribí una aclaración.` sin llamar a la action.
- [ ] Editar y borrar (con confirmación) una aclaración propia funciona.
- [ ] `updateChildProfile` sobre un niño no vinculado devuelve `Este niño no es hijo tuyo.` y la DB queda intacta.
- [ ] `updateChildNote`/`deleteChildNote` sobre nota ajena devuelven `No podés modificar esta aclaración.` (RLS).
- [ ] La ficha staff muestra CUIDADOS y ACLARACIONES con los datos del padre, sin botones de edición.
- [ ] Sin sesión, `/family/kids/*` redirige a `/login` (guard SPEC 09 intacto).
- [ ] `npm run lint` y `npx tsc --noEmit` sin errores; Playwright 1440/768/375.

## Decisiones tomadas y descartadas

**Del usuario:**

1. **Lista + detalle** (`/family/kids` → `[id]`), espejo staff. Descartado: todo en `/family` y ruta única con selector.
2. **Campos nuevos + notas libres**: 5 campos en tabla `child_profile` + `child_notes` con varias entradas. Descartado: un solo campo de texto (borrar una aclaración obligaba a reescribir todo).
3. **El padre solo edita lo que aporta él**; datos administrativos = staff.
4. **Borrar = notas/campos individuales**; el niño nunca se elimina.
5. **Edición por modal**. Descartado: ruta `/editar` e inline por bloque.
6. **Tabla nueva `child_profile`** en lugar de columnas en `children` (RLS de escritura limpia).
7. **Solo el padre escribe notas**; staff solo lee.
8. **Reutilizar layout staff** + bloques nuevos (no la referencia HTML).
9. **Lista estilo `KidCard`.**
10. **Ficha staff ampliada en este spec** (solo lectura).
11. **`photo_consent` lo edita el padre.**
12. **Seguridad: lista blanca en la action + RLS de vínculo**, sin trigger.

**Técnicas:**

- `child_profile` 1:1 con **upsert** (la primera edición crea la fila).
- `is_parent_of_child()` `security definer` (patrón `is_staff()`).
- La action nunca envía columnas administrativas.
- Autoría por nota: solo el autor edita/borra la suya.
- Reutiliza `mapChildRow` (sin duplicar formato de fechas/edad).
- Filtrado por `parent_id` en la query, no en JS.
- Sin optimistic UI: action + `router.refresh()` + flag de pendiente (SPEC 16/17).
- Notas sin paginación y sin filtro de groserías (contenido privado del padre).
- `cacheComponents`: `connection()` + `<Suspense>` + skeleton en todas las rutas nuevas.
- Spec en la raíz de `specs/` (full-stack con migración, patrón SPEC 16).

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| RLS no distingue columnas: un padre podría PATCH directo a `children` vía PostgREST | La app nunca lo hace (lista blanca); decisión explícita del usuario de no usar trigger. Si se endurece, migración con `before update on children`. |
| Recursión RLS entre `child_profile` y `parent_children` | Helper `is_parent_of_child()` `security definer`. |
| Policies de update combinadas (staff OR padre) | Verificado en el paso 1 con `execute_sql` para ambos roles. |
| Padre ve datos de un niño no suyo | Doble filtro (query + `notFound()`) y criterio de aceptación con uuid no vinculado. |
| `cacheComponents: true` + `new Date()` | `connection()` antes de los fetches dentro de `<Suspense>` (fix de SPEC 10/11). |

## Lo que **no** está en esta spec

- Edición de datos administrativos por el padre.
- Escritura del staff en notas/perfil.
- Edición del niño para el staff (`/add-child` sin cambios).
- Resumen del día, panel de padres en vista familiar, fotos de perfil.
- Paginación de notas o lista de hijos.
- Notificaciones al staff.
- Filtro de groserías en aclaraciones.

Cada uno, si llega, va en su propia spec.
