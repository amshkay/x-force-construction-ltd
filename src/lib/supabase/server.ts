import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/database';

let serverClientInstance: SupabaseClient<Database> | null = null;

/**
 * Server-Side Supabase Admin Client
 *
 * CRITICAL SECURITY INSTRUCTION:
 * - This function MUST ONLY be called from server-side environments (Node.js, Express, Vercel Serverless).
 * - It requires SUPABASE_SERVICE_ROLE_KEY which bypasses Row Level Security.
 * - This function will throw an immediate error if executed within a browser context.
 */
export function getSupabaseAdminClient(): SupabaseClient<Database> {
  // Prevent browser execution
  if (typeof window !== 'undefined') {
    throw new Error(
      '[CRITICAL SECURITY ERROR] getSupabaseAdminClient() called in client-side browser runtime. ' +
      'The SUPABASE_SERVICE_ROLE_KEY must NEVER be accessible to the client.'
    );
  }

  if (serverClientInstance) {
    return serverClientInstance;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase server environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.'
    );
  }

  serverClientInstance = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serverClientInstance;
}
