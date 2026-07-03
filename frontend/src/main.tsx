import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App'
import config from './config'
import './index.css'

// Configure axios base URL
axios.defaults.baseURL = config.apiUrl

// Send the session cookie with every request to our backend. Identity is derived
// server-side from that signed session, never from a client-supplied header.
axios.defaults.withCredentials = true

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
