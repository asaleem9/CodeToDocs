import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios from 'axios'
import config from '../config'

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
    // Identity comes from the signed session cookie only. Ask the backend who we
    // are rather than trusting anything cached in localStorage.
    try {
      const response = await axios.get('/api/auth/user', {
        // A 401 here just means "not logged in" - handle it inline, don't throw.
        validateStatus: (status) => status < 500,
      })

      if (response.status === 200 && response.data.authenticated && response.data.user) {
        setUser(response.data.user)
        localStorage.setItem('github_user', JSON.stringify(response.data.user))
      } else {
        setUser(null)
        localStorage.removeItem('github_user')
      }
    } catch (error) {
      setUser(null)
      localStorage.removeItem('github_user')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  const login = () => {
    // Redirect to GitHub OAuth on the API origin (not the frontend origin).
    window.location.href = `${config.apiUrl}/api/auth/github`
  }

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout', {})
    } catch (error) {
      console.error('Error logging out:', error)
    } finally {
      setUser(null)
      // Clear the app token and any cached GitHub-related localStorage items
      localStorage.removeItem('app_token')
      localStorage.removeItem('github_user')
      localStorage.removeItem('github_token')
      localStorage.removeItem('github_user_id')
      localStorage.removeItem('github_username')
      localStorage.removeItem('github_avatar')
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
