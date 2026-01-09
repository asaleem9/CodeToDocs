#!/bin/bash

# CodeToDocsAI - Tagged GCP Deployment Script
# All resources tagged with: codetodocs

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  CodeToDocsAI - Tagged GCP Deployment${NC}"
echo -e "${BLUE}  Tag: codetodocs${NC}"
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
TAG_VALUE="codetodocs"

echo -e "${YELLOW}Step 1: Verifying APIs are enabled${NC}"
gcloud services enable cloudbuild.googleapis.com \
  run.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  --project=$PROJECT_ID

echo -e "${GREEN}✓ APIs verified${NC}\n"

# Get secrets
echo -e "${YELLOW}Step 2: Setting up secrets${NC}"
read -sp "Enter your Anthropic API Key: " ANTHROPIC_KEY
echo
read -p "Enter your GitHub OAuth Client ID: " GITHUB_CLIENT_ID
read -sp "Enter your GitHub OAuth Client Secret: " GITHUB_CLIENT_SECRET
echo
read -sp "Enter your Session Secret (press Enter to generate random): " SESSION_SECRET
echo
read -sp "Enter your Database Encryption Key (32 chars, press Enter to generate random): " DB_ENCRYPTION_KEY
echo
read -p "Enter your Cloud SQL Database URL (or press Enter to skip database): " DATABASE_URL
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

# Generate database encryption key if not provided
if [ -z "$DB_ENCRYPTION_KEY" ]; then
    DB_ENCRYPTION_KEY=$(openssl rand -hex 32)
    echo -e "${YELLOW}Generated database encryption key${NC}"
fi

# Create or update Anthropic API key secret with labels
SECRET_NAME="codetodocs-anthropic-api-key"
if gcloud secrets describe $SECRET_NAME --project=$PROJECT_ID &> /dev/null; then
    echo -e "${YELLOW}Updating Anthropic API key secret...${NC}"
    echo -n "$ANTHROPIC_KEY" | gcloud secrets versions add $SECRET_NAME --data-file=- --project=$PROJECT_ID
    # Update labels on existing secret
    gcloud secrets update $SECRET_NAME --update-labels="${TAG_KEY}=${TAG_VALUE}" --project=$PROJECT_ID
else
    echo -e "${YELLOW}Creating Anthropic API key secret with label...${NC}"
    echo -n "$ANTHROPIC_KEY" | gcloud secrets create $SECRET_NAME \
      --data-file=- \
      --replication-policy="automatic" \
      --labels="${TAG_KEY}=${TAG_VALUE}" \
      --project=$PROJECT_ID
fi

# Create or update GitHub Client ID secret
GITHUB_CLIENT_ID_SECRET="codetodocs-github-client-id"
if gcloud secrets describe $GITHUB_CLIENT_ID_SECRET --project=$PROJECT_ID &> /dev/null; then
    echo -e "${YELLOW}Updating GitHub Client ID secret...${NC}"
    echo -n "$GITHUB_CLIENT_ID" | gcloud secrets versions add $GITHUB_CLIENT_ID_SECRET --data-file=- --project=$PROJECT_ID
    gcloud secrets update $GITHUB_CLIENT_ID_SECRET --update-labels="${TAG_KEY}=${TAG_VALUE}" --project=$PROJECT_ID
else
    echo -e "${YELLOW}Creating GitHub Client ID secret with label...${NC}"
    echo -n "$GITHUB_CLIENT_ID" | gcloud secrets create $GITHUB_CLIENT_ID_SECRET \
      --data-file=- \
      --replication-policy="automatic" \
      --labels="${TAG_KEY}=${TAG_VALUE}" \
      --project=$PROJECT_ID
fi

# Create or update GitHub Client Secret secret
GITHUB_CLIENT_SECRET_SECRET="codetodocs-github-client-secret"
if gcloud secrets describe $GITHUB_CLIENT_SECRET_SECRET --project=$PROJECT_ID &> /dev/null; then
    echo -e "${YELLOW}Updating GitHub Client Secret secret...${NC}"
    echo -n "$GITHUB_CLIENT_SECRET" | gcloud secrets versions add $GITHUB_CLIENT_SECRET_SECRET --data-file=- --project=$PROJECT_ID
    gcloud secrets update $GITHUB_CLIENT_SECRET_SECRET --update-labels="${TAG_KEY}=${TAG_VALUE}" --project=$PROJECT_ID
else
    echo -e "${YELLOW}Creating GitHub Client Secret secret with label...${NC}"
    echo -n "$GITHUB_CLIENT_SECRET" | gcloud secrets create $GITHUB_CLIENT_SECRET_SECRET \
      --data-file=- \
      --replication-policy="automatic" \
      --labels="${TAG_KEY}=${TAG_VALUE}" \
      --project=$PROJECT_ID
fi

# Create or update Session Secret secret
SESSION_SECRET_NAME="codetodocs-session-secret"
if gcloud secrets describe $SESSION_SECRET_NAME --project=$PROJECT_ID &> /dev/null; then
    echo -e "${YELLOW}Updating Session Secret secret...${NC}"
    echo -n "$SESSION_SECRET" | gcloud secrets versions add $SESSION_SECRET_NAME --data-file=- --project=$PROJECT_ID
    gcloud secrets update $SESSION_SECRET_NAME --update-labels="${TAG_KEY}=${TAG_VALUE}" --project=$PROJECT_ID
else
    echo -e "${YELLOW}Creating Session Secret secret with label...${NC}"
    echo -n "$SESSION_SECRET" | gcloud secrets create $SESSION_SECRET_NAME \
      --data-file=- \
      --replication-policy="automatic" \
      --labels="${TAG_KEY}=${TAG_VALUE}" \
      --project=$PROJECT_ID
fi

# Create or update Database URL secret (if provided)
DB_URL_SECRET="codetodocs-database-url"
DB_ENCRYPTION_SECRET="codetodocs-database-encryption-key"

if [ -n "$DATABASE_URL" ]; then
    if gcloud secrets describe $DB_URL_SECRET --project=$PROJECT_ID &> /dev/null; then
        echo -e "${YELLOW}Updating Database URL secret...${NC}"
        echo -n "$DATABASE_URL" | gcloud secrets versions add $DB_URL_SECRET --data-file=- --project=$PROJECT_ID
        gcloud secrets update $DB_URL_SECRET --update-labels="${TAG_KEY}=${TAG_VALUE}" --project=$PROJECT_ID
    else
        echo -e "${YELLOW}Creating Database URL secret with label...${NC}"
        echo -n "$DATABASE_URL" | gcloud secrets create $DB_URL_SECRET \
          --data-file=- \
          --replication-policy="automatic" \
          --labels="${TAG_KEY}=${TAG_VALUE}" \
          --project=$PROJECT_ID
    fi
fi

# Create or update Database Encryption Key secret
if gcloud secrets describe $DB_ENCRYPTION_SECRET --project=$PROJECT_ID &> /dev/null; then
    echo -e "${YELLOW}Updating Database Encryption Key secret...${NC}"
    echo -n "$DB_ENCRYPTION_KEY" | gcloud secrets versions add $DB_ENCRYPTION_SECRET --data-file=- --project=$PROJECT_ID
    gcloud secrets update $DB_ENCRYPTION_SECRET --update-labels="${TAG_KEY}=${TAG_VALUE}" --project=$PROJECT_ID
else
    echo -e "${YELLOW}Creating Database Encryption Key secret with label...${NC}"
    echo -n "$DB_ENCRYPTION_KEY" | gcloud secrets create $DB_ENCRYPTION_SECRET \
      --data-file=- \
      --replication-policy="automatic" \
      --labels="${TAG_KEY}=${TAG_VALUE}" \
      --project=$PROJECT_ID
fi

# Grant access to secrets
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
SECRETS_LIST="$SECRET_NAME $GITHUB_CLIENT_ID_SECRET $GITHUB_CLIENT_SECRET_SECRET $SESSION_SECRET_NAME $DB_ENCRYPTION_SECRET"

if [ -n "$DATABASE_URL" ]; then
    SECRETS_LIST="$SECRETS_LIST $DB_URL_SECRET"
fi

for secret in $SECRETS_LIST; do
    gcloud secrets add-iam-policy-binding $secret \
      --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
      --role="roles/secretmanager.secretAccessor" \
      --project=$PROJECT_ID &> /dev/null || true
done

echo -e "${GREEN}✓ All secrets configured with label: ${TAG_KEY}=${TAG_VALUE}${NC}\n"

# Deploy Backend
echo -e "${YELLOW}Step 3: Deploying backend to Cloud Run${NC}"
echo -e "${BLUE}This may take 5-10 minutes...${NC}"

cd backend

# Build secrets string
BACKEND_SECRETS="ANTHROPIC_API_KEY=${SECRET_NAME}:latest,GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID_SECRET}:latest,GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET_SECRET}:latest,SESSION_SECRET=${SESSION_SECRET_NAME}:latest,DATABASE_ENCRYPTION_KEY=${DB_ENCRYPTION_SECRET}:latest"

# Add DATABASE_URL to secrets if provided
CLOUD_SQL_INSTANCE=""
if [ -n "$DATABASE_URL" ]; then
    BACKEND_SECRETS="$BACKEND_SECRETS,DATABASE_URL=${DB_URL_SECRET}:latest"
    echo -e "${GREEN}✓ Database configuration will be included${NC}"

    # Check if Cloud SQL instance exists to add connection
    DB_INSTANCE="codetodocs-db"
    if gcloud sql instances describe $DB_INSTANCE --project=$PROJECT_ID &> /dev/null 2>&1; then
        INSTANCE_CONNECTION_NAME=$(gcloud sql instances describe $DB_INSTANCE --project=$PROJECT_ID --format='value(connectionName)')
        CLOUD_SQL_INSTANCE="--add-cloudsql-instances=$INSTANCE_CONNECTION_NAME"
        echo -e "${GREEN}✓ Cloud SQL connection will be configured: $INSTANCE_CONNECTION_NAME${NC}"
    fi
fi

if [ -n "$CLOUD_SQL_INSTANCE" ]; then
    echo "Deploying with Cloud SQL connection..."
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
      $CLOUD_SQL_INSTANCE \
      --project=$PROJECT_ID
else
    echo "Deploying without Cloud SQL connection..."
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
fi

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
echo "  gcloud run services list --project=$PROJECT_ID --filter='metadata.labels.project=codetodocs'"
echo "  gcloud secrets list --project=$PROJECT_ID --filter='labels.project=codetodocs'"

echo -e "\n${YELLOW}To view logs:${NC}"
echo "  gcloud run services logs read codetodocs-backend --region $REGION --project $PROJECT_ID"
echo "  gcloud run services logs read codetodocs-frontend --region $REGION --project $PROJECT_ID"

echo -e "\n${YELLOW}To update your deployment:${NC}"
echo "  Just run this script again!"

echo -e "\n${YELLOW}To delete all tagged resources:${NC}"
echo "  gcloud run services delete codetodocs-backend --region $REGION --project $PROJECT_ID"
echo "  gcloud run services delete codetodocs-frontend --region $REGION --project $PROJECT_ID"
echo "  gcloud secrets delete $SECRET_NAME --project $PROJECT_ID"
echo "  gcloud secrets delete $GITHUB_CLIENT_ID_SECRET --project $PROJECT_ID"
echo "  gcloud secrets delete $GITHUB_CLIENT_SECRET_SECRET --project $PROJECT_ID"
echo "  gcloud secrets delete $SESSION_SECRET_NAME --project $PROJECT_ID"

echo -e "\n${BLUE}🎉 All resources tagged with: ${TAG_KEY}=${TAG_VALUE}${NC}"
