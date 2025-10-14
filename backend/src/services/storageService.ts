import crypto from 'crypto';
import { QualityScore } from './qualityScoreService';

export interface StoredDocumentation {
  id: string;
  documentation: string;
  diagram?: string;
  qualityScore?: QualityScore;
  code: string;
  language: string;
  generatedAt: Date;
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
 * Implements LRU cache with max 20 entries
 */
class DocumentationStorage {
  private storage: Map<string, StoredDocumentation>;
  private maxSize: number;

  constructor(maxSize: number = 20) {
    this.storage = new Map();
    this.maxSize = maxSize;
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
    }
  ): string {
    const id = this.generateId();

    const entry: StoredDocumentation = {
      id,
      documentation,
      diagram,
      qualityScore,
      code,
      language,
      generatedAt: new Date(),
      prInfo,
    };

    // Add to storage (at the end, making it most recent)
    this.storage.set(id, entry);

    // Enforce max size (LRU: remove oldest entry)
    if (this.storage.size > this.maxSize) {
      const firstKey = this.storage.keys().next().value as string;
      if (firstKey) {
        this.storage.delete(firstKey);
        console.log(`Removed oldest documentation entry: ${firstKey}`);
      }
    }

    console.log(`Stored documentation: ${id} (total: ${this.storage.size})`);
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
    fullRepoDocumentation: string,
    repoUrl: string,
    totalFiles: number,
    successCount: number,
    failedCount: number
  ): string {
    const id = this.generateId();

    // Extract repo name from URL for language field
    const repoName = repoUrl.split('/').pop() || 'repository';

    const entry: StoredDocumentation = {
      id,
      documentation: fullRepoDocumentation,
      code: '', // Not applicable for batch
      language: 'batch', // Special language indicator
      generatedAt: new Date(),
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

    // Enforce max size (LRU: remove oldest entry)
    if (this.storage.size > this.maxSize) {
      const firstKey = this.storage.keys().next().value as string;
      if (firstKey) {
        this.storage.delete(firstKey);
        console.log(`Removed oldest documentation entry: ${firstKey}`);
      }
    }

    console.log(`Stored batch documentation: ${id} (total: ${this.storage.size})`);
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

// Export singleton instance
export const documentationStorage = new DocumentationStorage(20);
