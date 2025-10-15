# GitHub Webhook Token Flow Documentation

## Overview

The webhook now supports **automatic token management** for end users. When a user authenticates via GitHub OAuth, their access token is stored and used for webhook operations on their repositories.

## How It Works

### 1. User Authentication Flow

When a user logs in via GitHub OAuth:

```
User clicks "Login with GitHub"
  ↓
GitHub OAuth redirects to /api/auth/github/callback
  ↓
Backend exchanges code for access_token
  ↓
Backend fetches user info (id, login, etc.)
  ↓
Token is stored: tokenStorage.store(userId, accessToken, username)
  ↓
User session is created
```

### 2. Webhook Processing Flow

When a PR is merged and webhook is triggered:

```
GitHub sends POST to /api/webhook/github
  ↓
Backend parses repository owner from payload
  ↓
Backend looks up token: tokenStorage.getByUsername(owner)
  ↓
If found: Use user's OAuth token (✓ Preferred)
If not found: Fall back to deployment GITHUB_TOKEN
  ↓
Fetch PR files using token
  ↓
Generate documentation
  ↓
Store under repository owner's GitHub user ID
```

### 3. Multi-Tier Token Lookup Strategy

The system implements a **graceful fallback** mechanism:

1. **Primary**: User's stored OAuth token (repository owner must be authenticated)
2. **Fallback**: Deployment `GITHUB_TOKEN` environment variable (for public repos or bootstrapping)

## Token Storage Service

### Location
`/backend/src/services/tokenStorage.ts`

### In-Memory Storage
Currently uses Map for storage:
```typescript
Map<userId, TokenData>
```

Where TokenData contains:
- `accessToken`: GitHub OAuth token
- `username`: GitHub username
- `storedAt`: Timestamp

### Production Considerations

⚠️ **Important**: In production, replace in-memory storage with:
- **Database** (PostgreSQL, MySQL, etc.) with encryption at rest
- **Redis** with TTL for session-based tokens
- **Secret Manager** (Google Cloud Secret Manager, AWS Secrets Manager)

### Key Functions

#### `store(userId, accessToken, username)`
Stores user's OAuth token when they authenticate

#### `get(userId)`
Retrieves token by user ID

#### `getByUsername(username)`
Retrieves token by GitHub username (used by webhook)

#### `remove(userId)`
Removes token on logout

## Testing the Webhook Flow

### Prerequisites
1. Backend running on port 3001
2. User has authenticated via GitHub OAuth (creates stored token)
3. `GITHUB_TOKEN` set in backend `.env` for fallback

### Test Scenarios

#### Scenario 1: User Has Authenticated (OAuth Token Available)

1. **Authenticate a test user**:
   ```bash
   # Visit http://localhost:5173 and login with GitHub
   # This stores your OAuth token
   ```

2. **Send webhook with your username**:
   ```bash
   # Edit test-webhook-with-user.sh
   # Change "torvalds" to your GitHub username
   # Run the test:
   ./test-webhook-with-user.sh
   ```

3. **Expected logs**:
   ```
   Processing webhook for repository: YOUR_USERNAME/test-repo
   Using OAuth token for repository owner: YOUR_USERNAME
   Using userId YOUR_ID for storing documentation
   ```

#### Scenario 2: User NOT Authenticated (Fallback to Deployment Token)

1. **Send webhook for unauthenticated user**:
   ```bash
   ./test-webhook.sh
   ```

2. **Expected logs**:
   ```
   Processing webhook for repository: testorg/test-repo
   Repository owner testorg has no stored token - falling back to deployment token
   Using userId XXXX for storing documentation
   ```

#### Scenario 3: No Token Available (Should Fail Gracefully)

1. **Remove GITHUB_TOKEN from .env**
2. **Send webhook for unauthenticated user**
3. **Expected logs**:
   ```
   Processing webhook for repository: testorg/test-repo
   No GitHub token available for testorg - cannot fetch PR files
   Repository owner should authenticate via GitHub OAuth, or set GITHUB_TOKEN in deployment
   ```

### Verification

Check webhook status:
```bash
curl http://localhost:3001/api/webhook/status
```

Check stored tokens (for debugging):
```bash
# Add debug endpoint in auth.ts:
# router.get('/debug/tokens', (req, res) => {
#   res.json({ usernames: tokenStorage.getAllUsernames() });
# });

curl http://localhost:3001/api/auth/debug/tokens
```

## Security Considerations

### Current Implementation
- Tokens stored in memory (lost on server restart)
- No encryption at rest
- No token expiration handling
- No token refresh logic

### Production Requirements

1. **Encryption**:
   - Encrypt tokens before storing in database
   - Use AES-256 or similar
   - Rotate encryption keys regularly

2. **Token Expiration**:
   - GitHub OAuth tokens don't expire by default
   - But can be revoked by user
   - Implement error handling for revoked tokens
   - Prompt user to re-authenticate if token invalid

3. **Token Refresh**:
   - GitHub doesn't use refresh tokens for OAuth apps
   - User must re-authenticate if token revoked
   - Implement graceful degradation

4. **Access Control**:
   - Only use token for user's own repositories
   - Validate repository ownership before using stored token
   - Log all token usage for audit trail

## Deployment

### Environment Variables Required

```bash
# OAuth credentials (required for all users)
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# Deployment token (optional, for fallback)
GITHUB_TOKEN=ghp_xxx

# Webhook signature verification (optional but recommended)
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Session secret
SESSION_SECRET=random_secret
```

### GCP Deployment

The `deploy-tagged.sh` script now supports:
- **Optional** GITHUB_TOKEN (can be skipped if users will authenticate)
- **Optional** GITHUB_WEBHOOK_SECRET

Users who authenticate via OAuth will have webhooks work automatically without needing deployment-time token configuration.

## User Flow

### For Repository Owners

1. **Setup GitHub App Integration**:
   - Go to Settings page
   - Copy webhook URL
   - Add webhook to your GitHub repository

2. **Authenticate** (IMPORTANT):
   - Login to CodeToDocsAI with GitHub OAuth
   - This stores your token for webhook use
   - Without this, webhooks will fall back to deployment token (may not work for private repos)

3. **Merge Pull Requests**:
   - PR documentation auto-generated
   - Appears in your History section
   - Tagged with PR metadata

### For Deployment Administrators

1. **Deploy with basic secrets**:
   - ANTHROPIC_API_KEY (required)
   - GITHUB_CLIENT_ID/SECRET (required)
   - SESSION_SECRET (generated if not provided)

2. **Optional deployment token**:
   - Set GITHUB_TOKEN for public repo fallback
   - Not required if users will authenticate

3. **Monitor webhook status**:
   - Check `/api/webhook/status` endpoint
   - View logs for token usage patterns

## Migration Path

### Phase 1: Current Implementation (In-Memory)
✅ Works for single-server deployments
✅ Simple to understand and test
❌ Tokens lost on restart
❌ Not suitable for multi-instance deployments

### Phase 2: Database Storage
- Add `oauth_tokens` table
- Encrypt tokens at rest
- Persist across restarts
- Support horizontal scaling

### Phase 3: Token Refresh & Expiration
- Handle token revocation
- Implement re-authentication flow
- Add token expiration checks
- User notifications for expired tokens

## FAQ

### Q: What happens if server restarts?
A: In-memory tokens are lost. Users must re-authenticate. Consider database storage for production.

### Q: Can I use this without GITHUB_TOKEN?
A: Yes! Users authenticate via OAuth, webhooks use their tokens. GITHUB_TOKEN is optional fallback.

### Q: What if user hasn't authenticated?
A: Falls back to GITHUB_TOKEN. If that's also missing, webhook cannot fetch PR files.

### Q: Is this secure?
A: Current implementation is suitable for development. Production needs encryption, database storage, and proper key management.

### Q: How do I debug token issues?
A: Check backend logs for "Using OAuth token" vs "falling back to deployment token" messages.

## Implementation Files

- `/backend/src/services/tokenStorage.ts` - Token storage service
- `/backend/src/routes/auth.ts` - OAuth flow and token storage on login
- `/backend/src/routes/webhook.ts` - Token retrieval and usage in webhook
- `/deploy-tagged.sh` - Updated deployment script with optional tokens
