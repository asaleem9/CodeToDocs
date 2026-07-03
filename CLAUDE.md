# CodeToDocsAI — Project Guide

AI documentation generator: paste code or point at a GitHub repo/PR, get Markdown docs,
Mermaid diagrams, and a quality score. Express + TypeScript backend, React + Vite frontend,
deployed on Google Cloud Run. See `README.md` for the user-facing feature list; this file is
the map for working in the codebase.

## Layout

- `backend/` — Express API (`src/routes`, `src/services`, `src/middleware`, `src/utils`, `src/db`)
- `frontend/` — React 18 + Vite SPA (`src/pages`, `src/contexts`, `src/components`, `src/utils`)
- `shared/` — types shared across both
- `.github/workflows/` — Cloud Run auto-deploy (`deploy-backend.yml`, `deploy-frontend.yml`)

## Commands

Backend (`cd backend`): `npm run dev` (nodemon + tsx), `npm run build` (tsc), `npm start`,
`npm run db:push` / `db:studio` (Drizzle). Typecheck: `npx tsc --noEmit`.
Frontend (`cd frontend`): `npm run dev` (Vite), `npm run build` (tsc + vite build). Typecheck: `npx tsc --noEmit`.

Run `npx tsc --noEmit` in the changed package before committing.

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

## Frontend layout note

Pages that render a long generated document must **cap the panel's height** and let it scroll
internally, or the whole page stretches to fit the content. The pattern: give the content
container a viewport-based height (`height: calc(100vh - Xrem)`) and set `min-height: 0` on every
flex/grid ancestor of the scroll area so `overflow-y: auto` actually engages. History (`History.css`)
was the fixed reference; Batch caps its detail panel with `max-height`.

## Known limitations (current production)

These are environmental / not-yet-addressed, not regressions — keep them in mind when debugging:

- **Single-instance assumptions.** `activeBatches` / `activeJobs` and express-session's MemoryStore
  live in one instance's memory, but the service runs `--max-instances 3`. A request routed to a
  different instance than the one that started the job will 404. Fix: `--max-instances 1`, or move
  job/session state to a shared store.
- **No `GITHUB_TOKEN`.** Batch repo fetching (`batchProcessor.fetchRepositoryContents`) uses the
  unauthenticated GitHub API (60 req/hr) and does not fall back to the caller's OAuth token, so
  large or private repos rate-limit. Fix: wire a `GITHUB_TOKEN` secret and/or pass the user's token.
- **In-memory only** (`DATABASE_URL` unset): history and stored OAuth tokens don't survive a restart.
- **Anonymous persistence is cookie-based.** The document list (`/api/documentation`) scopes by the
  per-session `anonId` cookie, which Safari/Firefox drop cross-site, so anonymous history can appear
  empty there. Logged-in history works (bearer token).
