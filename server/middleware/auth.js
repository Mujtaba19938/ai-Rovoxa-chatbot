/**
 * Supabase Authentication Middleware
 * Uses Supabase Auth to verify user tokens
 */

import { supabase } from "../lib/supabase.js";
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: "Access token required",
        code: "NO_TOKEN"
      });
    }

    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        error: "Invalid authorization header format",
        code: "INVALID_HEADER"
      });
    }

    // Verify token with Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        error: "Invalid or expired token",
        code: "INVALID_TOKEN"
      });
    }

    // Attach user to request
    req.user = {
      id: data.user.id,
      email: data.user.email,
      ...data.user
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      error: "Authentication error",
      code: "AUTH_ERROR"
    });
  }
};

