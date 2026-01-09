#!/bin/bash

# CodeToDocsAI - Quick Redeployment Script (Reuses existing secrets)
# Use this for updates when secrets are already configured

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  CodeToDocsAI - Quick Redeployment${NC}"
echo -e "${BLUE}  (Using existing secrets)${NC}"
echo -e "${BLUE}========================================${NC}\n"

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
TAG_VALUE="codetodocs"

# Check if secrets exist
echo -e "${YELLOW}Step 1: Verifying secrets exist${NC}"
REQUIRED_SECRETS="codetodocs-anthropic-api-key codetodocs-github-client-id codetodocs-github-client-secret codetodocs-session-secret codetodocs-database-encryption-key"

for secret in $REQUIRED_SECRETS; do
    if ! gcloud secrets describe $secret --project=$PROJECT_ID &> /dev/null; then
        echo -e "${RED}Error: Secret '$secret' not found${NC}"
        echo -e "${YELLOW}Please run './deploy-tagged.sh' first to create secrets${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✓ All secrets exist${NC}\n"

# Deploy Backend
echo -e "${YELLOW}Step 2: Deploying backend to Cloud Run${NC}"
echo -e "${BLUE}This may take 5-10 minutes...${NC}"

cd backend

# Build secrets string
BACKEND_SECRETS="ANTHROPIC_API_KEY=codetodocs-anthropic-api-key:latest,GITHUB_CLIENT_ID=codetodocs-github-client-id:latest,GITHUB_CLIENT_SECRET=codetodocs-github-client-secret:latest,SESSION_SECRET=codetodocs-session-secret:latest,DATABASE_ENCRYPTION_KEY=codetodocs-database-encryption-key:latest"

gcloud run deploy codetodocs-backend \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production" \
  --set-secrets "$BACKEND_SECRETS" \
  --update-labels="${TAG_KEY}=${TAG_VALUE}" \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 3 \
  --min-instances 0 \
  --timeout 300 \
  --cpu-throttling \
  --project=$PROJECT_ID

BACKEND_URL=$(gcloud run services describe codetodocs-backend --region $REGION --project=$PROJECT_ID --format 'value(status.url)')
echo -e "${GREEN}✓ Backend deployed at: $BACKEND_URL${NC}"
echo -e "${GREEN}✓ Backend tagged with: ${TAG_KEY}=${TAG_VALUE}${NC}\n"

# Deploy Frontend
echo -e "${YELLOW}Step 3: Deploying frontend to Cloud Run${NC}"
echo -e "${BLUE}This may take 5-10 minutes...${NC}"

cd ../frontend

gcloud run deploy codetodocs-frontend \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "VITE_API_URL=$BACKEND_URL" \
  --update-labels="${TAG_KEY}=${TAG_VALUE}" \
  --memory 256Mi \
  --cpu 1 \
  --max-instances 2 \
  --min-instances 0 \
  --timeout 300 \
  --cpu-throttling \
  --project=$PROJECT_ID \
  --quiet

FRONTEND_URL=$(gcloud run services describe codetodocs-frontend --region $REGION --project=$PROJECT_ID --format 'value(status.url)')
echo -e "${GREEN}✓ Frontend deployed at: $FRONTEND_URL${NC}"
echo -e "${GREEN}✓ Frontend tagged with: ${TAG_KEY}=${TAG_VALUE}${NC}\n"

# Update backend with frontend URL for CORS
echo -e "${YELLOW}Step 4: Configuring CORS${NC}"
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

echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Update GitHub OAuth App callback URLs:"
echo -e "     Homepage: ${GREEN}$FRONTEND_URL${NC}"
echo -e "     Callback: ${GREEN}$BACKEND_URL/api/auth/github/callback${NC}"
echo -e ""
echo -e "  2. Test your deployment:"
echo -e "     ${GREEN}$FRONTEND_URL${NC}"
echo -e ""

echo -e "${YELLOW}To view logs:${NC}"
echo "  gcloud run services logs read codetodocs-backend --region $REGION --project $PROJECT_ID"
echo "  gcloud run services logs read codetodocs-frontend --region $REGION --project $PROJECT_ID"

echo -e "\n${BLUE}🎉 Redeployment complete!${NC}"
