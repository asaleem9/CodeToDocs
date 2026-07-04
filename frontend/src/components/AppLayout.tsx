import { Link, Outlet, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import BatchProgressModal from './BatchProgressModal'
import Logo from './Logo'
import ScreenFX from './ScreenFX'
import StatusBar from './StatusBar'
import config from '../config'

const NAV_ITEMS = [
  { to: '/app', label: '/home' },
  { to: '/app/batch', label: '/batch' },
  { to: '/app/integrations', label: '/integrations' },
  { to: '/app/history', label: '/history' },
  { to: '/app/github', label: '/github' },
  { to: '/app/settings', label: '/settings' },
]

function Header() {
  const location = useLocation()
  const { user, isAuthenticated, logout } = useAuth()

  const handleLogin = () => {
    // Clear any existing auth data before starting new OAuth flow
    localStorage.removeItem('app_token')
    localStorage.removeItem('github_user')
    localStorage.removeItem('github_token')
    localStorage.removeItem('github_user_id')
    localStorage.removeItem('github_username')
    localStorage.removeItem('github_avatar')

    // Redirect to GitHub OAuth
    window.location.href = `${config.apiUrl}/api/auth/github`
  }

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-title">
          <Logo size="medium" showText={true} />
        </div>
        <nav className="nav-links">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-link ${location.pathname === item.to ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {isAuthenticated && user ? (
          <div className="user-menu">
            <img src={user.avatar_url} alt={user.name} className="user-avatar-small" />
            <button className="logout-btn" onClick={logout}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9" />
              </svg>
            </button>
          </div>
        ) : (
          <button onClick={handleLogin} className="login-btn">
            Login with GitHub
          </button>
        )}
      </div>
    </header>
  )
}

// Layout route for everything under /app: terminal chrome (header + status
// bar + screen effects) around the routed page. Replaces the old pattern of
// styling loose page fragments via `.app-main > :not(.landing-page)`.
function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-ink-950">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0a100d',
            color: '#e2efe9',
            border: '1px solid #1d2822',
            borderRadius: '2px',
            fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', monospace",
            fontSize: '13px',
          },
          success: {
            iconTheme: { primary: '#2dd4bf', secondary: '#0a100d' },
          },
          error: {
            iconTheme: { primary: '#ff6b5e', secondary: '#0a100d' },
          },
        }}
      />

      <Header />

      <main className="app-main relative z-10">
        <Outlet />
      </main>

      <StatusBar />
      <BatchProgressModal />
      <ScreenFX />
    </div>
  )
}

export default AppLayout
