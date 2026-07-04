import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { paperTheme } from '../lib/syntaxTheme'
import { renderMermaid } from '../lib/mermaid'
import { gsap, useGSAP, bootSequence, prefersReducedMotion } from '../lib/motion'
import QualityScore from '../components/QualityScore'
import Panel from '../components/ui/Panel'
import Button from '../components/ui/Button'
import Menu, { MenuItem } from '../components/ui/Menu'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import ProgressBar from '../components/ui/ProgressBar'
import { demoSamples } from '../data/demoSamples'
import { downloadAsMarkdown, downloadAsHTML, copyAsMarkdown, copyAsHTML } from '../utils/exportUtils'
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

const LANGUAGES = ['javascript', 'typescript', 'python', 'java', 'graphql'] as const

function Home() {
  const [code, setCode] = useState<string>('')
  const [language, setLanguage] = useState<string>('javascript')
  const [documentation, setDocumentation] = useState<string>('')
  const [diagram, setDiagram] = useState<string>('')
  const [qualityScore, setQualityScore] = useState<QualityScoreData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [isDiagramCollapsed, setIsDiagramCollapsed] = useState<boolean>(false)
  const [showDemoMenu, setShowDemoMenu] = useState<boolean>(false)
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false)
  const [progress, setProgress] = useState<number>(0)
  const [progressStatus, setProgressStatus] = useState<string>('')
  const [bootLog, setBootLog] = useState<string[]>([])
  const [pendingDemo, setPendingDemo] = useState<typeof demoSamples[0] | null>(null)
  const diagramRef = useRef<HTMLDivElement>(null)
  const progressIntervalRef = useRef<number | null>(null)
  const scopeRef = useRef<HTMLDivElement>(null)

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
      if (!documentation || !scopeRef.current) return
      const sheet = scopeRef.current.querySelector('[data-sheet]')
      if (!sheet || prefersReducedMotion()) return
      gsap.fromTo(
        sheet,
        { clipPath: 'inset(0 0 100% 0)', y: -12 },
        { clipPath: 'inset(0 0 0% 0)', y: 0, duration: 0.8, ease: 'power2.inOut' }
      )
    },
    { dependencies: [documentation], scope: scopeRef }
  )

  // Render diagram when it changes
  useEffect(() => {
    if (diagram && diagramRef.current) {
      renderMermaid(diagramRef.current, diagram)
    }
  }, [diagram])

  // accumulate the generation status feed into the boot log
  useEffect(() => {
    if (!isLoading || !progressStatus) return
    setBootLog((log) =>
      log[log.length - 1] === progressStatus ? log : [...log, progressStatus]
    )
  }, [progressStatus, isLoading])

  const startProgressPolling = (jobId: string) => {
    progressIntervalRef.current = window.setInterval(async () => {
      try {
        const progressResponse = await axios.get(`/api/generate/progress/${jobId}`, {
          withCredentials: true
        })

        setProgress(progressResponse.data.progress.percentage)
        setProgressStatus(progressResponse.data.progress.status)

        // Check if completed
        if (progressResponse.data.completed || progressResponse.data.error) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current)
            progressIntervalRef.current = null
          }

          if (progressResponse.data.error) {
            setError(progressResponse.data.error)
            showErrorToast({ response: { data: { error: progressResponse.data.error } } })
            setIsLoading(false)
            setProgress(0)
            setProgressStatus('')
            return
          }

          // Fetch the result
          const resultResponse = await axios.get(`/api/generate/result/${jobId}`, {
            withCredentials: true
          })
          setDocumentation(resultResponse.data.documentation)
          if (resultResponse.data.diagram) {
            setDiagram(resultResponse.data.diagram)
          }
          if (resultResponse.data.qualityScore) {
            setQualityScore(resultResponse.data.qualityScore)
          }
          showSuccessToast('Documentation generated successfully!')
          setIsLoading(false)
          setProgress(0)
          setProgressStatus('')
        }
      } catch (err: any) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
          progressIntervalRef.current = null
        }
        const errorMessage = err.response?.data?.error || 'Failed to generate documentation'
        setError(errorMessage)
        showErrorToast(err)
        setIsLoading(false)
        setProgress(0)
        setProgressStatus('')
      }
    }, 500) // Poll every 500ms
  }

  const handleGenerateDocumentation = async () => {
    if (!code.trim()) {
      showErrorToast({
        response: {
          data: { error: 'Code is required' }
        }
      })
      return
    }

    setIsLoading(true)
    setError('')
    setDocumentation('')
    setDiagram('')
    setQualityScore(null)
    setProgress(0)
    setProgressStatus('')
    setBootLog(['job accepted'])

    try {
      // Start the job
      const response = await axios.post('/api/generate', {
        code,
        language
      }, {
        withCredentials: true
      })

      const jobId = response.data.jobId

      // Start polling for progress
      startProgressPolling(jobId)
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to generate documentation'
      setError(errorMessage)
      showErrorToast(err)
      setIsLoading(false)
      setProgress(0)
      setProgressStatus('')
    }
  }

  // Auto-generate when demo code is loaded into state
  useEffect(() => {
    if (pendingDemo && code === pendingDemo.code) {
      setPendingDemo(null)
      handleGenerateDocumentation()
    }
  }, [code, pendingDemo])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [])

  const handleClear = () => {
    setCode('')
    setDocumentation('')
    setDiagram('')
    setQualityScore(null)
    setError('')
    setBootLog([])
    showSuccessToast('Cleared successfully')
  }

  const handleCopyDocumentation = async () => {
    try {
      await navigator.clipboard.writeText(documentation)
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

  const handleExport = async (format: 'markdown' | 'html', action: 'download' | 'copy') => {
    if (!documentation) return

    const metadata = {
      language,
      generatedAt: new Date(),
      qualityScore: qualityScore?.score,
    }

    try {
      if (action === 'download') {
        if (format === 'markdown') {
          downloadAsMarkdown(documentation, metadata)
          showSuccessToast('Downloaded as Markdown')
        } else {
          await downloadAsHTML(documentation, metadata)
          showSuccessToast('Downloaded as HTML')
        }
      } else {
        if (format === 'markdown') {
          await copyAsMarkdown(documentation, metadata)
          showSuccessToast('Copied as Markdown')
        } else {
          await copyAsHTML(documentation, metadata)
          showSuccessToast('Copied as HTML')
        }
      }
      setShowExportMenu(false)
    } catch (err) {
      showErrorToast(err)
    }
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
          disabled={isLoading || !code.trim()}
          loading={isLoading}
        >
          {isLoading ? progressStatus || 'generating…' : 'generate documentation'}
        </Button>

        <Button variant="ghost" onClick={handleClear} disabled={!code && !documentation}>
          clear
        </Button>

        {isLoading && progress > 0 && (
          <ProgressBar value={progress} className="min-w-40 flex-1" />
        )}
      </div>

      {error && (
        <div className="border border-red/25 bg-red/10 px-4 py-3 font-mono text-[13px] text-red">
          {error}
        </div>
      )}

      {/* split view */}
      <div data-boot className="grid min-h-0 flex-1 gap-5 lg:grid-cols-2" style={{ opacity: 0 }}>
        <Panel
          title="CODE INPUT"
          actions={
            <span className="font-mono text-[11px] text-ink-400">{code.length} chars</span>
          }
        >
          <textarea
            className="min-h-[420px] w-full flex-1 resize-none bg-ink-950/60 p-5 font-mono text-[13.5px] leading-relaxed text-ink-100 placeholder:text-ink-400 focus:outline-none"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={`Paste your ${language} code here…`}
            spellCheck={false}
          />
        </Panel>

        <Panel
          title="OUTPUT"
          active={isLoading || !!documentation}
          actions={
            documentation ? (
              <span className="flex items-center gap-1.5">
                <Button size="sm" variant="ghost" onClick={handleCopyDocumentation}>
                  copy
                </Button>
                <span className="relative">
                  <Button size="sm" variant="ghost" onClick={() => setShowExportMenu(!showExportMenu)}>
                    export ▾
                  </Button>
                  <Menu open={showExportMenu} onClose={() => setShowExportMenu(false)} align="right">
                    <MenuItem onSelect={() => handleExport('markdown', 'download')}>
                      ↓ download .md
                    </MenuItem>
                    <MenuItem onSelect={() => handleExport('html', 'download')}>
                      ↓ download .html
                    </MenuItem>
                    <div className="my-1 h-px bg-ink-700" />
                    <MenuItem onSelect={() => handleExport('markdown', 'copy')}>
                      ⧉ copy as markdown
                    </MenuItem>
                    <MenuItem onSelect={() => handleExport('html', 'copy')}>
                      ⧉ copy as html
                    </MenuItem>
                  </Menu>
                </span>
              </span>
            ) : undefined
          }
        >
          <div className="min-h-0 flex-1 overflow-y-auto">
            {documentation ? (
              <div className="flex min-h-full flex-col gap-4 p-4">
                {/* the printout */}
                <div
                  data-sheet
                  className="border border-paper-300 shadow-[0_14px_40px_rgba(0,0,0,0.5)]"
                >
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
                      {documentation}
                    </ReactMarkdown>

                    {diagram && (
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

                {qualityScore && <QualityScore qualityScore={qualityScore} />}
              </div>
            ) : isLoading ? (
              <div className="p-5 font-mono text-[13px] leading-loose">
                {bootLog.map((line, i) => (
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
