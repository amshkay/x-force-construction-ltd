/**
 * Warehouse & Fulfilment Service
 * Module 14 — Warehouse & Delivery Operations
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Coordinates physical yard workflows, order eligibility checks,
 * safe stock allocations, picking checklists, waybill creation, and proof of delivery (POD).
 */

import { warehouseRepository } from '../repositories/warehouse.repository';
import { orderRepository } from '../repositories/order.repository';
import {
  FulfilmentRecord,
  FulfilmentFilters,
  WarehouseTask,
  WarehouseTaskStatus,
  WarehouseStats,
  CreateFulfilmentDTO,
  PackageDetails,
  DispatchDetails,
  ProofOfDelivery,
} from '../types/warehouse';
import { Order } from '../types/order';

export interface EligibleOrderSummary {
  order: Order;
  totalPhysicalItems: number;
  totalOrderedQuantity: number;
  totalFulfilledQuantity: number;
  totalRemainingQuantity: number;
  fulfilmentCount: number;
}

export class WarehouseService {
  public async getAllFulfilments(filters?: FulfilmentFilters): Promise<FulfilmentRecord[]> {
    return warehouseRepository.getAllFulfilments(filters);
  }

  public async getFulfilmentById(id: string): Promise<FulfilmentRecord | null> {
    return warehouseRepository.getFulfilmentById(id);
  }

  public async getFulfilmentsByOrderId(orderId: string): Promise<FulfilmentRecord[]> {
    return warehouseRepository.getFulfilmentsByOrderId(orderId);
  }

  /**
   * Identifies confirmed and paid/partially-paid orders that contain physical products
   * and calculates remaining items waiting for warehouse fulfilment.
   */
  public async getEligibleOrdersForFulfilment(): Promise<EligibleOrderSummary[]> {
    const [orders, allFulfilments] = await Promise.all([
      orderRepository.getAllOrders(),
      warehouseRepository.getAllFulfilments(),
    ]);

    const eligibleStatuses = ['confirmed', 'paid', 'partially_paid', 'processing', 'ready'];
    const eligibleOrders: EligibleOrderSummary[] = [];

    for (const order of orders) {
      if (!eligibleStatuses.includes(order.status)) continue;
      if (order.status === 'cancelled') continue;

      // Filter for physical products
      const physicalItems = order.items.filter((it) => it.itemType === 'product');
      if (physicalItems.length === 0) continue;

      const orderFulfilments = allFulfilments.filter(
        (f) => f.orderId === order.id && f.status !== 'cancelled'
      );

      const totalOrderedQuantity = physicalItems.reduce((sum, it) => sum + it.quantity, 0);

      // Sum quantities already allocated across existing active fulfilments
      let totalFulfilledQuantity = 0;
      orderFulfilments.forEach((f) => {
        f.items.forEach((fi) => {
          totalFulfilledQuantity += fi.allocatedQuantity;
        });
      });

      const totalRemainingQuantity = Math.max(0, totalOrderedQuantity - totalFulfilledQuantity);

      // Only include if there are remaining quantities or if actively processing
      if (totalRemainingQuantity > 0 || orderFulfilments.length > 0) {
        eligibleOrders.push({
          order,
          totalPhysicalItems: physicalItems.length,
          totalOrderedQuantity,
          totalFulfilledQuantity,
          totalRemainingQuantity,
          fulfilmentCount: orderFulfilments.length,
        });
      }
    }

    return eligibleOrders;
  }

  public async createFulfilment(dto: CreateFulfilmentDTO): Promise<FulfilmentRecord> {
    if (!dto.orderId) {
      throw new Error('Order ID is required to initiate fulfilment.');
    }
    if (!dto.sourceLocationId) {
      throw new Error('Source stock location must be specified.');
    }
    if (!dto.allocatedItems || dto.allocatedItems.length === 0) {
      throw new Error('At least one item must be allocated for fulfilment.');
    }

    const hasAllocatedPositiveQty = dto.allocatedItems.some((it) => it.allocatedQuantity > 0);
    if (!hasAllocatedPositiveQty) {
      throw new Error('Total allocated quantity must be greater than zero.');
    }

    return warehouseRepository.createFulfilment(dto);
  }

  public async updatePickingProgress(
    fulfilmentId: string,
    pickedItems: Array<{ itemId: string; pickedQuantity: number; discrepancyNote?: string }>,
    staffId: string,
    staffName: string
  ): Promise<FulfilmentRecord> {
    return warehouseRepository.updatePickingProgress(fulfilmentId, pickedItems, staffId, staffName);
  }

  public async verifyFulfilment(
    fulfilmentId: string,
    verifiedItems: Array<{ itemId: string; verifiedQuantity: number }>,
    staffId: string,
    staffName: string
  ): Promise<FulfilmentRecord> {
    return warehouseRepository.verifyFulfilment(fulfilmentId, verifiedItems, staffId, staffName);
  }

  public async packFulfilment(
    fulfilmentId: string,
    packageDetails: PackageDetails,
    staffId: string,
    staffName: string
  ): Promise<FulfilmentRecord> {
    if (packageDetails.packageCount <= 0) {
      throw new Error('Package count must be at least 1 container / pallet.');
    }
    return warehouseRepository.packFulfilment(fulfilmentId, packageDetails, staffId, staffName);
  }

  public async dispatchFulfilment(
    fulfilmentId: string,
    dispatchDetails: DispatchDetails,
    staffId: string,
    staffName: string
  ): Promise<FulfilmentRecord> {
    return warehouseRepository.dispatchFulfilment(fulfilmentId, dispatchDetails, staffId, staffName);
  }

  public async deliverFulfilment(
    fulfilmentId: string,
    pod: ProofOfDelivery,
    staffId: string,
    staffName: string
  ): Promise<FulfilmentRecord> {
    if (!pod.recipientName || !pod.recipientName.trim()) {
      throw new Error('Recipient name is required for Proof of Delivery.');
    }
    return warehouseRepository.deliverFulfilment(fulfilmentId, pod, staffId, staffName);
  }

  public async cancelFulfilment(
    fulfilmentId: string,
    reason: string,
    staffId: string,
    staffName: string
  ): Promise<FulfilmentRecord> {
    if (!reason || !reason.trim()) {
      throw new Error('A cancellation reason must be provided.');
    }
    return warehouseRepository.cancelFulfilment(fulfilmentId, reason.trim(), staffId, staffName);
  }

  public async getAllTasks(): Promise<WarehouseTask[]> {
    return warehouseRepository.getAllTasks();
  }

  public async getTaskById(taskId: string): Promise<WarehouseTask | null> {
    return warehouseRepository.getTaskById(taskId);
  }

  public async updateTaskStatus(
    taskId: string,
    status: WarehouseTaskStatus,
    staffId?: string,
    staffName?: string
  ): Promise<WarehouseTask> {
    return warehouseRepository.updateTaskStatus(taskId, status, staffId, staffName);
  }

  public async getStats(): Promise<WarehouseStats> {
    return warehouseRepository.getStats();
  }
}

export const warehouseService = new WarehouseService();
