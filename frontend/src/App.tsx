import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { BatchProvider } from './contexts/BatchContext'
import AppLayout from './components/AppLayout'
import Landing from './pages/Landing'
import Home from './pages/Home'
import Settings from './pages/Settings'
import History from './pages/History'
import Batch from './pages/Batch'
import Integrations from './pages/Integrations'
import GitHub from './pages/GitHub'
import MobileGate from './components/MobileGate'
import { useIsMobile } from './hooks/useIsMobile'
import './App.css'

function AppRoutes() {
  const isMobile = useIsMobile()

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      {isMobile ? (
        <Route path="/app/*" element={<MobileGate />} />
      ) : (
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="batch" element={<Batch />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="history" element={<History />} />
          <Route path="github" element={<GitHub />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      )}
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BatchProvider>
          <AppRoutes />
        </BatchProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
