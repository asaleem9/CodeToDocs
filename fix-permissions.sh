#!/bin/bash

# Fix Cloud Build Permissions Script

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Fixing Cloud Build Permissions${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Get current project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: No project set${NC}"
    read -p "Enter your GCP Project ID: " PROJECT_ID
    gcloud config set project $PROJECT_ID
fi

echo -e "${GREEN}Project: $PROJECT_ID${NC}\n"

# Get project number
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

# Define service accounts
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

echo -e "${YELLOW}Step 1: Granting Cloud Build permissions${NC}"

# Grant necessary roles to Cloud Build service account
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${CLOUD_BUILD_SA}" \
    --role="roles/run.admin" \
    --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${CLOUD_BUILD_SA}" \
    --role="roles/iam.serviceAccountUser" \
    --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${CLOUD_BUILD_SA}" \
    --role="roles/storage.admin" \
    --condition=None

echo -e "${GREEN}✓ Cloud Build permissions granted${NC}\n"

echo -e "${YELLOW}Step 2: Granting Compute Engine permissions${NC}"

# Grant permissions to default compute service account
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${COMPUTE_SA}" \
    --role="roles/run.admin" \
    --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${COMPUTE_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --condition=None

echo -e "${GREEN}✓ Compute Engine permissions granted${NC}\n"

echo -e "${YELLOW}Step 3: Enabling required APIs (if not already enabled)${NC}"

gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    secretmanager.googleapis.com \
    artifactregistry.googleapis.com \
    compute.googleapis.com

echo -e "${GREEN}✓ APIs enabled${NC}\n"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Permissions Fixed! ✓${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo -e "${YELLOW}You can now run the deployment script:${NC}"
echo -e "  ./deploy-gcp.sh"

echo -e "\n${BLUE}Note: It may take 1-2 minutes for permissions to propagate${NC}"
