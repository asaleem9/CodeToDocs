# GCP Free Tier Deployment Guide

> Optimized deployment configuration for minimal/zero traffic with GCP Free Tier

---

## 🎯 Optimization Summary

Your deployment scripts have been optimized to maximize free tier usage and minimize costs for low-traffic applications.

### Resource Changes

#### Before (Old Configuration)
```
Backend:  1Gi memory, 1 CPU, max 10 instances
Frontend: 512Mi memory, 1 CPU, max 5 instances
Database: db-f1-micro (~$7-10/month)
```

#### After (Free Tier Optimized)
```
Backend:  512Mi memory, 1 CPU, max 3 instances, CPU throttling enabled
Frontend: 256Mi memory, 1 CPU, max 2 instances, CPU throttling enabled
Database: Optional (skip for free tier)
```

---

## 💰 Cost Breakdown

### Free Tier Limits (Monthly)

**Cloud Run:**
- ✅ 2,000,000 requests
- ✅ 360,000 GB-seconds of memory
- ✅ 180,000 vCPU-seconds
- ✅ 1 GB network egress (North America)

**Cloud Build:**
- ✅ 120 build-minutes per day

**Secret Manager:**
- 💵 $0.06 per secret per month (~$0.36/month for 6 secrets)

**Container Registry:**
- 💵 Storage costs (~$0.26/GB/month, minimal for small images)

### With Optimizations

**Estimated Monthly Cost: $1-3** (if staying within free tier)
- Secret Manager: $0.36
- Container storage: ~$0.50
- Everything else: FREE (within limits)

**Previous Monthly Cost: $10-20** (with database + higher resources)

---

## 📊 Resource Optimization Details

### 1. Memory Reduction

**Backend: 1Gi → 512Mi**
- Node.js with Express is lightweight
- 512Mi is sufficient for low-traffic API
- **Savings:** 50% memory usage = 2x more free tier capacity

**Frontend: 512Mi → 256Mi**
- Nginx serving static files requires minimal memory
- 256Mi is more than enough
- **Savings:** 50% memory usage = 2x more free tier capacity

### 2. Instance Limits

**Backend: 10 → 3 max instances**
- Low traffic doesn't need 10 instances
- 3 instances can handle 300+ concurrent requests
- Prevents runaway costs from attacks/bugs

**Frontend: 5 → 2 max instances**
- Static content is fast to serve
- 2 instances sufficient for low traffic
- Prevents unnecessary scaling

### 3. CPU Throttling

**New Flag: `--cpu-throttling`**
- Throttles CPU when not handling requests
- Reduces vCPU-seconds consumption
- **Benefit:** Extends free tier capacity

### 4. Minimum Instances

**All services: min-instances = 0**
- Services scale to ZERO when idle
- No charges when not in use
- Cold starts take 2-5 seconds (acceptable for low traffic)

---

## 🚀 Deployment Instructions

### Option 1: Deploy WITHOUT Database (Recommended for Free Tier)

```bash
cd /Users/meeko/Desktop/CodeToDocsAI-p

# Do NOT run setup-database.sh
# Just deploy the app
./deploy-tagged.sh

# When prompted for Database URL, press Enter to skip
```

**What happens:**
- App uses in-memory storage
- Data clears on restart (acceptable for demos/testing)
- **Cost:** ~$1-3/month (near-free!)

### Option 2: Deploy WITH Database (NOT Free Tier)

```bash
cd /Users/meeko/Desktop/CodeToDocsAI-p

# Setup database (will warn about costs)
./setup-database.sh

# Deploy with database
./deploy-tagged.sh
# Enter the database URL when prompted
```

**What happens:**
- App uses Cloud SQL PostgreSQL
- Data persists across restarts
- **Cost:** ~$8-13/month (database costs $7-10)

---

## 📈 Free Tier Usage Calculator

### Example: 1000 Requests/Month (Very Low Traffic)

**Scenario:**
- 1000 requests/month
- Average request duration: 2 seconds
- Backend: 512Mi, Frontend: 256Mi

**Usage:**
```
Memory consumption:
- Backend:  1000 req × 2 sec × 0.5 GB = 1,000 GB-seconds
- Frontend: 1000 req × 1 sec × 0.25 GB = 250 GB-seconds
- Total: 1,250 GB-seconds

Free tier limit: 360,000 GB-seconds
Usage: 0.3% of free tier
✅ Easily within free tier!
```

**vCPU consumption:**
```
- Backend:  1000 req × 2 sec × 1 vCPU = 2,000 vCPU-seconds
- Frontend: 1000 req × 1 sec × 1 vCPU = 1,000 vCPU-seconds
- Total: 3,000 vCPU-seconds

Free tier limit: 180,000 vCPU-seconds
Usage: 1.7% of free tier
✅ Easily within free tier!
```

### Example: 10,000 Requests/Month (Low Traffic)

```
Memory: 12,500 GB-seconds (3.5% of free tier) ✅
vCPU: 30,000 vCPU-seconds (16.7% of free tier) ✅
Still FREE!
```

### Example: 100,000 Requests/Month (Medium Traffic)

```
Memory: 125,000 GB-seconds (34.7% of free tier) ✅
vCPU: 300,000 vCPU-seconds (166% of free tier) ⚠️
Exceeds free tier, but only ~$20-30/month overage
```

---

## 🔧 Additional Cost Savings Tips

### 1. Use Minimal Secrets

You currently have **6 secrets** (~$0.36/month):
- `codetodocs-anthropic-api-key`
- `codetodocs-github-client-id`
- `codetodocs-github-client-secret`
- `codetodocs-session-secret`
- `codetodocs-database-url` (optional)
- `codetodocs-database-encryption-key` (optional)

**Tip:** Skip database secrets if not using database = save $0.12/month

### 2. Clean Up Old Container Images

```bash
# List images
gcloud container images list --repository=gcr.io/YOUR-PROJECT-ID

# Delete old images (keep only latest)
gcloud container images delete gcr.io/YOUR-PROJECT-ID/codetodocs-backend:OLD_SHA

# Or set lifecycle policy to auto-delete old images
```

**Savings:** ~$0.10-0.50/month

### 3. Monitor Usage

```bash
# Check Cloud Run usage
gcloud run services describe codetodocs-backend --region us-central1 --format="table(status.url,status.traffic)"

# Check billing
gcloud billing accounts list
```

### 4. Set Budget Alerts

1. Go to: https://console.cloud.google.com/billing/budgets
2. Create budget: $5/month
3. Set alerts at 50%, 90%, 100%
4. Get email notifications before overspending

---

## 🎛️ Performance vs Cost Tradeoffs

### Current Configuration (Optimized)

| Metric | Value | Impact |
|--------|-------|--------|
| Cold Start Time | 3-5 seconds | Acceptable for low traffic |
| Memory Available | 512Mi/256Mi | Sufficient for small apps |
| Max Concurrency | 3 backend, 2 frontend | Handles 300+ requests/sec |
| Cost | ~$1-3/month | Minimal |

### If You Need Better Performance

**Increase memory (costs more):**
```bash
# In deploy scripts, change:
--memory 512Mi  →  --memory 1Gi   (backend)
--memory 256Mi  →  --memory 512Mi (frontend)
```

**Set minimum instances (costs more):**
```bash
# In deploy scripts, change:
--min-instances 0  →  --min-instances 1

# Eliminates cold starts, but costs ~$8-15/month
```

---

## 📝 Files Modified

All deployment scripts have been optimized:

1. ✅ `deploy-tagged.sh` - Main deployment script
2. ✅ `deploy-gcp.sh` - Standard GCP deployment
3. ✅ `deploy-company-gcp.sh` - Company deployment variant
4. ✅ `cloudbuild.yaml` - Cloud Build configuration
5. ✅ `setup-database.sh` - Database setup (with cost warning)

---

## 🧪 Testing Your Free Tier Deployment

After deployment, test that everything works:

```bash
# 1. Check services are running
gcloud run services list --filter='metadata.labels.project=codetodocs'

# 2. Test frontend
curl https://YOUR-FRONTEND-URL

# 3. Test backend health
curl https://YOUR-BACKEND-URL/api/health

# 4. Monitor logs (free tier: 50GB/month)
gcloud run services logs read codetodocs-backend --limit=10

# 5. Check if services scale to zero
# Wait 15 minutes with no traffic, then check:
gcloud run services describe codetodocs-backend --format='get(status.conditions)'
```

---

## ⚠️ Important Notes

### Cold Starts

With `min-instances=0`, your app will have **cold starts**:
- **First request after idle:** 3-5 seconds delay
- **Subsequent requests:** Normal speed
- **Acceptable for:** Demos, personal projects, low-traffic apps
- **Not acceptable for:** Production apps requiring <1s response time

**Solution if cold starts are an issue:**
```bash
# Set min-instances=1 (costs ~$8-15/month)
--min-instances 1
```

### Data Persistence

Without database:
- ❌ OAuth tokens cleared on restart (users must re-login)
- ❌ Documentation history lost on restart
- ❌ Webhook events not tracked
- ✅ App still functions for single-use documentation generation

**When to add database:**
- You have recurring users
- You need documentation history
- You're tracking webhooks
- You can afford ~$10/month

### CPU Throttling

`--cpu-throttling` flag means:
- CPU is throttled when container is idle
- Reduces costs, but slightly slower cold starts
- **Trade-off:** Lower cost vs slightly slower startup

---

## 🎉 Conclusion

Your deployment is now optimized for GCP Free Tier!

**Expected Monthly Cost:**
- **Without Database:** $1-3/month (~95% free)
- **With Database:** $8-13/month (database costs)

**For your use case (little to no traffic):**
- You'll stay well within free tier limits
- Services scale to zero when idle
- Total cost should be under $3/month

**Next Steps:**
1. Run `./deploy-tagged.sh` to deploy
2. Skip database setup when prompted
3. Test your app
4. Set budget alerts at $5/month
5. Monitor usage after 1 month

---

**Questions?** Check GCP Free Tier details:
https://cloud.google.com/free/docs/free-cloud-features
