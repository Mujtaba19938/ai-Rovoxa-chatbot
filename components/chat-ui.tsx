"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { motion, AnimatePresence } from "framer-motion"
import dynamic from "next/dynamic"
import type { OrbAnimationState } from "./animated-orb" // Type import can remain static
import { SettingsPanel } from "./settings-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, Paperclip, Smile, Mic, Settings2, Sun, Moon, MenuIcon, User, Bot } from "lucide-react"
import { useTheme } from "next-themes"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { SafeOrbWrapper } from "./safe-orb-wrapper"

const ChatUI: React.FC = () => {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error, status, setMessages } = useChat({
    api: "/api/chat", // Ensure this matches your API route
  })
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector("div[data-radix-scroll-area-viewport]")
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight
      }
    }
  }, [messages])

  const currentOrbAnimationState: OrbAnimationState = (() => {
    if (error) return "error"
    if (status === "submitted" || (isLoading && messages[messages.length - 1]?.role !== "assistant")) return "thinking"
    if (status === "streaming" || isLoading) return "speaking"
    return "idle"
  })()

  const handleClearChat = () => {
    setMessages([])
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="fixed inset-0 bg-neutral-900 text-neutral-100 flex flex-col h-screen overflow-hidden"
    >
      {/* Header Toolbar */}
      <header className="p-4 border-b border-neutral-700/50 bg-neutral-900/80 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <motion.div
            layoutId="animated-orb-container" // Matches SplashScreen for shared layout animation
            className="w-10 h-10 flex items-center justify-center" // Added flex centering
          >
            <SafeOrbWrapper orbSize={2.2} animationState={currentOrbAnimationState} />
          </motion.div>
          <h1 className="text-xl font-semibold">Rovoxa</h1>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)}>
            <Settings2 size={20} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MenuIcon size={20} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-neutral-800 border-neutral-700 text-neutral-100">
              <DropdownMenuItem onClick={handleClearChat}>Clear Chat</DropdownMenuItem>
              <DropdownMenuItem>Export Chat</DropdownMenuItem>
              <DropdownMenuItem>View History</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Chat Area */}
      <ScrollArea className="flex-grow p-4 sm:p-6" ref={scrollAreaRef}>
        <div className="max-w-3xl mx-auto space-y-6">
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={cn("flex items-end space-x-3", m.role === "user" ? "justify-end" : "justify-start")}
              >
                {m.role === "assistant" && (
                  <Avatar className="w-8 h-8 shrink-0">
                    {/* Small orb or bot icon */}
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center">
                      <Bot size={18} className="text-white" />
                    </div>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "p-3 rounded-2xl max-w-[70%] text-sm md:text-base break-words",
                    m.role === "user"
                      ? "bg-gradient-to-br from-sky-600 to-indigo-700 text-white rounded-br-none"
                      : "bg-neutral-700/70 text-neutral-100 rounded-bl-none backdrop-blur-sm",
                  )}
                >
                  {m.content.split("\n").map((line, i) => (
                    <span key={i}>
                      {line}
                      {i !== m.content.split("\n").length - 1 && <br />}
                    </span>
                  ))}
                </div>
                {m.role === "user" && (
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="bg-neutral-600 text-neutral-300">
                      <User size={18} />
                    </AvatarFallback>
                  </Avatar>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-end space-x-3 justify-start"
            >
              <Avatar className="w-8 h-8 shrink-0">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center">
                  <Bot size={18} className="text-white" />
                </div>
              </Avatar>
              <div className="p-3 rounded-2xl bg-neutral-700/70 text-neutral-400 rounded-bl-none backdrop-blur-sm">
                AI is thinking...
              </div>
            </motion.div>
          )}
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
              <div className="p-3 rounded-2xl bg-red-500/30 text-red-300 rounded-bl-none backdrop-blur-sm">
                Error: {error.message || "Something went wrong."}
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <footer className="p-4 border-t border-neutral-700/50 bg-neutral-900/80 backdrop-blur-md shrink-0">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex items-center space-x-2">
          <Button variant="ghost" size="icon" type="button" className="text-neutral-400 hover:text-sky-400">
            <Paperclip size={20} />
          </Button>
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="flex-grow bg-neutral-800/50 border-neutral-700/60 focus:border-sky-500 rounded-full px-4 py-3 h-12 placeholder:text-neutral-500"
            disabled={isLoading && status !== "streaming"} // Allow typing while streaming for interruption
          />
          <Button variant="ghost" size="icon" type="button" className="text-neutral-400 hover:text-sky-400">
            <Smile size={20} />
          </Button>
          <Button variant="ghost" size="icon" type="button" className="text-neutral-400 hover:text-sky-400">
            <Mic size={20} />
          </Button>
          <Button
            type="submit"
            size="icon"
            className="bg-sky-600 hover:bg-sky-500 rounded-full w-10 h-10 shrink-0"
            disabled={isLoading && status !== "streaming"}
          >
            <Send size={20} className="text-white" />
          </Button>
        </form>
      </footer>

      <AnimatePresence>{isSettingsOpen && <SettingsPanel onClose={() => setIsSettingsOpen(false)} />}</AnimatePresence>
    </motion.div>
  )
}

export default ChatUI
