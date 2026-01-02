/**
 * Centralized API Configuration
 * 
 * This file provides environment-aware API base URL configuration.
 * 
 * Usage:
 * - Local development: Set NEXT_PUBLIC_API_URL=http://localhost:5000 in .env
 * - Production: Set NEXT_PUBLIC_API_URL=https://your-backend-domain.com in Vercel
 * - If not set, defaults to empty string (same-origin requests)
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || ""

/**
 * Helper function to build API URLs
 * @param endpoint - API endpoint path (e.g., '/api/auth/login')
 * @returns Full API URL or relative path if API_BASE_URL is empty
 */
export const getApiUrl = (endpoint: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  
  if (API_BASE_URL) {
    // Remove trailing slash from base URL if present
    const cleanBaseUrl = API_BASE_URL.endsWith('/') 
      ? API_BASE_URL.slice(0, -1) 
      : API_BASE_URL
    return `${cleanBaseUrl}${cleanEndpoint}`
  }
  
  // If no base URL is set, return relative path (same-origin)
  return cleanEndpoint
}

