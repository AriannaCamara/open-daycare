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
- Never implement a spec unless its state means **Approved**; `/spec-impl` also never commits on its own and pauses after each step. Match these rules when working in that flow.

## Conventions / gotchas

- Do not hand-edit the `nextjs-agent-rules` block above — `next dev` manages it.
- All Playwright screenshots/artifacts go in `.playwright-mcp/` (gitignored).
- Default branch is `master`. Do not commit unless explicitly asked.

## Spec Driven Development - Skills
- /spec usaremos esta habilidad para crear las especificaciones.
- /spec-impl usaremos esta skill para hacer las implementaciones.