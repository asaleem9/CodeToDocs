/**
 * Application configuration
 * Uses environment variables with fallbacks for development
 */

// @ts-ignore - window.ENV is injected at runtime
const runtimeApiUrl = typeof window !== 'undefined' && window.ENV?.VITE_API_URL

export const config = {
  apiUrl: runtimeApiUrl || import.meta.env.VITE_API_URL || 'http://localhost:3001',
} as const

export default config
