import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { showErrorToast, showSuccessToast, showLoadingToast, dismissToast } from '../utils/errorHandler'
import config from '../config'
import { useGSAP, bootSequence } from '../lib/motion'
import Panel from '../components/ui/Panel'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import SectionHeader from '../components/ui/SectionHeader'

type ClaudeModel = 'claude-sonnet-4-20250514' | 'claude-haiku-4-5-20251001' | 'claude-3-5-haiku-20241022'

interface WebhookStatus {
  lastTrigger: string | null
  totalReceived: number
  totalProcessed: number
  lastError: string | null
  recentEvents: Array<{
    timestamp: string
    event: string
    prNumber?: number
    repository?: string
    status: 'received' | 'processed' | 'error'
  }>
}

interface ModelOption {
  value: ClaudeModel
  name: string
  badges: Array<{ label: string; tone: 'neutral' | 'phosphor' | 'amber' }>
  description: string
  specs: string[]
}

const MODEL_OPTIONS: ModelOption[] = [
  {
    value: 'claude-haiku-4-5-20251001',
    name: 'Claude Haiku 4.5',
    badges: [
      { label: 'new', tone: 'neutral' },
      { label: 'recommended', tone: 'phosphor' },
    ],
    description: 'Sonnet-4-level coding performance at one-third the cost and twice the speed',
    specs: ['2x faster than Sonnet', '1/3 the cost', 'Frontier performance'],
  },
  {
    value: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4.5',
    badges: [{ label: 'advanced', tone: 'amber' }],
    description: 'Maximum intelligence for the most complex codebases',
    specs: ['Highest intelligence', 'Complex analysis', 'Higher cost'],
  },
  {
    value: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    badges: [{ label: 'legacy', tone: 'neutral' }],
    description: 'Previous generation model for basic documentation tasks',
    specs: ['Fast response', 'Low cost', 'Good quality'],
  },
]

const EVENT_DOT: Record<'received' | 'processed' | 'error', string> = {
  received: 'text-amber',
  processed: 'text-green',
  error: 'text-red',
}

const EVENT_VERB: Record<'received' | 'processed' | 'error', string> = {
  received: 'received',
  processed: 'delivered',
  error: 'failed',
}

function Settings() {
  const [claudeModel, setClaudeModel] = useState<ClaudeModel>('claude-haiku-4-5-20251001')
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const webhookUrl = `${config.apiUrl}/api/webhook/github`
  const scopeRef = useRef<HTMLDivElement>(null)

  // page boot-in
  useGSAP(
    () => {
      if (scopeRef.current) bootSequence(scopeRef.current)
    },
    { scope: scopeRef }
  )

  // Load settings from the backend on mount
  useEffect(() => {
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

    // Fetch webhook status
    const fetchWebhookStatus = async () => {
      try {
        const response = await axios.get('/api/webhook/status')
        setWebhookStatus(response.data)
      } catch (error) {
        console.error('Error fetching webhook status:', error)
      }
    }

    fetchModelPreference()
    fetchWebhookStatus()

    // Refresh webhook status every 10 seconds
    const interval = setInterval(fetchWebhookStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleSaveSettings = async () => {
    setIsSaving(true)
    const loadingToastId = showLoadingToast('Saving settings...')

    try {
      // Save model preference to backend (requires login)
      await axios.post('/api/settings/model', { model: claudeModel })

      dismissToast(loadingToastId)
      showSuccessToast('Settings saved successfully!')
    } catch (error) {
      dismissToast(loadingToastId)
      showErrorToast(error)
    } finally {
      setIsSaving(false)
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

  return (
    <div
      ref={scopeRef}
      className="settings-page mx-auto flex w-full max-w-[900px] flex-1 min-h-0 flex-col gap-6 p-6"
    >
      <header data-boot style={{ opacity: 0 }}>
        <h1 className="font-display text-3xl tracking-tight text-ink-100">Settings</h1>
        <p className="mt-1 font-sans text-sm text-ink-400">
          Configure your AI provider and integration settings
        </p>
      </header>

      {/* model selection */}
      <section data-boot style={{ opacity: 0 }} className="flex flex-col gap-4">
        <SectionHeader title="claude model" />
        <p className="font-sans text-sm text-ink-400">
          Choose which Claude model to use for documentation generation
        </p>

        <div className="flex flex-col gap-3">
          {MODEL_OPTIONS.map((option) => {
            const checked = claudeModel === option.value
            return (
              <label key={option.value} className="block cursor-pointer">
                <input
                  type="radio"
                  name="claudeModel"
                  value={option.value}
                  checked={checked}
                  onChange={(e) => setClaudeModel(e.target.value as ClaudeModel)}
                  className="sr-only"
                />
                <Panel active={checked}>
                  <div className="flex gap-3 p-4">
                    <span
                      aria-hidden
                      className={`shrink-0 font-mono text-[13px] leading-6 ${
                        checked ? 'text-phosphor-400' : 'text-ink-400'
                      }`}
                    >
                      {checked ? '[■]' : '[ ]'}
                    </span>
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-[14px] font-semibold text-ink-100">
                          {option.name}
                        </span>
                        {option.badges.map((badge) => (
                          <Badge key={badge.label} tone={badge.tone}>
                            {badge.label}
                          </Badge>
                        ))}
                      </div>
                      <p className="font-sans text-[13px] text-ink-300">{option.description}</p>
                      <span className="font-mono text-[11px] text-ink-400">
                        {option.specs.join(' · ')}
                      </span>
                    </div>
                  </div>
                </Panel>
              </label>
            )
          })}
        </div>
      </section>

      {/* webhook */}
      <section data-boot style={{ opacity: 0 }} className="flex flex-col gap-4 pt-2">
        <Panel title="GITHUB WEBHOOK" contentClassName="gap-5 p-6">
          <p className="font-sans text-sm text-ink-400">
            Use this URL to set up GitHub webhooks for automatic documentation
          </p>

          <div className="flex items-center gap-2.5 border border-ink-700 bg-ink-950/60 py-2 pr-2 pl-3.5">
            <span aria-hidden className="font-mono text-[13px] text-phosphor-400">
              $
            </span>
            <code className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-ink-100">
              {webhookUrl}
            </code>
            <Button size="sm" variant="ghost" onClick={handleCopyWebhookUrl}>
              copy
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="font-display text-[12px] tracking-[0.14em] text-ink-300 uppercase">
              Setup instructions
            </h3>
            <ol className="flex list-decimal flex-col gap-1 pl-5 font-mono text-[12.5px] text-ink-300 marker:text-ink-400">
              <li>Go to your GitHub repository settings</li>
              <li>Navigate to Webhooks → Add webhook</li>
              <li>Paste the URL above in "Payload URL"</li>
              <li>Select "application/json" as content type</li>
              <li>Choose "Pull requests" events</li>
              <li>Save the webhook</li>
            </ol>
          </div>

          {webhookStatus && (
            <div className="flex flex-col gap-2.5 border-t border-ink-700 pt-4">
              <h3 className="font-display text-[12px] tracking-[0.14em] text-ink-300 uppercase">
                Webhook status
              </h3>
              <div className="flex flex-col gap-1 font-mono text-[12px] text-ink-300">
                <div>
                  <span className="text-ink-400">last trigger: </span>
                  {webhookStatus.lastTrigger
                    ? new Date(webhookStatus.lastTrigger).toLocaleString()
                    : 'never'}
                </div>
                <div>
                  <span className="text-ink-400">total received: </span>
                  {webhookStatus.totalReceived}
                  <span className="text-ink-400"> · total processed: </span>
                  {webhookStatus.totalProcessed}
                </div>
                {webhookStatus.lastError && (
                  <div className="text-red">
                    <span className="text-red/60">last error: </span>
                    {webhookStatus.lastError}
                  </div>
                )}
              </div>

              {webhookStatus.recentEvents.length > 0 && (
                <div className="flex flex-col gap-1 border border-ink-700 bg-ink-950/60 p-3">
                  {webhookStatus.recentEvents.map((event, index) => (
                    <div
                      key={index}
                      className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 font-mono text-[12px] text-ink-300"
                    >
                      <span aria-hidden className={EVENT_DOT[event.status]}>
                        ●
                      </span>
                      <span className="font-mono text-[11px] text-ink-400">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                      <span>{EVENT_VERB[event.status]}</span>
                      <span className="text-ink-400">{event.event}</span>
                      {event.prNumber && <span>PR #{event.prNumber}</span>}
                      {event.repository && <span className="text-ink-400">{event.repository}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Panel>
      </section>

      {/* actions */}
      <div data-boot style={{ opacity: 0 }} className="flex pb-2">
        <Button onClick={handleSaveSettings} loading={isSaving}>
          save settings
        </Button>
      </div>
    </div>
  )
}

export default Settings
