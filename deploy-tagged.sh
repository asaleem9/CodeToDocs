#!/bin/bash

# CodeToDocsAI - Tagged GCP Deployment Script
# All resources tagged with: hackathon25-codetodocsai

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  CodeToDocsAI - Tagged GCP Deployment${NC}"
echo -e "${BLUE}  Tag: hackathon25-codetodocsai${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get current project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: No project set${NC}"
    echo "Please run: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

echo -e "${GREEN}✓ Using project: $PROJECT_ID${NC}"

# Set region
REGION="us-central1"
echo -e "${GREEN}✓ Using region: $REGION${NC}\n"

# Tag to apply to all resources
TAG_KEY="project"
TAG_VALUE="hackathon25-codetodocsai"

echo -e "${YELLOW}Step 1: Verifying APIs are enabled${NC}"
gcloud services enable cloudbuild.googleapis.com \
  run.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  --project=$PROJECT_ID

echo -e "${GREEN}✓ APIs verified${NC}\n"

# Get Anthropic API Key
echo -e "${YELLOW}Step 2: Setting up secrets${NC}"
read -sp "Enter your Anthropic API Key: " ANTHROPIC_KEY
echo

if [ -z "$ANTHROPIC_KEY" ]; then
    echo -e "${RED}Error: API key is required${NC}"
    exit 1
fi

# Create or update secret with labels
SECRET_NAME="codetodocs-anthropic-api-key"
if gcloud secrets describe $SECRET_NAME --project=$PROJECT_ID &> /dev/null; then
    echo -e "${YELLOW}Updating existing secret...${NC}"
    echo -n "$ANTHROPIC_KEY" | gcloud secrets versions add $SECRET_NAME --data-file=- --project=$PROJECT_ID
    # Update labels on existing secret
    gcloud secrets update $SECRET_NAME --update-labels="${TAG_KEY}=${TAG_VALUE}" --project=$PROJECT_ID
else
    echo -e "${YELLOW}Creating new secret with label...${NC}"
    echo -n "$ANTHROPIC_KEY" | gcloud secrets create $SECRET_NAME \
      --data-file=- \
      --replication-policy="automatic" \
      --labels="${TAG_KEY}=${TAG_VALUE}" \
      --project=$PROJECT_ID
fi

# Grant access to secret
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding $SECRET_NAME \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID &> /dev/null || true

echo -e "${GREEN}✓ Secret configured with label: ${TAG_KEY}=${TAG_VALUE}${NC}\n"

# Deploy Backend
echo -e "${YELLOW}Step 3: Deploying backend to Cloud Run${NC}"
echo -e "${BLUE}This may take 5-10 minutes...${NC}"

cd backend

gcloud run deploy codetodocs-backend \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production" \
  --set-secrets "ANTHROPIC_API_KEY=${SECRET_NAME}:latest" \
  --update-labels="${TAG_KEY}=${TAG_VALUE}" \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --min-instances 0 \
  --timeout 300 \
  --project=$PROJECT_ID \
  --quiet

BACKEND_URL=$(gcloud run services describe codetodocs-backend --region $REGION --project=$PROJECT_ID --format 'value(status.url)')
echo -e "${GREEN}✓ Backend deployed at: $BACKEND_URL${NC}"
echo -e "${GREEN}✓ Backend tagged with: ${TAG_KEY}=${TAG_VALUE}${NC}\n"

# Deploy Frontend
echo -e "${YELLOW}Step 4: Deploying frontend to Cloud Run${NC}"
echo -e "${BLUE}This may take 5-10 minutes...${NC}"

cd ../frontend

gcloud run deploy codetodocs-frontend \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "VITE_API_URL=$BACKEND_URL" \
  --update-labels="${TAG_KEY}=${TAG_VALUE}" \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 5 \
  --min-instances 0 \
  --project=$PROJECT_ID \
  --quiet

FRONTEND_URL=$(gcloud run services describe codetodocs-frontend --region $REGION --project=$PROJECT_ID --format 'value(status.url)')
echo -e "${GREEN}✓ Frontend deployed at: $FRONTEND_URL${NC}"
echo -e "${GREEN}✓ Frontend tagged with: ${TAG_KEY}=${TAG_VALUE}${NC}\n"

# Update backend with frontend URL for CORS
echo -e "${YELLOW}Step 5: Configuring CORS${NC}"
cd ..
gcloud run services update codetodocs-backend \
  --region $REGION \
  --set-env-vars "FRONTEND_URL=$FRONTEND_URL" \
  --project=$PROJECT_ID \
  --quiet

echo -e "${GREEN}✓ CORS configured${NC}\n"

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}   Deployment Complete! 🎉${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${YELLOW}Deployment Details:${NC}"
echo -e "  Project:  ${GREEN}$PROJECT_ID${NC}"
echo -e "  Region:   ${GREEN}$REGION${NC}"
echo -e "  Tag:      ${GREEN}${TAG_KEY}=${TAG_VALUE}${NC}"
echo -e "  Frontend: ${GREEN}$FRONTEND_URL${NC}"
echo -e "  Backend:  ${GREEN}$BACKEND_URL${NC}\n"

echo -e "${YELLOW}To view tagged resources:${NC}"
echo "  gcloud run services list --project=$PROJECT_ID --filter='metadata.labels.project=hackathon25-codetodocsai'"
echo "  gcloud secrets list --project=$PROJECT_ID --filter='labels.project=hackathon25-codetodocsai'"

echo -e "\n${YELLOW}To view logs:${NC}"
echo "  gcloud run services logs read codetodocs-backend --region $REGION --project $PROJECT_ID"
echo "  gcloud run services logs read codetodocs-frontend --region $REGION --project $PROJECT_ID"

echo -e "\n${YELLOW}To update your deployment:${NC}"
echo "  Just run this script again!"

echo -e "\n${YELLOW}To delete all tagged resources:${NC}"
echo "  gcloud run services delete codetodocs-backend --region $REGION --project $PROJECT_ID"
echo "  gcloud run services delete codetodocs-frontend --region $REGION --project $PROJECT_ID"
echo "  gcloud secrets delete $SECRET_NAME --project $PROJECT_ID"

echo -e "\n${BLUE}🎉 All resources tagged with: ${TAG_KEY}=${TAG_VALUE}${NC}"
