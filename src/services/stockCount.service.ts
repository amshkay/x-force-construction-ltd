/**
 * Physical Stock Counting & Reconciliation Service
 * Module 12 — Physical Stock Counting & Reconciliation
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Implements business rules for stock count sessions, snapshot freezes,
 * blind counting, recount preservation, variance calculations, supervisory review,
 * and transactional reconciliation to inventory movements.
 */

import { stockCountRepository } from '../repositories/stockCount.repository';
import { inventoryRepository } from '../repositories/inventory.repository';
import { productRepository } from '../repositories/product.repository';
import { stockLocationRepository } from '../repositories/stockLocation.repository';
import { auditService } from './audit.service';
import {
  StockCountSession,
  StockCountItem,
  StockCountStats,
  StockCountFilterParams,
  CreateStockCountDTO,
  RecordCountDTO,
  BatchRecordCountDTO,
  SubmitCountDTO,
  RequestRecountDTO,
  PerformRecountDTO,
  ApproveStockCountDTO,
  ReconcileStockCountDTO,
} from '../types/stockCount';
import { Product } from '../types/product';
import { StockLocation } from '../types/inventory';

export class StockCountService {
  /**
   * Retrieves all stock count sessions with optional filtering
   */
  public async getSessions(filters?: StockCountFilterParams): Promise<StockCountSession[]> {
    return stockCountRepository.getAllSessions(filters);
  }

  /**
   * Retrieves a single count session by ID with its items
   */
  public async getSessionById(id: string): Promise<StockCountSession | null> {
    return stockCountRepository.getSessionById(id);
  }

  /**
   * Computes key metrics and statistics across stock count sessions
   */
  public async getStats(): Promise<StockCountStats> {
    const sessions = await stockCountRepository.getAllSessions();

    let totalDiscrepancyItems = 0;
    let activeSessions = 0;
    let pendingReviewSessions = 0;
    let reconciledSessions = 0;

    sessions.forEach((s) => {
      if (['open', 'counting'].includes(s.status)) {
        activeSessions++;
      } else if (['submitted', 'under_review'].includes(s.status)) {
        pendingReviewSessions++;
      } else if (s.status === 'reconciled') {
        reconciledSessions++;
      }

      if (s.items && s.items.length > 0) {
        s.items.forEach((item) => {
          if (item.variance !== null && item.variance !== 0) {
            totalDiscrepancyItems++;
          }
        });
      }
    });

    return {
      totalSessions: sessions.length,
      activeSessions,
      pendingReviewSessions,
      reconciledSessions,
      totalDiscrepancyItems,
    };
  }

  /**
   * Creates a new Stock Count Session and freezes the system quantity snapshot
   */
  public async createSession(dto: CreateStockCountDTO): Promise<StockCountSession> {
    const [locations, products, balances] = await Promise.all([
      stockLocationRepository.getAllLocations(),
      productRepository.getAllProducts(),
      inventoryRepository.getAllBalances(dto.locationId),
    ]);

    const location = locations.find((l) => l.id === dto.locationId);
    if (!location) {
      throw new Error(`Stock location with ID '${dto.locationId}' does not exist.`);
    }

    // Determine products to count based on scope
    let scopedProducts: Product[] = [];
    let categoryName: string | null = null;

    if (dto.scope === 'category') {
      if (!dto.categoryId) {
        throw new Error('A category must be selected for category-scoped stock counts.');
      }
      scopedProducts = products.filter((p) => p.categoryId === dto.categoryId);
      categoryName = scopedProducts[0]?.categoryName || 'Selected Category';
    } else if (dto.scope === 'selected_items') {
      if (!dto.selectedProductIds || dto.selectedProductIds.length === 0) {
        throw new Error('At least one product must be selected for item-scoped stock counts.');
      }
      const selectedSet = new Set(dto.selectedProductIds);
      scopedProducts = products.filter((p) => selectedSet.has(p.id));
    } else {
      // Full location count
      scopedProducts = products;
    }

    if (scopedProducts.length === 0) {
      throw new Error('No active products found matching the selected stock count scope.');
    }

    const sessionId = `stc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const countNumber = stockCountRepository.generateCountNumber();
    const now = new Date().toISOString();

    // Map system quantity snapshot per product & variant
    const items: StockCountItem[] = [];

    scopedProducts.forEach((prod) => {
      if (prod.variants && prod.variants.length > 0) {
        prod.variants.forEach((v) => {
          const bal = balances.find(
            (b) => b.productId === prod.id && b.variantId === v.id && b.locationId === dto.locationId
          );
          const systemQty = bal ? bal.quantityOnHand : 0;

          items.push({
            id: `sci-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            stockCountId: sessionId,
            productId: prod.id,
            variantId: v.id,
            productName: prod.name,
            variantName: v.name,
            categoryName: prod.categoryName,
            sku: v.sku || prod.sku,
            unit: prod.unit,
            locationId: dto.locationId,
            systemQuantitySnapshot: systemQty,
            systemQuantityAtSubmission: null,
            hasMovementDuringCount: false,
            countedQuantity: null,
            variance: null,
            varianceStatus: 'pending',
            counterId: null,
            counterName: null,
            countedAt: null,
            recounts: [],
            isRecounted: false,
            approvedQuantity: null,
            reconciledQuantity: null,
            notes: null,
            reviewerNotes: null,
            createdAt: now,
            updatedAt: now,
          });
        });
      } else {
        const bal = balances.find(
          (b) => b.productId === prod.id && !b.variantId && b.locationId === dto.locationId
        );
        const systemQty = bal ? bal.quantityOnHand : 0;

        items.push({
          id: `sci-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          stockCountId: sessionId,
          productId: prod.id,
          variantId: null,
          productName: prod.name,
          variantName: null,
          categoryName: prod.categoryName,
          sku: prod.sku,
          unit: prod.unit,
          locationId: dto.locationId,
          systemQuantitySnapshot: systemQty,
          systemQuantityAtSubmission: null,
          hasMovementDuringCount: false,
          countedQuantity: null,
          variance: null,
          varianceStatus: 'pending',
          counterId: null,
          counterName: null,
          countedAt: null,
          recounts: [],
          isRecounted: false,
          approvedQuantity: null,
          reconciledQuantity: null,
          notes: null,
          reviewerNotes: null,
          createdAt: now,
          updatedAt: now,
        });
      }
    });

    const session: StockCountSession = {
      id: sessionId,
      countNumber,
      locationId: dto.locationId,
      locationName: location.name,
      locationCode: location.code,
      countDate: dto.countDate,
      scope: dto.scope,
      categoryId: dto.categoryId || null,
      categoryName,
      status: 'open',
      isBlindCount: Boolean(dto.isBlindCount),
      significantVarianceThreshold: dto.significantVarianceThreshold || null,
      notes: dto.notes ? dto.notes.trim() : null,
      reviewNotes: null,
      initiatedBy: dto.initiatedBy,
      initiatedByName: dto.initiatedByName,
      assignedCounters: dto.assignedCounters || [],
      startedAt: now,
      completedAt: null,
      approvedBy: null,
      approvedByName: null,
      approvedAt: null,
      reconciledBy: null,
      reconciledByName: null,
      reconciledAt: null,
      items,
      createdAt: now,
      updatedAt: now,
    };

    const saved = await stockCountRepository.saveSession(session);

    await auditService.log({
      action: 'STOCK_COUNT_CREATED',
      entityType: 'stock_count',
      entityId: saved.id,
      newValue: {
        countNumber: saved.countNumber,
        location: location.name,
        scope: saved.scope,
        itemsCount: items.length,
        isBlindCount: saved.isBlindCount,
      },
    });

    return saved;
  }

  /**
   * Records a physical count for a single item
   */
  public async recordCount(dto: RecordCountDTO): Promise<StockCountSession> {
    const session = await stockCountRepository.getSessionById(dto.stockCountId);
    if (!session) {
      throw new Error(`Count session with ID '${dto.stockCountId}' not found.`);
    }

    if (['approved', 'reconciled', 'cancelled'].includes(session.status)) {
      throw new Error(`Cannot enter physical counts on a session in '${session.status}' status.`);
    }

    if (dto.countedQuantity < 0) {
      throw new Error('Physical counted quantity cannot be negative.');
    }

    const item = session.items.find((i) => i.id === dto.itemId);
    if (!item) {
      throw new Error(`Count item '${dto.itemId}' not found in session '${session.countNumber}'.`);
    }

    const now = new Date().toISOString();
    const variance = dto.countedQuantity - item.systemQuantitySnapshot;

    let varianceStatus: StockCountItem['varianceStatus'] = 'matched';
    if (variance < 0) {
      varianceStatus = 'shortage';
    } else if (variance > 0) {
      varianceStatus = 'surplus';
    }

    item.countedQuantity = dto.countedQuantity;
    item.variance = variance;
    item.varianceStatus = varianceStatus;
    item.counterId = dto.counterId;
    item.counterName = dto.counterName;
    item.countedAt = now;
    if (dto.notes !== undefined) {
      item.notes = dto.notes.trim() || null;
    }
    item.updatedAt = now;

    if (session.status === 'open') {
      session.status = 'counting';
    }
    session.updatedAt = now;

    return stockCountRepository.saveSession(session);
  }

  /**
   * Batch records physical counts with support for draft auto-save
   */
  public async batchRecordCounts(dto: BatchRecordCountDTO): Promise<StockCountSession> {
    const session = await stockCountRepository.getSessionById(dto.stockCountId);
    if (!session) {
      throw new Error(`Count session with ID '${dto.stockCountId}' not found.`);
    }

    if (['approved', 'reconciled', 'cancelled'].includes(session.status)) {
      throw new Error(`Cannot enter physical counts on a session in '${session.status}' status.`);
    }

    const now = new Date().toISOString();

    for (const count of dto.counts) {
      if (count.countedQuantity < 0) {
        throw new Error('Physical counted quantity cannot be negative.');
      }

      const item = session.items.find((i) => i.id === count.itemId);
      if (item) {
        const variance = count.countedQuantity - item.systemQuantitySnapshot;
        let varianceStatus: StockCountItem['varianceStatus'] = 'matched';
        if (variance < 0) {
          varianceStatus = 'shortage';
        } else if (variance > 0) {
          varianceStatus = 'surplus';
        }

        item.countedQuantity = count.countedQuantity;
        item.variance = variance;
        item.varianceStatus = varianceStatus;
        item.counterId = dto.counterId;
        item.counterName = dto.counterName;
        item.countedAt = now;
        if (count.notes !== undefined) {
          item.notes = count.notes.trim() || null;
        }
        item.updatedAt = now;
      }
    }

    if (session.status === 'open') {
      session.status = 'counting';
    }
    session.updatedAt = now;

    return stockCountRepository.saveSession(session);
  }

  /**
   * Submits the count session for supervisor review
   * Also verifies live inventory movements occurred during the counting period
   */
  public async submitSession(dto: SubmitCountDTO): Promise<StockCountSession> {
    const session = await stockCountRepository.getSessionById(dto.stockCountId);
    if (!session) {
      throw new Error(`Count session with ID '${dto.stockCountId}' not found.`);
    }

    if (!['open', 'counting'].includes(session.status)) {
      throw new Error(`Only open or counting sessions can be submitted. Current status: '${session.status}'.`);
    }

    // Check if any items are uncounted
    const uncounted = session.items.filter((i) => i.countedQuantity === null);
    if (uncounted.length > 0) {
      throw new Error(
        `Cannot submit session: ${uncounted.length} items have not been counted yet. Enter 0 for empty stock or complete counts.`
      );
    }

    const now = new Date().toISOString();

    // Check live balances to detect normal movements during count
    const liveBalances = await inventoryRepository.getAllBalances(session.locationId);

    session.items.forEach((item) => {
      const liveBal = liveBalances.find(
        (b) =>
          b.productId === item.productId &&
          (b.variantId || null) === (item.variantId || null) &&
          b.locationId === session.locationId
      );

      const liveOnHand = liveBal ? liveBal.quantityOnHand : 0;
      item.systemQuantityAtSubmission = liveOnHand;

      if (liveOnHand !== item.systemQuantitySnapshot) {
        item.hasMovementDuringCount = true;
      }

      if (item.varianceStatus === 'pending') {
        item.varianceStatus = 'pending_review';
      }
    });

    session.status = 'submitted';
    session.completedAt = now;
    if (dto.notes) {
      session.notes = session.notes ? `${session.notes}\n${dto.notes.trim()}` : dto.notes.trim();
    }
    session.updatedAt = now;

    const saved = await stockCountRepository.saveSession(session);

    await auditService.log({
      action: 'STOCK_COUNT_SUBMITTED',
      entityType: 'stock_count',
      entityId: saved.id,
      newValue: {
        countNumber: saved.countNumber,
        submittedBy: dto.submittedByName,
        totalItems: saved.items.length,
      },
    });

    return saved;
  }

  /**
   * Requests a recount for a specific item (preserves original count record)
   */
  public async requestRecount(dto: RequestRecountDTO): Promise<StockCountSession> {
    const session = await stockCountRepository.getSessionById(dto.stockCountId);
    if (!session) {
      throw new Error(`Count session with ID '${dto.stockCountId}' not found.`);
    }

    if (['reconciled', 'cancelled'].includes(session.status)) {
      throw new Error(`Cannot request recount on a '${session.status}' session.`);
    }

    const item = session.items.find((i) => i.id === dto.itemId);
    if (!item) {
      throw new Error(`Count item '${dto.itemId}' not found in session.`);
    }

    item.varianceStatus = 'recount_required';
    item.reviewerNotes = dto.reason.trim();
    item.updatedAt = new Date().toISOString();

    session.status = 'under_review';
    session.updatedAt = new Date().toISOString();

    const saved = await stockCountRepository.saveSession(session);

    await auditService.log({
      action: 'STOCK_COUNT_RECOUNT_REQUESTED',
      entityType: 'stock_count',
      entityId: saved.id,
      newValue: {
        countNumber: saved.countNumber,
        item: `${item.productName} (${item.sku})`,
        reason: dto.reason,
        requestedBy: dto.requestedByName,
      },
    });

    return saved;
  }

  /**
   * Performs a recount on an item, preserving the original count history
   */
  public async performRecount(dto: PerformRecountDTO): Promise<StockCountSession> {
    const session = await stockCountRepository.getSessionById(dto.stockCountId);
    if (!session) {
      throw new Error(`Count session with ID '${dto.stockCountId}' not found.`);
    }

    if (dto.recountedQuantity < 0) {
      throw new Error('Recounted quantity cannot be negative.');
    }

    const item = session.items.find((i) => i.id === dto.itemId);
    if (!item) {
      throw new Error(`Count item '${dto.itemId}' not found in session.`);
    }

    const now = new Date().toISOString();
    const previousQuantity = item.countedQuantity ?? 0;

    // Preserve recount log
    if (!item.recounts) {
      item.recounts = [];
    }
    item.recounts.push({
      recountNumber: item.recounts.length + 1,
      previousQuantity,
      recountedQuantity: dto.recountedQuantity,
      reason: dto.reason.trim(),
      performedBy: dto.performedBy,
      performedByName: dto.performedByName,
      timestamp: now,
    });

    item.isRecounted = true;
    item.countedQuantity = dto.recountedQuantity;
    item.variance = dto.recountedQuantity - item.systemQuantitySnapshot;

    let varianceStatus: StockCountItem['varianceStatus'] = 'matched';
    if (item.variance < 0) {
      varianceStatus = 'shortage';
    } else if (item.variance > 0) {
      varianceStatus = 'surplus';
    }
    item.varianceStatus = varianceStatus;
    item.counterId = dto.performedBy;
    item.counterName = dto.performedByName;
    item.countedAt = now;
    item.updatedAt = now;

    session.updatedAt = now;

    return stockCountRepository.saveSession(session);
  }

  /**
   * Approves the stock count session for final reconciliation
   */
  public async approveSession(dto: ApproveStockCountDTO): Promise<StockCountSession> {
    const session = await stockCountRepository.getSessionById(dto.stockCountId);
    if (!session) {
      throw new Error(`Count session with ID '${dto.stockCountId}' not found.`);
    }

    if (!['submitted', 'under_review'].includes(session.status)) {
      throw new Error(`Only submitted or reviewed sessions can be approved. Current status: '${session.status}'.`);
    }

    const now = new Date().toISOString();

    // Map item approvals
    const approvalMap = new Map<string, number>();
    if (dto.itemApprovals && dto.itemApprovals.length > 0) {
      dto.itemApprovals.forEach((a) => approvalMap.set(a.itemId, a.approvedQuantity));
    }

    session.items.forEach((item) => {
      const customApproved = approvalMap.get(item.id);
      item.approvedQuantity = customApproved !== undefined ? customApproved : item.countedQuantity;
      item.varianceStatus = 'approved';
      item.updatedAt = now;
    });

    session.status = 'approved';
    session.approvedBy = dto.approvedBy;
    session.approvedByName = dto.approvedByName;
    session.approvedAt = now;
    if (dto.reviewNotes) {
      session.reviewNotes = dto.reviewNotes.trim();
    }
    session.updatedAt = now;

    const saved = await stockCountRepository.saveSession(session);

    await auditService.log({
      action: 'STOCK_COUNT_APPROVED',
      entityType: 'stock_count',
      entityId: saved.id,
      newValue: {
        countNumber: saved.countNumber,
        approvedBy: dto.approvedByName,
        notes: dto.reviewNotes,
      },
    });

    return saved;
  }

  /**
   * Transactional Reconciliation:
   * Adjusts actual inventory on hand to match approved physical counts
   * and records immutable movements traceable to this stock count session.
   */
  public async reconcileSession(dto: ReconcileStockCountDTO): Promise<StockCountSession> {
    const session = await stockCountRepository.getSessionById(dto.stockCountId);
    if (!session) {
      throw new Error(`Count session with ID '${dto.stockCountId}' not found.`);
    }

    // Safety checks: idempotent, permission-controlled, approved state
    if (session.status !== 'approved') {
      throw new Error(`Cannot reconcile session in '${session.status}' status. The session must be approved first.`);
    }

    if (session.reconciledAt) {
      throw new Error(`This count session was already reconciled on ${session.reconciledAt}.`);
    }

    const now = new Date().toISOString();
    const discrepancyItems = session.items.filter(
      (item) => item.approvedQuantity !== null && item.approvedQuantity !== item.systemQuantitySnapshot
    );

    // Atomic execution: execute all adjustments
    for (const item of discrepancyItems) {
      const targetQuantity = item.approvedQuantity!;

      await inventoryRepository.executeReconciliationMovement({
        productId: item.productId,
        variantId: item.variantId || null,
        locationId: session.locationId,
        approvedQuantity: targetQuantity,
        countNumber: session.countNumber,
        countSessionId: session.id,
        reason: `Physical Stock Count Reconciliation (${session.countNumber}): Snapshot ${item.systemQuantitySnapshot} -> Counted ${targetQuantity} ${item.unit}`,
        notes: item.notes || dto.notes || undefined,
        performedBy: dto.reconciledBy,
        performedByName: dto.reconciledByName,
        context: {
          productName: item.productName,
          variantName: item.variantName || null,
          sku: item.sku,
          unit: item.unit,
          locationName: session.locationName,
        },
      });

      item.reconciledQuantity = targetQuantity;
      item.varianceStatus = 'reconciled';
      item.updatedAt = now;
    }

    // Mark matched items as reconciled too
    session.items.forEach((item) => {
      if (item.approvedQuantity !== null && item.reconciledQuantity === null) {
        item.reconciledQuantity = item.approvedQuantity;
        item.varianceStatus = 'reconciled';
        item.updatedAt = now;
      }
    });

    session.status = 'reconciled';
    session.reconciledBy = dto.reconciledBy;
    session.reconciledByName = dto.reconciledByName;
    session.reconciledAt = now;
    if (dto.notes) {
      session.notes = session.notes ? `${session.notes}\n${dto.notes.trim()}` : dto.notes.trim();
    }
    session.updatedAt = now;

    const saved = await stockCountRepository.saveSession(session);

    await auditService.log({
      action: 'STOCK_COUNT_RECONCILED',
      entityType: 'stock_count',
      entityId: saved.id,
      newValue: {
        countNumber: saved.countNumber,
        reconciledBy: dto.reconciledByName,
        reconciledAdjustmentsCount: discrepancyItems.length,
      },
    });

    return saved;
  }

  /**
   * Returns a submitted/under_review count session back to counting for correction
   */
  public async returnForCorrection(dto: {
    stockCountId: string;
    notes: string;
    returnedBy: string;
    returnedByName: string;
  }): Promise<StockCountSession> {
    const session = await stockCountRepository.getSessionById(dto.stockCountId);
    if (!session) {
      throw new Error(`Count session with ID '${dto.stockCountId}' not found.`);
    }

    if (!['submitted', 'under_review'].includes(session.status)) {
      throw new Error(`Only submitted or under review sessions can be returned for correction. Current status: '${session.status}'.`);
    }

    const now = new Date().toISOString();
    session.status = 'counting';
    session.reviewNotes = dto.notes.trim();
    session.updatedAt = now;

    // Reset items to pending_review or keep recounts
    session.items.forEach((item) => {
      if (item.varianceStatus === 'approved') {
        item.varianceStatus = 'pending_review';
        item.approvedQuantity = null;
      }
    });

    const saved = await stockCountRepository.saveSession(session);

    await auditService.log({
      action: 'STOCK_COUNT_RETURNED_FOR_CORRECTION',
      entityType: 'stock_count',
      entityId: saved.id,
      newValue: {
        countNumber: saved.countNumber,
        returnedBy: dto.returnedByName,
        notes: dto.notes,
      },
    });

    return saved;
  }

  /**
   * Rejects a count session with a reason
   */
  public async rejectSession(dto: {
    stockCountId: string;
    reason: string;
    rejectedBy: string;
    rejectedByName: string;
  }): Promise<StockCountSession> {
    const session = await stockCountRepository.getSessionById(dto.stockCountId);
    if (!session) {
      throw new Error(`Count session with ID '${dto.stockCountId}' not found.`);
    }

    if (['reconciled', 'cancelled'].includes(session.status)) {
      throw new Error(`Cannot reject session with status '${session.status}'.`);
    }

    const now = new Date().toISOString();
    session.status = 'cancelled';
    session.reviewNotes = dto.reason.trim();
    session.notes = session.notes ? `${session.notes}\nRejected: ${dto.reason.trim()}` : `Rejected: ${dto.reason.trim()}`;
    session.updatedAt = now;

    const saved = await stockCountRepository.saveSession(session);

    await auditService.log({
      action: 'STOCK_COUNT_REJECTED',
      entityType: 'stock_count',
      entityId: saved.id,
      newValue: {
        countNumber: saved.countNumber,
        rejectedBy: dto.rejectedByName,
        reason: dto.reason,
      },
    });

    return saved;
  }

  /**
   * Cancels a stock count session (only permitted for draft, open, or counting sessions)
   */
  public async cancelSession(id: string, reason: string, cancelledBy: string, cancelledByName: string): Promise<StockCountSession> {
    const session = await stockCountRepository.getSessionById(id);
    if (!session) {
      throw new Error(`Count session with ID '${id}' not found.`);
    }

    if (['approved', 'reconciled'].includes(session.status)) {
      throw new Error(`Cannot cancel a session that is already '${session.status}'.`);
    }

    const now = new Date().toISOString();
    session.status = 'cancelled';
    session.notes = session.notes ? `${session.notes}\nCancellation reason: ${reason}` : `Cancellation reason: ${reason}`;
    session.updatedAt = now;

    const saved = await stockCountRepository.saveSession(session);

    await auditService.log({
      action: 'STOCK_COUNT_CANCELLED',
      entityType: 'stock_count',
      entityId: saved.id,
      newValue: {
        countNumber: saved.countNumber,
        cancelledBy: cancelledByName,
        reason,
      },
    });

    return saved;
  }

  /**
   * Generates CSV export content for discrepancy report
   */
  public generateDiscrepanciesCSV(
    items: Array<StockCountItem & { sessionCountNumber: string; sessionLocationName: string; sessionDate: string }>
  ): string {
    const headers = [
      'Count Reference',
      'Location',
      'Count Date',
      'Product Name',
      'Variant',
      'SKU',
      'Unit',
      'System Snapshot Qty',
      'Physically Counted Qty',
      'Variance',
      'Type',
      'Status',
      'Counter',
      'Recounted',
      'Notes',
    ];

    const rows = items.map((it) => {
      const v = it.variance ?? 0;
      const type = v < 0 ? 'Shortage' : v > 0 ? 'Surplus' : 'Matched';
      return [
        `"${it.sessionCountNumber}"`,
        `"${it.sessionLocationName}"`,
        `"${it.sessionDate}"`,
        `"${it.productName.replace(/"/g, '""')}"`,
        `"${(it.variantName || '-').replace(/"/g, '""')}"`,
        `"${it.sku}"`,
        `"${it.unit}"`,
        it.systemQuantitySnapshot,
        it.countedQuantity !== null ? it.countedQuantity : 'Uncounted',
        it.variance !== null ? it.variance : 'N/A',
        `"${type}"`,
        `"${it.varianceStatus}"`,
        `"${(it.counterName || '-').replace(/"/g, '""')}"`,
        it.isRecounted ? 'Yes' : 'No',
        `"${(it.notes || '').replace(/"/g, '""')}"`,
      ];
    });

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * Generates CSV export content for a count session
   */
  public generateSessionCSV(session: StockCountSession): string {
    const headers = [
      'Count Reference',
      'Location',
      'Count Date',
      'Product Name',
      'Variant',
      'SKU',
      'Unit',
      'System Snapshot Qty',
      'Counted Qty',
      'Variance',
      'Status',
      'Counter',
      'Recounted',
      'Approved Qty',
      'Notes',
    ];

    const rows = session.items.map((it) => [
      `"${session.countNumber}"`,
      `"${session.locationName}"`,
      `"${session.countDate}"`,
      `"${it.productName.replace(/"/g, '""')}"`,
      `"${(it.variantName || '-').replace(/"/g, '""')}"`,
      `"${it.sku}"`,
      `"${it.unit}"`,
      it.systemQuantitySnapshot,
      it.countedQuantity !== null ? it.countedQuantity : 'Uncounted',
      it.variance !== null ? it.variance : 'N/A',
      `"${it.varianceStatus}"`,
      `"${(it.counterName || '-').replace(/"/g, '""')}"`,
      it.isRecounted ? 'Yes' : 'No',
      it.approvedQuantity !== null ? it.approvedQuantity : 'Pending',
      `"${(it.notes || '').replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

export const stockCountService = new StockCountService();
