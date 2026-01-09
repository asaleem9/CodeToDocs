import { marked } from 'marked';
import html2pdf from 'html2pdf.js';

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
 * Download documentation as a PDF file using browser's native print-to-PDF
 */
export async function downloadAsPDF(
  documentation: string,
  metadata: ExportMetadata,
  filename?: string
): Promise<void> {
  // Convert markdown to HTML
  const htmlContent = await marked(documentation);
  const fullHTML = formatPrintableDocument(htmlContent, metadata);

  // Open a new window with the content
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow pop-ups to download PDF. Then try again.');
    return;
  }

  // Write the HTML to the new window
  printWindow.document.open();
  printWindow.document.write(fullHTML);
  printWindow.document.close();

  // Wait for content to load
  await new Promise(resolve => setTimeout(resolve, 500));

  // Trigger print dialog (user can save as PDF)
  printWindow.print();
}

/**
 * Format HTML document for printing/PDF with optimized print styles
 */
function formatPrintableDocument(htmlContent: string, metadata: ExportMetadata): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Documentation - ${metadata.language}</title>
  <style>
    @page {
      margin: 15mm;
      size: A4;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
      line-height: 1.8;
      color: #1e293b;
      background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
      padding: 25px;
      font-size: 12px;
    }

    /* Beautiful header */
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 25px;
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
      page-break-inside: avoid;
    }

    .header h1 {
      font-size: 24px;
      margin-bottom: 5px;
      font-weight: 700;
      color: white;
      border: none;
      padding: 0;
    }

    .header .subtitle {
      font-size: 11px;
      opacity: 0.9;
    }

    /* Metadata box */
    .metadata {
      background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
      border-left: 5px solid #818cf8;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 25px;
      page-break-inside: avoid;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .metadata-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }

    .metadata-item {
      font-size: 10px;
      color: #475569;
    }

    .metadata-item strong {
      color: #334155;
      font-weight: 600;
    }

    .metadata-label {
      display: inline-block;
      background: #818cf8;
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 600;
      margin-right: 5px;
    }

    /* Content styling */
    h1 {
      font-size: 22px;
      margin-top: 20px;
      margin-bottom: 12px;
      color: #667eea;
      border-bottom: 3px solid #818cf8;
      padding-bottom: 6px;
      page-break-after: avoid;
      font-weight: 700;
    }

    h2 {
      font-size: 18px;
      margin-top: 18px;
      margin-bottom: 10px;
      color: #764ba2;
      border-bottom: 2px solid #c084fc;
      padding-bottom: 5px;
      page-break-after: avoid;
      font-weight: 600;
    }

    h3 {
      font-size: 15px;
      margin-top: 15px;
      margin-bottom: 8px;
      color: #4f46e5;
      page-break-after: avoid;
      font-weight: 600;
    }

    h4, h5, h6 {
      font-size: 13px;
      margin-top: 12px;
      margin-bottom: 6px;
      color: #6366f1;
      page-break-after: avoid;
      font-weight: 600;
    }

    p {
      margin-bottom: 10px;
      color: #334155;
      text-align: justify;
    }

    ul, ol {
      margin-bottom: 12px;
      padding-left: 25px;
      color: #334155;
    }

    li {
      margin-bottom: 6px;
      line-height: 1.7;
    }

    /* Inline code */
    code {
      background: linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%);
      color: #a21caf;
      padding: 3px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-family: 'Monaco', 'Courier New', monospace;
      border: 1px solid #e9d5ff;
      font-weight: 500;
    }

    /* Code blocks */
    pre {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      color: #e2e8f0;
      padding: 16px;
      border-radius: 10px;
      overflow-x: auto;
      margin: 15px 0;
      page-break-inside: avoid;
      border: 2px solid #334155;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
      font-size: 10px;
      border: none;
      line-height: 1.6;
    }

    /* Blockquotes */
    blockquote {
      border-left: 5px solid #818cf8;
      background: #f8fafc;
      padding: 12px 15px;
      margin: 15px 0;
      color: #475569;
      font-style: italic;
      border-radius: 0 8px 8px 0;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 11px;
      page-break-inside: avoid;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    th, td {
      border: 1px solid #e2e8f0;
      padding: 10px;
      text-align: left;
    }

    th {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-weight: 600;
    }

    tr:nth-child(even) {
      background: #f8fafc;
    }

    /* Links */
    a {
      color: #818cf8;
      text-decoration: none;
      font-weight: 500;
      border-bottom: 1px dotted #818cf8;
    }

    /* Lists styling */
    ul li::marker {
      color: #818cf8;
      font-weight: bold;
    }

    ol li::marker {
      color: #818cf8;
      font-weight: bold;
    }

    /* Footer */
    .footer {
      margin-top: 40px;
      padding: 20px;
      background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
      border-radius: 10px;
      text-align: center;
      color: #64748b;
      font-size: 10px;
      border-top: 3px solid #818cf8;
    }

    .footer strong {
      color: #475569;
      font-weight: 600;
    }

    /* Better pagination */
    p, li, blockquote {
      orphans: 3;
      widows: 3;
    }

    h1, h2, h3, h4, h5, h6 {
      page-break-after: avoid;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📘 ${metadata.language} Documentation</h1>
    <div class="subtitle">Generated with CodeToDocsAI • ${metadata.generatedAt.toLocaleDateString()}</div>
  </div>

  <div class="metadata">
    <div class="metadata-grid">
      <div class="metadata-item">
        <span class="metadata-label">LANGUAGE</span>
        <strong>${metadata.language}</strong>
      </div>
      <div class="metadata-item">
        <span class="metadata-label">DATE</span>
        <strong>${metadata.generatedAt.toLocaleString()}</strong>
      </div>
      ${metadata.qualityScore !== undefined ? `
        <div class="metadata-item">
          <span class="metadata-label">QUALITY</span>
          <strong>${metadata.qualityScore}/100</strong>
        </div>
      ` : ''}
      ${metadata.prInfo ? `
        <div class="metadata-item">
          <span class="metadata-label">SOURCE</span>
          <strong>PR #${metadata.prInfo.prNumber}</strong>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">REPO</span>
          <strong>${metadata.prInfo.repository}</strong>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">BRANCH</span>
          <strong>${metadata.prInfo.branch}</strong>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">AUTHOR</span>
          <strong>${metadata.prInfo.author}</strong>
        </div>
      ` : ''}
    </div>
  </div>

  <div class="content">
    ${htmlContent}
  </div>

  <div class="footer">
    <strong>Generated by CodeToDocsAI</strong><br>
    Powered by Claude AI • Anthropic
  </div>
</body>
</html>`;
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
