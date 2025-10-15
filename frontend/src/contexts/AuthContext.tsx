import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios from 'axios'

interface GitHubUser {
  id: number
  login: string
  name: string
  email: string
  avatar_url: string
  html_url: string
}

interface AuthContextType {
  user: GitHubUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: () => void
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<GitHubUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const checkAuth = async () => {
    try {
      // First check localStorage for GitHub OAuth token
      const storedUser = localStorage.getItem('github_user')
      const storedToken = localStorage.getItem('github_token')

      if (storedUser && storedToken) {
        // We have a GitHub token, use it
        setUser(JSON.parse(storedUser))
        setIsLoading(false)
        return
      }

      // Fallback: check session-based auth from backend
      // Note: This will fail for localStorage-based auth, which is expected
      try {
        const response = await axios.get('/api/auth/user', {
          withCredentials: true,
          // Don't trigger error interceptors for this expected failure
          validateStatus: (status) => status < 500, // Accept any status < 500
        })

        if (response.status === 200 && response.data.authenticated && response.data.user) {
          setUser(response.data.user)
          localStorage.setItem('github_user', JSON.stringify(response.data.user))
        }
      } catch (sessionError) {
        // Session auth failed - this is normal for localStorage-based auth
        // Just log it and continue
        console.log('[AuthContext] Session-based auth not available (expected for localStorage auth)')
      }
    } catch (error) {
      // Not authenticated via either method
      setUser(null)
      localStorage.removeItem('github_user')
      localStorage.removeItem('github_token')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  const login = () => {
    // Redirect to GitHub OAuth
    window.location.href = '/api/auth/github'
  }

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout', {}, {
        withCredentials: true,
      })
      setUser(null)
      // Clear all GitHub-related localStorage items
      localStorage.removeItem('github_user')
      localStorage.removeItem('github_token')
      localStorage.removeItem('github_user_id')
      localStorage.removeItem('github_username')
      localStorage.removeItem('github_avatar')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
