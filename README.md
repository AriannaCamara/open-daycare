# open-daycare

App de guardería construida con **Next.js 16** (App Router) + **React 19**, TypeScript `strict`, Tailwind v4 y **Supabase** como backend (Auth, Base de datos, Storage).

## Requisitos previos

- **Node.js >= 20** (probado con Node 24) y **npm**
- Cuenta en [Supabase](https://supabase.com) con acceso a la organización del proyecto
- **Supabase CLI** (opcional, solo para migraciones/CLI local): `npm install -g supabase`
- [OpenCode](https://opencode.ai) para trabajar con el agente y el MCP de Supabase

## Levantar el proyecto

```bash
# 1. Instalar dependencias
npm install

# 2. Crear el archivo de entorno local
cp .env.local.example .env.local   # o crearlo a mano con las variables de abajo

# 3. Levantar el servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). La página se actualiza automáticamente al editar `app/page.tsx`.

### Variables de entorno

`.env.local` (gitignored):

| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (`https://<project_ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (antes `anon`) del proyecto |
| `RESEND_API_KEY` | API key de Resend para envío de emails |

`.env` (gitignored, **nunca commitear**):

| Variable | Descripción |
| --- | --- |
| `SUPABASE_DB_PASSWORD` | Password de la base de datos, requerida por comandos de la CLI que conectan a Postgres |

> Cualquier variable `NEXT_PUBLIC_` es **pública** en el navegador: nunca pongas ahí claves `service_role` ni secretos.

### Comandos útiles

```bash
npm run dev        # servidor de desarrollo (Turbopack)
npm run build      # build de producción
npm start          # servir el build de producción
npm run lint       # ESLint
npx tsc --noEmit   # typecheck
```

No hay test runner configurado; la verificación de UI se hace con Playwright MCP.

## Supabase: MCP y autenticación del equipo

El proyecto se conecta a Supabase de dos formas: desde la app (con las claves públicas de arriba) y desde el agente vía el **MCP de Supabase**.

### 1. MCP de Supabase (OpenCode)

El MCP remoto está configurado en la config **global** de OpenCode (`~/.config/opencode/opencode.json`), no en el `opencode.json` del repo. Cada integrante del equipo debe tenerlo en su propia config:

```json
{
  "mcp": {
    "supabase": {
      "type": "remote",
      "url": "https://mcp.supabase.com/mcp?project_ref=mkiubklmyoxxojdyxnbx&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching",
      "enabled": true
    }
  }
}
```

**Autenticación (una vez por persona):** el servidor hospedado usa OAuth en el navegador, no necesita token manual:

```bash
opencode mcp auth supabase    # abre el navegador para iniciar sesión en Supabase
opencode mcp list             # verificar que el servidor esté autenticado
```

- Cada integrante inicia sesión con **su propia cuenta** de Supabase.
- En el flujo hay que elegir la **organización que contiene el proyecto** `mkiubklmyoxxojdyxnbx`.
- Los permisos dentro de la DB son los que cada persona tiene en Supabase (rol en la organización/proyecto): dar a cada quien el rol mínimo necesario.
- Si el primer uso falla por 401, OpenCode también puede lanzar el flujo automáticamente; `opencode mcp auth supabase` lo fuerza.

### 2. Supabase CLI (login del equipo)

La CLI se usa para migraciones, `link`, deploy de funciones, etc. Cada integrante se autentica con su propia cuenta:

```bash
npm install -g supabase

supabase login
# abre el navegador; el token se guarda en el almacenamiento de credenciales
# del sistema (o en ~/.supabase/access-token como respaldo)
```

Alternativas (recomendadas para CI o para tokens con permisos acotados):

```bash
# Token con scope creado en https://supabase.com/dashboard/account/tokens
supabase login --token sbp_xxx...

# O mediante variable de entorno (tiene prioridad sobre el token guardado)
export SUPABASE_ACCESS_TOKEN="sbp_xxx..."
```

Luego, vincular el CLI al proyecto y verificar:

```bash
supabase link --project-ref mkiubklmyoxxojdyxnbx
supabase whoami
```

> Los comandos que conectan a Postgres (`supabase db push`, `db pull`, …) necesitan además `SUPABASE_DB_PASSWORD`.
>
> El token del CLI **también** autentica el MCP local (`npx -y @supabase/mcp-server-supabase`), que lee `SUPABASE_ACCESS_TOKEN` o el token guardado por `supabase login`. El flujo principal de este repo, sin embargo, es el MCP remoto con OAuth (sección anterior).

### Reglas de seguridad

- Nunca commitear `.env`, `.env.local` ni tokens (`sbp_...`).
- Si un token se expone: revocarlo en [access tokens](https://supabase.com/dashboard/account/tokens) y reportarlo.
- Toda tabla nueva expuesta al Data API lleva **RLS habilitado** antes de dar acceso a `anon`/`authenticated`.

## Base de datos (migraciones)

Todo cambio de schema vive en un archivo SQL versionado:

1. Escribir la migración en `supabase/migrations/YYYYMMDDHHMMSS_nombre.sql`.
2. Commitear el archivo (es la fuente de verdad).
3. Aplicarla con el MCP de Supabase o la CLI (`supabase db push`).
4. Verificar con queries de prueba y revisar los advisors de seguridad.

Schema de referencia (aún no implementado por completo): `../07-DB-Schema/opendaycare-database-schema.md`.

## Estructura

```
app/                  # pantallas (App Router)
references/pantallas/  # prototipos .dc.html — fuente de verdad del diseño
references/screenshots/# capturas de esas pantallas
supabase/migrations/  # migraciones SQL
specs/                # especificaciones spec-driven (specs/NN-slug.md)
.agents/skills/       # skills del agente (spec, spec-impl, supabase, …)
utils/supabase/       # helpers del cliente Supabase (server/client/middleware)
```

Flujo de trabajo: `/spec` para crear especificaciones → aprobación → `/spec-impl` para implementar → `/spec-verify` para verificar criterios de aceptación.

## Recursos

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Supabase MCP](https://supabase.com/docs/guides/ai-tools/mcp)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
