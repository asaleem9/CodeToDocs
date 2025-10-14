import express, { Request, Response } from 'express';
import { qaService } from '../services/qaService';
import { vectorStore } from '../services/vectorService';

const router = express.Router();

/**
 * POST /api/qa/ask
 * Ask a question about the documentation
 */
router.post('/ask', async (req: Request, res: Response) => {
  try {
    const { question, conversationId } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const response = await qaService.answerQuestion(question, conversationId);

    res.json({
      success: true,
      ...response,
    });
  } catch (error: any) {
    console.error('Error in Q&A:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/qa/feedback
 * Record feedback for a Q&A interaction
 */
router.post('/feedback', (req: Request, res: Response) => {
  try {
    const { questionId, helpful, comment } = req.body;

    if (!questionId) {
      return res.status(400).json({ error: 'Question ID is required' });
    }

    if (typeof helpful !== 'boolean') {
      return res.status(400).json({ error: 'Helpful flag (boolean) is required' });
    }

    qaService.recordFeedback(questionId, helpful, comment);

    res.json({
      success: true,
      message: 'Feedback recorded',
    });
  } catch (error: any) {
    console.error('Error recording feedback:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/qa/feedback/stats
 * Get feedback statistics
 */
router.get('/feedback/stats', (req: Request, res: Response) => {
  try {
    const stats = qaService.getFeedbackStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Error getting feedback stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/qa/index
 * Index a document for Q&A
 */
router.post('/index', async (req: Request, res: Response) => {
  try {
    const { docId, content, metadata } = req.body;

    if (!docId || !content) {
      return res.status(400).json({
        error: 'docId and content are required',
      });
    }

    await vectorStore.indexDocument(docId, content, metadata || {});

    res.json({
      success: true,
      message: `Document ${docId} indexed successfully`,
    });
  } catch (error: any) {
    console.error('Error indexing document:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/qa/stats
 * Get vector store statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = vectorStore.getStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/qa/conversation/:conversationId
 * Clear a conversation history
 */
router.delete('/conversation/:conversationId', (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    qaService.clearConversation(conversationId);

    res.json({
      success: true,
      message: 'Conversation cleared',
    });
  } catch (error: any) {
    console.error('Error clearing conversation:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/qa/index/:docId
 * Remove a document from the index
 */
router.delete('/index/:docId', (req: Request, res: Response) => {
  try {
    const { docId } = req.params;
    vectorStore.removeDocument(docId);

    res.json({
      success: true,
      message: `Document ${docId} removed from index`,
    });
  } catch (error: any) {
    console.error('Error removing document:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
