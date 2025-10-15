import { Router, Request, Response } from 'express';
import { generateDocumentation } from '../services/llmService';
import { documentationStorage } from '../services/storageService';
import { QualityScore } from '../services/qualityScoreService';
import { requireAuth, getUserId, canAccessDocument } from '../middleware/auth';

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

interface JobProgress {
  percentage: number;
  status: string;
}

// Store active documentation generation jobs
const activeJobs = new Map<string, {
  progress: JobProgress;
  result?: GenerateResponse;
  error?: string;
}>();

/**
 * POST /api/generate
 * Generates documentation for the provided code (with progress tracking)
 * Authentication is optional - if authenticated, docs are stored with userId
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { code, language } = req.body as GenerateRequest;
    const userId = getUserId(req) || 0; // Use 0 for anonymous users

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

    // Generate job ID
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Initialize job tracking
    activeJobs.set(jobId, {
      progress: {
        percentage: 0,
        status: 'Initializing...',
      },
    });

    // Return job ID immediately
    res.json({ jobId, message: 'Documentation generation started' });

    // Process in background
    (async () => {
      try {
        // Update progress: Analyzing code
        activeJobs.get(jobId)!.progress = {
          percentage: 20,
          status: 'Analyzing code structure...',
        };

        // Simulate a small delay for progress visibility
        await new Promise(resolve => setTimeout(resolve, 300));

        // Update progress: Generating documentation
        activeJobs.get(jobId)!.progress = {
          percentage: 40,
          status: 'Generating documentation with AI...',
        };

        // Call the LLM service
        const result = await generateDocumentation(code, language);

        // Handle service errors
        if (!result.success) {
          activeJobs.get(jobId)!.error = result.error || 'Failed to generate documentation';
          return;
        }

        // Update progress: Processing results
        activeJobs.get(jobId)!.progress = {
          percentage: 90,
          status: 'Processing results...',
        };

        // Store the documentation
        const id = documentationStorage.store(
          userId,
          result.documentation,
          code,
          language,
          result.diagram,
          result.qualityScore,
          undefined, // prInfo
          false // isPublic - default to private
        );

        console.log(`Stored documentation: ${id} for user ${userId} (total: ${documentationStorage.getAll().length})`);

        // Complete with result
        activeJobs.get(jobId)!.progress = {
          percentage: 100,
          status: 'Complete',
        };

        activeJobs.get(jobId)!.result = {
          id,
          documentation: result.documentation,
          diagram: result.diagram,
          qualityScore: result.qualityScore,
          timestamp: new Date(),
        };
      } catch (error: any) {
        console.error('Error generating documentation:', error);
        activeJobs.get(jobId)!.error = error.message || 'Internal server error';
      }
    })();
  } catch (error) {
    console.error('Error in /api/generate endpoint:', error);

    return res.status(500).json({
      error: 'Internal server error',
      timestamp: new Date(),
    } as ErrorResponse);
  }
});

/**
 * GET /api/generate/progress/:jobId
 * Get progress of a documentation generation job
 * No authentication required - anyone with jobId can check progress
 */
router.get('/generate/progress/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;

  const job = activeJobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({
    progress: job.progress,
    completed: job.result !== undefined,
    error: job.error,
  });
});

/**
 * GET /api/generate/result/:jobId
 * Get result of a completed documentation generation job
 * No authentication required - anyone with jobId can get result
 */
router.get('/generate/result/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;

  const job = activeJobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (job.error) {
    return res.status(500).json({ error: job.error });
  }

  if (!job.result) {
    return res.status(202).json({
      message: 'Documentation generation still in progress',
      progress: job.progress,
    });
  }

  // Clean up after retrieving result
  setTimeout(() => {
    activeJobs.delete(jobId);
  }, 60000); // Keep for 1 minute after retrieval

  res.json(job.result);
});

/**
 * GET /api/documentation
 * Get documentation entries for the user (authenticated or anonymous)
 * If 'view=public' query param is provided, returns all public documents instead
 * Authentication is optional - anonymous users get userId 0
 */
router.get('/documentation', (req: Request, res: Response) => {
  try {
    const userId = getUserId(req) || 0; // Use 0 for anonymous users
    const view = req.query.view as string;

    let docs;
    if (view === 'public') {
      // Get all public documentation
      docs = documentationStorage.getAllPublic();
    } else {
      // Get user's own documentation (including anonymous docs with userId 0)
      docs = documentationStorage.getAllByUser(userId);
    }

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
 * Access is granted if: document is public OR user owns the document
 * Authentication is optional - anonymous users get userId 0
 */
router.get('/documentation/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req) || 0; // Use 0 for anonymous users
    const doc = documentationStorage.get(id);

    if (!doc) {
      return res.status(404).json({
        error: 'Documentation not found',
        timestamp: new Date(),
      } as ErrorResponse);
    }

    // Check access: must be owner or document must be public
    if (!canAccessDocument(doc, userId)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to view this documentation',
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
 * Only the owner can delete their own documentation
 * Authentication is optional - anonymous users get userId 0
 */
router.delete('/documentation/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req) || 0; // Use 0 for anonymous users
    const doc = documentationStorage.get(id);

    if (!doc) {
      return res.status(404).json({
        error: 'Documentation not found',
        timestamp: new Date(),
      } as ErrorResponse);
    }

    // Check ownership: only owner can delete
    if (doc.userId !== userId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only delete your own documentation',
        timestamp: new Date(),
      } as ErrorResponse);
    }

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
