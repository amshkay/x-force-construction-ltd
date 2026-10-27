/**
 * Offline Synchronization & PWA Engine Types
 * Module 22 — Offline-First PWA & Synchronization
 * XFORCE Construction Ltd / X-FORCE BRICKS
 */

export type SyncOperationType =
  | 'CREATE_REQUEST'
  | 'SUBMIT_POS_SALE'
  | 'INVENTORY_ADJUSTMENT'
  | 'STOCK_RECEIPT'
  | 'STOCK_ISSUE'
  | 'UPDATE_WAREHOUSE_TASK'
  | 'DISPATCH_WAYBILL'
  | 'UPDATE_INSTALLATION_TASK'
  | 'COMPLETE_INSTALLATION_JOB'
  | 'RECORD_GPS_LOCATION'
  | 'SEND_INTERNAL_MESSAGE'
  | 'UPLOAD_MEDIA';

export type SyncEntityType =
  | 'request'
  | 'order'
  | 'pos_sale'
  | 'inventory_movement'
  | 'warehouse_task'
  | 'installation'
  | 'message'
  | 'media';

export type SyncItemStatus =
  | 'pending'
  | 'syncing'
  | 'synced'
  | 'failed'
  | 'conflict'
  | 'requires_online_action';

export interface SyncActorContext {
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  userRole?: string | null;
}

export interface SyncQueueItem<TPayload = unknown> {
  operationId: string; // Unique client-generated UUID / idempotency key
  operationType: SyncOperationType;
  entityType: SyncEntityType;
  localEntityId: string;
  authoritativeEntityId?: string | null;
  payload: TPayload;
  createdAt: string; // ISO timestamp
  lastAttemptAt?: string | null;
  retryCount: number;
  status: SyncItemStatus;
  errorMessage?: string | null;
  actor?: SyncActorContext | null;
  dependencies?: string[]; // IDs of prior operations that must sync first
  conflictDetails?: SyncConflictDetails | null;
}

export interface SyncConflictDetails {
  conflictId: string;
  operationId: string;
  entityType: SyncEntityType;
  entityId: string;
  localPayload: unknown;
  serverPayload?: unknown;
  reason: string;
  detectedAt: string;
  status: 'unresolved' | 'resolved_server' | 'resolved_local' | 'resolved_discarded';
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  resolutionNote?: string | null;
}

export interface SyncEngineStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  syncingCount: number;
  failedCount: number;
  conflictCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
}

export interface OfflineGpsCapture {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: string; // ISO
  isManualEntry: boolean;
  addressLandmark?: string | null;
}

export interface OfflinePosSalePayload {
  clientTransactionId: string;
  orderNumber: string;
  cashierId: string;
  cashierName: string;
  customerId?: string | null;
  customerName?: string | null;
  items: Array<{
    productId: string;
    productName: string;
    variantId?: string | null;
    variantName?: string | null;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    costPrice?: number;
    sku: string;
  }>;
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'pos_terminal' | 'card_pos' | 'bank_transfer';
  paymentReference?: string;
  amountTendered: number;
  changeGiven: number;
  notes?: string;
  offlineCreatedAt: string;
  snapshotStockWarning?: boolean;
}

export interface OfflineRequestPayload {
  clientRequestId: string;
  fullName: string;
  phone: string;
  email?: string;
  deliveryAddress: string;
  landmark?: string;
  projectType: string;
  estimatedUnits: number;
  productId?: string;
  notes?: string;
  offlineCreatedAt: string;
}

export interface OfflineInventoryMovementPayload {
  clientMovementId: string;
  movementType: 'adjustment' | 'receipt' | 'issue' | 'transfer' | 'damage';
  productId: string;
  productName: string;
  sku: string;
  quantityChange: number; // positive or negative
  previousKnownStock: number;
  locationId: string;
  locationName: string;
  reason: string;
  staffId: string;
  staffName: string;
  offlineCreatedAt: string;
}

export interface OfflineWarehouseTaskPayload {
  clientTaskId: string;
  fulfilmentId: string;
  taskId: string;
  status: 'picked' | 'verified' | 'packed' | 'dispatched' | 'delivered';
  pickedQuantity?: number;
  notes?: string;
  gps?: OfflineGpsCapture;
  staffId: string;
  staffName: string;
  offlineCreatedAt: string;
}

export interface OfflineInstallationTaskPayload {
  clientJobId: string;
  serviceJobId: string;
  taskId: string;
  completed: boolean;
  squareMetersInstalled?: number;
  observations?: string;
  gps?: OfflineGpsCapture;
  staffId: string;
  staffName: string;
  offlineCreatedAt: string;
}
