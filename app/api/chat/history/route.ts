import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-server";
import { supabase } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  console.log("🔍 [CHAT HISTORY] Request received");

  try {
    // Authenticate request
    const user = await authenticateRequest(request);
    const userId = user.id;

    console.log("🔍 [CHAT HISTORY] User ID extracted:", userId);

    // Validate Supabase environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("❌ [CHAT HISTORY] Supabase environment variables missing");
      return NextResponse.json(
        {
          error: "Database service unavailable",
          code: "DB_UNAVAILABLE",
          details: "Supabase configuration missing"
        },
        { status: 503 }
      );
    }

    console.log("🔍 [CHAT HISTORY] Supabase client available");

    // Test Supabase connection
    try {
      const { data: testData, error: testError } = await supabase
        .from('chats')
        .select('id')
        .limit(1);

      if (testError && testError.code === '42P01') {
        console.error("❌ [CHAT HISTORY] Table 'chats' does not exist");
        return NextResponse.json(
          {
            error: "Database table 'chats' does not exist",
            code: "TABLE_NOT_FOUND",
            details: "Please run the Supabase schema migration (supabase-schema.sql) in your Supabase SQL Editor"
          },
          { status: 503 }
        );
      }

      console.log("🔍 [CHAT HISTORY] Supabase connection test passed");
    } catch (testErr: any) {
      console.error("❌ [CHAT HISTORY] Supabase connection test failed:", testErr);
      return NextResponse.json(
        {
          error: "Database connection test failed",
          code: "DB_CONNECTION_TEST_FAILED",
          details: testErr.message
        },
        { status: 503 }
      );
    }

    // Fetch chats
    console.log("🔍 [CHAT HISTORY] Querying chats for user:", userId);

    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select('id, title, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (chatsError) {
      console.error("❌ [CHAT HISTORY] Database error fetching chats:", {
        message: chatsError.message,
        code: chatsError.code,
        details: chatsError.details,
        hint: chatsError.hint
      });

      if (chatsError.code === '42P01') {
        return NextResponse.json(
          {
            error: "Database table 'chats' does not exist",
            code: "TABLE_NOT_FOUND",
            details: "Please run the Supabase schema migration (supabase-schema.sql)"
          },
          { status: 503 }
        );
      }

      if (chatsError.code === '42501') {
        return NextResponse.json(
          {
            error: "Database permission denied",
            code: "RLS_PERMISSION_ERROR",
            details: "Service role should bypass RLS. Check Supabase configuration."
          },
          { status: 503 }
        );
      }

      if (chatsError.message?.includes('connect') || chatsError.message?.includes('timeout') || chatsError.message?.includes('ECONNREFUSED')) {
        return NextResponse.json(
          {
            error: "Database connection failed",
            code: "DB_CONNECTION_ERROR",
            details: chatsError.message
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        {
          error: "Failed to fetch chats",
          code: "DB_QUERY_ERROR",
          details: chatsError.message,
          errorCode: chatsError.code,
          hint: chatsError.hint
        },
        { status: 500 }
      );
    }

    console.log("🔍 [CHAT HISTORY] Chats query result:", {
      count: chats?.length || 0,
      hasData: !!chats
    });

    // Handle empty results
    if (!chats || chats.length === 0) {
      console.log("✅ [CHAT HISTORY] No chats found for user - returning empty array");
      return NextResponse.json({
        messages: [],
        chats: [],
        userId,
        source: "supabase",
        message: "No chat history found"
      });
    }

    // Fetch messages
    const chatIds = chats.map(chat => chat.id);
    console.log("🔍 [CHAT HISTORY] Fetching messages for chat IDs:", chatIds);

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, chat_id, role, content, created_at')
      .in('chat_id', chatIds)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error("❌ [CHAT HISTORY] Database error fetching messages:", {
        message: messagesError.message,
        code: messagesError.code,
        details: messagesError.details
      });

      return NextResponse.json(
        {
          error: "Failed to fetch messages",
          code: "DB_QUERY_ERROR",
          details: messagesError.message
        },
        { status: 500 }
      );
    }

    console.log("✅ [CHAT HISTORY] Success - returning:", {
      messagesCount: messages?.length || 0,
      chatsCount: chats.length
    });

    return NextResponse.json({
      messages: messages || [],
      chats: chats,
      userId,
      source: "supabase"
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
    console.error("❌ [CHAT HISTORY] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch chat history",
        details: error.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}

