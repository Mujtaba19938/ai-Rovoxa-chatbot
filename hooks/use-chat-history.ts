import { useState, useEffect, useCallback, useRef } from 'react';
import { getUserID } from '@/lib/user-utils';

interface Message {
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

interface Chat {
  _id: string;
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
      
      // Create an AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`http://localhost:5000/api/chat/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch chat history: ${response.statusText}`);
      }
      
      const data: ChatHistoryResponse = await response.json();
      
      console.log('✅ Loaded', data.messages.length, 'messages and', data.chats.length, 'chats from history');
      
      setMessages(data.messages);
      setChats(data.chats);
      retryCountRef.current = 0; // Reset retry count on success
      
    } catch (err) {
      console.error('❌ Error fetching chat history:', err);
      
      // Handle different types of errors
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Request timed out - server may be slow');
          console.log('⏰ Chat history request timed out, using empty history');
        } else if (err.message.includes('Failed to fetch')) {
          setError('Server not running - please start the backend server');
          console.log('🔌 Server not available, using empty history');
        } else if (err.message.includes('401')) {
          setError('Authentication failed - please log in again');
          console.log('🔐 Authentication failed');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to fetch chat history');
      }
      
      setMessages([]);
      setChats([]);
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
      const response = await fetch(`http://localhost:5000/api/chat/history`, {
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
