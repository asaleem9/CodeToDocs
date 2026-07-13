import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { showErrorToast, showSuccessToast } from '../utils/errorHandler'
import { useGSAP, bootSequence } from '../lib/motion'
import { getLanguageColor } from '../lib/languages'
import Panel from '../components/ui/Panel'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'

interface GitHubRepository {
  id: number
  name: string
  full_name: string
  description: string
  html_url: string
  clone_url: string
  language: string
  stargazers_count: number
  updated_at: string
  private: boolean
}

const GITHUB_MARK = (
  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
)

const FEATURES = [
  'Access all your repositories',
  'Generate documentation automatically',
  'Select specific repositories to document',
]

function GitHub() {
  const [username, setUsername] = useState<string>('')
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  const [repositories, setRepositories] = useState<GitHubRepository[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showConnectPanel, setShowConnectPanel] = useState(true)
  const hasFetchedRepos = useRef(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, isAuthenticated, login, checkAuth } = useAuth()
  const scopeRef = useRef<HTMLDivElement>(null)

  // page boot-in; re-runs when the view flips between auth and repo grid
  useGSAP(
    () => {
      if (scopeRef.current) bootSequence(scopeRef.current)
    },
    { dependencies: [showConnectPanel], scope: scopeRef }
  )

  // Handle the OAuth redirect. Success carries the public profile in the URL
  // (the access token stays server-side); failure carries an error code.
  // Either way we clean the query params off the URL once we're done with them.
  useEffect(() => {
    const authSuccess = searchParams.get('auth')
    const authError = searchParams.get('error')
    const userParam = searchParams.get('user')

    if (authSuccess === 'success' && userParam) {
      try {
        console.log('[GitHub] OAuth success detected')

        const user = JSON.parse(decodeURIComponent(userParam))
        showSuccessToast(`Successfully logged in as @${user.login}!`)

        setUsername(user.login)
        setAvatarUrl(user.avatar_url)
        setShowConnectPanel(false)
        hasFetchedRepos.current = true

        checkAuth()
        fetchRepositoriesFromSession()
      } catch (error) {
        console.error('[GitHub] Error processing OAuth callback:', error)
        showErrorToast({
          response: {
            data: { error: 'Failed to process OAuth response' }
          }
        })
      }
      navigate('/app/github', { replace: true })
    } else if (authError) {
      console.error('[GitHub] OAuth error:', authError)
      showErrorToast({
        response: {
          data: { error: 'GitHub login failed. Please try again.' }
        }
      })
      navigate('/app/github', { replace: true })
    }
  }, [searchParams, navigate])

  useEffect(() => {
    console.log('[GitHub] Auth state:', { isAuthenticated, user, hasFetchedRepos: hasFetchedRepos.current })

    if (isAuthenticated && user && !hasFetchedRepos.current) {
      console.log('[GitHub] User is authenticated via OAuth, fetching repositories from session')
      fetchRepositoriesFromSession()
      setUsername(user.login)
      setAvatarUrl(user.avatar_url)
      setShowConnectPanel(false)
      hasFetchedRepos.current = true
    }
  }, [isAuthenticated, user])

  const handleDisconnect = () => {
    setUsername('')
    setAvatarUrl('')
    setShowConnectPanel(true)
    setRepositories([])
    hasFetchedRepos.current = false
    showSuccessToast('Disconnected from GitHub')
  }

  const fetchRepositoriesFromSession = async () => {
    setIsLoading(true)
    try {
      // Use the backend endpoint that reads the token from the session
      const response = await axios.get('/api/auth/repositories', {
        params: {
          per_page: 100,
        },
      })
      setRepositories(response.data.repositories)
    } catch (error: any) {
      console.error('[GitHub] Error fetching repositories from session:', error)
      showErrorToast(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDocumentRepo = (repoUrl: string) => {
    // Navigate to batch page with the repo URL pre-filled
    navigate('/app/batch', { state: { repoUrl } })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`
    return `${Math.floor(diffInDays / 365)} years ago`
  }

  if (showConnectPanel) {
    return (
      <div
        ref={scopeRef}
        className="github-page mx-auto flex w-full max-w-[1400px] flex-1 min-h-0 flex-col gap-5 p-6"
      >
        <div data-boot style={{ opacity: 0 }} className="py-8">
          <Panel
            title="GITHUB ACCESS"
            className="mx-auto w-full max-w-xl"
            contentClassName="gap-7 p-8"
          >
            <div className="flex flex-col items-center gap-3 text-center">
              <svg
                width="56"
                height="56"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-phosphor-300"
                aria-hidden
              >
                {GITHUB_MARK}
              </svg>
              <h1 className="font-display text-3xl tracking-tight text-ink-100">
                Connect to GitHub
              </h1>
              <p className="max-w-md font-sans text-sm text-ink-400">
                Log in with GitHub to access your repositories and generate documentation
                automatically.
              </p>
            </div>

            <Button onClick={login} className="w-full">
              login with github
            </Button>

            <div className="flex flex-col gap-2.5 border-t border-ink-700 pt-6">
              <h3 className="font-display text-[12px] tracking-[0.14em] text-ink-300 uppercase">
                What you can do
              </h3>
              <div className="flex flex-col gap-1.5">
                {FEATURES.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-baseline gap-2.5 font-mono text-[13px] text-ink-300"
                  >
                    <span aria-hidden className="text-green">
                      ✓
                    </span>
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={scopeRef}
      className="github-page mx-auto flex w-full max-w-[1400px] flex-1 min-h-0 flex-col gap-5 p-6"
    >
      <header
        data-boot
        style={{ opacity: 0 }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-3xl tracking-tight text-ink-100">
            Your GitHub Repositories
          </h1>
          <p className="mt-1 font-sans text-sm text-ink-400">
            Select a repository to generate documentation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 border border-ink-700 bg-ink-900 px-3 py-1.5">
            {avatarUrl && (
              <img
                src={avatarUrl}
                alt={username}
                className="h-8 w-8 rounded-[2px] border border-ink-700"
              />
            )}
            <div className="leading-tight">
              <div className="font-mono text-[13px] text-ink-100">{username}</div>
              <div className="font-mono text-[11px] text-ink-400">@{username}</div>
            </div>
          </div>
          <Button variant="danger" onClick={handleDisconnect}>
            disconnect
          </Button>
        </div>
      </header>

      <div data-boot style={{ opacity: 0 }} className="flex min-h-0 flex-1 flex-col">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center gap-3 font-mono text-[13px] text-ink-300">
            <Spinner className="text-phosphor-400" />
            loading your repositories…
          </div>
        ) : repositories.length === 0 ? (
          <EmptyState
            title="no repositories found"
            hint="Create a repository on GitHub to get started."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {repositories.map((repo) => (
              <Panel key={repo.id} contentClassName="gap-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 truncate font-mono text-[13.5px] font-medium text-ink-100 transition-colors hover:text-phosphor-300"
                  >
                    {repo.name}
                  </a>
                  {repo.private && <Badge tone="amber">private</Badge>}
                </div>

                <p className="line-clamp-2 font-sans text-[13px] text-ink-300">
                  {repo.description || 'No description provided'}
                </p>

                <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-ink-400">
                  {repo.language && (
                    <span className="flex items-center gap-1.5">
                      <span
                        aria-hidden
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: getLanguageColor(repo.language) }}
                      />
                      {repo.language}
                    </span>
                  )}
                  <span>★ {repo.stargazers_count}</span>
                  <span>updated {formatDate(repo.updated_at)}</span>
                </div>

                <Button onClick={() => handleDocumentRepo(repo.html_url)} className="w-full">
                  document
                </Button>
              </Panel>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default GitHub
