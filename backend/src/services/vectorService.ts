import Anthropic from '@anthropic-ai/sdk';

// Simple in-memory vector store (can be replaced with Pinecone, Weaviate, etc.)
interface DocumentChunk {
  id: string;
  docId: string;
  content: string;
  embedding: number[];
  metadata: {
    filePath?: string;
    language?: string;
    section?: string;
    timestamp: string;
  };
}

interface SearchResult {
  chunk: DocumentChunk;
  similarity: number;
}

class VectorStore {
  private chunks: Map<string, DocumentChunk> = new Map();
  private anthropic: Anthropic | null = null;

  private getAnthropic(): Anthropic {
    if (!this.anthropic) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY is not configured');
      }
      this.anthropic = new Anthropic({ apiKey });
    }
    return this.anthropic;
  }

  /**
   * Generate embeddings using Claude (simplified - in production use a dedicated embedding model)
   * For now, we'll use a simple TF-IDF-like approach
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // Simple word frequency based embedding (300 dimensions)
    // In production, use Claude's embedding API or a dedicated model like text-embedding-ada-002
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const wordFreq: Record<string, number> = {};

    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Create a fixed-size vector (300 dimensions)
    const embedding = new Array(300).fill(0);
    const maxFreq = Math.max(...Object.values(wordFreq), 1);

    Object.entries(wordFreq).forEach(([word, freq]) => {
      // Simple hash to map words to dimensions
      const hash = word.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const index = hash % 300;
      embedding[index] += freq / maxFreq;
    });

    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / (magnitude || 1));
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      mag1 += vec1[i] * vec1[i];
      mag2 += vec2[i] * vec2[i];
    }

    const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Split documentation into chunks for better retrieval
   */
  private chunkDocument(content: string, chunkSize: number = 500): string[] {
    const sentences = content.split(/[.!?]\s+/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Index a document by breaking it into chunks and generating embeddings
   */
  async indexDocument(
    docId: string,
    content: string,
    metadata: {
      filePath?: string;
      language?: string;
    }
  ): Promise<void> {
    console.log(`Indexing document: ${docId}`);

    const chunks = this.chunkDocument(content);

    for (let i = 0; i < chunks.length; i++) {
      const chunkId = `${docId}-chunk-${i}`;
      const embedding = await this.generateEmbedding(chunks[i]);

      this.chunks.set(chunkId, {
        id: chunkId,
        docId,
        content: chunks[i],
        embedding,
        metadata: {
          ...metadata,
          section: `Part ${i + 1} of ${chunks.length}`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    console.log(`Indexed ${chunks.length} chunks for document ${docId}`);
  }

  /**
   * Search for relevant document chunks based on a query
   */
  async search(query: string, topK: number = 5): Promise<SearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const results: SearchResult[] = [];

    for (const chunk of this.chunks.values()) {
      const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
      results.push({ chunk, similarity });
    }

    // Sort by similarity and return top K
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Get statistics about the vector store
   */
  getStats() {
    const docIds = new Set([...this.chunks.values()].map(c => c.docId));
    return {
      totalChunks: this.chunks.size,
      totalDocuments: docIds.size,
      avgChunksPerDoc: this.chunks.size / docIds.size,
    };
  }

  /**
   * Clear the vector store
   */
  clear(): void {
    this.chunks.clear();
  }

  /**
   * Remove a specific document from the index
   */
  removeDocument(docId: string): void {
    for (const [chunkId, chunk] of this.chunks.entries()) {
      if (chunk.docId === docId) {
        this.chunks.delete(chunkId);
      }
    }
  }
}

// Export singleton instance
export const vectorStore = new VectorStore();
