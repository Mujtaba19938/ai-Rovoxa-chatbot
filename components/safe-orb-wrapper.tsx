"use client"

import React from "react"
import { HourglassIcon } from "./hourglass-icon"

interface SafeOrbWrapperProps {
  orbSize?: number
  animationState?: "idle" | "thinking" | "speaking" | "error"
  colors?: [string, string, string]
  className?: string
}

export const SafeOrbWrapper: React.FC<SafeOrbWrapperProps> = ({
  orbSize = 2,
  animationState = "idle",
  colors,
  className = "w-full h-full"
}) => {
  // Use hourglass icon instead of orb
  return (
    <HourglassIcon 
      size={orbSize} 
      animationState={animationState} 
      className={className}
    />
  )
}
