import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Validate environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("❌ [REGISTER] Supabase credentials missing");
      return NextResponse.json(
        {
          error: "Registration service unavailable",
          code: "SERVICE_UNAVAILABLE",
          details: "Supabase configuration missing"
        },
        { status: 503 }
      );
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
        return NextResponse.json(
          { error: "User with this email already exists" },
          { status: 409 }
        );
      }
      console.error("❌ [REGISTER] Supabase error:", authError);
      return NextResponse.json(
        {
          error: "Registration failed",
          details: authError.message
        },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    console.log("✅ [REGISTER] New user registered:", email);

    return NextResponse.json(
      {
        success: true,
        message: "User registered successfully. Please login to get your access token.",
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name: name,
          created_at: authData.user.created_at
        }
      },
      { status: 201 }
    );

  } catch (err: any) {
    console.error("❌ [REGISTER] Error:", err);
    return NextResponse.json(
      {
        error: "Registration failed",
        details: err.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}

