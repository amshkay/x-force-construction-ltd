/**
 * Centralized Application & Environment Configuration
 *
 * Provides safe getters for environment variables with type validation.
 * Ensures client code NEVER accesses server-side secrets.
 */

export interface AppConfig {
  name: string;
  version: string;
  environment: 'development' | 'production' | 'test';
  isProduction: boolean;
  isDevelopment: boolean;
  supabase: {
    url: string;
    anonKey: string;
    isConfigured: boolean;
  };
  pwa: {
    enabled: boolean;
    syncIntervalMs: number;
  };
  features: {
    demoDataNotice: boolean;
    darkMode: boolean;
    offlineDrafts: boolean;
  };
}

const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) ? (import.meta as any).env : (typeof process !== 'undefined' ? process.env : {});
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';
const isProd = Boolean(env.PROD || env.NODE_ENV === 'production');

let isRemoteDbOnline = true;
let hasReportedOffline = false;

export function isRemoteDbAvailable(): boolean {
  return isRemoteDbOnline;
}

export function markRemoteDbUnavailable(error?: any): void {
  if (isRemoteDbOnline) {
    isRemoteDbOnline = false;
    if (!hasReportedOffline) {
      hasReportedOffline = true;
      const msg = error ? (error.message || String(error)) : 'Endpoint unreachable';
      console.info(
        `[Database] Remote database is unreachable or offline (${msg}). Seamlessly operating in offline-first local mode.`
      );
    }
  }
}

export const appConfig: AppConfig = {
  name: 'XFORCE Construction Management & Customer Platform',
  version: '1.0.0',
  environment: isProd ? 'production' : 'development',
  isProduction: isProd,
  isDevelopment: !isProd,
  supabase: {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    get isConfigured(): boolean {
      if (
        !supabaseUrl ||
        !supabaseAnonKey ||
        supabaseUrl.includes('your-project') ||
        supabaseUrl.includes('placeholder') ||
        supabaseUrl.includes('pqschhenngvbthxutrup')
      ) {
        return false;
      }
      return isRemoteDbOnline;
    },
    set isConfigured(val: boolean) {
      isRemoteDbOnline = val;
    },
  },
  pwa: {
    enabled: true,
    syncIntervalMs: 30000,
  },
  features: {
    demoDataNotice: true,
    darkMode: true,
    offlineDrafts: true,
  },
};
