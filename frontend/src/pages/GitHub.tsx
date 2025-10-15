import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { showErrorToast, showSuccessToast } from '../utils/errorHandler'
import './GitHub.css'

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

function GitHub() {
  const [githubToken, setGithubToken] = useState<string>('')
  const [username, setUsername] = useState<string>('')
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  const [repositories, setRepositories] = useState<GitHubRepository[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showTokenInput, setShowTokenInput] = useState(true)
  const hasFetchedRepos = useRef(false)
  const isFetchingRepos = useRef(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, isAuthenticated } = useAuth()

  // Check for OAuth success callback and store token
  useEffect(() => {
    const authSuccess = searchParams.get('auth')
    const userParam = searchParams.get('user')
    const tokenParam = searchParams.get('token')

    if (authSuccess === 'success' && userParam && tokenParam) {
      try {
        console.log('[GitHub] OAuth success detected, storing token and user data')

        // Decode and parse user data
        const user = JSON.parse(decodeURIComponent(userParam))
        const token = decodeURIComponent(tokenParam)

        // Store in localStorage for persistent access
        localStorage.setItem('github_token', token)
        localStorage.setItem('github_username', user.login)
        localStorage.setItem('github_avatar', user.avatar_url)
        localStorage.setItem('github_user', JSON.stringify(user))
        localStorage.setItem('github_user_id', user.id.toString()) // Store numeric GitHub user ID

        showSuccessToast(`Successfully logged in as @${user.login}!`)

        // Update local state
        setGithubToken(token)
        setUsername(user.login)
        setAvatarUrl(user.avatar_url)
        setShowTokenInput(false)

        // Fetch repositories with the token
        fetchRepositories(token)

        // Note: No need to call checkAuth() - AuthContext will automatically
        // pick up the localStorage values on next render

        // Clean up URL
        navigate('/app/github', { replace: true })
      } catch (error) {
        console.error('[GitHub] Error processing OAuth callback:', error)
        showErrorToast({
          response: {
            data: { error: 'Failed to process OAuth response' }
          }
        })
      }
    }
  }, [searchParams, navigate])

  useEffect(() => {
    console.log('[GitHub] Auth state:', { isAuthenticated, user, hasFetchedRepos: hasFetchedRepos.current })

    // Check localStorage for token first
    const savedToken = localStorage.getItem('github_token')
    const savedUsername = localStorage.getItem('github_username')
    const savedAvatar = localStorage.getItem('github_avatar')

    console.log('[GitHub] Checking localStorage:', { hasToken: !!savedToken, username: savedUsername })

    // If we have a token in localStorage, use direct GitHub API
    if (savedToken && savedUsername) {
      setGithubToken(savedToken)
      setUsername(savedUsername)
      setAvatarUrl(savedAvatar || '')
      setShowTokenInput(false)
      // Only fetch if we haven't fetched before
      if (!hasFetchedRepos.current) {
        console.log('[GitHub] Fetching repos with localStorage token')
        fetchRepositories(savedToken)
        hasFetchedRepos.current = true
      }
      return
    }

    // Only try session-based auth if no localStorage token exists
    if (isAuthenticated && user && !savedToken && !hasFetchedRepos.current) {
      console.log('[GitHub] User is authenticated via OAuth, fetching repositories from session')
      // Fetch repositories using the OAuth token stored in the session
      fetchRepositoriesFromSession()
      setUsername(user.login)
      setAvatarUrl(user.avatar_url)
      setShowTokenInput(false)
      hasFetchedRepos.current = true
    }
  }, [isAuthenticated, user])

  const handleConnect = async () => {
    if (!githubToken.trim()) {
      showErrorToast({
        response: {
          data: { error: 'Please enter your GitHub Personal Access Token' }
        }
      })
      return
    }

    setIsLoading(true)
    try {
      // Verify token and get user info
      const response = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: 'application/json',
        },
      })

      const user = response.data
      setUsername(user.login)
      setAvatarUrl(user.avatar_url)
      setShowTokenInput(false)

      // Store in localStorage
      localStorage.setItem('github_token', githubToken)
      localStorage.setItem('github_username', user.login)
      localStorage.setItem('github_avatar', user.avatar_url)

      showSuccessToast(`Connected as @${user.login}`)

      // Fetch repositories
      fetchRepositories(githubToken)
    } catch (error: any) {
      showErrorToast({
        response: {
          data: { error: 'Invalid GitHub token. Please check and try again.' }
        }
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = () => {
    localStorage.removeItem('github_token')
    localStorage.removeItem('github_username')
    localStorage.removeItem('github_avatar')
    setGithubToken('')
    setUsername('')
    setAvatarUrl('')
    setShowTokenInput(true)
    setRepositories([])
    hasFetchedRepos.current = false
    showSuccessToast('Disconnected from GitHub')
  }

  const fetchRepositoriesFromSession = async () => {
    setIsLoading(true)
    try {
      // Use the backend endpoint that uses the session token
      const response = await axios.get('/api/auth/repositories', {
        withCredentials: true,
        params: {
          per_page: 100,
        },
      })
      setRepositories(response.data.repositories)
    } catch (error: any) {
      // Silently fail - this is expected for localStorage-based auth
      // The user is already authenticated via localStorage token
      console.log('[GitHub] Session-based auth failed (expected for localStorage auth)', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchRepositories = async (token: string) => {
    // Prevent concurrent fetches
    if (isFetchingRepos.current) {
      console.log('[GitHub] fetchRepositories already in progress, skipping...')
      return
    }

    console.log('[GitHub] fetchRepositories called with token:', token.substring(0, 10) + '...')
    isFetchingRepos.current = true
    setIsLoading(true)
    try {
      const response = await axios.get('https://api.github.com/user/repos', {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/json',
        },
        params: {
          per_page: 100,
          sort: 'updated',
          affiliation: 'owner,collaborator',
        },
      })
      console.log('[GitHub] Successfully fetched', response.data.length, 'repositories')
      setRepositories(response.data)
    } catch (error: any) {
      console.error('[GitHub] Error fetching repositories:', error)
      showErrorToast(error)
    } finally {
      setIsLoading(false)
      isFetchingRepos.current = false
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

  if (showTokenInput) {
    return (
      <div className="github-page">
        <div className="github-container">
          <div className="github-auth-card">
            <div className="auth-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </div>
            <h1>Connect to GitHub</h1>
            <p className="auth-description">
              Enter your GitHub Personal Access Token to access your repositories and generate documentation automatically.
            </p>

            <div className="token-input-section">
              <label htmlFor="github-token">GitHub Personal Access Token</label>
              <input
                id="github-token"
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="token-input"
                disabled={isLoading}
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              />
              <button
                className="github-connect-btn"
                onClick={handleConnect}
                disabled={isLoading || !githubToken.trim()}
              >
                {isLoading ? (
                  <>
                    <div className="spinner"></div>
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    Connect to GitHub
                  </>
                )}
              </button>
            </div>

            <div className="auth-help">
              <h3>How to get a Personal Access Token:</h3>
              <ol>
                <li>Go to <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer">GitHub Settings → Developer settings → Personal access tokens</a></li>
                <li>Click "Generate new token (classic)"</li>
                <li>Give it a name and select the <code>repo</code> scope</li>
                <li>Click "Generate token" and copy the token</li>
                <li>Paste it above and click "Connect to GitHub"</li>
              </ol>
            </div>

            <div className="auth-features">
              <h3>What you can do:</h3>
              <ul>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Access all your repositories
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Generate documentation automatically
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Select specific repositories to document
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="github-page">
      <div className="github-container">
        <header className="github-header">
          <div className="header-content">
            <div>
              <h1>Your GitHub Repositories</h1>
              <p className="github-subtitle">
                Select a repository to generate documentation
              </p>
            </div>
            <div className="header-actions">
              <div className="user-info-card">
                {avatarUrl && <img src={avatarUrl} alt={username} className="user-avatar" />}
                <div className="user-details">
                  <div className="user-name">{username}</div>
                  <div className="user-login">@{username}</div>
                </div>
              </div>
              <button className="disconnect-btn" onClick={handleDisconnect}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9" />
                </svg>
                Disconnect
              </button>
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="loading-state">
            <div className="spinner-large"></div>
            <p>Loading your repositories...</p>
          </div>
        ) : repositories.length === 0 ? (
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No repositories found</p>
            <span>Create a repository on GitHub to get started</span>
          </div>
        ) : (
          <div className="repositories-grid">
            {repositories.map((repo) => (
              <div key={repo.id} className="repo-card">
                <div className="repo-header">
                  <div className="repo-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="repo-name">
                      {repo.name}
                    </a>
                  </div>
                  {repo.private && (
                    <span className="private-badge">Private</span>
                  )}
                </div>

                <p className="repo-description">
                  {repo.description || 'No description provided'}
                </p>

                <div className="repo-meta">
                  {repo.language && (
                    <span className="repo-language">
                      <span className="language-dot" style={{ backgroundColor: getLanguageColor(repo.language) }}></span>
                      {repo.language}
                    </span>
                  )}
                  <span className="repo-stars">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                    </svg>
                    {repo.stargazers_count}
                  </span>
                  <span className="repo-updated">
                    Updated {formatDate(repo.updated_at)}
                  </span>
                </div>

                <button
                  className="document-btn"
                  onClick={() => handleDocumentRepo(repo.html_url)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="12" y1="18" x2="12" y2="12"></line>
                    <line x1="9" y1="15" x2="15" y2="15"></line>
                  </svg>
                  Generate Documentation
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function getLanguageColor(language: string): string {
  const colors: { [key: string]: string } = {
    JavaScript: '#f1e05a',
    TypeScript: '#2b7489',
    Python: '#3572A5',
    Java: '#b07219',
    Go: '#00ADD8',
    Rust: '#dea584',
    Ruby: '#701516',
    PHP: '#4F5D95',
    'C++': '#f34b7d',
    C: '#555555',
    'C#': '#178600',
    Swift: '#ffac45',
    Kotlin: '#F18E33',
    HTML: '#e34c26',
    CSS: '#563d7c',
  }
  return colors[language] || '#94a3b8'
}

export default GitHub
