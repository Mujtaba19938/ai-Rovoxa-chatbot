"use client"

import type React from "react"

import { motion } from "framer-motion"

interface SplashScreenProps {
  onEnterChat: () => void
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onEnterChat }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 rovoxa-bg-primary flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Centered Logo + App Name */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center justify-center z-20"
      >
        {/* Logo with glow effect */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
          className="rovoxa-logo-glow mb-6"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#c7f000] to-[#a8d000] flex items-center justify-center">
            <span className="text-3xl font-bold text-[#0b0f19]">R</span>
          </div>
        </motion.div>

        {/* App Name */}
        <motion.h1
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-4xl md:text-5xl font-bold rovoxa-text-primary tracking-tight"
        >
          Rovoxa
        </motion.h1>
      </motion.div>
    </motion.div>
  )
}

export default SplashScreen
