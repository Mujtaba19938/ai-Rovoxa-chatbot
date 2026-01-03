"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { getApiUrl, API_BASE_URL } from "@/lib/api"

interface User {
  _id: string
  email: string
  name: string
  avatar?: string
  preferences: {
    theme: 'dark' | 'light' | 'system'
    orbTheme: 'default' | 'aurora' | 'nebula' | 'monochrome'
    aiPersonality: 'friendly' | 'formal' | 'sarcastic' | 'concise'
  }
  lastLogin: string
  createdAt: string
  updatedAt: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
  updateUser: (userData: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user && !!token

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem("authToken")
        const storedUser = localStorage.getItem("user")
        const storedRefreshToken = localStorage.getItem("refreshToken")

        if (storedToken && storedUser) {
          // Verify token is still valid
          const response = await fetch(getApiUrl("/api/auth/me"), {
            headers: {
              Authorization: `Bearer ${storedToken}`,
            },
          })

          if (response.ok) {
            const data = await response.json()
            setUser(data.user)
            setToken(storedToken)
          } else {
            // Token is invalid, try to refresh
            if (storedRefreshToken) {
              await refreshTokenFromStorage(storedRefreshToken)
            } else {
              clearAuth()
            }
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error)
        clearAuth()
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const refreshTokenFromStorage = async (refreshToken: string) => {
    try {
      const response = await fetch(getApiUrl("/api/auth/refresh"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setToken(data.token)
        localStorage.setItem("authToken", data.token)
        localStorage.setItem("refreshToken", data.refreshToken)
        localStorage.setItem("user", JSON.stringify(data.user))
      } else {
        clearAuth()
      }
    } catch (error) {
      console.error("Token refresh error:", error)
      clearAuth()
    }
  }

  const clearAuth = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem("authToken")
    localStorage.removeItem("refreshToken")
    localStorage.removeItem("user")
  }

  const login = async (email: string, password: string) => {
    const apiUrl = getApiUrl("/api/auth/login");
    
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      // Check if response is JSON before parsing
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("❌ Non-JSON response received:", text.substring(0, 200));
        throw new Error(`Server returned HTML instead of JSON. Check if backend is running at ${apiUrl}`);
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Login failed")
      }

      setUser(data.user)
      setToken(data.token)
      localStorage.setItem("authToken", data.token)
      localStorage.setItem("refreshToken", data.refreshToken)
      localStorage.setItem("user", JSON.stringify(data.user))
    } catch (error) {
      // Handle network errors specifically
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        const baseUrl = API_BASE_URL || "http://localhost:5000";
        throw new Error(`Cannot connect to backend server. Please ensure the server is running at ${baseUrl}. Check your .env file for NEXT_PUBLIC_API_URL.`);
      }
      // Re-throw other errors
      throw error;
    }
  }

  const register = async (email: string, password: string, name: string) => {
    const apiUrl = getApiUrl("/api/auth/register");
    
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, name }),
      })

      // Check if response is JSON before parsing
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("❌ Non-JSON response received:", text.substring(0, 200));
        throw new Error(`Server returned HTML instead of JSON. Check if backend is running at ${apiUrl}`);
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Registration failed")
      }

      setUser(data.user)
      setToken(data.token)
      localStorage.setItem("authToken", data.token)
      localStorage.setItem("refreshToken", data.refreshToken)
      localStorage.setItem("user", JSON.stringify(data.user))
    } catch (error) {
      // Handle network errors specifically
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        const baseUrl = API_BASE_URL || "http://localhost:5000";
        throw new Error(`Cannot connect to backend server. Please ensure the server is running at ${baseUrl}. Check your .env file for NEXT_PUBLIC_API_URL.`);
      }
      // Re-throw other errors
      throw error;
    }
  }

  const logout = () => {
    clearAuth()
  }

  const refreshToken = async () => {
    const storedRefreshToken = localStorage.getItem("refreshToken")
    if (storedRefreshToken) {
      await refreshTokenFromStorage(storedRefreshToken)
    } else {
      clearAuth()
    }
  }

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData }
      setUser(updatedUser)
      localStorage.setItem("user", JSON.stringify(updatedUser))
    }
  }

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshToken,
    updateUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
