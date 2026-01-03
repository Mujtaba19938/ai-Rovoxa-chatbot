"use client"

import React from "react"
import { motion } from "framer-motion"

interface HourglassIconProps {
  size?: number
  animationState?: "idle" | "thinking" | "speaking" | "error"
  className?: string
}

export const HourglassIcon: React.FC<HourglassIconProps> = ({
  size = 2,
  animationState = "idle",
  className = "w-full h-full"
}) => {
  const getAnimationProps = () => {
    switch (animationState) {
      case "thinking":
        return {
          animate: { 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
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
            scale: [1, 1.15, 1],
            rotate: [0, 3, -3, 0]
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
            rotate: [0, -10, 10, 0]
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
            opacity: [0.9, 1, 0.9]
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
        style={{
          width: `${size}rem`,
          height: `${size}rem`,
        }}
        {...getAnimationProps()}
      >
        <img 
          src="/hourglass-icon.png"
          alt="Hourglass"
          className="w-full h-full object-contain"
          style={{ imageRendering: 'crisp-edges' }}
        />
      </motion.div>
    </div>
  )
}

