import { pgTable, serial, text, integer, timestamp, boolean, varchar, jsonb, uuid, index } from 'drizzle-orm/pg-core';

// Users table - stores GitHub user information
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

// User tokens table - stores encrypted GitHub OAuth tokens
export const userTokens = pgTable('user_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  accessToken: text('access_token').notNull(), // Encrypted
  tokenType: varchar('token_type', { length: 50 }).default('oauth'),
  scopes: text('scopes').array(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_user_tokens_user_id').on(table.userId),
}));

// Documentation table - stores all generated documentation
export const documentation = pgTable('documentation', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  documentation: text('documentation').notNull(),
  diagram: text('diagram'),
  code: text('code').notNull(),
  language: varchar('language', { length: 50 }).notNull(),
  type: varchar('type', { length: 20 }).default('single'),
  isPublic: boolean('is_public').default(false),
  qualityScore: jsonb('quality_score').$type<{
    score: number;
    breakdown: {
      hasOverview: boolean;
      hasParameters: boolean;
      hasReturnValues: boolean;
      hasExamples: boolean;
      hasUsage: boolean;
      hasDependencies: boolean;
      hasNotes: boolean;
      codeBlocksCount: number;
    };
  }>(),
  batchInfo: jsonb('batch_info').$type<{
    repoUrl: string;
    totalFiles: number;
    successCount: number;
    failedCount: number;
  }>(),
  prInfo: jsonb('pr_info').$type<{
    prNumber: number;
    repository: string;
    branch: string;
    author: string;
  }>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_documentation_user_id').on(table.userId),
  typeIdx: index('idx_documentation_type').on(table.type),
  createdAtIdx: index('idx_documentation_created_at').on(table.createdAt),
}));

// User settings table - stores user preferences
export const userSettings = pgTable('user_settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').unique().references(() => users.id, { onDelete: 'cascade' }).notNull(),
  claudeModel: varchar('claude_model', { length: 100 }).default('claude-haiku-4-5-20251001'),
  additionalSettings: jsonb('additional_settings').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_user_settings_user_id').on(table.userId),
}));

// Webhook events table - tracks webhook processing
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

// Type exports for use in application code
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type UserToken = typeof userTokens.$inferSelect;
export type NewUserToken = typeof userTokens.$inferInsert;

export type Documentation = typeof documentation.$inferSelect;
export type NewDocumentation = typeof documentation.$inferInsert;

export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
