import Anthropic from '@anthropic-ai/sdk';
import { vectorStore } from './vectorService';

interface QAResponse {
  answer: string;
  sources: Array<{
    content: string;
    filePath?: string;
    language?: string;
    similarity: number;
  }>;
  relatedQuestions: string[];
  confidence: 'high' | 'medium' | 'low';
}

interface FeedbackData {
  questionId: string;
  helpful: boolean;
  comment?: string;
  timestamp: string;
}

class QAService {
  private anthropic: Anthropic | null = null;
  private conversationHistory: Map<string, Array<{ role: string; content: string }>> = new Map();
  private feedback: FeedbackData[] = [];

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
   * Answer a question using RAG (Retrieval Augmented Generation)
   */
  async answerQuestion(
    question: string,
    conversationId?: string
  ): Promise<QAResponse> {
    console.log(`Processing question: ${question}`);

    // Step 1: Retrieve relevant documentation chunks
    const searchResults = await vectorStore.search(question, 5);

    if (searchResults.length === 0) {
      return {
        answer: "I don't have any documentation indexed yet. Please generate some documentation first, and then I can help answer questions about it.",
        sources: [],
        relatedQuestions: [
          "How do I generate documentation?",
          "What languages are supported?",
          "Can I batch process multiple files?"
        ],
        confidence: 'low',
      };
    }

    // Step 2: Build context from retrieved chunks
    const context = searchResults
      .map((result, idx) => {
        return `[Source ${idx + 1} - ${result.chunk.metadata.filePath || 'Unknown'} (${result.chunk.metadata.language || 'N/A'})]:\n${result.chunk.content}`;
      })
      .join('\n\n---\n\n');

    // Step 3: Get conversation history (if exists)
    const history = conversationId
      ? this.conversationHistory.get(conversationId) || []
      : [];

    // Step 4: Generate answer using Claude
    const prompt = `You are a helpful documentation assistant. Answer the user's question based on the provided documentation context.

**Documentation Context:**
${context}

**User Question:**
${question}

**Instructions:**
1. Answer the question directly and concisely
2. Use code examples from the context when relevant
3. If the context doesn't contain the answer, say so honestly
4. Provide specific file paths or sections when referencing documentation
5. Be conversational and helpful

**Answer:**`;

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user', content: prompt },
    ];

    const response = await this.getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages,
    });

    const answer = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('\n');

    // Step 5: Generate related questions
    const relatedQuestions = await this.generateRelatedQuestions(question, answer, searchResults);

    // Step 6: Determine confidence based on similarity scores
    const avgSimilarity = searchResults.reduce((sum, r) => sum + r.similarity, 0) / searchResults.length;
    const confidence: 'high' | 'medium' | 'low' =
      avgSimilarity > 0.7 ? 'high' : avgSimilarity > 0.4 ? 'medium' : 'low';

    // Step 7: Update conversation history
    if (conversationId) {
      const updatedHistory = [
        ...history,
        { role: 'user', content: question },
        { role: 'assistant', content: answer },
      ];
      this.conversationHistory.set(conversationId, updatedHistory);
    }

    return {
      answer,
      sources: searchResults.map(result => ({
        content: result.chunk.content,
        filePath: result.chunk.metadata.filePath,
        language: result.chunk.metadata.language,
        similarity: result.similarity,
      })),
      relatedQuestions,
      confidence,
    };
  }

  /**
   * Generate related questions based on the current question and answer
   */
  private async generateRelatedQuestions(
    question: string,
    answer: string,
    searchResults: any[]
  ): Promise<string[]> {
    try {
      const prompt = `Based on this Q&A interaction about code documentation, suggest 3 related questions a user might ask next.

**User Question:** ${question}

**Answer Preview:** ${answer.substring(0, 200)}...

**Available Topics:** ${searchResults.map(r => r.chunk.metadata.filePath).join(', ')}

Generate 3 concise, specific follow-up questions. Return ONLY the questions, one per line, without numbering.`;

      const response = await this.getAnthropic().messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as { type: 'text'; text: string }).text)
        .join('\n');

      return text
        .split('\n')
        .filter(q => q.trim().length > 0 && q.includes('?'))
        .slice(0, 3);
    } catch (error) {
      console.error('Error generating related questions:', error);
      return [
        'Can you show me more code examples?',
        'How do I use this in my project?',
        'What are the best practices?',
      ];
    }
  }

  /**
   * Record feedback for a Q&A interaction
   */
  recordFeedback(
    questionId: string,
    helpful: boolean,
    comment?: string
  ): void {
    this.feedback.push({
      questionId,
      helpful,
      comment,
      timestamp: new Date().toISOString(),
    });

    console.log(`Feedback recorded for ${questionId}: ${helpful ? 'Helpful' : 'Not helpful'}`);
  }

  /**
   * Get feedback statistics
   */
  getFeedbackStats() {
    const total = this.feedback.length;
    const helpful = this.feedback.filter(f => f.helpful).length;
    const notHelpful = total - helpful;

    return {
      total,
      helpful,
      notHelpful,
      helpfulPercentage: total > 0 ? Math.round((helpful / total) * 100) : 0,
      recentFeedback: this.feedback.slice(-10),
    };
  }

  /**
   * Clear conversation history for a specific conversation
   */
  clearConversation(conversationId: string): void {
    this.conversationHistory.delete(conversationId);
  }

  /**
   * Get conversation history
   */
  getConversation(conversationId: string) {
    return this.conversationHistory.get(conversationId) || [];
  }
}

// Export singleton instance
export const qaService = new QAService();
