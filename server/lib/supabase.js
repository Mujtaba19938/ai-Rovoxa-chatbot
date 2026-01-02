/**
 * Supabase Client Configuration
 * Server-side only - uses service role key for admin operations
 * 
 * Lazy-loads the client to ensure environment variables are loaded first
 */

import { createClient } from "@supabase/supabase-js";

let supabaseClient = null;

function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  if (!process.env.SUPABASE_URL) {
    throw new Error("SUPABASE_URL is required in environment variables");
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required in environment variables");
  }

  supabaseClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  return supabaseClient;
}

// Export a getter that creates the client on first access
export const supabase = new Proxy({}, {
  get(target, prop) {
    const client = getSupabaseClient();
    const value = client[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

