import express, { Request, Response } from 'express';
import multer from 'multer';
import AdmZip from 'adm-zip';
import * as path from 'path';
import * as fs from 'fs/promises';
import { processRepository, BatchProgress, generateFullRepoDocumentation, scanCodeFiles, processBatch, generateTableOfContents, generateBatchSummary } from '../utils/batchProcessor';
import { documentationStorage } from '../services/storageService';
import { requireAuth, getUserId } from '../middleware/auth';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: '/tmp/uploads/',
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'));
    }
  },
});

// Store active batch jobs with user ID
const activeBatches = new Map<string, {
  userId: number;
  progress: BatchProgress;
  completedDocuments: any[];
  result?: any;
  error?: string;
}>();

/**
 * POST /api/batch/start
 * Start batch processing of a repository
 * Authentication is optional - if authenticated, docs are stored with userId
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { repoUrl, options } = req.body;
    const userId = getUserId(req) || 0; // Use 0 for anonymous users

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
      userId,
      completedDocuments: [],
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
      },
      (doc: any) => {
        // File completed callback
        const batch = activeBatches.get(batchId);
        if (batch) {
          batch.completedDocuments.push(doc);
        }
      }
    )
      .then((result) => {
        const batch = activeBatches.get(batchId);
        if (batch) {
          batch.result = result;

          // Store batch result in history if full repo documentation is available
          if (result.fullRepoDocumentation) {
            try {
              documentationStorage.storeBatch(
                userId,
                result.fullRepoDocumentation,
                result.repoUrl,
                result.totalFiles,
                result.successCount,
                result.failedCount,
                false // isPublic - default to private
              );
            } catch (error) {
              console.error('Error storing batch in history:', error);
            }
          }
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
 * POST /api/batch/upload-zip
 * Upload a zipped repository for batch processing
 * Authentication is optional - if authenticated, docs are stored with userId
 */
router.post('/upload-zip', upload.single('zipFile'), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req) || 0; // Use 0 for anonymous users
    const file = req.file;
    const options = req.body.options ? JSON.parse(req.body.options) : {};

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Generate batch ID
    const batchId = `batch-${Date.now()}`;

    // Initialize batch tracking
    activeBatches.set(batchId, {
      userId,
      completedDocuments: [],
      progress: {
        total: 0,
        completed: 0,
        current: 'Extracting zip file...',
        percentage: 5,
        failed: 0,
      },
    });

    // Return batch ID immediately
    res.json({ batchId, message: 'Zip file uploaded, processing started' });

    // Process zip file in background
    (async () => {
      let extractDir: string | undefined;
      try {
        // Extract zip file
        const zip = new AdmZip(file.path);
        extractDir = path.join('/tmp', `extracted-${Date.now()}`);

        console.log(`Extracting zip to: ${extractDir}`);
        zip.extractAllTo(extractDir, true);

        // Update progress
        const batch = activeBatches.get(batchId);
        if (batch) {
          batch.progress = {
            total: 0,
            completed: 0,
            current: 'Scanning code files...',
            percentage: 10,
            failed: 0,
          };
        }

        // Scan for code files
        const files = await scanCodeFiles(extractDir, {
          maxFiles: options?.maxFiles || 50,
          maxFileSize: options?.maxFileSize || 100000,
          extensions: options?.extensions,
        });

        if (files.length === 0) {
          throw new Error('No code files found in the uploaded zip');
        }

        console.log(`Found ${files.length} files to document`);

        // Update progress
        if (batch) {
          batch.progress = {
            total: files.length,
            completed: 0,
            current: 'Starting documentation generation...',
            percentage: 15,
            failed: 0,
          };
        }

        // Process files with progress tracking
        const documents = await processBatch(
          files,
          (progress: BatchProgress) => {
            const batch = activeBatches.get(batchId);
            if (batch) {
              batch.progress = progress;
            }
          },
          (doc: any) => {
            const batch = activeBatches.get(batchId);
            if (batch) {
              batch.completedDocuments.push(doc);
            }
          }
        );

        // Generate table of contents
        const tableOfContents = generateTableOfContents(documents);

        // Create result
        const result: any = {
          repoUrl: file.originalname.replace('.zip', ''),
          totalFiles: documents.length,
          successCount: documents.filter(d => d.success).length,
          failedCount: documents.filter(d => !d.success).length,
          documents,
          tableOfContents,
          summary: '',
        };

        // Generate summary
        result.summary = generateBatchSummary(result);

        // Update progress: Generating full repo documentation
        if (batch) {
          batch.progress = {
            total: files.length,
            completed: files.length,
            current: 'Generating full repository documentation...',
            percentage: 95,
            failed: documents.filter(d => !d.success).length,
          };
        }

        // Generate full repository documentation
        try {
          console.log('Auto-generating full repository documentation...');
          result.fullRepoDocumentation = await generateFullRepoDocumentation(result);
          console.log('Full repository documentation generated successfully');
        } catch (error: any) {
          console.error('Failed to generate full repository documentation:', error);
          result.fullRepoDocumentation = undefined;
        }

        // Store batch result in history
        if (result.fullRepoDocumentation) {
          try {
            documentationStorage.storeBatch(
              userId,
              result.fullRepoDocumentation,
              result.repoUrl,
              result.totalFiles,
              result.successCount,
              result.failedCount,
              false // isPublic - default to private
            );
          } catch (error) {
            console.error('Error storing batch in history:', error);
          }
        }

        // Final progress update
        if (batch) {
          batch.progress = {
            total: files.length,
            completed: files.length,
            current: 'Complete',
            percentage: 100,
            failed: documents.filter(d => !d.success).length,
          };
          batch.result = result;
        }

        console.log(`Batch processing complete: ${result.successCount}/${result.totalFiles} successful`);
      } catch (error: any) {
        console.error('Error processing zip file:', error);
        const batch = activeBatches.get(batchId);
        if (batch) {
          batch.error = error.message;
        }
      } finally {
        // Clean up uploaded file and extracted directory
        try {
          await fs.unlink(file.path);
          if (extractDir) {
            await fs.rm(extractDir, { recursive: true, force: true });
          }
        } catch (cleanupError) {
          console.error('Error cleaning up files:', cleanupError);
        }
      }
    })();
  } catch (error: any) {
    console.error('Error in upload-zip endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/batch/progress/:batchId
 * Get progress of a batch job
 * No authentication required - anyone with batchId can check progress
 */
router.get('/progress/:batchId', (req: Request, res: Response) => {
  const { batchId } = req.params;

  const batch = activeBatches.get(batchId);

  if (!batch) {
    return res.status(404).json({ error: 'Batch job not found' });
  }

  // Return completed documents incrementally based on offset
  const since = parseInt(req.query.since as string) || 0;
  const newDocuments = batch.completedDocuments.slice(since);

  res.json({
    progress: batch.progress,
    completed: batch.result !== undefined,
    error: batch.error,
    completedDocuments: newDocuments,
    totalCompleted: batch.completedDocuments.length,
  });
});

/**
 * GET /api/batch/result/:batchId
 * Get result of a completed batch job
 * No authentication required - anyone with batchId can get result
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
