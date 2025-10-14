import express, { Request, Response } from 'express';
import { processRepository, BatchProgress, generateFullRepoDocumentation } from '../utils/batchProcessor';

const router = express.Router();

// Store active batch jobs
const activeBatches = new Map<string, {
  progress: BatchProgress;
  result?: any;
  error?: string;
}>();

/**
 * POST /api/batch/start
 * Start batch processing of a repository
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { repoUrl, options } = req.body;

    if (!repoUrl) {
      return res.status(400).json({ error: 'Repository URL is required' });
    }

    // Validate GitHub URL
    if (!isValidGitHubUrl(repoUrl)) {
      return res.status(400).json({
        error: 'Invalid GitHub URL. Please provide a valid GitHub repository URL',
      });
    }

    // Generate batch ID
    const batchId = `batch-${Date.now()}`;

    // Initialize batch tracking
    activeBatches.set(batchId, {
      progress: {
        total: 0,
        completed: 0,
        current: 'Initializing...',
        percentage: 0,
        failed: 0,
      },
    });

    // Return batch ID immediately
    res.json({ batchId, message: 'Batch processing started' });

    // Process repository in background
    processRepository(
      repoUrl,
      {
        maxFiles: options?.maxFiles || 50,
        maxFileSize: options?.maxFileSize || 100000,
        extensions: options?.extensions,
      },
      (progress: BatchProgress) => {
        // Update progress
        const batch = activeBatches.get(batchId);
        if (batch) {
          batch.progress = progress;
        }
      }
    )
      .then((result) => {
        const batch = activeBatches.get(batchId);
        if (batch) {
          batch.result = result;
        }
      })
      .catch((error) => {
        const batch = activeBatches.get(batchId);
        if (batch) {
          batch.error = error.message;
        }
      });
  } catch (error: any) {
    console.error('Error starting batch processing:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/batch/progress/:batchId
 * Get progress of a batch job
 */
router.get('/progress/:batchId', (req: Request, res: Response) => {
  const { batchId } = req.params;

  const batch = activeBatches.get(batchId);

  if (!batch) {
    return res.status(404).json({ error: 'Batch job not found' });
  }

  res.json({
    progress: batch.progress,
    completed: batch.result !== undefined,
    error: batch.error,
  });
});

/**
 * GET /api/batch/result/:batchId
 * Get result of a completed batch job
 */
router.get('/result/:batchId', (req: Request, res: Response) => {
  const { batchId } = req.params;

  const batch = activeBatches.get(batchId);

  if (!batch) {
    return res.status(404).json({ error: 'Batch job not found' });
  }

  if (batch.error) {
    return res.status(500).json({ error: batch.error });
  }

  if (!batch.result) {
    return res.status(202).json({
      message: 'Batch processing still in progress',
      progress: batch.progress,
    });
  }

  // Clean up after retrieving result
  setTimeout(() => {
    activeBatches.delete(batchId);
  }, 60000); // Keep for 1 minute after retrieval

  res.json(batch.result);
});

/**
 * DELETE /api/batch/:batchId
 * Cancel a batch job
 */
router.delete('/:batchId', (req: Request, res: Response) => {
  const { batchId } = req.params;

  if (activeBatches.has(batchId)) {
    activeBatches.delete(batchId);
    res.json({ message: 'Batch job canceled' });
  } else {
    res.status(404).json({ error: 'Batch job not found' });
  }
});

/**
 * POST /api/batch/generate-full-doc/:batchId
 * Generate comprehensive full-repository documentation
 */
router.post('/generate-full-doc/:batchId', async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;

    const batch = activeBatches.get(batchId);

    if (!batch) {
      return res.status(404).json({ error: 'Batch job not found' });
    }

    if (!batch.result) {
      return res.status(400).json({
        error: 'Batch processing must be complete before generating full documentation'
      });
    }

    console.log(`Generating full-repo documentation for batch: ${batchId}`);

    // Generate full repository documentation
    const fullRepoDoc = await generateFullRepoDocumentation(batch.result);

    // Store it in the result
    batch.result.fullRepoDocumentation = fullRepoDoc;

    res.json({
      success: true,
      fullRepoDocumentation: fullRepoDoc,
    });
  } catch (error: any) {
    console.error('Error generating full repo documentation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Validate GitHub repository URL
 */
function isValidGitHubUrl(url: string): boolean {
  const githubPattern = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/;
  return githubPattern.test(url);
}

export default router;
