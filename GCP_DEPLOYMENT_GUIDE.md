# Google Cloud Platform Deployment Guide

This guide will help you deploy CodeToDocsAI to Google Cloud Run.

## Prerequisites

1. Google Cloud account with billing enabled
2. `gcloud` CLI installed ([Install Guide](https://cloud.google.com/sdk/docs/install))
3. Your Anthropic API key

## Quick Start (Automated)

We've created a deployment script to automate the process:

```bash
chmod +x deploy-gcp.sh
./deploy-gcp.sh
```

## Manual Deployment Steps

### Step 1: Set Up Google Cloud Project

```bash
# Login to Google Cloud
gcloud auth login

# Create a new project (or use existing)
export PROJECT_ID="codetodocs-ai"
gcloud projects create $PROJECT_ID --name="CodeToDocsAI"

# Set the project
gcloud config set project $PROJECT_ID

# Enable billing (required for Cloud Run)
# Visit: https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID
```

### Step 2: Enable Required APIs

```bash
# Enable necessary Google Cloud APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com
```

### Step 3: Create Secrets

```bash
# Create secret for Anthropic API key
echo -n "YOUR_ANTHROPIC_API_KEY" | gcloud secrets create anthropic-api-key \
  --data-file=- \
  --replication-policy="automatic"

# Grant Cloud Run access to the secret
gcloud secrets add-iam-policy-binding anthropic-api-key \
  --member="serviceAccount:$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Step 4: Deploy Backend

```bash
# Navigate to backend directory
cd backend

# Build and deploy to Cloud Run
gcloud run deploy codetodocs-backend \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,PORT=8080" \
  --set-secrets "ANTHROPIC_API_KEY=anthropic-api-key:latest" \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --min-instances 0 \
  --timeout 300

# Get the backend URL
export BACKEND_URL=$(gcloud run services describe codetodocs-backend \
  --region us-central1 \
  --format 'value(status.url)')

echo "Backend deployed at: $BACKEND_URL"
```

### Step 5: Deploy Frontend

```bash
# Navigate to frontend directory
cd ../frontend

# Build and deploy to Cloud Run
gcloud run deploy codetodocs-frontend \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "VITE_API_URL=$BACKEND_URL" \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 5 \
  --min-instances 0

# Get the frontend URL
export FRONTEND_URL=$(gcloud run services describe codetodocs-frontend \
  --region us-central1 \
  --format 'value(status.url)')

echo "Frontend deployed at: $FRONTEND_URL"
```

### Step 6: Update Backend CORS

```bash
# Update backend with frontend URL for CORS
gcloud run services update codetodocs-backend \
  --region us-central1 \
  --set-env-vars "FRONTEND_URL=$FRONTEND_URL"
```

### Step 7: Access Your Application

Visit your frontend URL:
```bash
echo "Your app is live at: $FRONTEND_URL"
```

## Alternative: Deploy with Cloud Build

For a fully automated deployment pipeline:

```bash
# Submit build from root directory
cd /Users/meeko/Desktop/onemore/CodeToDocsAI
gcloud builds submit --config cloudbuild.yaml
```

## Troubleshooting

### Build Fails

```bash
# Check build logs
gcloud builds list --limit=5
gcloud builds log <BUILD_ID>
```

### Service Won't Start

```bash
# Check service logs
gcloud run services logs read codetodocs-backend --region us-central1 --limit 50
gcloud run services logs read codetodocs-frontend --region us-central1 --limit 50
```

### CORS Issues

Make sure the `FRONTEND_URL` environment variable is set correctly on the backend:

```bash
gcloud run services describe codetodocs-backend \
  --region us-central1 \
  --format 'value(spec.template.spec.containers[0].env)'
```

### Port Issues

Cloud Run expects services to listen on port `8080` or the `PORT` environment variable. Our Dockerfiles are configured correctly.

## Cost Estimation

Cloud Run free tier includes:
- 2 million requests per month
- 360,000 GB-seconds of memory
- 180,000 vCPU-seconds of compute time

For light usage, you should stay within the free tier.

## Cleanup

To delete all resources:

```bash
# Delete Cloud Run services
gcloud run services delete codetodocs-backend --region us-central1 --quiet
gcloud run services delete codetodocs-frontend --region us-central1 --quiet

# Delete secrets
gcloud secrets delete anthropic-api-key --quiet

# Delete container images
gcloud container images list --repository=gcr.io/$PROJECT_ID
gcloud container images delete gcr.io/$PROJECT_ID/codetodocs-backend --quiet
gcloud container images delete gcr.io/$PROJECT_ID/codetodocs-frontend --quiet
```

## Support

If you encounter issues:
1. Check the [Cloud Run documentation](https://cloud.google.com/run/docs)
2. Review service logs
3. Verify all environment variables are set correctly
4. Ensure billing is enabled on your project
