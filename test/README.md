# CodeToDocsAI Test & Demo Suite

## Overview

This directory contains comprehensive test and demo scripts for CodeToDocsAI, perfect for hackathon demonstrations and feature verification.

## What's Included

### 📝 Files

- **`demo.js`** - Main demo script that tests all features
- **`sampleCode.js`** - Sample code snippets in 4 languages
- **`package.json`** - Dependencies for test scripts
- **`README.md`** - This file

### ✨ Features Tested

1. **API Health Check** - Verifies backend is running
2. **Documentation Generation** - Tests AI-powered doc generation
3. **Quality Scoring** - Validates quality score calculation
4. **Diagram Generation** - Confirms Mermaid diagram creation
5. **Storage & Retrieval** - Tests in-memory LRU cache
6. **GitHub Webhook Simulation** - Simulates PR merge events
7. **Multi-Language Support** - Tests all 4 supported languages

## Quick Start

### 1. Install Dependencies

```bash
cd test
npm install
```

### 2. Start the Backend Server

In a separate terminal:

```bash
cd backend
npm run dev
```

Make sure you have your `ANTHROPIC_API_KEY` configured in `backend/.env`

### 3. Run the Demo

```bash
# Quick demo (JavaScript only)
npm run demo

# Full demo (all 4 languages)
npm run demo:all
```

## Demo Script Output

The demo script provides colorful, formatted output showing:

```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║           CodeToDocsAI - Hackathon Demo Script           ║
║                                                           ║
║   AI-Powered Documentation Generator using Claude 3.5    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

============================================================
🏥 Health Check
============================================================

✓ API Status: ok
ℹ Message: CodeToDocsAI Backend API is running

============================================================
📝 Testing Documentation Generation: Shopping Cart Class
============================================================

ℹ Language: javascript
ℹ Code length: 1234 characters
✓ Generated in 3521ms

Quality Score: 92/100

Breakdown:
  ✓ Overview
  ✓ Parameters
  ✓ Return Values
  ✓ Examples
  ✓ Usage Guide
  ✗ Dependencies
  ✓ Notes/Best Practices
  Code blocks: 3

Documentation Preview:
# Shopping Cart Class

## Overview

The `ShoppingCart` class provides a comprehensive solution...

✓ Visual diagram generated
ℹ Diagram size: 45 lines

============================================================
💾 Storage & Retrieval Test
============================================================

✓ Retrieved 1 documentation entries

Storage Stats:
  Entries: 1/20
  Storage type: In-memory LRU cache

Recent Entries:

  1. Language: javascript
     Generated: 10/8/2025, 2:30:45 PM
     Quality: 92/100

============================================================
🔔 GitHub Webhook Simulation
============================================================

ℹ Simulating GitHub PR merge webhook...
ℹ PR #42: Add user authentication feature
ℹ Author: developer123
ℹ Branch: feature/user-auth
ℹ Repository: company/awesome-app
✓ Webhook received and processed
ℹ Status: PR queued

============================================================
📊 Demo Summary
============================================================

Feature Status:

  Health Check:           ✓ Passed
  Documentation Gen:      ✓ Passed
  Storage & Retrieval:    ✓ Passed
  Webhook Integration:    ✓ Passed

Overall: 4/4 tests passed

🎉 All tests passed! CodeToDocsAI is ready for the hackathon! 🎉
```

## Sample Code Snippets

The test suite includes production-ready code samples:

### JavaScript - Shopping Cart Class
- Full e-commerce shopping cart implementation
- Discount management
- Item quantity tracking
- Price calculation logic

### Python - Binary Search Tree
- Complete BST implementation
- Insert, search, traversal methods
- Height calculation
- Recursive algorithms

### TypeScript - API Client with Retry Logic
- Robust HTTP client
- Exponential backoff retry mechanism
- Timeout handling
- Type-safe interfaces

### Java - User Authentication Service
- User registration and login
- Password hashing (SHA-256)
- Session management
- Account lockout protection

## Webhook Simulation

The script simulates a realistic GitHub webhook payload:

```javascript
{
  action: "closed",
  number: 42,
  pull_request: {
    merged: true,
    number: 42,
    title: "Add user authentication feature",
    user: { login: "developer123" },
    head: { ref: "feature/user-auth" },
    base: {
      repo: {
        name: "awesome-app",
        full_name: "company/awesome-app"
      }
    }
  }
}
```

## Command Line Options

### Quick Demo (Default)
Tests core features with JavaScript sample only.

```bash
npm run demo
```

**Duration:** ~15 seconds
**Tests:** 4 core features

### Full Demo
Tests all features including all 4 programming languages.

```bash
npm run demo:all
```

**Duration:** ~45 seconds
**Tests:** 5 features + multi-language support

## Hackathon Demo Tips

### 1. Pre-Demo Setup (5 minutes before)

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev

# Terminal 3: Run test script
cd test
npm install
npm run demo
```

### 2. Live Demo Flow (5-7 minutes)

1. **Show Landing Page** (30 seconds)
   - Open http://localhost:5173
   - Highlight features, benefits, webhook setup

2. **Generate Documentation** (2 minutes)
   - Click "Get Started"
   - Paste a code snippet (or use demo samples)
   - Show real-time generation
   - Highlight quality score
   - Show visual diagram

3. **Run Demo Script** (2 minutes)
   - Execute `npm run demo`
   - Show colorful output
   - Explain each test
   - Point out quality scores and timing

4. **Show History** (1 minute)
   - Navigate to History page
   - Show all generated docs
   - Filter by language
   - Show PR information

5. **Webhook Integration** (1 minute)
   - Go to Settings
   - Show webhook URL
   - Explain GitHub integration
   - Reference the simulation in demo script

6. **Export Features** (30 seconds)
   - Export as Markdown
   - Export as HTML
   - Show formatted output

### 3. Practice Talking Points

**Opening:**
> "CodeToDocsAI is an AI-powered documentation generator that uses Claude 3.5 Sonnet to create comprehensive, high-quality documentation for your codebase in seconds."

**Key Features:**
> "It generates not just basic docs, but includes code examples, usage guides, visual diagrams, and even quality scores. Plus, it integrates with GitHub webhooks to auto-document your PRs."

**Demo Script:**
> "I've created a comprehensive test script that demonstrates all features. Let's run it and see CodeToDocsAI in action..."

**Quality Score:**
> "Notice the quality score of 92/100. This is calculated based on completeness: does it have an overview? Parameters? Examples? Best practices? The AI consistently produces high-quality documentation."

**Team Benefits:**
> "For development teams, this means 10x faster documentation, consistent quality, always up-to-date docs, and 50% faster onboarding for new team members."

## Troubleshooting

### Error: "API health check failed"
**Solution:** Make sure the backend server is running on port 3001
```bash
cd backend
npm run dev
```

### Error: "ANTHROPIC_API_KEY is not configured"
**Solution:** Add your API key to `backend/.env`
```bash
cd backend
echo "ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE" >> .env
```

### Error: "axios" module not found
**Solution:** Install dependencies in test directory
```bash
cd test
npm install
```

### Webhook signature verification failed
**Note:** This is expected in demo mode. The webhook will still be queued, but signature verification requires `GITHUB_WEBHOOK_SECRET` in `.env`

## Customization

### Add Your Own Sample Code

Edit `sampleCode.js` and add a new sample:

```javascript
export const samples = {
  // ... existing samples

  myLanguage: {
    name: "My Cool Feature",
    language: "javascript",
    code: `// Your code here`
  }
};
```

### Modify Test Scenarios

Edit `demo.js` to change:
- Test order
- Timing delays
- Output messages
- Feature coverage

### Change API Endpoint

If running on a different port:

```javascript
// In demo.js
const API_BASE = 'http://localhost:YOUR_PORT';
```

## Advanced Usage

### Run Individual Tests

```javascript
import { testDocumentationGeneration } from './demo.js';

// Test specific language
await testDocumentationGeneration('python');
```

### Custom Webhook Payloads

```javascript
import { webhookPayload } from './sampleCode.js';

// Modify payload
webhookPayload.number = 123;
webhookPayload.pull_request.title = "Custom PR title";
```

### Programmatic API Testing

```javascript
import axios from 'axios';

const response = await axios.post('http://localhost:3001/api/generate', {
  code: 'function hello() { return "world"; }',
  language: 'javascript'
});

console.log('Documentation:', response.data.documentation);
console.log('Quality Score:', response.data.qualityScore.score);
```

## Performance Metrics

Expected performance on standard hardware:

| Feature | Time | Notes |
|---------|------|-------|
| Health Check | < 100ms | Simple ping |
| Documentation Gen | 2-5s | Depends on code complexity |
| Quality Scoring | < 100ms | Runs in parallel |
| Diagram Generation | 2-5s | Included in doc gen |
| Storage Retrieval | < 50ms | In-memory cache |
| Webhook Processing | < 100ms | Queues for async processing |

## CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
name: Test CodeToDocsAI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd backend && npm install
          cd ../test && npm install
      - name: Start backend
        run: cd backend && npm run dev &
      - name: Wait for server
        run: sleep 5
      - name: Run tests
        run: cd test && npm test
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the main README.md in project root
3. Check API endpoint responses in browser DevTools
4. Verify backend logs for error messages

---

**Good luck with your hackathon demo! 🚀**

Made with ❤️ using Claude 3.5 Sonnet
