import { useRef, useState } from 'react'
import { gsap, useGSAP, bootSequence, prefersReducedMotion } from '../lib/motion'
import DocumentSheet from '../components/DocumentSheet'
import ExportMenu from '../components/ExportMenu'
import { useGenerationJob } from '../hooks/useGenerationJob'
import { docTitle } from '../lib/docMeta'
import Panel from '../components/ui/Panel'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import ProgressBar from '../components/ui/ProgressBar'
import { showErrorToast, showSuccessToast } from '../utils/errorHandler'

// Mirrors the backend's PR URL validator (prService.ts) — gate obviously bad
// input client-side instead of round-tripping to the server for it.
const PR_URL_PATTERN = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/

function PullRequest() {
  const [prUrl, setPrUrl] = useState<string>('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [isDiagramCollapsed, setIsDiagramCollapsed] = useState<boolean>(false)
  const scopeRef = useRef<HTMLDivElement>(null)

  const job = useGenerationJob()
  const isLoading = job.phase === 'submitting' || job.phase === 'running'
  const currentStatus = job.statusLog[job.statusLog.length - 1] || ''

  // page boot-in
  useGSAP(
    () => {
      if (scopeRef.current) bootSequence(scopeRef.current)
    },
    { scope: scopeRef }
  )

  // the printout: the doc slides out of the machine when it lands
  useGSAP(
    () => {
      if (!job.result || !scopeRef.current) return
      const sheet = scopeRef.current.querySelector('[data-sheet]')
      if (!sheet || prefersReducedMotion()) return
      gsap.fromTo(
        sheet,
        { clipPath: 'inset(0 0 100% 0)', y: -12 },
        { clipPath: 'inset(0 0 0% 0)', y: 0, duration: 0.8, ease: 'power2.inOut' }
      )
    },
    { dependencies: [job.result], scope: scopeRef }
  )

  const handleGenerate = () => {
    const trimmed = prUrl.trim()
    if (!trimmed) {
      setUrlError('Paste a GitHub PR URL first.')
      return
    }
    if (!PR_URL_PATTERN.test(trimmed)) {
      setUrlError("That doesn't look like a GitHub PR URL — try https://github.com/owner/repo/pull/123")
      return
    }
    setUrlError(null)
    job.start('/api/generate/pr', { prUrl: trimmed })
  }

  const handleClear = () => {
    setPrUrl('')
    setUrlError(null)
    job.reset()
    showSuccessToast('Cleared successfully')
  }

  const handleShare = async () => {
    if (!job.result?.id) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/app/docs/${job.result.id}`)
      showSuccessToast('Share link copied to clipboard!')
    } catch (err) {
      showErrorToast(err)
    }
  }

  return (
    <div
      ref={scopeRef}
      className="pr-page mx-auto flex w-full max-w-[1400px] flex-1 min-h-0 flex-col gap-5 p-6"
    >
      {/* header */}
      <header data-boot style={{ opacity: 0 }}>
        <h1 className="font-display text-3xl text-ink-100">PR Documentation</h1>
        <p className="mt-1 font-sans text-sm text-ink-400">
          Document a pull request's changes straight from its GitHub URL
        </p>
      </header>

      {job.error && (
        <div className="flex flex-wrap items-center justify-between gap-3 border border-red/25 bg-red/10 px-4 py-3 font-mono text-[13px] text-red">
          <span>{job.error.message}</span>
          {job.error.retryable !== false && (
            <Button size="sm" variant="ghost" onClick={job.retry}>
              retry
            </Button>
          )}
        </div>
      )}

      {/* input */}
      <div data-boot style={{ opacity: 0 }}>
        <Panel title="INPUT">
          <div className="flex flex-col gap-5 p-5">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="prUrl"
                className="font-mono text-[11px] tracking-[0.14em] text-ink-400 uppercase"
              >
                github pull request url
              </label>
              <div className="flex items-center gap-2.5 rounded-[2px] border border-ink-700 bg-ink-950/60 px-3.5 transition-colors focus-within:border-phosphor-500">
                <span aria-hidden className="font-mono text-[13.5px] text-phosphor-400 select-none">
                  $
                </span>
                <input
                  id="prUrl"
                  type="text"
                  value={prUrl}
                  onChange={(e) => {
                    setPrUrl(e.target.value)
                    if (urlError) setUrlError(null)
                  }}
                  placeholder="https://github.com/owner/repo/pull/123"
                  disabled={isLoading}
                  spellCheck={false}
                  className="w-full flex-1 bg-transparent py-2.5 font-mono text-[13.5px] max-md:text-[16px] text-ink-100 placeholder:text-ink-400 focus:outline-none disabled:opacity-40"
                />
              </div>
              {urlError && <p className="font-mono text-[12px] text-red">{urlError}</p>}
            </div>

            {/* controls */}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={handleGenerate}
                disabled={isLoading || !prUrl.trim()}
                loading={isLoading}
              >
                {isLoading ? currentStatus || 'generating…' : 'generate documentation'}
              </Button>
              <Button variant="ghost" onClick={handleClear} disabled={!prUrl && !job.result}>
                clear
              </Button>
              {isLoading && job.progress > 0 && (
                <ProgressBar value={job.progress} className="min-w-40 flex-1" />
              )}
            </div>
          </div>
        </Panel>
      </div>

      {/* output */}
      <div data-boot className="min-h-0 flex-1" style={{ opacity: 0 }}>
        <Panel
          title="OUTPUT"
          active={isLoading || !!job.result}
          className="min-h-0 min-w-0"
          actions={
            job.result ? (
              <span className="flex items-center gap-1.5">
                <ExportMenu
                  documentation={job.result.documentation}
                  metadata={{
                    language: 'pr',
                    generatedAt: new Date(),
                    qualityScore: job.result.qualityScore?.score,
                    prInfo: job.result.prInfo,
                  }}
                />
                <Button size="sm" variant="ghost" onClick={handleShare}>
                  share
                </Button>
              </span>
            ) : undefined
          }
        >
          <div className="min-h-0 flex-1 overflow-y-auto">
            {job.result ? (
              <div className="flex min-h-full min-w-0 flex-col gap-4 p-4">
                {job.result.prInfo && (
                  <div className="flex flex-col gap-2">
                    <h2 className="font-display text-base text-ink-100">
                      {docTitle({ language: 'pr', prInfo: job.result.prInfo })}
                    </h2>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Badge tone="phosphor">pr #{job.result.prInfo.prNumber}</Badge>
                      <span className="font-mono text-[12px] text-ink-400">
                        {job.result.prInfo.repository}
                      </span>
                      <span className="font-mono text-[12px] text-ink-400">
                        · {job.result.prInfo.branch}
                      </span>
                      <span className="font-mono text-[12px] text-ink-400">
                        · {job.result.prInfo.author}
                      </span>
                    </div>
                  </div>
                )}
                <DocumentSheet
                  documentation={job.result.documentation}
                  diagram={job.result.diagram}
                  qualityScore={job.result.qualityScore}
                  diagramCollapsed={isDiagramCollapsed}
                  onDiagramToggle={() => setIsDiagramCollapsed(!isDiagramCollapsed)}
                />
              </div>
            ) : isLoading ? (
              <div className="p-5 font-mono text-[13px] leading-loose">
                {job.statusLog.map((line, i) => (
                  <div key={i} className="text-ink-300">
                    <span className="text-phosphor-400">&gt;</span> {line}
                  </div>
                ))}
                <span aria-hidden className="animate-caret-blink text-phosphor-400">
                  ▮
                </span>
              </div>
            ) : (
              <EmptyState
                glyph="⑂"
                title="output feeds here"
                hint={
                  <>
                    Paste a GitHub PR URL above and run{' '}
                    <span className="font-mono text-ink-300">generate</span> — the change prints as
                    a typeset page.
                  </>
                }
              />
            )}
          </div>
        </Panel>
      </div>
    </div>
  )
}

export default PullRequest
