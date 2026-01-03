import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth-server";

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        created_at: user.created_at
      }
    });

  } catch (error: any) {
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

    console.error("❌ [AUTH ME] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to get user info",
        details: error.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}

