// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-server";
import { supabase } from "@/lib/supabase-server";
import { generateResponse, MODEL_NAME } from "@/lib/gemini-server";
import { getWebResults, shouldTriggerWebSearch, formatSearchResults } from "@/lib/web-search-server";
import { getWeatherData, shouldTriggerWeatherSearch, extractLocationFromMessage, formatWeatherResults } from "@/lib/weather-server";
import { generateUUID, isValidUUID } from "@/lib/uuid-utils";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error("❌ [CHAT] JSON parsing error:", jsonError);
      return NextResponse.json(
        {
          error: "Invalid JSON in request body",
          code: "INVALID_JSON"
        },
        { status: 400 }
      );
    }

    const { message, chatId } = body;

    // Validate input
    if (!message || typeof message !== "string" || message.trim() === "") {
      console.log("❌ [CHAT] Invalid message:", message);
      return NextResponse.json(
        {
          error: "Message is required and must be a non-empty string"
        },
        { status: 400 }
      );
    }

    // Authenticate request
    const user = await authenticateRequest(request);
    const userId = user.id;

    console.log("📨 [CHAT] Received chat request:", {
      userId,
      chatId,
      messageLength: message?.length
    });

    // Get conversation context from Supabase
    let conversationContext = "";
    let existingChat = null;
    
    try {
      if (chatId && isValidUUID(chatId)) {
        const { data: chatData, error: chatError } = await (supabase as any)
          .from('chats')
          .select('id')
          .eq('id', chatId)
          .eq('user_id', userId)
          .single();

        if (chatData && !chatError) {
          existingChat = chatData as any;

          // Get last 10 messages for context
          const { data: messages, error: messagesError } = await (supabase as any)
            .from('messages')
            .select('role, content')
            .eq('chat_id', (chatData as any).id)
            .order('created_at', { ascending: true })
            .limit(10);

          if (messages && messages.length > 0) {
            conversationContext = messages.map((msg: any) =>
              `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
            ).join('\n');
          }
        }
      }
    } catch (contextError) {
      console.error("❌ [CHAT] Error getting conversation context:", contextError);
    }

    // Check if we should trigger weather search FIRST
    let weatherResults = null;
    let weatherLocation = null;
    let isWeatherQuery = false;

    if (shouldTriggerWeatherSearch(message)) {
      console.log('🌤️ [CHAT] Message contains weather keywords');
      weatherLocation = extractLocationFromMessage(message);

      if (weatherLocation) {
        console.log('🌤️ [CHAT] Location detected:', weatherLocation);
        weatherResults = await getWeatherData(weatherLocation);

        if (weatherResults.success) {
          console.log('✅ [CHAT] Weather data retrieved');
          isWeatherQuery = true;
        }
      }
    }

    // Check if we should trigger web search (only if not a weather query)
    let webSearchResults = null;
    let searchQuery = null;

    if (!isWeatherQuery && shouldTriggerWebSearch(message)) {
      console.log('🔍 [CHAT] Message contains search keywords, triggering web search');
      searchQuery = message;
      webSearchResults = await getWebResults(searchQuery);

      if (webSearchResults.success && webSearchResults.results.length > 0) {
        console.log('✅ [CHAT] Web search successful');
      }
    }

    // Create enhanced prompt with context
    let enhancedPrompt = message;
    let hasExternalData = false;

    // Add weather data if available
    if (weatherResults && weatherResults.success) {
      const weatherContext = `\n\nHere is the current weather data for ${weatherLocation}:\n${formatWeatherResults(weatherResults)}\n\nPlease use this live weather information to provide an accurate response.`;
      enhancedPrompt = `User message: ${message}${weatherContext}`;
      hasExternalData = true;
    } else if (webSearchResults && webSearchResults.success && webSearchResults.results.length > 0) {
      // Include web search results in the prompt
      const searchContext = `\n\nHere are the latest web search results for "${searchQuery}":\n${formatSearchResults(webSearchResults)}\n\nPlease use this information to provide an accurate and up-to-date response.`;
      enhancedPrompt = `User message: ${message}${searchContext}`;
      hasExternalData = true;
    } else if (conversationContext && !hasExternalData) {
      enhancedPrompt = `Previous conversation context:\n${conversationContext}\n\nCurrent user message: ${message}\n\nPlease respond naturally, remembering the context of our conversation.`;
    }

    // Generate response using Gemini
    const result = await generateResponse(enhancedPrompt);

    if (!result.success) {
      console.error("❌ [CHAT] Gemini API error:", result.error);
      return NextResponse.json(
        {
          error: "Failed to generate response",
          details: result.error,
          model: MODEL_NAME
        },
        { status: 502 }
      );
    }

    const aiResponse = result.reply || "";
    if (!aiResponse) {
      throw new Error("Empty response from AI");
    }
    console.log("✅ [CHAT] Generated response:", aiResponse.substring(0, 50) + "...");

    // Store messages in Supabase
    let savedChatId = chatId;

    // Validate UUID format
    if (savedChatId && !isValidUUID(savedChatId)) {
      console.warn("⚠️ [CHAT SAVE] Invalid UUID format for chatId, generating new UUID");
      savedChatId = generateUUID();
    } else if (!savedChatId) {
      savedChatId = generateUUID();
    }

    console.log("🔍 [CHAT SAVE] Using chatId (UUID format):", savedChatId);

    try {
      // Use existing chat or create new one
      let chat = existingChat;

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
            let titleWords: string[] = [];
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

        console.log("🔍 [CHAT SAVE] Creating new chat:", {
          id: savedChatId,
          userId: userId,
          title: chatTitle
        });

        const { data: newChat, error: createError } = await (supabase as any)
          .from('chats')
          .insert({
            id: savedChatId,
            user_id: userId,
            title: chatTitle
          })
          .select()
          .single();

        if (createError) {
          console.error("❌ [CHAT SAVE] Error creating chat:", {
            message: createError.message,
            code: createError.code,
            details: createError.details
          });
          throw createError;
        }

        if (!newChat) {
          throw new Error("Chat creation returned no data");
        }

        chat = newChat as any;
        savedChatId = (newChat as any).id;
        console.log("✅ [CHAT SAVE] Created new chat with ID:", savedChatId);
      }

      // Insert user message
      console.log("🔍 [CHAT SAVE] Inserting user message");
      if (!chat) {
        throw new Error("Chat is null");
      }
      const { error: userMsgError } = await (supabase as any)
        .from('messages')
        .insert({
          chat_id: chat.id,
          role: 'user',
          content: message
        });

      if (userMsgError) {
        console.error("❌ [CHAT SAVE] Error inserting user message:", userMsgError);
        throw userMsgError;
      }

      console.log("✅ [CHAT SAVE] User message inserted");

      // Insert AI response
      console.log("🔍 [CHAT SAVE] Inserting AI message");
      if (!chat) {
        throw new Error("Chat is null");
      }
      const { error: aiMsgError } = await (supabase as any)
        .from('messages')
        .insert({
          chat_id: chat.id,
          role: 'assistant',
          content: aiResponse
        });

      if (aiMsgError) {
        console.error("❌ [CHAT SAVE] Error inserting AI message:", aiMsgError);
        throw aiMsgError;
      }

      console.log("✅ [CHAT SAVE] AI message inserted");

      // Update chat updated_at timestamp
      if (!chat) {
        throw new Error("Chat is null");
      }
      await (supabase as any)
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chat.id);

      console.log("✅ [CHAT SAVE] All messages saved to Supabase");

    } catch (dbError: any) {
      console.error("❌ [CHAT SAVE] Database error saving messages:", {
        message: dbError.message,
        code: dbError.code,
        details: dbError.details
      });
      // Continue to return response even if save fails
    }

    // Return response (streaming format for AI SDK)
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const data = `0:${JSON.stringify(aiResponse)}\n`;
        controller.enqueue(encoder.encode(data));
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    // Handle authentication errors
    if (error.status) {
      return NextResponse.json(
        {
          error: error.error,
          code: error.code,
          details: error.details
        },
        { status: error.status }
      );
    }

    // Handle unexpected errors
    console.error("❌ [CHAT] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate response",
        details: error.message || "Unknown error",
        model: MODEL_NAME
      },
      { status: 500 }
    );
  }
}
