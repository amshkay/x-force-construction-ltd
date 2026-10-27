import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { appConfig } from '../../config/app.config';
import { Database } from '../../types/database';

let clientInstance: SupabaseClient<Database> | null = null;

/**
 * Get the browser-safe Supabase client singleton.
 * Uses only VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
 *
 * If credentials are not yet populated in .env, provides a mock-safe fallback
 * client to ensure local UI testing without unhandled exceptions.
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (clientInstance) {
    return clientInstance;
  }

  const { url, anonKey, isConfigured } = appConfig.supabase;

  if (!isConfigured) {
    // Provide safe development fallback client to prevent module initialization crashes
    // while development environment secrets are being configured
    clientInstance = createClient<Database>(
      url || 'https://placeholder.supabase.co',
      anonKey || 'placeholder-anon-key',
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      }
    );
    return clientInstance;
  }

  clientInstance = createClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return clientInstance;
}

export { isRemoteDbAvailable, markRemoteDbUnavailable } from '../../config/app.config';

/**
 * Checks if an error represents an unreachable host, DNS failure, network timeout,
 * or browser fetch exception (TypeError: Failed to fetch).
 */
export function isNetworkOrFetchError(error: any): boolean {
  if (!error) return false;
  const msg = typeof error === 'string' ? error : (error.message || '');
  const details = typeof error.details === 'string' ? error.details : '';
  const str = `${msg} ${details}`.toLowerCase();
  return (
    str.includes('failed to fetch') ||
    str.includes('fetch failed') ||
    str.includes('networkerror') ||
    str.includes('network error') ||
    str.includes('load failed') ||
    str.includes('enotfound') ||
    str.includes('could not resolve') ||
    str.includes('connection refused') ||
    (error as any).status === 0
  );
}

/**
 * Checks if an error represents a database relation that does not exist in the schema cache.
 */
export function isTableMissingError(error: any, tableName?: string): boolean {
  if (!error) return false;
  const msg = typeof error.message === 'string' ? error.message : '';
  const code = error.code;
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('in the schema cache') ||
    msg.includes('Could not find the table') ||
    (tableName ? msg.includes(`relation "${tableName}" does not exist`) : false) ||
    msg.includes('does not exist')
  );
}

export const supabase = getSupabaseClient();
