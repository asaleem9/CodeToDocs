import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap, useGSAP, bootSequence, prefersReducedMotion } from '../lib/motion'
import DocumentSheet from '../components/DocumentSheet'
import ExportMenu from '../components/ExportMenu'
import { useGenerationJob } from '../hooks/useGenerationJob'
import Panel from '../components/ui/Panel'
import Button from '../components/ui/Button'
import Menu, { MenuItem } from '../components/ui/Menu'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import ProgressBar from '../components/ui/ProgressBar'
import { demoSamples } from '../data/demoSamples'
import { showErrorToast, showSuccessToast } from '../utils/errorHandler'

const LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'go',
  'rust',
  'c++',
  'c',
  'c#',
  'ruby',
  'php',
  'swift',
  'kotlin',
  'graphql',
] as const

// Matches the backend's `code.length > 100_000` guard in routes/documentation.ts
const CODE_LIMIT = 100_000

function formatCodeSize(chars: number): string {
  return `${(chars / 1000).toFixed(1)} KB`
}

function Home() {
  const [code, setCode] = useState<string>('')
  const [language, setLanguage] = useState<string>('javascript')
  const [showDemoMenu, setShowDemoMenu] = useState<boolean>(false)
  const [pendingDemo, setPendingDemo] = useState<typeof demoSamples[0] | null>(null)
  const [isDiagramCollapsed, setIsDiagramCollapsed] = useState<boolean>(false)
  const scopeRef = useRef<HTMLDivElement>(null)

  const job = useGenerationJob()
  const isLoading = job.phase === 'submitting' || job.phase === 'running'
  const currentStatus = job.statusLog[job.statusLog.length - 1] || ''

  const codeSize = code.length
  const isOverLimit = codeSize > CODE_LIMIT
  const sizeColorClass = isOverLimit
    ? 'text-red'
    : codeSize / CODE_LIMIT >= 0.8
      ? 'text-amber'
      : 'text-ink-400'

  // page boot-in
  useGSAP(
    () => {
      if (scopeRef.current) bootSequence(scopeRef.current)
    },
    { scope: scopeRef }
  )

  // the printout: docs slide out of the machine when they land
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

  const handleGenerateDocumentation = async () => {
    if (!code.trim()) {
      showErrorToast({
        response: {
          data: { error: 'Code is required' }
        }
      })
      return
    }

    job.start('/api/generate', { code, language })
  }

  // Auto-generate when demo code is loaded into state
  useEffect(() => {
    if (pendingDemo && code === pendingDemo.code) {
      setPendingDemo(null)
      handleGenerateDocumentation()
    }
  }, [code, pendingDemo])

  const handleClear = () => {
    setCode('')
    job.reset()
    showSuccessToast('Cleared successfully')
  }

  const handleCopyDocumentation = async () => {
    if (!job.result) return
    try {
      await navigator.clipboard.writeText(job.result.documentation)
      showSuccessToast('Documentation copied to clipboard!')
    } catch (err) {
      showErrorToast(err)
    }
  }

  const handleLoadDemo = async (index: number) => {
    const sample = demoSamples[index]
    setCode(sample.code)
    setLanguage(sample.language)
    setShowDemoMenu(false)
    showSuccessToast(`Loaded demo: ${sample.name}`)
    setPendingDemo(sample)
  }

  return (
    <div
      ref={scopeRef}
      className="home-page mx-auto flex w-full max-w-[1600px] flex-1 min-h-0 flex-col gap-5 p-6"
    >
      {/* command bar */}
      <div data-boot className="relative z-30 flex flex-wrap items-center gap-3" style={{ opacity: 0 }}>
        <div className="relative">
          <Button variant="ghost" onClick={() => setShowDemoMenu(!showDemoMenu)}>
            <span className="text-phosphor-400">$</span> try demo
          </Button>
          <Menu open={showDemoMenu} onClose={() => setShowDemoMenu(false)} className="min-w-80">
            {demoSamples.map((sample, index) => (
              <MenuItem key={index} onSelect={() => handleLoadDemo(index)}>
                <span className="flex items-center justify-between gap-3">
                  <span className="font-medium text-ink-100">{sample.name}</span>
                  <Badge tone="phosphor">{sample.language}</Badge>
                </span>
                <span className="mt-1 block font-sans text-[12px] text-ink-400">
                  {sample.description}
                </span>
              </MenuItem>
            ))}
          </Menu>
        </div>

        <div className="relative">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="cursor-pointer appearance-none rounded-[2px] border border-ink-700 bg-ink-850 py-2 pr-9 pl-4 font-mono text-[13.5px] text-ink-100 transition-colors hover:border-ink-600 focus:border-phosphor-500 focus:outline-none"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-[10px] text-ink-400"
          >
            ▾
          </span>
        </div>

        <Button
          onClick={handleGenerateDocumentation}
          disabled={isLoading || !code.trim() || isOverLimit}
          loading={isLoading}
        >
          {isLoading ? currentStatus || 'generating…' : 'generate documentation'}
        </Button>

        <Button variant="ghost" onClick={handleClear} disabled={!code && !job.result}>
          clear
        </Button>

        {isLoading && job.progress > 0 && (
          <ProgressBar value={job.progress} className="min-w-40 flex-1" />
        )}
      </div>

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

      {/* split view */}
      <div data-boot className="grid min-h-0 flex-1 gap-5 lg:grid-cols-2" style={{ opacity: 0 }}>
        <Panel
          title="CODE INPUT"
          actions={
            <span className={`font-mono text-[11px] ${sizeColorClass}`}>
              {formatCodeSize(codeSize)} / {CODE_LIMIT / 1000} KB
            </span>
          }
        >
          <textarea
            className="min-h-[420px] w-full flex-1 resize-none bg-ink-950/60 p-5 font-mono text-[13.5px] leading-relaxed text-ink-100 placeholder:text-ink-400 focus:outline-none"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={`Paste your ${language} code here…`}
            spellCheck={false}
          />
          {isOverLimit && (
            <p className="border-t border-red/25 bg-red/10 px-5 py-2.5 font-mono text-[12px] leading-relaxed text-red">
              This file is ~{formatCodeSize(codeSize)} — the generator tops out at{' '}
              {CODE_LIMIT / 1000} KB. Trim it down, or use{' '}
              <Link
                to="/app/batch"
                className="underline decoration-red/40 underline-offset-2 hover:text-ink-100"
              >
                /batch
              </Link>{' '}
              for whole repositories.
            </p>
          )}
        </Panel>

        <Panel
          title="OUTPUT"
          active={isLoading || !!job.result}
          actions={
            job.result ? (
              <span className="flex items-center gap-1.5">
                <Button size="sm" variant="ghost" onClick={handleCopyDocumentation}>
                  copy
                </Button>
                <ExportMenu
                  documentation={job.result.documentation}
                  metadata={{
                    language,
                    generatedAt: new Date(),
                    qualityScore: job.result.qualityScore?.score,
                  }}
                />
              </span>
            ) : undefined
          }
        >
          <div className="min-h-0 flex-1 overflow-y-auto">
            {job.result ? (
              <div className="flex min-h-full flex-col gap-4 p-4">
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
                glyph="¶"
                title="output feeds here"
                hint={
                  <>
                    Paste code on the left and run{' '}
                    <span className="font-mono text-ink-300">generate</span> — the documentation
                    prints as a typeset page.
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

export default Home
