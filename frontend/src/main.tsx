import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App'
import config from './config'
import '@fontsource-variable/jetbrains-mono'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource-variable/newsreader'
import '@fontsource-variable/newsreader/wght-italic.css'
import './index.css'
import './styles/markdown.css'

// Capture the signed app token from the OAuth redirect fragment (fragments are
// not sent to servers or included in the Referer header). Store it and clean the
// URL so it isn't left lying around in history.
const tokenMatch = window.location.hash.match(/[#&]token=([^&]+)/)
if (tokenMatch) {
  localStorage.setItem('app_token', decodeURIComponent(tokenMatch[1]))
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
}

// Configure axios base URL
axios.defaults.baseURL = config.apiUrl

// Also send the session cookie (used for anonymous same-origin/local dev).
axios.defaults.withCredentials = true

// Attach the signed app token to our own backend requests. It's verified
// server-side, so it cannot be forged like the old identity header. We only add
// it for our backend, never for third-party calls (e.g. api.github.com).
axios.interceptors.request.use((requestConfig) => {
  const url = requestConfig.url || ''
  const isBackendRequest = url.startsWith('/api') || url.startsWith(config.apiUrl)
  if (isBackendRequest) {
    const token = localStorage.getItem('app_token')
    if (token) {
      requestConfig.headers = requestConfig.headers ?? {}
      requestConfig.headers['Authorization'] = `Bearer ${token}`
    }
  }
  return requestConfig
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
