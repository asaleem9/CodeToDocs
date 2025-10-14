#!/bin/bash

# CodeToDocsAI - Google Cloud Platform Deployment Script
# This script automates the deployment of CodeToDocsAI to Google Cloud Run

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  CodeToDocsAI - GCP Deployment${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get or set project ID
echo -e "${YELLOW}Step 1: Project Setup${NC}"
read -p "Enter your GCP Project ID (or press Enter to create new): " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID="codetodocs-ai-$(date +%s)"
    echo -e "${YELLOW}Creating new project: $PROJECT_ID${NC}"
    gcloud projects create $PROJECT_ID --name="CodeToDocsAI" || true
fi

echo -e "${GREEN}✓ Using project: $PROJECT_ID${NC}"
gcloud config set project $PROJECT_ID

# Set region
REGION="us-central1"
echo -e "${GREEN}✓ Using region: $REGION${NC}\n"

# Enable APIs
echo -e "${YELLOW}Step 2: Enabling Google Cloud APIs${NC}"
gcloud services enable cloudbuild.googleapis.com \
  run.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com

echo -e "${GREEN}✓ APIs enabled${NC}\n"

# Get Anthropic API Key
echo -e "${YELLOW}Step 3: Setting up secrets${NC}"
read -sp "Enter your Anthropic API Key: " ANTHROPIC_KEY
echo

# Create or update secret
if gcloud secrets describe anthropic-api-key &> /dev/null; then
    echo -e "${YELLOW}Updating existing secret...${NC}"
    echo -n "$ANTHROPIC_KEY" | gcloud secrets versions add anthropic-api-key --data-file=-
else
    echo -e "${YELLOW}Creating new secret...${NC}"
    echo -n "$ANTHROPIC_KEY" | gcloud secrets create anthropic-api-key --data-file=- --replication-policy="automatic"
fi

# Grant access to secret
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding anthropic-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" &> /dev/null || true

echo -e "${GREEN}✓ Secret configured${NC}\n"

# Deploy Backend
echo -e "${YELLOW}Step 4: Deploying backend to Cloud Run${NC}"
echo -e "${BLUE}This may take 5-10 minutes...${NC}"

cd backend

gcloud run deploy codetodocs-backend \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production" \
  --set-secrets "ANTHROPIC_API_KEY=anthropic-api-key:latest" \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --min-instances 0 \
  --timeout 300 \
  --quiet

BACKEND_URL=$(gcloud run services describe codetodocs-backend --region $REGION --format 'value(status.url)')
echo -e "${GREEN}✓ Backend deployed at: $BACKEND_URL${NC}\n"

# Deploy Frontend
echo -e "${YELLOW}Step 5: Deploying frontend to Cloud Run${NC}"
echo -e "${BLUE}This may take 5-10 minutes...${NC}"

cd ../frontend

gcloud run deploy codetodocs-frontend \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "VITE_API_URL=$BACKEND_URL" \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 5 \
  --min-instances 0 \
  --quiet

FRONTEND_URL=$(gcloud run services describe codetodocs-frontend --region $REGION --format 'value(status.url)')
echo -e "${GREEN}✓ Frontend deployed at: $FRONTEND_URL${NC}\n"

# Update backend with frontend URL for CORS
echo -e "${YELLOW}Step 6: Configuring CORS${NC}"
cd ..
gcloud run services update codetodocs-backend \
  --region $REGION \
  --set-env-vars "FRONTEND_URL=$FRONTEND_URL" \
  --quiet

echo -e "${GREEN}✓ CORS configured${NC}\n"

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}   Deployment Complete! 🎉${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${YELLOW}Your application is now live:${NC}"
echo -e "${GREEN}Frontend: $FRONTEND_URL${NC}"
echo -e "${GREEN}Backend:  $BACKEND_URL${NC}\n"

echo -e "${YELLOW}To view logs:${NC}"
echo "  gcloud run services logs read codetodocs-backend --region $REGION"
echo "  gcloud run services logs read codetodocs-frontend --region $REGION"

echo -e "\n${YELLOW}To update your deployment:${NC}"
echo "  Just run this script again!"

echo -e "\n${YELLOW}To delete all resources:${NC}"
echo "  gcloud run services delete codetodocs-backend --region $REGION"
echo "  gcloud run services delete codetodocs-frontend --region $REGION"
echo "  gcloud secrets delete anthropic-api-key"

echo -e "\n${BLUE}Enjoy using CodeToDocsAI!${NC}"
