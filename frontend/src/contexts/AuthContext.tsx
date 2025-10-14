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
      const response = await axios.get('/api/auth/user', {
        withCredentials: true,
      })

      if (response.data.authenticated && response.data.user) {
        setUser(response.data.user)
        localStorage.setItem('github_user', JSON.stringify(response.data.user))
      }
    } catch (error) {
      // Not authenticated
      setUser(null)
      localStorage.removeItem('github_user')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Check localStorage first for faster UI
    const storedUser = localStorage.getItem('github_user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (e) {
        localStorage.removeItem('github_user')
      }
    }

    // Then verify with backend
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
      localStorage.removeItem('github_user')
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
