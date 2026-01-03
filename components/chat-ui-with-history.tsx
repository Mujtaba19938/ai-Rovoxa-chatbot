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
import { useChatHistory } from "@/hooks/use-chat-history"
import { toast } from "sonner"
import { useAuth } from "@/contexts/auth-context"
import { ChatSidebar } from "./chat-sidebar"
import { ThemeSelector } from "./theme-selector"
import { getApiUrl } from "@/lib/api"
import { generateUUID } from "@/lib/uuid-utils"

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
    // Generate a UUID-compatible chat ID for this session
    return generateUUID();
  })
  const [forceStopLoading, setForceStopLoading] = useState(false)
  const [isWebSearching, setIsWebSearching] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  // Local state for immediate message display (prevents flash)
  const [localMessages, setLocalMessages] = useState<any[]>([])
  // Local loading state for direct API calls (not using useChat hook)
  const [isSendingMessage, setIsSendingMessage] = useState(false)

  const { 
    messages: aiMessages, 
    input, 
    handleInputChange: originalHandleInputChange,
    setInput,
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

  // Wrapper to ensure input is always trimmed
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    // Don't trim while typing (allows spaces), but we'll validate on submit
    originalHandleInputChange(e);
  }

  // ============================================
  // FIX 5: FIX SEND MESSAGE FLOW (NO EMPTY MESSAGES)
  // ============================================
  // CRITICAL: Get message value FIRST, then send, then clear state
  // React state updates are async - never read from state after clearing it
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ Get the trimmed message value FIRST (before any state updates)
    const msg = input?.trim();
    if (!msg || msg.length === 0) {
      console.warn("⚠️ Attempted to send empty message - ignoring");
      return; // Do nothing if message is empty
    }
    
    console.log("📤 SENDING MESSAGE:", msg);
    
    // Check if this message should trigger web search
    const willTriggerWebSearch = shouldTriggerWebSearch(msg)
    if (willTriggerWebSearch) {
      setIsWebSearching(true)
    }
    
    // ✅ Clear input state NOW (before sending) - we already have the value in 'msg'
    setInput('');
    
    // Also clear the DOM input immediately to prevent visual delay
    const inputElement = e.currentTarget?.querySelector('input[type="text"], textarea') as HTMLInputElement | HTMLTextAreaElement;
    if (inputElement) {
      inputElement.value = '';
    }
    
    // If there are attached files, we need to handle them
    if (attachedFiles.length > 0) {
      console.log('📎 Sending message with', attachedFiles.length, 'attached files');
      setIsUploading(true);
      
      try {
        // Create FormData to send files
        const formData = new FormData();
        formData.append('message', msg); // Use the captured message value, not state
        formData.append('userId', userId || '');
        formData.append('chatId', currentChatId || '');
        
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
        
        // Don't refetch chat history - we already have messages in state
        // Refetching causes loading screen flash/blink
        // The sidebar will update when user navigates or on next mount
        
      } catch (error) {
        console.error('❌ Error sending message with files:', error);
        toast.error('Failed to send message with files');
        setIsUploading(false);
      }
    } else {
      // No files attached - send message directly
      // ✅ CRITICAL: Show user message IMMEDIATELY, then make API call
      
      // Step 1: Add user message to UI IMMEDIATELY (before API call)
      const userMessage = {
        id: `user-${Date.now()}`,
        role: 'user' as const,
        content: msg // Use captured value
      };
      
      const assistantPlaceholder = {
        id: `assistant-${Date.now()}`,
        role: 'assistant' as const,
        content: ''
      };
      
      // Add user message and placeholder IMMEDIATELY to local state
      setLocalMessages((prev: any[]) => {
        if (prev.length > 0) {
          return [...prev, userMessage, assistantPlaceholder];
        } else {
          return [...normalizedCurrentChatMessages, userMessage, assistantPlaceholder];
        }
      });
      
      // Also add to useChat state
      setMessages((prev: any[]) => {
        const current = Array.isArray(prev) ? prev : [];
        return [...current, userMessage, assistantPlaceholder];
      });
      
      // Step 2: Set loading state
      setIsSendingMessage(true);
      
      // Step 3: Make API call
      try {
        const response = await fetch(getApiUrl('/api/chat'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            message: msg, // Use captured value, not state
            chatId: currentChatId,
            userId: userId
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `Server error: ${response.status}`);
        }
        
        // Get the streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = '';
        const assistantMessageId = assistantPlaceholder.id;
        
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('0:')) {
                try {
                  const data = JSON.parse(line.slice(2));
                  assistantMessage = data;
                  
                  // Update the assistant message in both states
                  setMessages((prev: any[]) => 
                    prev.map((msgItem: any) => 
                      msgItem.id === assistantMessageId 
                        ? { ...msgItem, content: assistantMessage }
                        : msgItem
                    )
                  );
                  
                  // Also update local state for immediate display
                  setLocalMessages((prev: any[]) => 
                    prev.map((msgItem: any) => 
                      msgItem.id === assistantMessageId 
                        ? { ...msgItem, content: assistantMessage }
                        : msgItem
                    )
                  );
                } catch (e) {
                  // Ignore parse errors
                }
              }
            }
          }
        }
        
        // Clear loading state
        setIsSendingMessage(false);
        
        // Don't refetch chat history - we already updated messages in state
        // Refetching causes loading screen flash/blink
        // The sidebar will update when user navigates or component re-renders
        
        // Reset web search loading
        setTimeout(() => setIsWebSearching(false), 2000);
        
      } catch (error) {
        console.error('❌ Error sending message:', error);
        toast.error('Failed to send message. Please try again.');
        setIsSendingMessage(false);
        setIsWebSearching(false);
        
        // Remove the placeholder assistant message on error
        setLocalMessages((prev: any[]) => 
          prev.filter((msg: any) => msg.id !== assistantPlaceholder.id)
        );
        setMessages((prev: any[]) => 
          prev.filter((msg: any) => msg.id !== assistantPlaceholder.id)
        );
      }
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

  // ============================================
  // FIX 3: CRASH-PROOF MESSAGE RENDERING
  // ============================================
  // Get messages for the current chat only - with safe array checks
  const currentChat = Array.isArray(historyChats) 
    ? historyChats.find(chat => chat?.chatId === currentChatId || chat?.id === currentChatId)
    : null;
  
  const currentChatMessages = Array.isArray(currentChat?.messages) 
    ? currentChat.messages 
    : [];
  
  // Normalize current chat messages - ensure array before mapping
  const normalizedCurrentChatMessages = Array.isArray(currentChatMessages)
    ? currentChatMessages.map((msg: any) => ({
        id: msg.id ?? `history-${msg.timestamp ?? Date.now()}-${Math.random()}`,
        role: (msg.sender === 'ai' || msg.role === 'assistant') ? 'assistant' as const : 'user' as const,
        content: msg.text ?? msg.content ?? '',
        timestamp: msg.timestamp instanceof Date 
          ? msg.timestamp 
          : msg.timestamp 
            ? new Date(msg.timestamp)
            : new Date()
      }))
    : [];
  
  // Ensure aiMessages is an array before combining
  const safeAiMessages = Array.isArray(aiMessages) ? aiMessages : [];
  
  // ✅ Combine messages - prioritize localMessages for immediate display
  // This prevents the flash when sending new messages
  // 
  // Priority order:
  // 1. localMessages (when sending new messages - immediate display)
  // 2. aiMessages (when chat is selected - set via setMessages in handleSelectChat)
  // 3. normalizedCurrentChatMessages (fallback from historyChats)
  //
  // CRITICAL: When a chat is selected, handleSelectChat sets aiMessages via setMessages
  // So we should use aiMessages directly, not combine with normalizedCurrentChatMessages
  // (which might be stale or empty)
  const allMessages = localMessages.length > 0
    ? [...normalizedCurrentChatMessages, ...localMessages]
    : safeAiMessages.length > 0 
      ? safeAiMessages // Use aiMessages directly (set by handleSelectChat)
      : normalizedCurrentChatMessages

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
    // Use local loading state for direct API calls
    if (isSendingMessage) return "thinking"
    if (isLoading && (allMessages[allMessages.length - 1] as any)?.role !== "assistant") return "thinking"
    if (isLoading) return "speaking"
    return "idle"
  })()

  const handleClearChat = async () => {
    try {
      await clearChatHistory()
      setMessages([])
      setLocalMessages([]) // Clear local messages too
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
      // Generate UUID-compatible chat ID
      const newChatId = generateUUID();
      setCurrentChatId(newChatId)
      setMessages([])
      setLocalMessages([]) // Clear local messages for new chat
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

  // ============================================
  // FIX 2: FIX CHAT CLICK HANDLER (ORDER MATTERS)
  // ============================================
  const handleSelectChat = async (chatId: string) => {
    if (!chatId || chatId === 'new-chat') {
      // Start a new chat
      await handleNewChat()
      return
    }
    
    // Find the selected chat - with safe array checks
    const selectedChat = Array.isArray(historyChats)
      ? historyChats.find(chat => chat?.chatId === chatId || chat?.id === chatId)
      : null;
    
    if (!selectedChat?.id && !selectedChat?.chatId) {
      console.warn("⚠️ Chat not found:", chatId);
      setMessages([]);
      setChatMessages([]);
      return;
    }
    
    // Set currentChatId FIRST before rendering
    const validChatId = selectedChat.chatId ?? selectedChat.id ?? chatId;
    setCurrentChatId(validChatId);
    
    // Get messages with safe array checks
    const chatMessages = Array.isArray(selectedChat.messages) 
      ? selectedChat.messages 
      : [];
    
    // Convert chat messages to the format expected by the UI - with safe mapping
    const normalizedMessages = chatMessages.map((msg: any) => ({
      id: msg.id ?? `${msg.sender ?? msg.role ?? 'unknown'}-${msg.timestamp ?? Date.now()}-${Math.random()}`,
      role: (msg.sender === 'ai' || msg.role === 'assistant') 
        ? 'assistant' as const 
        : 'user' as const,
      content: msg.text ?? msg.content ?? '',
      timestamp: msg.timestamp instanceof Date 
        ? msg.timestamp 
        : msg.timestamp 
          ? new Date(msg.timestamp)
          : new Date()
    }));
    
    // ✅ CRITICAL: Clear localMessages FIRST, then set messages
    // This ensures allMessages uses the correct messages from the selected chat
    setLocalMessages([]);
    setMessages(normalizedMessages as any);
    setChatMessages(chatMessages);
    
    console.log("✅ Loaded chat:", validChatId, "with", chatMessages.length, "messages");
    console.log("📝 Normalized messages:", normalizedMessages.length);
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
      <header className="p-3 sm:p-4 rovoxa-bg-glass-soft border-b border-border-glass flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="rovoxa-text-secondary hover:rovoxa-text-primary shrink-0 h-8 w-8 sm:h-10 sm:w-10"
          >
            <MenuIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <h1 className="text-base sm:text-lg font-semibold rovoxa-text-primary truncate">Rovoxa</h1>
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#c7f000] rovoxa-glow-green shrink-0"></div>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <ThemeSelector />
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsSettingsOpen(true)} 
            className="rovoxa-text-secondary hover:rovoxa-text-primary h-8 w-8 sm:h-10 sm:w-10"
          >
            <Settings2 size={18} className="sm:w-5 sm:h-5" />
          </Button>
        </div>
      </header>

      {/* Chat Area */}
      <ScrollArea className="flex-grow p-3 sm:p-4 md:p-6" ref={scrollAreaRef}>
        <div className="max-w-3xl mx-auto space-y-2 sm:space-y-3">
          <AnimatePresence initial={false}>
            {/* FIX 3: CRASH-PROOF MESSAGE RENDERING */}
            {Array.isArray(allMessages) && allMessages.length > 0 ? allMessages.map((m: any, index: number) => {
              // Additional safety check for each message
              if (!m || typeof m !== 'object') {
                console.warn('⚠️ Invalid message object at index', index, m);
                return null;
              }
              return (
              <motion.div
                key={m.id || `${m.sender}-${index}`}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={cn("flex items-end space-x-1.5 sm:space-x-2", m.role === "user" ? "justify-end" : "justify-start")}
              >
                {m.role === "assistant" && (
                  <div className="w-6 h-6 sm:w-8 sm:h-8 shrink-0 flex items-center justify-center">
                    <SafeOrbWrapper 
                      orbSize={1.2} 
                      animationState="idle" 
                      className="w-5 h-5 sm:w-6 sm:h-6"
                    />
                  </div>
                )}
                <div
                  className={cn(
                    "px-3 py-2 sm:px-4 sm:py-3 rounded-2xl max-w-[85%] sm:max-w-[75%] md:max-w-[70%] text-xs sm:text-sm break-words",
                    m.role === "user"
                      ? "rovoxa-bg-glass-soft rovoxa-text-primary rounded-br-sm border border-border-glass"
                      : "rovoxa-bg-glass-soft rovoxa-text-primary rounded-bl-sm border border-border-glass",
                  )}
                >
                  {m.role === "assistant" && (
                    <div className="w-2 h-2 rounded-full bg-[#c7f000] mb-2 inline-block mr-2"></div>
                  )}
                  {m.content && typeof m.content === 'string' && m.content.trim().length > 0 ? (
                    m.content.split("\n").map((line: string, i: number) => (
                      <span key={i}>
                        {line}
                        {i !== m.content.split("\n").length - 1 && <br />}
                      </span>
                    ))
                  ) : m.role === "assistant" ? (
                    <span className="text-muted-foreground italic flex items-center gap-2">
                      <span className="animate-pulse">●</span>
                      Thinking...
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic">No content</span>
                  )}
                </div>
                {m.role === "user" && (
                  <Avatar className="w-5 h-5 sm:w-6 sm:h-6 shrink-0">
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      <User size={12} className="sm:w-3.5 sm:h-3.5" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </motion.div>
              );
            }).filter(Boolean) : null}
          </AnimatePresence>
          {(isLoading || isSendingMessage) && (allMessages[allMessages.length - 1] as any)?.role === "user" && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-end space-x-1.5 sm:space-x-2 justify-start"
            >
              <Avatar className="w-5 h-5 sm:w-6 sm:h-6 shrink-0">
                <div className="w-full h-full rounded-full bg-primary flex items-center justify-center">
                  <Bot size={12} className="sm:w-3.5 sm:h-3.5 text-primary-foreground" />
                </div>
              </Avatar>
              <div className="px-3 py-2 sm:px-4 sm:py-3 rounded-2xl rovoxa-bg-glass-soft rovoxa-text-primary rounded-bl-sm border border-border-glass max-w-[85%] sm:max-w-[75%] md:max-w-[70%]">
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <div className="flex space-x-1">
                    <motion.div
                      className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-muted-foreground rounded-full"
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
                      className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-muted-foreground rounded-full"
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
                      className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-muted-foreground rounded-full"
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
                    <span className="text-xs sm:text-sm text-muted-foreground">
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
              className="flex items-end space-x-1.5 sm:space-x-2 justify-start"
            >
              <Avatar className="w-5 h-5 sm:w-6 sm:h-6 shrink-0">
                <div className="w-full h-full rounded-full bg-destructive flex items-center justify-center">
                  <Bot size={12} className="sm:w-3.5 sm:h-3.5 text-destructive-foreground" />
                </div>
              </Avatar>
              <div className="px-3 py-2 sm:px-4 sm:py-3 rounded-2xl bg-red-500/20 text-red-400 rounded-bl-sm backdrop-blur-sm border border-red-500/30 text-xs sm:text-sm max-w-[85%] sm:max-w-[75%] md:max-w-[70%] break-words">
                Error: {error?.message || historyError || "Something went wrong."}
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <footer className="p-3 sm:p-4 md:p-6 shrink-0">
        {/* Attached Files Preview */}
        {attachedFiles.length > 0 && (
          <div className="max-w-4xl mx-auto mb-2 sm:mb-3">
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {attachedFiles.map((file, index) => (
                <div key={index} className="flex items-center bg-muted/50 rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm">
                  {file.type.startsWith('image/') ? (
                    <Image size={14} className="sm:w-4 sm:h-4 text-primary mr-1.5 sm:mr-2" />
                  ) : (
                    <File size={14} className="sm:w-4 sm:h-4 text-primary mr-1.5 sm:mr-2" />
                  )}
                  <span className="rovoxa-text-primary truncate max-w-24 sm:max-w-32">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAttachedFile(index)}
                    className="text-muted-foreground hover:text-destructive h-3.5 w-3.5 sm:h-4 sm:w-4 ml-1.5 sm:ml-2"
                  >
                    <X size={10} className="sm:w-3 sm:h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Emoji Picker */}
        {isEmojiPickerOpen && (
          <div className="max-w-4xl mx-auto mb-2 sm:mb-3">
            <div className="rovoxa-bg-glass rounded-xl p-3 sm:p-4 border border-border-glass rovoxa-shadow-glass">
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 sm:gap-2">
                {['😀', '😂', '😍', '🥰', '😎', '🤔', '😮', '😢', '👍', '👎', '❤️', '🔥', '💯', '🎉', '🚀', '✨'].map((emoji) => (
                  <Button
                    key={emoji}
                    variant="ghost"
                    size="icon"
                    onClick={() => addEmoji(emoji)}
                    className="h-7 w-7 sm:h-8 sm:w-8 text-base sm:text-lg hover:bg-muted/50"
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="relative flex items-center rovoxa-bg-glass-soft rounded-full px-3 py-2 sm:px-4 sm:py-3 rovoxa-shadow-glass border border-border-glass focus-within:border-[#c7f000] focus-within:ring-2 focus-within:ring-[#c7f000]/20 transition-all duration-200">
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
                className="rovoxa-text-secondary hover:rovoxa-accent-green mr-1 sm:mr-2 h-7 w-7 sm:h-8 sm:w-8 transition-all duration-200 hover:scale-110"
              >
                <Paperclip size={16} className="sm:w-[18px] sm:h-[18px]" />
              </Button>
             
             {/* Input Field */}
             <input
               value={input}
               onChange={handleInputChange}
               placeholder="Type your message..."
               className="flex-grow bg-transparent border-none focus:ring-0 focus:outline-none rovoxa-text-primary placeholder:rovoxa-text-secondary text-sm sm:text-base px-1.5 sm:px-2"
               disabled={isLoading}
             />
             
             {/* Right Side Buttons */}
             <div className="flex items-center space-x-0.5 sm:space-x-1 ml-1 sm:ml-2">
               {/* Emoji Button */}
               <Button 
                 variant="ghost" 
                 size="icon" 
                 type="button" 
                 onClick={handleEmojiClick}
                 className={cn(
                   "h-7 w-7 sm:h-8 sm:w-8 transition-all duration-200 hover:scale-110",
                   isEmojiPickerOpen 
                     ? "rovoxa-accent-green rovoxa-bg-accent-green-soft" 
                     : "rovoxa-text-secondary hover:rovoxa-accent-green"
                 )}
               >
                 <Smile size={16} className="sm:w-[18px] sm:h-[18px]" />
               </Button>
               
               {/* Microphone Button */}
               <Button 
                 variant="ghost" 
                 size="icon" 
                 type="button" 
                 onClick={handleMicClick}
                 className={cn(
                   "h-7 w-7 sm:h-8 sm:w-8 transition-all duration-200 hover:scale-110",
                   isRecording 
                     ? "text-red-400 bg-red-500/20 animate-pulse" 
                     : "rovoxa-text-secondary hover:rovoxa-accent-green"
                 )}
               >
                 {isRecording ? <MicOff size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Mic size={16} className="sm:w-[18px] sm:h-[18px]" />}
               </Button>
               
               {/* Send Button */}
               <Button
                 type="submit"
                 size="icon"
                 className={cn(
                   "rounded-full w-7 h-7 sm:w-8 sm:h-8 ml-1 sm:ml-2 shrink-0 transition-all duration-200 hover:scale-105",
                   input.trim() || attachedFiles.length > 0
                     ? "rovoxa-btn-accent"
                     : "rovoxa-bg-glass-soft rovoxa-text-secondary opacity-50"
                 )}
                 disabled={isLoading || isUploading || (!input.trim() && attachedFiles.length === 0)}
               >
                 {isUploading ? (
                   <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-[#0b0f19] border-t-transparent rounded-full animate-spin" />
                 ) : (
                   <Send size={14} className="sm:w-4 sm:h-4" style={{ color: input.trim() || attachedFiles.length > 0 ? "#0b0f19" : undefined }} />
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
