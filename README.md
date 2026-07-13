# CodeToDocsAI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![GitHub stars](https://img.shields.io/github/stars/asaleem9/CodeToDocs?style=social)
![GitHub forks](https://img.shields.io/github/forks/asaleem9/CodeToDocs?style=social)
![GitHub last commit](https://img.shields.io/github/last-commit/asaleem9/CodeToDocs)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Google Cloud](https://img.shields.io/badge/Google%20Cloud-4285F4?logo=google-cloud&logoColor=white)](https://cloud.google.com/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?logo=express&logoColor=white)](https://expressjs.com/)

An intelligent documentation generator that transforms source code into comprehensive, production-ready documentation with visual diagrams and quality analysis.

## Live Demo

**Frontend:** https://codetodocs-frontend-ywspvwqcla-uc.a.run.app
**Backend API:** https://codetodocs-backend-ywspvwqcla-uc.a.run.app

## Features

- **Code & PR Documentation** - paste a code snippet or a GitHub PR URL and get Markdown docs, a diagram, and a quality score
- **Language Support** - JavaScript, TypeScript, Python, Java, Go, Rust, C++, C, C#, Ruby, PHP, Swift, Kotlin, and GraphQL; most languages go through the same generic LLM prompt, while GraphQL gets a dedicated parser that builds its own diagram and example queries
- **Visual Diagrams** - Mermaid flowcharts, class diagrams, and dependency graphs generated alongside the docs
- **Quality Scoring** - weighted 0-100 completeness score (overview, parameters, return values, examples, dependencies, notes)
- **Batch Processing** - document an entire repository via GitHub URL or ZIP upload, three files at a time
- **SSE Token Streaming** - single-file generation streams the documentation text back as Claude writes it, with progress polling as a fallback
- **GitHub Integration** - OAuth login and repo access; document a PR from a pasted PR URL; a webhook endpoint is also available for PR-merge events when `GITHUB_WEBHOOK_SECRET` is configured
- **Integrations** - send a generated doc to Notion, Confluence, or Slack, or export it as a README (GitHub Wiki sync is marked coming soon)
- **Per-User Model Settings** - each signed-in user picks which Claude model generates their docs
- **Shareable Doc Pages** - every doc gets a permanent URL; toggle it public or private, and public docs surface in a gallery tab on the History page
- **History** - search, filter by type, export, and regenerate past documents
- **Export Options** - download as Markdown, HTML, or PDF with matching styling
- **Mobile Support** - the app is usable end-to-end on a phone, not just desktop
- **Reliability** - the Claude SDK retries transient failures with backoff, failed generations surface a friendly retryable error, and oversized input is rejected before it reaches the LLM
- **Persistent Storage (optional)** - PostgreSQL via Drizzle, with encrypted OAuth tokens, when `DATABASE_URL` is set; runs in-memory only otherwise (which is how it's deployed today)

## Tech Stack

### Backend
- **Express.js** + **TypeScript** - REST API server
- **PostgreSQL** (optional) - Data persistence with Drizzle ORM when `DATABASE_URL` is set
- **Anthropic Claude API** - LLM-powered documentation generation, including SSE token streaming
- **GitHub OAuth** - User authentication and repository access

### Frontend
- **React 18** + **TypeScript** - Modern UI framework
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Mermaid** - Diagram rendering

### Infrastructure
- **Google Cloud Run** - Serverless container deployment
- **Cloud SQL** - Managed PostgreSQL (optional, only needed if persistence is enabled)
- **Secret Manager** - Secure credential storage
- **Docker** - Multi-stage production builds

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (optional - the app runs in-memory without it)
- Anthropic API key
- GitHub OAuth app (for login features)

### Installation

```bash
# Clone repository
git clone https://github.com/asaleem9/CodeToDocs.git
cd CodeToDocs

# Install dependencies
npm install

# Configure backend environment
cd backend
cp .env.example .env
# Edit .env with your credentials

# Start development servers
cd ..
npm run dev
```

The application will be available at `http://localhost:5173`

### Environment Variables

**Backend** (`backend/.env`):
```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
ANTHROPIC_API_KEY=your_api_key_here
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
SESSION_SECRET=your_random_session_secret

# Optional - omit both to run in-memory only (no persistence across restarts)
DATABASE_URL=postgresql://user:password@localhost:5432/codetodocs
DATABASE_ENCRYPTION_KEY=your_32_byte_encryption_key

# Optional
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
GITHUB_TOKEN=your_github_personal_access_token_here
```

## Architecture

```
┌─────────────────────┐
│   React Frontend    │
│   (Vite + TypeScript)│
└──────────┬──────────┘
           │ REST + SSE
┌──────────▼──────────┐
│   Express Backend   │
│   (TypeScript)      │
├─────────────────────┤
│ • LLM Service       │
│ • Storage Service   │
│ • Quality Scorer    │
│ • Batch Processor   │
└──────────┬──────────┘
           │
    ┌──────┴──────┬────────────────┐
    ▼             ▼                ▼
┌────────┐  ┌──────────────┐  ┌──────┐
│ Claude │  │ PostgreSQL   │  │GitHub│
│  API   │  │ (optional)   │  │ API  │
└────────┘  └──────────────┘  └──────┘
```

## API Endpoints

### Documentation
- `POST /api/generate` - Generate documentation for a code snippet (kicks off a background job)
- `GET /api/generate/progress/:jobId` - Poll a generation job's progress
- `GET /api/generate/result/:jobId` - Fetch a finished generation job's result
- `GET /api/generate/stream/:jobId` - SSE stream of a job's progress and doc text as it's generated
- `POST /api/generate/pr` - Generate documentation for a GitHub PR from its URL
- `GET /api/documentation` - List the caller's documentation (`?view=public` for the public gallery)
- `GET /api/documentation/:id` - Get a specific documentation entry (owner or public only)
- `PATCH /api/documentation/:id/visibility` - Toggle a document public/private (owner only)
- `DELETE /api/documentation/:id` - Delete a documentation entry

### Batch Processing
- `POST /api/batch/start` - Start batch processing for a GitHub repository
- `POST /api/batch/upload-zip` - Upload and process a ZIP file
- `GET /api/batch/progress/:batchId` - Get batch progress
- `GET /api/batch/result/:batchId` - Retrieve batch results
- `DELETE /api/batch/:batchId` - Delete a batch
- `POST /api/batch/generate-full-doc/:batchId` - Generate one combined repo-level document from a finished batch

### Settings
- `GET /api/settings/models` - List the Claude models available to choose from
- `GET /api/settings/model` - Get the caller's current model (default for anonymous users)
- `POST /api/settings/model` - Set the caller's model (requires auth)

### Integrations
- `POST /api/integrations/notion` - Send a doc to Notion
- `POST /api/integrations/confluence` - Send a doc to Confluence
- `POST /api/integrations/slack` - Send a doc to Slack
- `POST /api/integrations/readme` / `POST /api/integrations/readme/create` - Generate a README from a doc, or commit it straight to a repo's `README.md`
- `POST /api/integrations/github-wiki` - GitHub Wiki sync (coming soon - the endpoint responds honestly rather than pretending to succeed)
- `POST /api/integrations/check` - Check which integrations are configured

### GitHub & Auth
- `GET /api/auth/github` - Initiate GitHub OAuth flow
- `GET /api/auth/github/callback` - OAuth callback handler
- `POST /api/auth/anon` - Issue or refresh a signed anonymous identity token
- `GET /api/auth/user` - Get the current authenticated user
- `GET /api/auth/repositories` - List the caller's repositories
- `POST /api/auth/logout` - Log out
- `POST /api/webhook/github` - GitHub webhook endpoint for PR events (fails closed unless `GITHUB_WEBHOOK_SECRET` is configured)

### Health & Stats
- `GET /api/health` - Service health check
- `GET /api/stats` - Storage and usage statistics

## Deployment

### GitHub Actions (Google Cloud Run)

Pushes to `main` trigger path-scoped workflows that build and deploy automatically:
- `.github/workflows/deploy-backend.yml` - runs on changes under `backend/**`
- `.github/workflows/deploy-frontend.yml` - runs on changes under `frontend/**`

Each workflow builds a Docker image, pushes it to Container Registry, and runs `gcloud run deploy`. The backend deploys with `--max-instances 1` (single instance by design - job progress and session state live in-process, so requests always need to land on the instance that started them) and `--min-instances 0`. The frontend deploys with `--max-instances 2` / `--min-instances 0`.

The `deploy-tagged.sh` and `redeploy.sh` shell scripts in the repo root are legacy - they predate the GitHub Actions workflows and are no longer how the live services are deployed.

**Resources Created:**
- 2 Cloud Run services (frontend + backend)
- Cloud SQL PostgreSQL instance (optional, not currently provisioned in production)
- Secret Manager secrets
- Container Registry images

**Configuration:**
- Backend: 512Mi memory, `--max-instances 1`, `--min-instances 0`
- Frontend: 256Mi memory, `--max-instances 2`, `--min-instances 0`
- CPU throttling enabled for cost optimization

## Development

### Project Structure
```
├── backend/              # Express API server
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Business logic
│   │   ├── db/          # Database schema & migrations
│   │   └── utils/       # Helper functions
│   └── Dockerfile       # Production container
├── frontend/            # React application
│   ├── src/
│   │   ├── pages/       # Route components
│   │   ├── components/  # Reusable UI components
│   │   ├── contexts/    # State management
│   │   └── utils/       # Client-side utilities
│   └── Dockerfile       # Nginx production container
├── deploy-tagged.sh     # Legacy deployment script
├── redeploy.sh          # Legacy quick-redeployment script
└── setup-database.sh    # Cloud SQL setup
```

### Available Scripts

```bash
# Development
npm run dev              # Start both frontend and backend
npm run dev:backend      # Start backend only
npm run dev:frontend     # Start frontend only

# Production build
npm run build            # Build all workspaces
cd backend && npm run build
cd frontend && npm run build

# Database
cd backend
npm run db:generate      # Generate migrations
npm run db:push          # Apply migrations
npm run db:studio        # Open Drizzle Studio
```

## Key Features Implementation

### Quality Scoring System
Documentation quality is evaluated using a weighted algorithm:
- Overview/Description: 15 points
- Parameters/Inputs: 20 points
- Return Values/Outputs: 20 points
- Examples & Code Blocks: 25 points
- Dependencies: 10 points
- Notes/Best Practices: 10 points

### Batch Processing
- Concurrent file processing (3 files simultaneously)
- Smart file filtering (excludes `node_modules`, build artifacts)
- Progress tracking via HTTP polling
- Comprehensive repository overview generation

### GitHub PR & Webhook Integration
- Document a PR by pasting its URL on the PR page - the primary way to generate PR docs
- HMAC-SHA256 signature verification on the webhook endpoint, which fails closed in production if `GITHUB_WEBHOOK_SECRET` isn't set
- Smart token resolution (PR author → repo owner → deployment token)
- PR metadata tracking (number, branch, author, repository)

## Security

- OAuth tokens encrypted at rest when PostgreSQL persistence is enabled
- Webhook signature verification required (fails closed if unconfigured in production)
- Secrets stored in GCP Secret Manager
- CORS configured for frontend/backend communication
- Rate limiting on generation, batch, integration, and auth endpoints
- Signed bearer-token identity (not a client-supplied header) so cross-site requests still resolve to the right user
- Environment-based configuration (no hardcoded credentials)

## Performance

- Parallel AI requests for documentation and diagrams
- LRU cache eviction strategy for in-memory storage
- Optimized Docker builds with multi-stage compilation
- Database connection pooling when PostgreSQL persistence is enabled

## License

MIT License - See LICENSE file for details

## Contact

Ali Saleem - [GitHub](https://github.com/asaleem9)

Project Link: [https://github.com/asaleem9/CodeToDocs](https://github.com/asaleem9/CodeToDocs)
