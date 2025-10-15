import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { generateDocumentation } from '../services/llmService';
import { documentationStorage } from '../services/storageService';
import { tokenStorage } from '../services/tokenStorage';

const router = Router();

interface GitHubFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

interface PRData {
  prNumber: number;
  title: string;
  repository: string;
  branch: string;
  author: string;
  files: GitHubFile[];
  mergedAt: string;
}

// In-memory storage for PR data (for now)
// In production, use a database
const prQueue: PRData[] = [];

// Webhook status tracking
interface WebhookStatus {
  lastTrigger: string | null;
  totalReceived: number;
  totalProcessed: number;
  lastError: string | null;
  recentEvents: Array<{
    timestamp: string;
    event: string;
    prNumber?: number;
    repository?: string;
    status: 'received' | 'processed' | 'error';
  }>;
}

const webhookStatus: WebhookStatus = {
  lastTrigger: null,
  totalReceived: 0,
  totalProcessed: 0,
  lastError: null,
  recentEvents: [],
};

// Code file extensions to filter
const CODE_EXTENSIONS = ['.js', '.ts', '.py', '.java', '.jsx', '.tsx'];

/**
 * Verify GitHub webhook signature
 */
function verifyGitHubSignature(req: Request, rawBody: Buffer): boolean {
  const signature = req.headers['x-hub-signature-256'] as string;
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!secret) {
    console.warn('GITHUB_WEBHOOK_SECRET not configured - skipping signature verification');
    return true; // Allow in development
  }

  if (!signature) {
    console.warn('No signature provided in webhook request');
    return false;
  }

  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(rawBody).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch (error) {
    console.error('Error comparing signatures:', error);
    return false;
  }
}

/**
 * Filter files to only include code files
 */
function filterCodeFiles(files: GitHubFile[]): GitHubFile[] {
  return files.filter(file => {
    const extension = file.filename.substring(file.filename.lastIndexOf('.'));
    return CODE_EXTENSIONS.includes(extension);
  });
}

/**
 * POST /api/webhook/github
 * GitHub webhook handler for PR merge events
 */
router.post('/github', async (req: Request, res: Response) => {
  try {
    // Get raw body (it's a Buffer when using express.raw())
    const rawBody = req.body as Buffer;

    // Parse JSON payload
    let payload: any;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch (error) {
      console.error('Failed to parse webhook payload:', error);
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    // Verify webhook signature using raw body
    if (!verifyGitHubSignature(req, rawBody)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.headers['x-github-event'] as string;

    console.log(`Received GitHub webhook: ${event}`);

    // Update webhook status
    webhookStatus.lastTrigger = new Date().toISOString();
    webhookStatus.totalReceived++;

    // Only handle pull_request events
    if (event !== 'pull_request') {
      console.log(`Ignoring event type: ${event}`);
      webhookStatus.recentEvents.unshift({
        timestamp: new Date().toISOString(),
        event,
        status: 'received',
      });
      // Keep only last 20 events
      webhookStatus.recentEvents = webhookStatus.recentEvents.slice(0, 20);
      return res.status(200).json({ message: 'Event ignored' });
    }
    const action = payload.action;

    // Only handle merged PRs
    if (action !== 'closed' || !payload.pull_request?.merged) {
      console.log(`Ignoring PR action: ${action} (merged: ${payload.pull_request?.merged})`);
      webhookStatus.recentEvents.unshift({
        timestamp: new Date().toISOString(),
        event: `pull_request.${action}`,
        prNumber: payload.pull_request?.number,
        repository: payload.repository?.full_name,
        status: 'received',
      });
      webhookStatus.recentEvents = webhookStatus.recentEvents.slice(0, 20);
      return res.status(200).json({ message: 'Not a merged PR' });
    }

    const pullRequest = payload.pull_request;
    const repository = payload.repository;

    // Extract PR data
    const prData: PRData = {
      prNumber: pullRequest.number,
      title: pullRequest.title,
      repository: repository.full_name,
      branch: pullRequest.head.ref,
      author: pullRequest.user.login,
      files: [],
      mergedAt: pullRequest.merged_at,
    };

    console.log(`✓ PR #${prData.prNumber} merged in ${prData.repository}`);
    console.log(`  Title: ${prData.title}`);
    console.log(`  Author: ${prData.author}`);
    console.log(`  Branch: ${prData.branch}`);

    // Store PR data
    prQueue.push(prData);

    // Update webhook status
    webhookStatus.recentEvents.unshift({
      timestamp: new Date().toISOString(),
      event: 'pull_request.closed',
      prNumber: prData.prNumber,
      repository: prData.repository,
      status: 'received',
    });
    webhookStatus.recentEvents = webhookStatus.recentEvents.slice(0, 20);

    // Return 200 OK immediately
    res.status(200).json({
      message: 'Webhook received',
      prNumber: prData.prNumber,
      repository: prData.repository,
      queued: true,
    });

    // Process PR in background
    processPRFiles(prData).catch(error => {
      console.error(`Error processing PR #${prData.prNumber}:`, error);
      webhookStatus.lastError = `PR #${prData.prNumber}: ${error.message}`;
      // Update event status to error
      const eventIndex = webhookStatus.recentEvents.findIndex(
        e => e.prNumber === prData.prNumber && e.status === 'received'
      );
      if (eventIndex >= 0) {
        webhookStatus.recentEvents[eventIndex].status = 'error';
      }
    });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    webhookStatus.lastError = error.message || 'Unknown error';
    webhookStatus.recentEvents.unshift({
      timestamp: new Date().toISOString(),
      event: 'error',
      status: 'error',
    });
    webhookStatus.recentEvents = webhookStatus.recentEvents.slice(0, 20);
    // Still return 200 to avoid GitHub retrying
    return res.status(200).json({ message: 'Error processed' });
  }
});

/**
 * GET /api/webhook/status
 * Get webhook status and recent events
 */
router.get('/status', (req: Request, res: Response) => {
  res.json(webhookStatus);
});

/**
 * GET /api/webhook/queue
 * Get current PR queue (for debugging/monitoring)
 */
router.get('/queue', (req: Request, res: Response) => {
  res.json({
    queueSize: prQueue.length,
    prs: prQueue,
  });
});

/**
 * Helper function to fetch PR files
 */
export async function fetchPRFiles(
  owner: string,
  repo: string,
  prNumber: number,
  token: string
): Promise<GitHubFile[]> {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`;
    const response = await fetch(url, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const files = await response.json() as GitHubFile[];
    return filterCodeFiles(files);
  } catch (error) {
    console.error('Error fetching PR files:', error);
    return [];
  }
}

/**
 * Fetch GitHub user ID from username
 */
async function fetchGitHubUserId(username: string, token: string): Promise<number | null> {
  try {
    const url = `https://api.github.com/users/${username}`;
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'CodeToDocsAI',
      Authorization: `token ${token}`,
    };

    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.error(`Failed to fetch user ${username}: ${response.status}`);
      return null;
    }

    const userData = await response.json() as { id: number };
    return userData.id;
  } catch (error) {
    console.error(`Error fetching GitHub user ID for ${username}:`, error);
    return null;
  }
}

/**
 * Fetch file content from GitHub
 */
async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  ref: string,
  token?: string
): Promise<string | null> {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`;
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3.raw',
      'User-Agent': 'CodeToDocsAI',
    };

    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.error(`Failed to fetch ${path}: ${response.status}`);
      return null;
    }

    return await response.text();
  } catch (error) {
    console.error(`Error fetching file content for ${path}:`, error);
    return null;
  }
}

/**
 * Detect language from filename
 */
function detectLanguage(filename: string): string {
  const ext = filename.substring(filename.lastIndexOf('.'));
  const langMap: Record<string, string> = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.java': 'java',
  };
  return langMap[ext] || 'javascript';
}

/**
 * Get GitHub token for a user
 * Multi-tier token lookup strategy:
 * 1. Try to get user's stored OAuth token (preferred - uses user's permissions)
 * 2. Fall back to deployment token (for public repos or when user hasn't authenticated)
 */
function getGitHubTokenForUser(userId: number): string | null {
  // First, try to get user's OAuth token
  const userToken = tokenStorage.get(userId);

  if (userToken) {
    console.log(`Using user's OAuth token for userId ${userId}`);
    return userToken;
  }

  // Fall back to deployment token
  const deploymentToken = process.env.GITHUB_TOKEN;

  if (deploymentToken) {
    console.log(`User ${userId} has no stored token - falling back to deployment token`);
    return deploymentToken;
  }

  console.warn('No GitHub token available - cannot fetch PR files');
  console.warn('Users should authenticate via GitHub OAuth to enable webhook documentation generation');
  return null;
}

/**
 * Get GitHub token by repository owner username
 * This is used when webhook receives an event - we look up token by username
 */
function getGitHubTokenByUsername(username: string): string | null {
  // First, try to get user's OAuth token by username
  const userToken = tokenStorage.getByUsername(username);

  if (userToken) {
    console.log(`Using OAuth token for repository owner: ${username}`);
    return userToken;
  }

  // Fall back to deployment token
  const deploymentToken = process.env.GITHUB_TOKEN;

  if (deploymentToken) {
    console.log(`Repository owner ${username} has no stored token - falling back to deployment token`);
    return deploymentToken;
  }

  console.warn(`No GitHub token available for ${username} - cannot fetch PR files`);
  console.warn('Repository owner should authenticate via GitHub OAuth to enable webhook documentation generation');
  return null;
}

/**
 * Process PR files and generate documentation
 */
async function processPRFiles(prData: PRData): Promise<void> {
  try {
    // Parse repository name
    const [owner, repo] = prData.repository.split('/');

    console.log(`Processing webhook for repository: ${owner}/${repo}`);

    // Step 1: Get token for repository owner (try OAuth first, fall back to deployment token)
    const token = getGitHubTokenByUsername(owner);
    if (!token) {
      console.warn(`No GitHub token available for ${owner} - cannot fetch PR files`);
      console.warn('Repository owner should authenticate via GitHub OAuth, or set GITHUB_TOKEN in deployment');
      return;
    }

    // Step 2: Fetch repository owner's GitHub user ID
    console.log(`Fetching GitHub user ID for repository owner: ${owner}...`);
    const ownerUserId = await fetchGitHubUserId(owner, token);

    if (!ownerUserId) {
      console.error(`Failed to fetch GitHub user ID for ${owner} - using userId 0 as fallback`);
    }

    const userId = ownerUserId || 0;
    console.log(`Using userId ${userId} for storing documentation`);

    // Fetch PR files
    console.log(`Fetching files for PR #${prData.prNumber}...`);
    const files = await fetchPRFiles(owner, repo, prData.prNumber, token);

    if (files.length === 0) {
      console.log(`No code files found in PR #${prData.prNumber}`);
      return;
    }

    console.log(`Found ${files.length} code files in PR #${prData.prNumber}`);

    // Process each file
    for (const file of files) {
      // Only process added or modified files
      if (file.status !== 'added' && file.status !== 'modified') {
        console.log(`Skipping ${file.filename} (status: ${file.status})`);
        continue;
      }

      console.log(`Processing ${file.filename}...`);

      // Fetch file content
      const content = await fetchFileContent(owner, repo, file.filename, prData.branch, token);

      if (!content) {
        console.log(`Could not fetch content for ${file.filename}`);
        continue;
      }

      // Detect language
      const language = detectLanguage(file.filename);

      // Generate documentation
      const result = await generateDocumentation(content, language);

      if (result.success) {
        // Store documentation with PR info using repository owner's GitHub user ID
        const docId = documentationStorage.store(
          userId, // userId - repository owner's GitHub user ID
          result.documentation,
          content,
          language,
          result.diagram,
          result.qualityScore,
          {
            prNumber: prData.prNumber,
            repository: prData.repository,
            branch: prData.branch,
            author: prData.author,
          },
          false // isPublic - default to private
        );

        console.log(`✓ Documentation generated for ${file.filename} (ID: ${docId})`);
      } else {
        console.error(`✗ Failed to generate documentation for ${file.filename}: ${result.error}`);
      }

      // Small delay to avoid API rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`✓ Completed processing PR #${prData.prNumber}`);

    // Update webhook status
    webhookStatus.totalProcessed++;
    const eventIndex = webhookStatus.recentEvents.findIndex(
      e => e.prNumber === prData.prNumber && e.status === 'received'
    );
    if (eventIndex >= 0) {
      webhookStatus.recentEvents[eventIndex].status = 'processed';
    }
  } catch (error: any) {
    console.error(`Error processing PR #${prData.prNumber}:`, error);
    webhookStatus.lastError = `PR #${prData.prNumber}: ${error.message}`;
    // Update event status to error
    const eventIndex = webhookStatus.recentEvents.findIndex(
      e => e.prNumber === prData.prNumber
    );
    if (eventIndex >= 0) {
      webhookStatus.recentEvents[eventIndex].status = 'error';
    }
  }
}

export { prQueue };
export default router;
