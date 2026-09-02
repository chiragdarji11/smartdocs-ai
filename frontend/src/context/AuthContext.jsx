/**
 * Authentication Context
 * Manages user authentication state across the entire application.
 * Provides login, register, and logout functions to all components.
 */

import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api'

// Create the auth context
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  // On mount, check if user is already logged in
  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    const savedUsername = localStorage.getItem('username')
    if (savedToken && savedUsername) {
      setToken(savedToken)
      setUser({ username: savedUsername })
    }
    setLoading(false)
  }, [])

  // Register a new user
  const register = async (username, email, password) => {
    const response = await api.post('/register', { username, email, password })
    return response.data
  }

  // Login and save token
  const login = async (email, password) => {
    const response = await api.post('/login', { email, password })
    const { access_token, username } = response.data

    // Save to state and localStorage
    setToken(access_token)
    setUser({ username })
    localStorage.setItem('token', access_token)
    localStorage.setItem('username', username)

    return response.data
  }

  // Logout and clear everything
  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('username')
  }

  // Check if user is authenticated
  const isAuthenticated = !!token

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isAuthenticated,
      register,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook for easy access to auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
