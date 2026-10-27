/**
 * Central Offline Synchronization Engine
 * Module 22 — Offline-First PWA & Synchronization
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Implements authoritative synchronization between local IndexedDB outbox and backend/Supabase.
 * Handles queuing, idempotency, retry with exponential backoff, conflict detection/resolution,
 * and Module 21 audit integration.
 */

import {
  SyncQueueItem,
  SyncOperationType,
  SyncEntityType,
  SyncEngineStatus,
  SyncConflictDetails,
  OfflinePosSalePayload,
  OfflineRequestPayload,
  OfflineInventoryMovementPayload,
  OfflineWarehouseTaskPayload,
  OfflineInstallationTaskPayload,
} from '../../types/sync';
import { indexedDb, IDB_STORES } from '../../lib/storage/indexedDb';
import { localStore } from '../../lib/storage/localStorage';
import { STORAGE_KEYS } from '../../constants';
import { auditService } from '../audit.service';
import { requestRepository } from '../../repositories/request.repository';
import { posRepository } from '../../repositories/pos.repository';
import { inventoryRepository } from '../../repositories/inventory.repository';
import { warehouseRepository } from '../../repositories/warehouse.repository';
import { installationRepository } from '../../repositories/installation.repository';
import { getSupabaseClient } from '../../lib/supabase/client';
import { appConfig } from '../../config/app.config';

type SyncListener = (status: SyncEngineStatus) => void;

class SyncEngine {
  private isOnline: boolean;
  private isSyncing: boolean = false;
  private listeners: Set<SyncListener> = new Set();
  private lastSyncedAt: string | null = null;
  private lastError: string | null = null;
  private autoSyncTimer: any = null;

  constructor() {
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.initEventListeners();
    this.restoreState();
  }

  private initEventListeners(): void {
    if (typeof window === 'undefined') return;

    if (typeof window.addEventListener === 'function') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notifyListeners();
        // When connection is restored, immediately trigger synchronization
        this.syncNow().catch((err) => console.warn('[SyncEngine] Auto-sync error:', err));
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notifyListeners();
      });
    }

    // Background safety interval (every 60s check if online and pending items exist)
    this.autoSyncTimer = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.syncNow().catch(() => {});
      }
    }, 60000);

    // Unref timer in Node.js environments so test runners do not hang
    if (this.autoSyncTimer && typeof (this.autoSyncTimer as any).unref === 'function') {
      (this.autoSyncTimer as any).unref();
    }
  }

  public destroy(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
  }

  private restoreState(): void {
    this.lastSyncedAt = localStore.get<string | null>('xforce_last_synced_at', null);
  }

  // --------------------------------------------------------------------------
  // LISTENER & STATUS MANAGEMENT
  // --------------------------------------------------------------------------

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    this.getStatus().then((status) => listener(status));
    return () => this.listeners.delete(listener);
  }

  private async notifyListeners(): Promise<void> {
    const status = await this.getStatus();
    this.listeners.forEach((fn) => {
      try {
        fn(status);
      } catch (err) {
        console.warn('[SyncEngine] Error in sync listener:', err);
      }
    });
  }

  async getStatus(): Promise<SyncEngineStatus> {
    const queue = await indexedDb.getSyncQueueItems();
    const conflicts = await indexedDb.getConflicts();

    const pendingCount = queue.filter((i) => i.status === 'pending').length;
    const syncingCount = queue.filter((i) => i.status === 'syncing').length;
    const failedCount = queue.filter((i) => i.status === 'failed').length;
    const conflictCount = conflicts.filter((c) => c.status === 'unresolved').length;

    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount,
      syncingCount,
      failedCount,
      conflictCount,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
    };
  }

  // --------------------------------------------------------------------------
  // QUEUE ENQUEUE OPERATIONS (Idempotent client outbox)
  // --------------------------------------------------------------------------

  async enqueue<TPayload>(params: {
    operationType: SyncOperationType;
    entityType: SyncEntityType;
    localEntityId: string;
    payload: TPayload;
    actor?: { userId?: string | null; userEmail?: string | null; userName?: string | null; userRole?: string | null };
    dependencies?: string[];
  }): Promise<SyncQueueItem<TPayload>> {
    const operationId = `op-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const item: SyncQueueItem<TPayload> = {
      operationId,
      operationType: params.operationType,
      entityType: params.entityType,
      localEntityId: params.localEntityId,
      payload: params.payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
      actor: params.actor || null,
      dependencies: params.dependencies || [],
    };

    // Save to IndexedDB
    await indexedDb.saveQueueItem(item as SyncQueueItem<unknown>);

    // Also mirror pending count in localStorage for quick synchronous header indicators
    const currentQueue = await indexedDb.getSyncQueueItems();
    localStore.set(
      STORAGE_KEYS.OFFLINE_QUEUE,
      currentQueue.filter((q) => q.status === 'pending' || q.status === 'failed')
    );

    this.notifyListeners();

    // If online, immediately trigger synchronization in background
    if (this.isOnline && !this.isSyncing) {
      setTimeout(() => this.syncNow().catch(() => {}), 100);
    }

    return item;
  }

  // --------------------------------------------------------------------------
  // SYNCHRONIZATION EXECUTION ENGINE
  // --------------------------------------------------------------------------

  async syncNow(): Promise<{ processed: number; succeeded: number; failed: number; conflicts: number }> {
    if (this.isSyncing) {
      return { processed: 0, succeeded: 0, failed: 0, conflicts: 0 };
    }

    if (!this.isOnline && typeof navigator !== 'undefined' && !navigator.onLine) {
      this.isOnline = false;
      this.notifyListeners();
      return { processed: 0, succeeded: 0, failed: 0, conflicts: 0 };
    }

    this.isSyncing = true;
    this.lastError = null;
    this.notifyListeners();

    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    let conflicts = 0;

    try {
      const items = await indexedDb.getSyncQueueItems();
      const pendingItems = items.filter(
        (i) => i.status === 'pending' || (i.status === 'failed' && i.retryCount < 5)
      );

      for (const item of pendingItems) {
        processed++;
        item.status = 'syncing';
        item.lastAttemptAt = new Date().toISOString();
        await indexedDb.saveQueueItem(item);
        this.notifyListeners();

        try {
          const outcome = await this.dispatchOperation(item);

          if (outcome.status === 'synced') {
            item.status = 'synced';
            item.authoritativeEntityId = outcome.authoritativeId || item.localEntityId;
            item.errorMessage = null;
            await indexedDb.saveQueueItem(item);
            succeeded++;

            // Record in Supabase offline_sync_log if configured
            await this.recordSupabaseSyncLog(item, 'applied');

            // Module 21 Audit Integration: Record genuine business audit entry
            await this.recordAuditSyncEntry(item, outcome.authoritativeId);
          } else if (outcome.status === 'conflict') {
            item.status = 'conflict';
            item.conflictDetails = outcome.conflict;
            await indexedDb.saveQueueItem(item);
            if (outcome.conflict) {
              await indexedDb.saveConflict(outcome.conflict);
            }
            conflicts++;

            await this.recordSupabaseSyncLog(item, 'conflict_resolved');
          } else {
            item.status = 'failed';
            item.retryCount += 1;
            item.errorMessage = outcome.errorMessage || 'Operation processing failed.';
            await indexedDb.saveQueueItem(item);
            failed++;
          }
        } catch (err: any) {
          item.status = 'failed';
          item.retryCount += 1;
          item.errorMessage = err?.message || 'Network or execution failure during sync.';
          await indexedDb.saveQueueItem(item);
          failed++;
        }
      }

      this.lastSyncedAt = new Date().toISOString();
      localStore.set('xforce_last_synced_at', this.lastSyncedAt);

      // Clean up legacy localStorage mirror
      const updatedQueue = await indexedDb.getSyncQueueItems();
      localStore.set(
        STORAGE_KEYS.OFFLINE_QUEUE,
        updatedQueue.filter((q) => q.status === 'pending' || q.status === 'failed')
      );
    } catch (err: any) {
      this.lastError = err?.message || 'Sync execution halted unexpectedly.';
      console.warn('[SyncEngine] Sync error:', err);
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }

    return { processed, succeeded, failed, conflicts };
  }

  // --------------------------------------------------------------------------
  // OPERATION DISPATCHER
  // --------------------------------------------------------------------------

  private async dispatchOperation(
    item: SyncQueueItem
  ): Promise<{
    status: 'synced' | 'conflict' | 'failed';
    authoritativeId?: string;
    errorMessage?: string;
    conflict?: SyncConflictDetails;
  }> {
    switch (item.operationType) {
      // 1. CUSTOMER REQUEST SUBMISSION
      case 'CREATE_REQUEST': {
        const payload = item.payload as OfflineRequestPayload;
        try {
          const created = await requestRepository.createRequest({
            customerName: payload.fullName,
            customerPhone: payload.phone,
            customerEmail: payload.email,
            projectAddress: payload.deliveryAddress,
            projectCity: payload.landmark,
            requestType: payload.projectType as any,
            items: [
              {
                itemName: 'Interlocking Bricks / Materials',
                quantity: payload.estimatedUnits || 1,
                productId: payload.productId,
              },
            ],
            customerComments: `${payload.notes || ''} [Offline Synced from ${payload.clientRequestId}]`.trim(),
          });

          return { status: 'synced', authoritativeId: created.id };
        } catch (err: any) {
          return { status: 'failed', errorMessage: err?.message };
        }
      }

      // 2. POS SALE SUBMISSION (Offline Counter Checkout)
      case 'SUBMIT_POS_SALE': {
        const payload = item.payload as OfflinePosSalePayload;
        try {
          // Idempotency check: Ensure sale reference doesn't already exist
          const existingSales = await posRepository.getAllSales();
          const alreadySynced = existingSales.find(
            (s) => s.id === payload.clientTransactionId || s.saleReference === payload.orderNumber
          );

          if (alreadySynced) {
            return { status: 'synced', authoritativeId: alreadySynced.id };
          }

          // Stock Conflict Detection (Section 8 & 9)
          // Check if current inventory on server is sufficient for the offline items
          const inventoryBalances = await inventoryRepository.getAllBalances();
          let hasStockDrift = false;
          let conflictReason = '';

          for (const itemRow of payload.items) {
            const currentStockItem = inventoryBalances.find((inv) => inv.productId === itemRow.productId);
            const availableStock = currentStockItem ? Math.max(0, currentStockItem.quantityOnHand - currentStockItem.quantityReserved) : 0;
            if (currentStockItem && availableStock < itemRow.quantity) {
              hasStockDrift = true;
              conflictReason = `Product "${itemRow.productName}" available stock is ${availableStock} units, but offline POS sale required ${itemRow.quantity} units.`;
              break;
            }
          }

          // If stock has drifted into negative or conflict, mark as conflict for controlled review
          if (hasStockDrift) {
            const conflict: SyncConflictDetails = {
              conflictId: `conf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              operationId: item.operationId,
              entityType: 'pos_sale',
              entityId: payload.clientTransactionId,
              localPayload: payload,
              reason: conflictReason,
              detectedAt: new Date().toISOString(),
              status: 'unresolved',
            };
            return { status: 'conflict', conflict };
          }

          // Deduct inventory transactionally
          await inventoryRepository.executePosSaleDeduction({
            saleId: payload.clientTransactionId,
            saleReference: payload.orderNumber,
            locationId: 'loc-yard-main',
            locationName: 'Factory Central Yard',
            items: payload.items.map((i) => ({
              productId: i.productId,
              productName: i.productName,
              variantId: i.variantId || null,
              variantName: i.variantName || null,
              sku: i.sku,
              quantity: i.quantity,
              unit: 'pcs',
            })),
            performedBy: payload.cashierId,
            performedByName: payload.cashierName,
          });

          // Create the authoritative server-side POS sale
          const sale = await posRepository.createSale({
            id: payload.clientTransactionId,
            saleReference: payload.orderNumber,
            customerId: payload.customerId || null,
            customerName: payload.customerName || 'Walk-in Counter Customer',
            customerPhone: null,
            customerEmail: null,
            customerAddress: null,
            isGuestCustomer: !payload.customerId,
            locationId: 'loc-yard-main',
            locationName: 'Factory Central Yard',
            locationCode: 'YARD-01',
            cashierId: payload.cashierId,
            cashierName: payload.cashierName,
            items: payload.items as any,
            subtotal: payload.subtotal,
            cartDiscountType: 'none',
            cartDiscountValue: 0,
            cartDiscountAmount: payload.discountAmount,
            additionalChargesFee: 0,
            additionalChargesNote: null,
            totalDiscountAmount: payload.discountAmount,
            totalAmount: payload.totalAmount,
            amountPaid: payload.totalAmount,
            balanceDue: 0,
            amountTendered: payload.amountTendered,
            changeGiven: payload.changeGiven,
            paymentMethod: payload.paymentMethod === 'pos_terminal' ? 'card_pos' : (payload.paymentMethod as any),
            paymentStatus: 'paid',
            paymentReference: payload.paymentReference || `OFF-SYNC-${item.operationId.slice(-6)}`,
            paymentId: `pay-${payload.clientTransactionId}`,
            status: 'completed',
            notes: `[Offline POS Sale] ${payload.notes || ''}`.trim(),
            createdAt: payload.offlineCreatedAt,
            updatedAt: new Date().toISOString(),
          });

          return { status: 'synced', authoritativeId: sale.id };
        } catch (err: any) {
          return { status: 'failed', errorMessage: err?.message };
        }
      }

      // 3. INVENTORY ADJUSTMENT / MOVEMENT
      case 'INVENTORY_ADJUSTMENT':
      case 'STOCK_RECEIPT':
      case 'STOCK_ISSUE': {
        const payload = item.payload as OfflineInventoryMovementPayload;
        try {
          const invList = await inventoryRepository.getAllBalances();
          const target = invList.find((i) => i.productId === payload.productId);

          if (!target) {
            return {
              status: 'failed',
              errorMessage: `Target product ID "${payload.productId}" not found in inventory.`,
            };
          }

          const currentAvailable = target.quantityOnHand - target.quantityReserved;
          // If adjustment would push stock below zero due to server drift
          if (currentAvailable + payload.quantityChange < 0) {
            const conflict: SyncConflictDetails = {
              conflictId: `conf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              operationId: item.operationId,
              entityType: 'inventory_movement',
              entityId: payload.clientMovementId,
              localPayload: payload,
              serverPayload: target,
              reason: `Stock conflict: local deduction of ${payload.quantityChange} units exceeds server available balance (${currentAvailable} units).`,
              detectedAt: new Date().toISOString(),
              status: 'unresolved',
            };
            return { status: 'conflict', conflict };
          }

          const newQuantityOnHand = Math.max(0, target.quantityOnHand + payload.quantityChange);

          // Execute adjustment transactionally
          const adjResult = await inventoryRepository.executeAdjustment(
            {
              productId: payload.productId,
              locationId: payload.locationId,
              newQuantityOnHand,
              reason: `${payload.reason} [Offline Sync: ${payload.clientMovementId}]`,
              performedBy: payload.staffId,
              performedByName: payload.staffName || 'Sync Engine',
            },
            {
              productName: payload.productName,
              variantName: 'Standard',
              sku: payload.sku,
              unit: 'pcs',
              locationName: payload.locationName,
            }
          );

          return { status: 'synced', authoritativeId: adjResult.movement.id };
        } catch (err: any) {
          return { status: 'failed', errorMessage: err?.message };
        }
      }

      // 4. WAREHOUSE TASK / FULFILMENT PROGRESS
      case 'UPDATE_WAREHOUSE_TASK':
      case 'DISPATCH_WAYBILL': {
        const payload = item.payload as OfflineWarehouseTaskPayload;
        try {
          const task = await warehouseRepository.getTaskById(payload.taskId);
          if (!task) {
            return { status: 'failed', errorMessage: `Warehouse task "${payload.taskId}" not found.` };
          }

          const taskStatus =
            payload.status === 'delivered' || payload.status === 'picked' || payload.status === 'packed'
              ? 'completed'
              : 'in_progress';

          // Detect conflict if task was completed by someone else online
          if (task.status === 'completed' && taskStatus !== 'completed') {
            const conflict: SyncConflictDetails = {
              conflictId: `conf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              operationId: item.operationId,
              entityType: 'warehouse_task',
              entityId: payload.taskId,
              localPayload: payload,
              serverPayload: task,
              reason: `Warehouse task was already marked completed on the server by another operator.`,
              detectedAt: new Date().toISOString(),
              status: 'unresolved',
            };
            return { status: 'conflict', conflict };
          }

          const updated = await warehouseRepository.updateTaskStatus(
            payload.taskId,
            taskStatus,
            payload.staffId,
            payload.staffName
          );

          return { status: 'synced', authoritativeId: updated.id };
        } catch (err: any) {
          return { status: 'failed', errorMessage: err?.message };
        }
      }

      // 5. INSTALLATION / FIELD SITE TASK PROGRESS & GPS
      case 'UPDATE_INSTALLATION_TASK':
      case 'COMPLETE_INSTALLATION_JOB': {
        const payload = item.payload as OfflineInstallationTaskPayload;
        try {
          const jobs = await installationRepository.getAll();
          const job = jobs.find((j) => j.id === payload.serviceJobId);

          if (!job) {
            return { status: 'failed', errorMessage: `Installation job "${payload.serviceJobId}" not found.` };
          }

          const gpsUpdates = payload.gps
            ? {
                gpsLatitude: payload.gps.latitude,
                gpsLongitude: payload.gps.longitude,
              }
            : {};

          await installationRepository.updateServiceJob(
            payload.serviceJobId,
            {
              ...gpsUpdates,
              status: item.operationType === 'COMPLETE_INSTALLATION_JOB' ? 'completed' : job.status,
            },
            payload.staffId,
            payload.staffName,
            `[Offline Task ${payload.taskId}] ${payload.observations || 'Progress updated offline.'}`
          );

          return { status: 'synced', authoritativeId: payload.serviceJobId };
        } catch (err: any) {
          return { status: 'failed', errorMessage: err?.message };
        }
      }

      default:
        return { status: 'synced', authoritativeId: item.localEntityId };
    }
  }

  // --------------------------------------------------------------------------
  // SUPABASE OFFLINE_SYNC_LOG PERSISTENCE
  // --------------------------------------------------------------------------

  private async recordSupabaseSyncLog(
    item: SyncQueueItem,
    status: 'applied' | 'conflict_resolved' | 'rejected'
  ): Promise<void> {
    if (!appConfig.supabase.isConfigured) return;

    try {
      const supabase = getSupabaseClient();
      await supabase.from('offline_sync_log').insert({
        client_mutation_id: item.operationId,
        entity_type: item.entityType,
        entity_id: item.authoritativeEntityId || item.localEntityId,
        action: item.operationType,
        client_timestamp: item.createdAt,
        server_timestamp: new Date().toISOString(),
        status,
        details: {
          retryCount: item.retryCount,
          actor: item.actor,
          payload: item.payload,
        } as any,
        user_id: item.actor?.userId || null,
      });
    } catch (err) {
      console.warn('[SyncEngine] Supabase offline_sync_log error:', err);
    }
  }

  // --------------------------------------------------------------------------
  // MODULE 21 AUDIT INTEGRATION
  // --------------------------------------------------------------------------

  private async recordAuditSyncEntry(item: SyncQueueItem, authoritativeId?: string): Promise<void> {
    try {
      await auditService.logBusinessAction({
        action: item.operationType === 'SUBMIT_POS_SALE' ? 'COMPLETE' : 'UPDATE',
        entityType: item.entityType as any,
        entityId: authoritativeId || item.localEntityId,
        entityReference: `Sync: ${item.operationType}`,
        actor: {
          id: item.actor?.userId,
          email: item.actor?.userEmail,
          name: item.actor?.userName,
          role: item.actor?.userRole,
        },
        reason: `Successfully synchronized offline operation ${item.operationId} (${item.operationType}).`,
        metadata: {
          operationId: item.operationId,
          offlineCreatedAt: item.createdAt,
          retryCount: item.retryCount,
          isOfflineSync: true,
        },
        source: item.entityType === 'pos_sale' ? 'POS' : 'Admin Web',
      });
    } catch (err) {
      console.warn('[SyncEngine] Audit logging error:', err);
    }
  }

  // --------------------------------------------------------------------------
  // CONFLICT RESOLUTION
  // --------------------------------------------------------------------------

  async resolveConflict(
    conflictId: string,
    resolution: 'resolved_server' | 'resolved_local' | 'resolved_discarded',
    resolvedBy: string,
    note?: string
  ): Promise<boolean> {
    const conflicts = await indexedDb.getConflicts();
    const target = conflicts.find((c) => c.conflictId === conflictId);
    if (!target) return false;

    target.status = resolution;
    target.resolvedAt = new Date().toISOString();
    target.resolvedBy = resolvedBy;
    target.resolutionNote = note || null;
    await indexedDb.saveConflict(target);

    // Update queue item
    const queueItems = await indexedDb.getSyncQueueItems();
    const queueItem = queueItems.find((q) => q.operationId === target.operationId);
    if (queueItem) {
      if (resolution === 'resolved_discarded') {
        queueItem.status = 'failed';
        queueItem.errorMessage = `Conflict discarded by ${resolvedBy}: ${note || 'Manually discarded'}`;
      } else if (resolution === 'resolved_local') {
        // Re-queue for sync
        queueItem.status = 'pending';
        queueItem.retryCount = 0;
      } else {
        queueItem.status = 'synced';
      }
      await indexedDb.saveQueueItem(queueItem);
    }

    this.notifyListeners();
    return true;
  }

  // --------------------------------------------------------------------------
  // LOCAL DATA HYDRATION (Caching snapshots for offline use)
  // --------------------------------------------------------------------------

  async hydrateLocalCaches(): Promise<void> {
    if (!this.isOnline) return;

    try {
      // 1. Cache Inventory Balances
      const inventory = await inventoryRepository.getAllBalances();
      await indexedDb.putBulk(IDB_STORES.CACHED_INVENTORY, inventory);

      // 2. Cache Warehouse Tasks
      const tasks = await warehouseRepository.getAllTasks();
      await indexedDb.putBulk(IDB_STORES.CACHED_WAREHOUSE_TASKS, tasks);

      // 3. Cache Installation Jobs
      const jobs = await installationRepository.getAll();
      await indexedDb.putBulk(IDB_STORES.CACHED_INSTALLATIONS, jobs);

      // 4. Update metadata timestamp
      await indexedDb.put(IDB_STORES.CACHE_METADATA, {
        id: 'last_hydration',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[SyncEngine] Hydration warning:', err);
    }
  }

  // --------------------------------------------------------------------------
  // CLEANUP / RETENTION (Section 21)
  // --------------------------------------------------------------------------

  async purgeSyncedItems(): Promise<number> {
    const items = await indexedDb.getSyncQueueItems();
    const synced = items.filter((i) => i.status === 'synced');
    for (const s of synced) {
      await indexedDb.deleteQueueItem(s.operationId);
    }
    this.notifyListeners();
    return synced.length;
  }
}

export const syncEngine = new SyncEngine();
