import axios, { AxiosError } from 'axios';

const PR_URL_PATTERN = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)\/?$/;

export interface ParsedPRUrl {
  owner: string;
  repo: string;
  number: number;
}

/**
 * Parse a GitHub PR URL into owner/repo/number. Returns null for anything
 * that doesn't match the expected shape (query strings, non-PR URLs, etc).
 */
export function parsePRUrl(url: string): ParsedPRUrl | null {
  const match = PR_URL_PATTERN.exec(url.trim());
  if (!match) return null;
  return { owner: match[1], repo: match[2], number: parseInt(match[3], 10) };
}

export interface PRFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export interface PRData {
  owner: string;
  repo: string;
  number: number;
  title: string;
  body: string | null;
  author: string;
  headRef: string;
  baseRef: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  files: PRFile[];
}

export type PRFetchErrorKind = 'pr_not_found_or_private' | 'github_rate_limited' | 'github_error';

export class PRFetchError extends Error {
  kind: PRFetchErrorKind;

  constructor(kind: PRFetchErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

const MAX_FILES = 300;

async function githubGet(url: string, headers: Record<string, string>): Promise<any> {
  try {
    const response = await axios.get(url, { headers });
    return response.data;
  } catch (error) {
    const status = (error as AxiosError).response?.status;
    if (status === 404) {
      throw new PRFetchError('pr_not_found_or_private', 'Pull request not found or private');
    }
    if (status === 403) {
      throw new PRFetchError('github_rate_limited', 'GitHub API rate limit exceeded');
    }
    throw new PRFetchError('github_error', error instanceof Error ? error.message : 'GitHub request failed');
  }
}

/**
 * Fetch a pull request's metadata and changed files from the GitHub REST API.
 * Prefers the caller's OAuth token (5000 req/hr, private-repo access); falls
 * back to a deployment token if configured, same as fetchRepositoryContents.
 */
export async function fetchPRData(owner: string, repo: string, number: number, token?: string): Promise<PRData> {
  const githubToken = token || process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'CodeToDocsAI',
  };
  if (githubToken) {
    headers['Authorization'] = `token ${githubToken}`;
  }

  const pr = await githubGet(`https://api.github.com/repos/${owner}/${repo}/pulls/${number}`, headers);

  // Paginate the changed-files list, capped so a huge PR can't blow up the prompt.
  const files: PRFile[] = [];
  let page = 1;
  while (files.length < MAX_FILES) {
    const batch: PRFile[] = await githubGet(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${number}/files?per_page=100&page=${page}`,
      headers
    );
    files.push(...batch);
    if (batch.length < 100) break;
    page++;
  }

  return {
    owner,
    repo,
    number,
    title: pr.title,
    body: pr.body,
    author: pr.user?.login || 'unknown',
    headRef: pr.head?.ref || '',
    baseRef: pr.base?.ref || '',
    additions: pr.additions,
    deletions: pr.deletions,
    changedFiles: pr.changed_files,
    files: files.slice(0, MAX_FILES),
  };
}

// Lockfiles add bulk without giving the model anything useful to document.
const LOCKFILE_NAMES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'composer.lock',
  'Gemfile.lock', 'Cargo.lock', 'go.sum', 'poetry.lock', 'Pipfile.lock', 'mix.lock',
]);

const MAX_PATCH_BYTES = 8_000;
const MAX_TOTAL_BYTES = 80_000;

function isLockfile(filename: string): boolean {
  return LOCKFILE_NAMES.has(filename.split('/').pop() || filename);
}

/**
 * Build the prompt input for PR documentation: a header summary followed by
 * per-file patch sections. Lockfiles and binary/no-patch files are skipped;
 * patches are capped per-file and in total so a large PR can't blow the
 * context budget. Every omission/truncation is noted inline so the model
 * knows the diff it's working from is partial.
 */
export function buildPRPromptInput(pr: PRData): string {
  let out = `# Pull Request: ${pr.title}\n\n`;
  out += `Author: ${pr.author}\n`;
  out += `Branch: ${pr.headRef} -> ${pr.baseRef}\n`;
  out += `Stats: +${pr.additions} -${pr.deletions} across ${pr.changedFiles} file(s)\n`;
  if (pr.body) {
    out += `\nDescription:\n${pr.body}\n`;
  }
  out += `\n## Changed Files\n`;

  let totalBytes = Buffer.byteLength(out, 'utf8');
  const omitted: string[] = [];
  const truncated: string[] = [];

  for (const file of pr.files) {
    if (isLockfile(file.filename) || !file.patch) {
      omitted.push(file.filename);
      continue;
    }

    let patch = file.patch;
    if (Buffer.byteLength(patch, 'utf8') > MAX_PATCH_BYTES) {
      patch = patch.slice(0, MAX_PATCH_BYTES) + '\n... (patch truncated)';
      truncated.push(file.filename);
    }

    const section = `\n### ${file.filename} (${file.status}, +${file.additions}/-${file.deletions})\n\`\`\`diff\n${patch}\n\`\`\`\n`;

    if (totalBytes + Buffer.byteLength(section, 'utf8') > MAX_TOTAL_BYTES) {
      omitted.push(file.filename);
      continue;
    }

    out += section;
    totalBytes += Buffer.byteLength(section, 'utf8');
  }

  if (omitted.length > 0) {
    out += `\n(Note: diff is partial - ${omitted.length} file(s) omitted (lockfile, binary, or size limit): ${omitted.slice(0, 20).join(', ')}${omitted.length > 20 ? ', ...' : ''})\n`;
  }
  if (truncated.length > 0) {
    out += `\n(Note: ${truncated.length} file's patch was truncated for length: ${truncated.slice(0, 20).join(', ')}${truncated.length > 20 ? ', ...' : ''})\n`;
  }

  return out;
}
