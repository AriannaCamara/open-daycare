# SPEC 08 — Carpeta `supabase/migrations/` y regla de migraciones en AGENTS.md

> **Estado:** Aprobado
> **Depende de:** SPEC 07
> **Fecha:** 2026-10-18
> **Objetivo:** Crear la carpeta `supabase/migrations/` con la migración `create_daycares` exportada y documentar en AGENTS.md que todo cambio de base de datos pasa por un archivo `.sql` commiteado aplicado con `apply_migration`.

## Alcance

**Incluye:**

- Nueva carpeta `supabase/migrations/`.
- Archivo `supabase/migrations/20261018164749_create_daycares.sql` con el SQL exacto de la migración ya aplicada (`create_daycares`, versión `20261018164749` del historial de Supabase).
- Actualización de `AGENTS.md` (sección **Supabase**):
  - Ajustar la línea "no local `supabase/` CLI folder exists" (ya no será cierta).
  - Workflow explícito: cada manipulación de la BD genera un `.sql` en `supabase/migrations/` con formato `YYYYMMDDHHMMSS_nombre.sql`, se commitea, y se aplica con MCP `apply_migration` usando el mismo nombre.

**No incluye (fuera de esta spec):**

- Instalar el Supabase CLI ni `supabase init` (`config.toml`, `seed.sql`).
- Aplicar migraciones nuevas o tocar el esquema de la BD.
- Exportar otras migraciones (solo existe `create_daycares`).
- Cambios en `.gitignore` (los `.sql` se commitean).
- Cliente `@supabase/supabase-js` / integración con Next.js.

## Modelo de datos

No introduce datos nuevos. Estructura de archivos:

```
supabase/
  migrations/
    20261018164749_create_daycares.sql
```

Contenido = SQL de SPEC 07 (`create table public.daycares …`, RLS sin policies, seed `'Guardería Sala Soles'`).

## Plan de implementación

1. **Crear el archivo.** `supabase/migrations/20261018164749_create_daycares.sql` con el SQL exacto de SPEC 07. → carpeta existe e historial local completo.
2. **Verificar sin drift.** MCP `list_tables` + `execute_sql` contra el contenido del archivo (columnas, RLS, 1 fila seed). → archivo = BD.
3. **Actualizar AGENTS.md.** Sección Supabase: carpeta nueva + regla de migración obligatoria (archivo → commit → `apply_migration`). → regla visible.
4. **Revisión final.** `git status` muestra solo el `.sql` nuevo y `AGENTS.md`; nada del build afectado.

## Criterios de aceptación

- [ ] Existe `supabase/migrations/20261018164749_create_daycares.sql`.
- [ ] Su contenido coincide con la migración aplicada `create_daycares` (versión `20261018164749` del historial Supabase).
- [ ] `AGENTS.md` ya no afirma que "no local `supabase/` CLI folder exists".
- [ ] `AGENTS.md` exige un `.sql` en `supabase/migrations/` con formato `YYYYMMDDHHMMSS_nombre.sql` para todo cambio de BD.
- [ ] `AGENTS.md` exige commitear el `.sql` y aplicarlo con `apply_migration` (mismo nombre entre archivo y migración).
- [ ] No se instaló el Supabase CLI ni se creó `config.toml`.
- [ ] `.gitignore` no fue modificado.
- [ ] No se aplicó ninguna migración nueva a la BD.

## Decisiones tomadas y descartadas

- **Sí:** solo `supabase/migrations/`, sin CLI ni `config.toml` — decisión del usuario; el CLI no está instalado y el flujo es MCP.
- **Sí:** backfill de `create_daycares` como primer archivo — decisión del usuario; historial local completo. Timestamp `20261018164749` tomado del historial real de Supabase, no inventado.
- **Sí:** flujo archivo `.sql` → commit → `apply_migration` — decisión del usuario; el archivo es la fuente de verdad versionable.
- **Sí:** naming `YYYYMMDDHHMMSS_nombre.sql` — estándar del CLI; futuro-proof.
- **Sí:** regla con exigencia de commit en AGENTS.md — decisión del usuario.
- **No:** `supabase init`/CLI — SPEC 07 ya lo descartó; innecesario con MCP.
- **No:** duplicar la regla en "Conventions / gotchas" — la sección Supabase es el lugar natural; duplicar crea desfases.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Drift entre el `.sql` y la BD si alguien aplica cambios solo por MCP | AGENTS.md exige el archivo primero; paso 2 compara archivo vs estado real |
| Historial local desordenado en migraciones futuras | Nombre con el version timestamp de Supabase mantiene orden cronológico |

## Lo que **no** está en esta spec

- Supabase CLI o desarrollo local con `supabase start`.
- Migraciones nuevas o cambios de esquema.
- Cliente Supabase en la app Next.js.

Cada uno de esos, si llega, va en su propia spec.
