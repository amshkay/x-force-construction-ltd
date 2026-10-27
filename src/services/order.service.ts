/**
 * Order Service
 * Module 10 — Orders, Payments & Customer Tracking
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Implements authoritative business logic for order processing,
 * quotation-to-order conversion, status lifecycle progression,
 * customer tracking lookups, and audit logging.
 */

import { orderRepository } from '../repositories/order.repository';
import { quotationRepository } from '../repositories/quotation.repository';
import { requestRepository } from '../repositories/request.repository';
import { auditService } from './audit.service';
import {
  Order,
  OrderStatus,
  OrderFilters,
  OrderStats,
  CreateOrderFromQuotationDTO,
  CreateDirectOrderDTO,
  CancelOrderDTO,
} from '../types/order';

export class OrderService {
  /**
   * Retrieve all orders matching optional filter criteria
   */
  async getAllOrders(filters?: OrderFilters): Promise<Order[]> {
    return orderRepository.getAllOrders(filters);
  }

  /**
   * Retrieve single order by internal UUID
   */
  async getOrderById(id: string): Promise<Order | null> {
    return orderRepository.getOrderById(id);
  }

  /**
   * Retrieve single order by human-readable order number
   */
  async getOrderByNumber(orderNumber: string): Promise<Order | null> {
    return orderRepository.getOrderByNumber(orderNumber);
  }

  /**
   * Retrieve all orders belonging to a customer
   */
  async getOrdersByCustomerId(customerId: string): Promise<Order[]> {
    return orderRepository.getOrdersByCustomerId(customerId);
  }

  /**
   * Convert an accepted quotation to a production order
   * SECTION 2 & 20: Prevents duplicate conversions, preserves original quotation, snapshots all line items
   */
  async convertQuotationToOrder(
    quotationId: string,
    options?: Partial<CreateOrderFromQuotationDTO>
  ): Promise<Order> {
    const quotation = await quotationRepository.getQuotationById(quotationId);
    if (!quotation) {
      throw new Error(`Quotation with ID "${quotationId}" was not found.`);
    }

    if (quotation.status === 'cancelled' || quotation.status === 'expired') {
      throw new Error(`Cannot convert a ${quotation.status} quotation into an active order.`);
    }

    // Check if already converted
    const existingOrders = await orderRepository.getOrdersByQuotationId(quotation.id);
    if (existingOrders.length > 0) {
      throw new Error(
        `Quotation #${quotation.quotationNumber} is already converted to Order #${existingOrders[0].orderNumber}.`
      );
    }

    const dto: CreateOrderFromQuotationDTO = {
      quotationId: quotation.id,
      customerNotes: options?.customerNotes,
      internalNotes: options?.internalNotes,
      orderType: options?.orderType || 'standard',
      initialDepositAmount: options?.initialDepositAmount,
      initialPaymentMethod: options?.initialPaymentMethod,
      initialPaymentReference: options?.initialPaymentReference,
      createdBy: options?.createdBy,
      createdByName: options?.createdByName,
    };

    const newOrder = await orderRepository.createOrderFromQuotation(quotation, dto);

    // 1. Advance Quotation status to 'converted'
    try {
      await quotationRepository.updateStatus(
        quotation.id,
        'converted',
        `Converted to Order #${newOrder.orderNumber}`
      );
    } catch (err) {
      console.warn('[OrderService] Could not update quotation status to converted:', err);
    }

    // 2. Advance linked Request status if present
    if (quotation.requestId) {
      try {
        await requestRepository.updateStatus(
          quotation.requestId,
          'closed',
          `Order #${newOrder.orderNumber} successfully booked from Quotation #${quotation.quotationNumber}.`
        );
      } catch (err) {
        console.warn('[OrderService] Could not advance linked request status:', err);
      }
    }

    // 3. Log Audit Trail
    await auditService.logEvent({
      action: 'create',
      entity_type: 'order',
      entity_id: newOrder.id,
      reason: `Order #${newOrder.orderNumber} created from Quotation #${quotation.quotationNumber}`,
      user_id: options?.createdBy || null,
      new_values: {
        orderNumber: newOrder.orderNumber,
        quotationNumber: quotation.quotationNumber,
        totalAmount: newOrder.totalAmount,
        customerName: newOrder.customerName,
      },
    });

    return newOrder;
  }

  /**
   * Direct order creation
   */
  async createDirectOrder(dto: CreateDirectOrderDTO): Promise<Order> {
    const newOrder = await orderRepository.createDirectOrder(dto);

    await auditService.logEvent({
      action: 'create',
      entity_type: 'order',
      entity_id: newOrder.id,
      reason: `Direct order #${newOrder.orderNumber} created for ${newOrder.customerName}`,
      user_id: dto.createdBy || null,
      new_values: {
        orderNumber: newOrder.orderNumber,
        totalAmount: newOrder.totalAmount,
        customerName: newOrder.customerName,
      },
    });

    return newOrder;
  }

  /**
   * Update order status with audit log
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    changedBy: string,
    changedByName?: string,
    note?: string
  ): Promise<Order> {
    const updated = await orderRepository.updateOrderStatus(
      orderId,
      newStatus,
      changedBy,
      changedByName,
      note,
      true
    );

    await auditService.logEvent({
      action: 'update',
      entity_type: 'order',
      entity_id: updated.id,
      reason: `Order #${updated.orderNumber} status changed to ${newStatus}`,
      user_id: changedBy,
      new_values: {
        orderNumber: updated.orderNumber,
        status: updated.status,
        note,
      },
    });

    return updated;
  }

  /**
   * Cancel an order with required reason
   * SECTION 15: Validates reasons, preserves order record and financial log
   */
  async cancelOrder(dto: CancelOrderDTO): Promise<Order> {
    const cancelled = await orderRepository.cancelOrder(dto);

    await auditService.logEvent({
      action: 'cancel',
      entity_type: 'order',
      entity_id: cancelled.id,
      reason: `Order #${cancelled.orderNumber} cancelled. Reason: ${dto.reason}`,
      user_id: dto.cancelledBy,
      new_values: {
        orderNumber: cancelled.orderNumber,
        cancellationReason: dto.reason,
      },
    });

    return cancelled;
  }

  /**
   * Customer tracking query with privacy verification
   * SECTION 8 & 16: Requires order number + customer phone or email verification
   */
  async trackOrderByNumberAndVerification(
    orderNumber: string,
    verificationInput: string
  ): Promise<Order | null> {
    const order = await orderRepository.getOrderByNumber(orderNumber);
    if (!order) return null;

    const cleanVerify = verificationInput.trim().toLowerCase().replace(/\s+/g, '');
    const cleanPhone = (order.customerPhone || '').replace(/\D/g, '');
    const inputDigits = cleanVerify.replace(/\D/g, '');
    const cleanEmail = (order.customerEmail || '').trim().toLowerCase();

    // Verify against phone digits (at least 6 matching digits) or email
    const phoneMatches = inputDigits.length >= 6 && cleanPhone.includes(inputDigits);
    const emailMatches = cleanEmail.length > 3 && cleanEmail === cleanVerify;

    if (!phoneMatches && !emailMatches) {
      throw new Error(
        'The verification details provided do not match the authorized records for this order.'
      );
    }

    return order;
  }

  /**
   * Get operational statistics
   */
  async getOrderStats(): Promise<OrderStats> {
    return orderRepository.getOrderStats();
  }
}

export const orderService = new OrderService();
