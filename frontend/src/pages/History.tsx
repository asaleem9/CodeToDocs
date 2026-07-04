import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { paperTheme } from '../lib/syntaxTheme'
import { renderMermaid } from '../lib/mermaid'
import { useGSAP, bootSequence } from '../lib/motion'
import { getLanguageColor } from '../lib/languages'
import QualityScore from '../components/QualityScore'
import Panel from '../components/ui/Panel'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'
import { showErrorToast, showSuccessToast } from '../utils/errorHandler'

interface QualityScoreData {
  score: number
  breakdown: {
    hasOverview: boolean
    hasParameters: boolean
    hasReturnValues: boolean
    hasExamples: boolean
    hasUsage: boolean
    hasDependencies: boolean
    hasNotes: boolean
    codeBlocksCount: number
  }
}


interface StoredDoc {
  id: string
  documentation: string
  diagram?: string
  qualityScore?: QualityScoreData
  code: string
  language: string
  createdAt: string // Backend uses createdAt, not generatedAt
  type?: 'single' | 'batch'
  isPublic?: boolean
  batchInfo?: {
    repoUrl: string
    totalFiles: number
    successCount: number
    failedCount: number
  }
  prInfo?: {
    prNumber: number
    repository: string
    branch: string
    author: string
  }
}

const TABS = [
  { id: 'my-docs', label: 'MY DOCUMENTS' },
  { id: 'public', label: 'PUBLIC GALLERY' },
] as const

function History() {
  const [docs, setDocs] = useState<StoredDoc[]>([])
  const [selectedDoc, setSelectedDoc] = useState<StoredDoc | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDiagramCollapsed, setIsDiagramCollapsed] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<'my-docs' | 'public'>('my-docs')
  const diagramRef = useRef<HTMLDivElement>(null)
  const scopeRef = useRef<HTMLDivElement>(null)

  // page boot-in
  useGSAP(
    () => {
      if (scopeRef.current) bootSequence(scopeRef.current)
    },
    { scope: scopeRef }
  )

  useEffect(() => {
    fetchHistory()
  }, [activeTab])

  // Render diagram when selected doc changes
  useEffect(() => {
    if (selectedDoc?.diagram && diagramRef.current) {
      renderMermaid(diagramRef.current, selectedDoc.diagram)
    }
  }, [selectedDoc])

  const fetchHistory = async () => {
    setIsLoading(true)
    try {
      const url = activeTab === 'public' ? '/api/documentation?view=public' : '/api/documentation'
      const response = await axios.get(url, { withCredentials: true })
      setDocs(response.data.documentation || [])
      // Reset selected doc when switching tabs
      setSelectedDoc(null)
    } catch (error) {
      showErrorToast(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectDoc = (doc: StoredDoc) => {
    setSelectedDoc(doc)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm('Are you sure you want to delete this documentation?')) {
      return
    }

    try {
      await axios.delete(`/api/documentation/${id}`, { withCredentials: true })
      setDocs(docs.filter(d => d.id !== id))
      if (selectedDoc?.id === id) {
        setSelectedDoc(null)
      }
      showSuccessToast('Documentation deleted')
    } catch (error) {
      showErrorToast(error)
    }
  }

  const handleToggleVisibility = async (id: string, current: boolean | undefined, e: React.MouseEvent) => {
    e.stopPropagation()

    const next = !current
    try {
      await axios.patch(`/api/documentation/${id}/visibility`, { isPublic: next })
      setDocs(docs.map(d => (d.id === id ? { ...d, isPublic: next } : d)))
      showSuccessToast(next ? 'Documentation is now public' : 'Documentation is now private')
    } catch (error) {
      showErrorToast(error)
    }
  }

  const handleCopyDocumentation = async () => {
    if (!selectedDoc) return

    try {
      await navigator.clipboard.writeText(selectedDoc.documentation)
      showSuccessToast('Documentation copied to clipboard!')
    } catch (err) {
      showErrorToast(err)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown'

    const date = new Date(dateString)

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString)
      return 'Invalid date'
    }

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  const docTitle = (doc: StoredDoc) => {
    if (doc.type === 'batch' && doc.batchInfo) {
      return doc.batchInfo.repoUrl.split('/').slice(-2).join('/')
    }
    if (doc.prInfo) {
      return `PR #${doc.prInfo.prNumber} · ${doc.prInfo.repository.split('/')[1]}`
    }
    return `${doc.language} · manual`
  }

  return (
    <div
      ref={scopeRef}
      className="mx-auto flex w-full max-w-[1400px]! flex-1 min-h-0 flex-col gap-5 p-6"
    >
      {/* header */}
      <header
        data-boot
        className="flex flex-wrap items-end justify-between gap-4"
        style={{ opacity: 0 }}
      >
        <div>
          <h1 className="font-display text-3xl text-ink-100">History</h1>
          <p className="mt-1 font-sans text-sm text-ink-400">Recent documentation generations</p>
        </div>
        {!isLoading && docs.length > 0 && (
          <span className="font-mono text-[13px] text-ink-300">
            {docs.length} {activeTab === 'public' ? 'public documents' : 'documents'}
          </span>
        )}
      </header>

      {/* bracket tabs */}
      <div data-boot className="flex gap-2 border-b border-ink-700" style={{ opacity: 0 }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`-mb-px cursor-pointer border-b-2 px-3 py-2 font-display text-[12px] tracking-[0.12em] transition-colors ${
              activeTab === tab.id
                ? 'border-phosphor-400 text-phosphor-300'
                : 'border-transparent text-ink-400 hover:text-ink-300'
            }`}
          >
            [ {tab.label} ]
          </button>
        ))}
      </div>

      {/* sidebar list + detail pane — the grid owns the viewport height so
          both columns scroll internally and the page never grows */}
      <div
        data-boot
        className="grid min-h-0 grid-cols-1 gap-5 lg:h-[calc(100vh-24rem)] lg:min-h-[460px] lg:grid-cols-[380px_1fr]"
        style={{ opacity: 0 }}
      >
        <Panel
          title={activeTab === 'public' ? 'GALLERY' : 'DOCUMENTS'}
          className="min-h-0 min-w-0 max-lg:max-h-[400px]"
        >
          {isLoading ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8">
              <Spinner className="text-lg text-phosphor-400" />
              <p className="font-mono text-[13px] text-ink-400">loading history…</p>
            </div>
          ) : docs.length === 0 ? (
            <EmptyState
              glyph="░▒▓"
              title={activeTab === 'public' ? 'no public documents yet' : 'no history yet'}
              hint={
                activeTab === 'public'
                  ? 'Public documents will appear here.'
                  : 'Generated documentation will appear here.'
              }
            />
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => handleSelectDoc(doc)}
                  className={`group relative cursor-pointer border-b border-l-2 border-b-ink-700/60 px-4 py-3 transition-colors ${
                    selectedDoc?.id === doc.id
                      ? 'border-l-phosphor-400 bg-phosphor-400/5'
                      : 'border-l-transparent hover:bg-ink-850'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      className="shrink-0 font-mono text-[10px] leading-none select-none"
                      style={{ color: getLanguageColor(doc.language) }}
                    >
                      ●
                    </span>
                    <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-ink-100">
                      {docTitle(doc)}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-ink-400">
                      {formatDate(doc.createdAt)}
                    </span>
                  </div>

                  {doc.type === 'batch' && doc.batchInfo ? (
                    <div className="mt-1 pl-[22px]">
                      <Badge tone="amber">
                        batch {doc.batchInfo.successCount}/{doc.batchInfo.totalFiles} files
                      </Badge>
                    </div>
                  ) : doc.prInfo ? (
                    <div className="mt-1 pl-[22px]">
                      <Badge tone="phosphor">pr #{doc.prInfo.prNumber}</Badge>
                    </div>
                  ) : null}

                  {activeTab === 'my-docs' && (
                    <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={(e) => handleToggleVisibility(doc.id, doc.isPublic, e)}
                        title={
                          doc.isPublic
                            ? 'Public — click to make private'
                            : 'Private — click to make public'
                        }
                        className="cursor-pointer rounded-[2px] border border-ink-700 bg-ink-900 px-1.5 py-0.5 font-mono text-[11px] text-ink-300 transition-colors hover:border-ink-600 hover:text-ink-100"
                      >
                        {doc.isPublic ? 'pub' : 'prv'}
                      </button>
                      <button
                        onClick={(e) => handleDelete(doc.id, e)}
                        title="Delete"
                        className="cursor-pointer rounded-[2px] border border-red/20 bg-ink-900 px-1.5 py-0.5 font-mono text-[11px] text-red transition-colors hover:border-red/50 hover:bg-red/10"
                      >
                        del
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="DETAIL"
          active={!!selectedDoc}
          className="min-h-0 min-w-0"
          actions={
            selectedDoc ? (
              <Button size="sm" variant="ghost" onClick={handleCopyDocumentation}>
                copy
              </Button>
            ) : undefined
          }
        >
          {selectedDoc ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="flex min-h-full flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-display text-base text-ink-100">
                    {selectedDoc.type === 'batch'
                      ? 'Full Repository Documentation'
                      : 'Generated Documentation'}
                  </h2>
                  {selectedDoc.type === 'batch' && selectedDoc.batchInfo && (
                    <span className="flex items-center gap-2">
                      <Badge tone="amber">
                        batch {selectedDoc.batchInfo.successCount}/{selectedDoc.batchInfo.totalFiles}
                      </Badge>
                      <span className="font-mono text-[12px] text-ink-400">
                        {selectedDoc.batchInfo.repoUrl.split('/').slice(-2).join('/')}
                      </span>
                    </span>
                  )}
                  {selectedDoc.prInfo && (
                    <span className="flex items-center gap-2">
                      <Badge tone="phosphor">pr #{selectedDoc.prInfo.prNumber}</Badge>
                      <span className="font-mono text-[12px] text-ink-400">
                        {selectedDoc.prInfo.repository}
                      </span>
                    </span>
                  )}
                </div>

                {/* the printout */}
                <div className="border border-paper-300 shadow-[0_14px_40px_rgba(0,0,0,0.5)]">
                  <div className="markdown-content">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ node, inline, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '')
                          return !inline && match ? (
                            <SyntaxHighlighter
                              style={paperTheme}
                              language={match[1]}
                              PreTag="div"
                              {...props}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          ) : (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          )
                        }
                      }}
                    >
                      {selectedDoc.documentation}
                    </ReactMarkdown>

                    {selectedDoc.diagram && (
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

                {selectedDoc.qualityScore && <QualityScore qualityScore={selectedDoc.qualityScore} />}
              </div>
            </div>
          ) : (
            <EmptyState
              glyph="¶"
              title="select a document"
              hint="Pick any item from the list to view its documentation."
            />
          )}
        </Panel>
      </div>
    </div>
  )
}

export default History
