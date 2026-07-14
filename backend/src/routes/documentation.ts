import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { generateDocumentation, generateDocumentationStream, generatePRDocumentation } from '../services/llmService';
import { classifyLlmError, LlmErrorKind } from '../services/llmClient';
import { parsePRUrl, fetchPRData, buildPRPromptInput, PRFetchError, PRFetchErrorKind } from '../services/prService';
import { documentationStorage } from '../services/storageService';
import { settingsService } from '../services/settingsService';
import { tokenStorage } from '../services/tokenStorage';
import { QualityScore } from '../services/qualityScoreService';
import { getStorageUserId, getUserId, canAccessDocument } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

// Throttle documentation generation (each call fans out to paid LLM requests).
const generateLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 20, keyPrefix: 'generate' });

/**
 * Whether a requester may read a generation job. Jobs owned by an authenticated
 * user (positive GitHub id) are private to that user. Anonymous jobs (owner id
 * <= 0, whose per-session id does not survive cross-site requests) are protected
 * by their unguessable job id, which acts as the capability.
 */
function canAccessJob(ownerId: number, requesterId: number): boolean {
  if (ownerId <= 0) return true;
  return ownerId === requesterId;
}

interface GenerateRequest {
  code: string;
  language: string;
}

interface PRInfo {
  prNumber: number;
  repository: string;
  branch: string;
  author: string;
}

interface GenerateResponse {
  id: string;
  documentation: string;
  diagram?: string;
  qualityScore?: QualityScore;
  timestamp: Date;
  prInfo?: PRInfo;
}

interface ErrorResponse {
  error: string;
  timestamp: Date;
}

interface JobProgress {
  percentage: number;
  status: string;
}

// A job's error can come from the LLM call or, for PR jobs, from the GitHub
// fetch that precedes it.
type JobErrorKind = LlmErrorKind | PRFetchErrorKind;

// Store active documentation generation jobs
const activeJobs = new Map<string, {
  userId: number;
  createdAt: number;
  progress: JobProgress;
  streamText: string;
  listeners: Set<Response>;
  result?: GenerateResponse;
  error?: string;
  errorKind?: JobErrorKind;
  retryable?: boolean;
}>();

/** Writes one SSE event (`event: <name>\ndata: <json>\n\n`) to a stream response. */
function sendSseEvent(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/**
 * Updates a job's progress and fans it out to any connected SSE listeners.
 * The job record itself is the same one the progress poller reads, so this
 * doesn't change what polling sees - it just adds a push side channel.
 */
function updateJobProgress(jobId: string, percentage: number, status: string): void {
  const job = activeJobs.get(jobId);
  if (!job) return;
  job.progress = { percentage, status };
  for (const listener of job.listeners) {
    sendSseEvent(listener, 'progress', job.progress);
  }
}

/**
 * Sends the terminal SSE event (done/error) to every listener on a job and
 * closes their connections. Generation has already finished by the time this
 * runs, so there's nothing left for a listener to wait on.
 */
function closeJobListeners(job: { listeners: Set<Response> }, event: 'done' | 'error', data: unknown): void {
  for (const listener of job.listeners) {
    sendSseEvent(listener, event, data);
    listener.end();
  }
  job.listeners.clear();
}

// Sweep abandoned/errored jobs so the map can't grow without bound (the
// post-retrieval cleanup only fires on a successful result fetch).
const JOB_TTL_MS = 15 * 60 * 1000;
const jobSweep = setInterval(() => {
  const now = Date.now();
  for (const [id, job] of activeJobs.entries()) {
    if (now - job.createdAt > JOB_TTL_MS) activeJobs.delete(id);
  }
}, 5 * 60 * 1000);
if (typeof jobSweep.unref === 'function') jobSweep.unref();

/**
 * POST /api/generate
 * Generates documentation for the provided code (with progress tracking)
 * Authentication is optional - if authenticated, docs are stored with userId
 */
router.post('/generate', generateLimiter, async (req: Request, res: Response) => {
  try {
    const { code, language } = req.body as GenerateRequest;

    // Validate request body
    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        error: 'Code is required and must be a string',
        timestamp: new Date(),
      } as ErrorResponse);
    }

    // Reject oversized submissions up front, before we touch settings or the LLM.
    if (code.length > 100_000) {
      return res.status(413).json({
        error: 'Code is too large to process. Please limit submissions to 100,000 characters.',
        code: 'code_too_large',
      });
    }

    if (!language || typeof language !== 'string') {
      return res.status(400).json({
        error: 'Language is required and must be a string',
        timestamp: new Date(),
      } as ErrorResponse);
    }

    const userId = getStorageUserId(req);
    const model = await settingsService.getClaudeModel(userId);

    // Generate an unguessable job ID
    const jobId = `job-${crypto.randomBytes(12).toString('hex')}`;

    // Initialize job tracking
    activeJobs.set(jobId, {
      userId,
      createdAt: Date.now(),
      progress: {
        percentage: 0,
        status: 'Initializing...',
      },
      streamText: '',
      listeners: new Set(),
    });

    // Return job ID immediately
    res.json({ jobId, message: 'Documentation generation started' });

    // Process in background
    (async () => {
      try {
        // Update progress: Analyzing code
        updateJobProgress(jobId, 20, 'Analyzing code structure...');

        // Simulate a small delay for progress visibility
        await new Promise(resolve => setTimeout(resolve, 300));

        // Update progress: Generating documentation
        updateJobProgress(jobId, 40, 'Generating documentation with AI...');

        // Call the LLM service, fanning each token delta out to any connected
        // SSE listeners as it arrives. Generation keeps running even if every
        // listener disconnects - job.streamText is the durable record.
        const result = await generateDocumentationStream(code, language, {
          model,
          onDelta: (chunk) => {
            const job = activeJobs.get(jobId)!;
            job.streamText += chunk;
            for (const listener of job.listeners) {
              sendSseEvent(listener, 'delta', { text: chunk });
            }
          },
        });

        // Handle service errors
        if (!result.success) {
          const job = activeJobs.get(jobId)!;
          job.error = result.error || 'Failed to generate documentation';
          job.errorKind = result.errorKind;
          job.retryable = result.retryable;
          closeJobListeners(job, 'error', { error: job.error, errorKind: job.errorKind, retryable: job.retryable });
          return;
        }

        // Update progress: Processing results
        updateJobProgress(jobId, 90, 'Processing results...');

        // Store the documentation
        const id = await documentationStorage.store(
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
        updateJobProgress(jobId, 100, 'Complete');

        const job = activeJobs.get(jobId)!;
        job.result = {
          id,
          documentation: result.documentation,
          diagram: result.diagram,
          qualityScore: result.qualityScore,
          timestamp: new Date(),
        };
        closeJobListeners(job, 'done', { result: job.result });
      } catch (error: any) {
        console.error('Error generating documentation:', error);
        const job = activeJobs.get(jobId)!;
        const classified = classifyLlmError(error);
        job.error = error.message || 'Internal server error';
        job.errorKind = classified.kind;
        job.retryable = classified.retryable;
        closeJobListeners(job, 'error', { error: job.error, errorKind: job.errorKind, retryable: job.retryable });
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
 * POST /api/generate/pr
 * Generates documentation for a GitHub pull request (with progress tracking).
 * Uses the same job machinery as /api/generate - polled through the same
 * /api/generate/progress|result/:jobId routes.
 * Authentication is optional - if authenticated, the caller's GitHub token is
 * used for the PR fetch and docs are stored with their userId.
 */
router.post('/generate/pr', generateLimiter, async (req: Request, res: Response) => {
  try {
    const { prUrl } = req.body as { prUrl: string };

    if (!prUrl || typeof prUrl !== 'string') {
      return res.status(400).json({
        error: 'prUrl is required and must be a string',
        code: 'invalid_pr_url',
      });
    }

    const parsed = parsePRUrl(prUrl);
    if (!parsed) {
      return res.status(400).json({
        error: 'Invalid GitHub PR URL. Expected https://github.com/<owner>/<repo>/pull/<number>',
        code: 'invalid_pr_url',
      });
    }

    const userId = getStorageUserId(req);
    const model = await settingsService.getClaudeModel(userId);

    // If the caller is signed in, use their GitHub token for the PR fetch (same
    // pattern as /api/batch/start) so it isn't rate-limited and can read private PRs.
    const githubUserId = getUserId(req);
    const userToken = githubUserId ? (await tokenStorage.get(githubUserId)) || undefined : undefined;

    const jobId = `job-${crypto.randomBytes(12).toString('hex')}`;

    activeJobs.set(jobId, {
      userId,
      createdAt: Date.now(),
      progress: {
        percentage: 0,
        status: 'Initializing...',
      },
      streamText: '',
      listeners: new Set(),
    });

    res.json({ jobId, message: 'PR documentation generation started' });

    // Process in background
    (async () => {
      try {
        activeJobs.get(jobId)!.progress = {
          percentage: 15,
          status: 'Fetching pull request...',
        };

        const pr = await fetchPRData(parsed.owner, parsed.repo, parsed.number, userToken);

        activeJobs.get(jobId)!.progress = {
          percentage: 40,
          status: 'Generating documentation with AI...',
        };

        const prInput = buildPRPromptInput(pr);
        const result = await generatePRDocumentation(
          prInput,
          {
            owner: parsed.owner,
            repo: parsed.repo,
            number: parsed.number,
            title: pr.title,
            author: pr.author,
            headRef: pr.headRef,
            baseRef: pr.baseRef,
          },
          { model }
        );

        if (!result.success) {
          const job = activeJobs.get(jobId)!;
          job.error = result.error || 'Failed to generate PR documentation';
          job.errorKind = result.errorKind;
          job.retryable = result.retryable;
          return;
        }

        activeJobs.get(jobId)!.progress = {
          percentage: 90,
          status: 'Processing results...',
        };

        const prInfo: PRInfo = {
          prNumber: parsed.number,
          repository: `${parsed.owner}/${parsed.repo}`,
          branch: pr.headRef,
          author: pr.author,
        };

        const id = await documentationStorage.store(
          userId,
          result.documentation,
          '', // code - not applicable for PR docs
          'pr',
          result.diagram,
          result.qualityScore,
          prInfo,
          false // isPublic - default to private
        );

        console.log(`Stored PR documentation: ${id} for user ${userId} (total: ${documentationStorage.getAll().length})`);

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
          prInfo,
        };
      } catch (error: any) {
        console.error('Error generating PR documentation:', error);
        const job = activeJobs.get(jobId)!;
        if (error instanceof PRFetchError) {
          job.error = error.message;
          job.errorKind = error.kind;
          job.retryable = error.kind === 'github_rate_limited';
        } else {
          const classified = classifyLlmError(error);
          job.error = error.message || 'Internal server error';
          job.errorKind = classified.kind;
          job.retryable = classified.retryable;
        }
      }
    })();
  } catch (error) {
    console.error('Error in /api/generate/pr endpoint:', error);

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

  if (!job || !canAccessJob(job.userId, getStorageUserId(req))) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({
    progress: job.progress,
    completed: job.result !== undefined,
    error: job.error,
    errorKind: job.errorKind,
    retryable: job.retryable,
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

  if (!job || !canAccessJob(job.userId, getStorageUserId(req))) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (job.error) {
    return res.status(500).json({ error: job.error, errorKind: job.errorKind, retryable: job.retryable });
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
 * GET /api/generate/stream/:jobId
 * Streams a generation job's text deltas and progress over SSE, as an additive
 * view on top of the same job the progress/result pollers read. Generation is
 * decoupled from this connection - it keeps running in the background job
 * regardless of whether anyone is listening, so a dropped/reconnected client
 * never loses text: the initial `snapshot` event always catches it up.
 * Same access guard as the pollers - anyone without the job id/ownership gets 404,
 * which the frontend treats as "fall back to polling".
 */
router.get('/generate/stream/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;

  const job = activeJobs.get(jobId);

  if (!job || !canAccessJob(job.userId, getStorageUserId(req))) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // disable proxy buffering so deltas arrive as they're written
  });
  res.flushHeaders();

  sendSseEvent(res, 'snapshot', {
    progress: job.progress,
    text: job.streamText,
    diagram: job.result?.diagram,
    done: job.result !== undefined,
    error: job.error,
  });

  // Job already finished before the client connected - send the terminal
  // event and close, same as a normal completion.
  if (job.result) {
    sendSseEvent(res, 'done', { result: job.result });
    return res.end();
  }
  if (job.error) {
    sendSseEvent(res, 'error', { error: job.error, errorKind: job.errorKind, retryable: job.retryable });
    return res.end();
  }

  job.listeners.add(res);

  // Cloud Run drops idle connections; a comment ping keeps this one open.
  const heartbeat = setInterval(() => {
    res.write(': ping\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    job.listeners.delete(res);
  });
});

/**
 * GET /api/documentation
 * Get documentation entries for the user (authenticated or anonymous)
 * If 'view=public' query param is provided, returns all public documents instead
 * Authentication is optional - anonymous users get userId 0
 */
router.get('/documentation', async (req: Request, res: Response) => {
  try {
    const userId = getStorageUserId(req);
    const view = req.query.view as string;

    let docs;
    if (view === 'public') {
      // Get all public documentation
      docs = await documentationStorage.getAllPublic();
    } else {
      // Get user's own documentation (including anonymous docs with userId 0)
      docs = await documentationStorage.getAllByUser(userId);
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
router.get('/documentation/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getStorageUserId(req);
    const doc = await documentationStorage.get(id);

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
 * PATCH /api/documentation/:id/visibility
 * Toggle a document between public and private. Only the owner may change it.
 */
router.patch('/documentation/:id/visibility', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getStorageUserId(req);
    const { isPublic } = req.body;

    if (typeof isPublic !== 'boolean') {
      return res.status(400).json({
        error: 'isPublic (boolean) is required',
        timestamp: new Date(),
      } as ErrorResponse);
    }

    const doc = await documentationStorage.get(id);

    if (!doc) {
      return res.status(404).json({
        error: 'Documentation not found',
        timestamp: new Date(),
      } as ErrorResponse);
    }

    // Only the owner can change visibility.
    if (doc.userId !== userId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only change visibility of your own documentation',
        timestamp: new Date(),
      } as ErrorResponse);
    }

    await documentationStorage.setVisibility(id, isPublic);

    return res.status(200).json({ id, isPublic });
  } catch (error) {
    console.error('Error updating visibility:', error);
    return res.status(500).json({
      error: 'Failed to update visibility',
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
router.delete('/documentation/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getStorageUserId(req);
    const doc = await documentationStorage.get(id);

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

    const deleted = await documentationStorage.delete(id);

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
 * GET /api/stats
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
