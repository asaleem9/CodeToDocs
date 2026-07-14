import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { useGSAP, bootSequence } from '../lib/motion'
import { getLanguageColor } from '../lib/languages'
import { docTitle, formatDate } from '../lib/docMeta'
import DocumentSheet from '../components/DocumentSheet'
import ExportMenu from '../components/ExportMenu'
import Panel from '../components/ui/Panel'
import Button from '../components/ui/Button'
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
  createdAt: string
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

type ViewState = 'loading' | 'private' | 'not-found' | 'error' | 'loaded'

// A single document, addressable by URL — the target of History's "open"
// link and the share buttons on the generation pages. Same public-or-owner
// rules as the backend: a public doc opens for anyone, a private one only
// for its owner (everyone else gets the same 403 empty-state, logged in or
// not — there's nothing to distinguish there).
function DocView() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [doc, setDoc] = useState<StoredDoc | null>(null)
  const [state, setState] = useState<ViewState>('loading')
  const [isDiagramCollapsed, setIsDiagramCollapsed] = useState<boolean>(false)
  const scopeRef = useRef<HTMLDivElement>(null)

  // page boot-in — reruns once the doc (or an empty-state) actually renders
  useGSAP(
    () => {
      if (scopeRef.current) bootSequence(scopeRef.current)
    },
    { scope: scopeRef, dependencies: [state] }
  )

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setState('loading')
    setDoc(null)

    axios
      .get(`/api/documentation/${id}`, { withCredentials: true })
      .then((response) => {
        if (cancelled) return
        setDoc(response.data)
        setState('loaded')
      })
      .catch((error) => {
        if (cancelled) return
        const status = error?.response?.status
        if (status === 403) setState('private')
        else if (status === 404) setState('not-found')
        else {
          setState('error')
          showErrorToast(error)
        }
      })

    return () => {
      cancelled = true
    }
  }, [id])

  const handleShare = async () => {
    if (!id) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/app/docs/${id}`)
      showSuccessToast('Share link copied to clipboard!')
    } catch (err) {
      showErrorToast(err)
    }
  }

  const handleSendToIntegration = () => {
    if (!doc) return
    navigate('/app/integrations', {
      state: { title: docTitle(doc), markdown: doc.documentation },
    })
  }

  return (
    <div
      ref={scopeRef}
      className="docview-page mx-auto flex w-full max-w-[1400px] flex-1 min-h-0 flex-col gap-5 p-6"
    >
      {/* header — only the loaded doc has metadata to show */}
      <header
        data-boot
        className="flex flex-wrap items-start justify-between gap-4"
        style={{ opacity: 0 }}
      >
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            {state === 'loaded' && doc && (
              <span
                aria-hidden
                className="shrink-0 font-mono text-[12px] leading-none select-none"
                style={{ color: getLanguageColor(doc.language) }}
              >
                ●
              </span>
            )}
            <h1 className="min-w-0 truncate font-display text-2xl text-ink-100">
              {state === 'loaded' && doc ? docTitle(doc) : 'Document'}
            </h1>
            {state === 'loaded' && doc?.type === 'batch' && doc.batchInfo && (
              <Badge tone="amber">
                batch {doc.batchInfo.successCount}/{doc.batchInfo.totalFiles} files
              </Badge>
            )}
            {state === 'loaded' && doc?.prInfo && (
              <Badge tone="phosphor">pr #{doc.prInfo.prNumber}</Badge>
            )}
          </div>
          {state === 'loaded' && doc && (
            <p className="font-mono text-[12px] text-ink-400">{formatDate(doc.createdAt)}</p>
          )}
        </div>

        {state === 'loaded' && doc && (
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="ghost" onClick={handleShare}>
              share
            </Button>
            <Button size="sm" variant="ghost" onClick={handleSendToIntegration}>
              send to…
            </Button>
            <ExportMenu
              documentation={doc.documentation}
              metadata={{
                language: doc.language,
                generatedAt: new Date(doc.createdAt),
                qualityScore: doc.qualityScore?.score,
                prInfo: doc.prInfo,
              }}
            />
          </div>
        )}
      </header>

      {/* body — capped height so a long doc scrolls inside the panel
          instead of stretching the page; dvh on mobile, vh past lg */}
      <div data-boot className="min-h-0 flex-1" style={{ opacity: 0 }}>
        <Panel
          title="DOCUMENT"
          active={state === 'loaded'}
          className="h-[calc(100dvh-20rem)] min-h-[320px] min-w-0 lg:h-[calc(100vh-16rem)] lg:min-h-[460px]"
        >
          {state === 'loading' && (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-8">
              <Spinner className="text-lg text-phosphor-400" />
              <p className="font-mono text-[13px] text-ink-400">loading document…</p>
            </div>
          )}

          {state === 'private' && (
            <EmptyState
              glyph="⊘"
              title="this document is private"
              hint={
                <>
                  You don't have access to view it. Head back to{' '}
                  <Link
                    to="/app/history"
                    className="text-phosphor-300 underline underline-offset-2 hover:text-phosphor-200"
                  >
                    history
                  </Link>
                  .
                </>
              }
            />
          )}

          {state === 'not-found' && (
            <EmptyState
              glyph="?"
              title="document not found"
              hint={
                <>
                  This link may be broken, or the document was deleted. Back to{' '}
                  <Link
                    to="/app/history"
                    className="text-phosphor-300 underline underline-offset-2 hover:text-phosphor-200"
                  >
                    history
                  </Link>
                  .
                </>
              }
            />
          )}

          {state === 'error' && (
            <EmptyState
              glyph="!"
              title="couldn't load this document"
              hint="Something went wrong fetching it — try again in a moment."
            />
          )}

          {state === 'loaded' && doc && (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="flex min-h-full min-w-0 flex-col gap-4 p-4">
                <DocumentSheet
                  documentation={doc.documentation}
                  diagram={doc.diagram}
                  qualityScore={doc.qualityScore}
                  diagramCollapsed={isDiagramCollapsed}
                  onDiagramToggle={() => setIsDiagramCollapsed(!isDiagramCollapsed)}
                />
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}

export default DocView
