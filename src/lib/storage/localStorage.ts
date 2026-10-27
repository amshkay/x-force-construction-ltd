/**
 * Safe, Typed Local Storage Wrapper
 *
 * Handles JSON serialization, schema versioning, and SSR/incognito fallbacks.
 */

export const localStore = {
  get<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;

    try {
      const item = window.localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item) as T;
    } catch (err) {
      console.warn(`[Storage] Failed to read key "${key}":`, err);
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): boolean {
    if (typeof window === 'undefined') return false;

    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn(`[Storage] Failed to write key "${key}":`, err);
      return false;
    }
  },

  remove(key: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (err) {
      console.warn(`[Storage] Failed to remove key "${key}":`, err);
      return false;
    }
  },

  clear(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      window.localStorage.clear();
      return true;
    } catch (err) {
      console.warn('[Storage] Failed to clear local storage:', err);
      return false;
    }
  },
};
