import crypto from 'crypto';
import { QualityScore } from './qualityScoreService';

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
  type?: 'single' | 'batch'; // Type of documentation
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
 * In-memory storage service for documentation
 * Implements LRU cache with max 100 entries per user
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
   * Store a documentation entry
   * Returns the generated ID
   */
  store(
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
  ): string {
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
    };

    // Add to storage (at the end, making it most recent)
    this.storage.set(id, entry);

    // Update user index
    if (!this.userIndex.has(userId)) {
      this.userIndex.set(userId, new Set());
    }
    this.userIndex.get(userId)!.add(id);

    // Enforce per-user limit
    const userDocs = this.getUserDocumentIds(userId);
    if (userDocs.length > this.maxPerUser) {
      const oldestId = userDocs[0]; // Oldest doc for this user
      this.delete(oldestId);
      console.log(`Removed oldest documentation entry for user ${userId}: ${oldestId}`);
    }

    // Enforce global max size
    if (this.storage.size > this.maxSize) {
      const firstKey = this.storage.keys().next().value as string;
      if (firstKey) {
        this.delete(firstKey);
        console.log(`Removed oldest documentation entry (global limit): ${firstKey}`);
      }
    }

    console.log(`Stored documentation: ${id} for user ${userId} (total: ${this.storage.size})`);
    return id;
  }

  /**
   * Retrieve a documentation entry by ID
   */
  get(id: string): StoredDocumentation | undefined {
    const entry = this.storage.get(id);

    if (entry) {
      // Move to end (most recently used)
      this.storage.delete(id);
      this.storage.set(id, entry);
    }

    return entry;
  }

  /**
   * Get all stored documentation entries (most recent first)
   */
  getAll(): StoredDocumentation[] {
    return Array.from(this.storage.values()).reverse();
  }

  /**
   * Get all documentation entries for a specific user (most recent first)
   */
  getAllByUser(userId: number): StoredDocumentation[] {
    return Array.from(this.storage.values())
      .filter(entry => entry.userId === userId)
      .reverse();
  }

  /**
   * Get all public documentation entries (most recent first)
   */
  getAllPublic(): StoredDocumentation[] {
    return Array.from(this.storage.values())
      .filter(entry => entry.isPublic)
      .reverse();
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
   * Delete a documentation entry
   */
  delete(id: string): boolean {
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
    return this.storage.delete(id);
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
  storeBatch(
    userId: number,
    fullRepoDocumentation: string,
    repoUrl: string,
    totalFiles: number,
    successCount: number,
    failedCount: number,
    isPublic: boolean = false
  ): string {
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

    // Enforce per-user limit
    const userDocs = this.getUserDocumentIds(userId);
    if (userDocs.length > this.maxPerUser) {
      const oldestId = userDocs[0];
      this.delete(oldestId);
      console.log(`Removed oldest documentation entry for user ${userId}: ${oldestId}`);
    }

    // Enforce global max size
    if (this.storage.size > this.maxSize) {
      const firstKey = this.storage.keys().next().value as string;
      if (firstKey) {
        this.delete(firstKey);
        console.log(`Removed oldest documentation entry (global limit): ${firstKey}`);
      }
    }

    console.log(`Stored batch documentation: ${id} for user ${userId} (total: ${this.storage.size})`);
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
