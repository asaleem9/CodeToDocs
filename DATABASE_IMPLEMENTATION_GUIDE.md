# Database Implementation Guide - Complete Code Reference

This guide contains all code files needed to complete the database implementation for CodeToDocsAI.

---

## Status: What's Already Done ✅

1. ✅ Created `DATABASE_IMPLEMENTATION_PLAN.md`
2. ✅ Created `setup-database.sh` (Cloud SQL setup script)
3. ✅ Installed dependencies: `drizzle-orm`, `pg`, `drizzle-kit`, `@types/pg`
4. ✅ Created `backend/src/db/schema.ts` (database schema)
5. ✅ Created database directory: `backend/src/db/`

---

## Remaining Implementation Steps

### Step 1: Create Database Connection File

**File**: `backend/src/db/connection.ts`

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// Database connection string from environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('DATABASE_URL not set - database features will be disabled');
}

// Create connection pool
export const pool = connectionString ? new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}) : null;

// Create Drizzle instance
export const db = pool ? drizzle(pool) : null;

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  if (!pool) {
    console.log('Database pool not initialized');
    return false;
  }

  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✓ Database connection successful');
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  if (pool) {
    await pool.end();
    console.log('Database connection pool closed');
  }
}
```

---

### Step 2: Create Drizzle Configuration

**File**: `backend/drizzle.config.ts` (in backend root)

```typescript
import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

---

### Step 3: Add Database Scripts to package.json

**File**: `backend/package.json` (add to scripts section)

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate:pg",
    "db:push": "drizzle-kit push:pg",
    "db:studio": "drizzle-kit studio",
    "db:drop": "drizzle-kit drop"
  }
}
```

---

### Step 4: Create Token Encryption Utility

**File**: `backend/src/utils/encryption.ts`

```typescript
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

// Get encryption key from environment or generate a default (NOT for production)
const ENCRYPTION_KEY = process.env.DATABASE_ENCRYPTION_KEY || 'default-key-change-in-production-32b';

/**
 * Derive a key from the password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt a string
 */
export function encrypt(text: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(ENCRYPTION_KEY, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  // Combine salt, iv, tag, and encrypted data
  return salt.toString('hex') + ':' + iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt a string
 */
export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');

  if (parts.length !== 4) {
    throw new Error('Invalid encrypted text format');
  }

  const salt = Buffer.from(parts[0], 'hex');
  const iv = Buffer.from(parts[1], 'hex');
  const tag = Buffer.from(parts[2], 'hex');
  const encrypted = parts[3];

  const key = deriveKey(ENCRYPTION_KEY, salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

---

### Step 5: Create Database-Backed Token Storage Service

**File**: `backend/src/services/tokenStorageDb.ts`

```typescript
import { db } from '../db/connection';
import { users, userTokens, NewUser, NewUserToken } from '../db/schema';
import { eq } from 'drizzle-orm';
import { encrypt, decrypt } from '../utils/encryption';

/**
 * Database-backed token storage service
 * Replaces in-memory tokenStorage with persistent database storage
 */
class TokenStorageDb {
  /**
   * Store or update a user's GitHub OAuth token
   */
  async store(githubId: number, accessToken: string, username: string, email?: string, avatarUrl?: string, name?: string): Promise<void> {
    if (!db) {
      throw new Error('Database not initialized');
    }

    try {
      // Upsert user
      const existingUser = await db.select().from(users).where(eq(users.githubId, githubId)).limit(1);

      let userId: number;

      if (existingUser.length > 0) {
        // Update existing user
        await db.update(users)
          .set({
            githubUsername: username,
            githubEmail: email,
            avatarUrl,
            name,
            updatedAt: new Date(),
          })
          .where(eq(users.githubId, githubId));

        userId = existingUser[0].id;
      } else {
        // Insert new user
        const newUser: NewUser = {
          githubId,
          githubUsername: username,
          githubEmail: email,
          avatarUrl,
          name,
        };

        const inserted = await db.insert(users).values(newUser).returning();
        userId = inserted[0].id;
      }

      // Encrypt token
      const encryptedToken = encrypt(accessToken);

      // Upsert token
      const existingToken = await db.select().from(userTokens).where(eq(userTokens.userId, userId)).limit(1);

      if (existingToken.length > 0) {
        // Update existing token
        await db.update(userTokens)
          .set({
            accessToken: encryptedToken,
            updatedAt: new Date(),
          })
          .where(eq(userTokens.userId, userId));
      } else {
        // Insert new token
        const newToken: NewUserToken = {
          userId,
          accessToken: encryptedToken,
          tokenType: 'oauth',
          scopes: ['user:email', 'repo'],
        };

        await db.insert(userTokens).values(newToken);
      }

      console.log(`✓ Stored OAuth token for user ${userId} (${username}) in database`);
    } catch (error) {
      console.error('Error storing token in database:', error);
      throw error;
    }
  }

  /**
   * Retrieve a user's GitHub OAuth token by GitHub ID
   */
  async getByGithubId(githubId: number): Promise<string | null> {
    if (!db) {
      return null;
    }

    try {
      const result = await db
        .select({
          accessToken: userTokens.accessToken,
        })
        .from(users)
        .innerJoin(userTokens, eq(users.id, userTokens.userId))
        .where(eq(users.githubId, githubId))
        .limit(1);

      if (result.length === 0) {
        console.log(`No OAuth token found for GitHub ID ${githubId}`);
        return null;
      }

      // Decrypt token
      const decryptedToken = decrypt(result[0].accessToken);
      return decryptedToken;
    } catch (error) {
      console.error('Error retrieving token from database:', error);
      return null;
    }
  }

  /**
   * Get token by GitHub username (for webhook lookup)
   */
  async getByUsername(username: string): Promise<string | null> {
    if (!db) {
      return null;
    }

    try {
      const result = await db
        .select({
          accessToken: userTokens.accessToken,
        })
        .from(users)
        .innerJoin(userTokens, eq(users.id, userTokens.userId))
        .where(eq(users.githubUsername, username))
        .limit(1);

      if (result.length === 0) {
        console.log(`No OAuth token found for username ${username}`);
        return null;
      }

      // Decrypt token
      const decryptedToken = decrypt(result[0].accessToken);
      console.log(`Found OAuth token for username ${username}`);
      return decryptedToken;
    } catch (error) {
      console.error('Error retrieving token by username:', error);
      return null;
    }
  }

  /**
   * Remove a user's token (e.g., on logout)
   */
  async remove(githubId: number): Promise<void> {
    if (!db) {
      throw new Error('Database not initialized');
    }

    try {
      const user = await db.select().from(users).where(eq(users.githubId, githubId)).limit(1);

      if (user.length > 0) {
        await db.delete(userTokens).where(eq(userTokens.userId, user[0].id));
        console.log(`Removed OAuth token for GitHub ID ${githubId}`);
      }
    } catch (error) {
      console.error('Error removing token from database:', error);
      throw error;
    }
  }

  /**
   * Get user ID by GitHub ID
   */
  async getUserIdByGithubId(githubId: number): Promise<number | null> {
    if (!db) {
      return null;
    }

    try {
      const result = await db.select({ id: users.id }).from(users).where(eq(users.githubId, githubId)).limit(1);
      return result.length > 0 ? result[0].id : null;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  }
}

// Export singleton instance
export const tokenStorageDb = new TokenStorageDb();
```

---

### Step 6: Update Existing Token Storage to Use Database (Hybrid Approach)

**File**: `backend/src/services/tokenStorage.ts` (UPDATE EXISTING FILE)

Add this at the top after imports:

```typescript
import { tokenStorageDb } from './tokenStorageDb';

// Check if database is available
const USE_DATABASE = !!process.env.DATABASE_URL;
```

Update the `store` method:

```typescript
async store(userId: number, accessToken: string, username: string): Promise<void> {
  // Store in database if available
  if (USE_DATABASE) {
    try {
      await tokenStorageDb.store(userId, accessToken, username);
    } catch (error) {
      console.error('Failed to store token in database, falling back to memory:', error);
    }
  }

  // Also store in memory for backward compatibility
  this.tokens.set(userId, {
    accessToken,
    username,
    storedAt: new Date(),
  });

  console.log(`✓ Stored OAuth token for user ${userId} (${username})`);
}
```

Update the `get` method:

```typescript
async get(userId: number): Promise<string | null> {
  // Try database first if available
  if (USE_DATABASE) {
    try {
      const token = await tokenStorageDb.getByGithubId(userId);
      if (token) return token;
    } catch (error) {
      console.error('Failed to get token from database, falling back to memory:', error);
    }
  }

  // Fall back to in-memory
  const tokenData = this.tokens.get(userId);
  if (!tokenData) {
    console.log(`No OAuth token found for user ${userId}`);
    return null;
  }

  return tokenData.accessToken;
}
```

Update the `getByUsername` method:

```typescript
async getByUsername(username: string): Promise<string | null> {
  // Try database first if available
  if (USE_DATABASE) {
    try {
      const token = await tokenStorageDb.getByUsername(username);
      if (token) return token;
    } catch (error) {
      console.error('Failed to get token by username from database, falling back to memory:', error);
    }
  }

  // Fall back to in-memory
  for (const [userId, tokenData] of this.tokens.entries()) {
    if (tokenData.username.toLowerCase() === username.toLowerCase()) {
      console.log(`Found OAuth token for username ${username} (userId: ${userId})`);
      return tokenData.accessToken;
    }
  }

  console.log(`No OAuth token found for username ${username}`);
  return null;
}
```

---

### Step 7: Create Database-Backed Documentation Storage Service

**File**: `backend/src/services/storageServiceDb.ts`

```typescript
import { db } from '../db/connection';
import { documentation, users, NewDocumentation, Documentation } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { QualityScore } from './qualityScoreService';

/**
 * Database-backed documentation storage service
 */
class StorageServiceDb {
  /**
   * Store a documentation entry
   */
  async store(
    githubId: number,
    documentationText: string,
    code: string,
    language: string,
    diagram?: string,
    qualityScore?: QualityScore,
    prInfo?: {
      prNumber: number;
      repository: string;
      branch: string;
      author: string;
    },
    isPublic: boolean = false
  ): Promise<string> {
    if (!db) {
      throw new Error('Database not initialized');
    }

    try {
      // Get user ID from GitHub ID
      const user = await db.select({ id: users.id }).from(users).where(eq(users.githubId, githubId)).limit(1);

      if (user.length === 0) {
        throw new Error(`User not found for GitHub ID ${githubId}`);
      }

      const userId = user[0].id;

      const newDoc: NewDocumentation = {
        userId,
        documentation: documentationText,
        diagram,
        code,
        language,
        type: 'single',
        isPublic,
        qualityScore: qualityScore as any,
        prInfo: prInfo as any,
      };

      const result = await db.insert(documentation).values(newDoc).returning({ id: documentation.id });

      console.log(`Stored documentation: ${result[0].id} for user ${userId}`);
      return result[0].id;
    } catch (error) {
      console.error('Error storing documentation in database:', error);
      throw error;
    }
  }

  /**
   * Retrieve a documentation entry by ID
   */
  async get(id: string): Promise<Documentation | undefined> {
    if (!db) {
      return undefined;
    }

    try {
      const result = await db.select().from(documentation).where(eq(documentation.id, id)).limit(1);
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error('Error retrieving documentation from database:', error);
      return undefined;
    }
  }

  /**
   * Get all documentation entries for a specific user (most recent first)
   */
  async getAllByUser(githubId: number): Promise<Documentation[]> {
    if (!db) {
      return [];
    }

    try {
      const user = await db.select({ id: users.id }).from(users).where(eq(users.githubId, githubId)).limit(1);

      if (user.length === 0) {
        return [];
      }

      const result = await db
        .select()
        .from(documentation)
        .where(eq(documentation.userId, user[0].id))
        .orderBy(desc(documentation.createdAt));

      return result;
    } catch (error) {
      console.error('Error retrieving user documentation from database:', error);
      return [];
    }
  }

  /**
   * Get documentation entries by PR info
   */
  async getByPR(repository: string, prNumber: number): Promise<Documentation[]> {
    if (!db) {
      return [];
    }

    try {
      // Query using JSONB contains
      const result = await db
        .select()
        .from(documentation)
        .where(
          and(
            eq(documentation.type, 'single')
            // Note: Drizzle doesn't have great JSONB querying yet, so we filter in-memory
          )
        )
        .orderBy(desc(documentation.createdAt));

      // Filter in-memory for PR info
      return result.filter((doc) => {
        if (!doc.prInfo) return false;
        const prInfo = doc.prInfo as any;
        return prInfo.repository === repository && prInfo.prNumber === prNumber;
      });
    } catch (error) {
      console.error('Error retrieving PR documentation from database:', error);
      return [];
    }
  }

  /**
   * Delete a documentation entry
   */
  async delete(id: string): Promise<boolean> {
    if (!db) {
      return false;
    }

    try {
      await db.delete(documentation).where(eq(documentation.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting documentation from database:', error);
      return false;
    }
  }

  /**
   * Store batch processing result
   */
  async storeBatch(
    githubId: number,
    fullRepoDocumentation: string,
    repoUrl: string,
    totalFiles: number,
    successCount: number,
    failedCount: number,
    isPublic: boolean = false
  ): Promise<string> {
    if (!db) {
      throw new Error('Database not initialized');
    }

    try {
      const user = await db.select({ id: users.id }).from(users).where(eq(users.githubId, githubId)).limit(1);

      if (user.length === 0) {
        throw new Error(`User not found for GitHub ID ${githubId}`);
      }

      const userId = user[0].id;

      const newDoc: NewDocumentation = {
        userId,
        documentation: fullRepoDocumentation,
        code: '',
        language: 'batch',
        type: 'batch',
        isPublic,
        batchInfo: {
          repoUrl,
          totalFiles,
          successCount,
          failedCount,
        } as any,
      };

      const result = await db.insert(documentation).values(newDoc).returning({ id: documentation.id });

      console.log(`Stored batch documentation: ${result[0].id} for user ${userId}`);
      return result[0].id;
    } catch (error) {
      console.error('Error storing batch documentation in database:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const storageServiceDb = new StorageServiceDb();
```

---

### Step 8: Create Database-Backed Settings Service

**File**: `backend/src/services/settingsServiceDb.ts`

```typescript
import { db } from '../db/connection';
import { users, userSettings, NewUserSettings } from '../db/schema';
import { eq } from 'drizzle-orm';

export type ClaudeModel = 'claude-sonnet-4-20250514' | 'claude-haiku-4-5-20251001' | 'claude-3-5-haiku-20241022';

export interface UserSettings {
  claudeModel: ClaudeModel;
}

/**
 * Database-backed settings service
 */
class SettingsServiceDb {
  private defaultSettings: UserSettings = {
    claudeModel: 'claude-haiku-4-5-20251001',
  };

  /**
   * Get settings for a user
   */
  async getSettings(githubId: number): Promise<UserSettings> {
    if (!db) {
      return this.defaultSettings;
    }

    try {
      const user = await db.select({ id: users.id }).from(users).where(eq(users.githubId, githubId)).limit(1);

      if (user.length === 0) {
        return this.defaultSettings;
      }

      const settings = await db.select().from(userSettings).where(eq(userSettings.userId, user[0].id)).limit(1);

      if (settings.length === 0) {
        return this.defaultSettings;
      }

      return {
        claudeModel: settings[0].claudeModel as ClaudeModel,
      };
    } catch (error) {
      console.error('Error getting settings from database:', error);
      return this.defaultSettings;
    }
  }

  /**
   * Get Claude model for a user
   */
  async getClaudeModel(githubId: number): Promise<ClaudeModel> {
    const settings = await this.getSettings(githubId);
    return settings.claudeModel;
  }

  /**
   * Update Claude model preference
   */
  async setClaudeModel(githubId: number, model: ClaudeModel): Promise<void> {
    if (!db) {
      console.warn('Database not initialized, settings not persisted');
      return;
    }

    try {
      const user = await db.select({ id: users.id }).from(users).where(eq(users.githubId, githubId)).limit(1);

      if (user.length === 0) {
        throw new Error(`User not found for GitHub ID ${githubId}`);
      }

      const userId = user[0].id;

      // Upsert settings
      const existing = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);

      if (existing.length > 0) {
        await db.update(userSettings)
          .set({
            claudeModel: model,
            updatedAt: new Date(),
          })
          .where(eq(userSettings.userId, userId));
      } else {
        const newSettings: NewUserSettings = {
          userId,
          claudeModel: model,
        };
        await db.insert(userSettings).values(newSettings);
      }

      console.log(`Claude model updated to: ${model} for user ${userId}`);
    } catch (error) {
      console.error('Error updating settings in database:', error);
      throw error;
    }
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(githubId: number): Promise<UserSettings> {
    await this.setClaudeModel(githubId, this.defaultSettings.claudeModel);
    return this.defaultSettings;
  }
}

// Export singleton instance
export const settingsServiceDb = new SettingsServiceDb();
```

---

### Step 9: Initialize Database Connection in index.ts

**File**: `backend/src/index.ts` (ADD THESE LINES)

Add near the top after imports:

```typescript
import { checkDatabaseConnection, closeDatabaseConnection } from './db/connection';
```

Add after Express app initialization and before routes:

```typescript
// Check database connection
checkDatabaseConnection().catch(err => {
  console.warn('Database connection check failed:', err);
  console.warn('App will run with in-memory storage only');
});
```

Add graceful shutdown handler at the end of the file:

```typescript
// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server and database connection');
  server.close(async () => {
    await closeDatabaseConnection();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server and database connection');
  server.close(async () => {
    await closeDatabaseConnection();
    process.exit(0);
  });
});
```

---

### Step 10: Update Auth Routes to Use Database

**File**: `backend/src/routes/auth.ts` (UPDATE EXISTING FILE)

Find the GitHub callback route and update the token storage part:

```typescript
// OLD CODE:
tokenStorage.store(user.id, accessToken, user.login);

// NEW CODE:
// Store in database with full user info
await tokenStorage.store(
  user.id,
  accessToken,
  user.login,
  user.email,
  user.avatar_url,
  user.name
);
```

---

### Step 11: Update Deploy Script to Include Database

**File**: `deploy-tagged.sh` (UPDATE EXISTING FILE)

Find the backend deployment section and update it:

```bash
# Deploy Backend
echo -e "${YELLOW}Step 3: Deploying backend to Cloud Run${NC}"
echo -e "${BLUE}This may take 5-10 minutes...${NC}"

cd backend

# Build secrets string (ADD DATABASE_URL)
BACKEND_SECRETS="ANTHROPIC_API_KEY=${SECRET_NAME}:latest,GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID_SECRET}:latest,GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET_SECRET}:latest,SESSION_SECRET=${SESSION_SECRET_NAME}:latest,DATABASE_URL=codetodocs-database-url:latest"

# Get Cloud SQL connection name
INSTANCE_CONNECTION_NAME=$(gcloud sql instances describe codetodocs-db --project=$PROJECT_ID --format='value(connectionName)' 2>/dev/null || echo "")

gcloud run deploy codetodocs-backend \
  --source . \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production" \
  --set-secrets "$BACKEND_SECRETS" \
  --add-cloudsql-instances "$INSTANCE_CONNECTION_NAME" \
  --update-labels="${TAG_KEY}=${TAG_VALUE}" \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --min-instances 0 \
  --timeout 300 \
  --project=$PROJECT_ID \
  --quiet
```

---

### Step 12: Add .env.example for Local Development

**File**: `backend/.env.example`

```bash
# Anthropic API
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Session
SESSION_SECRET=your_session_secret_here

# Database (Local PostgreSQL)
DATABASE_URL=postgresql://codetodocs-user:password@localhost:5432/codetodocs

# Database Encryption Key (32 bytes)
DATABASE_ENCRYPTION_KEY=change-this-to-a-32-byte-random-string

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# GitHub Token (optional fallback)
GITHUB_TOKEN=ghp_your_github_token_here
```

---

## Deployment Steps

### 1. Run Database Setup Script

```bash
cd /Users/ali.saleem/Desktop/onemore/CodeToDocsAI
chmod +x setup-database.sh
./setup-database.sh
```

This will:
- Create Cloud SQL PostgreSQL instance
- Create database and user
- Store DATABASE_URL in Secret Manager

### 2. Push Database Schema

```bash
cd backend

# Generate migration files
npm run db:generate

# Push schema to database
npm run db:push
```

### 3. Update Local .env

Copy the DATABASE_URL from the setup script output to your `backend/.env` file.

### 4. Test Local Development

```bash
cd backend
npm run dev
```

Check logs for:
- `✓ Database connection successful`
- `✓ Stored OAuth token for user X in database`

### 5. Deploy to Production

```bash
cd /Users/ali.saleem/Desktop/onemore/CodeToDocsAI
./deploy-tagged.sh
```

The deploy script will now:
- Include DATABASE_URL secret
- Connect Cloud Run to Cloud SQL instance
- Enable persistent storage

---

## Testing Database Persistence

### Test 1: Token Persistence

1. Login with GitHub OAuth
2. Note your user ID from logs
3. Restart backend server
4. Check if you're still authenticated
5. Try webhook - it should find your token

### Test 2: Documentation Persistence

1. Generate some documentation
2. Restart backend server
3. Check History page - docs should still be there

### Test 3: Settings Persistence

1. Change Claude model in Settings
2. Restart backend server
3. Check Settings page - model choice should persist

---

## Rollback Plan

If database implementation causes issues:

1. **Set environment variable to disable database**:
   ```bash
   # In Cloud Run
   gcloud run services update codetodocs-backend \
     --region us-central1 \
     --remove-env-vars DATABASE_URL
   ```

2. **App will automatically fall back to in-memory storage**

3. **Fix issues and re-enable**:
   ```bash
   gcloud run services update codetodocs-backend \
     --region us-central1 \
     --set-secrets "DATABASE_URL=codetodocs-database-url:latest"
   ```

---

## Troubleshooting

### Database connection fails

```bash
# Check Cloud SQL instance status
gcloud sql instances describe codetodocs-db --project YOUR_PROJECT

# Test connection locally
gcloud sql connect codetodocs-db --user=codetodocs-user --database=codetodocs
```

### Tokens not persisting

Check logs for:
- "Database not initialized" - DATABASE_URL not set
- "Failed to store token in database" - Connection issue
- Check encryption key is set

### Documentation not appearing in History

- Check user is authenticated
- Check githubId is being passed correctly
- Query database directly to verify data:

```sql
SELECT * FROM users;
SELECT * FROM documentation WHERE user_id = YOUR_USER_ID;
```

---

## Performance Optimization

### Connection Pooling

Already configured with:
- Max 20 connections
- 30s idle timeout
- 2s connection timeout

### Indexes

All important queries have indexes:
- `users.github_id`
- `users.github_username`
- `user_tokens.user_id`
- `documentation.user_id`
- `documentation.created_at`

### Caching (Future)

Consider adding Redis for:
- Session storage
- Frequently accessed settings
- Token caching (with encryption)

---

## Security Checklist

- ✅ Tokens encrypted at rest (AES-256-GCM)
- ✅ SSL/TLS for database connections
- ✅ Secret Manager for credentials
- ✅ No tokens in logs
- ✅ Connection pooling with timeouts
- ✅ Prepared statements (Drizzle ORM)
- ✅ User isolation (FK constraints)

---

## Monitoring

### Database Metrics to Watch

```bash
# Cloud SQL Operations
gcloud sql operations list --instance=codetodocs-db

# CPU/Memory usage
gcloud sql instances describe codetodocs-db --format="value(settings.tier)"
```

### Query Performance

```sql
-- Enable query stats extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## Cost Optimization

### Current Setup (db-f1-micro)
- **Cost**: ~$10-12/month
- **vCPU**: 0.6 shared
- **RAM**: 614 MB
- **Storage**: 10 GB SSD

### When to Upgrade
- Upgrade to `db-g1-small` ($25/month) when:
  - > 100 concurrent users
  - Query latency > 500ms
  - Connection pool exhausted

---

## Next Steps After Implementation

1. **Set up automated backups** (already configured - 3 AM daily)
2. **Enable query logging** for debugging
3. **Add database health endpoint** (`/api/health/database`)
4. **Monitor query performance**
5. **Consider read replicas** for scale (future)
6. **Add database migrations** for schema changes
7. **Implement soft deletes** for documentation (add `deleted_at` column)

---

## Summary

After completing all steps:

✅ PostgreSQL database on Cloud SQL
✅ Encrypted token storage
✅ Persistent documentation history
✅ User settings storage
✅ Webhook event tracking
✅ Graceful degradation (falls back to in-memory)
✅ Production-ready deployment

**Estimated Total Implementation Time**: 2-3 hours

---

## Questions & Support

If you encounter issues:

1. Check logs: `gcloud run services logs read codetodocs-backend --region us-central1`
2. Test database connection: `npm run db:studio` (Drizzle Studio UI)
3. Verify secrets: `gcloud secrets versions access latest --secret="codetodocs-database-url"`
4. Review this guide's Troubleshooting section

---

**Good luck with the implementation!** 🚀
