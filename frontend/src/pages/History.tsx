import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import mermaid from 'mermaid'
import QualityScore from '../components/QualityScore'
import { showErrorToast, showSuccessToast } from '../utils/errorHandler'
import './History.css'

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

interface StoredDoc {
  id: string
  documentation: string
  diagram?: string
  qualityScore?: QualityScoreData
  code: string
  language: string
  generatedAt: string
  prInfo?: {
    prNumber: number
    repository: string
    branch: string
    author: string
  }
}

function History() {
  const [docs, setDocs] = useState<StoredDoc[]>([])
  const [selectedDoc, setSelectedDoc] = useState<StoredDoc | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [isDiagramCollapsed, setIsDiagramCollapsed] = useState<boolean>(false)
  const diagramRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchHistory()
  }, [])

  // Render diagram when selected doc changes
  useEffect(() => {
    if (selectedDoc?.diagram && diagramRef.current) {
      const renderDiagram = async () => {
        try {
          diagramRef.current!.innerHTML = ''

          // Clean up the diagram string (remove any markdown code fences)
          let cleanDiagram = selectedDoc.diagram!.trim()
          if (cleanDiagram.startsWith('```mermaid')) {
            cleanDiagram = cleanDiagram.replace(/^```mermaid\n/, '').replace(/\n```$/, '')
          } else if (cleanDiagram.startsWith('```')) {
            cleanDiagram = cleanDiagram.replace(/^```\n/, '').replace(/\n```$/, '')
          }

          const { svg } = await mermaid.render(`mermaid-diagram-${selectedDoc.id}`, cleanDiagram)
          diagramRef.current!.innerHTML = svg
        } catch (error: any) {
          console.error('Error rendering diagram:', error)
          console.error('Diagram content:', selectedDoc.diagram)
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
  }, [selectedDoc])

  const fetchHistory = async () => {
    setIsLoading(true)
    try {
      const response = await axios.get('/api/documentation')
      setDocs(response.data.documentation || [])
      setStats(response.data.stats)
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
      await axios.delete(`/api/documentation/${id}`)
      setDocs(docs.filter(d => d.id !== id))
      if (selectedDoc?.id === id) {
        setSelectedDoc(null)
      }
      showSuccessToast('Documentation deleted')
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
    const date = new Date(dateString)
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

  const getLanguageColor = (language: string) => {
    const colors: Record<string, string> = {
      javascript: '#f7df1e',
      typescript: '#3178c6',
      python: '#3776ab',
      java: '#007396',
      jsx: '#61dafb',
      tsx: '#3178c6'
    }
    return colors[language.toLowerCase()] || '#94a3b8'
  }

  return (
    <div className="history-page">
      <div className="history-container">
        <header className="history-header">
          <div>
            <h1>History</h1>
            <p className="history-subtitle">Recent documentation generations</p>
          </div>
          {stats && (
            <div className="history-stats">
              <div className="stat-item">
                <span className="stat-value">{stats.entries}</span>
                <span className="stat-label">Stored</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stats.maxSize}</span>
                <span className="stat-label">Max</span>
              </div>
            </div>
          )}
        </header>

        <div className="history-content">
          {/* Sidebar List */}
          <aside className="history-sidebar">
            {isLoading ? (
              <div className="loading-state">
                <div className="spinner-large"></div>
                <p>Loading history...</p>
              </div>
            ) : docs.length === 0 ? (
              <div className="empty-history">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>No documentation history yet</p>
                <span>Generated documentation will appear here</span>
              </div>
            ) : (
              <div className="doc-list">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className={`doc-item ${selectedDoc?.id === doc.id ? 'active' : ''}`}
                    onClick={() => handleSelectDoc(doc)}
                  >
                    <div className="doc-item-header">
                      <span
                        className="language-tag"
                        style={{ backgroundColor: getLanguageColor(doc.language) }}
                      >
                        {doc.language}
                      </span>
                      <span className="doc-time">{formatDate(doc.generatedAt)}</span>
                    </div>

                    <div className="doc-item-content">
                      {doc.prInfo ? (
                        <div className="doc-source">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                          </svg>
                          <span className="pr-info">
                            PR #{doc.prInfo.prNumber} • {doc.prInfo.repository.split('/')[1]}
                          </span>
                        </div>
                      ) : (
                        <div className="doc-source">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75" />
                          </svg>
                          <span className="manual-label">Manual Generation</span>
                        </div>
                      )}
                    </div>

                    <button
                      className="delete-btn"
                      onClick={(e) => handleDelete(doc.id, e)}
                      title="Delete"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </aside>

          {/* Detail View */}
          <main className="history-detail">
            {selectedDoc ? (
              <>
                <div className="detail-header">
                  <div className="detail-title">
                    <h2>Generated Documentation</h2>
                    {selectedDoc.prInfo && (
                      <div className="pr-badge">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                        PR #{selectedDoc.prInfo.prNumber} • {selectedDoc.prInfo.repository}
                      </div>
                    )}
                  </div>
                  <button className="copy-doc-btn" onClick={handleCopyDocumentation}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                    Copy
                  </button>
                </div>

                <div className="documentation-display">
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

                  {selectedDoc.qualityScore && <QualityScore qualityScore={selectedDoc.qualityScore} />}

                  {selectedDoc.diagram && (
                    <div className="diagram-section">
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
              </>
            ) : (
              <div className="empty-detail">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>Select a document to view</p>
                <span>Click on any item from the list to view its documentation</span>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

export default History
