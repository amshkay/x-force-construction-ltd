import { SyncQueueItem } from '../../types/pwa';
import { STORAGE_KEYS } from '../../constants';
import { localStore } from './localStorage';

/**
 * Offline Action Queue Manager
 *
 * Prepares the synchronization queue for offline drafts, offline orders,
 * and offline stock adjustments.
 *
 * Note: Full sync execution engine will be implemented in subsequent modules.
 */
export const offlineQueue = {
  getItems(): SyncQueueItem[] {
    return localStore.get<SyncQueueItem[]>(STORAGE_KEYS.OFFLINE_QUEUE, []);
  },

  enqueue(action: string, payload: unknown): SyncQueueItem {
    const items = this.getItems();
    const newItem: SyncQueueItem = {
      id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      action,
      payload,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
    };

    items.push(newItem);
    localStore.set(STORAGE_KEYS.OFFLINE_QUEUE, items);
    return newItem;
  },

  updateStatus(id: string, status: 'pending' | 'syncing' | 'failed', error?: string): void {
    const items = this.getItems();
    const index = items.findIndex((i) => i.id === id);
    if (index !== -1) {
      items[index].status = status;
      if (error) items[index].error = error;
      if (status === 'failed') items[index].retries += 1;
      localStore.set(STORAGE_KEYS.OFFLINE_QUEUE, items);
    }
  },

  remove(id: string): void {
    const items = this.getItems();
    const filtered = items.filter((i) => i.id !== id);
    localStore.set(STORAGE_KEYS.OFFLINE_QUEUE, filtered);
  },

  clear(): void {
    localStore.set(STORAGE_KEYS.OFFLINE_QUEUE, []);
  },

  countPending(): number {
    return this.getItems().filter((i) => i.status === 'pending').length;
  },
};
