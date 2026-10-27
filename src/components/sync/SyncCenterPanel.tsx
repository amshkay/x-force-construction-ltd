/**
 * Sync Center & Offline Diagnostics Panel
 * Module 22 — Offline-First PWA & Synchronization
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Operational synchronization command center for reviewing outbox items,
 * monitoring connection health, resolving stock/task conflicts, and managing offline cache.
 */

import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Database,
  Trash2,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Package,
  ShoppingCart,
  Wrench,
  Truck,
  Eye,
  X,
  Check,
  FileDown,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { useSyncEngine } from '../../hooks/useSyncEngine';
import { SyncQueueItem, SyncConflictDetails } from '../../types/sync';
import { indexedDb, IDB_STORES } from '../../lib/storage/indexedDb';

export const SyncCenterPanel: React.FC = () => {
  const toast = useToast();
  const { profile } = useAuth();
  const {
    status,
    queueItems,
    conflicts,
    syncNow,
    resolveConflict,
    purgeSynced,
    isOnline,
    isSyncing,
  } = useSyncEngine();

  const [activeTab, setActiveTab] = useState<'queue' | 'conflicts' | 'diagnostics'>('queue');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<SyncQueueItem | null>(null);
  const [selectedConflict, setSelectedConflict] = useState<SyncConflictDetails | null>(null);
  const [isHydrating, setIsHydrating] = useState<boolean>(false);

  // Cache counts
  const [cacheStats, setCacheStats] = useState<{
    products: number;
    inventory: number;
    tasks: number;
    installations: number;
  }>({
    products: 0,
    inventory: 0,
    tasks: 0,
    installations: 0,
  });

  useEffect(() => {
    loadCacheStats();
  }, [queueItems]);

  const loadCacheStats = async () => {
    const products = await indexedDb.count(IDB_STORES.CACHED_PRODUCTS);
    const inventory = await indexedDb.count(IDB_STORES.CACHED_INVENTORY);
    const tasks = await indexedDb.count(IDB_STORES.CACHED_WAREHOUSE_TASKS);
    const installations = await indexedDb.count(IDB_STORES.CACHED_INSTALLATIONS);
    setCacheStats({ products, inventory, tasks, installations });
  };

  const handleManualSync = async () => {
    if (!isOnline) {
      toast.showToast('Device is currently offline. Connect to internet to synchronize.', 'warning');
      return;
    }
    toast.showToast('Initiating synchronization with central database...', 'info');
    const result = await syncNow();
    if (result.conflicts > 0) {
      toast.showToast(`Sync completed with ${result.conflicts} conflict(s) requiring review.`, 'warning');
    } else if (result.failed > 0) {
      toast.showToast(`Sync finished: ${result.succeeded} succeeded, ${result.failed} failed.`, 'warning');
    } else {
      toast.showToast(`Sync finished successfully: ${result.succeeded} items updated.`, 'success');
    }
  };

  const handlePurge = async () => {
    const count = await purgeSynced();
    toast.showToast(`Cleaned up ${count} completed sync records from local storage.`, 'success');
  };

  const handleHydrate = async () => {
    if (!isOnline) {
      toast.showToast('Internet required to hydrate local cache.', 'warning');
      return;
    }
    setIsHydrating(true);
    try {
      const { syncEngine } = await import('../../services/sync/syncEngine');
      await syncEngine.hydrateLocalCaches();
      await loadCacheStats();
      toast.showToast('Offline cache refreshed with latest catalog and yard inventory snapshots.', 'success');
    } catch {
      toast.showToast('Failed to hydrate local cache.', 'error');
    } finally {
      setIsHydrating(false);
    }
  };

  const handleResolveConflictAction = async (
    conflictId: string,
    resolution: 'resolved_server' | 'resolved_local' | 'resolved_discarded'
  ) => {
    const operatorName = profile?.full_name || 'Admin';
    const success = await resolveConflict(
      conflictId,
      resolution,
      operatorName,
      `Resolved as ${resolution} via Sync Center`
    );

    if (success) {
      setSelectedConflict(null);
      toast.showToast(`Conflict marked as ${resolution}.`, 'success');
    } else {
      toast.showToast('Failed to resolve conflict.', 'error');
    }
  };

  const filteredQueue = queueItems.filter((item) => {
    if (filterStatus === 'all') return true;
    return item.status === filterStatus;
  });

  return (
    <div className="space-y-6 text-left max-w-7xl mx-auto pb-16" id="sync-center-root">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div
            className={`h-11 w-11 rounded-xl flex items-center justify-center ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
            }`}
          >
            {isOnline ? <Wifi className="h-6 w-6" /> : <WifiOff className="h-6 w-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                PWA Sync Center & Offline Outbox
              </h1>
              <Badge variant={isOnline ? 'success' : 'warning'} size="sm">
                {isOnline ? 'ONLINE' : 'OFFLINE MODE'}
              </Badge>
              <Badge variant="outline" size="sm">
                Module 22
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Durable offline queue, transactional conflict resolution, and local IndexedDB cache manager.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePurge}
            className="text-xs"
            title="Remove completed synced operations from device"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
            Purge Synced
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleManualSync}
            disabled={isSyncing || !isOnline}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Synchronizing...' : 'Sync Now'}
          </Button>
        </div>
      </div>

      {/* Top Health Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Pending Outbox
            </span>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {status.pendingCount}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Queued operations waiting for upload
            </span>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Unresolved Conflicts
            </span>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {status.conflictCount}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Requires managerial review
            </span>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Failed Retries
            </span>
            <div className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1">
              {status.failedCount}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              Operations with network errors
            </span>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-slate-800">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Last Successful Sync
            </span>
            <div className="text-xs font-semibold text-slate-900 dark:text-white mt-2">
              {status.lastSyncedAt
                ? new Date(status.lastSyncedAt).toLocaleTimeString('en-NG', {
                    timeZone: 'Africa/Lagos',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : 'Never'}
            </div>
            <span className="text-[10px] text-slate-400 font-mono mt-1 block">
              {status.lastSyncedAt
                ? new Date(status.lastSyncedAt).toLocaleDateString('en-NG')
                : 'Awaiting first synchronization'}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'queue'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Outbox Queue ({queueItems.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('conflicts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'conflicts'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Conflicts ({conflicts.filter((c) => c.status === 'unresolved').length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('diagnostics')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'diagnostics'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Database className="h-3.5 w-3.5" />
          <span>Local Cache & Storage</span>
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* TAB 1: OUTBOX QUEUE                                                */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'queue' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Offline Outbox Ledger
              </h3>
              <p className="text-xs text-slate-500">
                Idempotent mutations waiting to synchronize. Execution follows strict FIFO ordering.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Filter status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
              >
                <option value="all">All States ({queueItems.length})</option>
                <option value="pending">Pending</option>
                <option value="syncing">Syncing</option>
                <option value="synced">Synced</option>
                <option value="conflict">Conflict</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          {filteredQueue.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-800/40">
                    <th className="p-3 font-semibold">Operation ID</th>
                    <th className="p-3 font-semibold">Type</th>
                    <th className="p-3 font-semibold">Entity Ref</th>
                    <th className="p-3 font-semibold">Actor</th>
                    <th className="p-3 font-semibold">Queued Time</th>
                    <th className="p-3 font-semibold">Retries</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredQueue.map((item) => (
                    <tr
                      key={item.operationId}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer"
                      onClick={() => setSelectedItem(item)}
                    >
                      <td className="p-3 font-mono text-[11px] text-slate-400">
                        {item.operationId}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" size="sm">
                          {item.operationType}
                        </Badge>
                      </td>
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                        {item.localEntityId}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {item.actor?.userName || 'Offline Client'}
                      </td>
                      <td className="p-3 font-mono text-slate-400 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleTimeString('en-NG', {
                          timeZone: 'Africa/Lagos',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="p-3 font-mono text-slate-500">{item.retryCount}</td>
                      <td className="p-3">
                        <Badge
                          variant={
                            item.status === 'synced'
                              ? 'success'
                              : item.status === 'syncing'
                              ? 'info'
                              : item.status === 'conflict'
                              ? 'danger'
                              : item.status === 'failed'
                              ? 'danger'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {item.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem(item);
                          }}
                          className="h-7 text-xs px-2 text-amber-600 dark:text-amber-400"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={<CheckCircle2 className="h-6 w-6 text-emerald-500" />}
              title="All Operations Synchronized"
              description="No offline items currently waiting in the synchronization outbox."
            />
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 2: CONFLICTS                                                   */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'conflicts' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Data Conflict Resolution Queue
            </h3>
            <p className="text-xs text-slate-500">
              Operations where server state drifted while this device was disconnected (e.g. stock depleted by another terminal).
            </p>
          </div>

          {conflicts.length > 0 ? (
            <div className="space-y-3">
              {conflicts.map((conflict) => (
                <div
                  key={conflict.conflictId}
                  className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="danger" size="sm">
                        {conflict.status.toUpperCase()}
                      </Badge>
                      <span className="font-mono text-xs text-slate-400">
                        {conflict.conflictId}
                      </span>
                      <span className="font-semibold text-xs text-slate-900 dark:text-white">
                        {conflict.entityType.toUpperCase()}: {conflict.entityId}
                      </span>
                    </div>
                    <p className="text-xs text-rose-700 dark:text-rose-300 font-medium">
                      {conflict.reason}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      Detected: {new Date(conflict.detectedAt).toLocaleString('en-NG')}
                    </span>
                  </div>

                  {conflict.status === 'unresolved' ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleResolveConflictAction(conflict.conflictId, 'resolved_discarded')
                        }
                        className="text-xs text-rose-600 hover:bg-rose-50"
                      >
                        Discard Local
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          handleResolveConflictAction(conflict.conflictId, 'resolved_server')
                        }
                        className="text-xs"
                      >
                        Accept Server State
                      </Button>
                    </div>
                  ) : (
                    <Badge variant="outline" size="sm">
                      Resolved: {conflict.status}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<ShieldCheck className="h-6 w-6 text-emerald-500" />}
              title="Zero Conflicts Detected"
              description="All synchronized transactions integrated cleanly with authoritative server rules."
            />
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* TAB 3: DIAGNOSTICS & LOCAL CACHE                                   */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border border-slate-200 dark:border-slate-800">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Database className="h-4 w-4 text-amber-500" />
                  IndexedDB Storage Stores
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Product Catalogue & Variants
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {cacheStats.products} records
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Yard Inventory Snapshots
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {cacheStats.inventory} records
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Cached Warehouse Tasks
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {cacheStats.tasks} records
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Cached Installation Jobs
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {cacheStats.installations} records
                  </span>
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleHydrate}
                    disabled={isHydrating || !isOnline}
                    className="w-full text-xs"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 mr-1.5 ${isHydrating ? 'animate-spin' : ''}`}
                    />
                    {isHydrating ? 'Hydrating...' : 'Refresh Local Snapshots from Server'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 dark:border-slate-800">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Offline Security & Policy Constraints
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 text-xs space-y-2.5 text-slate-600 dark:text-slate-400">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Append-Only Mutations:</strong> Client mutations use UUID keys to guarantee idempotency and prevent duplicate sales or requests.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Zero Secret Exposure:</strong> Passwords, API keys, and payment credentials are mathematically excluded from IndexedDB stores.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Controlled POS Checkout:</strong> Online card gateways (Paystack) are blocked offline; only cash/manual payments queue.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Module 21 Audit Integration:</strong> Synchronized operations write audit ledger records with offline-origin metadata.
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Item Detail Inspector Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto text-left">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Operation Payload Inspector
                </h3>
                <span className="font-mono text-xs text-slate-400">
                  ID: {selectedItem.operationId}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedItem(null)}
                className="h-8 w-8 p-0 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono text-[11px]">
                <div>
                  <span className="text-slate-400 block">Operation:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedItem.operationType}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Entity:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedItem.entityType} ({selectedItem.localEntityId})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Status:</span>
                  <span className="font-bold uppercase text-amber-600">
                    {selectedItem.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Queued At:</span>
                  <span>{new Date(selectedItem.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {selectedItem.errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
                  <strong>Last Error:</strong> {selectedItem.errorMessage}
                </div>
              )}

              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Operation Payload (Sanitized)
                </span>
                <pre className="p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-60">
                  {JSON.stringify(selectedItem.payload, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setSelectedItem(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
