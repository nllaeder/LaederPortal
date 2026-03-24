import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// During build time, environment variables might not be available
// Only throw error at runtime when actually trying to use the client
function getSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Supabase client initialized with the service role key.
 * This client bypasses Row Level Security (RLS) and should only be used
 * in secure server-side environments (like API routes or Cron jobs).
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop: keyof SupabaseClient) {
    const client = getSupabaseClient();
    const value = client[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});
