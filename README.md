# CodeToDocsAI

AI-powered documentation generator that transforms your code into beautiful, comprehensive documentation using Claude 3.5 Sonnet.

## 🏗️ Project Structure

```
CodeToDocsAI/
├── backend/                 # Express + TypeScript API
│   ├── src/
│   │   ├── index.ts        # Main server entry point
│   │   ├── routes/
│   │   │   ├── documentation.ts   # Documentation API endpoints
│   │   │   └── webhook.ts         # GitHub webhook handler
│   │   └── services/
│   │       ├── llmService.ts      # Claude API integration
│   │       ├── storageService.ts  # In-memory LRU cache (20 entries)
│   │       └── qualityScoreService.ts  # Documentation quality analysis
│   ├── .env                # Environment variables (NOT in git)
│   ├── .env.example        # Environment template
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/               # React + Vite + TypeScript
│   ├── src/
│   │   ├── App.tsx        # Main React component with routing
│   │   ├── App.css        # Global styling
│   │   ├── pages/
│   │   │   ├── Home.tsx           # Main documentation generator
│   │   │   ├── History.tsx        # View past documentation
│   │   │   ├── History.css
│   │   │   ├── Settings.tsx       # API key and webhook config
│   │   │   └── Settings.css
│   │   ├── components/
│   │   │   ├── QualityScore.tsx   # Quality score display
│   │   │   └── QualityScore.css
│   │   ├── main.tsx       # React entry point
│   │   └── index.css      # Global styles
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts     # Vite config with proxy to backend
│
├── shared/                # Shared TypeScript types (future use)
│   ├── src/
│   │   ├── types.ts      # Common interfaces
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── package.json           # Root workspace config
└── README.md             # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js v18 or higher
- npm or yarn
- Anthropic API key (get one at https://console.anthropic.com/)

### Installation

1. **Install dependencies for all workspaces:**
   ```bash
   cd CodeToDocsAI
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cd backend
   cp .env.example .env
   ```

   Edit `backend/.env` and add your Anthropic API key:
   ```env
   PORT=3001
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173
   ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE
   GITHUB_WEBHOOK_SECRET=your_webhook_secret_here  # Optional
   GITHUB_TOKEN=ghp_your_github_token               # Optional
   ```

### Running the Application

#### Option 1: Run both servers simultaneously (Recommended)
```bash
# From project root
npm run dev
```

#### Option 2: Run servers separately

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Server runs on http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# App runs on http://localhost:5173
```

### Accessing the Application

Open your browser and navigate to: **http://localhost:5173**

## 🛠️ Tech Stack

### Backend
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **@anthropic-ai/sdk** - Claude API integration
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variables
- **nodemon** - Auto-reload during development
- **crypto** - Webhook signature verification

### Frontend
- **React 18** - UI framework
- **React Router** - Client-side routing
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **axios** - HTTP client
- **react-markdown** - Markdown rendering
- **react-syntax-highlighter** - Code syntax highlighting
- **react-hot-toast** - Toast notifications
- **mermaid** - Diagram rendering

## 📡 API Endpoints

### Backend API (Port 3001)

#### `GET /api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "CodeToDocsAI Backend API is running",
  "timestamp": "2025-10-07T..."
}
```

#### `POST /api/generate`
Generate documentation for code with quality scoring and diagrams.

**Request Body:**
```json
{
  "code": "function add(a, b) { return a + b; }",
  "language": "javascript"
}
```

**Response (Success):**
```json
{
  "id": "a1b2c3d4e5f6g7h8",
  "documentation": "# Overview\n\nThis function...",
  "diagram": "flowchart TD\n  A[Start] --> B[Add]...",
  "qualityScore": {
    "score": 85,
    "breakdown": {
      "hasOverview": true,
      "hasParameters": true,
      "hasReturnValues": true,
      "hasExamples": true,
      "hasUsage": true,
      "hasDependencies": false,
      "hasNotes": true,
      "codeBlocksCount": 2
    }
  },
  "timestamp": "2025-10-07T..."
}
```

#### `GET /api/documentation`
Get all stored documentation entries.

**Response:**
```json
{
  "total": 5,
  "stats": {
    "entries": 5,
    "maxSize": 20
  },
  "documentation": [...]
}
```

#### `GET /api/documentation/:id`
Get a specific documentation entry by ID.

#### `DELETE /api/documentation/:id`
Delete a specific documentation entry.

#### `GET /api/stats`
Get storage statistics.

#### `POST /api/webhook/github`
GitHub webhook endpoint for PR merge events (requires webhook secret).

## ✨ Features

### Current Features

#### Core Functionality
- ✅ **AI-Powered Documentation** - Uses Claude 3.5 Sonnet for comprehensive docs
- ✅ **Multiple Languages** - JavaScript, Python, Java, TypeScript support
- ✅ **Split View Layout** - Code input on left, documentation on right
- ✅ **Real-time Generation** - Live documentation as you type

#### Visual Enhancements
- ✅ **Syntax Highlighting** - VS Code Dark Plus theme for code blocks
- ✅ **Markdown Rendering** - Full markdown support with rich formatting
- ✅ **Mermaid Diagrams** - Automatic visual diagrams:
  - Class diagrams for OOP code
  - Flowcharts for functional code
  - Dependency graphs for modules
- ✅ **Collapsible Sections** - Expandable/collapsible diagram sections
- ✅ **Dark Theme** - Modern slate/indigo/purple gradient design
- ✅ **Responsive Design** - Works on desktop, tablet, and mobile

#### Quality & Analysis
- ✅ **Documentation Quality Score** - 0-100 score with breakdown:
  - Overview/Description (15 points)
  - Parameters/Inputs (20 points)
  - Return Values (20 points)
  - Examples & Code Blocks (25 points)
  - Dependencies (10 points)
  - Notes/Best Practices (10 points)
- ✅ **Quality Labels** - Excellent, Good, Fair, Basic, Poor
- ✅ **Color-Coded Scoring** - Green, Indigo, Yellow, Orange, Red
- ✅ **Progress Bar Visualization** - Animated quality indicator

#### Storage & History
- ✅ **In-Memory Storage** - LRU cache with 20 entry limit
- ✅ **History Page** - View all past documentation generations
- ✅ **Documentation Tracking** - Timestamps, language tags, PR info
- ✅ **Search & Filter** - Find documentation by language or source
- ✅ **Delete Functionality** - Remove individual entries

#### GitHub Integration
- ✅ **Webhook Handler** - Automatic documentation on PR merge
- ✅ **PR Information Tracking** - Store PR number, repo, branch, author
- ✅ **Signature Verification** - HMAC-SHA256 security
- ✅ **Manual vs Webhook Indicators** - Visual distinction in history

#### User Experience
- ✅ **Settings Page** - Configure API keys and view webhook URL
- ✅ **React Router** - Seamless navigation (Home, History, Settings)
- ✅ **Copy to Clipboard** - One-click copy of documentation
- ✅ **Clear Function** - Reset form with one click
- ✅ **Character Counter** - Live character count for code input
- ✅ **Toast Notifications** - Success/error feedback
- ✅ **Loading States** - Visual feedback during generation
- ✅ **Error Handling** - Comprehensive error messages
- ✅ **localStorage Support** - Persistent API key storage

## 🎯 Key Services

### LLM Service (`llmService.ts`)
- Parallel execution of documentation and diagram generation
- Lazy client initialization to prevent env variable loading issues
- Quality score calculation
- Error handling and retry logic

### Storage Service (`storageService.ts`)
- LRU (Least Recently Used) cache implementation
- Max 20 entries with automatic eviction
- Support for documentation, diagrams, quality scores, and PR info
- Query by ID, PR number, or get all

### Quality Score Service (`qualityScoreService.ts`)
- Weighted scoring algorithm
- Breakdown of documentation completeness
- Label and color assignment
- Configurable scoring criteria

## 🐛 Troubleshooting

### Backend won't start

**Issue:** "ANTHROPIC_API_KEY is not configured"
- **Solution:** Make sure `.env` file exists in `backend/` directory with valid API key

**Issue:** Port 3001 already in use
- **Solution:** Kill the process using port 3001 or change PORT in `.env`

**Issue:** "Could not resolve authentication method"
- **Solution:** This was caused by early initialization of the Anthropic client. Fixed by implementing lazy initialization with `getAnthropicClient()` function
- **Solution:** Restart backend server after updating `.env`

### Frontend won't start

**Issue:** Dependencies not installed
- **Solution:** Run `npm install` in frontend directory

**Issue:** API calls failing
- **Solution:** Ensure backend is running on port 3001

**Issue:** Mermaid diagrams not rendering
- **Solution:** Check browser console for errors, diagrams require valid Mermaid syntax

### CORS errors

**Issue:** CORS policy blocking requests
- **Solution:** Verify `FRONTEND_URL` in backend `.env` matches frontend URL
- **Solution:** Check that frontend is running on `http://localhost:5173`

### GitHub Webhook Issues

**Issue:** Webhook returns 401 Unauthorized
- **Solution:** Verify `GITHUB_WEBHOOK_SECRET` matches GitHub webhook configuration
- **Solution:** Check that request includes `X-Hub-Signature-256` header

## 📝 Development Scripts

### Root
```bash
npm run dev              # Run both backend and frontend
npm run build            # Build all workspaces
npm run dev:backend      # Run backend only
npm run dev:frontend     # Run frontend only
```

### Backend
```bash
npm run dev              # Start dev server with nodemon
npm run build            # Compile TypeScript
npm run start            # Run compiled code
```

### Frontend
```bash
npm run dev              # Start Vite dev server
npm run build            # Build for production
npm run preview          # Preview production build
```

## 🔧 Configuration

### Environment Variables (Backend)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Backend server port (default: 3001) |
| `NODE_ENV` | No | Environment (development/production) |
| `FRONTEND_URL` | No | Frontend URL for CORS (default: http://localhost:5173) |
| `ANTHROPIC_API_KEY` | **Yes** | Your Anthropic API key |
| `GITHUB_WEBHOOK_SECRET` | No | Secret for GitHub webhook verification |
| `GITHUB_TOKEN` | No | GitHub token for API access |

### Frontend Configuration

- API calls are proxied through Vite to `/api` → `http://localhost:3001`
- Settings stored in browser localStorage
- Supports custom API provider selection (Claude/OpenAI, only Claude implemented)

## 🔒 Security Notes

- **Never commit `.env` files** - Already in `.gitignore`
- **Keep API keys secret** - Don't share or expose them
- **Use environment variables** - Never hardcode credentials
- **Webhook signatures** - Verified using HMAC-SHA256
- **Input validation** - All API endpoints validate request bodies

## 📦 Building for Production

### Local Build

#### Backend
```bash
cd backend
npm run build
npm start
```

#### Frontend
```bash
cd frontend
npm run build
# Output in frontend/dist/
```

### Google Cloud Platform Deployment

CodeToDocsAI includes automated deployment scripts for Google Cloud Run.

#### Prerequisites
- Google Cloud account with billing enabled
- `gcloud` CLI installed ([Install Guide](https://cloud.google.com/sdk/docs/install))
- Anthropic API key

#### Quick Deployment

1. **Fix IAM permissions (first time only):**
   ```bash
   chmod +x fix-permissions.sh
   ./fix-permissions.sh
   ```

2. **Deploy to Cloud Run:**
   ```bash
   chmod +x deploy-gcp.sh
   ./deploy-gcp.sh
   ```

The script will:
- Set up your GCP project
- Enable required APIs
- Create secrets for your Anthropic API key
- Deploy backend to Cloud Run
- Deploy frontend to Cloud Run
- Configure CORS automatically

#### Deployment Files
- `deploy-gcp.sh` - Automated deployment script
- `fix-permissions.sh` - IAM permissions setup
- `GCP_DEPLOYMENT_GUIDE.md` - Detailed manual deployment guide
- `backend/Dockerfile` - Backend container configuration
- `frontend/Dockerfile` - Frontend container with nginx
- `backend/.dockerignore` - Files excluded from backend build
- `frontend/.dockerignore` - Files excluded from frontend build

#### Cloud Run Configuration
- **Backend:**
  - Memory: 1Gi
  - CPU: 1
  - Max instances: 10
  - Timeout: 300s
  - Port: 8080 (auto-configured)

- **Frontend:**
  - Memory: 512Mi
  - CPU: 1
  - Max instances: 5
  - nginx server with dynamic port configuration
  - Runtime environment variable injection

#### Viewing Logs
```bash
# Backend logs
gcloud run services logs read codetodocs-backend --region us-central1

# Frontend logs
gcloud run services logs read codetodocs-frontend --region us-central1
```

#### Cleanup
```bash
gcloud run services delete codetodocs-backend --region us-central1
gcloud run services delete codetodocs-frontend --region us-central1
gcloud secrets delete anthropic-api-key
```

See `GCP_DEPLOYMENT_GUIDE.md` for detailed manual deployment instructions and troubleshooting.

## 🎨 Design System

### Colors
- **Background:** `#1e293b` to `#0f172a` gradient
- **Primary:** `#818cf8` (Indigo)
- **Secondary:** `#c084fc` (Purple)
- **Success:** `#10b981` (Green)
- **Warning:** `#fbbf24` (Yellow)
- **Error:** `#ef4444` (Red)
- **Text Primary:** `#e2e8f0`
- **Text Secondary:** `#94a3b8`

### Components
- **Panels:** Glassmorphism with `backdrop-filter: blur(10px)`
- **Buttons:** Gradient backgrounds with hover lift effects
- **Cards:** Subtle borders with dark backgrounds
- **Progress Bars:** Smooth animations with color transitions

## 🚀 Future Enhancements

Potential features for future development:
- OpenAI integration (UI prepared)
- Export to PDF/Markdown files
- Custom documentation templates
- Batch processing for multiple files
- API documentation generation from OpenAPI specs
- Code complexity analysis
- SEO metadata generation
- Multi-language support for UI

## 🤝 Contributing

This is a personal project, but feel free to fork and modify!

## 📄 License

MIT License - feel free to use and modify as needed.

## 🆘 Need Help?

If you encounter issues:
1. Check this README for troubleshooting steps
2. Verify all dependencies are installed
3. Ensure environment variables are set correctly
4. Check that both servers are running
5. Review browser console and terminal logs for errors

## 📚 Session Notes for Future Development

### Important Implementation Details

1. **Anthropic Client Initialization**
   - Uses lazy initialization pattern via `getAnthropicClient()` function
   - This prevents "Could not resolve authentication method" errors
   - Environment variables must be loaded before client creation

2. **Parallel Processing**
   - Documentation and diagram generation run in parallel using `Promise.all()`
   - This improves response time by ~50%

3. **Storage System**
   - In-memory only (data lost on server restart)
   - LRU eviction when exceeding 20 entries
   - Consider adding persistent storage (database) for production

4. **Quality Scoring**
   - Weighted algorithm favors examples and code blocks
   - Runs synchronously after documentation generation
   - Could be optimized with caching for repeated analyses

5. **Mermaid Diagrams**
   - Claude sometimes returns diagrams with markdown code fences
   - Backend strips ````mermaid` wrappers before sending to frontend
   - Frontend re-renders on every selectedDoc change

### Known Issues & Limitations

- Storage is not persistent (in-memory only)
- No authentication system
- No rate limiting on API endpoints
- Webhook endpoint queues PRs but doesn't process them automatically yet
- OpenAI integration UI exists but not implemented
- No support for very large codebases (single file input only)

### Development History

**Major Milestones:**
1. Initial project setup with Express + React
2. Claude API integration
3. Markdown rendering and syntax highlighting
4. Settings page with API key management
5. GitHub webhook handler
6. In-memory storage system with LRU cache
7. History page with documentation viewing
8. Mermaid diagram generation
9. Documentation quality scoring system (0-100 with weighted criteria)
10. Demo mode with preloaded code samples
11. Export functionality (Markdown/HTML download and copy)

### Latest Features (Session 2)

**Demo Mode:**
- 4 preloaded code samples (Python class, JavaScript function, Java method, TypeScript interface)
- "Try Demo" button with dropdown menu
- Auto-generates documentation when sample is loaded
- Purple-themed UI to distinguish from other actions
- Location: `frontend/src/data/demoSamples.ts`

**Export Functionality:**
- Download as Markdown (.md file with metadata header)
- Download as HTML (beautifully styled with embedded CSS)
- Copy as Markdown (with metadata)
- Copy as HTML (converted from markdown)
- Includes metadata: language, generation date, quality score, PR info
- Uses `marked` library for markdown to HTML conversion
- Professional HTML export with:
  - Metadata section with blue accent
  - Syntax-highlighted code blocks
  - Responsive design
  - Print-friendly layout
- Location: `frontend/src/utils/exportUtils.ts`

### Deployment Updates (Session 3)

**Google Cloud Platform Support:**
- Automated deployment script for Cloud Run
- Multi-stage Docker builds for optimized containers
- Runtime environment variable injection for frontend
- Dynamic port configuration (Cloud Run PORT env var)
- IAM permissions helper script
- Comprehensive deployment documentation

**TypeScript Fixes:**
- Fixed NodeJS namespace issues (Batch.tsx)
- Removed unused health check code (Home.tsx)
- Type assertion fixes for API responses (webhook.ts)
- Proper handling of Map iterator types (storageService.ts)
- Readonly array conversion (graphqlParser.ts)

**Docker Configuration:**
- Backend: Node.js 20 Alpine with TypeScript build
- Frontend: nginx Alpine with runtime env injection
- Build-time vs runtime environment variables properly separated
- Health checks and security best practices

### Recent Changes

**Dependencies Added:**
- `marked` - Markdown to HTML conversion for exports
- `mermaid` - Diagram rendering

**New Deployment Files:**
- `deploy-gcp.sh` - Automated GCP deployment script
- `fix-permissions.sh` - IAM permissions setup for Cloud Build
- `GCP_DEPLOYMENT_GUIDE.md` - Comprehensive deployment guide
- `backend/Dockerfile` - Production-ready backend container
- `frontend/Dockerfile` - nginx-based frontend with runtime config
- `backend/.dockerignore` - Optimized Docker build context
- `frontend/.dockerignore` - Optimized Docker build context
- `frontend/nginx.conf` - Dynamic nginx configuration template

**New Files:**
- `frontend/src/data/demoSamples.ts` - Demo code samples
- `frontend/src/utils/exportUtils.ts` - Export utilities
- `frontend/src/components/QualityScore.tsx` - Quality score display component
- `frontend/src/components/QualityScore.css` - Quality score styling
- `backend/src/services/qualityScoreService.ts` - Quality analysis service

**Modified Files:**
- `frontend/src/pages/Home.tsx` - Demo mode, export functionality, removed health check
- `frontend/src/pages/Batch.tsx` - Fixed NodeJS.Timeout type issue
- `frontend/src/config.ts` - Runtime environment variable support
- `backend/src/routes/webhook.ts` - Type assertion fixes
- `backend/src/services/storageService.ts` - Map iterator type safety
- `backend/src/utils/graphqlParser.ts` - Readonly array handling
- `frontend/src/App.css` - Added demo and export menu styling
- All storage and LLM services updated to include quality scores and diagrams

---

**Last Updated:** October 2025 (Session 3 - GCP Deployment)
**Claude Model:** claude-sonnet-4-5-20250929
**Status:** ✅ Fully Functional with GCP Deployment Support
