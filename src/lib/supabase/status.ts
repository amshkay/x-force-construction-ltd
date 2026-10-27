import { appConfig } from '../../config/app.config';
import { getSupabaseClient } from './client';

export interface SupabaseConnectionStatus {
  isConfigured: boolean;
  isConnected: boolean;
  url: string;
  hasAnonKey: boolean;
  latencyMs: number | null;
  errorMessage: string | null;
  mode: 'live_supabase' | 'development_mock';
  verifiedAt: string;
}

/**
 * Checks connection health to the configured Supabase instance.
 * Safe to execute in both browser and development preview modes.
 */
export async function checkSupabaseConnection(): Promise<SupabaseConnectionStatus> {
  const { url, anonKey, isConfigured } = appConfig.supabase;
  const verifiedAt = new Date().toISOString();

  if (!isConfigured) {
    return {
      isConfigured: false,
      isConnected: false,
      url: url || 'Not Configured',
      hasAnonKey: Boolean(anonKey),
      latencyMs: null,
      errorMessage: 'Supabase credentials are not set or are placeholder values.',
      mode: 'development_mock',
      verifiedAt,
    };
  }

  const startTime = performance.now();
  try {
    const supabase = getSupabaseClient();
    // Query public business settings as a lightweight health check ping
    const { error } = await supabase
      .from('business_settings')
      .select('id')
      .limit(1);

    const latencyMs = Math.round(performance.now() - startTime);

    if (error) {
      // Check if table not created yet vs network failure
      const isTableMissing =
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        error.message?.includes('relation "business_settings" does not exist') ||
        error.message?.includes('in the schema cache') ||
        error.message?.includes('Could not find the table');

      const isNetworkOrFetchFailure =
        error.message?.toLowerCase().includes('fetch failed') ||
        error.message?.toLowerCase().includes('failed to fetch') ||
        error.message?.toLowerCase().includes('network') ||
        error.message?.toLowerCase().includes('enotfound') ||
        (error as any).status === 0;

      const isActuallyConnected = !isNetworkOrFetchFailure && isTableMissing;

      return {
        isConfigured: true,
        isConnected: isActuallyConnected,
        url,
        hasAnonKey: true,
        latencyMs,
        errorMessage: isTableMissing
          ? 'Connected to Supabase, but database migrations have not been applied yet (table business_settings missing).'
          : error.message,
        mode: isActuallyConnected ? 'live_supabase' : 'development_mock',
        verifiedAt,
      };
    }

    return {
      isConfigured: true,
      isConnected: true,
      url,
      hasAnonKey: true,
      latencyMs,
      errorMessage: null,
      mode: 'live_supabase',
      verifiedAt,
    };
  } catch (err) {
    return {
      isConfigured: true,
      isConnected: false,
      url,
      hasAnonKey: true,
      latencyMs: null,
      errorMessage: err instanceof Error ? err.message : 'Failed to connect to Supabase endpoint',
      mode: 'development_mock',
      verifiedAt,
    };
  }
}
