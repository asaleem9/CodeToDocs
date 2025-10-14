import { Router, Request, Response } from 'express';
import { generateDocumentation } from '../services/llmService';
import { documentationStorage } from '../services/storageService';
import { QualityScore } from '../services/qualityScoreService';
import { vectorStore } from '../services/vectorService';

const router = Router();

interface GenerateRequest {
  code: string;
  language: string;
}

interface GenerateResponse {
  id: string;
  documentation: string;
  diagram?: string;
  qualityScore?: QualityScore;
  timestamp: Date;
}

interface ErrorResponse {
  error: string;
  timestamp: Date;
}

/**
 * POST /api/generate
 * Generates documentation for the provided code
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { code, language } = req.body as GenerateRequest;

    // Validate request body
    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        error: 'Code is required and must be a string',
        timestamp: new Date(),
      } as ErrorResponse);
    }

    if (!language || typeof language !== 'string') {
      return res.status(400).json({
        error: 'Language is required and must be a string',
        timestamp: new Date(),
      } as ErrorResponse);
    }

    // Call the LLM service
    const result = await generateDocumentation(code, language);

    // Handle service errors
    if (!result.success) {
      const statusCode = result.error?.includes('API key') ? 500 : 400;
      return res.status(statusCode).json({
        error: result.error || 'Failed to generate documentation',
        timestamp: new Date(),
      } as ErrorResponse);
    }

    // Store the documentation
    const id = documentationStorage.store(
      result.documentation,
      code,
      language,
      result.diagram,
      result.qualityScore
    );

    // Auto-index the documentation for Q&A
    try {
      await vectorStore.indexDocument(id, result.documentation, {
        language,
        filePath: `Generated documentation (${language})`,
      });
      console.log(`Stored documentation: ${id} (total: ${documentationStorage.getAll().length})`);
    } catch (indexError) {
      console.error('Failed to index documentation for Q&A:', indexError);
      // Don't fail the request if indexing fails
    }

    // Return successful response with ID
    return res.status(200).json({
      id,
      documentation: result.documentation,
      diagram: result.diagram,
      qualityScore: result.qualityScore,
      timestamp: new Date(),
    } as GenerateResponse);
  } catch (error) {
    console.error('Error in /api/generate endpoint:', error);

    return res.status(500).json({
      error: 'Internal server error',
      timestamp: new Date(),
    } as ErrorResponse);
  }
});

/**
 * GET /api/documentation
 * Get all stored documentation entries
 */
router.get('/documentation', (req: Request, res: Response) => {
  try {
    const docs = documentationStorage.getAll();
    const stats = documentationStorage.getStats();

    return res.status(200).json({
      total: docs.length,
      stats,
      documentation: docs,
    });
  } catch (error) {
    console.error('Error retrieving documentation:', error);
    return res.status(500).json({
      error: 'Failed to retrieve documentation',
      timestamp: new Date(),
    } as ErrorResponse);
  }
});

/**
 * GET /api/documentation/:id
 * Get a specific documentation entry by ID
 */
router.get('/documentation/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const doc = documentationStorage.get(id);

    if (!doc) {
      return res.status(404).json({
        error: 'Documentation not found',
        timestamp: new Date(),
      } as ErrorResponse);
    }

    return res.status(200).json(doc);
  } catch (error) {
    console.error('Error retrieving documentation:', error);
    return res.status(500).json({
      error: 'Failed to retrieve documentation',
      timestamp: new Date(),
    } as ErrorResponse);
  }
});

/**
 * DELETE /api/documentation/:id
 * Delete a specific documentation entry
 */
router.delete('/documentation/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = documentationStorage.delete(id);

    if (!deleted) {
      return res.status(404).json({
        error: 'Documentation not found',
        timestamp: new Date(),
      } as ErrorResponse);
    }

    return res.status(200).json({
      message: 'Documentation deleted successfully',
      id,
    });
  } catch (error) {
    console.error('Error deleting documentation:', error);
    return res.status(500).json({
      error: 'Failed to delete documentation',
      timestamp: new Date(),
    } as ErrorResponse);
  }
});

/**
 * GET /api/documentation/stats
 * Get storage statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = documentationStorage.getStats();
    return res.status(200).json(stats);
  } catch (error) {
    console.error('Error retrieving stats:', error);
    return res.status(500).json({
      error: 'Failed to retrieve stats',
      timestamp: new Date(),
    } as ErrorResponse);
  }
});

export default router;
