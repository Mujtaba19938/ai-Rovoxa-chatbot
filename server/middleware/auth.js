/**
 * Supabase Authentication Middleware
 * Uses Supabase Auth to verify user tokens
 */

import { supabase } from "../lib/supabase.js";
export const authenticateToken = async (req, res, next) => {
  try {
    console.log("🔐 [AUTH] Middleware called");
    
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      console.error("❌ [AUTH] No authorization header");
      return res.status(401).json({
        error: "Access token required",
        code: "NO_TOKEN"
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      console.error("❌ [AUTH] Empty token after Bearer removal");
      return res.status(401).json({
        error: "Invalid authorization header format",
        code: "INVALID_HEADER"
      });
    }

    console.log("🔐 [AUTH] Token extracted, length:", token.length);

    // Validate Supabase env vars before attempting auth
    if (!process.env.SUPABASE_URL) {
      console.error("❌ [AUTH] SUPABASE_URL missing");
      return res.status(503).json({
        error: "Authentication service unavailable",
        code: "AUTH_SERVICE_UNAVAILABLE",
        details: "Supabase configuration missing"
      });
    }

    // Verify token with Supabase
    console.log("🔐 [AUTH] Verifying token with Supabase");
    const { data, error } = await supabase.auth.getUser(token);

    if (error) {
      console.error("❌ [AUTH] Token verification failed:", error.message);
      return res.status(401).json({
        error: "Invalid or expired token",
        code: "INVALID_TOKEN",
        details: error.message
      });
    }

    if (!data || !data.user) {
      console.error("❌ [AUTH] No user data returned from Supabase");
      return res.status(401).json({
        error: "Invalid or expired token",
        code: "INVALID_TOKEN",
        details: "User not found in token"
      });
    }

    // Attach user to request
    req.user = {
      id: data.user.id,
      email: data.user.email,
      ...data.user
    };

    console.log("✅ [AUTH] Token verified, user ID:", req.user.id);
    next();
  } catch (error) {
    console.error("❌ [AUTH] Middleware exception:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return res.status(500).json({
      error: "Authentication error",
      code: "AUTH_ERROR",
      details: process.env.NODE_ENV === 'development' ? error.message : "Authentication service error"
    });
  }
};

