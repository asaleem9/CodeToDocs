import { marked } from 'marked';
import DOMPurify from 'dompurify';

/**
 * Escape a value for safe interpolation into HTML text/attribute context.
 */
function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render markdown to HTML and strip any dangerous markup. Documentation can
 * contain LLM/attacker-influenced content, so never embed the raw output.
 */
function renderSafeHtml(markdown: string): Promise<string> | string {
  const rendered = marked(markdown);
  if (rendered instanceof Promise) {
    return rendered.then((html) => DOMPurify.sanitize(html));
  }
  return DOMPurify.sanitize(rendered);
}

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

  // Convert markdown to sanitized HTML
  const htmlContent = await renderSafeHtml(documentation);
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
  const htmlContent = await renderSafeHtml(documentation);
  const metadataComment = `<!-- Generated: ${metadata.generatedAt.toISOString()} | Language: ${metadata.language} -->`;
  await navigator.clipboard.writeText(`${metadataComment}\n${htmlContent}`);
}

/**
 * Download documentation as a PDF file using browser's native print-to-PDF
 */
export async function downloadAsPDF(
  documentation: string,
  metadata: ExportMetadata,
  _filename?: string
): Promise<void> {
  // Convert markdown to sanitized HTML
  const htmlContent = await renderSafeHtml(documentation);
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
 * Shared paper stylesheet for exported documents — matches the in-app
 * "printout" surface: warm paper, ink text, serif headings, mono code.
 */
const PAPER_CSS = `
    * { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --paper: #f2ecdf;
      --paper-dim: #e7dfcc;
      --paper-line: #d5c9ae;
      --paper-meta: #a89a76;
      --ink: #1a1c19;
      --ink-soft: #494f49;
      --ink-faint: #767c72;
      --accent: #0d9488;
    }

    body {
      font-family: Georgia, 'Times New Roman', serif;
      line-height: 1.72;
      color: var(--ink);
      background: var(--paper);
      padding: 3rem 2rem;
    }

    .sheet {
      max-width: 820px;
      margin: 0 auto;
    }

    .masthead {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 2px solid var(--ink);
      padding-bottom: 0.6rem;
      margin-bottom: 0.75rem;
    }

    .masthead .brand,
    .masthead .doc-date,
    .colophon,
    .footer {
      font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--ink-soft);
    }

    .colophon {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem 1.5rem;
      border-bottom: 1px solid var(--paper-line);
      padding-bottom: 0.75rem;
      margin-bottom: 2rem;
      color: var(--ink-faint);
    }

    .colophon strong { color: var(--ink-soft); font-weight: 600; }

    h1, h2, h3, h4, h5, h6 {
      font-weight: 600;
      color: var(--ink);
      margin-top: 1.75rem;
      margin-bottom: 0.75rem;
      letter-spacing: -0.01em;
      page-break-after: avoid;
    }

    h1 { font-size: 1.9rem; line-height: 1.25; padding-bottom: 0.6rem; border-bottom: 1px solid var(--paper-line); }
    h2 { font-size: 1.45rem; padding-bottom: 0.35rem; border-bottom: 1px solid var(--paper-dim); }
    h3 { font-size: 1.2rem; }
    h4, h5, h6 { font-size: 1.05rem; }

    p { margin-bottom: 1rem; }

    ul, ol { margin-bottom: 1rem; padding-left: 1.6rem; }
    li { margin-bottom: 0.4rem; }
    li::marker { color: var(--paper-meta); }

    code {
      font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
      font-size: 0.82em;
      background: var(--paper-dim);
      color: var(--ink);
      padding: 0.15rem 0.4rem;
      border-radius: 2px;
    }

    pre {
      margin: 1.1rem 0;
      padding: 1rem 1.2rem;
      background: var(--paper-dim);
      border: 1px solid var(--paper-line);
      border-radius: 2px;
      overflow-x: auto;
      page-break-inside: avoid;
    }

    pre code { background: transparent; padding: 0; font-size: 0.85rem; line-height: 1.6; }

    blockquote {
      border-left: 3px solid var(--paper-meta);
      padding-left: 1.1rem;
      margin: 1.1rem 0;
      color: var(--ink-soft);
      font-style: italic;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.1rem 0;
      font-size: 0.95rem;
      page-break-inside: avoid;
    }

    th, td { border: 1px solid var(--paper-line); padding: 0.5rem 0.7rem; text-align: left; }
    th { background: var(--paper-dim); font-weight: 600; }

    a { color: var(--accent); text-decoration: underline; text-underline-offset: 2px; }

    hr { border: 0; border-top: 1px solid var(--paper-line); margin: 1.5rem 0; }

    .footer {
      margin-top: 3rem;
      border-top: 1px solid var(--paper-line);
      padding-top: 0.75rem;
      display: flex;
      justify-content: space-between;
      color: var(--ink-faint);
    }

    p, li, blockquote { orphans: 3; widows: 3; }
`;

function metadataColophon(metadata: ExportMetadata): string {
  const items: string[] = [
    `<span><strong>language</strong> ${escapeHtml(metadata.language)}</span>`,
    `<span><strong>generated</strong> ${escapeHtml(metadata.generatedAt.toLocaleString())}</span>`,
  ];
  if (metadata.qualityScore !== undefined) {
    items.push(`<span><strong>quality</strong> ${escapeHtml(metadata.qualityScore)}/100</span>`);
  }
  if (metadata.prInfo) {
    items.push(
      `<span><strong>source</strong> PR #${escapeHtml(metadata.prInfo.prNumber)} · ${escapeHtml(metadata.prInfo.repository)}</span>`,
      `<span><strong>branch</strong> ${escapeHtml(metadata.prInfo.branch)}</span>`,
      `<span><strong>author</strong> ${escapeHtml(metadata.prInfo.author)}</span>`
    );
  }
  return `<div class="colophon">${items.join('')}</div>`;
}

function paperDocument(
  htmlContent: string,
  metadata: ExportMetadata,
  extraCss = ''
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documentation - ${escapeHtml(metadata.language)}</title>
  <style>${PAPER_CSS}${extraCss}</style>
</head>
<body>
  <div class="sheet">
    <div class="masthead">
      <span class="brand">&gt; CodeToDocs</span>
      <span class="doc-date">${escapeHtml(metadata.generatedAt.toLocaleDateString())}</span>
    </div>
    ${metadataColophon(metadata)}
    <div class="content">
      ${htmlContent}
    </div>
    <div class="footer">
      <span>typeset by CodeToDocs</span>
      <span>${escapeHtml(metadata.language)} · ${escapeHtml(metadata.generatedAt.toLocaleDateString())}</span>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Format HTML document for printing/PDF with print-tuned page rules
 */
function formatPrintableDocument(htmlContent: string, metadata: ExportMetadata): string {
  const printCss = `
    @page { margin: 15mm; size: A4; }
    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
    body { padding: 1.5rem; font-size: 12.5px; }
`;
  return paperDocument(htmlContent, metadata, printCss);
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
  return paperDocument(htmlContent, metadata);
}
