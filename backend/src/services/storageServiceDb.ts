import { db } from '../db/connection';
import { documentation, users, type Documentation, type NewDocumentation } from '../db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';

export interface DocumentationEntry {
  id: string;
  documentation: string;
  diagram?: string;
  code: string;
  language: string;
  timestamp: Date;
  type?: 'single' | 'batch' | 'pr';
  isPublic?: boolean;
  qualityScore?: {
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
  };
  batchInfo?: {
    repoUrl: string;
    totalFiles: number;
    successCount: number;
    failedCount: number;
  };
  prInfo?: {
    prNumber: number;
    repository: string;
    branch: string;
    author: string;
  };
}

/**
 * Database-backed documentation storage service
 * Stores all generated documentation with full history
 */
export class StorageServiceDb {
  /**
   * Store a new documentation entry
   */
  async storeDocumentation(
    githubUsername: string,
    doc: Omit<DocumentationEntry, 'id' | 'timestamp'>
  ): Promise<string> {
    if (!db) {
      throw new Error('Database not initialized');
    }

    try {
      // Find user
      const user = await db.query.users.findFirst({
        where: eq(users.githubUsername, githubUsername),
      });

      if (!user) {
        throw new Error(`User not found: ${githubUsername}`);
      }

      // Insert documentation
      const [newDoc] = await db.insert(documentation).values({
        userId: user.id,
        documentation: doc.documentation,
        diagram: doc.diagram,
        code: doc.code,
        language: doc.language,
        type: doc.type || 'single',
        isPublic: doc.isPublic || false,
        qualityScore: doc.qualityScore as any,
        batchInfo: doc.batchInfo as any,
        prInfo: doc.prInfo as any,
      }).returning();

      console.log(`✓ Documentation stored for user: ${githubUsername} (id: ${newDoc.id})`);
      return newDoc.id;
    } catch (error) {
      console.error('Error storing documentation:', error);
      throw error;
    }
  }

  /**
   * Get all documentation for a user
   */
  async getUserDocumentation(githubUsername: string, limit = 100): Promise<DocumentationEntry[]> {
    if (!db) {
      return [];
    }

    try {
      // Find user
      const user = await db.query.users.findFirst({
        where: eq(users.githubUsername, githubUsername),
      });

      if (!user) {
        return [];
      }

      // Get documentation
      const docs = await db.query.documentation.findMany({
        where: eq(documentation.userId, user.id),
        orderBy: [desc(documentation.createdAt)],
        limit,
      });

      return docs.map(doc => ({
        id: doc.id,
        documentation: doc.documentation,
        diagram: doc.diagram || undefined,
        code: doc.code,
        language: doc.language,
        timestamp: doc.createdAt!,
        type: (doc.type as 'single' | 'batch' | 'pr') || 'single',
        isPublic: doc.isPublic || false,
        qualityScore: doc.qualityScore as any,
        batchInfo: doc.batchInfo as any,
        prInfo: doc.prInfo as any,
      }));
    } catch (error) {
      console.error('Error getting user documentation:', error);
      return [];
    }
  }

  /**
   * Get a specific documentation entry by ID
   */
  async getDocumentation(id: string): Promise<DocumentationEntry | undefined> {
    if (!db) {
      return undefined;
    }

    try {
      const doc = await db.query.documentation.findFirst({
        where: eq(documentation.id, id),
      });

      if (!doc) {
        return undefined;
      }

      return {
        id: doc.id,
        documentation: doc.documentation,
        diagram: doc.diagram || undefined,
        code: doc.code,
        language: doc.language,
        timestamp: doc.createdAt!,
        type: (doc.type as 'single' | 'batch' | 'pr') || 'single',
        isPublic: doc.isPublic || false,
        qualityScore: doc.qualityScore as any,
        batchInfo: doc.batchInfo as any,
        prInfo: doc.prInfo as any,
      };
    } catch (error) {
      console.error('Error getting documentation:', error);
      return undefined;
    }
  }

  /**
   * Delete a documentation entry
   */
  async deleteDocumentation(id: string, githubUsername: string): Promise<boolean> {
    if (!db) {
      return false;
    }

    try {
      // Find user
      const user = await db.query.users.findFirst({
        where: eq(users.githubUsername, githubUsername),
      });

      if (!user) {
        return false;
      }

      // Delete documentation (only if owned by user)
      const result = await db.delete(documentation)
        .where(and(
          eq(documentation.id, id),
          eq(documentation.userId, user.id)
        ))
        .returning();

      if (result.length > 0) {
        console.log(`✓ Documentation deleted: ${id}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error deleting documentation:', error);
      return false;
    }
  }

  /**
   * Get documentation count for a user
   */
  async getDocumentationCount(githubUsername: string): Promise<number> {
    if (!db) {
      return 0;
    }

    try {
      // Find user
      const user = await db.query.users.findFirst({
        where: eq(users.githubUsername, githubUsername),
      });

      if (!user) {
        return 0;
      }

      // Count documentation
      const result = await db.select({ count: sql<number>`count(*)` })
        .from(documentation)
        .where(eq(documentation.userId, user.id));

      return Number(result[0]?.count || 0);
    } catch (error) {
      console.error('Error getting documentation count:', error);
      return 0;
    }
  }

  /**
   * Get all public documentation (for discovery/showcase)
   */
  async getPublicDocumentation(limit = 50): Promise<DocumentationEntry[]> {
    if (!db) {
      return [];
    }

    try {
      const docs = await db.query.documentation.findMany({
        where: eq(documentation.isPublic, true),
        orderBy: [desc(documentation.createdAt)],
        limit,
      });

      return docs.map(doc => ({
        id: doc.id,
        documentation: doc.documentation,
        diagram: doc.diagram || undefined,
        code: doc.code,
        language: doc.language,
        timestamp: doc.createdAt!,
        type: (doc.type as 'single' | 'batch' | 'pr') || 'single',
        isPublic: true,
        qualityScore: doc.qualityScore as any,
        batchInfo: doc.batchInfo as any,
        prInfo: doc.prInfo as any,
      }));
    } catch (error) {
      console.error('Error getting public documentation:', error);
      return [];
    }
  }

  /**
   * Update documentation visibility
   */
  async updateVisibility(id: string, githubUsername: string, isPublic: boolean): Promise<boolean> {
    if (!db) {
      return false;
    }

    try {
      // Find user
      const user = await db.query.users.findFirst({
        where: eq(users.githubUsername, githubUsername),
      });

      if (!user) {
        return false;
      }

      // Update visibility (only if owned by user)
      const result = await db.update(documentation)
        .set({ isPublic, updatedAt: new Date() })
        .where(and(
          eq(documentation.id, id),
          eq(documentation.userId, user.id)
        ))
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error('Error updating visibility:', error);
      return false;
    }
  }
}

// Export singleton instance
export const storageServiceDb = new StorageServiceDb();
