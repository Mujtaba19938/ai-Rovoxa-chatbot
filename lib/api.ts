/**
 * Centralized API Configuration
 * 
 * Vercel-compatible: All API routes are now Next.js API routes (serverless)
 * No Express server needed - all routes use relative paths
 * 
 * Usage:
 * - All environments: Use relative paths (e.g., '/api/auth/login')
 * - No NEXT_PUBLIC_API_URL needed anymore
 */

export const API_BASE_URL = "" // Always use relative paths for Next.js API routes

/**
 * Helper function to build API URLs
 * @param endpoint - API endpoint path (e.g., '/api/auth/login')
 * @returns Relative path (Next.js API route)
 */
export const getApiUrl = (endpoint: string): string => {
  // Ensure endpoint starts with /
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  // Always return relative path for Next.js API routes
  return cleanEndpoint
}

