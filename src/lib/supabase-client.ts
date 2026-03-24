import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log('Supabase config:', {
  url: supabaseUrl,
  anonKeyLength: supabaseAnonKey?.length || 0,
  anonKeyPrefix: supabaseAnonKey?.substring(0, 20) || 'undefined'
});

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Supabase client for client-side operations.
 * This client respects Row Level Security (RLS) and is safe for browser use.
 * Use this for authentication, user data access, and frontend operations.
 */
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});