import { Link, Outlet, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import BatchProgressModal from './BatchProgressModal'
import Logo from './Logo'
import ScreenFX from './ScreenFX'
import StatusBar from './StatusBar'
import config from '../config'
import { buttonClasses } from './ui/Button'

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

    // Redirect to GitHub OAuth
    window.location.href = `${config.apiUrl}/api/auth/github`
  }

  return (
    <header className="border-b border-ink-700 bg-ink-900">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-6 py-3.5">
        <Logo size="medium" showText={true} />
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`border-b-2 px-3 py-1.5 font-mono text-[13px] transition-colors ${
                  active
                    ? 'border-phosphor-400 bg-phosphor-400/5 text-phosphor-300 glow-text'
                    : 'border-transparent text-ink-300 hover:bg-phosphor-400/5 hover:text-ink-100'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2 border border-ink-700 bg-ink-850 p-1.5">
            <img
              src={user.avatar_url}
              alt={user.name}
              className="h-8 w-8 rounded-full border border-ink-600"
            />
            <button
              onClick={logout}
              title="Log out"
              className="cursor-pointer border border-red/20 bg-red/10 p-1.5 text-red transition-colors hover:border-red/50 hover:bg-red/15"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9" />
              </svg>
            </button>
          </div>
        ) : (
          <button onClick={handleLogin} className={buttonClasses('primary', 'sm')}>
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

      <main className="relative z-10 flex w-full flex-1 min-h-0 flex-col">
        <Outlet />
      </main>

      <StatusBar />
      <BatchProgressModal />
      <ScreenFX />
    </div>
  )
}

export default AppLayout
