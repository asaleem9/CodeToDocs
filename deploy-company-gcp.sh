#!/bin/bash

# CodeToDocsAI - Company GCP Deployment Script
# Customized for dave-inc GCP project

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  CodeToDocsAI - Company GCP Deployment${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Company-specific configuration
echo -e "${YELLOW}Step 1: Project Setup${NC}"
read -p "Enter your company's GCP Project ID: " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: Project ID is required${NC}"
    exit 1
fi

# Verify project exists and you have access
if ! gcloud projects describe $PROJECT_ID &> /dev/null; then
    echo -e "${RED}Error: Cannot access project $PROJECT_ID${NC}"
    echo "Please check:"
    echo "  1. Project ID is correct"
    echo "  2. You have proper permissions (Editor/Owner)"
    echo "  3. You're logged in with correct account: gcloud auth login"
    exit 1
fi

echo -e "${GREEN}✓ Using company project: $PROJECT_ID${NC}"
gcloud config set project $PROJECT_ID

# Set region (can be customized for company policy)
read -p "Enter region (default: us-central1): " REGION
REGION=${REGION:-us-central1}
echo -e "${GREEN}✓ Using region: $REGION${NC}\n"

# Check billing is enabled
BILLING_ENABLED=$(gcloud beta billing projects describe $PROJECT_ID --format='value(billingEnabled)' 2>/dev/null || echo "false")
if [ "$BILLING_ENABLED" != "True" ]; then
    echo -e "${YELLOW}Warning: Billing may not be enabled on this project${NC}"
    read -p "Continue anyway? (y/N): " CONTINUE
    if [[ ! $CONTINUE =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Enable APIs
echo -e "${YELLOW}Step 2: Enabling Google Cloud APIs${NC}"
echo -e "${BLUE}This may require approval in some organizations...${NC}"

gcloud services enable cloudbuild.googleapis.com \
  run.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com

echo -e "${GREEN}✓ APIs enabled${NC}\n"

# Get secrets
echo -e "${YELLOW}Step 3: Setting up secrets${NC}"
echo -e "${BLUE}Note: Secrets will be stored in company's Secret Manager${NC}"
read -sp "Enter your Anthropic API Key: " ANTHROPIC_KEY
echo
read -p "Enter your GitHub OAuth Client ID: " GITHUB_CLIENT_ID
read -sp "Enter your GitHub OAuth Client Secret: " GITHUB_CLIENT_SECRET
echo
read -sp "Enter your Session Secret (press Enter to generate random): " SESSION_SECRET
echo

if [ -z "$ANTHROPIC_KEY" ]; then
    echo -e "${RED}Error: Anthropic API key is required${NC}"
    exit 1
fi

# Generate session secret if not provided
if [ -z "$SESSION_SECRET" ]; then
    SESSION_SECRET=$(openssl rand -hex 32)
    echo -e "${YELLOW}Generated session secret${NC}"
fi

# Create or update Anthropic API key secret
SECRET_NAME="codetodocs-anthropic-api-key"
if gcloud secrets describe $SECRET_NAME &> /dev/null; then
    echo -e "${YELLOW}Updating Anthropic API key secret...${NC}"
    echo -n "$ANTHROPIC_KEY" | gcloud secrets versions add $SECRET_NAME --data-file=-
else
    echo -e "${YELLOW}Creating Anthropic API key secret...${NC}"
    echo -n "$ANTHROPIC_KEY" | gcloud secrets create $SECRET_NAME --data-file=- --replication-policy="automatic"
fi

# Create or update GitHub Client ID secret
GITHUB_CLIENT_ID_SECRET="codetodocs-github-client-id"
if gcloud secrets describe $GITHUB_CLIENT_ID_SECRET &> /dev/null; then
    echo -e "${YELLOW}Updating GitHub Client ID secret...${NC}"
    echo -n "$GITHUB_CLIENT_ID" | gcloud secrets versions add $GITHUB_CLIENT_ID_SECRET --data-file=-
else
    echo -e "${YELLOW}Creating GitHub Client ID secret...${NC}"
    echo -n "$GITHUB_CLIENT_ID" | gcloud secrets create $GITHUB_CLIENT_ID_SECRET --data-file=- --replication-policy="automatic"
fi

# Create or update GitHub Client Secret secret
GITHUB_CLIENT_SECRET_SECRET="codetodocs-github-client-secret"
if gcloud secrets describe $GITHUB_CLIENT_SECRET_SECRET &> /dev/null; then
    echo -e "${YELLOW}Updating GitHub Client Secret secret...${NC}"
    echo -n "$GITHUB_CLIENT_SECRET" | gcloud secrets versions add $GITHUB_CLIENT_SECRET_SECRET --data-file=-
else
    echo -e "${YELLOW}Creating GitHub Client Secret secret...${NC}"
    echo -n "$GITHUB_CLIENT_SECRET" | gcloud secrets create $GITHUB_CLIENT_SECRET_SECRET --data-file=- --replication-policy="automatic"
fi

# Create or update Session Secret secret
SESSION_SECRET_NAME="codetodocs-session-secret"
if gcloud secrets describe $SESSION_SECRET_NAME &> /dev/null; then
    echo -e "${YELLOW}Updating Session Secret secret...${NC}"
    echo -n "$SESSION_SECRET" | gcloud secrets versions add $SESSION_SECRET_NAME --data-file=-
else
    echo -e "${YELLOW}Creating Session Secret secret...${NC}"
    echo -n "$SESSION_SECRET" | gcloud secrets create $SESSION_SECRET_NAME --data-file=- --replication-policy="automatic"
fi

# Grant access to secrets
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
for secret in $SECRET_NAME $GITHUB_CLIENT_ID_SECRET $GITHUB_CLIENT_SECRET_SECRET $SESSION_SECRET_NAME; do
    gcloud secrets add-iam-policy-binding $secret \
      --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
      --role="roles/secretmanager.secretAccessor" &> /dev/null || true
done

echo -e "${GREEN}✓ All secrets configured${NC}\n"

# Service naming with company prefix
SERVICE_PREFIX="codetodocs"
BACKEND_SERVICE="${SERVICE_PREFIX}-backend"
FRONTEND_SERVICE="${SERVICE_PREFIX}-frontend"

# Deploy Backend
echo -e "${YELLOW}Step 4: Deploying backend to Cloud Run${NC}"
echo -e "${BLUE}Service name: $BACKEND_SERVICE${NC}"
echo -e "${BLUE}This may take 5-10 minutes...${NC}"

cd backend

gcloud run deploy $BACKEND_SERVICE \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,PORT=8080" \
  --set-secrets "ANTHROPIC_API_KEY=${SECRET_NAME}:latest,GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID_SECRET}:latest,GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET_SECRET}:latest,SESSION_SECRET=${SESSION_SECRET_NAME}:latest" \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --min-instances 0 \
  --timeout 300 \
  --quiet

BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE --region $REGION --format 'value(status.url)')
echo -e "${GREEN}✓ Backend deployed at: $BACKEND_URL${NC}\n"

# Deploy Frontend
echo -e "${YELLOW}Step 5: Deploying frontend to Cloud Run${NC}"
echo -e "${BLUE}Service name: $FRONTEND_SERVICE${NC}"
echo -e "${BLUE}This may take 5-10 minutes...${NC}"

cd ../frontend

gcloud run deploy $FRONTEND_SERVICE \
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

FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE --region $REGION --format 'value(status.url)')
echo -e "${GREEN}✓ Frontend deployed at: $FRONTEND_URL${NC}\n"

# Update backend with frontend URL for CORS
echo -e "${YELLOW}Step 6: Configuring CORS${NC}"
cd ..
gcloud run services update $BACKEND_SERVICE \
  --region $REGION \
  --set-env-vars "FRONTEND_URL=$FRONTEND_URL" \
  --quiet

echo -e "${GREEN}✓ CORS configured${NC}\n"

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}   Deployment Complete! 🎉${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${YELLOW}Deployment Details:${NC}"
echo -e "  Project:  ${GREEN}$PROJECT_ID${NC}"
echo -e "  Region:   ${GREEN}$REGION${NC}"
echo -e "  Frontend: ${GREEN}$FRONTEND_URL${NC}"
echo -e "  Backend:  ${GREEN}$BACKEND_URL${NC}\n"

echo -e "${YELLOW}To view logs:${NC}"
echo "  gcloud run services logs read $BACKEND_SERVICE --region $REGION --project $PROJECT_ID"
echo "  gcloud run services logs read $FRONTEND_SERVICE --region $REGION --project $PROJECT_ID"

echo -e "\n${YELLOW}To view in Cloud Console:${NC}"
echo "  https://console.cloud.google.com/run?project=$PROJECT_ID"

echo -e "\n${YELLOW}To update your deployment:${NC}"
echo "  Just run this script again!"

echo -e "\n${YELLOW}To delete all resources:${NC}"
echo "  gcloud run services delete $BACKEND_SERVICE --region $REGION --project $PROJECT_ID"
echo "  gcloud run services delete $FRONTEND_SERVICE --region $REGION --project $PROJECT_ID"
echo "  gcloud secrets delete $SECRET_NAME --project $PROJECT_ID"
echo "  gcloud secrets delete $GITHUB_CLIENT_ID_SECRET --project $PROJECT_ID"
echo "  gcloud secrets delete $GITHUB_CLIENT_SECRET_SECRET --project $PROJECT_ID"
echo "  gcloud secrets delete $SESSION_SECRET_NAME --project $PROJECT_ID"

echo -e "\n${BLUE}🎉 CodeToDocsAI is now live on your company's GCP!${NC}"
