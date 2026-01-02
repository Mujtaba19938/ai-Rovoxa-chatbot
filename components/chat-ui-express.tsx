"use client"

/**
 * Rovoxa Chat Interface
 * 
 * This component provides a sleek, minimal, and premium chat interface similar to ChatGPT/Claude.
 * 
 * Key Features:
 * - Modern glassmorphism design with subtle shadows and backdrop blur
 * - Smooth light/dark mode transitions with localStorage persistence
 * - Animated message bubbles with fade/slide effects using Framer Motion
 * - Typing indicator with pulsing dots animation
 * - Auto-scroll to latest messages with manual scroll-to-bottom button
 * - Responsive design that works on desktop, tablet, and mobile
 * - Gradient user messages and neutral AI messages
 * - Smooth hover animations and focus states
 * - Clean typography with proper spacing and readability
 * 
 * Theme System:
 * - Uses next-themes for theme management with localStorage persistence
 * - Light mode: Clean whites and grays with blue accents
 * - Dark mode: Deep slate backgrounds with proper contrast
 * - Smooth transitions between themes without page reload
 * 
 * Animations:
 * - Message entry: Fade in with scale and slide effects
 * - Typing indicator: Pulsing dots with staggered animation
 * - Hover effects: Subtle scale transforms on interactive elements
 * - Send button: Rotation animation during loading
 * - Scroll button: Fade in/out based on scroll position
 * 
 * Responsive Design:
 * - Mobile-first approach with breakpoint-specific styling
 * - Flexible message bubbles that adapt to content length
 * - Touch-friendly button sizes on mobile devices
 * - Optimized spacing and typography for all screen sizes
 */

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { SafeOrbWrapper } from "./safe-orb-wrapper"
import { SettingsPanel } from "./settings-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  Send, 
  Mic, 
  Settings2, 
  Sun, 
  Moon, 
  Trash2, 
  User, 
  Bot,
  ChevronDown,
  Menu
} from "lucide-react"
import { useTheme } from "next-themes"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

const ChatUI: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const { theme, setTheme } = useTheme()
  const { user, token, logout } = useAuth()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector("div[data-radix-scroll-area-viewport]")
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight
      }
    }
  }, [messages])

  // Handle scroll detection for scroll-to-bottom button
  useEffect(() => {
    const scrollViewport = scrollAreaRef.current?.querySelector("div[data-radix-scroll-area-viewport]")
    if (!scrollViewport) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollViewport
      setShowScrollButton(scrollTop < scrollHeight - clientHeight - 100)
    }

    scrollViewport.addEventListener('scroll', handleScroll)
    return () => scrollViewport.removeEventListener('scroll', handleScroll)
  }, [messages])

  const currentOrbAnimationState = (() => {
    if (error) return "error"
    if (isLoading) return "thinking"
    return "idle"
  })()

  const handleClearChat = () => {
    setMessages([])
    setError(null)
  }

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector("div[data-radix-scroll-area-viewport]")
      if (scrollViewport) {
        scrollViewport.scrollTo({
          top: scrollViewport.scrollHeight,
          behavior: 'smooth'
        })
      }
    }
  }

  const sendMessageToGemini = async (userMessage: string) => {
    try {
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ message: userMessage }),
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      return data.reply
    } catch (err) {
      console.error("Error sending message to Gemini:", err)
      throw err
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput("")
    setIsLoading(true)
    setError(null)

    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMsg])

    try {
      const reply = await sendMessageToGemini(userMessage)
      
      // Add assistant response
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: reply,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err) {
      setError("Failed to get response from AI. Please try again.")
      console.error("Chat error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // Typing indicator component
  const TypingIndicator = () => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-end space-x-3 justify-start"
    >
      <Avatar className="w-8 h-8 shrink-0">
        <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <Bot size={18} className="text-white" />
        </div>
      </Avatar>
      <div className="p-4 rounded-2xl bg-gray-100 dark:bg-gray-800/70 text-gray-600 dark:text-gray-300 rounded-bl-none backdrop-blur-sm">
        <div className="flex space-x-1">
          <motion.div
            className="w-2 h-2 bg-gray-400 rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="w-2 h-2 bg-gray-400 rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
          />
          <motion.div
            className="w-2 h-2 bg-gray-400 rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
          />
        </div>
      </div>
    </motion.div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed inset-0 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 flex flex-col h-screen overflow-hidden transition-colors duration-500"
    >
      {/* Modern Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="sticky top-0 z-50 p-3 sm:p-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl flex items-center justify-between shrink-0 shadow-sm"
      >
        <div className="flex items-center space-x-2 sm:space-x-3">
          <motion.div
            layoutId="animated-orb-container"
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center"
          >
            <SafeOrbWrapper orbSize={2.2} animationState={currentOrbAnimationState} />
          </motion.div>
          <h1 className="text-lg sm:text-xl font-semibold rovoxa-text-primary">
            Rovoxa
          </h1>
        </div>
        
        <div className="flex items-center space-x-1 sm:space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 w-8 h-8 sm:w-10 sm:h-10"
          >
            {theme === "dark" ? <Sun size={18} className="sm:w-5 sm:h-5" /> : <Moon size={18} className="sm:w-5 sm:h-5" />}
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleClearChat}
            className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 w-8 h-8 sm:w-10 sm:h-10"
          >
            <Trash2 size={18} className="sm:w-5 sm:h-5" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsSettingsOpen(true)}
            className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 w-8 h-8 sm:w-10 sm:h-10"
          >
            <Settings2 size={18} className="sm:w-5 sm:h-5" />
          </Button>
          
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 w-8 h-8 sm:w-10 sm:h-10"
              >
                <User size={18} className="sm:w-5 sm:h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-sm text-gray-500 dark:text-gray-400">
                {user?.name || user?.email}
              </div>
              <DropdownMenuItem onClick={logout} className="text-red-600 dark:text-red-400">
                <User size={16} className="mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.header>

      {/* Chat Area */}
      <ScrollArea className="flex-grow" ref={scrollAreaRef}>
        <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-24 space-y-6">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={cn(
                  "flex items-end space-x-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <Avatar className="w-8 h-8 shrink-0">
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <Bot size={18} className="text-white" />
                    </div>
                  </Avatar>
                )}
                
                <motion.div
                  className={cn(
                    "p-4 rounded-2xl max-w-[70%] text-sm md:text-base break-words shadow-sm",
                    message.role === "user"
                      ? "bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-br-none"
                      : "bg-gray-100 dark:bg-gray-800/70 text-gray-900 dark:text-gray-100 rounded-bl-none backdrop-blur-sm"
                  )}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  {message.content.split("\n").map((line, i) => (
                    <span key={i}>
                      {line}
                      {i !== message.content.split("\n").length - 1 && <br />}
                    </span>
                  ))}
                </motion.div>
                
                {message.role === "user" && (
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-gray-500 to-gray-600 text-white">
                      <User size={18} />
                    </AvatarFallback>
                  </Avatar>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isLoading && <TypingIndicator />}
          
          {error && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-end space-x-3 justify-start"
            >
              <Avatar className="w-8 h-8 shrink-0">
                <div className="w-full h-full rounded-full bg-red-500 flex items-center justify-center">
                  <Bot size={18} className="text-white" />
                </div>
              </Avatar>
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-bl-none backdrop-blur-sm">
                {error}
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Scroll to Bottom Button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-24 right-6 z-30"
          >
            <Button
              onClick={scrollToBottom}
              size="icon"
              className="w-12 h-12 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-200 border border-white/20 dark:border-white/10"
            >
              <ChevronDown size={20} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Transparent Input Area */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="fixed bottom-6 left-4 right-4 z-40"
      >
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="relative flex items-center space-x-2 sm:space-x-3 bg-white/10 dark:bg-black/20 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-2xl p-2 sm:p-3 shadow-2xl">
            <Button 
              variant="ghost" 
              size="icon" 
              type="button" 
              className="text-gray-400 hover:text-blue-500 transition-colors duration-200 w-8 h-8 sm:w-10 sm:h-10 hover:bg-white/10 dark:hover:bg-white/5"
            >
              <Mic size={18} className="sm:w-5 sm:h-5" />
            </Button>
            
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="w-full bg-white/20 dark:bg-black/20 border-0 focus:border-0 rounded-full px-3 sm:px-4 py-2.5 sm:py-3 h-10 sm:h-12 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-0 transition-all duration-200 text-sm sm:text-base backdrop-blur-sm"
                disabled={isLoading}
                onFocus={(e) => {
                  e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.3)'
                  e.target.style.background = 'rgba(255, 255, 255, 0.3)'
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = ''
                  e.target.style.background = ''
                }}
              />
            </div>
            
            <Button
              type="submit"
              size="icon"
              className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-full w-10 h-10 sm:w-12 sm:h-12 shrink-0 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !input.trim()}
            >
              <motion.div
                animate={{ rotate: isLoading ? 360 : 0 }}
                transition={{ duration: 0.5, repeat: isLoading ? Infinity : 0 }}
              >
                <Send size={18} className="text-white sm:w-5 sm:h-5" />
              </motion.div>
            </Button>
          </div>
        </form>
      </motion.div>

      <AnimatePresence>
        {isSettingsOpen && <SettingsPanel onClose={() => setIsSettingsOpen(false)} />}
      </AnimatePresence>
    </motion.div>
  )
}

export default ChatUI