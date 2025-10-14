import { marked } from 'marked';

export interface ExportMetadata {
  language: string;
  generatedAt: Date;
  qualityScore?: number;
  prInfo?: {
    prNumber: number;
    repository: string;
    branch: string;
    author: string;
  };
}

/**
 * Download documentation as a Markdown file
 */
export function downloadAsMarkdown(
  documentation: string,
  metadata: ExportMetadata,
  filename?: string
): void {
  const timestamp = new Date().toISOString().split('T')[0];
  const defaultFilename = `documentation-${metadata.language}-${timestamp}.md`;

  // Add metadata header
  const content = formatMarkdownWithMetadata(documentation, metadata);

  // Create blob and download
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download documentation as an HTML file
 */
export async function downloadAsHTML(
  documentation: string,
  metadata: ExportMetadata,
  filename?: string
): Promise<void> {
  const timestamp = new Date().toISOString().split('T')[0];
  const defaultFilename = `documentation-${metadata.language}-${timestamp}.html`;

  // Convert markdown to HTML
  const htmlContent = await marked(documentation);
  const fullHTML = formatHTMLDocument(htmlContent, metadata);

  // Create blob and download
  const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy documentation as Markdown to clipboard
 */
export async function copyAsMarkdown(
  documentation: string,
  metadata: ExportMetadata
): Promise<void> {
  const content = formatMarkdownWithMetadata(documentation, metadata);
  await navigator.clipboard.writeText(content);
}

/**
 * Copy documentation as HTML to clipboard
 */
export async function copyAsHTML(
  documentation: string,
  metadata: ExportMetadata
): Promise<void> {
  const htmlContent = await marked(documentation);
  const metadataComment = `<!-- Generated: ${metadata.generatedAt.toISOString()} | Language: ${metadata.language} -->`;
  await navigator.clipboard.writeText(`${metadataComment}\n${htmlContent}`);
}

/**
 * Format Markdown with metadata header
 */
function formatMarkdownWithMetadata(
  documentation: string,
  metadata: ExportMetadata
): string {
  const lines: string[] = [];

  lines.push('---');
  lines.push('# Documentation Metadata');
  lines.push(`- **Language:** ${metadata.language}`);
  lines.push(`- **Generated:** ${metadata.generatedAt.toLocaleString()}`);

  if (metadata.qualityScore !== undefined) {
    lines.push(`- **Quality Score:** ${metadata.qualityScore}/100`);
  }

  if (metadata.prInfo) {
    lines.push(`- **Source:** PR #${metadata.prInfo.prNumber} in ${metadata.prInfo.repository}`);
    lines.push(`- **Branch:** ${metadata.prInfo.branch}`);
    lines.push(`- **Author:** ${metadata.prInfo.author}`);
  }

  lines.push('---');
  lines.push('');
  lines.push(documentation);

  return lines.join('\n');
}

/**
 * Format full HTML document with styling
 */
function formatHTMLDocument(
  htmlContent: string,
  metadata: ExportMetadata
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documentation - ${metadata.language}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background: #f8fafc;
      padding: 2rem;
      max-width: 900px;
      margin: 0 auto;
    }

    .metadata {
      background: #f1f5f9;
      border-left: 4px solid #818cf8;
      padding: 1.5rem;
      margin-bottom: 2rem;
      border-radius: 8px;
    }

    .metadata h3 {
      margin-bottom: 1rem;
      color: #334155;
    }

    .metadata-list {
      list-style: none;
    }

    .metadata-list li {
      padding: 0.25rem 0;
      color: #64748b;
    }

    .metadata-list strong {
      color: #475569;
    }

    .content {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.5rem;
      margin-bottom: 0.75rem;
      color: #0f172a;
      font-weight: 600;
    }

    h1 {
      font-size: 2rem;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 0.5rem;
    }

    h2 {
      font-size: 1.5rem;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 0.375rem;
    }

    h3 {
      font-size: 1.25rem;
    }

    p {
      margin-bottom: 1rem;
    }

    ul, ol {
      margin-bottom: 1rem;
      padding-left: 2rem;
    }

    li {
      margin-bottom: 0.5rem;
    }

    code {
      background: #f1f5f9;
      color: #c026d3;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-size: 0.9em;
      font-family: 'Monaco', 'Courier New', monospace;
    }

    pre {
      background: #1e293b;
      color: #e2e8f0;
      padding: 1.5rem;
      border-radius: 8px;
      overflow-x: auto;
      margin: 1rem 0;
    }

    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
    }

    blockquote {
      border-left: 4px solid #818cf8;
      padding-left: 1rem;
      margin: 1rem 0;
      color: #64748b;
      font-style: italic;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }

    th, td {
      border: 1px solid #e2e8f0;
      padding: 0.75rem;
      text-align: left;
    }

    th {
      background: #f8fafc;
      font-weight: 600;
    }

    a {
      color: #818cf8;
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    .footer {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #94a3b8;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="metadata">
    <h3>📄 Documentation Metadata</h3>
    <ul class="metadata-list">
      <li><strong>Language:</strong> ${metadata.language}</li>
      <li><strong>Generated:</strong> ${metadata.generatedAt.toLocaleString()}</li>
      ${metadata.qualityScore !== undefined ? `<li><strong>Quality Score:</strong> ${metadata.qualityScore}/100</li>` : ''}
      ${metadata.prInfo ? `
        <li><strong>Source:</strong> PR #${metadata.prInfo.prNumber} in ${metadata.prInfo.repository}</li>
        <li><strong>Branch:</strong> ${metadata.prInfo.branch}</li>
        <li><strong>Author:</strong> ${metadata.prInfo.author}</li>
      ` : ''}
    </ul>
  </div>

  <div class="content">
    ${htmlContent}
  </div>

  <div class="footer">
    Generated by CodeToDocsAI
  </div>
</body>
</html>`;
}
