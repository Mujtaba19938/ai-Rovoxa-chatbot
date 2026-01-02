"use client"

import { useState, useEffect } from "react"
import SplashScreen from "@/components/splash-screen"
import ChatUI from "@/components/chat-ui-with-history"
import { AuthProvider } from "@/contexts/auth-context"
import { AuthGuard } from "@/components/auth/auth-guard"
import { AnimatePresence } from "framer-motion"
import { Toaster } from "sonner"

export default function HomePage() {
  return (
    <AuthProvider>
      <AuthGuard />
      <Toaster position="top-right" />
    </AuthProvider>
  )
}
