import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useGSAP, bootSequence } from '../lib/motion'
import { getLanguageColor } from '../lib/languages'
import { docTitle, formatDate } from '../lib/docMeta'
import DocumentSheet from '../components/DocumentSheet'
import ExportMenu from '../components/ExportMenu'
import Panel from '../components/ui/Panel'
import Button, { buttonClasses } from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'
import { showErrorToast, showSuccessToast } from '../utils/errorHandler'
import type { QualityScoreData } from '../types'

interface StoredDoc {
  id: string
  documentation: string
  diagram?: string
  qualityScore?: QualityScoreData
  code: string
  language: string
  createdAt: string // Backend uses createdAt, not generatedAt
  // docMeta's DocTitleSource only declares 'single' | 'batch', but the
  // backend also writes 'pr' (backend/src/services/storageService.ts) — cast
  // to RawDocType where we need to distinguish it, rather than widen this
  // field and break docTitle()'s param type.
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

// 'single' is the backend's literal for a one-off manual generation — label
// it "manual" here since that's what it means from the list.
const TYPE_FILTERS = [
  { id: 'all', label: 'all' },
  { id: 'single', label: 'manual' },
  { id: 'batch', label: 'batch' },
  { id: 'pr', label: 'pr' },
] as const

type TypeFilter = (typeof TYPE_FILTERS)[number]['id']
type RawDocType = 'single' | 'batch' | 'pr'

const SEARCH_INPUT_CLASSES =
  'w-full rounded-[2px] border border-ink-700 bg-ink-850 px-3.5 py-2 font-mono text-[13px] text-ink-100 transition-colors placeholder:text-ink-400 hover:border-ink-600 focus:border-phosphor-500 focus:outline-none'

function History() {
  const navigate = useNavigate()
  const [docs, setDocs] = useState<StoredDoc[]>([])
  const [selectedDoc, setSelectedDoc] = useState<StoredDoc | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'my-docs' | 'public'>('my-docs')
  const [isDiagramCollapsed, setIsDiagramCollapsed] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const scopeRef = useRef<HTMLDivElement>(null)

  // client-side search + type filter over the already-loaded docs for the
  // active tab — no backend round-trip
  const filteredDocs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return docs.filter((doc) => {
      const docType = (doc.type as RawDocType | undefined) ?? 'single'
      if (typeFilter !== 'all' && docType !== typeFilter) return false
      if (!query) return true
      const haystack = `${docTitle(doc)} ${doc.language} ${docType}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [docs, searchQuery, typeFilter])

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

  const handleShareDocumentation = async () => {
    if (!selectedDoc) return

    try {
      await navigator.clipboard.writeText(`${window.location.origin}/app/docs/${selectedDoc.id}`)
      showSuccessToast('Share link copied to clipboard!')
    } catch (err) {
      showErrorToast(err)
    }
  }

  const handleSendToIntegration = () => {
    if (!selectedDoc) return

    navigate('/app/integrations', {
      state: { title: docTitle(selectedDoc), markdown: selectedDoc.documentation },
    })
  }

  const handleRegenerate = () => {
    if (!selectedDoc?.code) return

    navigate('/app', {
      state: { code: selectedDoc.code, language: selectedDoc.language },
    })
  }

  return (
    <div
      ref={scopeRef}
      className="mx-auto flex w-full max-w-[1400px] flex-1 min-h-0 flex-col gap-5 p-6"
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
            {filteredDocs.length}/{docs.length}{' '}
            {activeTab === 'public' ? 'public documents' : 'documents'}
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
        className="grid min-h-0 grid-cols-1 gap-5 lg:h-[calc(100dvh-24rem)] lg:min-h-[460px] lg:grid-cols-[380px_1fr]"
        style={{ opacity: 0 }}
      >
        <Panel
          title={activeTab === 'public' ? 'GALLERY' : 'DOCUMENTS'}
          className={`min-h-0 min-w-0 max-lg:max-h-[400px] ${selectedDoc ? 'max-lg:hidden' : ''}`}
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
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex flex-col gap-2 border-b border-ink-700/60 p-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="search documents…"
                  className={SEARCH_INPUT_CLASSES}
                />
                <div className="flex flex-wrap gap-1.5">
                  {TYPE_FILTERS.map((filter) => (
                    <Button
                      key={filter.id}
                      size="sm"
                      variant={typeFilter === filter.id ? 'primary' : 'ghost'}
                      onClick={() => setTypeFilter(filter.id)}
                    >
                      [{filter.label}]
                    </Button>
                  ))}
                </div>
              </div>

              {filteredDocs.length === 0 ? (
                <EmptyState
                  glyph="⌕"
                  title="no matches"
                  hint="Try a different search term or type filter."
                  className="flex-1"
                />
              ) : (
              <div className="min-h-0 flex-1 overflow-y-auto">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => handleSelectDoc(doc)}
                  className={`group relative cursor-pointer border-b border-l-2 border-b-ink-700/60 px-4 py-3 pointer-coarse:pr-24 transition-colors ${
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
                    <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 pointer-coarse:opacity-100">
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
            </div>
          )}
        </Panel>

        <Panel
          title="DETAIL"
          active={!!selectedDoc}
          className="min-h-0 min-w-0 max-lg:h-[calc(100dvh-14rem)]"
          actions={
            selectedDoc ? (
              // 6 actions don't fit one row below lg. The tab bar is absolutely
              // positioned (Panel.tsx) and sizes to fit this span, so wrapping
              // would grow it tall enough to cover the content underneath —
              // cap the width instead and let the rest scroll horizontally,
              // keeping it the same single-row height as desktop.
              <span className="flex items-center gap-1.5 max-lg:max-w-[46vw] max-lg:overflow-x-auto">
                <Link to={`/app/docs/${selectedDoc.id}`} className={buttonClasses('ghost', 'sm')}>
                  open ↗
                </Link>
                <Button size="sm" variant="ghost" onClick={handleShareDocumentation}>
                  share
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCopyDocumentation}>
                  copy
                </Button>
                <Button size="sm" variant="ghost" onClick={handleSendToIntegration}>
                  send to…
                </Button>
                <ExportMenu
                  documentation={selectedDoc.documentation}
                  metadata={{
                    language: selectedDoc.language,
                    generatedAt: new Date(selectedDoc.createdAt),
                    qualityScore: selectedDoc.qualityScore?.score,
                    prInfo: selectedDoc.prInfo,
                  }}
                />
                {selectedDoc.code && (
                  <Button size="sm" variant="ghost" onClick={handleRegenerate}>
                    regen
                  </Button>
                )}
              </span>
            ) : undefined
          }
        >
          {selectedDoc ? (
            <div className="flex min-h-0 flex-1 flex-col">
              {/* drill-in back control — desktop shows both panes side by
                  side, so this row only exists below lg. pt-16 clears the
                  floating action-tab bar above it (Panel.tsx), which grows
                  taller than a plain title on touch — see the actions span
                  above, capped and scrollable for the same reason. */}
              <div className="border-b border-ink-700/60 px-2 pt-16 pb-2 lg:hidden">
                <Button size="sm" variant="ghost" onClick={() => setSelectedDoc(null)}>
                  ← back
                </Button>
              </div>
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

                  <DocumentSheet
                    documentation={selectedDoc.documentation}
                    diagram={selectedDoc.diagram}
                    qualityScore={selectedDoc.qualityScore}
                    diagramCollapsed={isDiagramCollapsed}
                    onDiagramToggle={() => setIsDiagramCollapsed(!isDiagramCollapsed)}
                  />
                </div>
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
