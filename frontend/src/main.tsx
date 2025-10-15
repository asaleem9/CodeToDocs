import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App'
import config from './config'
import './index.css'

// Configure axios base URL
axios.defaults.baseURL = config.apiUrl

// Add request interceptor to include GitHub user ID in requests to our backend
axios.interceptors.request.use(
  (config) => {
    // Only add custom header for requests to our own backend, not external APIs
    const isBackendRequest = config.url?.startsWith('/api') || config.url?.startsWith('http://localhost:3001')

    if (isBackendRequest) {
      // Check if user is logged in via GitHub OAuth (localStorage token)
      const githubUserId = localStorage.getItem('github_user_id')
      if (githubUserId) {
        // Add custom header with GitHub user ID
        config.headers['X-GitHub-User-ID'] = githubUserId
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
