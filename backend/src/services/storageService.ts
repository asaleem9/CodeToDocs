import crypto from 'crypto';
import { QualityScore } from './qualityScoreService';
import { storageServiceDb } from './storageServiceDb';
import { tokenStorageDb } from './tokenStorageDb';

export interface StoredDocumentation {
  id: string;
  userId: number; // GitHub user ID
  documentation: string;
  diagram?: string;
  qualityScore?: QualityScore;
  code: string;
  language: string;
  createdAt: Date; // When document was created
  updatedAt: Date; // When document was last updated
  isPublic: boolean; // Whether document is publicly viewable
  type?: 'single' | 'batch' | 'pr'; // Type of documentation
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
 * Hybrid Database + In-Memory storage service for documentation
 * - Database: Persistent storage for all documentation
 * - Memory: LRU cache for fast access (max 100 per user, 200 global)
 */
class DocumentationStorage {
  private storage: Map<string, StoredDocumentation>;
  private userIndex: Map<number, Set<string>>; // userId -> Set of document IDs
  private maxSize: number;
  private maxPerUser: number;

  constructor(maxSize: number = 200, maxPerUser: number = 100) {
    this.storage = new Map();
    this.userIndex = new Map();
    this.maxSize = maxSize;
    this.maxPerUser = maxPerUser;
  }

  /**
   * Generate a unique ID for documentation
   */
  private generateId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Resolve the DB user row for a storage-scoped user id. Anonymous sessions
   * use negative ids and never go through OAuth, so they'd have no users row
   * and their docs would never persist — ensure a synthetic one first. Real
   * (positive) ids and the legacy `0` sentinel are left alone: real users
   * already have a row from OAuth, and `0` has never had one.
   */
  private async resolveDbUser(userId: number) {
    if (userId < 0) {
      await tokenStorageDb.ensureUser(userId, `anon-${Math.abs(userId)}`);
    }
    return tokenStorageDb.getUserInfoById(userId);
  }

  /**
   * Store a documentation entry
   * Returns the generated ID
   */
  async store(
    userId: number,
    documentation: string,
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
    const id = this.generateId();
    const now = new Date();

    const entry: StoredDocumentation = {
      id,
      userId,
      documentation,
      diagram,
      qualityScore,
      code,
      language,
      createdAt: now,
      updatedAt: now,
      isPublic,
      prInfo,
      type: prInfo ? 'pr' : 'single',
    };

    // Add to storage (at the end, making it most recent)
    this.storage.set(id, entry);

    // Update user index
    if (!this.userIndex.has(userId)) {
      this.userIndex.set(userId, new Set());
    }
    this.userIndex.get(userId)!.add(id);

    // Enforce per-user limit (in-memory only)
    const userDocs = this.getUserDocumentIds(userId);
    if (userDocs.length > this.maxPerUser) {
      const oldestId = userDocs[0]; // Oldest doc for this user
      this.storage.delete(oldestId); // Only remove from memory, not database
      console.log(`Removed oldest documentation entry from memory for user ${userId}: ${oldestId}`);
    }

    // Enforce global max size (in-memory only)
    if (this.storage.size > this.maxSize) {
      const firstKey = this.storage.keys().next().value as string;
      if (firstKey) {
        this.storage.delete(firstKey); // Only remove from memory, not database
        console.log(`Removed oldest documentation entry from memory (global limit): ${firstKey}`);
      }
    }

    console.log(`Stored documentation in memory: ${id} for user ${userId} (total: ${this.storage.size})`);

    // Also store in database
    try {
      const user = await this.resolveDbUser(userId);
      if (user) {
        await storageServiceDb.storeDocumentation(user.githubUsername, {
          documentation,
          diagram,
          code,
          language,
          qualityScore,
          prInfo,
          isPublic,
          type: prInfo ? 'pr' : 'single',
        });
      }
    } catch (error) {
      console.error('Failed to store documentation in database:', error);
    }

    return id;
  }

  /**
   * Retrieve a documentation entry by ID
   * Checks database first, then falls back to memory
   */
  async get(id: string): Promise<StoredDocumentation | undefined> {
    // Check memory first (fast path)
    let entry = this.storage.get(id);

    if (entry) {
      // Move to end (most recently used)
      this.storage.delete(id);
      this.storage.set(id, entry);
      return entry;
    }

    // Try database
    try {
      const dbDoc = await storageServiceDb.getDocumentation(id);
      if (dbDoc) {
        // Convert database format to storage format. Preserve the real owner id
        // so access-control checks (canAccessDocument / delete) behave correctly.
        const converted: StoredDocumentation = {
          id: dbDoc.id,
          userId: dbDoc.ownerGithubId ?? 0,
          documentation: dbDoc.documentation,
          diagram: dbDoc.diagram,
          qualityScore: dbDoc.qualityScore,
          code: dbDoc.code,
          language: dbDoc.language,
          createdAt: dbDoc.timestamp,
          updatedAt: dbDoc.timestamp,
          isPublic: dbDoc.isPublic || false,
          type: dbDoc.type,
          batchInfo: dbDoc.batchInfo,
          prInfo: dbDoc.prInfo,
        };

        // Cache it in memory
        this.storage.set(id, converted);
        return converted;
      }
    } catch (error) {
      console.error('Error fetching document from database:', error);
    }

    return undefined;
  }

  /**
   * Get all stored documentation entries (most recent first)
   */
  getAll(): StoredDocumentation[] {
    return Array.from(this.storage.values()).reverse();
  }

  /**
   * Get all documentation entries for a specific user (most recent first)
   * Loads from database and merges with memory cache
   */
  async getAllByUser(userId: number): Promise<StoredDocumentation[]> {
    // Get from memory first
    const memoryDocs = Array.from(this.storage.values())
      .filter(entry => entry.userId === userId);

    // Try to get from database
    try {
      const user = await this.resolveDbUser(userId);
      if (user) {
        const dbDocs = await storageServiceDb.getUserDocumentation(user.githubUsername);

        // Convert database docs to storage format
        const convertedDocs: StoredDocumentation[] = dbDocs.map(doc => ({
          id: doc.id,
          userId: userId,
          documentation: doc.documentation,
          diagram: doc.diagram,
          qualityScore: doc.qualityScore,
          code: doc.code,
          language: doc.language,
          createdAt: doc.timestamp,
          updatedAt: doc.timestamp,
          isPublic: doc.isPublic || false,
          type: doc.type,
          batchInfo: doc.batchInfo,
          prInfo: doc.prInfo,
        }));

        // Merge database docs with memory docs (deduplicate by ID)
        const allDocs = new Map<string, StoredDocumentation>();

        // Add database docs first
        convertedDocs.forEach(doc => allDocs.set(doc.id, doc));

        // Override with memory docs (they're more recent/up-to-date)
        memoryDocs.forEach(doc => allDocs.set(doc.id, doc));

        // Return sorted by creation date (most recent first)
        return Array.from(allDocs.values())
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
    } catch (error) {
      console.error('Error fetching user documentation from database:', error);
    }

    // Fall back to memory only
    return memoryDocs.reverse();
  }

  /**
   * Get all public documentation entries (most recent first)
   * Loads from database and merges with memory cache
   */
  async getAllPublic(): Promise<StoredDocumentation[]> {
    // Get from memory first
    const memoryDocs = Array.from(this.storage.values())
      .filter(entry => entry.isPublic);

    // Try to get from database
    try {
      const dbDocs = await storageServiceDb.getPublicDocumentation();

      // Convert database docs to storage format
      const convertedDocs: StoredDocumentation[] = dbDocs.map(doc => ({
        id: doc.id,
        userId: 0, // Public docs don't need userId for display
        documentation: doc.documentation,
        diagram: doc.diagram,
        qualityScore: doc.qualityScore,
        code: doc.code,
        language: doc.language,
        createdAt: doc.timestamp,
        updatedAt: doc.timestamp,
        isPublic: true,
        type: doc.type,
        batchInfo: doc.batchInfo,
        prInfo: doc.prInfo,
      }));

      // Merge database docs with memory docs (deduplicate by ID)
      const allDocs = new Map<string, StoredDocumentation>();

      // Add database docs first
      convertedDocs.forEach(doc => allDocs.set(doc.id, doc));

      // Override with memory docs (they're more recent/up-to-date)
      memoryDocs.forEach(doc => allDocs.set(doc.id, doc));

      // Return sorted by creation date (most recent first)
      return Array.from(allDocs.values())
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error fetching public documentation from database:', error);
    }

    // Fall back to memory only
    return memoryDocs.reverse();
  }

  /**
   * Get document IDs for a user (oldest first)
   */
  private getUserDocumentIds(userId: number): string[] {
    const userIds = this.userIndex.get(userId);
    if (!userIds) return [];

    return Array.from(this.storage.entries())
      .filter(([id, _]) => userIds.has(id))
      .map(([id, _]) => id);
  }

  /**
   * Get documentation entries by PR info
   */
  getByPR(repository: string, prNumber: number): StoredDocumentation[] {
    return Array.from(this.storage.values()).filter(
      (entry) =>
        entry.prInfo?.repository === repository &&
        entry.prInfo?.prNumber === prNumber
    );
  }

  /**
   * Delete a documentation entry from both the in-memory cache and the database.
   * Returns true if it was removed from either store.
   */
  async delete(id: string): Promise<boolean> {
    const entry = this.storage.get(id);
    if (entry) {
      // Remove from user index
      const userDocs = this.userIndex.get(entry.userId);
      if (userDocs) {
        userDocs.delete(id);
        if (userDocs.size === 0) {
          this.userIndex.delete(entry.userId);
        }
      }
    }

    const memoryDeleted = this.storage.delete(id);

    // Also remove from the database (owner-scoped). We resolve the owner's
    // GitHub username from the cached entry's userId (GitHub numeric id).
    let dbDeleted = false;
    try {
      if (entry) {
        const user = await this.resolveDbUser(entry.userId);
        if (user) {
          dbDeleted = await storageServiceDb.deleteDocumentation(id, user.githubUsername);
        }
      }
    } catch (error) {
      console.error('Failed to delete documentation from database:', error);
    }

    return memoryDeleted || dbDeleted;
  }

  /**
   * Update a document's public/private visibility in memory and the database.
   * Returns true if the document existed in either store.
   */
  async setVisibility(id: string, isPublic: boolean): Promise<boolean> {
    const entry = this.storage.get(id);
    if (entry) {
      entry.isPublic = isPublic;
      entry.updatedAt = new Date();
    }

    let dbUpdated = false;
    try {
      if (entry) {
        const user = await this.resolveDbUser(entry.userId);
        if (user) {
          dbUpdated = await storageServiceDb.updateVisibility(id, user.githubUsername, isPublic);
        }
      }
    } catch (error) {
      console.error('Failed to update visibility in database:', error);
    }

    return entry !== undefined || dbUpdated;
  }

  /**
   * Get storage statistics
   */
  getStats() {
    return {
      total: this.storage.size,
      maxSize: this.maxSize,
      usage: `${this.storage.size}/${this.maxSize}`,
      entries: this.storage.size,
    };
  }

  /**
   * Store batch processing result
   * Returns the generated ID
   */
  async storeBatch(
    userId: number,
    fullRepoDocumentation: string,
    repoUrl: string,
    totalFiles: number,
    successCount: number,
    failedCount: number,
    isPublic: boolean = false
  ): Promise<string> {
    const id = this.generateId();
    const now = new Date();

    const entry: StoredDocumentation = {
      id,
      userId,
      documentation: fullRepoDocumentation,
      code: '', // Not applicable for batch
      language: 'batch', // Special language indicator
      createdAt: now,
      updatedAt: now,
      isPublic,
      type: 'batch',
      batchInfo: {
        repoUrl,
        totalFiles,
        successCount,
        failedCount,
      },
    };

    // Add to storage (at the end, making it most recent)
    this.storage.set(id, entry);

    // Update user index
    if (!this.userIndex.has(userId)) {
      this.userIndex.set(userId, new Set());
    }
    this.userIndex.get(userId)!.add(id);

    // Enforce per-user limit (in-memory only)
    const userDocs = this.getUserDocumentIds(userId);
    if (userDocs.length > this.maxPerUser) {
      const oldestId = userDocs[0];
      this.storage.delete(oldestId); // Only remove from memory
      console.log(`Removed oldest documentation entry from memory for user ${userId}: ${oldestId}`);
    }

    // Enforce global max size (in-memory only)
    if (this.storage.size > this.maxSize) {
      const firstKey = this.storage.keys().next().value as string;
      if (firstKey) {
        this.storage.delete(firstKey); // Only remove from memory
        console.log(`Removed oldest documentation entry from memory (global limit): ${firstKey}`);
      }
    }

    console.log(`Stored batch documentation in memory: ${id} for user ${userId} (total: ${this.storage.size})`);

    // Also store in database
    try {
      const user = await this.resolveDbUser(userId);
      if (user) {
        await storageServiceDb.storeDocumentation(user.githubUsername, {
          documentation: fullRepoDocumentation,
          code: '',
          language: 'batch',
          type: 'batch',
          batchInfo: {
            repoUrl,
            totalFiles,
            successCount,
            failedCount,
          },
          isPublic,
        });
      }
    } catch (error) {
      console.error('Failed to store batch documentation in database:', error);
    }

    return id;
  }

  /**
   * Clear all storage
   */
  clear(): void {
    this.storage.clear();
    console.log('Cleared all stored documentation');
  }
}

// Export singleton instance (200 total docs, max 100 per user)
export const documentationStorage = new DocumentationStorage(200, 100);
