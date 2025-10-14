# Deployment Guide

This guide covers deploying CodeToDocsAI using free hosting services.

## Recommended Setup

- **Frontend**: Vercel (free tier)
- **Backend**: Render (free tier)

## Prerequisites

- GitHub account
- Vercel account (sign up at vercel.com)
- Render account (sign up at render.com)
- Anthropic API key

---

## 1. Deploy Backend to Render

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### Step 2: Create Render Web Service

1. Go to [render.com/dashboard](https://render.com/dashboard)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select the `backend` directory (or use Root Directory: `backend`)
5. Configuration will auto-detect from `render.yaml`
6. Add environment variables:
   - `ANTHROPIC_API_KEY`: Your Anthropic API key
   - `FRONTEND_URL`: Your Vercel URL (add after frontend deployment)
7. Click **"Create Web Service"**

### Step 3: Note Your Backend URL
After deployment, copy your backend URL (e.g., `https://codetodocs-backend.onrender.com`)

---

## 2. Deploy Frontend to Vercel

### Step 1: Create Vercel Project

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Step 2: Add Environment Variable

1. Go to **Settings** → **Environment Variables**
2. Add:
   - **Key**: `VITE_API_URL`
   - **Value**: Your Render backend URL (e.g., `https://codetodocs-backend.onrender.com`)
3. Click **"Deploy"**

---

## 3. Update Backend CORS

After frontend is deployed:

1. Go back to Render dashboard
2. Navigate to your backend service
3. Go to **Environment** tab
4. Update `FRONTEND_URL` with your Vercel URL (e.g., `https://codetodocs.vercel.app`)
5. Trigger a redeploy

---

## Alternative: Deploy Both to Render

If you prefer to keep everything on Render:

### Frontend (Static Site)
1. Create new **Static Site**
2. Root Directory: `frontend`
3. Build Command: `npm run build`
4. Publish Directory: `dist`
5. Add environment variable: `VITE_API_URL`

### Backend (Web Service)
Same as above

---

## Environment Variables Summary

### Backend (.env or Render Environment)
```bash
NODE_ENV=production
PORT=3001
ANTHROPIC_API_KEY=your_anthropic_api_key_here
FRONTEND_URL=https://your-frontend-url.vercel.app
```

### Frontend (Vercel Environment Variables)
```bash
VITE_API_URL=https://your-backend-url.onrender.com
```

---

## Important Notes

### Free Tier Limitations

**Render Free Tier**:
- Services spin down after 15 minutes of inactivity
- Cold start takes ~30 seconds
- 750 hours/month free

**Vercel Free Tier**:
- 100GB bandwidth/month
- Unlimited sites and deployments
- Automatic SSL and CDN

### Git Operations

The batch processing feature clones repositories to `/tmp`. On free tiers:
- Render provides ephemeral storage in `/tmp`
- Files are automatically cleaned up
- Large repos may take longer to clone

### Webhook Setup

For GitHub webhooks to work:
1. Use your Render backend URL + `/api/webhook/github`
2. Example: `https://codetodocs-backend.onrender.com/api/webhook/github`
3. Set webhook secret in Render environment variables if needed

---

## Troubleshooting

### Backend won't start
- Check logs in Render dashboard
- Verify `ANTHROPIC_API_KEY` is set correctly
- Ensure build completed successfully

### Frontend can't reach backend
- Check `VITE_API_URL` is set in Vercel
- Verify CORS settings in backend
- Check backend is running (may need to wake from sleep)

### Git clone fails in batch processing
- Free tier has limited memory (512MB)
- Try smaller repositories or reduce `maxFiles` limit
- Check Render logs for specific errors

---

## Cost-Free Alternatives

If you hit free tier limits:

**Railway**: $5 free credits/month (no card required for trial)
**Fly.io**: 3 free VMs with 256MB RAM
**Netlify**: Similar to Vercel, good alternative

---

## Monitoring

### Render
- View logs in real-time from dashboard
- Set up email alerts for deployment failures

### Vercel
- View deployment logs
- Analytics available in dashboard
- Automatic preview deployments for PRs

---

## Security Checklist

- [ ] Never commit `.env` files
- [ ] Add `.env` to `.gitignore`
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS (automatic on Vercel/Render)
- [ ] Set proper CORS origins (no wildcards in production)
- [ ] Validate webhook signatures if using GitHub webhooks

---

## Next Steps

After deployment:
1. Test all features (single file, batch processing, GraphQL)
2. Monitor usage and performance
3. Set up custom domain (optional, available on both platforms)
4. Configure GitHub webhooks for automated documentation

---

## Support

For deployment issues:
- **Vercel**: [vercel.com/docs](https://vercel.com/docs)
- **Render**: [render.com/docs](https://render.com/docs)
- **CodeToDocsAI**: Open an issue on GitHub
