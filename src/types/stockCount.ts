/**
 * Stock Counting & Reconciliation Domain Types
 * Module 12 — Physical Stock Counting & Reconciliation
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Provides typed domain models, status lifecycles, recount structures,
 * and reconciliation transactions.
 */

export type StockCountStatus =
  | 'draft'
  | 'open'
  | 'counting'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'reconciled'
  | 'cancelled';

export type StockCountScope = 'full_location' | 'selected_items' | 'category';

export type StockCountItemStatus =
  | 'pending'
  | 'matched'
  | 'shortage'
  | 'surplus'
  | 'pending_review'
  | 'recount_required'
  | 'approved'
  | 'reconciled';

export interface AssignedCounter {
  userId: string;
  name: string;
  email?: string;
}

export interface SignificantVarianceThreshold {
  type: 'percentage' | 'quantity' | 'both';
  percentage?: number; // e.g. 5 for 5%
  quantity?: number; // e.g. 10 for 10 units
}

export interface StockCountRecount {
  recountNumber: number;
  previousQuantity: number;
  recountedQuantity: number;
  reason: string;
  performedBy: string;
  performedByName: string;
  timestamp: string;
}

export interface StockCountItem {
  id: string;
  stockCountId: string;
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  categoryName?: string;
  sku: string;
  unit: string;
  locationId: string;
  systemQuantitySnapshot: number;
  systemQuantityAtSubmission: number | null;
  hasMovementDuringCount: boolean;
  countedQuantity: number | null;
  variance: number | null; // countedQuantity - systemQuantitySnapshot
  varianceStatus: StockCountItemStatus;
  counterId: string | null;
  counterName: string | null;
  countedAt: string | null;
  recounts: StockCountRecount[];
  isRecounted: boolean;
  approvedQuantity: number | null;
  reconciledQuantity: number | null;
  notes: string | null;
  reviewerNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StockCountSession {
  id: string;
  countNumber: string;
  locationId: string;
  locationName: string;
  locationCode: string;
  countDate: string;
  scope: StockCountScope;
  categoryId: string | null;
  categoryName: string | null;
  status: StockCountStatus;
  isBlindCount: boolean;
  significantVarianceThreshold: SignificantVarianceThreshold | null;
  notes: string | null;
  reviewNotes: string | null;
  initiatedBy: string;
  initiatedByName: string;
  assignedCounters: AssignedCounter[];
  startedAt: string | null;
  completedAt: string | null;
  approvedBy: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  reconciledBy: string | null;
  reconciledByName: string | null;
  reconciledAt: string | null;
  items: StockCountItem[];
  createdAt: string;
  updatedAt: string;
}

export interface StockCountStats {
  totalSessions: number;
  activeSessions: number;
  pendingReviewSessions: number;
  reconciledSessions: number;
  totalDiscrepancyItems: number;
}

export interface StockCountFilterParams {
  locationId?: string;
  status?: StockCountStatus | 'all';
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateStockCountDTO {
  locationId: string;
  scope: StockCountScope;
  categoryId?: string | null;
  selectedProductIds?: string[];
  countDate: string;
  isBlindCount?: boolean;
  significantVarianceThreshold?: SignificantVarianceThreshold | null;
  assignedCounters?: AssignedCounter[];
  notes?: string;
  initiatedBy: string;
  initiatedByName: string;
}

export interface RecordCountDTO {
  stockCountId: string;
  itemId: string;
  countedQuantity: number;
  counterId: string;
  counterName: string;
  notes?: string;
}

export interface BatchRecordCountDTO {
  stockCountId: string;
  counts: Array<{
    itemId: string;
    countedQuantity: number;
    notes?: string;
  }>;
  counterId: string;
  counterName: string;
  isDraftSave?: boolean;
}

export interface SubmitCountDTO {
  stockCountId: string;
  submittedBy: string;
  submittedByName: string;
  notes?: string;
}

export interface RequestRecountDTO {
  stockCountId: string;
  itemId: string;
  reason: string;
  requestedBy: string;
  requestedByName: string;
}

export interface PerformRecountDTO {
  stockCountId: string;
  itemId: string;
  recountedQuantity: number;
  reason: string;
  performedBy: string;
  performedByName: string;
}

export interface ApproveStockCountDTO {
  stockCountId: string;
  approvedBy: string;
  approvedByName: string;
  reviewNotes?: string;
  itemApprovals?: Array<{
    itemId: string;
    approvedQuantity: number;
  }>;
}

export interface ReconcileStockCountDTO {
  stockCountId: string;
  reconciledBy: string;
  reconciledByName: string;
  notes?: string;
}
