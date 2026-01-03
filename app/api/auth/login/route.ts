import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Validate environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("❌ [LOGIN] Supabase credentials missing");
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

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await authSupabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      console.error("❌ [LOGIN] Authentication failed:", authError?.message);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Get user metadata
    const user = {
      id: authData.user.id,
      email: authData.user.email,
      name: authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || 'User',
      created_at: authData.user.created_at
    };

    console.log("✅ [LOGIN] User logged in:", email);

    return NextResponse.json({
      success: true,
      message: "Login successful",
      user: user,
      token: authData.session?.access_token,
      refreshToken: authData.session?.refresh_token
    });

  } catch (err: any) {
    console.error("❌ [LOGIN] Error:", err);
    return NextResponse.json(
      {
        error: "Login failed",
        details: err.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}

