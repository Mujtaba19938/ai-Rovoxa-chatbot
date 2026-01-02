// Load environment variables FIRST before any imports that depend on them
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import path from "path";
// Supabase is now lazy-loaded, so it's safe to import here
import { supabase } from "./lib/supabase.js";
import { authenticateToken } from "./middleware/auth.js";
import { getWebResults, shouldTriggerWebSearch, formatSearchResults } from "./utils/web-search.js";
import { getWeatherData, shouldTriggerWeatherSearch, extractLocationFromMessage, formatWeatherResults } from "./utils/weather.js";
import { processUploadedFiles } from "./utils/file-processor.js";

const PORT = process.env.PORT || 5000;
const app = express();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, audio, and common document types
    const allowedTypes = /jpeg|jpg|png|gif|mp4|avi|mov|mp3|wav|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, audio, and documents are allowed.'));
    }
  }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Validate API keys early
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ Missing GEMINI_API_KEY in environment");
  process.exit(1);
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase credentials in environment");
  process.exit(1);
}

console.log("✅ GEMINI key loaded:", !!process.env.GEMINI_API_KEY);
console.log("✅ Supabase configured");
console.log("🔑 API Key length:", process.env.GEMINI_API_KEY?.length || 0);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// LOCK the model string in one place to prevent Cursor from changing it
// Using stable version of Gemini 2.5 Flash (confirmed available via API)
const MODEL_NAME = "gemini-2.5-flash";
console.log("🤖 Using Gemini model:", MODEL_NAME);

const model = genAI.getGenerativeModel({ model: MODEL_NAME });

// Health route for testing
app.get("/api/health", async (req, res) => {
  console.log("🏥 Health check requested");
  
  // Test Supabase connection
  let dbStatus = "disconnected";
  try {
    const { data, error } = await supabase.from('chats').select('id').limit(1);
    if (!error) {
      dbStatus = "connected";
    }
  } catch (err) {
    console.error("Database health check error:", err);
  }
  
  res.json({ 
    ok: true, 
    model: MODEL_NAME,
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Authentication routes using Supabase Auth
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: "Email, password, and name are required" 
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ 
        error: "Password must be at least 6 characters long" 
      });
    }
    
    // Register user with Supabase Auth (using admin API for server-side)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: name
      }
    });
    
    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        return res.status(409).json({ 
          error: "User with this email already exists" 
        });
      }
      return res.status(400).json({ 
        error: "Registration failed",
        details: authError.message 
      });
    }
    
    if (!authData.user) {
      return res.status(500).json({ 
        error: "Failed to create user" 
      });
    }
    
    console.log("✅ New user registered:", email);
    
    res.status(201).json({
      message: "User registered successfully. Please login to get your access token.",
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: name,
        created_at: authData.user.created_at
      }
    });
    
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ 
      error: "Registration failed",
      details: err.message 
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        error: "Email and password are required" 
      });
    }
    
    // Create a client for user authentication (use anon key if available, otherwise service role)
    const { createClient } = await import("@supabase/supabase-js");
    const authSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await authSupabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (authError || !authData.user) {
      return res.status(401).json({ 
        error: "Invalid email or password" 
      });
    }
    
    // Get user metadata
    const user = {
      id: authData.user.id,
      email: authData.user.email,
      name: authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || 'User',
      created_at: authData.user.created_at
    };
    
    console.log("✅ User logged in:", email);
    
    res.json({
      message: "Login successful",
      user: user,
      token: authData.session?.access_token,
      refreshToken: authData.session?.refresh_token
    });
    
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ 
      error: "Login failed",
      details: err.message 
    });
  }
});

app.post("/api/auth/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ 
        error: "Refresh token required" 
      });
    }
    
    // Create a client for user authentication to refresh session
    const { createClient } = await import("@supabase/supabase-js");
    const authSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Refresh session with Supabase
    const { data, error } = await authSupabase.auth.refreshSession({
      refresh_token: refreshToken
    });
    
    if (error || !data.session) {
      return res.status(401).json({ 
        error: "Invalid refresh token" 
      });
    }
    
    res.json({
      token: data.session.access_token,
      refreshToken: data.session.refresh_token
    });
    
  } catch (err) {
    console.error("❌ Token refresh error:", err);
    res.status(401).json({ 
      error: "Invalid refresh token" 
    });
  }
});

app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.json({
    user: req.user
  });
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum is 5 files.' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected file field.' });
    }
  }
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({ error: error.message });
  }
  next(error);
};

// Main chat endpoint (requires authentication)
app.post("/api/chat", authenticateToken, upload.array('files', 5), handleMulterError, async (req, res) => {
  try {
    const { message, chatId } = req.body;
    const userId = req.user.id; // Use authenticated user ID from Supabase
    
    console.log("📨 Received chat request:", { 
      userId, 
      chatId,
      messageLength: message?.length, 
      filesCount: req.files?.length || 0 
    });
    
    // Validate input
    if (!message || typeof message !== "string" || message.trim() === "") {
      console.log("❌ Invalid message:", message);
      return res.status(400).json({ 
        error: "Message is required and must be a non-empty string" 
      });
    }

    console.log("💬 Processing message for user:", userId, "Message:", message.substring(0, 50) + "...");
    
    // Handle uploaded files
    const uploadedFiles = req.files || [];
    console.log("📎 Uploaded files:", uploadedFiles.length);
    
    // Process uploaded files for AI analysis
    let fileProcessingResult = { success: true, fileContent: '', fileSummary: '' };
    if (uploadedFiles.length > 0) {
      console.log("🔍 Processing files for AI analysis...");
      fileProcessingResult = await processUploadedFiles(uploadedFiles);
      console.log("📁 File processing result:", {
        success: fileProcessingResult.success,
        contentLength: fileProcessingResult.fileContent.length,
        summaryLength: fileProcessingResult.fileSummary.length
      });
    }
    
    // Process file information for the message
    let fileInfo = "";
    if (uploadedFiles.length > 0) {
      fileInfo = uploadedFiles.map((file) => 
        `[File: ${file.originalname} (${file.size} bytes)]`
      ).join(" ");
      console.log("📁 File info:", fileInfo);
    }

    // Get conversation context from Supabase
    let conversationContext = "";
    let existingChat = null;
    try {
      // Try to find existing chat if chatId is provided
      if (chatId) {
        const { data: chatData, error: chatError } = await supabase
          .from('chats')
          .select('id')
          .eq('id', chatId)
          .eq('user_id', userId)
          .single();
        
        if (chatData && !chatError) {
          existingChat = chatData;
          
          // Get last 10 messages for context
          const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('role, content')
            .eq('chat_id', chatData.id)
            .order('created_at', { ascending: true })
            .limit(10);
          
          if (messages && messages.length > 0) {
            conversationContext = messages.map(msg => 
              `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
            ).join('\n');
          }
        }
      }
    } catch (contextError) {
      console.error("❌ Error getting conversation context:", contextError);
    }

    // Check if we should trigger weather search FIRST
    let weatherResults = null;
    let weatherLocation = null;
    let isWeatherQuery = false;
    
    if (shouldTriggerWeatherSearch(message)) {
      console.log('🌤️ Message contains weather keywords, checking for weather query...');
      
      weatherLocation = extractLocationFromMessage(message);
      
      if (weatherLocation) {
        console.log('🌤️ Location detected:', weatherLocation, '- fetching weather data...');
        
        weatherResults = await getWeatherData(weatherLocation);
        
        if (weatherResults.success) {
          console.log('✅ Weather data retrieved for:', weatherLocation);
          isWeatherQuery = true;
        } else {
          console.log('⚠️ Weather data failed:', weatherResults.error);
        }
      } else {
        console.log('🌤️ Weather keywords detected but no specific location found');
      }
    }

    // Check if we should trigger web search (only if not a weather query)
    let webSearchResults = null;
    let searchQuery = null;
    
    if (!isWeatherQuery && shouldTriggerWebSearch(message)) {
      console.log('🔍 Message contains search keywords, triggering web search...');
      
      searchQuery = message;
      webSearchResults = await getWebResults(searchQuery);
      
      if (webSearchResults.success && webSearchResults.results.length > 0) {
        console.log('✅ Web search successful, found', webSearchResults.results.length, 'results');
      } else {
        console.log('⚠️ Web search failed or returned no results');
      }
    }

    // Create enhanced prompt with context, web search results, weather data, and file content
    let enhancedPrompt = message;
    let hasExternalData = false;
    
    // Start with file content if available
    if (fileProcessingResult.success && fileProcessingResult.fileContent) {
      enhancedPrompt = `User message: ${message}\n\nAttached files content:\n${fileProcessingResult.fileContent}\n\nPlease analyze the attached files and respond to the user's message accordingly.`;
      hasExternalData = true;
    }
    
    // Add weather data if available
    if (weatherResults && weatherResults.success) {
      const weatherContext = `\n\nHere is the current weather data for ${weatherLocation}:\n${formatWeatherResults(weatherResults)}\n\nPlease use this live weather information to provide an accurate response.`;
      if (hasExternalData) {
        enhancedPrompt += weatherContext;
      } else {
        enhancedPrompt = `User message: ${message}${weatherContext}`;
        hasExternalData = true;
      }
    } else if (webSearchResults && webSearchResults.success && webSearchResults.results.length > 0) {
      // Include web search results in the prompt
      const searchContext = `\n\nHere are the latest web search results for "${searchQuery}":\n${formatSearchResults(webSearchResults)}\n\nPlease use this information to provide an accurate and up-to-date response.`;
      if (hasExternalData) {
        enhancedPrompt += searchContext;
      } else {
        enhancedPrompt = `User message: ${message}${searchContext}`;
        hasExternalData = true;
      }
    } else if (conversationContext && !hasExternalData) {
      enhancedPrompt = `Previous conversation context:\n${conversationContext}\n\nCurrent user message: ${message}\n\nPlease respond naturally, remembering the context of our conversation.`;
    }

    // Generate response using Gemini with context
    const result = await model.generateContent(enhancedPrompt);
    
    if (!result?.response) {
      console.error("❌ Empty response object from Gemini:", result);
      return res.status(502).json({ 
        error: "Empty response from Gemini",
        details: "No response object received"
      });
    }

    const aiResponse = result.response.text();
    console.log("✅ Generated response:", aiResponse.substring(0, 50) + "...");
    
    // Store messages in Supabase
    let savedChatId = chatId || uuidv4();
    
    try {
      // Use existing chat or create new one
      let chat = existingChat;
      
      // Create new chat if it doesn't exist
      if (!chat) {
        // Generate title from the first message
        let chatTitle = "New Chat";
        if (message) {
          const messageText = message.trim()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (messageText.length <= 35) {
            chatTitle = messageText;
          } else {
            const words = messageText.split(' ');
            let titleWords = [];
            let currentLength = 0;
            
            for (const word of words) {
              if (currentLength + word.length + 1 <= 35) {
                titleWords.push(word);
                currentLength += word.length + 1;
              } else {
                break;
              }
            }
            
            chatTitle = titleWords.join(' ');
            if (titleWords.length < words.length) {
              chatTitle += '...';
            }
          }
        }
        
        const { data: newChat, error: createError } = await supabase
          .from('chats')
          .insert({
            id: savedChatId,
            user_id: userId,
            title: chatTitle
          })
          .select()
          .single();
        
        if (createError) {
          throw createError;
        }
        
        chat = newChat;
        savedChatId = newChat.id;
        console.log("🆕 Created new chat with ID:", savedChatId, "and title:", chatTitle);
      }
      
      // Insert user message
      const userMessageText = fileInfo ? `${message} ${fileInfo}` : message;
      const { error: userMsgError } = await supabase
        .from('messages')
        .insert({
          chat_id: chat.id,
          role: 'user',
          content: userMessageText
        });
      
      if (userMsgError) {
        throw userMsgError;
      }
      
      // Insert AI response
      const { error: aiMsgError } = await supabase
        .from('messages')
        .insert({
          chat_id: chat.id,
          role: 'assistant',
          content: aiResponse
        });
      
      if (aiMsgError) {
        throw aiMsgError;
      }
      
      // Update chat updated_at timestamp
      await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chat.id);
      
      console.log("✅ Messages saved to Supabase for user:", userId);
      
    } catch (dbError) {
      console.error("❌ Database error saving messages:", dbError);
      // Continue even if save fails - we still return the response
    }
    
    return res.json({ 
      reply: aiResponse,
      chatId: savedChatId,
      webSearch: webSearchResults ? {
        triggered: true,
        query: searchQuery,
        resultsCount: webSearchResults.results?.length || 0,
        success: webSearchResults.success
      } : {
        triggered: false
      }
    });
    
  } catch (err) {
    console.error("❌ Chat error:", err);
    
    const errorResponse = {
      error: "Failed to generate response",
      details: err.message || String(err),
      model: MODEL_NAME
    };
    
    return res.status(500).json(errorResponse);
  }
});

// Create a new chat (requires authentication)
app.post("/api/chat/create", authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.body;
    const userId = req.user.id;

    console.log("🆕 Creating new chat:", { userId, chatId });
    
    // Validate input
    if (!chatId || typeof chatId !== "string") {
      return res.status(400).json({ 
        error: "chatId is required and must be a non-empty string" 
      });
    }

    // Check if chat already exists
    const { data: existingChat, error: checkError } = await supabase
      .from('chats')
      .select('id, title')
      .eq('id', chatId)
      .eq('user_id', userId)
      .single();
    
    if (existingChat) {
      console.log("📝 Chat already exists, returning existing chat");
      return res.json({ 
        message: "Chat already exists",
        chat: existingChat,
        chatId: existingChat.id
      });
    }
    
    // Generate title from message if provided
    let chatTitle = "New Chat";
    if (req.body.message) {
      const messageText = req.body.message.trim()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (messageText.length <= 35) {
        chatTitle = messageText;
      } else {
        const words = messageText.split(' ');
        let titleWords = [];
        let currentLength = 0;
        
        for (const word of words) {
          if (currentLength + word.length + 1 <= 35) {
            titleWords.push(word);
            currentLength += word.length + 1;
          } else {
            break;
          }
        }
        
        chatTitle = titleWords.join(' ');
        if (titleWords.length < words.length) {
          chatTitle += '...';
        }
      }
    }
    
    // Create new chat
    const { data: newChat, error: createError } = await supabase
      .from('chats')
      .insert({
        id: chatId,
        user_id: userId,
        title: chatTitle
      })
      .select()
      .single();
    
    if (createError) {
      throw createError;
    }
    
    console.log("✅ New chat created:", newChat.id);
    
    return res.json({ 
      message: "Chat created successfully",
      chat: newChat,
      chatId: newChat.id
    });
    
  } catch (err) {
    console.error("❌ Error creating chat:", err);
    return res.status(500).json({ 
      error: "Failed to create chat",
      details: err.message || String(err)
    });
  }
});

// Get chat history for a user (requires authentication)
app.get("/api/chat/history", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log("📖 Fetching chat history for user:", userId);
    
    // Get all chats for user
    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select('id, title, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (chatsError) {
      throw chatsError;
    }
    
    // Get all messages for user's chats
    let allMessages = [];
    let allChats = [];
    
    if (chats && chats.length > 0) {
      const chatIds = chats.map(chat => chat.id);
      
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id, chat_id, role, content, created_at')
        .in('chat_id', chatIds)
        .order('created_at', { ascending: true });
      
      if (messagesError) {
        throw messagesError;
      }
      
      // Format messages to match expected structure
      allMessages = (messages || []).map(msg => ({
        id: msg.id,
        chatId: msg.chat_id,
        sender: msg.role === 'user' ? 'user' : 'ai',
        text: msg.content,
        timestamp: msg.created_at
      }));
      
      // Format chats to match expected structure
      allChats = (chats || []).map(chat => ({
        chatId: chat.id,
        userId: userId,
        title: chat.title,
        messages: (messages || []).filter(msg => msg.chat_id === chat.id).map(msg => ({
          sender: msg.role === 'user' ? 'user' : 'ai',
          text: msg.content,
          timestamp: msg.created_at
        })),
        createdAt: chat.created_at,
        updatedAt: chat.updated_at
      }));
    }
    
    console.log("✅ Found", allChats.length, "chats for user:", userId);
    
    return res.json({ 
      messages: allMessages,
      chats: allChats,
      userId,
      source: "supabase",
      message: allMessages.length > 0 ? "Chat history loaded successfully" : "No chat history found"
    });
    
  } catch (err) {
    console.error("❌ Error fetching chat history:", err);
    return res.status(500).json({ 
      error: "Failed to fetch chat history",
      details: err.message || String(err)
    });
  }
});

// Delete a specific chat (requires authentication)
app.delete("/api/chat/:chatId", authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    console.log("🗑️ Deleting chat:", { userId, chatId });
    
    // Delete chat (messages will be cascade deleted)
    const { error: deleteError } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId)
      .eq('user_id', userId);
    
    if (deleteError) {
      throw deleteError;
    }
    
    console.log("✅ Chat deleted:", chatId);
    
    return res.json({ 
      message: "Chat deleted successfully",
      chatId
    });
    
  } catch (err) {
    console.error("❌ Error deleting chat:", err);
    return res.status(500).json({ 
      error: "Failed to delete chat",
      details: err.message || String(err)
    });
  }
});

// Web search endpoint for testing (requires authentication)
app.post("/api/search", authenticateToken, async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== "string" || query.trim() === "") {
      return res.status(400).json({ 
        error: "Search query is required and must be a non-empty string" 
      });
    }

    console.log("🔍 Web search requested:", query);
    
    const searchResults = await getWebResults(query.trim());
    
    if (searchResults.success) {
      res.json({
        success: true,
        query: searchResults.query,
        results: searchResults.results,
        totalResults: searchResults.totalResults,
        searchTime: searchResults.searchTime,
        formatted: formatSearchResults(searchResults)
      });
    } else {
      res.status(404).json({
        success: false,
        error: searchResults.error || searchResults.message,
        query: searchResults.query
      });
    }
    
  } catch (err) {
    console.error("❌ Web search error:", err);
    res.status(500).json({ 
      error: "Failed to perform web search",
      details: err.message || String(err)
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err);
  res.status(500).json({ 
    error: "Internal server error",
    details: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: "Not found",
    path: req.path 
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Log but don't exit - keep server running
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Log but don't exit - keep server running
});

// Keep process alive - handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM received, shutting down gracefully...');
  clearInterval(keepAliveInterval);
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('⚠️ SIGINT received, shutting down gracefully...');
  clearInterval(keepAliveInterval);
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

const server = app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`💬 Chat endpoint: http://localhost:${PORT}/api/chat`);
  console.log(`📖 Get chat history: http://localhost:${PORT}/api/chat/history`);
  console.log(`\n🔄 Server is ready and waiting for requests...\n`);
});

// Keep the process alive
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// Explicitly keep the event loop alive
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please use a different port.`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', error);
  }
});

// Prevent the process from exiting - keep event loop alive
// This interval ensures Node.js doesn't exit when there are no active connections
const keepAliveInterval = setInterval(() => {
  // This keeps the event loop active
  // The server itself should keep the process alive, but this is a safety measure
}, 1000);

// Clean up on shutdown
process.on('SIGTERM', () => {
  clearInterval(keepAliveInterval);
});

process.on('SIGINT', () => {
  clearInterval(keepAliveInterval);
});

