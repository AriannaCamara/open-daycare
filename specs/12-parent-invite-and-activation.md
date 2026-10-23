# SPEC 12 — Vinculación real de padres: invitación por email y activación de cuenta

> **Estado:** Implementado
> **Depende de:** SPEC 01 (`users` + trigger), SPEC 03 (UI `/activate-account`), SPEC 05 (modal vincular), SPEC 09 (auth + guard), SPEC 11 (perfil con panel de padres)
> **Fecha:** 2026-10-23
> **Objetivo:** Vincular un padre a un niño de forma real: el staff envía una invitación por email con Resend desde el modal y el padre se registra con el código para quedar guardado en `parent_children`.

## Alcance

**Incluye:**

- **Migración DB** (`supabase/migrations/`): enums `relationship_type` (`father`/`mother`/`guardian`) e `invitation_status` (`pending`/`accepted`/`expired`/`cancelled`); tablas `parent_children` e `invitations` (diccionario `07-DB-Schema`); RLS en ambas; índices (unique en `invitations.code`, unique en `parent_children(parent_id, child_id)`); funciones `SECURITY DEFINER`:
  - `get_invitation_by_code(p_code text)` → devuelve solo campos seguros (email, full_name, relationship, child full_name, room name, daycare_id, expires_at); solo `pending` y no vencida. `execute` a `anon` (la ruta de activación es pública).
  - `accept_parent_invitation(p_invitation_id uuid)` → marca `accepted`/`accepted_at` e inserta `parent_children`; solo el usuario autenticado dueño del email de la invitación.
- **Paquete `resend`** + Server Action `createParentInvitation` (`app/_actions/parent-invitation.ts`): valida sesión, genera código de 5 caracteres (A–Z/0–9, reintento en colisión), cancela invitaciones `pending` previas del mismo email+niño, inserta la invitación (`expires_at` = +7 días), envía el email con Resend.
- **Envío real con Resend:** `RESEND_API_KEY` en `.env.local` (variable obligatoria para el envío). Si falta la key o Resend rechaza el envío, se muestra un error y **no** se crea la invitación.
- **Email HTML** (español, texto simple): nombre del niño, código, link a `/activate-account?code=XXXXX`, "Vence en 7 días".
- **Modal `link-parent-modal.tsx`:** estado `submitting`, botón deshabilitado mientras envía, errores inline en español (mismo estilo SPEC 03), al éxito cierra y el panel muestra el padre como PENDIENTE persistente (no memoria).
- **`parents-panel.tsx`:** fetch real — padres de `parent_children → users` (estado activo) + invitaciones `pending` de ese niño. Se mantiene el diseño (ACTIVO/ACTIVA, PENDIENTE).
- **`/activate-account` real:** page server lee `searchParams.code` (con `await connection()` + `<Suspense>`, patrón SPEC 11), llama a `get_invitation_by_code`; código inválido/vencido → estado de error en pantalla. Formulario: card de invitación real, email solo lectura, contraseña ≥8, checkbox de fotos → `signUp` (browser client) con metadata `{ daycare_id, role: "parent", full_name }` → `rpc("accept_parent_invitation")` → `router.push("/")` + `refresh()`.
- **Errores de activación en español:** código inválido/vencido; email ya registrado → `Este email ya tiene una cuenta. Iniciá sesión.`; fallo de signUp → mensaje genérico.
- **Requisito manual (dashboard Supabase):** desactivar "Confirm email" en Auth → Providers → Email (el código de invitación ya verifica el email).
- Env var `RESEND_API_KEY` en `.env.local` (nunca `NEXT_PUBLIC_`).

**No incluye:**

- Verificar dominio en Resend ni `from` personalizado (se usa el default de la cuenta o `onboarding@resend.dev`).
- Vincular un email que ya tiene cuenta existente (solo error).
- Feed filtrado por rol (el padre aterriza en `/` igual que el staff).
- Reenviar o cancelar invitaciones desde la UI.
- `/forgot-password`, roles en sidebar, pantallas de la familia.
- Rate limiting del endpoint de invitación.

## Modelo de datos

```sql
create type public.relationship_type as enum ('father', 'mother', 'guardian');
create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'cancelled');

create table public.parent_children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  relationship public.relationship_type not null,
  created_at timestamptz not null default now(),
  unique (parent_id, child_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  invited_by uuid not null references public.users(id),
  full_name text not null,
  email text not null,
  relationship public.relationship_type not null,
  code text not null unique,
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
```

Mapeo UI → enum: Mamá→`mother`, Papá→`father`, Tutor/a→`guardian`. Expiración perezosa: se valida `expires_at > now()` al leer (sin cron).

RLS:

- `invitations`: `select`/`update` para `staff`/`admin` del mismo daycare; `insert` para `staff`/`admin` autenticado (el `daycare_id` se deriva en la action desde el niño).
- `parent_children`: `select` para el propio padre (`parent_id = auth.uid()`) y para staff del mismo daycare. El `insert`/`update` de `invitations` en la activación lo hace `accept_parent_invitation` (`SECURITY DEFINER`); no se expone insert directo al cliente.

## Plan de implementación

1. **Migración DB.** Escribir `supabase/migrations/<fecha>_create_parent_invitations.sql` con enums, tablas, índices, RLS y las dos funciones; commit del archivo y apply vía MCP con el mismo nombre. → Tablas existen con RLS; `get_invitation_by_code('NOPE')` devuelve null como `anon`.
2. **Resend + server action.** Instalar `resend`; crear `app/_actions/parent-invitation.ts` con `createParentInvitation` (codegen del server client, validación, código, cancelar previas, insert, envío real). → Con sesión y key válida crea la fila y envía el correo; sin key muestra error y no crea nada.
3. **Modal conectado.** `link-parent-modal.tsx` llama a la action con `submitting` e errores inline; `parents-panel.tsx` pasa a recibir padres+pendientes reales (fetch en la page server de `/kids/[id]`, refresh con `router.refresh()` tras invitar). → Enviar invitación desde el perfil persiste al recargar.
4. **Activación real.** `app/activate-account/page.tsx` + form: fetch de la invitación por `?code=`, estados inválido/vencido, `signUp` + `accept_parent_invitation` + redirect. → Flujo completo con el correo recibido.
5. **Verificación.** Playwright 1440/768/375 del flujo modal → activate → `/`; queries de verificación en DB (invitation accepted, `parent_children` creado, perfil `role='parent'`); `npm run lint` y `npx tsc --noEmit`.

## Criterios de aceptación

- [ ] La migración está commiteada y aplicada; `parent_children`/`invitations` existen con RLS habilitado.
- [ ] `/kids/[id]` muestra los padres reales de la DB (vacío al inicio) y las invitaciones `pending` como PENDIENTE; persiste al recargar.
- [ ] El modal valida igual que antes (nombre/email obligatorios, formato email) y el botón queda deshabilitado mientras envía.
- [ ] Con `RESEND_API_KEY` configurada, "Enviar invitación" crea una invitación `pending` con `expires_at` de 7 días y código único de 5 caracteres, y el correo llega al email ingresado con el código y el link.
- [ ] Si falta la key o Resend rechaza el envío, se muestra `No pudimos enviar el correo. Intentá de nuevo.` y no se crea ninguna invitación.
- [ ] Enviar otra invitación al mismo email+niño cancela la anterior `pending`.
- [ ] `/activate-account?code=<código válido>` muestra la card con el niño real y el email en solo lectura.
- [ ] Código inexistente o vencido muestra un mensaje claro en español y no permite activar.
- [ ] Activar con contraseña ≥8 y checkbox crea la cuenta (`auth.users` + `public.users` con `role='parent'`), inserta `parent_children`, marca la invitación `accepted` y navega a `/`.
- [ ] El email del padre aterriziza en `/` autenticado y la sesión persiste al recargar.
- [ ] Intentar activar con un email ya registrado muestra `Este email ya tiene una cuenta. Iniciá sesión.`
- [ ] "Confirm email" está desactivado en el dashboard de Supabase (checklist manual).
- [ ] `npm run lint` y `npx tsc --noEmit` sin errores.

## Decisiones tomadas y descartadas

- **Sí:** una sola spec end-to-end (decisión del usuario).
- **Sí:** Server Action en vez de Route Handler — recomendación aceptada; menos boilerplate con Supabase server client.
- **Sí:** envío real con Resend, sin fallback — el profe tiene API key; la key se agrega en `.env.local` al implementar.
- **Sí:** desactivar "Confirm email" — recomendación aceptada; evita doble correo.
- **Sí:** email ya registrado → error — recomendación aceptada; linking de existentes queda fuera.
- **Sí:** funciones `SECURITY DEFINER` para leer/aceptar invitación — `/activate-account` es ruta pública (SPEC 09) y RLS normal no dejaría leer ni aceptar sin sesión.
- **Sí:** `daycare_id` del signUp derivado de `invitations → children → rooms` — `children` no tiene `daycare_id` directo (verificado en DB).
- **Sí:** cancelar invitaciones pendientes previas del mismo email+niño — evita códigos múltiples válidos para el mismo padre.
- **Sí:** page server con `searchParams` + `connection()` + `<Suspense>` — patrón probado en SPEC 11 (`cacheComponents: true`).
- **Sí:** código de 5 caracteres A–Z/0–9 con reintento en colisión — igual al diseño `7K4P9`.
- **No:** fallback sin API key — descartado cuando el profe confirmó que tiene key.
- **No:** reenviar/cancelar invitación desde UI, feed por rol, `from` personalizado de Resend, rate limiting, vincular emails existentes.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| "Confirm email" sigue activo y SignUp pide confirmar de nuevo | Criterio de aceptación manual; mapear error `email_not_confirmed` por si acaso |
| API key inválida o ausente | Error controlado en el modal; verificar `RESEND_API_KEY` antes de probar el envío |
| Código adivinable (5 chars) | Unique + expiración 7 días; rate limiting queda fuera de alcance |
| RLS mal diseñada deja leer invitaciones a cualquiera | Lectura del padre solo vía función; verificar con `set local role authenticated/anon` en el plan |
| `cacheComponents: true` con `searchParams` | `connection()` + `<Suspense>` (mismo fix que SPEC 11) |

## Lo que **no** está en esta spec

- Dominio verificado / email saliente personalizado en Resend.
- Vinculación de padres con cuenta existente.
- Feed exclusivo de la familia o filtrado por rol.
- Reenvío/cancelación de invitaciones desde la UI.
- Recuperación de contraseña.

Cada uno, si llega, va en su propia spec.
