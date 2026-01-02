"use client"

import React, { ReactNode, useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { AuthForm } from "./auth-form"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2 } from "lucide-react"
import SplashScreen from "@/components/splash-screen"
import ChatUI from "@/components/chat-ui-with-history"

interface AuthGuardProps {
  children: ReactNode
  fallback?: ReactNode
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, fallback }) => {
  const { isAuthenticated, isLoading } = useAuth()
  const [showSplash, setShowSplash] = useState(false)
  const [hasShownSplash, setHasShownSplash] = useState(false)

  const handleEnterChat = () => {
    setShowSplash(false)
  }

  // Show splash screen when user becomes authenticated (only once)
  useEffect(() => {
    if (isAuthenticated && !isLoading && !hasShownSplash) {
      setShowSplash(true)
      setHasShownSplash(true)
      
      // Auto-hide splash screen after 3 seconds if user doesn't interact
      const timer = setTimeout(() => {
        setShowSplash(false)
      }, 3000)
      
      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, isLoading, hasShownSplash])

  if (isLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg-primary)" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center space-y-4"
        >
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--accent-green)" }} />
          <p className="rovoxa-text-secondary">Loading...</p>
        </motion.div>
      </div>
    )
  }

  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <AuthForm
        onError={(error) => {
          // Only log unexpected errors, not user-friendly messages
          if (!error.includes("already exists") && !error.includes("Invalid email or password")) {
            console.error("Authentication error:", error)
          }
        }}
      />
    )
  }

  // Show splash screen first, then chat interface
  return (
    <AnimatePresence mode="wait">
      {showSplash ? (
        <SplashScreen key="splash" onEnterChat={handleEnterChat} />
      ) : (
        <ChatUI key="chatui" />
      )}
    </AnimatePresence>
  )
}
