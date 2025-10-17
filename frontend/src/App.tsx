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
import config from './config'
import './App.css'

function Navigation() {
  const location = useLocation()
  const { user, isAuthenticated, logout } = useAuth()

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

  // Don't show navigation on landing page
  if (location.pathname === '/') {
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Home
          </Link>
          <Link
            to="/app/batch"
            className={`nav-link ${location.pathname === '/app/batch' ? 'active' : ''}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Batch
          </Link>
          <Link
            to="/app/integrations"
            className={`nav-link ${location.pathname === '/app/integrations' ? 'active' : ''}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Integrations
          </Link>
          <Link
            to="/app/history"
            className={`nav-link ${location.pathname === '/app/history' ? 'active' : ''}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            My Documentation
          </Link>
          <Link
            to="/app/github"
            className={`nav-link ${location.pathname === '/app/github' ? 'active' : ''}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </Link>
          <Link
            to="/app/settings"
            className={`nav-link ${location.pathname === '/app/settings' ? 'active' : ''}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Settings
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Login with GitHub
          </button>
        )}
      </div>
    </header>
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
                  background: '#1e293b',
                  color: '#e2e8f0',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                },
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#1e293b',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#1e293b',
                  },
                },
              }}
            />

            <Navigation />

            <main className="app-main">
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/app" element={<Home />} />
                <Route path="/app/batch" element={<Batch />} />
                <Route path="/app/integrations" element={<Integrations />} />
                <Route path="/app/history" element={<History />} />
                <Route path="/app/github" element={<GitHub />} />
                <Route path="/app/settings" element={<Settings />} />
              </Routes>
            </main>

            <BatchProgressModal />
          </div>
        </BatchProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
