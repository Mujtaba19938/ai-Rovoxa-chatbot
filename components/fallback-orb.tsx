"use client"

import React from "react"
import { motion } from "framer-motion"

interface FallbackOrbProps {
  orbSize?: number
  animationState?: "idle" | "thinking" | "speaking" | "error"
  className?: string
}

export const FallbackOrb: React.FC<FallbackOrbProps> = ({
  orbSize = 2,
  animationState = "idle",
  className = "w-full h-full"
}) => {
  const getAnimationProps = () => {
    switch (animationState) {
      case "thinking":
        return {
          animate: { 
            scale: [1, 1.1, 1],
            opacity: [0.8, 1, 0.8]
          },
          transition: { 
            duration: 1.5, 
            repeat: Infinity,
            ease: "easeInOut"
          }
        }
      case "speaking":
        return {
          animate: { 
            scale: [1, 1.2, 1],
            opacity: [0.9, 1, 0.9]
          },
          transition: { 
            duration: 0.8, 
            repeat: Infinity,
            ease: "easeInOut"
          }
        }
      case "error":
        return {
          animate: { 
            scale: [1, 0.9, 1],
            opacity: [0.6, 0.8, 0.6]
          },
          transition: { 
            duration: 0.5, 
            repeat: Infinity,
            ease: "easeInOut"
          }
        }
      default: // idle
        return {
          animate: { 
            scale: [1, 1.05, 1],
            opacity: [0.8, 1, 0.8]
          },
          transition: { 
            duration: 3, 
            repeat: Infinity,
            ease: "easeInOut"
          }
        }
    }
  }

  return (
    <div className={`${className} flex items-center justify-center`}>
      <motion.div
        className="rounded-full bg-gradient-to-br from-sky-400 via-white to-indigo-400 shadow-lg"
        style={{
          width: `${orbSize}rem`,
          height: `${orbSize}rem`,
        }}
        {...getAnimationProps()}
      >
        <div className="w-full h-full rounded-full bg-gradient-to-br from-sky-500/20 via-white/20 to-indigo-500/20 backdrop-blur-sm" />
      </motion.div>
    </div>
  )
}
