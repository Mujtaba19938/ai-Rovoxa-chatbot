/**
 * Server-side Authentication Utilities for Next.js API Routes
 * Replaces Express middleware
 */

import { supabase } from "./supabase-server";
import { NextRequest } from "next/server";

export interface AuthenticatedUser {
  id: string;
  email: string;
  [key: string]: any;
}

/**
 * Authenticate request and extract user from token
 * Returns user object or throws error with status code
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthenticatedUser> {
  console.log("🔐 [AUTH] Authenticating request");

  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    console.error("❌ [AUTH] No authorization header");
    throw {
      status: 401,
      error: "Access token required",
      code: "NO_TOKEN"
    };
  }

  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    console.error("❌ [AUTH] Empty token after Bearer removal");
    throw {
      status: 401,
      error: "Invalid authorization header format",
      code: "INVALID_HEADER"
    };
  }

  console.log("🔐 [AUTH] Token extracted, length:", token.length);

  // Validate Supabase env vars
  if (!process.env.SUPABASE_URL) {
    console.error("❌ [AUTH] SUPABASE_URL missing");
    throw {
      status: 503,
      error: "Authentication service unavailable",
      code: "AUTH_SERVICE_UNAVAILABLE",
      details: "Supabase configuration missing"
    };
  }

  // Verify token with Supabase
  console.log("🔐 [AUTH] Verifying token with Supabase");
  const { data, error } = await supabase.auth.getUser(token);

  if (error) {
    console.error("❌ [AUTH] Token verification failed:", error.message);
    throw {
      status: 401,
      error: "Invalid or expired token",
      code: "INVALID_TOKEN",
      details: error.message
    };
  }

  if (!data || !data.user) {
    console.error("❌ [AUTH] No user data returned from Supabase");
    throw {
      status: 401,
      error: "Invalid or expired token",
      code: "INVALID_TOKEN",
      details: "User not found in token"
    };
  }

  const user: AuthenticatedUser = {
    id: data.user.id,
    email: data.user.email || "",
    ...data.user
  };

  console.log("✅ [AUTH] Token verified, user ID:", user.id);
  return user;
}

