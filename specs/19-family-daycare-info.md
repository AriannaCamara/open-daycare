# SPEC 19 — Pantalla "Guardería" en el panel familiar (contacto + equipo)

> **Estado:** Implemented
> **Depende de:** SPEC 09 (protección de rutas `/family/*`), SPEC 17 (policy `users_select_same_daycare_members`), SPEC 18 (patrón de pantalla familiar y bloques)
> **Fecha:** 2026-11-12
> **Objetivo:** Una pantalla en el panel familiar donde el padre ve los datos de contacto de la guardería (teléfono, WhatsApp y email en un toque) y la lista del equipo que trabaja ahí.

## Alcance

**Incluye:**

- Nuevo item **"Guardería"** en el sidebar familiar (`navItemsByPanel.family` en `app/_components/sidebar.tsx`), junto a "Feed" y "Mis hijos", con un ícono nuevo de edificio.
- Ruta `/family/daycare` (solo rol `parent`, ya cubierta por el guard de SPEC 09).
- Bloque **CONTACTO** con nombre de la guardería, teléfono, dirección, horario y email, cada campo en fila label/valor (vacío = "—", patrón del bloque CUIDADOS de SPEC 18).
- Tres botones de acción en CONTACTO, visibles solo si el dato existe: **Llamar** (`tel:`), **WhatsApp** (`https://wa.me/<solo dígitos>`) y **Escribir** (`mailto:`).
- Bloque **EQUIPO** con las personas `staff`/`admin` activas de la misma guardería: avatar (foto o inicial), nombre completo y rol ("Staff"/"Admin" vía `roleLabel`), orden alfabético por nombre.
- Migración que agrega a `daycares` las columnas `phone`, `email`, `address`, `hours`, la policy que permite leer esa fila y el seed con datos de prueba.
- Data layer `app/_data/daycare.ts` (view model + `fetchDaycareInfo`).

**No incluye (fuera de esta spec):**

- Edición de los datos de contacto por admin/staff (hoy se carga con seed).
- Mensajería o chat dentro de la app entre padre y staff.
- Sala por integrante del equipo (no existe vínculo staff↔sala en el schema).
- Teléfono o email personal de cada persona del staff.
- La misma pantalla en el panel staff.
- Link a Google Maps para la dirección (es texto plano).
- Subida de fotos de perfil para el equipo.
- Horarios por sala, avisos o notificaciones.

## Modelo de datos

### DB (migración `supabase/migrations/<ts>_daycare_contact_info.sql`)

```sql
alter table public.daycares
  add column phone text,
  add column email text,
  add column address text,
  add column hours text;

create policy daycares_select_member on public.daycares
  for select to authenticated
  using (id = auth_daycare_id());

update public.daycares
set phone = '+54 11 5555-0192',
    email = 'hola@opendaycare.com',
    address = 'Av. Libertador 2450, Buenos Aires',
    hours = 'Lunes a viernes, 7:30 a 18:00'
where id = 'cdcdb6de-3826-4056-ad9d-2f0c88cb8a34';
```

- `daycares` ya tiene RLS habilitado pero **cero policies**: sin esta policy nadie puede leer la fila desde la app (hoy nadie la lee). `id = auth_daycare_id()` reutiliza el helper `security definer` ya existente, sin recursión RLS.
- **Grants:** `select` en `daycares` ya está concedido a `authenticated`. Sin cambios.
- **Sin trigger `updated_at`:** la tabla no tiene `updated_at` y esta spec no agrega edición.
- Seed con datos de prueba sobre la única guardería existente (`Guardería Sala Soles`).
- El equipo no agrega datos nuevos: sale de `users` con la policy `users_select_same_daycare_members` de SPEC 17 (ya permite a un parent leer `full_name`/`role`/`avatar_url` de los miembros de su guardería). `users` no tiene columnas de contacto personal, así que no se expone nada más.

### View model (`app/_data/daycare.ts`)

```ts
export interface DaycareContact {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  hours: string | null;
}

export interface TeamMember {
  id: string;
  fullName: string;
  role: SessionRole;      // "staff" | "admin"
  initial: string;
  avatarUrl: string | null;
}

export interface DaycareInfo {
  contact: DaycareContact;
  team: TeamMember[];
}
```

### Query (`fetchDaycareInfo(supabase, parentId)`)

1. `users` → `daycare_id` con `.eq("id", parentId)` (policy `users_select_own`). Sin `daycare_id` → devuelve `null` y la pantalla muestra el estado vacío.
2. En `Promise.all`:
   - `daycares` → `name, phone, email, address, hours` con `.eq("id", daycareId).maybeSingle()`;
   - `users` → `id, full_name, role, avatar_url` con `.eq("daycare_id", daycareId).in("role", ["staff", "admin"]).eq("status", "active").order("full_name")`.
3. Si `maybeSingle()` devuelve `null` (no debería: `daycare_id` es FK obligatoria), todos los campos de contacto se muestran como "—" y el bloque usa el nombre "Guardería".

### Componentes

- `app/_components/daycare-info.tsx`: bloques CONTACTO y EQUIPO. Reutiliza `BlockCard` de `app/_components/child-profile-blocks.tsx` (se **exporta**, sin duplicar estilos); las filas de contacto son propias porque cada valor puede llevar botón.
- Fila de contacto: label a la izquierda, valor a la derecha y los botones `Llamar`, `WhatsApp` y `Escribir` (estilo botón secundario del proyecto).
- Fila de equipo: círculo con `avatar_url` si existe, si no la inicial sobre `bg-[#F2937A]` (mismo estilo que el chip de usuario de la sidebar), nombre y `roleLabel(role)`.
- **WhatsApp:** el `href` es `https://wa.me/` + `phone.replace(/\D/g, "")` (un `+54 11 5555-0192` queda como `541155550192`).

### Sidebar (`app/_components/sidebar.tsx`)

```ts
family: [
  { href: "/family", label: "Feed", icon: <HomeIcon /> },
  { href: "/family/kids", label: "Mis hijos", icon: <UsersIcon /> },
  { href: "/family/daycare", label: "Guardería", icon: <BuildingIcon /> },
],
```

`navItemsByPanel.staff` queda intacto: el staff no ve el item.

## Plan de implementación

1. **Migración** con las 4 columnas, la policy `daycares_select_member` y el seed → archivo en `supabase/migrations/`, aplicada con MCP `apply_migration` (mismo nombre) y probada con `execute_sql`: como `authenticated` con el uid de un parent, `select` sobre `daycares` devuelve 1 fila; `update` devuelve 0 filas (solo `select` en la policy). → DB lista y legible.
2. **Data layer** `app/_data/daycare.ts` (tipos + `fetchDaycareInfo`) → `npx tsc --noEmit` pasa.
3. **Componente** `app/_components/daycare-info.tsx` exportando `BlockCard` desde `child-profile-blocks.tsx`: bloque CONTACTO con 5 filas + 3 botones condicionales y bloque EQUIPO con avatar/nombre/rol + estado vacío → renderiza sin errores con datos de prueba.
4. **Página** `app/family/daycare/page.tsx` (server, `connection()` + `<Suspense>` + skeleton, patrón de `app/family/kids/page.tsx`): `h1` "Guardería" + `DaycareInfo`; si `fetchDaycareInfo` devuelve `null`, estado vacío "No pudimos cargar la información de la guardería." → ruta accesible en `/family/daycare`.
5. **Nav familiar**: `BuildingIcon` + item "Guardería" en `sidebar.tsx` → el item aparece, navega y se resalta activo; el staff no lo ve.
6. **Verificación**: Playwright en 1440/768/375 (nav, contacto completo, campo vacío = "—", los 3 links con su `href`, equipo ordenado sin padres ni otros daycare, estado vacío, login sin sesión) + `npm run lint` + `npx tsc --noEmit`.

## Criterios de aceptación

- [ ] `/family/daycare` abre con sesión de parent y muestra el `h1` "Guardería".
- [ ] El bloque CONTACTO muestra Nombre, Teléfono, Dirección, Horario y Email con los valores de la tabla `daycares`.
- [ ] Cuyo campo sea `null` se muestra como "—" y no rompe el layout.
- [ ] El botón "Llamar" tiene `href="tel:+541155550192"` (espacios y guiones normalizados) y solo aparece si `phone` no es null.
- [ ] El botón "WhatsApp" tiene `href="https://wa.me/541155550192"` (solo dígitos) y solo aparece si `phone` no es null.
- [ ] El botón "Escribir" tiene `href="mailto:hola@opendaycare.com"` y solo aparece si `email` no es null.
- [ ] El bloque EQUIPO lista exactamente los usuarios `staff`/`admin` con `status='active'` de la guardería del padre, ordenados por nombre, con avatar/inicial y rol "Staff"/"Admin".
- [ ] Ningún `parent` aparece en EQUIPO, ni usuarios de otra guardería (verificado con un segundo usuario).
- [ ] Un padre sin equipo ve el estado vacío del bloque, sin errores de consola.
- [ ] El sidebar familiar tiene "Guardería" que navega a `/family/daycare` y se resalta activo; el sidebar staff no lo muestra.
- [ ] Un `update` sobre `daycares` desde un parent devuelve 0 filas (la policy es solo `select`).
- [ ] Sin sesión, `/family/daycare` redirige a `/login` (guard SPEC 09 intacto).
- [ ] `npm run lint` y `npx tsc --noEmit` sin errores; verificación Playwright en 1440/768/375.

## Decisiones tomadas y descartadas

**Del usuario:**

1. **Contacto + equipo** en una sola pantalla. Descartado: solo contacto, solo equipo, o contacto + equipo + datos de la sala.
2. **Enlaces nativos** (`tel:`, `wa.me`, `mailto:`) para contactar. Descartado: mensajería dentro de la app (tablas, RLS, realtime → spec aparte); y mostrar los datos sin botones.
3. **Migración + seed, sin edición por UI**: la carga de datos queda para otra spec. Descartado: pantalla de edición (suma action, RLS de escritura y modal) y constantes en el código (hay que redeployar para cambiar un teléfono).
4. **Ruta `/family/daycare`, solo panel familiar**. Descartado: `/family/contacto` y la versión visible también para el staff.
5. **Sin contacto personal del staff**: solo nombre, rol y avatar. Descartado: teléfono/email propio de cada integrante (datos personales y columnas nuevas en `users`).
6. **Sin sala por integrante**: la base no tiene vínculo staff↔sala. Descartado: crear `staff_rooms` en esta spec (suma tabla, RLS y edición) y deducir la sala de los posts (frágil: quien nunca publicó queda sin sala).

**Técnicas:**

- **Policy de `daycares` por `auth_daycare_id()`** (`security definer`, ya existe): cubre parent y staff con una sola policy. Descartado subquery sobre `users` (posible recursión RLS).
- **Sin `updated_at` ni trigger en `daycares`**: no hay escritura en esta spec.
- **Reutiliza `BlockCard`** exportándolo desde `child-profile-blocks.tsx` (DRY) en vez de copiar el estilo; `Row` no se reutiliza porque la fila de contacto lleva botones.
- **Avatar propio** (foto o inicial `bg-[#F2937A]`) en lugar del componente `Avatar`, que depende de `AvatarTone` pensado para filas de niños/padres.
- **Filtro por rol en la query** (`role in ('staff','admin')`, `status='active'`), no en JS.
- **`connection()` + `<Suspense>` + skeleton** en la ruta nueva (`cacheComponents: true`).
- **Sin actions ni optimistic UI**: pantalla de solo lectura, como el resto del panel familiar.
- **Sin paginación del equipo**: el tráfico es bajo, igual que el feed y la lista de hijos.
- **Seed con datos de prueba** modificables después desde la consola de Supabase hasta que exista la pantalla de edición.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `daycares` tiene RLS sin ninguna policy: si la nueva está mal, la pantalla sale vacía | Verificación en el paso 1 con `execute_sql` como parent (1 fila) y con `update` (0 filas) |
| `users_select_same_daycare_members` deja leer todos los miembros de la guardería, incluidos otros padres | La query filtra `role in ('staff','admin')`; `users` no tiene email, teléfono ni credenciales |
| Datos de contacto inventados en el seed | Marcado como dato de prueba; la edición real va en otra spec |
| Padre sin `daycare_id` (dato faltante) | `fetchDaycareInfo` devuelve `null` y la pantalla muestra un estado vacío propio |
| `cacheComponents: true` | `connection()` dentro del `<Suspense>`, patrón ya usado en SPEC 11/18 |

## Lo que **no** está en esta spec

- Edición de contacto por admin/staff (necesita action + RLS de escritura).
- Chat/mensajería padre ↔ staff.
- Sala por integrante del equipo (`staff_rooms`).
- Contacto personal (teléfono/email) de cada persona del staff.
- Pantalla equivalente en el panel staff.
- Link a Google Maps, mapa interactivo o geolocalización.
- Subida de fotos de perfil.
- Horarios por sala, avisos y notificaciones.
- Actualización de `openspec/specs/panel-navigation/spec.md` (fuera del flujo `/spec`; ya estaba desactualizado desde SPEC 18).

Cada uno de esos, si llega, va en su propia spec.
