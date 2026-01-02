"use client"

import type React from "react"

import { motion } from "framer-motion"
import { Mic, X, Settings2, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import SimpleAnimatedOrb from "./simple-orb"

interface SplashScreenProps {
  onEnterChat: () => void
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onEnterChat }) => {
  const iconButtonVariants = {
    hover: { scale: 1.1, color: "#87CEEB" }, // Sky blue glow
    tap: { scale: 0.95 },
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.5 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      className="fixed inset-0 bg-neutral-950 flex flex-col items-center justify-center overflow-hidden"
    >
      {/* 3D Animated Orb Background */}
      <div className="absolute inset-0 z-0">
        <SimpleAnimatedOrb 
          orbSize={3} 
          animationState="idle" 
          variant="full"
          colors={['#87CEEB', '#FFFFFF', '#A8A2D2']}
        />
      </div>
      
      {/* Gradient overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-950/80 via-neutral-900/60 to-indigo-950/80 z-5"></div>

      {/* Top Left: Time/Status (Optional) */}
      {/* <div className="absolute top-6 left-6 text-neutral-400 text-sm">10:27 AM</div> */}

      {/* Top Right: Settings & Share */}
      <div className="absolute top-6 right-6 flex space-x-4 z-20">
        <motion.button whileHover="hover" whileTap="tap" variants={iconButtonVariants} className="text-neutral-400">
          <Settings2 size={24} />
        </motion.button>
        <motion.button whileHover="hover" whileTap="tap" variants={iconButtonVariants} className="text-neutral-400">
          <Share2 size={24} />
        </motion.button>
      </div>


      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="mt-8 text-3xl md:text-4xl font-bold text-neutral-100 z-20"
      >
        AI Orb Assistant
      </motion.h1>
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-2 text-neutral-400 text-center max-w-md z-20"
      >
        Experience the future of interaction. Tap the orb or the button below to begin.
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="mt-10 z-20"
      >
        <Button
          onClick={onEnterChat}
          size="lg"
          className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-semibold py-3 px-8 rounded-full shadow-lg transform transition-all duration-300 hover:scale-105"
        >
          Enter Chat
        </Button>
      </motion.div>

      {/* Bottom Controls */}
      <div className="absolute bottom-6 left-6 z-20">
        <motion.button
          whileHover="hover"
          whileTap="tap"
          variants={iconButtonVariants}
          className="text-neutral-400 p-3 bg-neutral-800/50 rounded-full backdrop-blur-sm"
        >
          <Mic size={24} />
        </motion.button>
      </div>
      <div className="absolute bottom-6 right-6 z-20">
        <motion.button
          onClick={onEnterChat}
          whileHover="hover"
          whileTap="tap"
          variants={iconButtonVariants}
          className="text-neutral-400 p-3 bg-neutral-800/50 rounded-full backdrop-blur-sm"
        >
          <X size={24} />
        </motion.button>
      </div>
    </motion.div>
  )
}

export default SplashScreen
