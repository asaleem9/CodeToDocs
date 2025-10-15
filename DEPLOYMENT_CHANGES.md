# Deployment Changes Summary

## What Changed

The deployment script (`deploy-tagged.sh`) has been simplified to remove the optional GitHub token parameters. Users no longer need to provide these at deployment time.

## Secrets Required for Deployment

### Required (4 secrets):
1. **ANTHROPIC_API_KEY** - For Claude API access
2. **GITHUB_CLIENT_ID** - For GitHub OAuth
3. **GITHUB_CLIENT_SECRET** - For GitHub OAuth
4. **SESSION_SECRET** - Auto-generated if not provided

### Removed (2 secrets):
- ~~GITHUB_TOKEN~~ - No longer needed at deployment
- ~~GITHUB_WEBHOOK_SECRET~~ - No longer needed at deployment

## How Webhooks Work Now

### User Flow:
1. User visits your deployed app
2. User clicks "Login with GitHub"
3. OAuth flow completes → Token automatically stored
4. User sets up webhook in their GitHub repo
5. PR gets merged → Webhook uses their stored OAuth token
6. Documentation appears in their History

### Token Lookup Strategy:
When a webhook is triggered:
1. **Primary**: Look up repository owner's OAuth token (stored when they logged in)
2. **Fallback**: Use `GITHUB_TOKEN` environment variable if set (optional)
3. **Fail gracefully**: Show clear error message if neither available

## Why This Is Better

### Before:
- Deployer needed to provide GITHUB_TOKEN at deployment time
- Single token used for all users
- Wouldn't work for users' private repositories
- Required deployment access to set up webhooks

### After:
- No GitHub token needed at deployment time
- Each user's own OAuth token is used (automatically)
- Works with private repositories (user's permissions)
- Users manage their own webhook authentication

## Deployment Instructions

### 1. Run the deployment script:
```bash
./deploy-tagged.sh
```

### 2. When prompted, provide:
- Anthropic API Key (required)
- GitHub OAuth Client ID (required)
- GitHub OAuth Client Secret (required)
- Session Secret (press Enter to auto-generate)

### 3. Optional: Set GITHUB_TOKEN after deployment
If you want to support unauthenticated users or provide a fallback:
```bash
# Update backend environment with fallback token
gcloud run services update codetodocs-backend \
  --region us-central1 \
  --set-env-vars "GITHUB_TOKEN=ghp_xxx" \
  --project YOUR_PROJECT_ID
```

But this is **completely optional** - webhooks will work without it for authenticated users.

## For End Users

### Setting Up Webhooks:
1. Login to the app with GitHub
2. Go to Settings page
3. Copy the webhook URL
4. Add webhook to your GitHub repository:
   - Go to repo Settings → Webhooks → Add webhook
   - Paste the webhook URL
   - Content type: application/json
   - Events: Pull requests
   - Save

That's it! No token configuration needed on user's end.

## Technical Details

### Token Storage:
- When user logs in via OAuth, their token is stored in memory
- Location: `/backend/src/services/tokenStorage.ts`
- Current: In-memory Map (lost on restart)
- Production: Should use database with encryption

### Token Retrieval:
- Webhook receives PR merge event
- Extracts repository owner username
- Looks up owner's stored OAuth token
- Uses token to fetch PR files and generate docs
- Stores docs under owner's user ID

### Code Changes:
- `deploy-tagged.sh` - Removed optional token prompts
- `backend/src/services/tokenStorage.ts` - New token storage service
- `backend/src/routes/auth.ts` - Store/remove tokens on login/logout
- `backend/src/routes/webhook.ts` - Use stored tokens for webhook operations

## Migration Notes

If you have an existing deployment with the old script:
1. Existing secrets won't be affected
2. New deployments won't create GITHUB_TOKEN or GITHUB_WEBHOOK_SECRET secrets
3. Existing tokens will continue to work as fallbacks
4. Users who authenticate will override fallback with their own tokens

## Support

If webhooks aren't working:
1. Check user has authenticated via GitHub OAuth
2. Check webhook status endpoint: `/api/webhook/status`
3. Check backend logs for token lookup messages
4. Verify webhook is configured correctly in GitHub repo

## Future Improvements

### Short Term:
- Add database storage for tokens (persist across restarts)
- Add token refresh logic
- Add token expiration handling

### Long Term:
- Support GitHub Apps (better than OAuth for organization repos)
- Add webhook setup UI (automated webhook creation)
- Add token health checks and user notifications
