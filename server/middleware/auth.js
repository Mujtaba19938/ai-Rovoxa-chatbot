import jwt from "jsonwebtoken";
import User from "../models/User.js";
import memoryStore from "../utils/memory-store.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: "Access token required",
        code: "NO_TOKEN"
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database or memory store
    let user;
    try {
      // Try MongoDB first
      user = await User.findById(decoded.userId).select('-password');
    } catch (error) {
      // Fallback to memory store
      user = await memoryStore.findUserById(decoded.userId);
      if (user) {
        // Remove password from memory store user
        const { password, ...userWithoutPassword } = user;
        user = userWithoutPassword;
      }
    }
    
    if (!user) {
      return res.status(401).json({ 
        error: "Invalid token - user not found",
        code: "USER_NOT_FOUND"
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: "Invalid token",
        code: "INVALID_TOKEN"
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: "Token expired",
        code: "TOKEN_EXPIRED"
      });
    }

    console.error("Auth middleware error:", error);
    return res.status(500).json({ 
      error: "Authentication error",
      code: "AUTH_ERROR"
    });
  }
};

export const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};
