import { useState, useEffect } from 'react'
import { showErrorToast, showSuccessToast, showWarningToast } from '../utils/errorHandler'
import './Settings.css'

function Settings() {
  const [apiKey, setApiKey] = useState('')
  const [provider, setProvider] = useState<'claude' | 'openai'>('claude')
  const [showApiKey, setShowApiKey] = useState(false)
  const webhookUrl = `${window.location.origin}/api/webhook/github`

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('anthropic_api_key') || ''
    const savedProvider = (localStorage.getItem('ai_provider') as 'claude' | 'openai') || 'claude'

    setApiKey(savedApiKey)
    setProvider(savedProvider)
  }, [])

  const handleSaveSettings = () => {
    if (!apiKey.trim()) {
      showErrorToast({
        response: {
          data: { error: 'API key is required' }
        }
      })
      return
    }

    // Validate API key format
    if (provider === 'claude' && !apiKey.startsWith('sk-ant-')) {
      showWarningToast('API key should start with "sk-ant-" for Claude. Please verify your key.')
    }

    // Save to localStorage
    localStorage.setItem('anthropic_api_key', apiKey)
    localStorage.setItem('ai_provider', provider)

    showSuccessToast('Settings saved successfully!')
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
    localStorage.removeItem('ai_provider')
    setApiKey('')
    setProvider('claude')
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
          {/* AI Provider Section */}
          <section className="settings-section">
            <h2>AI Provider</h2>
            <p className="section-description">Choose your preferred AI provider for documentation generation</p>

            <div className="provider-options">
              <label className={`provider-option ${provider === 'claude' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="provider"
                  value="claude"
                  checked={provider === 'claude'}
                  onChange={(e) => setProvider(e.target.value as 'claude')}
                />
                <div className="provider-content">
                  <div className="provider-header">
                    <span className="provider-name">Claude (Anthropic)</span>
                    <span className="badge badge-active">Active</span>
                  </div>
                  <p className="provider-description">Claude 3.5 Sonnet - Advanced code understanding</p>
                </div>
              </label>

              <label className={`provider-option ${provider === 'openai' ? 'active' : ''} disabled`}>
                <input
                  type="radio"
                  name="provider"
                  value="openai"
                  disabled
                  checked={provider === 'openai'}
                  onChange={(e) => setProvider(e.target.value as 'openai')}
                />
                <div className="provider-content">
                  <div className="provider-header">
                    <span className="provider-name">OpenAI</span>
                    <span className="badge badge-soon">Coming Soon</span>
                  </div>
                  <p className="provider-description">GPT-4 support coming in a future update</p>
                </div>
              </label>
            </div>
          </section>

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
