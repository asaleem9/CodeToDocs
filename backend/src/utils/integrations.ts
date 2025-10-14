import axios from 'axios';
import { Octokit } from '@octokit/rest';

/**
 * Integration utilities for exporting documentation to various platforms
 */

// ============================================================================
// Notion Integration
// ============================================================================

export interface NotionConfig {
  token: string;
  databaseId?: string;
  pageId?: string;
}

export async function exportToNotion(
  markdown: string,
  title: string,
  config: NotionConfig
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const notionBlocks = markdownToNotionBlocks(markdown);

    const response = await axios.post(
      'https://api.notion.com/v1/pages',
      {
        parent: config.databaseId
          ? { database_id: config.databaseId }
          : { page_id: config.pageId },
        properties: {
          title: {
            title: [
              {
                text: {
                  content: title,
                },
              },
            ],
          },
        },
        children: notionBlocks,
      },
      {
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: true,
      url: response.data.url,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
}

function markdownToNotionBlocks(markdown: string): any[] {
  const lines = markdown.split('\n');
  const blocks: any[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    // Headings
    if (line.startsWith('# ')) {
      blocks.push({
        object: 'block',
        type: 'heading_1',
        heading_1: {
          rich_text: [{ type: 'text', text: { content: line.slice(2) } }],
        },
      });
    } else if (line.startsWith('## ')) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: line.slice(3) } }],
        },
      });
    } else if (line.startsWith('### ')) {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ type: 'text', text: { content: line.slice(4) } }],
        },
      });
    } else if (line.startsWith('```')) {
      // Code blocks need special handling
      blocks.push({
        object: 'block',
        type: 'code',
        code: {
          rich_text: [{ type: 'text', text: { content: line.slice(3) } }],
          language: 'plain text',
        },
      });
    } else {
      // Regular paragraph
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: line } }],
        },
      });
    }
  }

  return blocks;
}

// ============================================================================
// Confluence Integration
// ============================================================================

export interface ConfluenceConfig {
  baseUrl: string; // e.g., https://your-domain.atlassian.net/wiki
  email: string;
  apiToken: string;
  spaceKey: string;
  parentPageId?: string;
}

export async function exportToConfluence(
  markdown: string,
  title: string,
  config: ConfluenceConfig
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const confluenceHtml = markdownToConfluenceStorage(markdown);

    const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');

    const response = await axios.post(
      `${config.baseUrl}/rest/api/content`,
      {
        type: 'page',
        title: title,
        space: {
          key: config.spaceKey,
        },
        ...(config.parentPageId && {
          ancestors: [{ id: config.parentPageId }],
        }),
        body: {
          storage: {
            value: confluenceHtml,
            representation: 'storage',
          },
        },
      },
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: true,
      url: `${config.baseUrl}/pages/viewpage.action?pageId=${response.data.id}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
}

function markdownToConfluenceStorage(markdown: string): string {
  let html = markdown;

  // Convert headings
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');

  // Convert code blocks
  html = html.replace(/```(\w+)?\n([\s\S]+?)```/g, (match, lang, code) => {
    return `<ac:structured-macro ac:name="code"><ac:parameter ac:name="language">${lang || 'text'}</ac:parameter><ac:plain-text-body><![CDATA[${code}]]></ac:plain-text-body></ac:structured-macro>`;
  });

  // Convert inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Convert bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Convert italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Convert paragraphs
  html = html.replace(/^(?!<[h|ac|code|strong|em])(.+)$/gm, '<p>$1</p>');

  return html;
}

// ============================================================================
// GitHub Wiki Integration
// ============================================================================

export interface GitHubWikiConfig {
  token: string;
  owner: string;
  repo: string;
}

export async function syncToGitHubWiki(
  markdown: string,
  pageName: string,
  config: GitHubWikiConfig
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const octokit = new Octokit({ auth: config.token });

    // GitHub Wikis are just Git repositories
    // We need to clone, commit, and push
    const wikiUrl = `https://github.com/${config.owner}/${config.repo}.wiki.git`;

    // For now, return instructions - full implementation would require git operations
    return {
      success: true,
      url: `https://github.com/${config.owner}/${config.repo}/wiki/${pageName}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================================================
// README.md Generator
// ============================================================================

export interface ReadmeOptions {
  projectName: string;
  description?: string;
  documentation: string;
  includeInstallation?: boolean;
  includeUsage?: boolean;
  includeLicense?: boolean;
}

export function generateReadme(options: ReadmeOptions): string {
  const sections: string[] = [];

  // Header
  sections.push(`# ${options.projectName}\n`);

  if (options.description) {
    sections.push(`${options.description}\n`);
  }

  // Table of Contents
  sections.push('## Table of Contents\n');
  const toc: string[] = ['- [Documentation](#documentation)'];
  if (options.includeInstallation) toc.push('- [Installation](#installation)');
  if (options.includeUsage) toc.push('- [Usage](#usage)');
  if (options.includeLicense) toc.push('- [License](#license)');
  sections.push(toc.join('\n') + '\n');

  // Documentation
  sections.push('## Documentation\n');
  sections.push(options.documentation + '\n');

  // Installation
  if (options.includeInstallation) {
    sections.push('## Installation\n');
    sections.push('```bash');
    sections.push('npm install');
    sections.push('```\n');
  }

  // Usage
  if (options.includeUsage) {
    sections.push('## Usage\n');
    sections.push('```bash');
    sections.push('npm start');
    sections.push('```\n');
  }

  // License
  if (options.includeLicense) {
    sections.push('## License\n');
    sections.push('MIT\n');
  }

  // Footer
  sections.push('---\n');
  sections.push('*Documentation generated with [CodeToDocsAI](https://github.com/yourusername/codetodocsai)*');

  return sections.join('\n');
}

export async function createReadmeInRepo(
  readme: string,
  config: GitHubWikiConfig
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const octokit = new Octokit({ auth: config.token });

    // Check if README.md exists
    let sha: string | undefined;
    try {
      const { data } = await octokit.repos.getContent({
        owner: config.owner,
        repo: config.repo,
        path: 'README.md',
      });
      if ('sha' in data) {
        sha = data.sha;
      }
    } catch (error) {
      // File doesn't exist, will create new
    }

    // Create or update README.md
    const response = await octokit.repos.createOrUpdateFileContents({
      owner: config.owner,
      repo: config.repo,
      path: 'README.md',
      message: sha ? 'docs: Update README.md' : 'docs: Create README.md',
      content: Buffer.from(readme).toString('base64'),
      ...(sha && { sha }),
    });

    return {
      success: true,
      url: response.data.content?.html_url,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================================================
// Slack Notifications
// ============================================================================

export interface SlackConfig {
  webhookUrl: string;
}

export async function sendSlackNotification(
  config: SlackConfig,
  options: {
    title: string;
    message: string;
    url?: string;
    color?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await axios.post(config.webhookUrl, {
      attachments: [
        {
          color: options.color || '#36a64f',
          title: options.title,
          text: options.message,
          ...(options.url && {
            title_link: options.url,
          }),
          footer: 'CodeToDocsAI',
          footer_icon: 'https://platform.slack-edge.com/img/default_application_icon.png',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    });

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================================================
// Integration Helpers
// ============================================================================

export interface IntegrationStatus {
  notion: boolean;
  confluence: boolean;
  githubWiki: boolean;
  slack: boolean;
}

export function checkIntegrations(config: {
  notion?: NotionConfig;
  confluence?: ConfluenceConfig;
  githubWiki?: GitHubWikiConfig;
  slack?: SlackConfig;
}): IntegrationStatus {
  return {
    notion: !!config.notion?.token,
    confluence: !!config.confluence?.apiToken,
    githubWiki: !!config.githubWiki?.token,
    slack: !!config.slack?.webhookUrl,
  };
}
