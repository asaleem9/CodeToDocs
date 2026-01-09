import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useBatch } from '../contexts/BatchContext'
import { showErrorToast, showSuccessToast, showLoadingToast, dismissToast } from '../utils/errorHandler'
import { downloadAsHTML, downloadAsPDF } from '../utils/exportUtils'
import './Batch.css'

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
  qualityScore?: any
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
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Use batch context for URL mode, local state for zip mode
  const isProcessing = uploadMode === 'zip' ? localIsProcessing : batchContext.isProcessing
  const batchId = uploadMode === 'zip' ? localBatchId : batchContext.batchId
  const progress = uploadMode === 'zip' ? localProgress : batchContext.progress

  const startProgressPolling = (id: string) => {
    // Clear any existing interval
    if (progressInterval.current) {
      clearInterval(progressInterval.current)
    }

    progressInterval.current = setInterval(async () => {
      try {
        const progressRes = await axios.get(`/api/batch/progress/${id}`)

        // Update progress in local state
        if (progressRes.data.progress) {
          setLocalProgress(progressRes.data.progress)
        }

        if (progressRes.data.completed) {
          // Fetch final result
          const resultRes = await axios.get(`/api/batch/result/${id}`)
          setResult(resultRes.data)
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
    <div className="batch-page">
      <div className="batch-container">
        <header className="batch-header">
          <h1>Batch Documentation</h1>
          <p className="batch-subtitle">Document entire repositories automatically</p>
        </header>

        <div className="batch-input-section">
          <div className="mode-selector">
            <button
              className={`mode-btn ${uploadMode === 'url' ? 'active' : ''}`}
              onClick={() => setUploadMode('url')}
              disabled={isProcessing}
            >
              📡 GitHub URL
            </button>
            <button
              className={`mode-btn ${uploadMode === 'zip' ? 'active' : ''}`}
              onClick={() => setUploadMode('zip')}
              disabled={isProcessing}
            >
              📦 Upload ZIP
            </button>
          </div>

          {uploadMode === 'url' ? (
            <div className="input-group">
              <label htmlFor="repoUrl">GitHub Repository URL</label>
              <input
                id="repoUrl"
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/username/repository"
                className="repo-input"
                disabled={isProcessing}
              />
            </div>
          ) : (
            <div className="input-group">
              <label htmlFor="zipFile">Upload Zipped Repository</label>
              <input
                ref={fileInputRef}
                id="zipFile"
                type="file"
                accept=".zip"
                onChange={handleFileSelect}
                className="file-input"
                disabled={isProcessing}
                style={{ display: 'none' }}
              />
              <div className="file-upload-area">
                <button
                  className="file-select-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                >
                  {selectedFile ? '✓ Change File' : '📁 Select ZIP File'}
                </button>
                {selectedFile && (
                  <div className="selected-file-info">
                    <span className="file-name">{selectedFile.name}</span>
                    <span className="file-size">
                      ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                )}
                {!selectedFile && (
                  <p className="file-hint">Select a zipped GitHub repository to process</p>
                )}
              </div>
            </div>
          )}

          <div className="input-group">
            <label htmlFor="maxFiles">Maximum Files</label>
            <input
              id="maxFiles"
              type="number"
              value={maxFiles}
              onChange={(e) => setMaxFiles(parseInt(e.target.value) || 50)}
              min="1"
              max="100"
              className="number-input"
              disabled={isProcessing}
            />
            <small>Limit the number of files to process (1-100)</small>
          </div>

          <div className="button-group">
            <button
              className="start-btn"
              onClick={handleStartBatch}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Start Batch Processing'}
            </button>

            {isProcessing && (
              <button
                className="cancel-btn"
                onClick={handleCancelBatch}
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {progress && (
          <div className="progress-section">
            <div className="progress-header">
              <h3>Processing Repository...</h3>
              <span className="progress-percentage">{progress.percentage}%</span>
            </div>

            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress.percentage}%` }}
              ></div>
            </div>

            <div className="progress-details">
              <p>
                <strong>Current:</strong> {progress.current}
              </p>
              <p>
                <strong>Progress:</strong> {progress.completed} / {progress.total} files
              </p>
              {progress.failed > 0 && (
                <p className="failed-count">
                  <strong>Failed:</strong> {progress.failed}
                </p>
              )}
            </div>
          </div>
        )}

        {result && (
          <div className="result-section">
            <div className="result-header">
              <h2>Batch Complete!</h2>
              <div className="header-actions">
                {result.fullRepoDocumentation && (
                  <>
                    <button className="download-full-doc-btn" onClick={handleDownloadFullRepo}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                      </svg>
                      Markdown
                    </button>
                    <button className="download-html-btn" onClick={handleDownloadHTML}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <path d="M16 13H8"></path>
                        <path d="M16 17H8"></path>
                        <path d="M10 9H8"></path>
                      </svg>
                      HTML
                    </button>
                    <button className="download-pdf-btn" onClick={handleDownloadPDF}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <line x1="10" y1="9" x2="8" y2="9"></line>
                      </svg>
                      PDF
                    </button>
                  </>
                )}
                <button className="download-all-btn" onClick={handleDownloadAll}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  All Files
                </button>
              </div>
            </div>

            <div className="result-content">
              <div className="result-sidebar">
                <div className="summary-card">
                  <h3>Summary</h3>
                  <div className="stat-grid">
                    <div className="stat">
                      <span className="stat-value">{result.totalFiles}</span>
                      <span className="stat-label">Total Files</span>
                    </div>
                    <div className="stat success">
                      <span className="stat-value">{result.successCount}</span>
                      <span className="stat-label">Success</span>
                    </div>
                    <div className="stat failed">
                      <span className="stat-value">{result.failedCount}</span>
                      <span className="stat-label">Failed</span>
                    </div>
                  </div>
                </div>

                <div className="toc-section">
                  <h3>Table of Contents</h3>
                  <div className="doc-list">
                    {result.fullRepoDocumentation && (
                      <div
                        className={`doc-item full-repo-item ${selectedDoc === null && result.fullRepoDocumentation ? 'active' : ''}`}
                        onClick={() => setSelectedDoc(null)}
                      >
                        <div className="doc-item-header">
                          <span className="doc-status">📘</span>
                          <span className="doc-name">Full Repository Documentation</span>
                        </div>
                        <div className="doc-item-path">Complete project overview</div>
                      </div>
                    )}
                    {result.documents.map((doc, index) => (
                      <div
                        key={index}
                        className={`doc-item ${selectedDoc === doc ? 'active' : ''} ${!doc.success ? 'failed' : ''}`}
                        onClick={() => setSelectedDoc(doc)}
                      >
                        <div className="doc-item-header">
                          <span className="doc-status">
                            {doc.success ? '✅' : '❌'}
                          </span>
                          <span className="doc-name">{doc.filePath.split('/').pop()}</span>
                        </div>
                        <div className="doc-item-path">{doc.filePath}</div>
                        {doc.qualityScore && (
                          <div className="doc-quality">
                            Quality: {doc.qualityScore.score}/100
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="result-main">
                {selectedDoc ? (
                  <div className="document-view">
                    <div className="document-header">
                      <h2>{selectedDoc.filePath}</h2>
                      <span className="language-tag">{selectedDoc.language}</span>
                    </div>

                    {selectedDoc.success ? (
                      <div className="markdown-content">
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
                          {selectedDoc.documentation}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="error-view">
                        <h3>Failed to generate documentation</h3>
                        <p>{selectedDoc.error || 'Unknown error occurred'}</p>
                      </div>
                    )}
                  </div>
                ) : result.fullRepoDocumentation ? (
                  <div className="document-view full-repo-view">
                    <div className="document-header">
                      <h2>📘 Full Repository Documentation</h2>
                      <span className="language-tag">Complete Overview</span>
                    </div>
                    <div className="markdown-content">
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
                        {result.fullRepoDocumentation}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div className="empty-view">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>Select a file from the table of contents to view its documentation</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!isProcessing && !result && (
          <div className="info-section">
            <h3>How Batch Processing Works</h3>
            <ol>
              <li>Choose input method: GitHub URL or Upload ZIP file</li>
              <li>Set the maximum number of files to process</li>
              <li>Click "Start Batch Processing"</li>
              <li>Watch the progress as files are documented</li>
              <li>Review all documentation and download</li>
            </ol>

            <div className="features-grid">
              <div className="feature">
                <span className="feature-icon">📦</span>
                <h4>ZIP Upload</h4>
                <p>Upload a zipped repository directly for processing</p>
              </div>
              <div className="feature">
                <span className="feature-icon">📁</span>
                <h4>Auto-Detection</h4>
                <p>Automatically detects code files in supported languages</p>
              </div>
              <div className="feature">
                <span className="feature-icon">📊</span>
                <h4>Progress Tracking</h4>
                <p>Real-time progress updates and file-by-file status</p>
              </div>
              <div className="feature">
                <span className="feature-icon">📋</span>
                <h4>Table of Contents</h4>
                <p>Organized documentation with navigation</p>
              </div>
              <div className="feature">
                <span className="feature-icon">💾</span>
                <h4>Download All</h4>
                <p>Export complete documentation as Markdown</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Batch
