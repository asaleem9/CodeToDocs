import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { generateDocumentation } from '../services/llmService';
import { documentationStorage } from '../services/storageService';

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

// Code file extensions to filter
const CODE_EXTENSIONS = ['.js', '.ts', '.py', '.java', '.jsx', '.tsx'];

/**
 * Verify GitHub webhook signature
 */
function verifyGitHubSignature(req: Request): boolean {
  const signature = req.headers['x-hub-signature-256'] as string;
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!secret) {
    console.warn('GITHUB_WEBHOOK_SECRET not configured - skipping signature verification');
    return true; // Allow in development
  }

  if (!signature) {
    return false;
  }

  const hmac = crypto.createHmac('sha256', secret);
  const body = JSON.stringify(req.body);
  const digest = 'sha256=' + hmac.update(body).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
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
    // Verify webhook signature
    if (!verifyGitHubSignature(req)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.headers['x-github-event'] as string;

    // Only handle pull_request events
    if (event !== 'pull_request') {
      console.log(`Ignoring event type: ${event}`);
      return res.status(200).json({ message: 'Event ignored' });
    }

    const payload = req.body;
    const action = payload.action;

    // Only handle merged PRs
    if (action !== 'closed' || !payload.pull_request?.merged) {
      console.log(`Ignoring PR action: ${action} (merged: ${payload.pull_request?.merged})`);
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

    console.log(`PR #${prData.prNumber} merged in ${prData.repository}`);
    console.log(`  Author: ${prData.author}`);
    console.log(`  Branch: ${prData.branch}`);

    // Store PR data
    prQueue.push(prData);

    // Return 200 OK immediately
    res.status(200).json({
      message: 'Webhook received',
      prNumber: prData.prNumber,
      queued: true,
    });

    // Process PR in background
    processPRFiles(prData).catch(error => {
      console.error(`Error processing PR #${prData.prNumber}:`, error);
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Still return 200 to avoid GitHub retrying
    return res.status(200).json({ message: 'Error processed' });
  }
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
 * Process PR files and generate documentation
 */
async function processPRFiles(prData: PRData): Promise<void> {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      console.warn('GITHUB_TOKEN not configured - cannot fetch PR files');
      return;
    }

    // Parse repository name
    const [owner, repo] = prData.repository.split('/');

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
        // Store documentation with PR info (using userId 0 for webhook/PR-based docs)
        const docId = documentationStorage.store(
          0, // userId - use 0 for anonymous/webhook-generated docs
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
  } catch (error) {
    console.error(`Error processing PR #${prData.prNumber}:`, error);
  }
}

export { prQueue };
export default router;
