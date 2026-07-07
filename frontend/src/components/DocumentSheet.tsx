import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { paperTheme } from '../lib/syntaxTheme'
import { renderMermaid } from '../lib/mermaid'
import QualityScore from './QualityScore'
import type { QualityScoreData } from '../types'

// Shared ReactMarkdown code renderer — syntax highlighting on the paper sheet.
const markdownComponents = {
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '')
    return !inline && match ? (
      <SyntaxHighlighter style={paperTheme} language={match[1]} PreTag="div" {...props}>
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    )
  },
}

interface DocumentSheetProps {
  documentation: string
  diagram?: string
  qualityScore?: QualityScoreData
  /** Suppresses the diagram + quality report and shows a trailing caret while a doc is still streaming in. */
  streaming?: boolean
}

// The "printout": a bordered paper sheet holding rendered documentation,
// its collapsible flow diagram, and the quality report below it.
function DocumentSheet({ documentation, diagram, qualityScore, streaming = false }: DocumentSheetProps) {
  const [isDiagramCollapsed, setIsDiagramCollapsed] = useState<boolean>(false)
  const diagramRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (diagram && !streaming && diagramRef.current) {
      renderMermaid(diagramRef.current, diagram)
    }
  }, [diagram, streaming])

  return (
    <div className="flex flex-col gap-4">
      <div data-sheet className="border border-paper-300 shadow-[0_14px_40px_rgba(0,0,0,0.5)]">
        <div className="markdown-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {documentation}
          </ReactMarkdown>

          {streaming && (
            <span aria-hidden className="animate-caret-blink text-phosphor-400">
              ▮
            </span>
          )}

          {diagram && !streaming && (
            <div className="border-t border-paper-300 px-2 pt-4 pb-2">
              <button
                className="flex w-full cursor-pointer items-center justify-between font-mono text-[11px] tracking-[0.14em] text-print-400 uppercase"
                onClick={() => setIsDiagramCollapsed(!isDiagramCollapsed)}
              >
                <span>figure 1 — flow diagram</span>
                <span aria-hidden>{isDiagramCollapsed ? '▸' : '▾'}</span>
              </button>
              {!isDiagramCollapsed && (
                <div ref={diagramRef} className="mt-3 flex justify-center overflow-x-auto" />
              )}
            </div>
          )}
        </div>
      </div>

      {qualityScore && !streaming && <QualityScore qualityScore={qualityScore} />}
    </div>
  )
}

export default DocumentSheet
