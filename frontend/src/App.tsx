import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { BatchProvider } from './contexts/BatchContext'
import BatchProgressModal from './components/BatchProgressModal'
import Landing from './pages/Landing'
import Home from './pages/Home'
import Settings from './pages/Settings'
import History from './pages/History'
import Batch from './pages/Batch'
import Integrations from './pages/Integrations'
import GitHub from './pages/GitHub'
import Logo from './components/Logo'
import MobileGate from './components/MobileGate'
import { useIsMobile } from './hooks/useIsMobile'
import config from './config'
import './App.css'

function Navigation() {
  const location = useLocation()
  const { user, isAuthenticated, logout } = useAuth()
  const isMobile = useIsMobile()

  const handleLogin = () => {
    // Clear any existing GitHub auth data before starting new OAuth flow
    localStorage.removeItem('github_user')
    localStorage.removeItem('github_token')
    localStorage.removeItem('github_user_id')
    localStorage.removeItem('github_username')
    localStorage.removeItem('github_avatar')

    // Redirect to GitHub OAuth
    window.location.href = `${config.apiUrl}/api/auth/github`
  }

  // Don't show navigation on landing page or mobile
  if (location.pathname === '/' || isMobile) {
    return null
  }

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-title">
          <Logo size="medium" showText={true} />
          <p className="subtitle">Transform Your Code into Beautiful Documentation</p>
        </div>
        <nav className="nav-links">
          <Link
            to="/app"
            className={`nav-link ${location.pathname === '/app' ? 'active' : ''}`}
          >
            /home
          </Link>
          <Link
            to="/app/batch"
            className={`nav-link ${location.pathname === '/app/batch' ? 'active' : ''}`}
          >
            /batch
          </Link>
          <Link
            to="/app/integrations"
            className={`nav-link ${location.pathname === '/app/integrations' ? 'active' : ''}`}
          >
            /integrations
          </Link>
          <Link
            to="/app/history"
            className={`nav-link ${location.pathname === '/app/history' ? 'active' : ''}`}
          >
            /history
          </Link>
          <Link
            to="/app/github"
            className={`nav-link ${location.pathname === '/app/github' ? 'active' : ''}`}
          >
            /github
          </Link>
          <Link
            to="/app/settings"
            className={`nav-link ${location.pathname === '/app/settings' ? 'active' : ''}`}
          >
            /settings
          </Link>
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

function AppRoutes() {
  const isMobile = useIsMobile()

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      {isMobile ? (
        <Route path="/app/*" element={<MobileGate />} />
      ) : (
        <>
          <Route path="/app" element={<Home />} />
          <Route path="/app/batch" element={<Batch />} />
          <Route path="/app/integrations" element={<Integrations />} />
          <Route path="/app/history" element={<History />} />
          <Route path="/app/github" element={<GitHub />} />
          <Route path="/app/settings" element={<Settings />} />
        </>
      )}
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BatchProvider>
          <div className="app">
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: '#111113',
                  color: '#fafafa',
                  border: '1px solid #27272a',
                },
                success: {
                  iconTheme: {
                    primary: '#22c55e',
                    secondary: '#111113',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#111113',
                  },
                },
              }}
            />

            <Navigation />

            <main className="app-main">
              <AppRoutes />
            </main>

            <BatchProgressModal />
          </div>
        </BatchProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
