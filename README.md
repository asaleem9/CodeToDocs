# CodeToDocsAI

An intelligent documentation generator that transforms source code into comprehensive, production-ready documentation with visual diagrams and quality analysis.

## Live Demo

**Frontend:** https://codetodocs-frontend-ywspvwqcla-uc.a.run.app
**Backend API:** https://codetodocs-backend-ywspvwqcla-uc.a.run.app

## Features

- **Multi-Language Support** - JavaScript, TypeScript, Python, Java, Go, Rust, C++, GraphQL
- **Visual Diagrams** - Automatically generates flowcharts, class diagrams, and dependency graphs
- **Quality Scoring** - Analyzes documentation completeness with weighted scoring (0-100)
- **Batch Processing** - Document entire repositories via GitHub URL or ZIP upload
- **GitHub Integration** - OAuth authentication and webhook support for automated PR documentation
- **Export Options** - Download as Markdown, HTML, or PDF with professional styling
- **Real-time Progress** - Live tracking for batch operations with concurrent processing
- **Persistent Storage** - PostgreSQL database with encrypted OAuth token storage

## Tech Stack

### Backend
- **Express.js** + **TypeScript** - REST API server
- **PostgreSQL** - Data persistence with Drizzle ORM
- **Anthropic Claude API** - LLM-powered documentation generation
- **GitHub OAuth** - User authentication and repository access
- **Socket.io** - Real-time progress updates

### Frontend
- **React 18** + **TypeScript** - Modern UI framework
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Mermaid** - Diagram rendering
- **Monaco Editor** - Code input with syntax highlighting

### Infrastructure
- **Google Cloud Run** - Serverless container deployment
- **Cloud SQL** - Managed PostgreSQL
- **Secret Manager** - Secure credential storage
- **Docker** - Multi-stage production builds

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (optional for local development)
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
DATABASE_URL=postgresql://user:password@localhost:5432/codetodocs
DATABASE_ENCRYPTION_KEY=your_32_byte_encryption_key
```

## Architecture

```
┌─────────────────────┐
│   React Frontend    │
│   (Vite + TypeScript)│
└──────────┬──────────┘
           │ REST API + WebSocket
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
    ┌──────┴──────┬───────────┐
    ▼             ▼           ▼
┌────────┐  ┌──────────┐  ┌──────┐
│ Claude │  │PostgreSQL│  │GitHub│
│  API   │  │ Database │  │ API  │
└────────┘  └──────────┘  └──────┘
```

## API Endpoints

### Documentation
- `POST /api/generate` - Generate documentation for code snippet
- `GET /api/documentation` - Retrieve all user documentation
- `GET /api/documentation/:id` - Get specific documentation entry
- `DELETE /api/documentation/:id` - Delete documentation entry

### Batch Processing
- `POST /api/batch/start` - Start batch processing for GitHub repository
- `POST /api/batch/upload-zip` - Upload and process ZIP file
- `GET /api/batch/progress/:batchId` - Get real-time progress
- `GET /api/batch/result/:batchId` - Retrieve batch results

### GitHub Integration
- `GET /api/auth/github` - Initiate GitHub OAuth flow
- `GET /api/auth/github/callback` - OAuth callback handler
- `POST /api/webhook/github` - GitHub webhook endpoint for PR events

### Health & Stats
- `GET /api/health` - Service health check
- `GET /api/stats` - Storage and usage statistics

## Deployment

### Google Cloud Platform

The project includes automated deployment scripts:

```bash
# Initial deployment with secret setup
./deploy-tagged.sh

# Quick redeployment (uses existing secrets)
./redeploy.sh
```

**Resources Created:**
- 2 Cloud Run services (frontend + backend)
- Cloud SQL PostgreSQL instance (optional)
- Secret Manager secrets
- Container Registry images

**Configuration:**
- Auto-scaling: 0-3 instances (backend), 0-2 instances (frontend)
- Memory: 512Mi (backend), 256Mi (frontend)
- CPU throttling enabled for cost optimization

See deployment scripts for detailed configuration options.

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
├── deploy-tagged.sh     # Full deployment script
├── redeploy.sh          # Quick redeployment
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
- Progress tracking via WebSocket
- Comprehensive repository overview generation

### GitHub Webhook Integration
- HMAC-SHA256 signature verification
- Smart token resolution (PR author → repo owner → deployment token)
- Automatic documentation on PR merge events
- PR metadata tracking (number, branch, author, repository)

## Security

- OAuth tokens encrypted at rest in PostgreSQL
- Webhook signature verification required
- Secrets stored in GCP Secret Manager
- CORS configured for frontend/backend communication
- Session management with secure cookies
- Environment-based configuration (no hardcoded credentials)

## Performance

- Parallel AI requests for documentation and diagrams
- LRU cache eviction strategy for memory management
- Optimized Docker builds with multi-stage compilation
- Auto-scaling Cloud Run instances based on traffic
- Database connection pooling

## License

MIT License - See LICENSE file for details

## Contact

Ali Saleem - [GitHub](https://github.com/asaleem9)

Project Link: [https://github.com/asaleem9/CodeToDocs](https://github.com/asaleem9/CodeToDocs)
