"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { 
  Plus, 
  MessageSquare, 
  MoreHorizontal, 
  ChevronDown,
  X,
  Menu,
  Trash2,
  LogOut
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SafeOrbWrapper } from "./safe-orb-wrapper"
import { useAuth } from "@/contexts/auth-context"
import { useChatHistory } from "@/hooks/use-chat-history"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { getApiUrl } from "@/lib/api"

interface ChatSidebarProps {
  isOpen: boolean
  onToggle: () => void
  onNewChat: () => void
  onSelectChat: (chatId: string) => void
  currentChatId?: string
}

interface ChatItem {
  id: string
  title: string
  lastMessage?: string
  timestamp: Date | string
  messageCount: number
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isOpen,
  onToggle,
  onNewChat,
  onSelectChat,
  currentChatId
}) => {
  const { user, logout } = useAuth()
  const { messages: historyMessages, chats: historyChats, isLoading: isLoadingHistory, error: historyError, fetchChatHistory, retryFetchChatHistory } = useChatHistory()
  const [chatHistory, setChatHistory] = useState<ChatItem[]>([])
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [forceStopLoading, setForceStopLoading] = useState(false)

  // Delete chat function
  const handleDeleteChat = async (chatId: string) => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        toast.error("Please log in to delete chats")
        return
      }

      const response = await fetch(getApiUrl(`/api/chat/${chatId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        toast.success("Chat deleted successfully")
        // Refresh chat history
        await fetchChatHistory()
        // If we deleted the current chat, start a new one
        if (currentChatId === chatId) {
          onNewChat()
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        toast.error(errorData.error || "Failed to delete chat")
      }
    } catch (error) {
      console.error("Error deleting chat:", error)
      toast.error("Failed to delete chat")
    }
  }

  // Auto-load chat history when component mounts
  useEffect(() => {
    fetchChatHistory()
    
    // Add a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log('⏰ Chat history loading timeout - forcing completion')
      // Force loading to complete after timeout
      if (isLoadingHistory) {
        console.log('🔄 Forcing chat history loading to complete due to timeout')
        setForceStopLoading(true)
      }
    }, 5000) // Reduced to 5 second timeout
    
    return () => clearTimeout(timeout)
  }, []) // Empty dependency array to run only once on mount

  // Generate chat history from chats
  useEffect(() => {
    console.log('📊 Processing chat history:', { 
      historyChatsLength: historyChats?.length || 0,
      historyMessagesLength: historyMessages?.length || 0, 
      isLoadingHistory,
      forceStopLoading,
      chats: historyChats?.slice(0, 2) || [] // Only log first 2 chats to avoid spam
    })
    
    if (!isLoadingHistory || forceStopLoading) {
      // Only process when loading is complete or forced to stop
      if (historyChats && historyChats.length > 0) {
        // Convert chats to chat items for display
        const chatItems: ChatItem[] = historyChats.map(chat => {
          const lastMessage = chat.messages?.[chat.messages.length - 1]
          const firstUserMessage = chat.messages?.find(msg => msg.sender === 'user')
          
          // Generate title from first user message or use chat title
          let title = 'New Chat'
          
          // Always try to generate a title from the first user message
          if (firstUserMessage) {
            const messageText = firstUserMessage.text.trim()
            
            // Clean up the message text for title
            let cleanText = messageText
              .replace(/[^\w\s]/g, ' ') // Remove special characters
              .replace(/\s+/g, ' ') // Replace multiple spaces with single space
              .trim()
            
            // Create a more readable title
            if (cleanText.length <= 35) {
              title = cleanText
            } else {
              // Try to break at word boundaries
              const words = cleanText.split(' ')
              let titleWords = []
              let currentLength = 0
              
              for (const word of words) {
                if (currentLength + word.length + 1 <= 35) {
                  titleWords.push(word)
                  currentLength += word.length + 1
                } else {
                  break
                }
              }
              
              title = titleWords.join(' ')
              if (titleWords.length < words.length) {
                title += '...'
              }
            }
          }
          
          // Use custom title if it exists and is not "New Chat"
          if (chat.title && chat.title !== 'New Chat') {
            title = chat.title
          }
          
          return {
            id: chat.chatId,
            title: title,
            lastMessage: lastMessage ? lastMessage.text.substring(0, 100) + (lastMessage.text.length > 100 ? '...' : '') : 'No messages yet',
            timestamp: new Date(chat.updatedAt || chat.createdAt),
            messageCount: chat.messages?.length || 0
          }
        })
        
        setChatHistory(chatItems)
        console.log('✅ Chat history processed and set:', chatItems)
      } else {
        // No chats found, clear chat history
        setChatHistory([])
        console.log('📭 No chat history found - setting empty array')
      }
    }
  }, [historyChats, historyMessages, isLoadingHistory, forceStopLoading])

  // ============================================
  // FIX 4: FIX TIMESTAMP FORMATTER (INVALID DATE BUG)
  // ============================================
  const formatTimestamp = (input?: string | number | Date) => {
    if (!input) return "Unknown"

    const date = input instanceof Date ? input : new Date(input)

    if (isNaN(date.getTime())) return "Unknown"

    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString()
  }

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{ 
          x: isOpen ? 0 : -280,
          width: isOpen ? 280 : 0
        }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className={cn(
          "fixed left-0 top-0 h-full z-50 flex flex-col",
          "lg:relative lg:z-auto w-[280px]"
        )}
        style={{ background: "var(--bg-primary)", borderRight: "1px solid var(--border-glass)" }}
      >
        {/* Header */}
        <div className="p-4 border-b border-border-glass flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              <SafeOrbWrapper orbSize={1.5} animationState="idle" />
            </div>
            <h1 className="text-lg font-semibold rovoxa-text-primary truncate">Rovoxa</h1>
            <div className="w-2 h-2 rounded-full bg-[#c7f000]"></div>
          </div>
          
          <div className="flex items-center space-x-2 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex rovoxa-text-secondary hover:rovoxa-text-primary"
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="lg:hidden rovoxa-text-secondary hover:rovoxa-text-primary"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator className="bg-border-glass" />

        {/* New Chat Section */}
        <div className="p-4 pb-2">
          <div 
            className="group relative cursor-pointer transition-all duration-200"
            onClick={() => onSelectChat('new-chat')}
          >
            <div className="flex items-center space-x-3 py-2">
              <div className="relative">
                <div className="w-6 h-6 flex items-center justify-center">
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    style={{ color: 'var(--accent-green)', filter: 'drop-shadow(0 0 8px rgba(199, 240, 0, 0.3))' }}
                  >
                    <path 
                      d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <path 
                      d="M9 9h6M9 15h6" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
              <span 
                className="rovoxa-text-primary font-medium text-sm tracking-wide"
              >
                New chat
              </span>
            </div>
          </div>
        </div>

        <Separator className="bg-border-glass" />

        {/* Chat History Section */}
        <div className="flex-1 overflow-hidden">
          <div className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium rovoxa-text-secondary uppercase tracking-wide">
                Chats
              </h2>
              <ChevronDown className="h-4 w-4 rovoxa-text-secondary" />
            </div>
          </div>

          <ScrollArea className="flex-1 px-2">
            <div className="space-y-0.5 pb-4">

              {isLoadingHistory && !forceStopLoading ? (
                // Loading skeleton placeholders with timeout
                <div className="space-y-1">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="p-3 rounded-lg">
                      <Skeleton className="h-4 w-3/4 mb-2" style={{ backgroundColor: 'var(--bg-glass)' }} />
                      <Skeleton className="h-3 w-1/2 mb-1" style={{ backgroundColor: 'var(--bg-glass)' }} />
                      <Skeleton className="h-3 w-1/4" style={{ backgroundColor: 'var(--bg-glass)' }} />
                    </div>
                  ))}
                  <div className="p-2 text-center">
                    <p className="text-xs rovoxa-text-secondary">Loading chat history...</p>
                  </div>
                </div>
              ) : chatHistory.length === 0 ? (
                <div className="p-4 text-center rovoxa-text-secondary">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" style={{ color: 'var(--text-secondary)' }} />
                  {historyError ? (
                    <>
                      <p className="text-sm text-red-400 mb-2">Failed to load chat history</p>
                      <p className="text-xs rovoxa-text-secondary mb-3">{historyError}</p>
                      {historyError.includes('Server not running') && (
                        <div className="text-xs rovoxa-text-secondary mb-3 p-2 rovoxa-bg-glass-soft rounded border border-border-glass">
                          <p>💡 To fix this:</p>
                          <p>1. Open a terminal</p>
                          <p>2. Run: <code className="rovoxa-bg-primary px-1 rounded">npm run server</code></p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-sm rovoxa-text-primary">No previous chats</p>
                      <p className="text-xs rovoxa-text-secondary">Your conversations will appear here</p>
                    </>
                  )}
                  <button 
                    onClick={() => {
                      setForceStopLoading(false)
                      retryFetchChatHistory()
                    }}
                    className="mt-2 text-xs rovoxa-accent-green hover:underline"
                  >
                    {historyError ? 'Retry loading' : 'Refresh'}
                  </button>
                </div>
              ) : (
                chatHistory.map((chat, index) => (
                  <motion.div
                    key={`chat-${chat.id}-${index}`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={cn(
                      "group relative p-2 rounded-lg cursor-pointer transition-all duration-200",
                      "border border-transparent",
                      currentChatId === chat.id 
                        ? "rovoxa-bg-glass-soft border-border-glass" 
                        : "hover:rovoxa-bg-glass-soft"
                    )}
                    onClick={() => onSelectChat(chat.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium rovoxa-text-primary leading-tight break-words">
                          {chat.title}
                        </h3>
                        <div className="mt-1">
                          <span className="text-xs rovoxa-text-secondary">
                            {formatTimestamp(chat.timestamp)}
                          </span>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 rovoxa-text-secondary hover:rovoxa-text-primary shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                            }}
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteChat(chat.id)
                            }}
                            className="text-red-400 focus:text-red-400"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Chat
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* User Section */}
        <div className="p-4 border-t border-border-glass">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full rovoxa-bg-glass-soft flex items-center justify-center shrink-0 border border-border-glass">
              <span className="text-sm font-medium rovoxa-text-primary">
                {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium rovoxa-text-primary truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs rovoxa-text-secondary truncate">
                {user?.email}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="rovoxa-text-secondary hover:text-red-400 shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  )
}
