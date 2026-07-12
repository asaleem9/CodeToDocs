/**
 * Application configuration
 * Uses environment variables with fallbacks for development
 */

// @ts-ignore - window.ENV is injected at runtime
const runtimeApiUrl = typeof window !== 'undefined' && window.ENV?.VITE_API_URL

// Get API URL with proper fallback chain
const apiUrl = runtimeApiUrl || import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Log configuration for debugging (dev only — silent in prod builds)
if (import.meta.env.DEV) {
  console.log('[Config] API URL Configuration:')
  console.log('  - Runtime (window.ENV):', runtimeApiUrl || 'not set')
  console.log('  - Build time (import.meta.env):', import.meta.env.VITE_API_URL || 'not set')
  console.log('  - Final API URL:', apiUrl)
  console.log('  - window.ENV object:', typeof window !== 'undefined' ? (window as any).ENV : 'N/A')
}

export const config = {
  apiUrl,
} as const

export default config
