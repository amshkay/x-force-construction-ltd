/**
 * Sync Engine React Hook
 * Module 22 — Offline-First PWA & Synchronization
 * XFORCE Construction Ltd / X-FORCE BRICKS
 */

import { useState, useEffect } from 'react';
import { syncEngine } from '../services/sync/syncEngine';
import { SyncEngineStatus, SyncConflictDetails, SyncQueueItem } from '../types/sync';
import { indexedDb } from '../lib/storage/indexedDb';

export function useSyncEngine() {
  const [status, setStatus] = useState<SyncEngineStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    syncingCount: 0,
    failedCount: 0,
    conflictCount: 0,
    lastSyncedAt: null,
    lastError: null,
  });

  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);
  const [conflicts, setConflicts] = useState<SyncConflictDetails[]>([]);

  useEffect(() => {
    const refreshData = async () => {
      const currentStatus = await syncEngine.getStatus();
      setStatus(currentStatus);
      const items = await indexedDb.getSyncQueueItems();
      setQueueItems(items);
      const conflictList = await indexedDb.getConflicts();
      setConflicts(conflictList);
    };

    refreshData();
    const unsubscribe = syncEngine.subscribe((newStatus) => {
      setStatus(newStatus);
      refreshData();
    });

    return () => unsubscribe();
  }, []);

  const syncNow = async () => {
    return syncEngine.syncNow();
  };

  const resolveConflict = async (
    conflictId: string,
    resolution: 'resolved_server' | 'resolved_local' | 'resolved_discarded',
    resolvedBy: string,
    note?: string
  ) => {
    return syncEngine.resolveConflict(conflictId, resolution, resolvedBy, note);
  };

  const purgeSynced = async () => {
    return syncEngine.purgeSyncedItems();
  };

  return {
    status,
    queueItems,
    conflicts,
    syncNow,
    resolveConflict,
    purgeSynced,
    isOnline: status.isOnline,
    isSyncing: status.isSyncing,
    pendingCount: status.pendingCount,
    failedCount: status.failedCount,
    conflictCount: status.conflictCount,
  };
}
