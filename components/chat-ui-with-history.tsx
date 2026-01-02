"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { motion, AnimatePresence } from "framer-motion"
import dynamic from "next/dynamic"
// import type { OrbAnimationState } from "./animated-orb"
import { SettingsPanel } from "./settings-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, Paperclip, Smile, Mic, MicOff, Settings2, MenuIcon, User, Bot, Trash2, LogOut, Image, File, X } from "lucide-react"
import { useTheme } from "next-themes"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { SafeOrbWrapper } from "./safe-orb-wrapper"
import SimpleAnimatedOrb from "./simple-orb"
import { useChatHistory } from "@/hooks/use-chat-history"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
import { ChatSidebar } from "./chat-sidebar"
import { ThemeSelector } from "./theme-selector"
import { getApiUrl } from "@/lib/api"

const ChatUIWithHistory: React.FC = () => {
  const { token, logout } = useAuth()
  const { 
    messages: historyMessages, 
    chats: historyChats,
    isLoading: isLoadingHistory, 
    error: historyError,
    userId,
    clearChatHistory,
    setChatMessages,
    fetchChatHistory
  } = useChatHistory()

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const [currentChatId, setCurrentChatId] = useState<string>(() => {
    // Generate a unique chat ID for this session
    return `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  })
  const [forceStopLoading, setForceStopLoading] = useState(false)
  const [isWebSearching, setIsWebSearching] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const { 
    messages: aiMessages, 
    input, 
    handleInputChange, 
    handleSubmit: originalHandleSubmit, 
    isLoading, 
    error, 
    setMessages 
  } = useChat({
    api: "/api/chat",
    body: {
      userId: userId,
      chatId: currentChatId
    },
    headers: {
      'Authorization': `Bearer ${token}`
    },
    onFinish: (message) => {
      // When AI finishes responding, we don't need to do anything special
      // The Express server already saves the messages to the database
      console.log('✅ AI response completed:', message.content);
      // Clear attached files after successful message send
      setAttachedFiles([]);
    },
    onError: (error) => {
      console.error('❌ Chat error:', error);
      toast.error("Failed to get AI response. Please try again.");
    }
  })

  // Custom submit handler that includes file attachments
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if this message should trigger web search
    const willTriggerWebSearch = shouldTriggerWebSearch(input)
    if (willTriggerWebSearch) {
      setIsWebSearching(true)
    }
    
    // If there are attached files, we need to handle them
    if (attachedFiles.length > 0) {
      console.log('📎 Sending message with', attachedFiles.length, 'attached files');
      setIsUploading(true);
      
      try {
        // Create FormData to send files
        const formData = new FormData();
        formData.append('message', input);
        formData.append('userId', userId);
        formData.append('chatId', currentChatId);
        
        // Add files to FormData
        attachedFiles.forEach((file, index) => {
          formData.append('files', file);
        });
        
        // Send the message with files
        const response = await fetch(getApiUrl('/api/chat'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Server response error:', response.status, errorText);
          throw new Error(`Server error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('✅ Message with files sent successfully:', data);
        
        // Clear the input and attached files
        setAttachedFiles([]);
        setIsWebSearching(false);
        setIsUploading(false);
        
        // Clear the input field using the proper method
        const inputElement = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (inputElement) {
          inputElement.value = '';
          // Trigger input change event to update state
          const event = new Event('input', { bubbles: true });
          inputElement.dispatchEvent(event);
        }
        
        toast.success(`Message sent with ${attachedFiles.length} file(s) attached`);
        
        // Refresh the chat history to show the new message
        await fetchChatHistory();
        
      } catch (error) {
        console.error('❌ Error sending message with files:', error);
        toast.error('Failed to send message with files');
        setIsUploading(false);
      }
    } else {
      // No files attached, use the original submit handler
      originalHandleSubmit(e);
      // Reset web search loading after a delay
      setTimeout(() => setIsWebSearching(false), 2000);
    }
  }
  const { theme, setTheme } = useTheme()
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  // Check if message should trigger web search
  const shouldTriggerWebSearch = (message: string) => {
    const searchKeywords = [
      'latest', 'today', 'current', 'news', 'weather', 'recent',
      'now', 'happening', 'breaking', 'update', 'trending',
      'what is', 'who is', 'when did', 'where is', 'how to',
      'best', 'top', 'new', 'recent', '2024', '2025'
    ]
    const lowerMessage = message.toLowerCase()
    return searchKeywords.some(keyword => lowerMessage.includes(keyword))
  }

  // Get messages for the current chat only
  const currentChatMessages = historyChats?.find(chat => chat.chatId === currentChatId)?.messages || []
  
  // Normalize current chat messages
  const normalizedCurrentChatMessages = currentChatMessages.map(msg => ({
    id: `history-${msg.timestamp}-${Math.random()}`,
    role: msg.sender === 'ai' ? 'assistant' as const : 'user' as const,
    content: msg.text,
    timestamp: msg.timestamp
  }))
  
  // Combine current chat messages with any new AI SDK messages
  const allMessages = [...normalizedCurrentChatMessages, ...aiMessages]

  // Add timeout to prevent infinite loading
  useEffect(() => {
    if (isLoadingHistory) {
      const timeout = setTimeout(() => {
        console.log('⏰ Chat history loading timeout - forcing completion in main UI')
        setForceStopLoading(true)
      }, 5000) // 5 second timeout
      
      return () => clearTimeout(timeout)
    }
  }, [isLoadingHistory])

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector("div[data-radix-scroll-area-viewport]")
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight
      }
    }
  }, [allMessages])

  const currentOrbAnimationState: string = (() => {
    if (error || historyError) return "error"
    if (isLoading && (allMessages[allMessages.length - 1] as any)?.role !== "assistant") return "thinking"
    if (isLoading) return "speaking"
    return "idle"
  })()

  const handleClearChat = async () => {
    try {
      await clearChatHistory()
      setMessages([])
      toast.success("Chat history cleared successfully")
    } catch (err) {
      console.error("Error clearing chat:", err)
      toast.error("Failed to clear chat history")
    }
  }

  const handleExportChat = () => {
    const chatData = {
      userId,
      messages: allMessages,
      exportedAt: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-orb-chat-${userId}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success("Chat exported successfully")
  }

  const handleNewChat = async () => {
    try {
      // Generate a new unique chat ID
      const newChatId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      setCurrentChatId(newChatId)
      setMessages([])
      setChatMessages([])
      
      // Create the new chat in the database immediately
      const token = localStorage.getItem('authToken')
      if (!token || !userId) {
        console.log("⚠️ Missing token or userId, skipping database creation")
        toast.success("New chat started (local only)")
        return
      }
      
      const response = await fetch(getApiUrl('/api/chat/create'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          chatId: newChatId,
          userId: userId
        })
      })
      
      if (response.ok) {
        console.log("🆕 New chat created in database with ID:", newChatId)
        // Refresh chat history to show the new chat in sidebar
        await fetchChatHistory()
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.log("⚠️ Failed to create chat in database:", errorData.error || 'Unknown error')
      }
      
      toast.success("New chat started")
    } catch (error) {
      console.error("❌ Error creating new chat:", error)
      // Still allow the new chat to work locally even if database creation fails
      toast.success("New chat started (local only)")
    }
  }

  const handleSelectChat = async (chatId: string) => {
    if (chatId === 'new-chat') {
      // Start a new chat
      await handleNewChat()
    } else {
      // Load the selected chat
      setCurrentChatId(chatId)
      
      // Find the selected chat and load its messages
      const selectedChat = historyChats?.find(chat => chat.chatId === chatId)
      if (selectedChat) {
        // Convert chat messages to the format expected by the UI
        const normalizedMessages = selectedChat.messages.map(msg => ({
          id: `${msg.sender}-${msg.timestamp}-${Math.random()}`,
          role: (msg.sender === 'ai' ? 'assistant' : 'user') as 'assistant' | 'user',
          content: msg.text
        }))
        
        setMessages(normalizedMessages as any)
        setChatMessages(selectedChat.messages)
        console.log("Loaded chat:", chatId, "with", selectedChat.messages.length, "messages")
      } else {
        console.log("Chat not found:", chatId)
        setMessages([])
        setChatMessages([])
      }
    }
  }

  // File attachment handlers
  const handleFileAttach = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachedFiles(prev => [...prev, ...files])
  }

  const removeAttachedFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Emoji picker handlers
  const handleEmojiClick = () => {
    setIsEmojiPickerOpen(!isEmojiPickerOpen)
  }

  const addEmoji = (emoji: string) => {
    // Add emoji to input
    const currentInput = input
    handleInputChange({ target: { value: currentInput + emoji } } as React.ChangeEvent<HTMLInputElement>)
    setIsEmojiPickerOpen(false)
  }

  // Voice recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      
      const chunks: BlobPart[] = []
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' })
        // Handle the recorded audio
        console.log('Audio recorded:', audioBlob)
        toast.success("Voice message recorded!")
      }
      
      mediaRecorder.start()
      setIsRecording(true)
      toast.success("Recording started...")
    } catch (error) {
      console.error('Error starting recording:', error)
      toast.error("Failed to start recording")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      toast.success("Recording stopped")
    }
  }

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  // Debug logging
  console.log('🔍 ChatUIWithHistory loading state:', { 
    isLoadingHistory, 
    forceStopLoading, 
    currentChatId,
    historyChatsLength: historyChats?.length || 0,
    currentChatMessagesLength: currentChatMessages?.length || 0,
    normalizedCurrentChatMessagesLength: normalizedCurrentChatMessages.length,
    aiMessagesLength: aiMessages.length,
    allMessagesLength: allMessages.length,
    historyError,
    sampleCurrentChatMessage: currentChatMessages[0],
    sampleNormalizedMessage: normalizedCurrentChatMessages[0]
  })

  // Show loading state while fetching chat history (but not if forced to stop)
  if (isLoadingHistory && !forceStopLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="fixed inset-0 flex flex-col h-screen overflow-hidden"
        style={{ background: "var(--bg-primary)" }}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <SafeOrbWrapper orbSize={3} animationState="thinking" />
            <p className="mt-4 rovoxa-text-secondary">Loading chat history...</p>
            {historyError && (
              <div className="mt-4 p-3 bg-destructive/20 border border-destructive/30 rounded-lg">
                <p className="text-sm text-destructive">{historyError}</p>
                <button 
                  onClick={() => {
                    setForceStopLoading(false)
                    // Trigger a retry by refreshing the page or calling fetchChatHistory
                    window.location.reload()
                  }}
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  Retry loading
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div 
      className="fixed inset-0 flex h-screen overflow-hidden"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Sidebar */}
      <ChatSidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        currentChatId={currentChatId}
      />

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="flex-1 flex flex-col overflow-hidden min-w-0"
      >
      {/* Header Toolbar */}
      <header className="p-4 rovoxa-bg-glass-soft border-b border-border-glass flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="rovoxa-text-secondary hover:rovoxa-text-primary"
          >
            <MenuIcon className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold rovoxa-text-primary">Rovoxa</h1>
          <div className="w-2 h-2 rounded-full bg-[#c7f000] rovoxa-glow-green"></div>
        </div>
        <div className="flex items-center space-x-3">
          <ThemeSelector />
          <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} className="rovoxa-text-secondary hover:rovoxa-text-primary">
            <Settings2 size={20} />
          </Button>
        </div>
      </header>

      {/* Chat Area */}
      <ScrollArea className="flex-grow p-4 sm:p-6" ref={scrollAreaRef}>
        <div className="max-w-3xl mx-auto space-y-3">
          <AnimatePresence initial={false}>
            {allMessages.map((m: any, index: number) => (
              <motion.div
                key={m.id || `${m.sender}-${index}`}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={cn("flex items-end space-x-2", m.role === "user" ? "justify-end" : "justify-start")}
              >
                {m.role === "assistant" && (
                  <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                    <SafeOrbWrapper 
                      orbSize={1.2} 
                      animationState="idle" 
                      className="w-6 h-6"
                    />
                  </div>
                )}
                <div
                  className={cn(
                    "px-4 py-3 rounded-2xl max-w-[70%] text-sm break-words",
                    m.role === "user"
                      ? "rovoxa-bg-glass-soft rovoxa-text-primary rounded-br-sm border border-border-glass"
                      : "rovoxa-bg-glass-soft rovoxa-text-primary rounded-bl-sm border border-border-glass",
                  )}
                >
                  {m.role === "assistant" && (
                    <div className="w-2 h-2 rounded-full bg-[#c7f000] mb-2 inline-block mr-2"></div>
                  )}
                  {m.content ? m.content.split("\n").map((line: string, i: number) => (
                    <span key={i}>
                      {line}
                      {i !== m.content.split("\n").length - 1 && <br />}
                    </span>
                  )) : (
                    <span className="text-muted-foreground italic">No content</span>
                  )}
                </div>
                {m.role === "user" && (
                  <Avatar className="w-6 h-6 shrink-0">
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      <User size={14} />
                    </AvatarFallback>
                  </Avatar>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (allMessages[allMessages.length - 1] as any)?.role === "user" && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-end space-x-2 justify-start"
            >
              <Avatar className="w-6 h-6 shrink-0">
                <div className="w-full h-full rounded-full bg-primary flex items-center justify-center">
                  <Bot size={14} className="text-primary-foreground" />
                </div>
              </Avatar>
              <div className="px-4 py-3 rounded-2xl rovoxa-bg-glass-soft rovoxa-text-primary rounded-bl-sm border border-border-glass">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <motion.div
                      className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 1, 0.5]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: 0
                      }}
                    />
                    <motion.div
                      className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 1, 0.5]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: 0.2
                      }}
                    />
                    <motion.div
                      className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 1, 0.5]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: 0.4
                      }}
                    />
                  </div>
                  {isWebSearching && (
                    <span className="text-sm text-muted-foreground">
                      Fetching latest info...
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          {(error || historyError) && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-end space-x-2 justify-start"
            >
              <Avatar className="w-6 h-6 shrink-0">
                <div className="w-full h-full rounded-full bg-destructive flex items-center justify-center">
                  <Bot size={14} className="text-destructive-foreground" />
                </div>
              </Avatar>
              <div className="px-4 py-3 rounded-2xl bg-red-500/20 text-red-400 rounded-bl-sm backdrop-blur-sm border border-red-500/30">
                Error: {error?.message || historyError || "Something went wrong."}
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <footer className="p-6 shrink-0">
        {/* Attached Files Preview */}
        {attachedFiles.length > 0 && (
          <div className="max-w-4xl mx-auto mb-3">
            <div className="flex flex-wrap gap-2">
              {attachedFiles.map((file, index) => (
                <div key={index} className="flex items-center bg-muted/50 rounded-lg px-3 py-2 text-sm">
                  {file.type.startsWith('image/') ? (
                    <Image size={16} className="text-primary mr-2" />
                  ) : (
                    <File size={16} className="text-primary mr-2" />
                  )}
                  <span className="rovoxa-text-primary truncate max-w-32">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAttachedFile(index)}
                    className="text-muted-foreground hover:text-destructive h-4 w-4 ml-2"
                  >
                    <X size={12} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Emoji Picker */}
        {isEmojiPickerOpen && (
          <div className="max-w-4xl mx-auto mb-3">
            <div className="rovoxa-bg-glass rounded-xl p-4 border border-border-glass rovoxa-shadow-glass">
              <div className="grid grid-cols-8 gap-2">
                {['😀', '😂', '😍', '🥰', '😎', '🤔', '😮', '😢', '👍', '👎', '❤️', '🔥', '💯', '🎉', '🚀', '✨'].map((emoji) => (
                  <Button
                    key={emoji}
                    variant="ghost"
                    size="icon"
                    onClick={() => addEmoji(emoji)}
                    className="h-8 w-8 text-lg hover:bg-muted/50"
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="relative flex items-center rovoxa-bg-glass-soft rounded-full px-4 py-3 rovoxa-shadow-glass border border-border-glass focus-within:border-[#c7f000] focus-within:ring-2 focus-within:ring-[#c7f000]/20 transition-all duration-200">
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            
            {/* Attachment Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                type="button" 
                onClick={handleFileAttach}
                className="rovoxa-text-secondary hover:rovoxa-accent-green mr-2 h-8 w-8 transition-all duration-200 hover:scale-110"
              >
                <Paperclip size={18} />
              </Button>
            
            {/* Input Field */}
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Type your message..."
              className="flex-grow bg-transparent border-none focus:ring-0 focus:outline-none rovoxa-text-primary placeholder:rovoxa-text-secondary text-base px-2"
              disabled={isLoading}
            />
            
            {/* Right Side Buttons */}
            <div className="flex items-center space-x-1 ml-2">
              {/* Emoji Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                type="button" 
                onClick={handleEmojiClick}
                className={cn(
                  "h-8 w-8 transition-all duration-200 hover:scale-110",
                  isEmojiPickerOpen 
                    ? "rovoxa-accent-green rovoxa-bg-accent-green-soft" 
                    : "rovoxa-text-secondary hover:rovoxa-accent-green"
                )}
              >
                <Smile size={18} />
              </Button>
              
              {/* Microphone Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                type="button" 
                onClick={handleMicClick}
                className={cn(
                  "h-8 w-8 transition-all duration-200 hover:scale-110",
                  isRecording 
                    ? "text-red-400 bg-red-500/20 animate-pulse" 
                    : "rovoxa-text-secondary hover:rovoxa-accent-green"
                )}
              >
                {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
              </Button>
              
              {/* Send Button */}
              <Button
                type="submit"
                size="icon"
                className={cn(
                  "rounded-full w-8 h-8 ml-2 shrink-0 transition-all duration-200 hover:scale-105",
                  input.trim() || attachedFiles.length > 0
                    ? "rovoxa-btn-accent"
                    : "rovoxa-bg-glass-soft rovoxa-text-secondary opacity-50"
                )}
                disabled={isLoading || isUploading || (!input.trim() && attachedFiles.length === 0)}
              >
                {isUploading ? (
                  <div className="w-4 h-4 border-2 border-[#0b0f19] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send size={16} className={input.trim() || attachedFiles.length > 0 ? "text-[#0b0f19]" : "rovoxa-text-secondary"} />
                )}
              </Button>
            </div>
          </div>
        </form>
      </footer>

        <AnimatePresence>{isSettingsOpen && <SettingsPanel onClose={() => setIsSettingsOpen(false)} />}</AnimatePresence>
      </motion.div>
    </div>
  )
}

export default ChatUIWithHistory
