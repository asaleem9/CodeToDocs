# Database Implementation Plan

## Overview
Migrate from in-memory storage to PostgreSQL database on Google Cloud SQL to persist data across Cloud Run restarts.

---

## Current In-Memory Storage Issues

### 1. **Token Storage** (`tokenStorage.ts`)
- Stores GitHub OAuth tokens in memory (Map)
- **Problem**: Users lose authentication on restart
- **Data Lost**: `userId → {accessToken, username, storedAt}`

### 2. **Documentation Storage** (`storageService.ts`)
- Stores generated documentation in memory (Map)
- **Problem**: All documentation history lost on restart
- **Data Lost**: All documentation entries with quality scores, diagrams, PR info

### 3. **Settings Service** (`settingsService.ts`)
- Stores user preferences in memory (single object)
- **Problem**: Users lose model selection preferences
- **Data Lost**: Claude model selection

### 4. **Webhook Status** (`webhook.ts`)
- Stores webhook events in memory (array)
- **Problem**: Recent webhook events disappear on restart
- **Data Lost**: Recent webhook processing status

---

## Database Schema Design

### Table: `users`
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  github_id INTEGER UNIQUE NOT NULL,
  github_username VARCHAR(255) NOT NULL,
  github_email VARCHAR(255),
  avatar_url TEXT,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_github_id ON users(github_id);
CREATE INDEX idx_users_username ON users(github_username);
```

**Purpose**: Store GitHub user information from OAuth

---

### Table: `user_tokens`
```sql
CREATE TABLE user_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,  -- Encrypted
  token_type VARCHAR(50) DEFAULT 'oauth',
  scopes TEXT[],
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_tokens_user_id ON user_tokens(user_id);
```

**Purpose**: Store encrypted GitHub OAuth tokens
**Security**:
- Tokens encrypted at rest using `pgcrypto`
- Only decrypted when needed for API calls

---

### Table: `documentation`
```sql
CREATE TABLE documentation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

  -- Content
  documentation TEXT NOT NULL,
  diagram TEXT,
  code TEXT NOT NULL,
  language VARCHAR(50) NOT NULL,

  -- Metadata
  type VARCHAR(20) DEFAULT 'single' CHECK (type IN ('single', 'batch')),
  is_public BOOLEAN DEFAULT FALSE,

  -- Quality Score (JSONB for flexibility)
  quality_score JSONB,

  -- Batch Info (JSONB)
  batch_info JSONB,

  -- PR Info (JSONB)
  pr_info JSONB,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_documentation_user_id ON documentation(user_id);
CREATE INDEX idx_documentation_type ON documentation(type);
CREATE INDEX idx_documentation_created_at ON documentation(created_at DESC);
CREATE INDEX idx_documentation_pr_info ON documentation USING GIN (pr_info);
```

**Purpose**: Store all generated documentation with metadata

**JSONB Fields:**
```typescript
// quality_score JSONB
{
  "score": 95,
  "breakdown": {
    "hasOverview": true,
    "hasParameters": true,
    // ... other quality metrics
  }
}

// batch_info JSONB
{
  "repoUrl": "https://github.com/user/repo",
  "totalFiles": 20,
  "successCount": 18,
  "failedCount": 2
}

// pr_info JSONB
{
  "prNumber": 42,
  "repository": "user/repo",
  "branch": "feature/new-feature",
  "author": "username"
}
```

---

### Table: `user_settings`
```sql
CREATE TABLE user_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- Settings
  claude_model VARCHAR(100) DEFAULT 'claude-haiku-4-5-20251001',

  -- Future settings can be added as columns or JSONB
  additional_settings JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
```

**Purpose**: Store user preferences and settings

---

### Table: `webhook_events`
```sql
CREATE TABLE webhook_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

  -- Event Data
  event_type VARCHAR(50) NOT NULL,
  pr_number INTEGER,
  repository VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('received', 'processed', 'error')),
  error_message TEXT,

  -- Timestamps
  received_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

CREATE INDEX idx_webhook_events_user_id ON webhook_events(user_id);
CREATE INDEX idx_webhook_events_repository ON webhook_events(repository);
CREATE INDEX idx_webhook_events_received_at ON webhook_events(received_at DESC);
```

**Purpose**: Track webhook processing for debugging and status display

---

## Technology Stack

### Database
- **PostgreSQL 15** on Google Cloud SQL
- **Extensions**:
  - `pgcrypto` - Token encryption
  - `uuid-ossp` - UUID generation (or use `gen_random_uuid()`)

### ORM/Query Builder
**Option 1: Drizzle ORM** (Recommended)
- TypeScript-first
- Type-safe queries
- Lightweight
- Excellent Cloud Run support

**Option 2: Prisma**
- More features (migrations, studio)
- Heavier
- Great DX

**Recommendation**: Use **Drizzle ORM** for production-ready, lightweight solution

---

## Implementation Steps

### Step 1: Set Up Google Cloud SQL PostgreSQL

```bash
# Create Cloud SQL instance
gcloud sql instances create codetodocs-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --storage-type=SSD \
  --storage-size=10GB \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --labels=project=hackathon25-codetodocsai

# Create database
gcloud sql databases create codetodocs \
  --instance=codetodocs-db

# Create database user
gcloud sql users create codetodocs-user \
  --instance=codetodocs-db \
  --password=SECURE_GENERATED_PASSWORD
```

### Step 2: Enable Cloud SQL Admin API
```bash
gcloud services enable sqladmin.googleapis.com
```

### Step 3: Install Dependencies

```bash
cd backend
npm install drizzle-orm pg
npm install -D drizzle-kit @types/pg
```

### Step 4: Create Database Connection

**File**: `backend/src/db/connection.ts`
```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// Connection string from environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

export const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool);
```

### Step 5: Define Schema with Drizzle

**File**: `backend/src/db/schema.ts`
```typescript
import { pgTable, serial, text, integer, timestamp, boolean, varchar, jsonb, uuid, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  githubId: integer('github_id').unique().notNull(),
  githubUsername: varchar('github_username', { length: 255 }).notNull(),
  githubEmail: varchar('github_email', { length: 255 }),
  avatarUrl: text('avatar_url'),
  name: varchar('name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  githubIdIdx: index('idx_users_github_id').on(table.githubId),
  usernameIdx: index('idx_users_username').on(table.githubUsername),
}));

export const userTokens = pgTable('user_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token').notNull(),
  tokenType: varchar('token_type', { length: 50 }).default('oauth'),
  scopes: text('scopes').array(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_user_tokens_user_id').on(table.userId),
}));

export const documentation = pgTable('documentation', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  documentation: text('documentation').notNull(),
  diagram: text('diagram'),
  code: text('code').notNull(),
  language: varchar('language', { length: 50 }).notNull(),
  type: varchar('type', { length: 20 }).default('single'),
  isPublic: boolean('is_public').default(false),
  qualityScore: jsonb('quality_score'),
  batchInfo: jsonb('batch_info'),
  prInfo: jsonb('pr_info'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_documentation_user_id').on(table.userId),
  typeIdx: index('idx_documentation_type').on(table.type),
  createdAtIdx: index('idx_documentation_created_at').on(table.createdAt),
}));

export const userSettings = pgTable('user_settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').unique().references(() => users.id, { onDelete: 'cascade' }),
  claudeModel: varchar('claude_model', { length: 100 }).default('claude-haiku-4-5-20251001'),
  additionalSettings: jsonb('additional_settings').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_user_settings_user_id').on(table.userId),
}));

export const webhookEvents = pgTable('webhook_events', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  prNumber: integer('pr_number'),
  repository: varchar('repository', { length: 255 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  errorMessage: text('error_message'),
  receivedAt: timestamp('received_at').defaultNow(),
  processedAt: timestamp('processed_at'),
}, (table) => ({
  userIdIdx: index('idx_webhook_events_user_id').on(table.userId),
  repositoryIdx: index('idx_webhook_events_repository').on(table.repository),
  receivedAtIdx: index('idx_webhook_events_received_at').on(table.receivedAt),
}));
```

### Step 6: Create Migrations

**File**: `drizzle.config.ts` (root of backend)
```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

**Generate and run migrations:**
```bash
# Generate migration
npx drizzle-kit generate:pg

# Run migrations
npx drizzle-kit push:pg
```

### Step 7: Update Services to Use Database

Will need to refactor:
1. `tokenStorage.ts` → Use `user_tokens` table with encryption
2. `storageService.ts` → Use `documentation` table
3. `settingsService.ts` → Use `user_settings` table
4. `webhook.ts` → Use `webhook_events` table

### Step 8: Update Deployment Script

Add DATABASE_URL to Cloud Run:
```bash
# In deploy-tagged.sh, add:
gcloud run services update codetodocs-backend \
  --region $REGION \
  --set-env-vars "DATABASE_URL=postgresql://user:pass@/codetodocs?host=/cloudsql/PROJECT:REGION:INSTANCE" \
  --add-cloudsql-instances PROJECT:REGION:INSTANCE
```

---

## Security Considerations

### Token Encryption
Use `pgcrypto` extension:

```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt on insert
INSERT INTO user_tokens (access_token)
VALUES (pgp_sym_encrypt('token_value', 'encryption_key'));

-- Decrypt on select
SELECT pgp_sym_decrypt(access_token::bytea, 'encryption_key')
FROM user_tokens;
```

**Or** use application-level encryption with Node.js `crypto` module before storing.

### Environment Variables Needed
```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
DATABASE_ENCRYPTION_KEY=your-32-byte-encryption-key
```

---

## Migration Strategy

### Phase 1: Database Setup (No Downtime)
1. Create Cloud SQL instance
2. Run migrations
3. Deploy code with dual support (in-memory + database)

### Phase 2: Gradual Migration (No Data Loss)
1. Write to both in-memory and database
2. Read from database, fallback to in-memory
3. Monitor for issues

### Phase 3: Full Cutover
1. Remove in-memory storage code
2. Read/write only from database
3. Remove fallback logic

---

## Cost Estimate

### Google Cloud SQL (db-f1-micro)
- **Instance**: ~$7-10/month
- **Storage (10GB SSD)**: ~$1.70/month
- **Backups (7 days)**: ~$0.50/month

**Total**: ~$10-12/month

### Scaling Options
- **db-g1-small**: ~$25/month (more CPU/RAM)
- **db-n1-standard-1**: ~$45/month (production-grade)

---

## Testing Plan

1. **Local Testing**: Use Docker PostgreSQL
   ```bash
   docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=test postgres:15
   ```

2. **Integration Tests**: Test all CRUD operations

3. **Load Testing**: Ensure database handles concurrent requests

4. **Backup/Restore**: Test backup and restore procedures

---

## Rollback Plan

If database implementation fails:
1. Revert to in-memory storage
2. Keep database running but unused
3. Fix issues and retry migration

---

## Next Steps

1. Review and approve this plan
2. Set up Cloud SQL instance
3. Install dependencies
4. Create database schema
5. Implement database service layer
6. Update existing services
7. Test thoroughly
8. Deploy to production

---

## Questions to Answer

1. **Encryption Strategy**: Application-level or database-level (pgcrypto)?
2. **Migration Timing**: Immediate or gradual cutover?
3. **Backup Schedule**: Daily at 3 AM sufficient?
4. **Connection Pooling**: 20 connections enough for Cloud Run?
5. **Read Replicas**: Needed for scale? (Not initially)

---

**Estimated Implementation Time**: 4-6 hours
**Risk Level**: Medium (database changes require careful testing)
**User Impact**: None (if migration is successful)
