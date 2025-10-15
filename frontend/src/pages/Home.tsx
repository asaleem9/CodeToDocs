import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import mermaid from 'mermaid'
import QualityScore from '../components/QualityScore'
import { demoSamples } from '../data/demoSamples'
import { downloadAsMarkdown, downloadAsHTML, copyAsMarkdown, copyAsHTML } from '../utils/exportUtils'
import { showErrorToast, showSuccessToast, showLoadingToast, dismissToast } from '../utils/errorHandler'

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

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    darkMode: true,
    background: '#1e293b',
    primaryColor: '#818cf8',
    primaryTextColor: '#e2e8f0',
    primaryBorderColor: '#475569',
    lineColor: '#94a3b8',
    secondaryColor: '#c084fc',
    tertiaryColor: '#0f172a',
  },
})

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
  const diagramRef = useRef<HTMLDivElement>(null)
  const progressIntervalRef = useRef<number | null>(null)

  // Render diagram when it changes
  useEffect(() => {
    if (diagram && diagramRef.current) {
      const renderDiagram = async () => {
        try {
          diagramRef.current!.innerHTML = ''

          // Clean up the diagram string (remove any markdown code fences)
          let cleanDiagram = diagram.trim()
          if (cleanDiagram.startsWith('```mermaid')) {
            cleanDiagram = cleanDiagram.replace(/^```mermaid\n/, '').replace(/\n```$/, '')
          } else if (cleanDiagram.startsWith('```')) {
            cleanDiagram = cleanDiagram.replace(/^```\n/, '').replace(/\n```$/, '')
          }

          // Generate unique ID for each render
          const diagramId = `mermaid-diagram-${Date.now()}`
          const { svg } = await mermaid.render(diagramId, cleanDiagram)
          diagramRef.current!.innerHTML = svg
        } catch (error: any) {
          console.error('Error rendering diagram:', error)
          console.error('Diagram content:', diagram)
          diagramRef.current!.innerHTML = `
            <div style="color: #fca5a5; padding: 1rem;">
              <p style="font-weight: 600;">Error rendering diagram</p>
              <p style="font-size: 0.875rem; margin-top: 0.5rem;">
                ${error.message || 'Invalid diagram syntax'}
              </p>
            </div>
          `
        }
      }
      renderDiagram()
    }
  }, [diagram])

  const startProgressPolling = (jobId: string) => {
    progressIntervalRef.current = window.setInterval(async () => {
      try {
        const progressResponse = await axios.get(`/api/generate/progress/${jobId}`)

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
          const resultResponse = await axios.get(`/api/generate/result/${jobId}`)
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
    setProgressStatus('Starting...')

    try {
      // Start the job
      const response = await axios.post('/api/generate', {
        code,
        language
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

    // Auto-generate documentation for the demo
    setTimeout(() => {
      handleGenerateDocumentation()
    }, 500)
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
    <>
      <div className="controls">
        <div className="demo-button-wrapper">
          <button
            className="demo-btn"
            onClick={() => setShowDemoMenu(!showDemoMenu)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
            Try Demo
          </button>
          {showDemoMenu && (
            <div className="demo-menu">
              {demoSamples.map((sample, index) => (
                <button
                  key={index}
                  className="demo-menu-item"
                  onClick={() => handleLoadDemo(index)}
                >
                  <div className="demo-item-header">
                    <span className="demo-item-name">{sample.name}</span>
                    <span className="demo-item-lang">{sample.language}</span>
                  </div>
                  <div className="demo-item-desc">{sample.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="language-select"
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="typescript">TypeScript</option>
          <option value="graphql">GraphQL</option>
        </select>

        <button
          className="generate-btn"
          onClick={handleGenerateDocumentation}
          disabled={isLoading || !code.trim()}
        >
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                <span className="spinner"></span>
                <span>{progressStatus || 'Generating...'}</span>
              </div>
              {progress > 0 && (
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${progress}%` }}
                  >
                    <span className="progress-percentage">{progress}%</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            'Generate Documentation'
          )}
        </button>

        <button
          className="clear-btn"
          onClick={handleClear}
          disabled={!code && !documentation}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
          Clear
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="split-view">
        <div className="panel code-panel">
          <div className="panel-header">
            <h3>Code Input</h3>
            <span className="char-count">{code.length} characters</span>
          </div>
          <div className="panel-content">
            <textarea
              className="code-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={`Paste your ${language} code here...`}
              spellCheck={false}
            />
          </div>
        </div>

        <div className="panel docs-panel">
          <div className="panel-header">
            <h3>Generated Documentation</h3>
            {documentation && (
              <div className="panel-header-actions">
                <button className="copy-btn" onClick={handleCopyDocumentation}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  Copy
                </button>

                <div className="export-button-wrapper">
                  <button className="export-btn" onClick={() => setShowExportMenu(!showExportMenu)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Export
                  </button>
                  {showExportMenu && (
                    <div className="export-menu">
                      <button
                        className="export-menu-item"
                        onClick={() => handleExport('markdown', 'download')}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Download as Markdown
                      </button>
                      <button
                        className="export-menu-item"
                        onClick={() => handleExport('html', 'download')}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Download as HTML
                      </button>
                      <div className="export-menu-divider"></div>
                      <button
                        className="export-menu-item"
                        onClick={() => handleExport('markdown', 'copy')}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                        Copy as Markdown
                      </button>
                      <button
                        className="export-menu-item"
                        onClick={() => handleExport('html', 'copy')}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                        Copy as HTML
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="panel-content">
            {documentation ? (
              <div className="markdown-content slide-in-right">
                <ReactMarkdown
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '')
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={vscDarkPlus}
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

                {qualityScore && <QualityScore qualityScore={qualityScore} />}

                {diagram && (
                  <div className="diagram-section fade-in-up">
                    <div className="diagram-header" onClick={() => setIsDiagramCollapsed(!isDiagramCollapsed)}>
                      <h3>Visual Diagram</h3>
                      <button className="collapse-btn">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          style={{ transform: isDiagramCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    </div>
                    {!isDiagramCollapsed && (
                      <div className="diagram-container" ref={diagramRef}></div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>Documentation will appear here</p>
                <span>Enter your code and click "Generate Documentation"</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default Home
