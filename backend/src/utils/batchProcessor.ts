import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { generateDocumentation } from '../services/llmService';

const execAsync = promisify(exec);

export interface FileToDocument {
  path: string;
  language: string;
  content: string;
  size: number;
}

export interface BatchProgress {
  total: number;
  completed: number;
  current: string;
  percentage: number;
  failed: number;
}

export interface DocumentedFile {
  filePath: string;
  language: string;
  documentation: string;
  diagram?: string;
  qualityScore?: any;
  success: boolean;
  error?: string;
}

export interface BatchResult {
  repoUrl: string;
  totalFiles: number;
  successCount: number;
  failedCount: number;
  documents: DocumentedFile[];
  tableOfContents: string;
  summary: string;
  fullRepoDocumentation?: string;
}

/**
 * Extract owner and repo name from GitHub URL
 */
function parseGitHubUrl(repoUrl: string): { owner: string; repo: string } {
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    throw new Error('Invalid GitHub URL');
  }

  return {
    owner: match[1],
    repo: match[2].replace('.git', ''),
  };
}

/**
 * Fetch repository contents using GitHub API
 */
export async function fetchRepositoryContents(
  repoUrl: string,
  options: {
    maxFiles?: number;
    maxFileSize?: number;
    extensions?: string[];
  } = {}
): Promise<FileToDocument[]> {
  const { owner, repo } = parseGitHubUrl(repoUrl);
  const {
    maxFiles = 50,
    maxFileSize = 100000,
    extensions = ['.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.graphql', '.gql']
  } = options;

  const files: FileToDocument[] = [];
  const apiBase = 'https://api.github.com';

  const githubToken = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'CodeToDocsAI',
  };

  if (githubToken) {
    headers['Authorization'] = `token ${githubToken}`;
  }

  async function fetchDirectory(dirPath: string = '', depth: number = 0): Promise<void> {
    if (files.length >= maxFiles) return;
    if (depth > 10) {
      console.warn(`Max depth reached for ${dirPath}, skipping`);
      return;
    }

    try {
      const url = `${apiBase}/repos/${owner}/${repo}/contents/${dirPath}`;
      console.log(`[Depth ${depth}] Fetching: ${url}`);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        headers,
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 403) {
          console.error('GitHub API rate limit exceeded');
          throw new Error('GitHub API rate limit exceeded. Please add a GITHUB_TOKEN to increase limits.');
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const contents = await response.json();

      if (!Array.isArray(contents)) {
        return;
      }

      for (const item of contents) {
        if (files.length >= maxFiles) break;

        // Skip common directories to ignore
        const ignoreDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '__pycache__', 'vendor', 'target'];
        if (item.type === 'dir' && !ignoreDirs.includes(item.name)) {
          await fetchDirectory(item.path, depth + 1);
        } else if (item.type === 'file') {
          const ext = path.extname(item.name);

          if (extensions.includes(ext) && item.size <= maxFileSize) {
            try {
              // Fetch file content
              const fileResponse = await fetch(item.download_url);
              if (fileResponse.ok) {
                const content = await fileResponse.text();
                const language = getLanguageFromExtension(ext);

                files.push({
                  path: item.path,
                  language,
                  content,
                  size: item.size,
                });

                console.log(`Added file: ${item.path}`);
              }
            } catch (error) {
              console.error(`Error fetching file ${item.path}:`, error);
            }
          } else if (item.size > maxFileSize) {
            console.log(`Skipping large file: ${item.path} (${item.size} bytes)`);
          }
        }
      }
    } catch (error: any) {
      console.error(`Error fetching directory ${dirPath}:`, error.message);
      throw error;
    }
  }

  await fetchDirectory();
  return files;
}

/**
 * Clone a GitHub repository to a temporary directory (DEPRECATED - use fetchRepositoryContents instead)
 */
export async function cloneRepository(repoUrl: string): Promise<string> {
  const tmpDir = path.join('/tmp', `repo-${Date.now()}`);

  try {
    await fs.mkdir(tmpDir, { recursive: true });

    console.log(`Cloning repository: ${repoUrl}`);
    await execAsync(`git clone --depth 1 ${repoUrl} ${tmpDir}`, {
      timeout: 60000, // 60 second timeout
    });

    return tmpDir;
  } catch (error: any) {
    // Clean up on error
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {}

    throw new Error(`Failed to clone repository: ${error.message}`);
  }
}

/**
 * Scan directory for code files
 */
export async function scanCodeFiles(
  dir: string,
  options: {
    maxFiles?: number;
    maxFileSize?: number;
    extensions?: string[];
  } = {}
): Promise<FileToDocument[]> {
  const {
    maxFiles = 50,
    maxFileSize = 100000, // 100KB default max
    extensions = ['.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.graphql', '.gql']
  } = options;

  const files: FileToDocument[] = [];
  const ignorePatterns = [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    '.next',
    '__pycache__',
    'vendor',
    'target',
  ];

  async function scanDir(currentDir: string) {
    if (files.length >= maxFiles) return;

    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        if (files.length >= maxFiles) break;

        const fullPath = path.join(currentDir, entry.name);
        const relativePath = path.relative(dir, fullPath);

        // Skip ignored directories
        if (ignorePatterns.some(pattern => relativePath.includes(pattern))) {
          continue;
        }

        if (entry.isDirectory()) {
          await scanDir(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);

          if (extensions.includes(ext)) {
            try {
              const stats = await fs.stat(fullPath);

              // Skip files that are too large
              if (stats.size > maxFileSize) {
                console.log(`Skipping large file: ${relativePath} (${stats.size} bytes)`);
                continue;
              }

              const content = await fs.readFile(fullPath, 'utf-8');
              const language = getLanguageFromExtension(ext);

              files.push({
                path: relativePath,
                language,
                content,
                size: stats.size,
              });
            } catch (error) {
              console.error(`Error reading file ${relativePath}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${currentDir}:`, error);
    }
  }

  await scanDir(dir);
  return files;
}

/**
 * Get language from file extension
 */
function getLanguageFromExtension(ext: string): string {
  const languageMap: Record<string, string> = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.java': 'java',
    '.graphql': 'graphql',
    '.gql': 'graphql',
  };

  return languageMap[ext] || 'javascript';
}

/**
 * Process files in batches with progress tracking and concurrency
 */
export async function processBatch(
  files: FileToDocument[],
  onProgress?: (progress: BatchProgress) => void
): Promise<DocumentedFile[]> {
  const results: DocumentedFile[] = [];
  let completed = 0;
  let failed = 0;
  const concurrency = 3; // Process 3 files concurrently

  console.log(`Starting batch processing of ${files.length} files with concurrency: ${concurrency}`);

  // Process files in chunks
  for (let i = 0; i < files.length; i += concurrency) {
    const chunk = files.slice(i, i + concurrency);

    // Process chunk concurrently
    const chunkResults = await Promise.all(
      chunk.map(async (file) => {
        try {
          // Report progress
          if (onProgress) {
            onProgress({
              total: files.length,
              completed,
              current: file.path,
              percentage: Math.round((completed / files.length) * 100),
              failed,
            });
          }

          console.log(`[${completed + 1}/${files.length}] Processing ${file.path}...`);

          const result = await generateDocumentation(file.content, file.language);

          const docResult: DocumentedFile = {
            filePath: file.path,
            language: file.language,
            documentation: result.documentation,
            diagram: result.diagram,
            qualityScore: result.qualityScore,
            success: result.success,
            error: result.error,
          };

          if (!result.success) {
            console.log(`✗ Failed: ${file.path} - ${result.error}`);
          } else {
            console.log(`✓ Success: ${file.path}`);
          }

          return docResult;
        } catch (error: any) {
          console.error(`✗ Error processing ${file.path}:`, error.message);

          return {
            filePath: file.path,
            language: file.language,
            documentation: '',
            success: false,
            error: error.message,
          };
        }
      })
    );

    // Update counters
    for (const result of chunkResults) {
      results.push(result);
      completed++;
      if (!result.success) {
        failed++;
      }
    }

    // Report progress after chunk
    if (onProgress) {
      onProgress({
        total: files.length,
        completed,
        current: completed < files.length ? files[completed].path : 'Complete',
        percentage: Math.round((completed / files.length) * 100),
        failed,
      });
    }

    console.log(`Progress: ${completed}/${files.length} files (${failed} failed)`);

    // Small delay between chunks to prevent API rate limiting
    if (i + concurrency < files.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Final progress update
  if (onProgress) {
    onProgress({
      total: files.length,
      completed,
      current: 'Complete',
      percentage: 100,
      failed,
    });
  }

  console.log(`Batch processing complete: ${completed - failed}/${completed} successful`);

  return results;
}

/**
 * Generate table of contents
 */
export function generateTableOfContents(documents: DocumentedFile[]): string {
  let toc = '# Documentation Table of Contents\n\n';

  // Group by directory
  const byDirectory: Record<string, DocumentedFile[]> = {};

  for (const doc of documents) {
    const dir = path.dirname(doc.filePath);
    if (!byDirectory[dir]) {
      byDirectory[dir] = [];
    }
    byDirectory[dir].push(doc);
  }

  // Generate TOC
  const sortedDirs = Object.keys(byDirectory).sort();

  for (const dir of sortedDirs) {
    const displayDir = dir === '.' ? 'Root' : dir;
    toc += `## ${displayDir}\n\n`;

    const docs = byDirectory[dir].sort((a, b) => a.filePath.localeCompare(b.filePath));

    for (const doc of docs) {
      const fileName = path.basename(doc.filePath);
      const status = doc.success ? '✅' : '❌';
      const quality = doc.qualityScore?.score ? ` (Quality: ${doc.qualityScore.score}/100)` : '';

      toc += `- ${status} [${fileName}](#${sanitizeAnchor(doc.filePath)})${quality}\n`;
    }

    toc += '\n';
  }

  return toc;
}

/**
 * Generate summary of batch processing
 */
export function generateBatchSummary(result: BatchResult): string {
  let summary = '# Batch Documentation Summary\n\n';

  summary += `**Repository**: ${result.repoUrl}\n\n`;
  summary += `**Total Files Processed**: ${result.totalFiles}\n`;
  summary += `**Successfully Documented**: ${result.successCount}\n`;
  summary += `**Failed**: ${result.failedCount}\n`;
  summary += `**Success Rate**: ${Math.round((result.successCount / result.totalFiles) * 100)}%\n\n`;

  // Language breakdown
  const languageCounts: Record<string, number> = {};
  const languageSuccess: Record<string, number> = {};

  for (const doc of result.documents) {
    languageCounts[doc.language] = (languageCounts[doc.language] || 0) + 1;
    if (doc.success) {
      languageSuccess[doc.language] = (languageSuccess[doc.language] || 0) + 1;
    }
  }

  summary += '## Files by Language\n\n';
  for (const [lang, count] of Object.entries(languageCounts)) {
    const success = languageSuccess[lang] || 0;
    summary += `- **${lang}**: ${success}/${count} documented\n`;
  }
  summary += '\n';

  // Quality score distribution
  const successfulDocs = result.documents.filter(d => d.success && d.qualityScore);
  if (successfulDocs.length > 0) {
    const avgQuality = successfulDocs.reduce((sum, d) => sum + (d.qualityScore?.score || 0), 0) / successfulDocs.length;

    summary += `## Quality Metrics\n\n`;
    summary += `**Average Quality Score**: ${Math.round(avgQuality)}/100\n\n`;
  }

  // Failed files
  const failedDocs = result.documents.filter(d => !d.success);
  if (failedDocs.length > 0) {
    summary += '## Failed Files\n\n';
    for (const doc of failedDocs) {
      summary += `- **${doc.filePath}**: ${doc.error || 'Unknown error'}\n`;
    }
    summary += '\n';
  }

  return summary;
}

/**
 * Sanitize string for use as markdown anchor
 */
function sanitizeAnchor(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/**
 * Clean up temporary directory
 */
export async function cleanupTempDir(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
    console.log(`Cleaned up temporary directory: ${dir}`);
  } catch (error) {
    console.error(`Error cleaning up ${dir}:`, error);
  }
}

/**
 * Generate comprehensive full-repository documentation
 * This aggregates all individual file docs into a cohesive overview
 */
export async function generateFullRepoDocumentation(result: BatchResult): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;

  // Get Anthropic API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const anthropic = new Anthropic({ apiKey });

  // Prepare a comprehensive context about the repository
  const repoName = result.repoUrl.split('/').pop() || 'Repository';

  // Group files by directory/module
  const filesByDirectory: Record<string, DocumentedFile[]> = {};
  for (const doc of result.documents.filter(d => d.success)) {
    const dir = path.dirname(doc.filePath);
    if (!filesByDirectory[dir]) {
      filesByDirectory[dir] = [];
    }
    filesByDirectory[dir].push(doc);
  }

  // Create a structured summary of each module/directory
  let moduleSummaries = '';
  for (const [dir, docs] of Object.entries(filesByDirectory)) {
    const displayDir = dir === '.' ? 'Root Directory' : dir;
    moduleSummaries += `\n### ${displayDir}\n`;
    moduleSummaries += `Files: ${docs.map(d => path.basename(d.filePath)).join(', ')}\n\n`;

    // Include a snippet of each file's documentation
    for (const doc of docs.slice(0, 3)) { // Limit to first 3 per directory to keep context manageable
      moduleSummaries += `**${path.basename(doc.filePath)}** (${doc.language}):\n`;
      const docSnippet = doc.documentation.split('\n').slice(0, 10).join('\n');
      moduleSummaries += docSnippet + '\n...\n\n';
    }
  }

  // Language breakdown
  const languageCounts: Record<string, number> = {};
  for (const doc of result.documents.filter(d => d.success)) {
    languageCounts[doc.language] = (languageCounts[doc.language] || 0) + 1;
  }

  const languageInfo = Object.entries(languageCounts)
    .map(([lang, count]) => `${lang}: ${count} files`)
    .join(', ');

  // Create the prompt for full-repo documentation
  const prompt = `You are an expert technical documentation writer. Generate comprehensive repository-level documentation for a codebase.

**Repository**: ${repoName}
**Total Files**: ${result.totalFiles}
**Successfully Documented**: ${result.successCount}
**Languages**: ${languageInfo}

**Project Structure & Modules**:
${moduleSummaries}

Based on the above information about individual files and modules, create a comprehensive README-style documentation that includes:

1. **Project Overview**: What this repository does, its purpose and main functionality
2. **Architecture**: High-level architecture and how different modules/components work together
3. **Key Features**: Main features and capabilities of the project
4. **Project Structure**: Organization of directories and their purposes
5. **Tech Stack**: Technologies, frameworks, and languages used
6. **Getting Started**: How to set up and run the project (infer from file types and common patterns)
7. **API/Module Reference**: Brief overview of main modules and their responsibilities
8. **Development Notes**: Any patterns, conventions, or important considerations

Focus on providing a holistic view of the entire repository rather than individual file details. Make it informative for developers who want to understand and contribute to this project.

Provide the documentation in well-structured Markdown format.`;

  try {
    console.log('Generating full repository documentation with Claude...');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      console.log('Full repository documentation generated successfully');
      return content.text;
    }

    throw new Error('Unexpected response format from Claude');
  } catch (error: any) {
    console.error('Error generating full repo documentation:', error);
    throw new Error(`Failed to generate full repository documentation: ${error.message}`);
  }
}

/**
 * Main batch processing function
 */
export async function processRepository(
  repoUrl: string,
  options: {
    maxFiles?: number;
    maxFileSize?: number;
    extensions?: string[];
  } = {},
  onProgress?: (progress: BatchProgress) => void
): Promise<BatchResult> {
  try {
    console.log(`Starting batch processing for: ${repoUrl}`);

    // Fetch repository contents using GitHub API
    const files = await fetchRepositoryContents(repoUrl, options);

    if (files.length === 0) {
      throw new Error('No code files found in repository');
    }

    console.log(`Found ${files.length} files to document`);

    // Process files
    const documents = await processBatch(files, onProgress);

    // Generate table of contents
    const tableOfContents = generateTableOfContents(documents);

    // Create result
    const result: BatchResult = {
      repoUrl,
      totalFiles: documents.length,
      successCount: documents.filter(d => d.success).length,
      failedCount: documents.filter(d => !d.success).length,
      documents,
      tableOfContents,
      summary: '',
    };

    // Generate summary
    result.summary = generateBatchSummary(result);

    // Automatically generate full repository documentation
    try {
      console.log('Auto-generating full repository documentation...');
      result.fullRepoDocumentation = await generateFullRepoDocumentation(result);
      console.log('Full repository documentation generated successfully');
    } catch (error: any) {
      console.error('Failed to generate full repository documentation:', error);
      // Don't fail the entire batch if full doc generation fails
      result.fullRepoDocumentation = undefined;
    }

    console.log(`Batch processing complete: ${result.successCount}/${result.totalFiles} successful`);

    return result;
  } catch (error: any) {
    console.error('Batch processing error:', error);
    throw error;
  }
}
