import { useState, useEffect, useCallback, useRef } from 'react';
import { getUserID } from '@/lib/user-utils';
import { getApiUrl, API_BASE_URL } from '@/lib/api';

interface Message {
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

interface Chat {
  _id?: string;
  id?: string;
  userId: string;
  chatId: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

interface ChatHistoryResponse {
  messages: Message[];
  chats: Chat[];
  userId: string;
  source: string;
  message: string;
}

export const useChatHistory = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId] = useState(() => getUserID());
  const retryCountRef = useRef(0);
  const isFetchingRef = useRef(false);

  const fetchChatHistory = useCallback(async (isRetry = false) => {
    // Prevent multiple simultaneous requests
    if (isFetchingRef.current) {
      console.log('⏸️ Chat history fetch already in progress, skipping...');
      return;
    }
    
    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      setError(null);
      
      if (isRetry) {
        retryCountRef.current += 1;
        console.log(`🔄 Retrying chat history fetch (attempt ${retryCountRef.current})`);
      } else {
        console.log('📖 Fetching chat history for user:', userId);
      }
      
      const token = localStorage.getItem('authToken');
      
      // Validate token exists before making request
      if (!token) {
        const error = new Error('Authentication token not found. Please log in again.');
        console.error('❌ [FRONTEND] No auth token in localStorage');
        setError(error.message);
        setMessages([]);
        setChats([]);
        throw error;
      }
      
      // Create an AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const apiUrl = getApiUrl('/api/chat/history');
      console.log('🔍 [FRONTEND] Fetching from:', apiUrl);
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = response.statusText || 'Unknown error';
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.details) {
            errorMessage = errorData.details;
          }
        } catch (e) {
          // If response is not JSON, use status text
        }
        throw new Error(`Failed to fetch chat history: ${errorMessage}`);
      }
      
      const data: ChatHistoryResponse = await response.json();
      
      // ============================================
      // FIX 1: NORMALIZE CHAT HISTORY DATA (CRITICAL)
      // ============================================
      // Normalize chats - ensure messages is always an array
      const normalizedChats = (Array.isArray(data.chats) ? data.chats : []).map((chat: any) => ({
        ...chat,
        id: chat.id ?? chat._id ?? chat.chatId,
        chatId: chat.chatId ?? chat.id ?? chat._id,
        messages: Array.isArray(chat.messages) ? chat.messages : [],
        createdAt: typeof chat.createdAt === "string" || typeof chat.createdAt === "number"
          ? chat.createdAt
          : chat.created_at || chat.updatedAt || chat.updated_at || new Date().toISOString(),
        updatedAt: typeof chat.updatedAt === "string" || typeof chat.updatedAt === "number"
          ? chat.updatedAt
          : chat.updated_at || chat.createdAt || chat.created_at || new Date().toISOString(),
        title: chat.title ?? 'New Chat',
        userId: chat.userId ?? chat.user_id ?? userId
      }));
      
      // Normalize messages to ensure consistent data shape
      const normalizedMessages = (Array.isArray(data.messages) ? data.messages : []).map((msg: any) => ({
        ...msg,
        id: msg.id ?? `${msg.role ?? msg.sender ?? 'unknown'}-${msg.timestamp ?? Date.now()}-${Math.random()}`,
        sender: msg.sender ?? (msg.role === 'assistant' ? 'ai' : msg.role === 'user' ? 'user' : 'user'),
        role: msg.role ?? (msg.sender === 'ai' ? 'assistant' : 'user'),
        text: msg.text ?? msg.content ?? '',
        content: msg.content ?? msg.text ?? '',
        timestamp: msg.timestamp instanceof Date 
          ? msg.timestamp 
          : typeof msg.timestamp === "string" || typeof msg.timestamp === "number"
            ? new Date(msg.timestamp)
            : msg.created_at 
              ? new Date(msg.created_at)
              : new Date()
      }));
      
      console.log('✅ Loaded', normalizedMessages.length, 'messages and', normalizedChats.length, 'chats from history');
      
      setMessages(normalizedMessages);
      setChats(normalizedChats);
      retryCountRef.current = 0; // Reset retry count on success
      
    } catch (err) {
      // ============================================
      // REMOVED SILENT FAILURE - FAIL LOUDLY
      // ============================================
      console.error('❌ [FRONTEND] CHAT HISTORY FETCH FAILED:', {
        error: err,
        message: err instanceof Error ? err.message : String(err),
        name: err instanceof Error ? err.name : 'Unknown',
        stack: err instanceof Error ? err.stack : undefined
      });
      
      // Handle different types of errors with specific messages
      let errorMessage = 'Failed to fetch chat history';
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = 'Request timed out - server may be slow';
          console.error('⏰ [FRONTEND] Request timeout');
        } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('fetch')) {
          const baseUrl = API_BASE_URL || 'http://localhost:5000';
          errorMessage = `Cannot connect to backend server at ${baseUrl}. Please ensure the server is running.`;
          console.error('🔌 [FRONTEND] Network error - server unreachable');
        } else if (err.message.includes('401') || err.message.includes('Unauthorized') || err.message.includes('NO_TOKEN') || err.message.includes('INVALID_TOKEN')) {
          errorMessage = 'Authentication failed - please log in again';
          console.error('🔐 [FRONTEND] Authentication error');
        } else if (err.message.includes('503') || err.message.includes('DB_UNAVAILABLE') || err.message.includes('DB_CONNECTION_ERROR') || err.message.includes('TABLE_NOT_FOUND')) {
          if (err.message.includes('TABLE_NOT_FOUND') || err.message.includes("does not exist")) {
            errorMessage = 'Database tables not found - please run the Supabase schema migration (supabase-schema.sql)';
            console.error('🗄️ [FRONTEND] Database tables missing');
          } else {
            errorMessage = 'Database service unavailable - please check backend configuration';
            console.error('🗄️ [FRONTEND] Database unavailable');
          }
        } else if (err.message.includes('500') || err.message.includes('Internal Server Error')) {
          errorMessage = 'Server error - please check backend logs';
          console.error('🔴 [FRONTEND] Server error');
        } else {
          // Don't duplicate the error message if it already starts with "Failed to fetch chat history"
          errorMessage = err.message.startsWith('Failed to fetch chat history') 
            ? err.message 
            : `Failed to fetch chat history: ${err.message}`;
        }
      }
      
      // Set error state - UI will display this
      setError(errorMessage);
      
      // DO NOT silently return empty arrays - let the error state handle it
      // Only clear if we're sure it's a non-critical error
      if (err instanceof Error && (err.name === 'AbortError' || err.message.includes('timeout'))) {
        // Timeout - keep existing data if any
        console.warn('⚠️ [FRONTEND] Timeout - keeping existing data');
      } else {
        // Other errors - clear data to show error state
        setMessages([]);
        setChats([]);
      }
      
      // DO NOT re-throw - we've handled it by setting error state
      // Re-throwing would cause unhandled promise rejection
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [userId]); // Removed retryCount from dependencies to prevent infinite loop

  const clearChatHistory = useCallback(async () => {
    try {
      setError(null);
      
      console.log('🗑️ Clearing chat history for user:', userId);
      
      const token = localStorage.getItem('authToken');
      const response = await fetch(getApiUrl('/api/chat/history'), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to clear chat history: ${response.statusText}`);
      }
      
      console.log('✅ Chat history cleared successfully');
      
      setMessages([]);
      setChats([]);
      
    } catch (err) {
      console.error('❌ Error clearing chat history:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear chat history');
    }
  }, [userId]);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const addMessages = useCallback((newMessages: Message[]) => {
    setMessages(prev => [...prev, ...newMessages]);
  }, []);

  const setChatMessages = useCallback((newMessages: Message[]) => {
    setMessages(newMessages);
  }, []);

  // Load chat history on mount
  useEffect(() => {
    fetchChatHistory();
  }, [fetchChatHistory]);

  return {
    messages,
    chats,
    isLoading,
    error,
    userId,
    fetchChatHistory: () => fetchChatHistory(false),
    retryFetchChatHistory: () => fetchChatHistory(true),
    clearChatHistory,
    addMessage,
    addMessages,
    setChatMessages,
  };
};
