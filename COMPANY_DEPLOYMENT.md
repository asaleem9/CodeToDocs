# Company GCP Deployment Guide

## Overview
This guide explains how to deploy CodeToDocsAI to your company's GCP project (dave-inc) instead of your personal GCP project.

## 📊 Key Differences: Personal vs Company GCP

| Aspect | Personal GCP Deployment | Company GCP Deployment |
|--------|------------------------|------------------------|
| **Project ID** | `codetodocs-ai-XXXXX` (auto-generated) | Company project (e.g., `dave-inc-production`) |
| **Project Creation** | Script can create new project | Use existing company project |
| **Billing** | Your personal credit card | Company billing account (pre-configured) |
| **Permissions** | Full Owner access | May need approval for certain permissions |
| **Service Names** | `codetodocs-backend/frontend` | May need company naming conventions |
| **Secret Names** | `anthropic-api-key` | `codetodocs-anthropic-api-key` (prefixed) |
| **Service Accounts** | Auto-created | May use existing company service accounts |
| **Region** | `us-central1` (default) | May need to follow company policy |
| **Authentication** | Your personal Google account | Company Google Workspace account |
| **Approvals** | None needed | May need approval for API enablement |

## 🔐 Prerequisites for Company Deployment

### 1. Access Requirements
- [ ] Company Google Workspace account
- [ ] Access to company GCP project with **Editor** or **Owner** role
- [ ] Billing must be enabled on the company project
- [ ] Permission to deploy Cloud Run services
- [ ] Permission to create secrets in Secret Manager

### 2. Information Needed
- [ ] **Company GCP Project ID** (get from IT/DevOps)
- [ ] **Preferred Region** (check company policy, default: `us-central1`)
- [ ] **Anthropic API Key** (your existing key)
- [ ] **Service Naming Conventions** (if any company standards exist)

### 3. Permissions Check

Run these commands to verify access:

```bash
# Login with company account
gcloud auth login

# List available projects
gcloud projects list

# Set company project
gcloud config set project YOUR_COMPANY_PROJECT_ID

# Check your IAM roles
gcloud projects get-iam-policy YOUR_COMPANY_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:user:YOUR_EMAIL"
```

You should see roles like:
- `roles/owner`
- `roles/editor`
- `roles/run.admin`

## 🚀 Deployment Options

### Option 1: Use Custom Company Script (Recommended)

I've created a company-specific deployment script with enhanced checks:

```bash
./deploy-company-gcp.sh
```

**Benefits:**
- Prompts for company project ID (won't auto-create)
- Validates project access before deployment
- Checks billing status
- Uses company-prefixed secret names
- Better error handling for corporate environments

### Option 2: Use Original Script with Manual Configuration

```bash
# Set your company project first
export PROJECT_ID="your-company-project-id"

# Then run original script
./deploy-gcp.sh
# When prompted, enter your company project ID
```

## 📝 Step-by-Step Deployment Process

### Step 1: Pre-Flight Check

```bash
# Verify you're using company account
gcloud auth list

# Should show your @dave-inc.com or company email
# If not, login with company account:
gcloud auth login
```

### Step 2: Set Company Project

```bash
# Replace with your actual company project ID
export COMPANY_PROJECT="dave-inc-codetodocs"  # Example

# Set as active project
gcloud config set project $COMPANY_PROJECT

# Verify
gcloud config get-value project
```

### Step 3: Check Billing & Permissions

```bash
# Check billing is enabled
gcloud beta billing projects describe $COMPANY_PROJECT

# Check your permissions
gcloud projects get-iam-policy $COMPANY_PROJECT \
  --flatten="bindings[].members" \
  --filter="bindings.members:user:$(gcloud config get-value account)"
```

### Step 4: Run Deployment

```bash
# Make script executable (if not already)
chmod +x deploy-company-gcp.sh

# Run deployment
./deploy-company-gcp.sh
```

**During deployment, you'll be prompted for:**
1. Company GCP Project ID
2. Region (default: us-central1)
3. Anthropic API Key

### Step 5: Verify Deployment

After deployment completes:

```bash
# List Cloud Run services
gcloud run services list --project $COMPANY_PROJECT

# Check backend health
curl https://YOUR-BACKEND-URL/api/health

# View logs
gcloud run services logs read codetodocs-backend \
  --region us-central1 \
  --project $COMPANY_PROJECT
```

## 🔒 Security Considerations for Company Deployment

### 1. Secrets Management
- **Personal**: Secrets stored in your personal Secret Manager
- **Company**: Secrets stored in company Secret Manager (may have audit logging)
- **Best Practice**: Use company-prefixed secret names (`codetodocs-anthropic-api-key`)

### 2. Service Account Security
```bash
# The script uses default compute service account
# For enhanced security, consider creating dedicated service account:

# Create service account
gcloud iam service-accounts create codetodocs-sa \
  --display-name="CodeToDocsAI Service Account" \
  --project $COMPANY_PROJECT

# Grant minimal permissions
gcloud projects add-iam-policy-binding $COMPANY_PROJECT \
  --member="serviceAccount:codetodocs-sa@${COMPANY_PROJECT}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Update Cloud Run services to use this SA
gcloud run services update codetodocs-backend \
  --service-account=codetodocs-sa@${COMPANY_PROJECT}.iam.gserviceaccount.com \
  --region us-central1
```

### 3. Authentication Options

**Current Setup**: `--allow-unauthenticated` (public access)

**For company internal use only:**
```bash
# Remove public access
gcloud run services remove-iam-policy-binding codetodocs-frontend \
  --region us-central1 \
  --member="allUsers" \
  --role="roles/run.invoker"

# Add company domain restriction
gcloud run services add-iam-policy-binding codetodocs-frontend \
  --region us-central1 \
  --member="domain:dave-inc.com" \
  --role="roles/run.invoker"
```

## 📊 Cost Considerations

### Personal vs Company Billing

**Personal GCP:**
- Costs billed to your credit card
- You pay for all usage
- Free tier may apply (new accounts)

**Company GCP:**
- Costs billed to company
- May have quotas or budgets
- Check with finance/DevOps about cost allocation

**Estimated Monthly Costs:**
- Cloud Run Backend (1 GB RAM, 1 vCPU): ~$5-20/month (depends on usage)
- Cloud Run Frontend (512 MB RAM, 1 vCPU): ~$3-10/month
- Anthropic API (Claude): Based on usage (company may have existing agreement)
- Secret Manager: ~$0.06/secret/month
- Container Registry: ~$0.026/GB/month

**Total**: Approximately **$10-40/month** (varies with usage)

## 🔄 Migrating from Personal to Company GCP

If you already deployed to personal GCP and want to migrate:

### Step 1: Export Data (if needed)
```bash
# If you have stored documentation, export it
# (Currently in-memory only, so nothing to export)
```

### Step 2: Deploy to Company GCP
```bash
# Use company deployment script
./deploy-company-gcp.sh
```

### Step 3: Update DNS/Links
- Update any bookmarks
- Update documentation with new URLs
- Notify team members of new URLs

### Step 4: Cleanup Personal GCP (Optional)
```bash
# Set personal project
gcloud config set project YOUR_PERSONAL_PROJECT

# Delete services
gcloud run services delete codetodocs-backend --region us-central1
gcloud run services delete codetodocs-frontend --region us-central1

# Delete secrets
gcloud secrets delete anthropic-api-key

# (Optional) Delete entire project
gcloud projects delete YOUR_PERSONAL_PROJECT
```

## 🚨 Troubleshooting Company Deployments

### Issue 1: Permission Denied

**Error**: `Permission denied` or `Forbidden`

**Solution**:
```bash
# Check your roles
gcloud projects get-iam-policy $COMPANY_PROJECT

# Ask IT/DevOps to grant you:
# - roles/editor OR
# - roles/run.admin + roles/secretmanager.admin
```

### Issue 2: API Not Enabled

**Error**: `API [...] is not enabled`

**Solution**:
```bash
# Some orgs require approval for API enablement
# Contact IT/DevOps or use company's internal approval process

# Or manually enable:
gcloud services enable cloudbuild.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  --project $COMPANY_PROJECT
```

### Issue 3: Billing Not Enabled

**Error**: `Project [...] has billing disabled`

**Solution**:
- Contact finance/IT to enable billing
- Or use different project that already has billing enabled

### Issue 4: Quota Exceeded

**Error**: `Quota exceeded for quota metric`

**Solution**:
```bash
# Check quotas
gcloud compute project-info describe --project $COMPANY_PROJECT

# Request quota increase from GCP Console or company admin
```

### Issue 5: Organization Policy Constraint

**Error**: `Organization policy constraint`

**Solution**:
- Company may have policies restricting certain operations
- Contact IT/DevOps to understand policies
- May need exception or different configuration

## 📋 Post-Deployment Checklist

After successful deployment to company GCP:

- [ ] Frontend URL is accessible
- [ ] Backend health check passes
- [ ] Can generate documentation
- [ ] Batch processing works
- [ ] Full repo documentation generation works
- [ ] URLs added to company documentation
- [ ] Team members have access
- [ ] Monitoring/alerts configured (optional)
- [ ] Budget alerts set up (optional)
- [ ] Cost allocation tags applied (optional)

## 🔗 Useful Resources

- **GCP Console**: https://console.cloud.google.com
- **Cloud Run Dashboard**: https://console.cloud.google.com/run
- **Secret Manager**: https://console.cloud.google.com/security/secret-manager
- **IAM & Admin**: https://console.cloud.google.com/iam-admin
- **Billing**: https://console.cloud.google.com/billing

## 📞 Getting Help

If you encounter issues:

1. **Check logs**:
   ```bash
   gcloud run services logs read codetodocs-backend --region us-central1
   ```

2. **Contact company IT/DevOps** for:
   - Permission issues
   - Billing questions
   - Organization policies
   - Service account setup

3. **Check GCP documentation**:
   - [Cloud Run Documentation](https://cloud.google.com/run/docs)
   - [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)

## 🎯 Next Steps

After deployment to company GCP:

1. **Share with team**: Send frontend URL to team members
2. **Set up monitoring**: Configure uptime checks and alerts
3. **Configure CI/CD**: Automate deployments from GitHub
4. **Add to company docs**: Document the service in company wiki
5. **Request feedback**: Get team feedback for improvements
6. **Plan scaling**: Adjust Cloud Run settings based on usage

---

**Happy deploying to your company's GCP! 🚀**
