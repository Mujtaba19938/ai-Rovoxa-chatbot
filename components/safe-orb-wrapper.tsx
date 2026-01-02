"use client"

import React from "react"
import { FallbackOrb } from "./fallback-orb"

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
  // Always use the fallback orb to avoid React Three Fiber issues
  return (
    <FallbackOrb 
      orbSize={orbSize} 
      animationState={animationState} 
      className={className}
    />
  )
}
