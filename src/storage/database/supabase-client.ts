import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

function getCredentials(): SupabaseCredentials {
  // Priority 1: Custom Supabase instance from environment variables
  if (process.env.SUPABASE_URL_CUSTOM && process.env.SUPABASE_ANON_KEY_CUSTOM) {
    return {
      url: process.env.SUPABASE_URL_CUSTOM,
      anonKey: process.env.SUPABASE_ANON_KEY_CUSTOM,
    };
  }

  // Priority 2: Platform-injected sandbox instance
  if (process.env.COZE_SUPABASE_URL && process.env.COZE_SUPABASE_ANON_KEY) {
    return {
      url: process.env.COZE_SUPABASE_URL,
      anonKey: process.env.COZE_SUPABASE_ANON_KEY,
    };
  }

  // Fallback: throw error with clear message
  throw new Error(
    'Supabase credentials not found. Please set SUPABASE_URL_CUSTOM and SUPABASE_ANON_KEY_CUSTOM environment variables.'
  );
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    const credentials = getCredentials();
    supabaseInstance = createClient(credentials.url, credentials.anonKey);
  }
  return supabaseInstance;
}

export default getSupabaseClient;
