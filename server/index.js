import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import path from "path";
import connectDB from "./config/database.js";
import Chat from "./models/Chat.js";
import User from "./models/User.js";
import { authenticateToken, generateToken, generateRefreshToken } from "./middleware/auth.js";
import memoryStore from "./utils/memory-store.js";
import { getWebResults, shouldTriggerWebSearch, formatSearchResults } from "./utils/web-search.js";
import { getWeatherData, shouldTriggerWeatherSearch, extractLocationFromMessage, formatWeatherResults } from "./utils/weather.js";
import { processUploadedFiles } from "./utils/file-processor.js";

dotenv.config();

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

// Connect to MongoDB (optional)
let dbConnected = false;
connectDB().then(connected => {
  dbConnected = connected !== false;
  console.log("🗄️ Database status:", dbConnected ? "Connected" : "Fallback mode");
});

// Validate API key early
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ Missing GEMINI_API_KEY in environment");
  process.exit(1);
}

console.log("✅ GEMINI key loaded:", !!process.env.GEMINI_API_KEY);
console.log("🔑 API Key length:", process.env.GEMINI_API_KEY?.length || 0);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// LOCK the model string in one place to prevent Cursor from changing it
// Using stable version of Gemini 2.5 Flash (confirmed available via API)
const MODEL_NAME = "gemini-2.5-flash";
console.log("🤖 Using Gemini model:", MODEL_NAME);

const model = genAI.getGenerativeModel({ model: MODEL_NAME });

// Health route for testing
app.get("/api/health", (req, res) => {
  console.log("🏥 Health check requested");
  res.json({ 
    ok: true, 
    model: MODEL_NAME,
    database: dbConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString()
  });
});

// Simple chat history test endpoint (no auth required for debugging)
app.get("/api/chat/test", (req, res) => {
  console.log("🧪 Chat history test requested");
  res.json({ 
    ok: true,
    message: "Chat API is working",
    database: dbConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to check memory store
app.get("/api/chat/debug", (req, res) => {
  console.log("🔍 Debug endpoint requested");
  try {
    const memoryStats = {
      totalChats: memoryStore.chats.size,
      totalUsers: memoryStore.users.size,
      chats: Array.from(memoryStore.chats.entries()).map(([id, chat]) => ({
        id,
        userId: chat.userId,
        messageCount: chat.messages.length,
        lastMessage: chat.messages[chat.messages.length - 1]?.text?.substring(0, 50) || 'No messages'
      }))
    };
    
    res.json({
      ok: true,
      memory: memoryStats,
      database: dbConnected ? "connected" : "disconnected",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoint to check database chat history (no auth required for debugging)
app.get("/api/chat/debug-db", async (req, res) => {
  console.log("🔍 Database debug endpoint requested");
  try {
    if (!dbConnected) {
      return res.json({
        ok: false,
        message: "Database not connected",
        timestamp: new Date().toISOString()
      });
    }
    
    const chats = await Chat.find({}).limit(5).sort({ updatedAt: -1 });
    const chatStats = chats.map(chat => ({
      id: chat._id,
      userId: chat.userId,
      messageCount: chat.messages.length,
      lastMessage: chat.messages[chat.messages.length - 1]?.text?.substring(0, 50) || 'No messages',
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt
    }));
    
    res.json({
      ok: true,
      totalChats: await Chat.countDocuments(),
      recentChats: chatStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Authentication routes
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
    
    // Check if user already exists
    let existingUser;
    if (dbConnected) {
      existingUser = await User.findOne({ email });
    } else {
      existingUser = await memoryStore.findUserByEmail(email);
    }
    
    if (existingUser) {
      return res.status(409).json({ 
        error: "User with this email already exists" 
      });
    }
    
    // Create new user
    let user;
    if (dbConnected) {
      user = new User({
        email,
        password,
        name,
        provider: 'email'
      });
      await user.save();
    } else {
      // Hash password for memory store
      const bcrypt = await import('bcryptjs');
      const salt = await bcrypt.default.genSalt(12);
      const hashedPassword = await bcrypt.default.hash(password, salt);
      
      user = await memoryStore.createUser({
        email,
        password: hashedPassword,
        name,
        provider: 'email',
        preferences: {
          theme: 'dark',
          orbTheme: 'default',
          aiPersonality: 'friendly'
        },
        isEmailVerified: false,
        lastLogin: new Date()
      });
    }
    
    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    console.log("✅ New user registered:", email);
    
    res.status(201).json({
      message: "User registered successfully",
      user: dbConnected ? user.toJSON() : user,
      token,
      refreshToken
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
    
    // Find user
    let user;
    if (dbConnected) {
      user = await User.findOne({ email });
    } else {
      user = await memoryStore.findUserByEmail(email);
    }
    
    if (!user) {
      return res.status(401).json({ 
        error: "Invalid email or password" 
      });
    }
    
    // Check password
    let isPasswordValid;
    if (dbConnected) {
      isPasswordValid = await user.comparePassword(password);
    } else {
      const bcrypt = await import('bcryptjs');
      isPasswordValid = await bcrypt.default.compare(password, user.password);
    }
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: "Invalid email or password" 
      });
    }
    
    // Update last login
    user.lastLogin = new Date();
    if (dbConnected) {
      await user.save();
    } else {
      await memoryStore.updateUser(user._id, { lastLogin: new Date() });
    }
    
    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    console.log("✅ User logged in:", email);
    
    res.json({
      message: "Login successful",
      user: dbConnected ? user.toJSON() : user,
      token,
      refreshToken
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
    
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production");
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ 
        error: "Invalid refresh token" 
      });
    }
    
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ 
        error: "User not found" 
      });
    }
    
    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    
    res.json({
      token: newToken,
      refreshToken: newRefreshToken,
      user: user.toJSON()
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

// Main chat endpoint (now requires authentication)
app.post("/api/chat", authenticateToken, upload.array('files', 5), handleMulterError, async (req, res) => {
  try {
    const { message, chatId } = req.body;
    const userId = req.user._id.toString(); // Use authenticated user ID
    
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
    
    // Process file information for the message (legacy format)
    let fileInfo = "";
    if (uploadedFiles.length > 0) {
      fileInfo = uploadedFiles.map(file => 
        `[File: ${file.originalname} (${file.size} bytes)]`
      ).join(" ");
      console.log("📁 File info:", fileInfo);
    }

    // Get conversation context for better responses
    let conversationContext = "";
    if (dbConnected) {
      try {
        const chat = await Chat.findOne({ userId, chatId });
        if (chat && chat.messages.length > 0) {
          // Get last 10 messages for context (to avoid token limits)
          const recentMessages = chat.messages.slice(-10);
          conversationContext = recentMessages.map(msg => 
            `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`
          ).join('\n');
        }
      } catch (contextError) {
        console.error("❌ Error getting conversation context:", contextError);
      }
    }

    // Check if we should trigger weather search FIRST (priority over web search)
    let weatherResults = null;
    let weatherLocation = null;
    let isWeatherQuery = false;
    
    if (shouldTriggerWeatherSearch(message)) {
      console.log('🌤️ Message contains weather keywords, checking for weather query...');
      
      // Extract location from the message
      weatherLocation = extractLocationFromMessage(message);
      
      if (weatherLocation) {
        console.log('🌤️ Location detected:', weatherLocation, '- fetching weather data...');
        
        // Get weather data
        weatherResults = await getWeatherData(weatherLocation);
        
        if (weatherResults.success) {
          console.log('✅ Weather data retrieved for:', weatherLocation);
          isWeatherQuery = true; // Mark as weather query to skip web search
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
      
      // Extract search query from the message
      searchQuery = message;
      
      // Get web search results
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
    
    // Add weather data if available (takes priority over web search)
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
    
    // Store both user message and AI response in database and/or memory store
    let savedMessages = [];
    const userMessageText = fileInfo ? `${message} ${fileInfo}` : message;
    const newMessages = [
      {
        sender: "user",
        text: userMessageText,
        timestamp: new Date(),
        files: uploadedFiles.map(file => ({
          originalname: file.originalname,
          filename: file.filename,
          size: file.size,
          mimetype: file.mimetype,
          path: file.path
        }))
      },
      {
        sender: "ai",
        text: aiResponse,
        timestamp: new Date()
      }
    ];
    
    // Try to save to database first
    if (dbConnected) {
      try {
        let chat = await Chat.findOne({ userId, chatId });
        
        if (!chat) {
          // Generate title from the first message
          let chatTitle = "New Chat"
          if (message) {
            const messageText = message.trim()
            // Clean up the message text for title
            let cleanText = messageText
              .replace(/[^\w\s]/g, ' ') // Remove special characters
              .replace(/\s+/g, ' ') // Replace multiple spaces with single space
              .trim()
            
            if (cleanText.length <= 35) {
              chatTitle = cleanText
            } else {
              // Truncate at word boundary
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
              
              chatTitle = titleWords.join(' ')
              if (titleWords.length < words.length) {
                chatTitle += '...'
              }
            }
          }
          
          // Create new chat if it doesn't exist
          chat = new Chat({ userId, chatId, messages: [], title: chatTitle });
          console.log("🆕 Created new chat with ID:", chatId, "and title:", chatTitle);
        }
        
        // Add both messages
        chat.messages.push(...newMessages);
        
        await chat.save();
        console.log("✅ Chat saved to database for user:", userId);
        savedMessages = chat.messages;
        
      } catch (dbError) {
        console.error("❌ Database error:", dbError);
        // Fall through to memory store
      }
    }
    
    // Also save to memory store (as backup or primary if DB fails)
    try {
      let memoryChat = await memoryStore.findChatByUserId(userId, chatId);
      
      if (!memoryChat) {
        // Create new chat in memory store
        memoryChat = await memoryStore.createChat({ userId, chatId, messages: [] });
      }
      
      // Add both messages to memory store
      memoryChat.messages.push(...newMessages);
      await memoryStore.updateChat(memoryChat._id, { messages: memoryChat.messages });
      
      console.log("✅ Chat saved to memory store for user:", userId);
      
      // If database save failed, use memory store messages
      if (savedMessages.length === 0) {
        savedMessages = memoryChat.messages;
      }
      
    } catch (memoryError) {
      console.error("❌ Memory store error:", memoryError);
    }
    
    if (savedMessages.length === 0) {
      console.log("⚠️ Failed to save chat to both database and memory store");
    }
    
    return res.json({ 
      reply: aiResponse,
      messages: savedMessages,
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
    
    // Return useful error info (but not raw api key)
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
    const userId = req.user._id.toString();

    console.log("🆕 Creating new chat:", { userId, chatId });
    
    // Validate input
    if (!chatId || typeof chatId !== "string") {
      return res.status(400).json({ 
        error: "chatId is required and must be a non-empty string" 
      });
    }

    let savedChat = null;
    
    // Try to save to database first
    if (dbConnected) {
      try {
        // Check if chat already exists
        const existingChat = await Chat.findOne({ userId, chatId });
        if (existingChat) {
          console.log("📝 Chat already exists, returning existing chat");
          return res.json({ 
            message: "Chat already exists",
            chat: existingChat,
            chatId: existingChat.chatId
          });
        }
        
        // Generate title from the first message if provided
        let chatTitle = "New Chat"
        if (req.body.message) {
          const messageText = req.body.message.trim()
          // Clean up the message text for title
          let cleanText = messageText
            .replace(/[^\w\s]/g, ' ') // Remove special characters
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim()
          
          if (cleanText.length <= 35) {
            chatTitle = cleanText
          } else {
            // Truncate at word boundary
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
            
            chatTitle = titleWords.join(' ')
            if (titleWords.length < words.length) {
              chatTitle += '...'
            }
          }
        }
        
        // Create new chat
        const newChat = new Chat({ 
          userId, 
          chatId, 
          messages: [],
          title: chatTitle
        });
        
        savedChat = await newChat.save();
        console.log("✅ New chat created in database:", savedChat.chatId);
        
      } catch (dbError) {
        console.error("❌ Database error:", dbError);
        // Fall through to memory store
      }
    }
    
    // Also save to memory store (as backup or primary if DB fails)
    try {
      // Check if chat already exists in memory
      const existingMemoryChat = await memoryStore.findChatByUserId(userId, chatId);
      if (existingMemoryChat) {
        console.log("📝 Chat already exists in memory, returning existing chat");
        return res.json({ 
          message: "Chat already exists",
          chat: existingMemoryChat,
          chatId: existingMemoryChat.chatId
        });
      }
      
      // Create new chat in memory store
      const newMemoryChat = await memoryStore.createChat({ 
        userId, 
        chatId, 
        messages: [],
        title: chatTitle
      });
      
      console.log("✅ New chat created in memory store:", newMemoryChat.chatId);
      
      // If database save failed, use memory store chat
      if (!savedChat) {
        savedChat = newMemoryChat;
      }
      
    } catch (memoryError) {
      console.error("❌ Memory store error:", memoryError);
    }
    
    if (!savedChat) {
      console.log("⚠️ Failed to create chat in both database and memory store");
      return res.status(500).json({ 
        error: "Failed to create chat" 
      });
    }
    
    return res.json({ 
      message: "Chat created successfully",
      chat: savedChat,
      chatId: savedChat.chatId
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
    const userId = req.user._id.toString();

    console.log("📖 Fetching chat history for user:", userId);
    
    let allMessages = [];
    let allChats = [];
    
    if (dbConnected) {
      // Try to get from MongoDB first
      try {
        const chats = await Chat.find({ userId }).sort({ updatedAt: -1 });
        
        if (chats.length > 0) {
          console.log("✅ Found", chats.length, "chats in MongoDB for user:", userId);
          allChats = chats.map(chat => chat.toObject());
          // Combine all messages from all chats
          allMessages = chats.reduce((acc, chat) => {
            return acc.concat(chat.messages.map(msg => ({
              ...msg.toObject(),
              chatId: chat.chatId,
              chatTitle: chat.title
            })));
          }, []);
        } else {
          console.log("📭 No chat history found in MongoDB for user:", userId);
        }
      } catch (dbError) {
        console.error("❌ Database error:", dbError);
        // Fall through to in-memory store
      }
    }
    
    // If no chats from database, try in-memory store
    if (allChats.length === 0) {
      try {
        const memoryChats = Array.from(memoryStore.chats.values()).filter(chat => chat.userId === userId);
        if (memoryChats.length > 0) {
          console.log("✅ Found", memoryChats.length, "chats in memory store for user:", userId);
          allChats = memoryChats;
          allMessages = memoryChats.reduce((acc, chat) => {
            return acc.concat(chat.messages.map(msg => ({
              ...msg,
              chatId: chat.chatId,
              chatTitle: chat.title
            })));
          }, []);
        } else {
          console.log("📭 No chat history found in memory store for user:", userId);
        }
      } catch (memoryError) {
        console.error("❌ Memory store error:", memoryError);
      }
    }
    
    return res.json({ 
      messages: allMessages,
      chats: allChats,
      userId,
      source: dbConnected ? "database" : "memory",
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

// Delete a specific chat (requires authentication)
app.delete("/api/chat/:chatId", authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id.toString();

    console.log("🗑️ Deleting chat:", { userId, chatId });
    
    let deletedFromDatabase = false;
    let deletedFromMemory = false;
    
    // Try to delete from database
    if (dbConnected) {
      try {
        const result = await Chat.deleteOne({ userId, chatId });
        if (result.deletedCount > 0) {
          console.log("✅ Chat deleted from database:", chatId);
          deletedFromDatabase = true;
        }
      } catch (dbError) {
        console.error("❌ Database error:", dbError);
      }
    }
    
    // Try to delete from memory store
    try {
      const result = await memoryStore.deleteChatByUserIdAndChatId(userId, chatId);
      if (result.deletedCount > 0) {
        console.log("✅ Chat deleted from memory store:", chatId);
        deletedFromMemory = true;
      }
    } catch (memoryError) {
      console.error("❌ Memory store error:", memoryError);
    }
    
    if (!deletedFromDatabase && !deletedFromMemory) {
      console.log("📭 Chat not found for deletion:", chatId);
      return res.status(404).json({ 
        error: "Chat not found",
        chatId
      });
    }
    
    return res.json({ 
      message: "Chat deleted successfully",
      chatId,
      deletedFrom: {
        database: deletedFromDatabase,
        memory: deletedFromMemory
      }
    });
    
  } catch (err) {
    console.error("❌ Error deleting chat:", err);
    return res.status(500).json({ 
      error: "Failed to delete chat",
      details: err.message || String(err)
    });
  }
});

// Clear chat history for a user (requires authentication)
app.delete("/api/chat/history", authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id.toString();

    console.log("🗑️ Clearing chat history for user:", userId);
    
    let clearedFromDatabase = false;
    let clearedFromMemory = false;
    
    // Try to clear from database
    if (dbConnected) {
      try {
        const result = await Chat.deleteOne({ userId });
        if (result.deletedCount > 0) {
          console.log("✅ Chat history cleared from database for user:", userId);
          clearedFromDatabase = true;
        }
      } catch (dbError) {
        console.error("❌ Database error:", dbError);
      }
    }
    
    // Try to clear from memory store
    try {
      const result = await memoryStore.deleteChatByUserId(userId);
      if (result.deletedCount > 0) {
        console.log("✅ Chat history cleared from memory store for user:", userId);
        clearedFromMemory = true;
      }
    } catch (memoryError) {
      console.error("❌ Memory store error:", memoryError);
    }
    
    if (!clearedFromDatabase && !clearedFromMemory) {
      console.log("📭 No chat history found to delete for user:", userId);
      return res.json({ 
        message: "No chat history found to delete",
        userId
      });
    }
    
    return res.json({ 
      message: "Chat history cleared successfully",
      userId,
      clearedFrom: {
        database: clearedFromDatabase,
        memory: clearedFromMemory
      }
    });
    
  } catch (err) {
    console.error("❌ Error clearing chat history:", err);
    return res.status(500).json({ 
      error: "Failed to clear chat history",
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

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
  console.log(`💬 Chat endpoint: http://localhost:${PORT}/api/chat`);
  console.log(`📖 Get chat history: http://localhost:${PORT}/api/chat/:userId`);
  console.log(`🗑️ Clear chat history: http://localhost:${PORT}/api/chat/:userId`);
});