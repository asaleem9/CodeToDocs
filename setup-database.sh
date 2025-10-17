#!/bin/bash

# CodeToDocsAI - Cloud SQL PostgreSQL Setup Script
# Creates and configures PostgreSQL database on Google Cloud SQL

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  CodeToDocsAI - Database Setup${NC}"
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

# Database configuration
DB_INSTANCE="codetodocs-db"
DB_NAME="codetodocs"
DB_USER="codetodocs-user"

echo -e "${YELLOW}Step 1: Enabling Cloud SQL Admin API${NC}"
gcloud services enable sqladmin.googleapis.com --project=$PROJECT_ID
echo -e "${GREEN}✓ API enabled${NC}\n"

echo -e "${YELLOW}Step 2: Creating Cloud SQL PostgreSQL instance${NC}"
echo -e "${BLUE}This may take 5-10 minutes...${NC}"

# Check if instance already exists
if gcloud sql instances describe $DB_INSTANCE --project=$PROJECT_ID &> /dev/null; then
    echo -e "${YELLOW}Cloud SQL instance already exists: $DB_INSTANCE${NC}"
else
    # Create with private IP using default VPC network
    # This complies with org policies that restrict public IPs
    echo -e "${YELLOW}Creating instance with private IP (VPC-based)...${NC}"
    echo -e "${YELLOW}Note: This requires the default VPC network${NC}"

    # Enable Service Networking API (required for private IP)
    gcloud services enable servicenetworking.googleapis.com --project=$PROJECT_ID 2>/dev/null || true

    gcloud sql instances create $DB_INSTANCE \
      --database-version=POSTGRES_15 \
      --tier=db-f1-micro \
      --region=$REGION \
      --storage-type=SSD \
      --storage-size=10GB \
      --storage-auto-increase \
      --backup-start-time=03:00 \
      --network=projects/$PROJECT_ID/global/networks/default \
      --no-assign-ip \
      --project=$PROJECT_ID

    echo -e "${GREEN}✓ Cloud SQL instance created: $DB_INSTANCE (private IP only)${NC}"
    echo -e "${YELLOW}Note: Instance uses private VPC networking - Cloud Run will connect via VPC connector${NC}"
fi

echo ""

echo -e "${YELLOW}Step 3: Creating database${NC}"
# Check if database exists
if gcloud sql databases describe $DB_NAME --instance=$DB_INSTANCE --project=$PROJECT_ID &> /dev/null; then
    echo -e "${YELLOW}Database already exists: $DB_NAME${NC}"
else
    gcloud sql databases create $DB_NAME \
      --instance=$DB_INSTANCE \
      --project=$PROJECT_ID

    echo -e "${GREEN}✓ Database created: $DB_NAME${NC}"
fi

echo ""

echo -e "${YELLOW}Step 4: Creating database user${NC}"
# Generate secure random password
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Check if user exists
if gcloud sql users list --instance=$DB_INSTANCE --project=$PROJECT_ID | grep -q $DB_USER; then
    echo -e "${YELLOW}User already exists, updating password...${NC}"
    gcloud sql users set-password $DB_USER \
      --instance=$DB_INSTANCE \
      --password="$DB_PASSWORD" \
      --project=$PROJECT_ID
else
    gcloud sql users create $DB_USER \
      --instance=$DB_INSTANCE \
      --password="$DB_PASSWORD" \
      --project=$PROJECT_ID
fi

echo -e "${GREEN}✓ Database user configured: $DB_USER${NC}\n"

# Get connection info
INSTANCE_CONNECTION_NAME=$(gcloud sql instances describe $DB_INSTANCE --project=$PROJECT_ID --format='value(connectionName)')

echo -e "${YELLOW}Step 5: Storing database credentials in Secret Manager${NC}"

# Create DATABASE_URL secret
DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@/${DB_NAME}?host=/cloudsql/${INSTANCE_CONNECTION_NAME}"

SECRET_NAME="codetodocs-database-url"
if gcloud secrets describe $SECRET_NAME --project=$PROJECT_ID &> /dev/null; then
    echo -e "${YELLOW}Updating DATABASE_URL secret...${NC}"
    echo -n "$DB_URL" | gcloud secrets versions add $SECRET_NAME --data-file=- --project=$PROJECT_ID
    gcloud secrets update $SECRET_NAME --update-labels="project=hackathon25-codetodocsai" --project=$PROJECT_ID
else
    echo -e "${YELLOW}Creating DATABASE_URL secret...${NC}"
    echo -n "$DB_URL" | gcloud secrets create $SECRET_NAME \
      --data-file=- \
      --replication-policy="automatic" \
      --labels="project=hackathon25-codetodocsai" \
      --project=$PROJECT_ID
fi

# Grant access to secret
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding $SECRET_NAME \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=$PROJECT_ID &> /dev/null || true

echo -e "${GREEN}✓ Database URL stored in Secret Manager${NC}\n"

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}   Database Setup Complete! 🎉${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${YELLOW}Database Details:${NC}"
echo -e "  Instance:   ${GREEN}$DB_INSTANCE${NC}"
echo -e "  Database:   ${GREEN}$DB_NAME${NC}"
echo -e "  User:       ${GREEN}$DB_USER${NC}"
echo -e "  Region:     ${GREEN}$REGION${NC}"
echo -e "  Connection: ${GREEN}$INSTANCE_CONNECTION_NAME${NC}\n"

echo -e "${YELLOW}Secret Manager:${NC}"
echo -e "  Secret:     ${GREEN}$SECRET_NAME${NC}"
echo -e "  Contains:   ${GREEN}DATABASE_URL connection string${NC}\n"

echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Run database migrations:"
echo "     cd backend && npm run db:push"
echo ""
echo "  2. Update your deployment to use the database:"
echo "     The deploy-tagged.sh script will automatically include DATABASE_URL"
echo ""
echo "  3. Local development (optional):"
echo "     gcloud sql connect $DB_INSTANCE --user=$DB_USER --database=$DB_NAME"
echo ""

echo -e "${YELLOW}Connection String (for local .env):${NC}"
echo "  DATABASE_URL=\"$DB_URL\""
echo ""

echo -e "${YELLOW}To view database instance:${NC}"
echo "  gcloud sql instances describe $DB_INSTANCE --project=$PROJECT_ID"
echo ""

echo -e "${YELLOW}To delete database (if needed):${NC}"
echo "  gcloud sql instances delete $DB_INSTANCE --project=$PROJECT_ID"
echo "  gcloud secrets delete $SECRET_NAME --project=$PROJECT_ID"
echo ""

echo -e "${BLUE}🎉 Database is ready for use!${NC}"
