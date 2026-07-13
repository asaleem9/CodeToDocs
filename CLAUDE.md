# CodeToDocsAI — Project Guide

AI documentation generator: paste code or point at a GitHub repo/PR, get Markdown docs,
Mermaid diagrams, and a quality score. Express + TypeScript backend, React + Vite frontend,
deployed on Google Cloud Run. See `README.md` for the user-facing feature list; this file is
the map for working in the codebase.

## Layout

- `backend/` — Express API (`src/routes`, `src/services`, `src/middleware`, `src/utils`, `src/db`)
- `frontend/` — React 18 + Vite SPA (`src/pages`, `src/contexts`, `src/components` + `components/ui`
  primitives, `src/lib` shared modules, `src/utils`)
- `shared/` — types shared across both
- `.github/workflows/` — Cloud Run auto-deploy (`deploy-backend.yml`, `deploy-frontend.yml`)
- `videos/` — gitignored; HyperFrames video productions (the launch video lives in
  `videos/codetodocs-launch`, final render under its `renders/`)

This is an **npm workspaces** monorepo: the single `package-lock.json` lives at the repo root
(a `frontend/package-lock.json` should never exist). Installing from a workspace dir updates
the root lockfile — commit it.

## Commands

Backend (`cd backend`): `npm run dev` (nodemon + tsx), `npm run build` (tsc), `npm start`,
`npm run db:push` / `db:studio` (Drizzle). Typecheck: `npx tsc --noEmit`.
Frontend (`cd frontend`): `npm run dev` (Vite), `npm run build` (tsc + vite build). Typecheck: `npx tsc --noEmit`.

Run `npx tsc --noEmit` in the changed package before committing.

Local dev quirk: if another project holds port 5173, Vite moves to 5174 and the backend's CORS
check rejects the browser. Start the backend with `FRONTEND_URL=http://localhost:<vite-port>`
(the frontend's own `/api` calls use an absolute `localhost:3001` URL, not the Vite proxy).

## Auth & identity model — read before touching auth

Frontend and backend run on **separate `*.run.app` origins**, which are cross-site (Google puts
`*.run.app` on the Public Suffix List), so session cookies are blocked by Safari/Firefox. Identity
therefore comes from a **signed bearer token**, not a cookie and not a client-supplied id.

- `backend/src/utils/appToken.ts` — `signToken` / `verifyToken` (HMAC-SHA256 over the user profile,
  signed with `SESSION_SECRET`, 7-day expiry). The token is unforgeable without the server secret.
- `backend/src/middleware/auth.ts` is the single source of identity:
  - `getAuthUser(req)` — bearer token first, then `req.session.user`.
  - `getUserId(req)` — numeric GitHub id, or null.
  - `getStorageUserId(req)` — id used to scope documents; anonymous users get a stable **negative**
    per-session id (`session.anonId`) so their docs don't collide with others'.
  - `requireAuth` — gate for authenticated-only routes.
- OAuth callback (`routes/auth.ts`) issues the token in the **URL fragment** (`#token=...`), which the
  browser never sends to a server. `frontend/src/main.tsx` reads it into `localStorage.app_token`,
  strips the hash, and attaches `Authorization: Bearer <token>` to backend requests only.

**Invariants — do not regress:**
- Never trust a client-supplied identity (e.g. a `X-GitHub-User-ID` header). Use `getStorageUserId`.
- The GitHub OAuth access token stays server-side in `tokenStorage`; it is never sent to the client
  or placed in a URL. `/api/auth/repositories` looks it up by user id.
- Don't attach the bearer token to third-party calls (e.g. `api.github.com`) — those set
  `withCredentials: false` and no `Authorization`.
- Async status endpoints (`/api/batch/progress|result`, `/api/generate/progress|result`) are
  guarded by their **unguessable random id** as the capability. Owner scoping
  (`canAccessBatch` / `canAccessJob`) only *tightens* access for authenticated owners (positive
  id); anonymous owners (id `<= 0`, whose per-session id doesn't survive cross-site polling) match
  on the id alone. Do NOT require an identity match for anonymous owners — that reintroduces the
  404-on-every-poll bug that made batch/generation appear to hang.

## Security invariants elsewhere

- **Webhook** (`routes/webhook.ts`): verify the signature on the raw body *before* parsing; fail
  closed in production when `GITHUB_WEBHOOK_SECRET` is unset.
- **SSRF** (`utils/integrations.ts`): user-supplied outbound URLs go through `assertSafeExternalUrl`
  (https only, private/link-local blocked, Slack host allow-listed, redirects disabled).
- **Rate limiting** (`middleware/rateLimit.ts`): applied to the LLM endpoints (`/api/generate`, batch).
- **Zip uploads**: extracted via the zip-slip guard in `routes/batch.ts` (`safeExtractZip`).
- **Exports** (`frontend/src/utils/exportUtils.ts`): run `marked` output through DOMPurify and escape
  interpolated metadata before writing HTML/PDF.
- **Batch/job ids** are random (`crypto.randomBytes`) and owner-scoped; never make them guessable.
- Boot guard in `backend/src/index.ts`: refuses to start in production without `SESSION_SECRET` and
  `DATABASE_ENCRYPTION_KEY`. Don't log secret material.

## Storage

Hybrid in-memory + Postgres. Each service has an in-memory class and a `*Db` counterpart:
`storageService` / `storageServiceDb`, `tokenStorage` / `tokenStorageDb`, `settingsService`.
When `DATABASE_URL` is unset the app runs **in-memory only** (current production state), so documents
and OAuth tokens do not survive a restart. Schema + Drizzle config live in `backend/src/db`.

## Deploy (Cloud Run, project `codetodocs`)

Push to `main` triggers the workflows by path: `backend/**` → **Deploy Backend**, `frontend/**` →
**Deploy Frontend**. Both build a Docker image, push to GCR, and `gcloud run deploy`. The frontend is
nginx serving the built SPA with `VITE_API_URL` injected at runtime; the backend URL is the raw
`codetodocs-backend-…run.app`.

Backend secrets are injected via `--set-secrets` (which **replaces** the whole list — include every
secret the service needs): `ANTHROPIC_API_KEY`, `FRONTEND_URL`, `SESSION_SECRET`,
`DATABASE_ENCRYPTION_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`. Currently **not** set:
`GITHUB_WEBHOOK_SECRET` (so webhooks fail closed) and `DATABASE_URL` (so prod is in-memory).

Other config that must stay in sync: the GitHub OAuth app's callback URL
(`https://codetodocs-backend-…run.app/api/auth/github/callback`) and `FRONTEND_URL` (drives CORS —
keep it exactly matching the frontend origin; a trailing slash is tolerated but nothing else).

## Frontend design system — "refined terminal"

The UI is a phosphor-dark terminal; generated documentation renders as a light "paper"
sheet (the only light surface). Styling is **Tailwind v4** — no per-page CSS files, no
tailwind.config; every token lives in the `@theme` block in `frontend/src/index.css`
(ink/phosphor/signal/paper/print color scales, font stacks, keyframes) plus `@utility`
effects (glow, scanlines). Don't hardcode hex values in components; use the token classes.

- **Fonts** (self-hosted): Departure Mono (vendored woff2 in `src/assets/fonts`, single 400
  weight — never synthesize bold) for display/chrome via `font-display`; JetBrains Mono
  (`font-mono`) for code/controls; IBM Plex Sans (`font-sans`) for prose; Newsreader
  (`font-serif`) for rendered docs on paper only.
- **Primitives** in `src/components/ui/`: `Panel` (TUI frame + `[ TITLE ]` tab + corner
  brackets, `paper` variant), `Button`/`buttonClasses`, `Badge`, `ProgressBar`, `Spinner`,
  `EmptyState`, `SectionHeader`, `Menu`. Build new UI from these, not bespoke markup.
- **Paper surfaces**: rendered markdown always sits in `.markdown-content`
  (`src/styles/markdown.css`); mermaid + syntax themes that match it live in
  `src/lib/mermaid.ts` and `src/lib/syntaxTheme.ts` (use `renderMermaid`, never init mermaid
  per page). Language chip colors: `src/lib/languages.ts`.
- **Motion**: GSAP via helpers in `src/lib/motion.ts` (`bootSequence`, `typeOn`, `decode`,
  `countUp`, `revealBatch`) — all honor `prefers-reduced-motion`. Gotcha: GSAP leaves inline
  transforms that create stacking contexts and trap popovers; `bootSequence` clears them
  (`clearProps`) — do the same in new tweens on containers holding menus.
- Grid children that contain generated docs need `min-w-0` or wide code lines force
  horizontal overflow.
- Export templates (`src/utils/exportUtils.ts`) share the paper/ink look — keep them in
  sync with `styles/markdown.css` when the paper palette changes.
- **Mobile** is additive-only: every mobile rule is a `max-*`/`pointer-coarse:` variant layered
  on top of the existing desktop classes, never a change to a base or `lg:` class, so `lg+` stays
  pixel-identical. Use `dvh`, not `vh`, for any height applied on mobile — the address bar resizes
  `vh` out from under you. Two-pane pages (History, Batch) add a drill-in on top of their existing
  `lg`-collapse: selecting an item hides the list (`max-lg:hidden`) and shows the detail full-width
  with a `lg:hidden` back row; Batch can't key that off `selectedDoc === null` since `null` is a
  valid selection there (the full-repo doc), so it tracks an explicit `mobileDetailOpen` boolean
  instead. The `[ NAVIGATION ]` overlay (`AppLayout.tsx`'s `Header`, `md:hidden`) is the mobile nav
  pattern — full-screen `Panel`, closes on route change and Escape — and sits at `z-[60]`, above
  the `BatchProgressModal`/`Menu` dropdown tier (`z-50`).

## Frontend layout note

Pages that render a long generated document must **cap the panel's height** and let it scroll
internally, or the whole page stretches to fit the content. The pattern now lives in
`frontend/src/pages/History.tsx` as Tailwind utilities: a viewport-height container
(`lg:h-[calc(100dvh-24rem)]`), `min-h-0` on every flex/grid ancestor of the scroll area, and
`overflow-y-auto` on the scrollers themselves. Batch caps its detail panel with `max-h-[800px]`.

## Known limitations (current production)

These are environmental, not regressions — keep them in mind when debugging:

- **Single instance by design.** `activeBatches` / `activeJobs` and express-session's MemoryStore
  are per-instance, so the backend deploys with `--max-instances 1` to keep that state consistent
  (progress/result polling always hits the instance that started the job). Tradeoff: no horizontal
  scale-out; and a cold start (`--min-instances 0`) still drops in-memory state — in-flight jobs,
  sessions, and cached OAuth tokens. Moving job/session state to a shared store would lift the cap.
- **Batch GitHub auth.** `fetchRepositoryContents` uses the signed-in user's OAuth token (passed
  from `routes/batch.ts` → `processRepository`), giving 5000 req/hr + private-repo access, and falls
  back to `process.env.GITHUB_TOKEN` if set. Two gaps remain: anonymous batches still use the
  unauthenticated 60 req/hr limit (set a `GITHUB_TOKEN` deployment secret for a global fallback), and
  because OAuth tokens are in-memory, a returning user must re-auth after a cold start for their
  token to be available.
- **In-memory only** (`DATABASE_URL` unset): history and stored OAuth tokens don't survive a restart.
- **Anonymous persistence is cookie-based.** The document list (`/api/documentation`) scopes by the
  per-session `anonId` cookie, which Safari/Firefox drop cross-site, so anonymous history can appear
  empty there. Logged-in history works (bearer token).
