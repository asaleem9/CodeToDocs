import { useState, useRef } from 'react'
import axios from 'axios'
import { showErrorToast, showSuccessToast, showLoadingToast, dismissToast } from '../utils/errorHandler'
import { useGSAP, bootSequence } from '../lib/motion'
import Panel from '../components/ui/Panel'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'

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

interface IntegrationField {
  key: string
  label: string
  type: string
  placeholder?: string
  required?: boolean
}

interface Integration {
  id: string
  name: string
  icon: string
  description: string
  comingSoon?: boolean
  fields: IntegrationField[]
}

const INPUT_CLASSES =
  'w-full rounded-[2px] border border-ink-700 bg-ink-850 px-3.5 py-2 font-mono text-[13px] text-ink-100 transition-colors placeholder:text-ink-400 hover:border-ink-600 focus:border-phosphor-500 focus:outline-none'

function Integrations() {
  const [config, setConfig] = useState<IntegrationConfig>({})
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null)
  const [documentation, setDocumentation] = useState<string>('')
  const [title, setTitle] = useState<string>('')
  const [isExporting, setIsExporting] = useState<boolean>(false)
  const scopeRef = useRef<HTMLDivElement>(null)

  // page boot-in
  useGSAP(
    () => {
      if (scopeRef.current) bootSequence(scopeRef.current)
    },
    { scope: scopeRef }
  )

  const integrations: Integration[] = [
    {
      id: 'notion',
      name: 'Notion',
      icon: 'N',
      description: 'Export documentation to Notion pages',
      fields: [
        { key: 'token', label: 'Integration Token', type: 'password', required: true },
        { key: 'databaseId', label: 'Database ID (optional)', type: 'text' },
        { key: 'pageId', label: 'Page ID (optional)', type: 'text' },
      ],
    },
    {
      id: 'confluence',
      name: 'Confluence',
      icon: 'C',
      description: 'Publish to Atlassian Confluence',
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
      icon: 'G',
      description: 'Sync to GitHub repository wiki',
      fields: [
        { key: 'token', label: 'GitHub Token', type: 'password', required: true },
        { key: 'owner', label: 'Repository Owner', type: 'text', required: true },
        { key: 'repo', label: 'Repository Name', type: 'text', required: true },
      ],
    },
    {
      id: 'readme',
      name: 'README Generator',
      icon: 'R',
      description: 'Generate and update README.md files',
      fields: [
        { key: 'token', label: 'GitHub Token', type: 'password', required: true },
        { key: 'owner', label: 'Repository Owner', type: 'text', required: true },
        { key: 'repo', label: 'Repository Name', type: 'text', required: true },
      ],
    },
    {
      id: 'slack',
      name: 'Slack',
      icon: 'S',
      description: 'Send notifications to Slack',
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

    setIsExporting(true)
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
    } finally {
      setIsExporting(false)
    }
  }

  const selectedIntegrationData = integrations.find((i) => i.id === selectedIntegration)

  return (
    <div
      ref={scopeRef}
      className="integrations-page mx-auto flex w-full max-w-[1000px] flex-1 min-h-0 flex-col gap-5 p-6"
    >
      <header data-boot style={{ opacity: 0 }}>
        <h1 className="font-display text-3xl tracking-tight text-ink-100">Integrations</h1>
        <p className="mt-1 font-sans text-sm text-ink-400">
          Export and sync your documentation across platforms
        </p>
      </header>

      {/* integration cards */}
      <div data-boot style={{ opacity: 0 }} className="grid gap-4 sm:grid-cols-2">
        {integrations.map((integration) => (
          <Panel key={integration.id} active={selectedIntegration === integration.id}>
            <div
              className="flex h-full cursor-pointer flex-col gap-2 p-4"
              onClick={() => setSelectedIntegration(integration.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <span aria-hidden className="font-mono text-[13px] text-phosphor-300">
                  [{integration.icon}]
                </span>
                {integration.comingSoon ? (
                  <Badge>soon</Badge>
                ) : (
                  <Badge tone="phosphor">ready</Badge>
                )}
              </div>
              <h3 className="font-mono text-[14px] font-semibold text-ink-100">
                {integration.name}
              </h3>
              <p className="font-sans text-[13px] text-ink-400">{integration.description}</p>
            </div>
          </Panel>
        ))}
      </div>

      {/* configuration panel */}
      <div data-boot style={{ opacity: 0 }} className="flex min-h-0 flex-col pb-2">
        {selectedIntegrationData ? (
          selectedIntegrationData.comingSoon ? (
            <Panel title={selectedIntegrationData.name.toUpperCase()}>
              <EmptyState
                title="coming soon"
                hint={`${selectedIntegrationData.name} isn't wired up yet — check back soon.`}
                className="py-14"
              />
            </Panel>
          ) : (
            <Panel
              title={selectedIntegrationData.name.toUpperCase()}
              active
              contentClassName="gap-6 p-6"
            >
              <div className="flex flex-col gap-3">
                <h3 className="font-display text-[12px] tracking-[0.14em] text-ink-300 uppercase">
                  Documentation details
                </h3>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="title" className="font-mono text-[12px] text-ink-300">
                    title
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="My Documentation"
                    className={INPUT_CLASSES}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="documentation" className="font-mono text-[12px] text-ink-300">
                    documentation (markdown)
                  </label>
                  <textarea
                    id="documentation"
                    value={documentation}
                    onChange={(e) => setDocumentation(e.target.value)}
                    placeholder="# My Project&#10;&#10;This is the documentation..."
                    className={`${INPUT_CLASSES} resize-y leading-relaxed`}
                    rows={10}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="font-display text-[12px] tracking-[0.14em] text-ink-300 uppercase">
                  Integration settings
                </h3>
                {selectedIntegrationData.fields.map((field) => (
                  <div key={field.key} className="flex flex-col gap-1.5">
                    <label htmlFor={field.key} className="font-mono text-[12px] text-ink-300">
                      {field.label.toLowerCase()}
                      {field.required && (
                        <span aria-hidden className="ml-1 text-amber">
                          *
                        </span>
                      )}
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
                      className={INPUT_CLASSES}
                    />
                  </div>
                ))}
              </div>

              <Button
                onClick={() => handleExport(selectedIntegration!)}
                loading={isExporting}
                className="self-start"
              >
                export to {selectedIntegrationData.name.toLowerCase()}
              </Button>

              <div className="flex flex-col gap-2 border-t border-ink-700 pt-5">
                <h4 className="font-display text-[12px] tracking-[0.14em] text-ink-300 uppercase">
                  How to get credentials
                </h4>
                {selectedIntegration === 'notion' && (
                  <ul className="flex list-disc flex-col gap-1 pl-5 font-sans text-[13px] text-ink-400 marker:text-ink-600">
                    <li>Go to <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-phosphor-300 transition-colors hover:text-phosphor-200">My Integrations</a></li>
                    <li>Create a new integration and copy the token</li>
                    <li>Share your database or page with the integration</li>
                  </ul>
                )}
                {selectedIntegration === 'confluence' && (
                  <ul className="flex list-disc flex-col gap-1 pl-5 font-sans text-[13px] text-ink-400 marker:text-ink-600">
                    <li>Go to <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="text-phosphor-300 transition-colors hover:text-phosphor-200">API Tokens</a></li>
                    <li>Create an API token</li>
                    <li>Find your space key in the space settings</li>
                  </ul>
                )}
                {(selectedIntegration === 'github-wiki' || selectedIntegration === 'readme') && (
                  <ul className="flex list-disc flex-col gap-1 pl-5 font-sans text-[13px] text-ink-400 marker:text-ink-600">
                    <li>Go to <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-phosphor-300 transition-colors hover:text-phosphor-200">Personal Access Tokens</a></li>
                    <li>Generate a token with <code className="font-mono text-[12.5px] text-phosphor-300">repo</code> scope</li>
                  </ul>
                )}
                {selectedIntegration === 'slack' && (
                  <ul className="flex list-disc flex-col gap-1 pl-5 font-sans text-[13px] text-ink-400 marker:text-ink-600">
                    <li>Go to <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer" className="text-phosphor-300 transition-colors hover:text-phosphor-200">Incoming Webhooks</a></li>
                    <li>Create a webhook for your workspace</li>
                    <li>Copy the webhook URL</li>
                  </ul>
                )}
              </div>
            </Panel>
          )
        ) : (
          <Panel title="CONFIG">
            <EmptyState
              title="select an integration"
              hint="Choose an integration from the cards above to get started."
              className="py-14"
            />
          </Panel>
        )}
      </div>
    </div>
  )
}

export default Integrations
