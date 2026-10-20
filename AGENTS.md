<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project

"open-daycare": a daycare (guardería) app. Currently only the `create-next-app` starter exists — feature work is building screens from design references.

## Stack

- Next.js **16.4** (App Router) + React **19.3**, TypeScript `strict`, Tailwind v4, ESLint 9 flat config.
- The Next.js 16 docs under `node_modules/next/dist/docs/` are version-matched; read them before writing framework code. Key divergences from older training data:
  - Turbopack is default for `next dev`/`next build`; do **not** add `--turbopack`. `turbopack` is a top-level `next.config.ts` key.
  - `params`, `searchParams`, `cookies()`, `headers()`, `draftMode()` are async — `await` them.
  - `middleware` → `proxy` (edge runtime unsupported in `proxy`).
  - `next lint` is removed; run ESLint directly.
  - `next dev` writes to `.next/dev`; dev and build can run concurrently.
- `next.config.ts` enables `cacheComponents: true` (replaces old PPR / `experimental.dynamicIO`). This is not rename-only: uncached data outside `<Suspense>` fails the build. It also sets `partialPrefetching` and `experimental.agentFeedback`.
- Tailwind v4: no `tailwind.config`; theme lives in `app/globals.css` (`@import "tailwindcss"` + `@theme inline`). CSS is processed by `@tailwindcss/turbopack` via the rule in `next.config.ts`.
- Path alias `@/*` maps to repo root (`./*`), not `src/`.
- Generated global types `PageProps<'/route'>`, `LayoutProps<'/'>`, `RouteContext` come from `next typegen` (see `app/layout.tsx`). Regenerate with `npx next typegen` if they error.

## Supabase

- Backend: **Supabase**, project `mkiubklmyoxxojdyxnbx` (URL `https://mkiubklmyoxxojdyxnbx.supabase.co`), connected via the **Supabase MCP** server. Use MCP tools (`list_tables`, `execute_sql`, `apply_migration`, logs, advisors…) instead of raw CLI when possible.
- Current state: `public` schema has `daycares` only. Local `supabase/` exists with `supabase/migrations/` (migration files only — no Supabase CLI, no `config.toml`).
- **Client libraries (instalados):** toda interacción con la base de datos desde la app usa los paquetes oficiales de Supabase para Next.js — `@supabase/supabase-js` + `@supabase/ssr`. Nunca usar `fetch` directo a la REST API ni drivers de Postgres desde el frontend.
  - Helpers en `utils/supabase/`: `server.ts` (`createClient()` — Server Components, Server Actions, Route Handlers; hace `await` porque lee `cookies()`), `client.ts` (`createClient()` — Client Components, singleton en navegador), `middleware.ts` (`updateSession(request)`).
  - `proxy.ts` (raíz) refresca la sesión en cada request con `supabase.auth.getClaims()` y propaga las cookies (convención `middleware` → `proxy` en Next 16).
  - Env vars en `.env.local` (gitignored): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Cualquier `NEXT_PUBLIC_` es público en el navegador — nunca exponer `service_role`/secret keys.
  - Docs de referencia: skill `.agents/skills/supabase` y `https://supabase.com/docs/guides/auth/server-side/nextjs` (patrón `getClaims()`, no `getSession()` para autorizar en el servidor).
- `.env` holds `SUPABASE_DB_PASSWORD` — never commit or print secrets.
- DB schema reference (not implemented yet): `../07-DB-Schema/opendaycare-database-schema.md` (mounted as the `docs` reference in `opencode.json`).
- Workflow: design schema from the reference doc → write the SQL in `supabase/migrations/YYYYMMDDHHMMSS_name.sql` → **commit the migration file** → apply via MCP `apply_migration` (same name as the file) → verify with test queries → enable **RLS on every exposed table** before granting `anon`/`authenticated` access.
- **Migration rule (mandatory):** every database change (DDL, policies, functions, seeds) goes through a `.sql` file in `supabase/migrations/` named `YYYYMMDDHHMMSS_name.sql` (mirror Supabase's version format). The file is the source of truth: write it first, commit it, then apply it with `apply_migration`. Never manipulate the database without a committed migration file in the repo.

## Commands

- `npm run dev` — dev server on :3000.
- `npm run build` / `npm start` — production build / serve.
- `npm run lint` — `eslint` (flat config; no file args needed).
- `npx tsc --noEmit` — typecheck (no dedicated script; `tsconfig` already sets `noEmit`).
- No test runner is configured. Verify UI changes with the Playwright MCP.

## Design references (source of truth for UI)

- `references/pantallas/*.dc.html` — standalone HTML prototypes of every screen (login, feed, ninos, perfil-nino, resumen-dia, etc.). These define layout, copy and visual style to port into `app/`.
- `references/screenshots/*.png` — rendered captures of those screens.
- `.dc.html` files use a custom `support.js` React runtime and load fonts (Fredoka/Nunito) from Google Fonts; they are references, not part of the build.

## Spec workflow

- Repo ships spec-driven skills at `.agents/skills/spec` (`/spec`) and `.agents/skills/spec-impl` (`/spec-impl`).
- Specs live in `specs/NN-slug.md`. The folder does not exist yet — `/spec` creates it and seeds `specs/.spec-config.yml`.
- **Specs de base de datos:** cualquier spec relacionada con la base de datos (schema, migraciones, RLS, funciones, seeds, etc.) se crea en `specs/database/` en lugar de la raíz de `specs/` (ej. `specs/database/NN-slug.md`). Si `/spec` la creó en la raíz, moverla a `specs/database/`.
- Never implement a spec unless its state means **Approved**; `/spec-impl` also never commits on its own and pauses after each step. Match these rules when working in that flow.
- Verification agent: `.opencode/agents/spec-verify.md` (subagent `spec-verify`, model `opencode/gpt-5.4`). It checks/fixes the acceptance criteria of an Approved spec: Playwright for screens, Context7 for Next.js APIs, `npm run lint` + `npx tsc --noEmit` for tooling. It only toggles `- [ ]`/`- [x]`, never commits or creates branches.

## Conventions / gotchas

- Do not hand-edit the `nextjs-agent-rules` block above — `next dev` manages it.
- All Playwright screenshots/artifacts go in `.playwright-mcp/` (gitignored).
- Default branch is `master`. Do not commit unless explicitly asked.

## Spec Driven Development - Skills

- /spec usaremos esta habilidad para crear las especificaciones.
- /spec-impl usaremos esta skill para hacer las implementaciones.
- /spec-verify (`.opencode/command/spec-verify.md`) invoca al subagente `spec-verify` para verificar/corregir criterios de aceptación de un spec aprobado.

## Supabase Skills (instaladas)

- `.agents/skills/supabase` (fuente: `supabase/agent-skills`) — cargarla con el skill tool en **cualquier** tarea Supabase: schema/migraciones, Auth, RLS, Edge Functions, Realtime, Storage, `@supabase/ssr` en Next.js, debugging con logs/advisors. Verifica cambios contra el changelog y docs actuales; no confíes en datos de entrenamiento.
- `.agents/skills/supabase-postgres-best-practices` (fuente: `supabase/agent-skills`) — cargarla **antes** de escribir o modificar algo en Postgres: tablas/columnas, migraciones, RLS policies + sus tests, índices, funciones, pg_cron/pgmq, rendimiento (EXPLAIN, conexiones, bloat).
- Reglas clave de la skill supabase: habilitar RLS en toda tabla expuesta al Data API; nunca usar `user_metadata` para autorización; verificar cada fix con una query de prueba.

## Reglas de codigo

- Usar codigo limpio, nombres, funciones, variables, etc. en ingles.