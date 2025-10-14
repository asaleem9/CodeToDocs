import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { showErrorToast, showSuccessToast } from '../utils/errorHandler'
import './QA.css'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{
    content: string
    filePath?: string
    language?: string
    similarity: number
  }>
  relatedQuestions?: string[]
  confidence?: 'high' | 'medium' | 'low'
  timestamp: Date
}

function QA() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId] = useState(`conv-${Date.now()}`)
  const [showSources, setShowSources] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    // Load vector store stats
    loadStats()

    // Add welcome message
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: `# Welcome to Documentation Q&A! 👋

I'm your AI documentation assistant. I can help answer questions about your generated documentation.

**How it works:**
1. Generate some documentation first (Home page)
2. Ask me questions about it
3. I'll search through the docs and provide answers with code examples

**Try asking:**
- "How do I use the authentication function?"
- "Show me examples of API endpoints"
- "What are the main features?"

*Start by generating some documentation, then come back and ask me anything!*`,
      timestamp: new Date(),
    }])
  }, [])

  const loadStats = async () => {
    try {
      const response = await axios.get('/api/qa/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await axios.post('/api/qa/ask', {
        question: input,
        conversationId,
      })

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.data.answer,
        sources: response.data.sources,
        relatedQuestions: response.data.relatedQuestions,
        confidence: response.data.confidence,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
      loadStats() // Refresh stats
    } catch (error: any) {
      showErrorToast(error)

      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.response?.data?.error || error.message}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFeedback = async (messageId: string, helpful: boolean) => {
    try {
      await axios.post('/api/qa/feedback', {
        questionId: messageId,
        helpful,
      })
      showSuccessToast('Thanks for your feedback!')
    } catch (error) {
      showErrorToast(error)
    }
  }

  const handleRelatedQuestionClick = (question: string) => {
    setInput(question)
  }

  const clearConversation = async () => {
    try {
      await axios.delete(`/api/qa/conversation/${conversationId}`)
      setMessages([messages[0]]) // Keep welcome message
      showSuccessToast('Conversation cleared')
    } catch (error) {
      showErrorToast(error)
    }
  }

  const getConfidenceBadge = (confidence?: 'high' | 'medium' | 'low') => {
    if (!confidence) return null

    const colors = {
      high: 'confidence-high',
      medium: 'confidence-medium',
      low: 'confidence-low',
    }

    const labels = {
      high: 'High Confidence',
      medium: 'Medium Confidence',
      low: 'Low Confidence',
    }

    return (
      <span className={`confidence-badge ${colors[confidence]}`}>
        {labels[confidence]}
      </span>
    )
  }

  return (
    <div className="qa-page">
      <div className="qa-container">
        <header className="qa-header">
          <div className="qa-header-content">
            <h1>📚 Documentation Q&A</h1>
            <p className="qa-subtitle">Ask questions about your documentation</p>
          </div>
          <div className="qa-header-actions">
            {stats && (
              <div className="qa-stats">
                <span className="stat-item">
                  📄 {stats.totalDocuments} Docs
                </span>
                <span className="stat-item">
                  🧩 {stats.totalChunks} Chunks
                </span>
              </div>
            )}
            <button className="clear-btn" onClick={clearConversation}>
              🔄 Clear Chat
            </button>
          </div>
        </header>

        <div className="messages-container">
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.role}`}>
              <div className="message-avatar">
                {message.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="message-content">
                <div className="message-header">
                  <span className="message-role">
                    {message.role === 'user' ? 'You' : 'AI Assistant'}
                  </span>
                  {message.confidence && getConfidenceBadge(message.confidence)}
                </div>
                <div className="message-text">
                  <ReactMarkdown
                    components={{
                      code({ inline, className, children, ...props }: any) {
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
                    {message.content}
                  </ReactMarkdown>
                </div>

                {message.sources && message.sources.length > 0 && (
                  <div className="message-sources">
                    <button
                      className="sources-toggle"
                      onClick={() => setShowSources(showSources === message.id ? null : message.id)}
                    >
                      📑 View Sources ({message.sources.length})
                    </button>
                    {showSources === message.id && (
                      <div className="sources-list">
                        {message.sources.map((source, idx) => (
                          <div key={idx} className="source-item">
                            <div className="source-header">
                              <span className="source-file">
                                {source.filePath || 'Unknown file'}
                              </span>
                              <span className="source-similarity">
                                {Math.round(source.similarity * 100)}% match
                              </span>
                            </div>
                            <div className="source-content">
                              {source.content.substring(0, 200)}...
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {message.relatedQuestions && message.relatedQuestions.length > 0 && (
                  <div className="related-questions">
                    <p className="related-label">Related questions:</p>
                    {message.relatedQuestions.map((question, idx) => (
                      <button
                        key={idx}
                        className="related-question"
                        onClick={() => handleRelatedQuestionClick(question)}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                )}

                {message.role === 'assistant' && message.id !== 'welcome' && (
                  <div className="message-feedback">
                    <span className="feedback-label">Was this helpful?</span>
                    <button
                      className="feedback-btn thumbs-up"
                      onClick={() => handleFeedback(message.id, true)}
                      title="Helpful"
                    >
                      👍
                    </button>
                    <button
                      className="feedback-btn thumbs-down"
                      onClick={() => handleFeedback(message.id, false)}
                      title="Not helpful"
                    >
                      👎
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message assistant loading">
              <div className="message-avatar">🤖</div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-container">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about your documentation..."
            className="message-input"
            rows={3}
            disabled={isLoading}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? '⏳' : '📤'} Send
          </button>
        </div>
      </div>
    </div>
  )
}

export default QA
