import { useState } from 'react'
import axios from 'axios'
import { showErrorToast, showSuccessToast, showLoadingToast, dismissToast } from '../utils/errorHandler'
import './Integrations.css'

interface IntegrationConfig {
  notion?: {
    token: string
    databaseId?: string
    pageId?: string
  }
  confluence?: {
    baseUrl: string
    email: string
    apiToken: string
    spaceKey: string
    parentPageId?: string
  }
  githubWiki?: {
    token: string
    owner: string
    repo: string
  }
  slack?: {
    webhookUrl: string
  }
}

function Integrations() {
  const [config, setConfig] = useState<IntegrationConfig>({})
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null)
  const [documentation, setDocumentation] = useState<string>('')
  const [title, setTitle] = useState<string>('')

  const integrations = [
    {
      id: 'notion',
      name: 'Notion',
      icon: '📝',
      description: 'Export documentation to Notion pages',
      color: '#000000',
      fields: [
        { key: 'token', label: 'Integration Token', type: 'password', required: true },
        { key: 'databaseId', label: 'Database ID (optional)', type: 'text' },
        { key: 'pageId', label: 'Page ID (optional)', type: 'text' },
      ],
    },
    {
      id: 'confluence',
      name: 'Confluence',
      icon: '🌊',
      description: 'Publish to Atlassian Confluence',
      color: '#0052CC',
      fields: [
        { key: 'baseUrl', label: 'Base URL', type: 'text', placeholder: 'https://your-domain.atlassian.net/wiki', required: true },
        { key: 'email', label: 'Email', type: 'email', required: true },
        { key: 'apiToken', label: 'API Token', type: 'password', required: true },
        { key: 'spaceKey', label: 'Space Key', type: 'text', required: true },
        { key: 'parentPageId', label: 'Parent Page ID (optional)', type: 'text' },
      ],
    },
    {
      id: 'github-wiki',
      name: 'GitHub Wiki',
      icon: '📚',
      description: 'Sync to GitHub repository wiki',
      color: '#181717',
      fields: [
        { key: 'token', label: 'GitHub Token', type: 'password', required: true },
        { key: 'owner', label: 'Repository Owner', type: 'text', required: true },
        { key: 'repo', label: 'Repository Name', type: 'text', required: true },
      ],
    },
    {
      id: 'readme',
      name: 'README Generator',
      icon: '📄',
      description: 'Generate and update README.md files',
      color: '#4CAF50',
      fields: [
        { key: 'token', label: 'GitHub Token', type: 'password', required: true },
        { key: 'owner', label: 'Repository Owner', type: 'text', required: true },
        { key: 'repo', label: 'Repository Name', type: 'text', required: true },
      ],
    },
    {
      id: 'slack',
      name: 'Slack',
      icon: '💬',
      description: 'Send notifications to Slack',
      color: '#4A154B',
      fields: [
        { key: 'webhookUrl', label: 'Webhook URL', type: 'text', required: true },
      ],
    },
  ]

  const handleConfigChange = (integrationId: string, field: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      [integrationId]: {
        ...prev[integrationId as keyof IntegrationConfig],
        [field]: value,
      },
    }))
  }

  const handleExport = async (integrationId: string) => {
    if (!documentation.trim()) {
      showErrorToast({
        response: {
          data: { error: 'Please provide documentation to export' },
        },
      })
      return
    }

    if (!title.trim()) {
      showErrorToast({
        response: {
          data: { error: 'Please provide a title' },
        },
      })
      return
    }

    const loadingToastId = showLoadingToast(`Exporting to ${integrations.find(i => i.id === integrationId)?.name}...`)

    try {
      let response

      if (integrationId === 'notion') {
        response = await axios.post('/api/integrations/notion', {
          markdown: documentation,
          title,
          config: config.notion,
        })
      } else if (integrationId === 'confluence') {
        response = await axios.post('/api/integrations/confluence', {
          markdown: documentation,
          title,
          config: config.confluence,
        })
      } else if (integrationId === 'github-wiki') {
        response = await axios.post('/api/integrations/github-wiki', {
          markdown: documentation,
          pageName: title.replace(/\s+/g, '-'),
          config: config.githubWiki,
        })
      } else if (integrationId === 'readme') {
        // Generate README first
        const readmeRes = await axios.post('/api/integrations/readme', {
          options: {
            projectName: title,
            documentation,
            includeInstallation: true,
            includeUsage: true,
            includeLicense: true,
          },
        })

        // Create in repo
        response = await axios.post('/api/integrations/readme/create', {
          readme: readmeRes.data.readme,
          config: config.githubWiki, // Same config structure
        })
      } else if (integrationId === 'slack') {
        response = await axios.post('/api/integrations/slack', {
          config: config.slack,
          options: {
            title: 'Documentation Updated',
            message: `New documentation published: ${title}`,
            color: '#36a64f',
          },
        })
      }

      dismissToast(loadingToastId)

      if (response?.data.success) {
        showSuccessToast(`Successfully exported to ${integrations.find(i => i.id === integrationId)?.name}!`)
        if (response.data.url) {
          window.open(response.data.url, '_blank')
        }
      }
    } catch (error: any) {
      dismissToast(loadingToastId)
      showErrorToast(error)
    }
  }

  const selectedIntegrationData = integrations.find((i) => i.id === selectedIntegration)

  return (
    <div className="integrations-page">
      <div className="integrations-container">
        <header className="integrations-header">
          <h1>Integrations</h1>
          <p className="integrations-subtitle">Export and sync your documentation across platforms</p>
        </header>

        <div className="integrations-content">
          {/* Integration Cards */}
          <div className="integration-cards">
            {integrations.map((integration) => (
              <div
                key={integration.id}
                className={`integration-card ${selectedIntegration === integration.id ? 'active' : ''}`}
                onClick={() => setSelectedIntegration(integration.id)}
                style={{ '--integration-color': integration.color } as React.CSSProperties}
              >
                <div className="integration-icon">{integration.icon}</div>
                <h3>{integration.name}</h3>
                <p>{integration.description}</p>
              </div>
            ))}
          </div>

          {/* Configuration Panel */}
          {selectedIntegrationData && (
            <div className="integration-config">
              <h2>Configure {selectedIntegrationData.name}</h2>

              <div className="config-section">
                <h3>Documentation Details</h3>
                <div className="input-group">
                  <label htmlFor="title">Title</label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="My Documentation"
                    className="config-input"
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="documentation">Documentation (Markdown)</label>
                  <textarea
                    id="documentation"
                    value={documentation}
                    onChange={(e) => setDocumentation(e.target.value)}
                    placeholder="# My Project&#10;&#10;This is the documentation..."
                    className="config-textarea"
                    rows={10}
                  />
                </div>
              </div>

              <div className="config-section">
                <h3>Integration Settings</h3>
                {selectedIntegrationData.fields.map((field) => (
                  <div key={field.key} className="input-group">
                    <label htmlFor={field.key}>
                      {field.label}
                      {field.required && <span className="required">*</span>}
                    </label>
                    <input
                      id={field.key}
                      type={field.type}
                      value={
                        (config[selectedIntegration as keyof IntegrationConfig] as any)?.[field.key] || ''
                      }
                      onChange={(e) =>
                        handleConfigChange(selectedIntegration!, field.key, e.target.value)
                      }
                      placeholder={field.placeholder}
                      className="config-input"
                    />
                  </div>
                ))}
              </div>

              <button
                className="export-btn"
                onClick={() => handleExport(selectedIntegration!)}
              >
                Export to {selectedIntegrationData.name}
              </button>

              <div className="integration-help">
                <h4>📖 How to get credentials:</h4>
                {selectedIntegration === 'notion' && (
                  <ul>
                    <li>Go to <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer">My Integrations</a></li>
                    <li>Create a new integration and copy the token</li>
                    <li>Share your database or page with the integration</li>
                  </ul>
                )}
                {selectedIntegration === 'confluence' && (
                  <ul>
                    <li>Go to <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer">API Tokens</a></li>
                    <li>Create an API token</li>
                    <li>Find your space key in the space settings</li>
                  </ul>
                )}
                {(selectedIntegration === 'github-wiki' || selectedIntegration === 'readme') && (
                  <ul>
                    <li>Go to <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer">Personal Access Tokens</a></li>
                    <li>Generate a token with <code>repo</code> scope</li>
                  </ul>
                )}
                {selectedIntegration === 'slack' && (
                  <ul>
                    <li>Go to <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer">Incoming Webhooks</a></li>
                    <li>Create a webhook for your workspace</li>
                    <li>Copy the webhook URL</li>
                  </ul>
                )}
              </div>
            </div>
          )}

          {!selectedIntegrationData && (
            <div className="integration-placeholder">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3>Select an integration</h3>
              <p>Choose an integration from the cards above to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Integrations
