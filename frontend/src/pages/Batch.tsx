import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import axios from 'axios'
import { useGSAP, bootSequence } from '../lib/motion'
import { useBatch } from '../contexts/BatchContext'
import DocumentSheet from '../components/DocumentSheet'
import Panel from '../components/ui/Panel'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import ProgressBar from '../components/ui/ProgressBar'
import SectionHeader from '../components/ui/SectionHeader'
import { showErrorToast, showSuccessToast, showLoadingToast, dismissToast } from '../utils/errorHandler'
import { downloadAsHTML, downloadAsPDF } from '../utils/exportUtils'
import type { QualityScoreData } from '../types'

interface BatchProgress {
  total: number
  completed: number
  current: string
  percentage: number
  failed: number
}

interface DocumentedFile {
  filePath: string
  language: string
  documentation: string
  diagram?: string
  qualityScore?: QualityScoreData
  success: boolean
  error?: string
}

interface BatchResult {
  repoUrl: string
  totalFiles: number
  successCount: number
  failedCount: number
  documents: DocumentedFile[]
  tableOfContents: string
  summary: string
  fullRepoDocumentation?: string
}

const MODES = [
  { id: 'url', label: 'GITHUB URL' },
  { id: 'zip', label: 'UPLOAD ZIP' },
] as const

const HOW_IT_WORKS = [
  'Choose input method: GitHub URL or Upload ZIP file',
  'Set the maximum number of files to process',
  'Click "Start Batch Processing"',
  'Watch the progress as files are documented',
  'Review all documentation and download',
]

const FEATURES = [
  { title: 'ZIP UPLOAD', body: 'Upload a zipped repository directly for processing' },
  { title: 'AUTO-DETECTION', body: 'Automatically detects code files in supported languages' },
  { title: 'PROGRESS TRACKING', body: 'Real-time progress updates and file-by-file status' },
  { title: 'TABLE OF CONTENTS', body: 'Organized documentation with navigation' },
  { title: 'DOWNLOAD ALL', body: 'Export complete documentation as Markdown' },
]

function Batch() {
  const location = useLocation()
  const batchContext = useBatch()
  const [repoUrl, setRepoUrl] = useState<string>('')
  const [result, setResult] = useState<BatchResult | null>(null)
  const [selectedDoc, setSelectedDoc] = useState<DocumentedFile | null>(null)
  const [maxFiles, setMaxFiles] = useState<number>(50)
  const [uploadMode, setUploadMode] = useState<'url' | 'zip'>('url')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [localProgress, setLocalProgress] = useState<BatchProgress | null>(null)
  const [localBatchId, setLocalBatchId] = useState<string>('')
  const [localIsProcessing, setLocalIsProcessing] = useState<boolean>(false)
  const [incrementalDocs, setIncrementalDocs] = useState<DocumentedFile[]>([])
  const [isDiagramCollapsed, setIsDiagramCollapsed] = useState<boolean>(false)
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const docsFetchedRef = useRef<number>(0)
  const logRef = useRef<HTMLDivElement>(null)
  const scopeRef = useRef<HTMLDivElement>(null)

  // page boot-in
  useGSAP(
    () => {
      if (scopeRef.current) bootSequence(scopeRef.current)
    },
    { scope: scopeRef }
  )

  // Use batch context for URL mode, local state for zip mode
  const isProcessing = uploadMode === 'zip' ? localIsProcessing : batchContext.isProcessing
  const batchId = uploadMode === 'zip' ? localBatchId : batchContext.batchId
  const progress = uploadMode === 'zip' ? localProgress : batchContext.progress

  const startProgressPolling = (id: string) => {
    // Clear any existing interval
    if (progressInterval.current) {
      clearInterval(progressInterval.current)
    }
    docsFetchedRef.current = 0

    progressInterval.current = setInterval(async () => {
      try {
        const progressRes = await axios.get(`/api/batch/progress/${id}`, {
          params: { since: docsFetchedRef.current }
        })

        // Update progress in local state
        if (progressRes.data.progress) {
          setLocalProgress(progressRes.data.progress)
        }

        // Collect incremental documents as they complete
        if (progressRes.data.completedDocuments?.length > 0) {
          setIncrementalDocs(prev => [...prev, ...progressRes.data.completedDocuments])
          docsFetchedRef.current = progressRes.data.totalCompleted
        }

        if (progressRes.data.completed) {
          // Fetch final result
          const resultRes = await axios.get(`/api/batch/result/${id}`)
          setResult(resultRes.data)
          setIncrementalDocs([])
          setLocalIsProcessing(false)

          // Automatically select full repo documentation if available
          if (resultRes.data.fullRepoDocumentation) {
            setSelectedDoc(null) // null means show full repo doc
          }

          if (progressInterval.current) {
            clearInterval(progressInterval.current)
          }

          showSuccessToast(`Batch processing complete! ${resultRes.data.successCount}/${resultRes.data.totalFiles} files documented`)
        }

        if (progressRes.data.error) {
          setLocalIsProcessing(false)
          setIncrementalDocs([])
          if (progressInterval.current) {
            clearInterval(progressInterval.current)
          }
          showErrorToast({ response: { data: { error: progressRes.data.error } } })
        }
      } catch (err) {
        console.error('Error polling progress:', err)
      }
    }, 1000)
  }

  // Check for pre-filled repo URL from navigation state
  useEffect(() => {
    if (location.state && location.state.repoUrl) {
      setRepoUrl(location.state.repoUrl)
    }
  }, [location.state])

  // Start polling if there's an active batch when component mounts or batchId changes
  useEffect(() => {
    if (batchId && isProcessing && !progressInterval.current) {
      startProgressPolling(batchId)
    } else if (batchId && !isProcessing && !result) {
      // Batch completed but we don't have the result, fetch it
      const fetchResult = async () => {
        try {
          const resultRes = await axios.get(`/api/batch/result/${batchId}`)
          setResult(resultRes.data)
          if (resultRes.data.fullRepoDocumentation) {
            setSelectedDoc(null)
          }
        } catch (err) {
          console.error('Error fetching batch result:', err)
        }
      }
      fetchResult()
    }
  }, [batchId, isProcessing, result])

  // Keep the live file log pinned to the newest entry
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [incrementalDocs])

  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.zip')) {
        showErrorToast({
          response: {
            data: { error: 'Please select a ZIP file' }
          }
        })
        return
      }
      setSelectedFile(file)
    }
  }

  const handleStartBatch = async () => {
    if (uploadMode === 'url') {
      // Existing URL-based batch processing
      if (!repoUrl.trim()) {
        showErrorToast({
          response: {
            data: { error: 'Please enter a GitHub repository URL' }
          }
        })
        return
      }

      // Validate GitHub URL format
      const githubPattern = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/
      if (!githubPattern.test(repoUrl)) {
        showErrorToast({
          response: {
            data: { error: 'Invalid GitHub URL format. Example: https://github.com/user/repo' }
          }
        })
        return
      }

      const loadingToastId = showLoadingToast('Starting batch processing...')
      setResult(null)
      setSelectedDoc(null)
      setIncrementalDocs([])
      docsFetchedRef.current = 0

      try {
        await batchContext.startBatch(repoUrl, maxFiles)
        dismissToast(loadingToastId)
        showSuccessToast('Batch processing started! You can navigate away and track progress.')

        // Start polling for result
        startProgressPolling(batchContext.batchId)
      } catch (err: any) {
        dismissToast(loadingToastId)
        showErrorToast(err)
      }
    } else {
      // New ZIP file upload processing
      if (!selectedFile) {
        showErrorToast({
          response: {
            data: { error: 'Please select a ZIP file to upload' }
          }
        })
        return
      }

      const loadingToastId = showLoadingToast('Uploading and processing zip file...')
      setResult(null)
      setSelectedDoc(null)
      setIncrementalDocs([])
      docsFetchedRef.current = 0

      try {
        const formData = new FormData()
        formData.append('zipFile', selectedFile)
        formData.append('options', JSON.stringify({ maxFiles, maxFileSize: 100000 }))

        const response = await axios.post('/api/batch/upload-zip', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })

        const { batchId: newBatchId } = response.data

        // Update local state
        setLocalBatchId(newBatchId)
        setLocalIsProcessing(true)
        setLocalProgress(null)

        dismissToast(loadingToastId)
        showSuccessToast('Zip file uploaded! Processing started.')

        // Start polling for result
        startProgressPolling(newBatchId)
      } catch (err: any) {
        dismissToast(loadingToastId)
        showErrorToast(err)
      }
    }
  }

  const handleCancelBatch = async () => {
    try {
      await batchContext.cancelBatch()

      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }

      showSuccessToast('Batch processing canceled')
    } catch (err) {
      showErrorToast(err)
    }
  }


  const handleDownloadAll = () => {
    if (!result) return

    let fullDoc = result.summary + '\n\n'
    fullDoc += result.tableOfContents + '\n\n'
    fullDoc += '---\n\n'

    for (const doc of result.documents) {
      if (doc.success) {
        fullDoc += `# ${doc.filePath}\n\n`
        fullDoc += doc.documentation + '\n\n'
        fullDoc += '---\n\n'
      }
    }

    const blob = new Blob([fullDoc], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `batch-documentation-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)

    showSuccessToast('Documentation downloaded')
  }

  const handleDownloadFullRepo = () => {
    if (!result || !result.fullRepoDocumentation) return

    const blob = new Blob([result.fullRepoDocumentation], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `full-repo-documentation-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)

    showSuccessToast('Full repository documentation downloaded')
  }

  const handleDownloadHTML = async () => {
    if (!result || !result.fullRepoDocumentation) return

    const loadingToastId = showLoadingToast('Generating HTML...')

    try {
      const repoName = result.repoUrl.split('/').pop() || 'repository'
      await downloadAsHTML(
        result.fullRepoDocumentation,
        {
          language: 'Repository',
          generatedAt: new Date(),
        },
        `${repoName}-documentation-${Date.now()}.html`
      )
      dismissToast(loadingToastId)
      showSuccessToast('HTML documentation downloaded')
    } catch (err) {
      dismissToast(loadingToastId)
      showErrorToast(err)
    }
  }

  const handleDownloadPDF = async () => {
    if (!result || !result.fullRepoDocumentation) return

    const loadingToastId = showLoadingToast('Generating PDF... This may take a moment.')

    try {
      const repoName = result.repoUrl.split('/').pop() || 'repository'
      await downloadAsPDF(
        result.fullRepoDocumentation,
        {
          language: 'Repository',
          generatedAt: new Date(),
        },
        `${repoName}-documentation-${Date.now()}.pdf`
      )
      dismissToast(loadingToastId)
      showSuccessToast('PDF documentation downloaded')
    } catch (err) {
      dismissToast(loadingToastId)
      showErrorToast(err)
    }
  }

  return (
    <div
      ref={scopeRef}
      className="batch-page mx-auto flex w-full max-w-[1400px] flex-1 min-h-0 flex-col gap-5 p-6"
    >
      {/* header */}
      <header data-boot style={{ opacity: 0 }}>
        <h1 className="font-display text-3xl text-ink-100">Batch Documentation</h1>
        <p className="mt-1 font-sans text-sm text-ink-400">
          Document entire repositories automatically
        </p>
      </header>

      {/* input */}
      <div data-boot style={{ opacity: 0 }}>
        <Panel title="INPUT">
          <div className="flex flex-col gap-5 p-5">
            {/* mode bracket tabs */}
            <div className="flex gap-2 border-b border-ink-700">
              {MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setUploadMode(mode.id)}
                  disabled={isProcessing}
                  className={`-mb-px cursor-pointer border-b-2 px-3 py-2 font-display text-[12px] tracking-[0.12em] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    uploadMode === mode.id
                      ? 'border-phosphor-400 text-phosphor-300'
                      : 'border-transparent text-ink-400 hover:text-ink-300'
                  }`}
                >
                  [ {mode.label} ]
                </button>
              ))}
            </div>

            {uploadMode === 'url' ? (
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="repoUrl"
                  className="font-mono text-[11px] tracking-[0.14em] text-ink-400 uppercase"
                >
                  github repository url
                </label>
                <div className="flex items-center gap-2.5 rounded-[2px] border border-ink-700 bg-ink-950/60 px-3.5 transition-colors focus-within:border-phosphor-500">
                  <span aria-hidden className="font-mono text-[13.5px] text-phosphor-400 select-none">
                    $
                  </span>
                  <input
                    id="repoUrl"
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/username/repository"
                    disabled={isProcessing}
                    spellCheck={false}
                    className="w-full flex-1 bg-transparent py-2.5 font-mono text-[13.5px] text-ink-100 placeholder:text-ink-400 focus:outline-none disabled:opacity-40"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="zipFile"
                  className="font-mono text-[11px] tracking-[0.14em] text-ink-400 uppercase"
                >
                  upload zipped repository
                </label>
                <input
                  ref={fileInputRef}
                  id="zipFile"
                  type="file"
                  accept=".zip"
                  onChange={handleFileSelect}
                  disabled={isProcessing}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-3 border border-dashed border-ink-600 bg-ink-950/40 px-6 py-8 text-center transition-colors hover:border-phosphor-500">
                  <Button
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                  >
                    {selectedFile ? '+ change file' : 'select zip file'}
                  </Button>
                  {selectedFile ? (
                    <p className="font-mono text-[12.5px] text-ink-300">
                      {selectedFile.name}{' '}
                      <span className="text-ink-400">
                        ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </p>
                  ) : (
                    <p className="font-sans text-[13px] text-ink-400">
                      Select a zipped GitHub repository to process
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label
                htmlFor="maxFiles"
                className="font-mono text-[11px] tracking-[0.14em] text-ink-400 uppercase"
              >
                maximum files
              </label>
              <input
                id="maxFiles"
                type="number"
                value={maxFiles}
                onChange={(e) => setMaxFiles(parseInt(e.target.value) || 50)}
                min="1"
                max="100"
                disabled={isProcessing}
                className="w-24 rounded-[2px] border border-ink-700 bg-ink-950/60 px-3 py-2 font-mono text-[13.5px] text-ink-100 transition-colors focus:border-phosphor-500 focus:outline-none disabled:opacity-40"
              />
              <span className="font-sans text-[12px] text-ink-400">
                Limit the number of files to process (1–100)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={handleStartBatch} disabled={isProcessing} loading={isProcessing}>
                {isProcessing ? 'processing…' : 'start batch processing'}
              </Button>
              {isProcessing && (
                <Button variant="danger" onClick={handleCancelBatch}>
                  cancel
                </Button>
              )}
            </div>
          </div>
        </Panel>
      </div>

      {/* progress + live file log */}
      {progress && (
        <Panel title="PROGRESS" active={isProcessing}>
          <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-mono text-[13px] text-ink-300">
                {isProcessing ? 'processing repository…' : 'processing finished'}
              </span>
              <span className="font-mono text-[12px] text-ink-400">
                {progress.completed} / {progress.total} files
                {progress.failed > 0 && (
                  <span className="text-red"> · {progress.failed} failed</span>
                )}
              </span>
            </div>

            <ProgressBar value={progress.percentage} />

            <p className="truncate font-mono text-[12px] text-ink-400">
              <span className="text-ink-300">current:</span> {progress.current}
            </p>

            {isProcessing && incrementalDocs.length > 0 && !result && (
              <div
                ref={logRef}
                className="max-h-64 overflow-y-auto border border-ink-700 bg-ink-950/60 p-3 font-mono text-[12.5px] leading-relaxed"
              >
                {incrementalDocs.map((doc, index) => (
                  <div key={index} className="flex items-baseline gap-2">
                    <span aria-hidden className={doc.success ? 'text-green' : 'text-red'}>
                      {doc.success ? '✓' : '✗'}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ink-300">{doc.filePath}</span>
                    {doc.qualityScore && (
                      <span className="shrink-0 font-display text-[11px] text-ink-300 tabular-nums">
                        {doc.qualityScore.score}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* results: TOC sidebar + detail pane */}
      {result && (
        <section className="flex min-h-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionHeader
              title="batch complete"
              meta={`${result.successCount}/${result.totalFiles} files documented`}
              className="min-w-64 flex-1"
            />
            <div className="flex flex-wrap items-center gap-2">
              {result.fullRepoDocumentation && (
                <>
                  <Button size="sm" variant="ghost" onClick={handleDownloadFullRepo}>
                    ↓ markdown
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleDownloadHTML}>
                    ↓ html
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleDownloadPDF}>
                    ↓ pdf
                  </Button>
                </>
              )}
              <Button size="sm" variant="success" onClick={handleDownloadAll}>
                ↓ all files
              </Button>
            </div>
          </div>

          <div className="grid min-h-0 grid-cols-1 gap-5 lg:grid-cols-[350px_1fr]">
            <Panel title="CONTENTS" className="min-h-0 min-w-0 max-h-[800px] max-lg:max-h-[400px]">
              {/* summary strip */}
              <div className="grid shrink-0 grid-cols-3 gap-px border-b border-ink-700 bg-ink-700">
                <div className="bg-ink-900 px-3 py-2.5 text-center">
                  <span className="block font-display text-xl text-ink-100 tabular-nums">
                    {result.totalFiles}
                  </span>
                  <span className="block font-mono text-[10px] tracking-wider text-ink-400 uppercase">
                    total
                  </span>
                </div>
                <div className="bg-ink-900 px-3 py-2.5 text-center">
                  <span className="block font-display text-xl text-green tabular-nums">
                    {result.successCount}
                  </span>
                  <span className="block font-mono text-[10px] tracking-wider text-ink-400 uppercase">
                    success
                  </span>
                </div>
                <div className="bg-ink-900 px-3 py-2.5 text-center">
                  <span className="block font-display text-xl text-red tabular-nums">
                    {result.failedCount}
                  </span>
                  <span className="block font-mono text-[10px] tracking-wider text-ink-400 uppercase">
                    failed
                  </span>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {result.fullRepoDocumentation && (
                  <div
                    onClick={() => setSelectedDoc(null)}
                    className={`cursor-pointer border-b border-l-2 border-b-ink-700/60 px-4 py-3 transition-colors ${
                      selectedDoc === null
                        ? 'border-l-phosphor-400 bg-phosphor-400/5'
                        : 'border-l-transparent hover:bg-ink-850'
                    }`}
                  >
                    <div className="flex items-baseline gap-2 font-mono text-[13px] text-phosphor-300">
                      <span aria-hidden className="shrink-0">*</span>
                      <span className="min-w-0 flex-1 truncate">Full Repository Documentation</span>
                    </div>
                    <p className="mt-0.5 truncate pl-5 font-mono text-[11px] text-ink-400">
                      Complete project overview
                    </p>
                  </div>
                )}
                {result.documents.map((doc, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedDoc(doc)}
                    className={`cursor-pointer border-b border-l-2 border-b-ink-700/60 px-4 py-3 transition-colors ${
                      selectedDoc === doc
                        ? 'border-l-phosphor-400 bg-phosphor-400/5'
                        : 'border-l-transparent hover:bg-ink-850'
                    }`}
                  >
                    <div className="flex items-baseline gap-2">
                      <span
                        aria-hidden
                        className={`shrink-0 font-mono text-[12px] ${
                          doc.success ? 'text-green' : 'text-red'
                        }`}
                      >
                        {doc.success ? '✓' : '✗'}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-ink-100">
                        {doc.filePath.split('/').pop()}
                      </span>
                      {doc.qualityScore && (
                        <span className="shrink-0 font-display text-[11px] text-ink-300 tabular-nums">
                          {doc.qualityScore.score}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate pl-5 font-mono text-[11px] text-ink-400">
                      {doc.filePath}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel
              title="DOCUMENT"
              active={!!selectedDoc || !!result.fullRepoDocumentation}
              className="min-h-0 min-w-0 max-h-[800px] max-lg:max-h-[400px]"
            >
              <div className="min-h-0 flex-1 overflow-y-auto">
                {selectedDoc ? (
                  <div className="flex min-h-full flex-col gap-4 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="min-w-0 truncate font-mono text-[14px] text-ink-100">
                        {selectedDoc.filePath}
                      </h2>
                      <Badge tone="phosphor">{selectedDoc.language}</Badge>
                    </div>

                    {selectedDoc.success ? (
                      <DocumentSheet
                        documentation={selectedDoc.documentation}
                        diagram={selectedDoc.diagram}
                        qualityScore={selectedDoc.qualityScore}
                        diagramCollapsed={isDiagramCollapsed}
                        onDiagramToggle={() => setIsDiagramCollapsed(!isDiagramCollapsed)}
                      />
                    ) : (
                      <div className="border border-red/25 bg-red/10 p-4">
                        <p className="font-mono text-[13px] text-red">
                          failed to generate documentation
                        </p>
                        <p className="mt-1 font-sans text-[13px] text-ink-300">
                          {selectedDoc.error || 'Unknown error occurred'}
                        </p>
                      </div>
                    )}
                  </div>
                ) : result.fullRepoDocumentation ? (
                  <div className="flex min-h-full flex-col gap-4 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="min-w-0 truncate font-mono text-[14px] text-ink-100">
                        Full Repository Documentation
                      </h2>
                      <Badge tone="phosphor">complete overview</Badge>
                    </div>

                    <DocumentSheet documentation={result.fullRepoDocumentation} />
                  </div>
                ) : (
                  <EmptyState
                    glyph="¶"
                    title="select a file"
                    hint="Pick a file from the table of contents to view its documentation."
                  />
                )}
              </div>
            </Panel>
          </div>
        </section>
      )}

      {/* how it works */}
      {!isProcessing && !result && (
        <section data-boot className="mt-2 flex flex-col gap-5">
          <SectionHeader title="how batch processing works" />

          <div className="flex flex-col gap-2">
            {HOW_IT_WORKS.map((step, index) => (
              <div key={index} className="flex items-baseline gap-3 font-mono text-[13px] text-ink-300">
                <span aria-hidden className="shrink-0 font-display text-[12px] text-phosphor-400">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <Panel key={feature.title} title={feature.title} className="min-h-0">
                <p className="p-4 font-sans text-[13px] text-ink-400">{feature.body}</p>
              </Panel>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default Batch
