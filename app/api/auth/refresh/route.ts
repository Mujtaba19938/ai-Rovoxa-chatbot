import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token required" },
        { status: 401 }
      );
    }

    // Validate environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("❌ [REFRESH] Supabase credentials missing");
      return NextResponse.json(
        {
          error: "Authentication service unavailable",
          code: "AUTH_SERVICE_UNAVAILABLE",
          details: "Supabase configuration missing"
        },
        { status: 503 }
      );
    }

    // Create Supabase client for user authentication
    const authSupabase = createClient(supabaseUrl, supabaseAnonKey);

    // Refresh session with Supabase
    const { data, error } = await authSupabase.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error || !data.session) {
      console.error("❌ [REFRESH] Token refresh failed:", error?.message);
      return NextResponse.json(
        { error: "Invalid refresh token" },
        { status: 401 }
      );
    }

    // Get user info
    const user = data.user;
    const userInfo = {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      created_at: user.created_at
    };

    return NextResponse.json({
      success: true,
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: userInfo
    });

  } catch (err: any) {
    console.error("❌ [REFRESH] Error:", err);
    return NextResponse.json(
      {
        error: "Invalid refresh token",
        details: err.message || "Unknown error"
      },
      { status: 401 }
    );
  }
}

