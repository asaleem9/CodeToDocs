import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Landing from './pages/Landing'
import Home from './pages/Home'
import Settings from './pages/Settings'
import History from './pages/History'
import Batch from './pages/Batch'
import Integrations from './pages/Integrations'
import QA from './pages/QA'
import Logo from './components/Logo'
import './App.css'

function Navigation() {
  const location = useLocation()

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
            to="/app/qa"
            className={`nav-link ${location.pathname === '/app/qa' ? 'active' : ''}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Q&A
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
            History
          </Link>
          <Link
            to="/app/settings"
            className={`nav-link ${location.pathname === '/app/settings' ? 'active' : ''}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6m0 6v6m5.196-13.196l-4.242 4.242m0 5.656l-4.242 4.242M1 12h6m6 0h6m-13.196 5.196l4.242-4.242m5.656 0l4.242 4.242" />
            </svg>
            Settings
          </Link>
        </nav>
      </div>
    </header>
  )
}

function App() {
  return (
    <BrowserRouter>
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
            <Route path="/app/qa" element={<QA />} />
            <Route path="/app/integrations" element={<Integrations />} />
            <Route path="/app/history" element={<History />} />
            <Route path="/app/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
