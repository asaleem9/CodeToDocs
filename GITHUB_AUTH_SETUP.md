# GitHub OAuth Setup Guide

This guide explains how to set up GitHub OAuth authentication for CodeToDocsAI.

## Prerequisites

- A GitHub account
- Access to the CodeToDocsAI repository

## Step 1: Register a GitHub OAuth App

1. Go to GitHub Settings: https://github.com/settings/developers
2. Click on "OAuth Apps" in the left sidebar
3. Click "New OAuth App"
4. Fill in the application details:
   - **Application name**: CodeToDocsAI (or your preferred name)
   - **Homepage URL**: `http://localhost:5173` (for development)
   - **Application description**: AI-powered documentation generator (optional)
   - **Authorization callback URL**: `http://localhost:3001/api/auth/github/callback`

5. Click "Register application"
6. You'll see your **Client ID** - copy this
7. Click "Generate a new client secret" and copy the **Client Secret**

## Step 2: Update Environment Variables

1. Open the `backend/.env` file (create it if it doesn't exist by copying `.env.example`)
2. Add or update the following variables:

```bash
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_github_oauth_client_id_here
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret_here
SESSION_SECRET=your_random_session_secret_here
```

3. Replace the placeholder values:
   - `GITHUB_CLIENT_ID`: Paste the Client ID from GitHub
   - `GITHUB_CLIENT_SECRET`: Paste the Client Secret from GitHub
   - `SESSION_SECRET`: Generate a random string (e.g., use `openssl rand -base64 32`)

## Step 3: Test the Authentication Flow

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to: `http://localhost:5173`

3. Click on the "GitHub" menu item in the navigation

4. Click the "Sign in with GitHub" button

5. You'll be redirected to GitHub to authorize the application

6. After authorization, you'll be redirected back to the app and see:
   - Your GitHub avatar in the top-right header
   - A list of your repositories
   - A logout button

## Features

### For Users

- **Repository Access**: View all your GitHub repositories
- **One-Click Documentation**: Generate documentation for any repository with a single click
- **Seamless Integration**: Automatically pre-fills the batch processing page with the selected repository URL
- **Persistent Sessions**: Stay logged in for 7 days

### For Developers

- **Session Management**: Express sessions with secure cookie handling
- **OAuth Flow**: Complete GitHub OAuth 2.0 implementation
- **User Context**: React Context API for global auth state
- **Protected Routes**: Easy-to-implement route protection (coming soon)

## Architecture

### Backend (`backend/src/`)

- **`routes/auth.ts`**: Authentication endpoints
  - `GET /api/auth/github` - Initiates GitHub OAuth flow
  - `GET /api/auth/github/callback` - Handles OAuth callback
  - `GET /api/auth/user` - Returns current user session
  - `GET /api/auth/repositories` - Fetches user's repositories
  - `POST /api/auth/logout` - Destroys user session

- **`services/authService.ts`**: GitHub API integration
  - Token exchange
  - User data fetching
  - Repository retrieval

- **`types/session.d.ts`**: TypeScript session types

### Frontend (`frontend/src/`)

- **`contexts/AuthContext.tsx`**: Global authentication state
- **`pages/GitHub.tsx`**: GitHub authentication and repository selection page
- **`App.tsx`**: Updated with AuthProvider and navigation

## Security Notes

- Sessions use httpOnly cookies to prevent XSS attacks
- OAuth tokens are never exposed to the frontend
- Session secrets should be strong and kept private
- In production, use HTTPS and set `secure: true` for cookies

## Production Deployment

For production deployment, update your GitHub OAuth App settings:

1. Add production URLs:
   - Homepage URL: `https://your-domain.com`
   - Authorization callback URL: `https://your-domain.com/api/auth/github/callback`

2. Update environment variables:
   ```bash
   NODE_ENV=production
   FRONTEND_URL=https://your-domain.com
   ```

3. Ensure secure cookie settings are enabled in `backend/src/index.ts`:
   ```typescript
   cookie: {
     secure: true, // Requires HTTPS
     sameSite: 'none',
   }
   ```

## Troubleshooting

### "OAuth App not found" error
- Verify the Client ID is correct in your `.env` file
- Ensure the OAuth app exists in your GitHub account settings

### Redirect loop or callback error
- Check that the callback URL in GitHub matches exactly: `http://localhost:3001/api/auth/github/callback`
- Ensure the backend server is running on port 3001

### Session not persisting
- Verify `SESSION_SECRET` is set in `.env`
- Check browser cookies are enabled
- Clear browser cookies and try again

### "Not authenticated" errors
- The session may have expired (7 days)
- Try logging out and logging back in
- Check that cookies are being sent with requests (`withCredentials: true`)

## Support

For issues or questions, please open an issue on the GitHub repository.
