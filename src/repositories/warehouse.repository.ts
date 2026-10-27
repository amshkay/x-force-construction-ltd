/**
 * Warehouse & Fulfilment Operations Repository
 * Module 14 — Warehouse & Delivery Operations
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Implements multi-tier persistence for warehouse fulfillments, picking tasks,
 * packing staging, waybill numbering, and real-time inventory reservation synchronizations.
 */

import { localStore } from '../lib/storage/localStorage';
import { appConfig } from '../config/app.config';
import { getSupabaseClient } from '../lib/supabase/client';
import { businessSettingsService } from '../services/settings.service';
import { orderRepository } from './order.repository';
import { inventoryRepository } from './inventory.repository';
import { stockLocationRepository } from './stockLocation.repository';
import {
  FulfilmentRecord,
  FulfilmentItem,
  FulfilmentStatus,
  FulfilmentType,
  FulfilmentFilters,
  WarehouseTask,
  WarehouseTaskStatus,
  WarehouseStats,
  CreateFulfilmentDTO,
  PackageDetails,
  DispatchDetails,
  ProofOfDelivery,
  FulfilmentStatusHistory,
} from '../types/warehouse';
import { auditService } from '../services/audit.service';

const FULFILMENTS_LOCAL_STORAGE_KEY = 'xforce_fulfilments_cache_v1';
const TASKS_LOCAL_STORAGE_KEY = 'xforce_warehouse_tasks_cache_v1';

export const INITIAL_FOUNDATIONAL_FULFILMENTS: FulfilmentRecord[] = [];

export const INITIAL_FOUNDATIONAL_TASKS: WarehouseTask[] = [];

export class WarehouseRepository {
  private memoryFulfilments: FulfilmentRecord[] | null = null;
  private memoryTasks: WarehouseTask[] | null = null;
  private isRemoteTableAvailable: boolean = true;
  private warnedAboutMissingTable: boolean = false;

  constructor() {
    this.initCache();
  }

  private initCache(): void {
    const storedFulfilments = localStore.get<FulfilmentRecord[] | null>(
      FULFILMENTS_LOCAL_STORAGE_KEY,
      null
    );
    if (storedFulfilments && Array.isArray(storedFulfilments) && storedFulfilments.length > 0) {
      this.memoryFulfilments = storedFulfilments;
    } else {
      this.memoryFulfilments = INITIAL_FOUNDATIONAL_FULFILMENTS;
      localStore.set(FULFILMENTS_LOCAL_STORAGE_KEY, INITIAL_FOUNDATIONAL_FULFILMENTS);
    }

    const storedTasks = localStore.get<WarehouseTask[] | null>(
      TASKS_LOCAL_STORAGE_KEY,
      null
    );
    if (storedTasks && Array.isArray(storedTasks) && storedTasks.length > 0) {
      this.memoryTasks = storedTasks;
    } else {
      this.memoryTasks = INITIAL_FOUNDATIONAL_TASKS;
      localStore.set(TASKS_LOCAL_STORAGE_KEY, INITIAL_FOUNDATIONAL_TASKS);
    }
  }

  private saveFulfilments(fulfilments: FulfilmentRecord[]): void {
    this.memoryFulfilments = fulfilments;
    localStore.set(FULFILMENTS_LOCAL_STORAGE_KEY, fulfilments);
  }

  private saveTasks(tasks: WarehouseTask[]): void {
    this.memoryTasks = tasks;
    localStore.set(TASKS_LOCAL_STORAGE_KEY, tasks);
  }

  /**
   * Generates next sequential fulfilment reference e.g. FUL-2026-0001
   */
  public async generateNextFulfilmentNumber(): Promise<string> {
    const numbering = await businessSettingsService.getNumberingSettings();
    const prefix = numbering?.defaultFulfilmentPrefix || 'FUL';
    const year = new Date().getFullYear();

    const all = await this.getAllFulfilments();
    const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);

    let maxSeq = 0;
    for (const f of all) {
      const match = f.fulfilmentNumber.match(pattern);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }

    return `${prefix}-${year}-${String(maxSeq + 1).padStart(4, '0')}`;
  }

  /**
   * Generates next sequential warehouse task reference e.g. TSK-2026-0001
   */
  public async generateNextTaskNumber(): Promise<string> {
    const numbering = await businessSettingsService.getNumberingSettings();
    const prefix = numbering?.defaultWarehouseTaskPrefix || 'TSK';
    const year = new Date().getFullYear();

    const all = await this.getAllTasks();
    const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);

    let maxSeq = 0;
    for (const t of all) {
      const match = t.taskNumber.match(pattern);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }

    return `${prefix}-${year}-${String(maxSeq + 1).padStart(4, '0')}`;
  }

  /**
   * Generates next sequential waybill number e.g. WAY-2026-0001
   */
  public async generateNextWaybillNumber(): Promise<string> {
    const numbering = await businessSettingsService.getNumberingSettings();
    const prefix = numbering?.defaultWaybillPrefix || 'WAY';
    const year = new Date().getFullYear();

    const all = await this.getAllFulfilments();
    const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);

    let maxSeq = 0;
    for (const f of all) {
      if (f.packageDetails?.waybillNumber) {
        const match = f.packageDetails.waybillNumber.match(pattern);
        if (match) {
          const seq = parseInt(match[1], 10);
          if (seq > maxSeq) maxSeq = seq;
        }
      }
    }

    return `${prefix}-${year}-${String(maxSeq + 1).padStart(4, '0')}`;
  }

  // ============================================================================
  // FULFILMENT QUERY & RETRIEVAL
  // ============================================================================

  public async getAllFulfilments(filters?: FulfilmentFilters): Promise<FulfilmentRecord[]> {
    let results = [...(this.memoryFulfilments || [])];

    if (!filters) return results;

    if (filters.status && filters.status !== 'all') {
      results = results.filter((f) => f.status === filters.status);
    }
    if (filters.fulfilmentType && filters.fulfilmentType !== 'all') {
      results = results.filter((f) => f.fulfilmentType === filters.fulfilmentType);
    }
    if (filters.locationId && filters.locationId !== 'all') {
      results = results.filter((f) => f.sourceLocationId === filters.locationId);
    }
    if (filters.priority && filters.priority !== 'all') {
      results = results.filter((f) => f.priority === filters.priority);
    }
    if (filters.orderId) {
      results = results.filter((f) => f.orderId === filters.orderId);
    }
    if (filters.searchTerm?.trim()) {
      const term = filters.searchTerm.toLowerCase().trim();
      results = results.filter(
        (f) =>
          f.fulfilmentNumber.toLowerCase().includes(term) ||
          f.orderNumber.toLowerCase().includes(term) ||
          f.customerName.toLowerCase().includes(term) ||
          f.customerPhone.toLowerCase().includes(term) ||
          (f.destinationAddress && f.destinationAddress.toLowerCase().includes(term)) ||
          (f.packageDetails?.waybillNumber && f.packageDetails.waybillNumber.toLowerCase().includes(term))
      );
    }

    return results;
  }

  public async getFulfilmentById(id: string): Promise<FulfilmentRecord | null> {
    const all = await this.getAllFulfilments();
    return all.find((f) => f.id === id) || null;
  }

  public async getFulfilmentsByOrderId(orderId: string): Promise<FulfilmentRecord[]> {
    const all = await this.getAllFulfilments();
    return all.filter((f) => f.orderId === orderId);
  }

  // ============================================================================
  // FULFILMENT CREATION & STOCK ALLOCATION
  // ============================================================================

  /**
   * Creates a new fulfilment record, validates stock availability,
   * reserves inventory, and spawns the initial warehouse picking task.
   */
  public async createFulfilment(dto: CreateFulfilmentDTO): Promise<FulfilmentRecord> {
    const order = await orderRepository.getOrderById(dto.orderId);
    if (!order) {
      throw new Error(`Order ${dto.orderId} does not exist.`);
    }

    if (order.status === 'cancelled') {
      throw new Error(`Cannot fulfil cancelled Order #${order.orderNumber}.`);
    }

    const locations = await stockLocationRepository.getAllLocations();
    const sourceLoc = locations.find((l) => l.id === dto.sourceLocationId);
    if (!sourceLoc) {
      throw new Error(`Source stock location ${dto.sourceLocationId} not found.`);
    }

    // 1. Stock availability validation for all allocated items
    for (const alloc of dto.allocatedItems) {
      if (alloc.allocatedQuantity <= 0) continue;
      const balance = await inventoryRepository.getBalance(
        alloc.productId,
        alloc.variantId || null,
        dto.sourceLocationId
      );
      const onHand = balance?.quantityOnHand || 0;
      const reserved = balance?.quantityReserved || 0;
      const available = Math.max(0, onHand - reserved);

      if (alloc.allocatedQuantity > available) {
        throw new Error(
          `Insufficient stock at ${sourceLoc.name}. Requested ${alloc.allocatedQuantity} units, but only ${available} units available.`
        );
      }
    }

    const now = new Date().toISOString();
    const fulfilmentId = `ful-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const fulfilmentNumber = await this.generateNextFulfilmentNumber();

    // Map items from order items snapshot
    const fulfilmentItems: FulfilmentItem[] = [];
    for (const alloc of dto.allocatedItems) {
      const orderItem = order.items.find((it) => it.id === alloc.orderItemId);
      if (!orderItem) continue;

      fulfilmentItems.push({
        id: `fli-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        fulfilmentId,
        orderItemId: orderItem.id,
        productId: alloc.productId,
        variantId: alloc.variantId || null,
        productName: orderItem.productName,
        variantName: orderItem.variantDescription || null,
        sku: orderItem.sku || 'SKU-GEN',
        unit: orderItem.unit,
        requiredQuantity: orderItem.quantity,
        allocatedQuantity: alloc.allocatedQuantity,
        pickedQuantity: 0,
        verifiedQuantity: 0,
        locationId: dto.sourceLocationId,
        locationName: sourceLoc.name,
        bayCode: alloc.bayCode || null,
      });

      // Atomically reserve inventory
      if (alloc.allocatedQuantity > 0) {
        await inventoryRepository.adjustReservedStock(
          alloc.productId,
          alloc.variantId || null,
          dto.sourceLocationId,
          alloc.allocatedQuantity
        );
      }
    }

    const initialHistory: FulfilmentStatusHistory = {
      id: `fsh-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      fulfilmentId,
      previousStatus: null,
      newStatus: 'allocated',
      changedBy: dto.createdBy || 'staff',
      changedByName: dto.createdByName || 'Staff Member',
      timestamp: now,
      note: `Fulfilment initiated and stock allocated from ${sourceLoc.name}.`,
    };

    const newFulfilment: FulfilmentRecord = {
      id: fulfilmentId,
      fulfilmentNumber,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      fulfilmentType: dto.fulfilmentType,
      sourceLocationId: dto.sourceLocationId,
      sourceLocationName: sourceLoc.name,
      destinationAddress: dto.destinationAddress ?? order.deliveryAddress ?? null,
      destinationCity: dto.destinationCity ?? order.deliveryCity ?? null,
      destinationState: dto.destinationState ?? order.deliveryState ?? null,
      gpsLatitude: dto.gpsLatitude ?? order.gpsLatitude ?? null,
      gpsLongitude: dto.gpsLongitude ?? order.gpsLongitude ?? null,
      deliveryNotes: dto.deliveryNotes ?? order.deliveryNotes ?? null,
      assignedStaffId: dto.assignedStaffId ?? null,
      assignedStaffName: dto.assignedStaffName ?? null,
      priority: dto.priority || 'normal',
      status: 'allocated',
      items: fulfilmentItems,
      packageDetails: null,
      dispatchDetails: null,
      proofOfDelivery: null,
      notes: dto.notes ?? null,
      createdBy: dto.createdBy ?? null,
      createdByName: dto.createdByName ?? null,
      createdAt: now,
      updatedAt: now,
      statusHistory: [initialHistory],
    };

    const allFulfilments = [newFulfilment, ...(this.memoryFulfilments || [])];
    this.saveFulfilments(allFulfilments);

    // 2. Automatically spawn Warehouse Task (Picking)
    const taskNumber = await this.generateNextTaskNumber();
    const totalUnits = fulfilmentItems.reduce((sum, it) => sum + it.allocatedQuantity, 0);

    const initialTask: WarehouseTask = {
      id: `tsk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      taskNumber,
      fulfilmentId: newFulfilment.id,
      fulfilmentNumber: newFulfilment.fulfilmentNumber,
      orderId: order.id,
      orderNumber: order.orderNumber,
      stockLocationId: dto.sourceLocationId,
      stockLocationName: sourceLoc.name,
      taskType: 'picking',
      assignedStaffId: dto.assignedStaffId ?? null,
      assignedStaffName: dto.assignedStaffName ?? null,
      priority: dto.priority || 'normal',
      status: dto.assignedStaffId ? 'assigned' : 'pending',
      notes: `Retrieve ${totalUnits} units for Fulfilment #${newFulfilment.fulfilmentNumber}`,
      itemCount: fulfilmentItems.length,
      totalUnits,
      createdTime: now,
      createdAt: now,
      updatedAt: now,
    };

    const allTasks = [initialTask, ...(this.memoryTasks || [])];
    this.saveTasks(allTasks);

    // Audit log
    await auditService.logAction(
      'ORDER_FULFILMENT_CREATED',
      'orders',
      newFulfilment.id,
      `Fulfilment #${newFulfilment.fulfilmentNumber} prepared for Order #${order.orderNumber} (${totalUnits} units allocated)`,
      dto.createdBy,
      dto.createdByName
    );

    return newFulfilment;
  }

  // ============================================================================
  // PICKING PROGRESSION
  // ============================================================================

  /**
   * Updates picked quantities, records notes/discrepancies,
   * and advances fulfilment status to 'picking' or 'picked'.
   */
  public async updatePickingProgress(
    fulfilmentId: string,
    pickedItems: Array<{ itemId: string; pickedQuantity: number; discrepancyNote?: string }>,
    staffId: string,
    staffName: string
  ): Promise<FulfilmentRecord> {
    const fulfilment = await this.getFulfilmentById(fulfilmentId);
    if (!fulfilment) {
      throw new Error(`Fulfilment ${fulfilmentId} not found.`);
    }

    if (fulfilment.status === 'cancelled' || fulfilment.status === 'delivered') {
      throw new Error(`Cannot update picking on a ${fulfilment.status} fulfilment.`);
    }

    const now = new Date().toISOString();
    let allPicked = true;

    const updatedItems = fulfilment.items.map((item) => {
      const match = pickedItems.find((p) => p.itemId === item.id);
      if (match) {
        const qty = Math.max(0, match.pickedQuantity);
        if (qty < item.allocatedQuantity) {
          allPicked = false;
        }
        return {
          ...item,
          pickedQuantity: qty,
          discrepancyNote: match.discrepancyNote || item.discrepancyNote || null,
        };
      } else {
        if (item.pickedQuantity < item.allocatedQuantity) {
          allPicked = false;
        }
        return item;
      }
    });

    const newStatus: FulfilmentStatus = allPicked ? 'picked' : 'picking';

    const historyEntry: FulfilmentStatusHistory = {
      id: `fsh-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      fulfilmentId,
      previousStatus: fulfilment.status,
      newStatus,
      changedBy: staffId,
      changedByName: staffName,
      timestamp: now,
      note: allPicked
        ? `All items successfully picked from warehouse bays.`
        : `Picking in progress by ${staffName}.`,
    };

    const updatedFulfilment: FulfilmentRecord = {
      ...fulfilment,
      status: newStatus,
      items: updatedItems,
      updatedAt: now,
      statusHistory: [...fulfilment.statusHistory, historyEntry],
    };

    const all = (this.memoryFulfilments || []).map((f) =>
      f.id === fulfilmentId ? updatedFulfilment : f
    );
    this.saveFulfilments(all);

    // Update associated tasks
    const tasks = (this.memoryTasks || []).map((t) => {
      if (t.fulfilmentId === fulfilmentId && t.taskType === 'picking') {
        return {
          ...t,
          status: (allPicked ? 'completed' : 'in_progress') as WarehouseTaskStatus,
          startedTime: t.startedTime || now,
          completedTime: allPicked ? now : null,
          updatedAt: now,
        };
      }
      return t;
    });
    this.saveTasks(tasks);

    return updatedFulfilment;
  }

  // ============================================================================
  // QUANTITY VERIFICATION
  // ============================================================================

  /**
   * Double-checks picked items against order specifications prior to loading.
   */
  public async verifyFulfilment(
    fulfilmentId: string,
    verifiedItems: Array<{ itemId: string; verifiedQuantity: number }>,
    staffId: string,
    staffName: string
  ): Promise<FulfilmentRecord> {
    const fulfilment = await this.getFulfilmentById(fulfilmentId);
    if (!fulfilment) {
      throw new Error(`Fulfilment ${fulfilmentId} not found.`);
    }

    const now = new Date().toISOString();
    const updatedItems = fulfilment.items.map((item) => {
      const match = verifiedItems.find((v) => v.itemId === item.id);
      return {
        ...item,
        verifiedQuantity: match !== undefined ? match.verifiedQuantity : item.pickedQuantity,
      };
    });

    const historyEntry: FulfilmentStatusHistory = {
      id: `fsh-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      fulfilmentId,
      previousStatus: fulfilment.status,
      newStatus: 'verified',
      changedBy: staffId,
      changedByName: staffName,
      timestamp: now,
      note: `Items verified by ${staffName}. Pallet loading cleared.`,
    };

    const updatedFulfilment: FulfilmentRecord = {
      ...fulfilment,
      status: 'verified',
      items: updatedItems,
      updatedAt: now,
      statusHistory: [...fulfilment.statusHistory, historyEntry],
    };

    const all = (this.memoryFulfilments || []).map((f) =>
      f.id === fulfilmentId ? updatedFulfilment : f
    );
    this.saveFulfilments(all);

    return updatedFulfilment;
  }

  // ============================================================================
  // PACKING & LOADING PREPARATION
  // ============================================================================

  /**
   * Records pallet/crate count, strapping verification, and loading dock assignment.
   */
  public async packFulfilment(
    fulfilmentId: string,
    packageDetails: PackageDetails,
    staffId: string,
    staffName: string
  ): Promise<FulfilmentRecord> {
    const fulfilment = await this.getFulfilmentById(fulfilmentId);
    if (!fulfilment) {
      throw new Error(`Fulfilment ${fulfilmentId} not found.`);
    }

    const now = new Date().toISOString();
    const waybillNumber = packageDetails.waybillNumber || (await this.generateNextWaybillNumber());

    const finalizedPackages: PackageDetails = {
      ...packageDetails,
      waybillNumber,
      packedBy: staffId,
      packedByName: staffName,
      packedAt: now,
    };

    const historyEntry: FulfilmentStatusHistory = {
      id: `fsh-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      fulfilmentId,
      previousStatus: fulfilment.status,
      newStatus: 'ready_for_dispatch',
      changedBy: staffId,
      changedByName: staffName,
      timestamp: now,
      note: `Packed onto ${finalizedPackages.packageCount} ${finalizedPackages.packageType}. Waybill #${waybillNumber} issued. Ready for dispatch.`,
    };

    const updatedFulfilment: FulfilmentRecord = {
      ...fulfilment,
      status: 'ready_for_dispatch',
      packageDetails: finalizedPackages,
      updatedAt: now,
      statusHistory: [...fulfilment.statusHistory, historyEntry],
    };

    const all = (this.memoryFulfilments || []).map((f) =>
      f.id === fulfilmentId ? updatedFulfilment : f
    );
    this.saveFulfilments(all);

    return updatedFulfilment;
  }

  // ============================================================================
  // DISPATCH & INVENTORY DEDUCTION
  // ============================================================================

  /**
   * Dispatches the shipment from the yard (or customer pickup).
   * Atomically decrements physical stock (quantityOnHand) and releases reservation,
   * generates official dispatch movement, and syncs order status.
   */
  public async dispatchFulfilment(
    fulfilmentId: string,
    dispatchDetails: DispatchDetails,
    staffId: string,
    staffName: string
  ): Promise<FulfilmentRecord> {
    const fulfilment = await this.getFulfilmentById(fulfilmentId);
    if (!fulfilment) {
      throw new Error(`Fulfilment ${fulfilmentId} not found.`);
    }

    if (fulfilment.status === 'dispatched' || fulfilment.status === 'in_transit' || fulfilment.status === 'delivered') {
      throw new Error(`Fulfilment #${fulfilment.fulfilmentNumber} has already been dispatched.`);
    }

    const now = new Date().toISOString();

    // 1. Physical inventory deduction via inventoryRepository
    const deductionItems = fulfilment.items.map((it) => ({
      productId: it.productId,
      variantId: it.variantId || null,
      productName: it.productName,
      variantName: it.variantName || null,
      sku: it.sku,
      unit: it.unit,
      quantity: it.allocatedQuantity,
    }));

    await inventoryRepository.executeFulfilmentDispatch({
      fulfilmentId: fulfilment.id,
      fulfilmentNumber: fulfilment.fulfilmentNumber,
      orderId: fulfilment.orderId,
      orderNumber: fulfilment.orderNumber,
      locationId: fulfilment.sourceLocationId,
      locationName: fulfilment.sourceLocationName,
      items: deductionItems,
      performedBy: staffId,
      performedByName: staffName,
    });

    const newStatus: FulfilmentStatus =
      fulfilment.fulfilmentType === 'pickup' ? 'delivered' : 'in_transit';

    const historyEntry: FulfilmentStatusHistory = {
      id: `fsh-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      fulfilmentId,
      previousStatus: fulfilment.status,
      newStatus,
      changedBy: staffId,
      changedByName: staffName,
      timestamp: now,
      note:
        fulfilment.fulfilmentType === 'pickup'
          ? `Collected by customer (${dispatchDetails.collectorName || 'Authorized agent'}). Inventory deducted.`
          : `Dispatched via truck ${dispatchDetails.vehicleNumber || 'Standard Haulage'}. Driver: ${dispatchDetails.driverName || 'N/A'}. In transit.`,
    };

    const finalizedDispatch: DispatchDetails = {
      ...dispatchDetails,
      dispatchedAt: now,
      dispatchedBy: staffId,
      dispatchedByName: staffName,
      deliveryStatus: fulfilment.fulfilmentType === 'pickup' ? 'delivered' : 'in_transit',
    };

    // If pickup, also record ProofOfDelivery right away
    let podRecord: ProofOfDelivery | null = fulfilment.proofOfDelivery || null;
    if (fulfilment.fulfilmentType === 'pickup') {
      podRecord = {
        recipientName: dispatchDetails.collectorName || fulfilment.customerName,
        recipientPhone: dispatchDetails.collectorPhone || fulfilment.customerPhone,
        deliveredAt: now,
        conditionOnArrival: 'good',
        signOffNotes: `Direct counter/yard pickup collected. ID: ${dispatchDetails.collectorIdNumber || 'Verified'}.`,
        recordedBy: staffId,
        recordedByName: staffName,
      };
    }

    const updatedFulfilment: FulfilmentRecord = {
      ...fulfilment,
      status: newStatus,
      dispatchDetails: finalizedDispatch,
      proofOfDelivery: podRecord,
      updatedAt: now,
      statusHistory: [...fulfilment.statusHistory, historyEntry],
    };

    const all = (this.memoryFulfilments || []).map((f) =>
      f.id === fulfilmentId ? updatedFulfilment : f
    );
    this.saveFulfilments(all);

    // 2. Synchronize order status
    try {
      const order = await orderRepository.getOrderById(fulfilment.orderId);
      if (order && order.status !== 'completed') {
        const orderNextStatus = fulfilment.fulfilmentType === 'pickup' ? 'completed' : 'ready';
        await orderRepository.updateOrderStatus(
          order.id,
          orderNextStatus,
          staffId,
          staffName,
          `Fulfilment #${fulfilment.fulfilmentNumber} ${fulfilment.fulfilmentType === 'pickup' ? 'collected' : 'dispatched'}.`
        );
      }
    } catch (err) {
      console.warn('[WarehouseRepository] Failed to advance order status after dispatch:', err);
    }

    return updatedFulfilment;
  }

  // ============================================================================
  // PROOF OF DELIVERY (POD)
  // ============================================================================

  /**
   * Confirms arrival at client site and stores customer sign-off or digital POD.
   */
  public async deliverFulfilment(
    fulfilmentId: string,
    pod: ProofOfDelivery,
    staffId: string,
    staffName: string
  ): Promise<FulfilmentRecord> {
    const fulfilment = await this.getFulfilmentById(fulfilmentId);
    if (!fulfilment) {
      throw new Error(`Fulfilment ${fulfilmentId} not found.`);
    }

    const now = new Date().toISOString();

    const finalizedPod: ProofOfDelivery = {
      ...pod,
      deliveredAt: pod.deliveredAt || now,
      recordedBy: staffId,
      recordedByName: staffName,
    };

    const historyEntry: FulfilmentStatusHistory = {
      id: `fsh-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      fulfilmentId,
      previousStatus: fulfilment.status,
      newStatus: 'delivered',
      changedBy: staffId,
      changedByName: staffName,
      timestamp: now,
      note: `Confirmed delivered to ${finalizedPod.recipientName}. Condition: ${finalizedPod.conditionOnArrival}.`,
    };

    const updatedFulfilment: FulfilmentRecord = {
      ...fulfilment,
      status: 'delivered',
      proofOfDelivery: finalizedPod,
      updatedAt: now,
      statusHistory: [...fulfilment.statusHistory, historyEntry],
    };

    const all = (this.memoryFulfilments || []).map((f) =>
      f.id === fulfilmentId ? updatedFulfilment : f
    );
    this.saveFulfilments(all);

    // Sync order to completed if all fulfilments for this order are delivered
    try {
      const orderFulfilments = await this.getFulfilmentsByOrderId(fulfilment.orderId);
      const allDelivered = orderFulfilments.every((f) => f.status === 'delivered');
      if (allDelivered) {
        await orderRepository.updateOrderStatus(
          fulfilment.orderId,
          'completed',
          staffId,
          staffName,
          `All shipments delivered. Final POD recorded for Fulfilment #${fulfilment.fulfilmentNumber}.`
        );
      }
    } catch (err) {
      console.warn('[WarehouseRepository] Failed to complete order after delivery POD:', err);
    }

    return updatedFulfilment;
  }

  // ============================================================================
  // CANCELLATION & STOCK RELEASE
  // ============================================================================

  /**
   * Cancels an un-dispatched fulfilment and releases reserved inventory.
   */
  public async cancelFulfilment(
    fulfilmentId: string,
    reason: string,
    staffId: string,
    staffName: string
  ): Promise<FulfilmentRecord> {
    const fulfilment = await this.getFulfilmentById(fulfilmentId);
    if (!fulfilment) {
      throw new Error(`Fulfilment ${fulfilmentId} not found.`);
    }

    if (fulfilment.status === 'dispatched' || fulfilment.status === 'in_transit' || fulfilment.status === 'delivered') {
      throw new Error(`Cannot cancel fulfilment after dispatch has taken place.`);
    }

    const now = new Date().toISOString();

    // Release allocated reservations
    await inventoryRepository.executeFulfilmentRelease({
      fulfilmentId: fulfilment.id,
      fulfilmentNumber: fulfilment.fulfilmentNumber,
      locationId: fulfilment.sourceLocationId,
      items: fulfilment.items.map((it) => ({
        productId: it.productId,
        variantId: it.variantId || null,
        quantity: it.allocatedQuantity,
      })),
    });

    const historyEntry: FulfilmentStatusHistory = {
      id: `fsh-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      fulfilmentId,
      previousStatus: fulfilment.status,
      newStatus: 'cancelled',
      changedBy: staffId,
      changedByName: staffName,
      timestamp: now,
      note: `Fulfilment voided: ${reason}. Reserved stock released back to available inventory.`,
    };

    const updatedFulfilment: FulfilmentRecord = {
      ...fulfilment,
      status: 'cancelled',
      notes: fulfilment.notes ? `${fulfilment.notes} | Cancel Reason: ${reason}` : `Cancel Reason: ${reason}`,
      updatedAt: now,
      statusHistory: [...fulfilment.statusHistory, historyEntry],
    };

    const all = (this.memoryFulfilments || []).map((f) =>
      f.id === fulfilmentId ? updatedFulfilment : f
    );
    this.saveFulfilments(all);

    // Cancel related tasks
    const tasks = (this.memoryTasks || []).map((t) => {
      if (t.fulfilmentId === fulfilmentId && t.status !== 'completed') {
        return {
          ...t,
          status: 'cancelled' as WarehouseTaskStatus,
          updatedAt: now,
        };
      }
      return t;
    });
    this.saveTasks(tasks);

    return updatedFulfilment;
  }

  // ============================================================================
  // WAREHOUSE TASKS
  // ============================================================================

  public async getAllTasks(): Promise<WarehouseTask[]> {
    return [...(this.memoryTasks || [])];
  }

  public async getTaskById(taskId: string): Promise<WarehouseTask | null> {
    const all = await this.getAllTasks();
    return all.find((t) => t.id === taskId) || null;
  }

  public async updateTaskStatus(
    taskId: string,
    status: WarehouseTaskStatus,
    staffId?: string,
    staffName?: string
  ): Promise<WarehouseTask> {
    const task = await this.getTaskById(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found.`);
    }

    const now = new Date().toISOString();
    const updated: WarehouseTask = {
      ...task,
      status,
      assignedStaffId: staffId || task.assignedStaffId,
      assignedStaffName: staffName || task.assignedStaffName,
      startedTime: status === 'in_progress' ? task.startedTime || now : task.startedTime,
      completedTime: status === 'completed' ? now : task.completedTime,
      updatedAt: now,
    };

    const all = (this.memoryTasks || []).map((t) => (t.id === taskId ? updated : t));
    this.saveTasks(all);

    return updated;
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  public async getStats(): Promise<WarehouseStats> {
    const fulfilments = await this.getAllFulfilments();
    const tasks = await this.getAllTasks();

    let pendingAllocation = 0;
    let inPicking = 0;
    let readyForDispatch = 0;
    let inTransit = 0;
    let delivered = 0;

    for (const f of fulfilments) {
      if (f.status === 'draft') pendingAllocation++;
      if (f.status === 'allocated' || f.status === 'picking' || f.status === 'picked' || f.status === 'verified') inPicking++;
      if (f.status === 'packed' || f.status === 'ready_for_dispatch') readyForDispatch++;
      if (f.status === 'dispatched' || f.status === 'in_transit') inTransit++;
      if (f.status === 'delivered') delivered++;
    }

    const openTasks = tasks.filter(
      (t) => t.status === 'pending' || t.status === 'assigned' || t.status === 'in_progress'
    ).length;

    return {
      totalFulfilments: fulfilments.length,
      pendingAllocation,
      inPicking,
      readyForDispatch,
      inTransit,
      delivered,
      totalTasks: tasks.length,
      openTasks,
    };
  }
}

export const warehouseRepository = new WarehouseRepository();
