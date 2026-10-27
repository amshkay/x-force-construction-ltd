/**
 * IndexedDB Local Persistence Engine
 * Module 22 — Offline-First PWA & Synchronization
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Provides a structured, versioned, asynchronous storage layer for offline caching,
 * durable synchronization outbox, conflict tracking, and offline media blobs.
 */

import { SyncQueueItem, SyncConflictDetails } from '../../types/sync';
import { localStore } from './localStorage';

const DB_NAME = 'xforce_offline_db';
const DB_VERSION = 1;

export const IDB_STORES = {
  SYNC_QUEUE: 'sync_queue',
  SYNC_CONFLICTS: 'sync_conflicts',
  CACHED_PRODUCTS: 'cached_products',
  CACHED_INVENTORY: 'cached_inventory',
  CACHED_CUSTOMERS: 'cached_customers',
  CACHED_ORDERS: 'cached_orders',
  CACHED_WAREHOUSE_TASKS: 'cached_warehouse_tasks',
  CACHED_INSTALLATIONS: 'cached_installations',
  OFFLINE_MEDIA: 'offline_media',
  CACHE_METADATA: 'cache_metadata',
} as const;

export type IdbStoreName = (typeof IDB_STORES)[keyof typeof IDB_STORES];

class IndexedDbEngine {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private isSupported: boolean;

  constructor() {
    this.isSupported = typeof window !== 'undefined' && 'indexedDB' in window;
  }

  /**
   * Initializes or returns the opened IndexedDB database connection
   */
  private async getDb(): Promise<IDBDatabase | null> {
    if (!this.isSupported) return null;

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve) => {
        try {
          const request = window.indexedDB.open(DB_NAME, DB_VERSION);

          request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            // 1. Sync Queue Store (outbox)
            if (!db.objectStoreNames.contains(IDB_STORES.SYNC_QUEUE)) {
              const queueStore = db.createObjectStore(IDB_STORES.SYNC_QUEUE, { keyPath: 'operationId' });
              queueStore.createIndex('status', 'status', { unique: false });
              queueStore.createIndex('createdAt', 'createdAt', { unique: false });
              queueStore.createIndex('entityType', 'entityType', { unique: false });
            }

            // 2. Conflict Records Store
            if (!db.objectStoreNames.contains(IDB_STORES.SYNC_CONFLICTS)) {
              const conflictStore = db.createObjectStore(IDB_STORES.SYNC_CONFLICTS, { keyPath: 'conflictId' });
              conflictStore.createIndex('status', 'status', { unique: false });
              conflictStore.createIndex('detectedAt', 'detectedAt', { unique: false });
            }

            // 3. Operational Entity Cache Stores
            const simpleEntityStores = [
              IDB_STORES.CACHED_PRODUCTS,
              IDB_STORES.CACHED_INVENTORY,
              IDB_STORES.CACHED_CUSTOMERS,
              IDB_STORES.CACHED_ORDERS,
              IDB_STORES.CACHED_WAREHOUSE_TASKS,
              IDB_STORES.CACHED_INSTALLATIONS,
              IDB_STORES.OFFLINE_MEDIA,
              IDB_STORES.CACHE_METADATA,
            ];

            simpleEntityStores.forEach((storeName) => {
              if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: 'id' });
              }
            });
          };

          request.onsuccess = () => resolve(request.result);
          request.onerror = (e) => {
            console.warn('[IndexedDB] Failed to open database:', e);
            resolve(null);
          };
        } catch (err) {
          console.warn('[IndexedDB] Initialization exception:', err);
          resolve(null);
        }
      });
    }

    return this.dbPromise;
  }

  private getFallbackStore<T>(storeName: string): T[] {
    return localStore.get<T[]>(`idb_fallback_${storeName}`, []);
  }

  private setFallbackStore<T>(storeName: string, items: T[]): void {
    localStore.set(`idb_fallback_${storeName}`, items);
  }

  // --------------------------------------------------------------------------
  // GENERIC STORE OPERATIONS
  // --------------------------------------------------------------------------

  async get<T>(storeName: IdbStoreName, key: IDBValidKey): Promise<T | null> {
    const db = await this.getDb();
    if (!db) {
      const items = this.getFallbackStore<any>(storeName);
      const found = items.find((item) => item?.id === key || item?.operationId === key || item?.key === key);
      return (found as T) ?? null;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve((req.result as T) ?? null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  async getAll<T>(storeName: IdbStoreName): Promise<T[]> {
    const db = await this.getDb();
    if (!db) {
      return this.getFallbackStore<T>(storeName);
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result as T[]) || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  async put<T>(storeName: IdbStoreName, value: T): Promise<boolean> {
    const db = await this.getDb();
    if (!db) {
      const items = this.getFallbackStore<any>(storeName);
      const val = value as any;
      const key = val?.operationId || val?.id || val?.key;
      const idx = key ? items.findIndex((it) => it?.operationId === key || it?.id === key || it?.key === key) : -1;
      if (idx >= 0) {
        items[idx] = val;
      } else {
        items.push(val);
      }
      this.setFallbackStore(storeName, items);
      return true;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(value);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  async putBulk<T>(storeName: IdbStoreName, items: T[]): Promise<boolean> {
    const db = await this.getDb();
    if (!db || items.length === 0) {
      if (items.length > 0) {
        const storeItems = this.getFallbackStore<any>(storeName);
        for (const item of items) {
          const val = item as any;
          const key = val?.operationId || val?.id || val?.key;
          const idx = key ? storeItems.findIndex((it) => it?.operationId === key || it?.id === key || it?.key === key) : -1;
          if (idx >= 0) storeItems[idx] = val;
          else storeItems.push(val);
        }
        this.setFallbackStore(storeName, storeItems);
        return true;
      }
      return false;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        items.forEach((item) => store.put(item));
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  async delete(storeName: IdbStoreName, key: IDBValidKey): Promise<boolean> {
    const db = await this.getDb();
    if (!db) {
      const items = this.getFallbackStore<any>(storeName);
      const filtered = items.filter((it) => it?.id !== key && it?.operationId !== key && it?.key !== key);
      this.setFallbackStore(storeName, filtered);
      return true;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  async clear(storeName: IdbStoreName): Promise<boolean> {
    const db = await this.getDb();
    if (!db) {
      this.setFallbackStore(storeName, []);
      return true;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.clear();
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  async count(storeName: IdbStoreName): Promise<number> {
    const db = await this.getDb();
    if (!db) {
      return this.getFallbackStore(storeName).length;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.count();
        req.onsuccess = () => resolve(req.result || 0);
        req.onerror = () => resolve(0);
      } catch {
        resolve(0);
      }
    });
  }

  // --------------------------------------------------------------------------
  // SYNC QUEUE SPECIFIC HELPERS
  // --------------------------------------------------------------------------

  async getSyncQueueItems(): Promise<SyncQueueItem[]> {
    const items = await this.getAll<SyncQueueItem>(IDB_STORES.SYNC_QUEUE);
    // Sort oldest first for FIFO execution
    return items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async saveQueueItem(item: SyncQueueItem): Promise<boolean> {
    return this.put<SyncQueueItem>(IDB_STORES.SYNC_QUEUE, item);
  }

  async deleteQueueItem(operationId: string): Promise<boolean> {
    return this.delete(IDB_STORES.SYNC_QUEUE, operationId);
  }

  async getConflicts(): Promise<SyncConflictDetails[]> {
    const conflicts = await this.getAll<SyncConflictDetails>(IDB_STORES.SYNC_CONFLICTS);
    return conflicts.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
  }

  async saveConflict(conflict: SyncConflictDetails): Promise<boolean> {
    return this.put<SyncConflictDetails>(IDB_STORES.SYNC_CONFLICTS, conflict);
  }

  async deleteConflict(conflictId: string): Promise<boolean> {
    return this.delete(IDB_STORES.SYNC_CONFLICTS, conflictId);
  }

  /**
   * Module 23: Security of Local Cache after Logout (Section 34)
   * Wipes private, user-specific cached operational records (customers, orders, tasks, installations, conflicts)
   * while preserving public, reusable product catalogue data.
   */
  async clearSensitivePrivateCaches(): Promise<void> {
    await Promise.all([
      this.clear(IDB_STORES.CACHED_CUSTOMERS),
      this.clear(IDB_STORES.CACHED_ORDERS),
      this.clear(IDB_STORES.CACHED_WAREHOUSE_TASKS),
      this.clear(IDB_STORES.CACHED_INSTALLATIONS),
      this.clear(IDB_STORES.SYNC_CONFLICTS),
    ]);
  }
}

export const indexedDb = new IndexedDbEngine();
