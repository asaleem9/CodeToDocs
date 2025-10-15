import { useState, useEffect } from 'react'
import axios from 'axios'
import { showErrorToast, showSuccessToast, showWarningToast, showLoadingToast, dismissToast } from '../utils/errorHandler'
import './Settings.css'

type ClaudeModel = 'claude-sonnet-4-20250514' | 'claude-haiku-4-5-20251001' | 'claude-3-5-haiku-20241022'

function Settings() {
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [claudeModel, setClaudeModel] = useState<ClaudeModel>('claude-haiku-4-5-20251001')
  const webhookUrl = `${window.location.origin}/api/webhook/github`

  // Load settings from localStorage and backend on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('anthropic_api_key') || ''

    setApiKey(savedApiKey)

    // Fetch model preference from backend
    const fetchModelPreference = async () => {
      try {
        const response = await axios.get('/api/settings/model')
        if (response.data.model) {
          setClaudeModel(response.data.model)
        }
      } catch (error) {
        console.error('Error fetching model preference:', error)
      }
    }

    fetchModelPreference()
  }, [])

  const handleSaveSettings = async () => {
    if (!apiKey.trim()) {
      showErrorToast({
        response: {
          data: { error: 'API key is required' }
        }
      })
      return
    }

    // Validate API key format
    if (!apiKey.startsWith('sk-ant-')) {
      showWarningToast('API key should start with "sk-ant-" for Claude. Please verify your key.')
    }

    const loadingToastId = showLoadingToast('Saving settings...')

    try {
      // Save to localStorage
      localStorage.setItem('anthropic_api_key', apiKey)

      // Save model preference to backend
      await axios.post('/api/settings/model', { model: claudeModel })

      dismissToast(loadingToastId)
      showSuccessToast('Settings saved successfully!')
    } catch (error) {
      dismissToast(loadingToastId)
      showErrorToast(error)
    }
  }

  const handleCopyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl)
      showSuccessToast('Webhook URL copied to clipboard!')
    } catch (err) {
      showErrorToast(err)
    }
  }

  const handleClearSettings = () => {
    if (!confirm('Are you sure you want to clear all settings?')) {
      return
    }

    localStorage.removeItem('anthropic_api_key')
    setApiKey('')
    showSuccessToast('Settings cleared')
  }

  return (
    <div className="settings-page">
      <div className="settings-container">
        <header className="settings-header">
          <h1>Settings</h1>
          <p className="settings-subtitle">Configure your AI provider and integration settings</p>
        </header>

        <div className="settings-sections">
          {/* API Key Section */}
          <section className="settings-section">
            <h2>API Configuration</h2>
            <p className="section-description">Enter your Anthropic API key to enable documentation generation</p>

            <div className="form-group">
              <label htmlFor="api-key">Anthropic API Key</label>
              <div className="input-group">
                <input
                  id="api-key"
                  type={showApiKey ? 'text' : 'password'}
                  className="input-field"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                />
                <button
                  className="toggle-visibility-btn"
                  onClick={() => setShowApiKey(!showApiKey)}
                  type="button"
                >
                  {showApiKey ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="input-hint">
                Get your API key from{' '}
                <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">
                  console.anthropic.com
                </a>
              </p>
            </div>
          </section>

          {/* Claude Model Selection */}
          <section className="settings-section">
            <h2>Claude Model</h2>
            <p className="section-description">Choose which Claude model to use for documentation generation</p>

            <div className="model-options">
              <label className={`model-option ${claudeModel === 'claude-haiku-4-5-20251001' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="claudeModel"
                  value="claude-haiku-4-5-20251001"
                  checked={claudeModel === 'claude-haiku-4-5-20251001'}
                  onChange={(e) => setClaudeModel(e.target.value as ClaudeModel)}
                />
                <div className="model-content">
                  <div className="model-header">
                    <span className="model-name">Claude Haiku 4.5</span>
                    <span className="badge badge-new">New</span>
                    <span className="badge badge-recommended">Recommended</span>
                  </div>
                  <p className="model-description">Sonnet-4-level coding performance at one-third the cost and twice the speed</p>
                  <div className="model-specs">
                    <span className="spec">⚡ 2x faster than Sonnet</span>
                    <span className="spec">💰 1/3 the cost</span>
                    <span className="spec">🚀 Frontier performance</span>
                  </div>
                </div>
              </label>

              <label className={`model-option ${claudeModel === 'claude-sonnet-4-20250514' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="claudeModel"
                  value="claude-sonnet-4-20250514"
                  checked={claudeModel === 'claude-sonnet-4-20250514'}
                  onChange={(e) => setClaudeModel(e.target.value as ClaudeModel)}
                />
                <div className="model-content">
                  <div className="model-header">
                    <span className="model-name">Claude Sonnet 4.5</span>
                    <span className="badge badge-advanced">Advanced</span>
                  </div>
                  <p className="model-description">Maximum intelligence for the most complex codebases</p>
                  <div className="model-specs">
                    <span className="spec">🧠 Highest intelligence</span>
                    <span className="spec">📊 Complex analysis</span>
                    <span className="spec">💵 Higher cost</span>
                  </div>
                </div>
              </label>

              <label className={`model-option ${claudeModel === 'claude-3-5-haiku-20241022' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="claudeModel"
                  value="claude-3-5-haiku-20241022"
                  checked={claudeModel === 'claude-3-5-haiku-20241022'}
                  onChange={(e) => setClaudeModel(e.target.value as ClaudeModel)}
                />
                <div className="model-content">
                  <div className="model-header">
                    <span className="model-name">Claude 3.5 Haiku</span>
                    <span className="badge badge-legacy">Legacy</span>
                  </div>
                  <p className="model-description">Previous generation model for basic documentation tasks</p>
                  <div className="model-specs">
                    <span className="spec">⚡ Fast response</span>
                    <span className="spec">💰 Low cost</span>
                    <span className="spec">✨ Good quality</span>
                  </div>
                </div>
              </label>
            </div>
          </section>

          {/* Webhook Section */}
          <section className="settings-section">
            <h2>GitHub Webhook</h2>
            <p className="section-description">Use this URL to set up GitHub webhooks for automatic documentation</p>

            <div className="webhook-display">
              <div className="webhook-url">
                <code>{webhookUrl}</code>
              </div>
              <button className="copy-webhook-btn" onClick={handleCopyWebhookUrl}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                Copy
              </button>
            </div>

            <div className="webhook-instructions">
              <h3>Setup Instructions:</h3>
              <ol>
                <li>Go to your GitHub repository settings</li>
                <li>Navigate to Webhooks → Add webhook</li>
                <li>Paste the URL above in "Payload URL"</li>
                <li>Select "application/json" as content type</li>
                <li>Choose "Pull requests" events</li>
                <li>Save the webhook</li>
              </ol>
            </div>
          </section>

          {/* Action Buttons */}
          <div className="settings-actions">
            <button className="btn btn-primary" onClick={handleSaveSettings}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Save Settings
            </button>
            <button className="btn btn-secondary" onClick={handleClearSettings}>
              Clear All Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
