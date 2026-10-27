/**
 * Order Repository
 * Module 10 — Orders, Payments & Customer Tracking
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Provides multi-tier persistence (Memory -> LocalStorage -> Supabase)
 * with commercial snapshots, idempotent order numbering, and lifecycle management.
 */

import { getSupabaseClient, isNetworkOrFetchError, markRemoteDbUnavailable } from '../lib/supabase/client';
import { appConfig } from '../config/app.config';
import { localStore } from '../lib/storage/localStorage';
import { businessSettingsService } from '../services/settings.service';
import {
  Order,
  OrderItem,
  OrderStatusHistory,
  CreateOrderFromQuotationDTO,
  CreateDirectOrderDTO,
  UpdateOrderDTO,
  CancelOrderDTO,
  OrderFilters,
  OrderStats,
  OrderStatus,
  OrderPaymentStatus,
  ORDER_STATUS_CONFIG,
} from '../types/order';
import { Quotation } from '../types/quotation';
import { roundMoney, calculateLineTotal } from '../utils/quotationCalculations';

const ORDERS_LOCAL_STORAGE_KEY = 'xforce_orders_cache_v1';
const ORDER_ITEMS_LOCAL_STORAGE_KEY = 'xforce_order_items_cache_v1';
const ORDER_HISTORY_LOCAL_STORAGE_KEY = 'xforce_order_history_cache_v1';

export const INITIAL_FOUNDATIONAL_ORDERS: Order[] = [];

export class OrderRepository {
  private memoryOrders: Order[] | null = null;
  private isRemoteTableAvailable: boolean = true;
  private warnedAboutMissingTable: boolean = false;

  constructor() {
    const stored = localStore.get<Order[] | null>(ORDERS_LOCAL_STORAGE_KEY, null);
    if (stored && Array.isArray(stored) && stored.length > 0) {
      this.memoryOrders = stored;
    } else {
      this.memoryOrders = INITIAL_FOUNDATIONAL_ORDERS;
      localStore.set(ORDERS_LOCAL_STORAGE_KEY, INITIAL_FOUNDATIONAL_ORDERS);
    }
  }

  private isTableMissingError(error: any): boolean {
    if (!error) return false;
    if (isNetworkOrFetchError(error)) {
      markRemoteDbUnavailable(error);
      return true;
    }
    const msg = typeof error.message === 'string' ? error.message : '';
    const code = error.code;
    return (
      code === 'PGRST205' ||
      code === '42P01' ||
      msg.includes('in the schema cache') ||
      msg.includes('Could not find the table') ||
      msg.includes('relation "orders" does not exist') ||
      msg.includes('relation "public.orders" does not exist')
    );
  }

  private mapDbRowToOrder(
    row: any,
    items: any[] = [],
    history: any[] = []
  ): Order {
    const mappedItems: OrderItem[] = items.map((it) => ({
      id: it.id,
      orderId: it.order_id || row.id,
      itemType: it.item_type || 'product',
      productId: it.product_id ?? null,
      variantId: it.variant_id ?? null,
      productName: it.product_name || it.description || 'Ordered Product',
      variantDescription: it.variant_description ?? null,
      sku: it.sku ?? null,
      description: it.description || '',
      unit: it.unit || 'piece',
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unit_price) || 0,
      discountAmount: Number(it.discount_amount) || 0,
      lineTotal: Number(it.line_total) || 0,
      sortOrder: it.sort_order ?? 0,
      createdAt: it.created_at || row.created_at,
    }));

    const mappedHistory: OrderStatusHistory[] = history.map((h) => ({
      id: h.id,
      orderId: h.order_id || row.id,
      previousStatus: h.previous_status ?? null,
      newStatus: h.new_status || row.status,
      changedBy: h.changed_by || 'system',
      changedByName: h.changed_by_name ?? undefined,
      timestamp: h.timestamp || h.created_at || row.created_at,
      note: h.note ?? null,
      isCustomerVisible: h.is_customer_visible !== false,
    }));

    return {
      id: row.id,
      orderNumber: row.order_number,
      customerId: row.customer_id ?? null,
      customerName: row.customer_name || 'Valued Client',
      customerPhone: row.customer_phone || '',
      customerEmail: row.customer_email ?? null,
      customerAddress: row.customer_address ?? null,
      customerType: row.customer_type ?? undefined,

      sourceRequestId: row.source_request_id ?? row.request_id ?? null,
      sourceRequestNumber: row.source_request_number ?? row.request_number ?? null,
      sourceQuotationId: row.source_quotation_id ?? row.quotation_id ?? null,
      sourceQuotationNumber: row.source_quotation_number ?? row.quotation_number ?? null,

      orderDate: row.order_date || new Date().toISOString().split('T')[0],
      orderType: row.order_type || 'standard',
      status: row.status || 'confirmed',
      paymentStatus: row.payment_status || 'unpaid',
      currency: row.currency || 'NGN',

      subtotal: Number(row.subtotal) || 0,
      discountAmount: Number(row.discount_amount) || 0,
      discountPercentage: Number(row.discount_percentage) || 0,
      deliveryFee: Number(row.delivery_fee) || 0,
      installationFee: Number(row.installation_fee) || 0,
      otherChargesFee: Number(row.other_charges_fee) || 0,
      taxRate: Number(row.tax_rate) || 0,
      taxAmount: Number(row.tax_amount) || 0,
      totalAmount: Number(row.total_amount) || 0,
      amountPaid: Number(row.amount_paid) || 0,
      balanceDue: Number(row.balance_due) !== undefined ? Number(row.balance_due) : Math.max(0, (Number(row.total_amount) || 0) - (Number(row.amount_paid) || 0)),

      deliveryAddress: row.delivery_address ?? null,
      deliveryCity: row.delivery_city ?? null,
      deliveryState: row.delivery_state ?? null,
      gpsLatitude: row.gps_latitude !== null && row.gps_latitude !== undefined ? Number(row.gps_latitude) : null,
      gpsLongitude: row.gps_longitude !== null && row.gps_longitude !== undefined ? Number(row.gps_longitude) : null,
      requiresInstallation: Boolean(row.requires_installation),
      deliveryNotes: row.delivery_notes ?? null,

      customerNotes: row.customer_notes ?? null,
      internalNotes: row.internal_notes ?? null,

      createdBy: row.created_by ?? null,
      createdByName: row.created_by_name ?? null,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),

      cancelledAt: row.cancelled_at ?? null,
      cancelledBy: row.cancelled_by ?? null,
      cancellationReason: row.cancellation_reason ?? null,

      items: mappedItems,
      statusHistory: mappedHistory,
    };
  }

  private saveToLocalStorage(orders: Order[]): void {
    try {
      localStore.set(ORDERS_LOCAL_STORAGE_KEY, orders);
      this.memoryOrders = orders;
    } catch (err) {
      console.warn('[OrderRepository] Failed to write orders to localStorage:', err);
    }
  }

  /**
   * Generates a unique, human-readable order number
   * Format: {PREFIX}-{YEAR}-{SEQUENCE} e.g. XFO-2026-0001
   */
  async generateNextOrderNumber(): Promise<string> {
    const numbering = await businessSettingsService.getNumberingSettings();
    const prefix = numbering?.defaultOrderPrefix || 'XFO';
    const year = new Date().getFullYear();

    const allOrders = await this.getAllOrders();
    const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);

    let maxSeq = 0;
    for (const ord of allOrders) {
      const match = ord.orderNumber.match(pattern);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }

    const nextSeq = String(maxSeq + 1).padStart(4, '0');
    return `${prefix}-${year}-${nextSeq}`;
  }

  /**
   * Retrieve all orders with optional filtering
   */
  async getAllOrders(filters?: OrderFilters): Promise<Order[]> {
    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const supabase = getSupabaseClient();
        const { data: orderRows, error } = await (supabase.from('orders' as any) as any)
          .select(`
            *,
            order_items (*),
            order_status_history (*)
          `)
          .order('created_at', { ascending: false });

        if (error) {
          if (this.isTableMissingError(error)) {
            if (!this.warnedAboutMissingTable) {
              console.info('[OrderRepository] Supabase orders table not active, using resilient local store.');
              this.warnedAboutMissingTable = true;
            }
            this.isRemoteTableAvailable = false;
          } else {
            console.warn('[OrderRepository] Supabase query failed, falling back to localStore:', error);
          }
        } else if (orderRows) {
          const mapped = orderRows.map((r: any) =>
            this.mapDbRowToOrder(r, r.order_items || [], r.order_status_history || [])
          );
          this.saveToLocalStorage(mapped);
          return this.applyFilters(mapped, filters);
        }
      } catch (err: any) {
        console.warn('[OrderRepository] Remote connection failed:', err);
      }
    }

    // LocalStorage fallback
    const cached = this.memoryOrders || localStore.get<Order[]>(ORDERS_LOCAL_STORAGE_KEY, []);
    return this.applyFilters(cached, filters);
  }

  private applyFilters(orders: Order[], filters?: OrderFilters): Order[] {
    if (!filters) return orders;

    return orders.filter((o) => {
      if (filters.status && filters.status !== 'all' && o.status !== filters.status) {
        return false;
      }
      if (filters.paymentStatus && filters.paymentStatus !== 'all' && o.paymentStatus !== filters.paymentStatus) {
        return false;
      }
      if (filters.customerId && o.customerId !== filters.customerId) {
        return false;
      }
      if (filters.sourceQuotationId && o.sourceQuotationId !== filters.sourceQuotationId) {
        return false;
      }
      if (filters.orderType && filters.orderType !== 'all' && o.orderType !== filters.orderType) {
        return false;
      }
      if (filters.startDate && o.orderDate < filters.startDate) {
        return false;
      }
      if (filters.endDate && o.orderDate > filters.endDate) {
        return false;
      }
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase().trim();
        const matchesTerm =
          o.orderNumber.toLowerCase().includes(term) ||
          o.customerName.toLowerCase().includes(term) ||
          o.customerPhone.toLowerCase().includes(term) ||
          (o.customerEmail && o.customerEmail.toLowerCase().includes(term)) ||
          (o.sourceQuotationNumber && o.sourceQuotationNumber.toLowerCase().includes(term)) ||
          (o.sourceRequestNumber && o.sourceRequestNumber.toLowerCase().includes(term));
        if (!matchesTerm) return false;
      }
      return true;
    });
  }

  /**
   * Get single order by internal UUID
   */
  async getOrderById(id: string): Promise<Order | null> {
    const all = await this.getAllOrders();
    return all.find((o) => o.id === id) || null;
  }

  /**
   * Get single order by human-readable order number (e.g. XFO-2026-0001)
   */
  async getOrderByNumber(orderNumber: string): Promise<Order | null> {
    const clean = orderNumber.trim().toUpperCase();
    const all = await this.getAllOrders();
    return all.find((o) => o.orderNumber.toUpperCase() === clean) || null;
  }

  /**
   * Get orders by customer ID
   */
  async getOrdersByCustomerId(customerId: string): Promise<Order[]> {
    const all = await this.getAllOrders();
    return all.filter((o) => o.customerId === customerId);
  }

  /**
   * Get orders originated from quotation
   */
  async getOrdersByQuotationId(quotationId: string): Promise<Order[]> {
    const all = await this.getAllOrders();
    return all.filter((o) => o.sourceQuotationId === quotationId);
  }

  /**
   * Convert accepted quotation to order
   * SECTION 2 & 20: Preserves original quotation, copies commercial snapshots, prevents duplicates
   */
  async createOrderFromQuotation(
    quotation: Quotation,
    dto: CreateOrderFromQuotationDTO
  ): Promise<Order> {
    // 1. Prevent duplicate order conversion if an order already exists for this quotation
    const existing = await this.getOrdersByQuotationId(quotation.id);
    if (existing.length > 0) {
      throw new Error(
        `Quotation #${quotation.quotationNumber} has already been converted to Order #${existing[0].orderNumber}.`
      );
    }

    const newId = crypto.randomUUID();
    const orderNumber = await this.generateNextOrderNumber();
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    // Snapshot quotation items into order items
    const orderItems: OrderItem[] = (quotation.items || []).map((it, idx) => ({
      id: crypto.randomUUID(),
      orderId: newId,
      itemType: it.itemType || 'product',
      productId: it.productId ?? null,
      variantId: it.variantId ?? null,
      productName: it.description || 'Quoted Product',
      variantDescription: null,
      sku: it.sku ?? null,
      description: it.description || '',
      unit: it.unit || 'piece',
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      discountAmount: it.discountAmount || 0,
      lineTotal: it.lineTotal,
      sortOrder: it.sortOrder ?? idx,
      createdAt: now,
    }));

    // Financial arithmetic (safe decimals)
    const subtotal = roundMoney(quotation.subtotal);
    const discountAmount = roundMoney(quotation.discountAmount);
    const deliveryFee = roundMoney(quotation.deliveryFee);
    const installationFee = roundMoney(quotation.installationFee);
    const otherChargesFee = roundMoney(quotation.otherChargesFee);
    const taxRate = quotation.taxRate || 0;
    const taxAmount = roundMoney(quotation.taxAmount);
    const totalAmount = roundMoney(quotation.totalAmount);

    const initialDeposit = dto.initialDepositAmount ? roundMoney(dto.initialDepositAmount) : 0;
    const amountPaid = Math.min(totalAmount, initialDeposit);
    const balanceDue = Math.max(0, roundMoney(totalAmount - amountPaid));

    let paymentStatus: OrderPaymentStatus = 'unpaid';
    if (amountPaid >= totalAmount) {
      paymentStatus = 'paid';
    } else if (amountPaid > 0) {
      paymentStatus = 'partially_paid';
    }

    let initialStatus: OrderStatus = 'confirmed';
    if (paymentStatus === 'unpaid') {
      initialStatus = 'awaiting_payment';
    } else if (paymentStatus === 'partially_paid') {
      initialStatus = 'partially_paid';
    } else if (paymentStatus === 'paid') {
      initialStatus = 'paid';
    }

    const initialHistory: OrderStatusHistory = {
      id: crypto.randomUUID(),
      orderId: newId,
      previousStatus: null,
      newStatus: initialStatus,
      changedBy: dto.createdBy || 'system',
      changedByName: dto.createdByName || 'Staff Member',
      timestamp: now,
      note: `Order converted from accepted Quotation #${quotation.quotationNumber}.`,
      isCustomerVisible: true,
    };

    const newOrder: Order = {
      id: newId,
      orderNumber,
      customerId: quotation.customerId ?? null,
      customerName: quotation.customerName,
      customerPhone: quotation.customerPhone,
      customerEmail: quotation.customerEmail ?? null,
      customerAddress: quotation.customerAddress ?? null,

      sourceRequestId: quotation.requestId ?? null,
      sourceRequestNumber: quotation.requestNumber ?? null,
      sourceQuotationId: quotation.id,
      sourceQuotationNumber: quotation.quotationNumber,

      orderDate: today,
      orderType: dto.orderType || 'standard',
      status: initialStatus,
      paymentStatus,
      currency: quotation.currency || 'NGN',

      subtotal,
      discountAmount,
      discountPercentage: quotation.discountPercentage || 0,
      deliveryFee,
      installationFee,
      otherChargesFee,
      taxRate,
      taxAmount,
      totalAmount,
      amountPaid,
      balanceDue,

      deliveryAddress: quotation.customerAddress ?? null,
      deliveryCity: null,
      deliveryState: null,
      gpsLatitude: null,
      gpsLongitude: null,
      requiresInstallation: quotation.installationFee > 0,
      deliveryNotes: null,

      customerNotes: dto.customerNotes || quotation.termsAndConditions || null,
      internalNotes: dto.internalNotes || null,

      createdBy: dto.createdBy || null,
      createdByName: dto.createdByName || null,
      createdAt: now,
      updatedAt: now,

      items: orderItems,
      statusHistory: [initialHistory],
    };

    // Multi-tier persistence
    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const supabase = getSupabaseClient();
        const { error: orderErr } = await (supabase.from('orders' as any) as any).insert({
          id: newOrder.id,
          order_number: newOrder.orderNumber,
          customer_id: newOrder.customerId,
          quotation_id: newOrder.sourceQuotationId,
          status: newOrder.status,
          payment_status: newOrder.paymentStatus,
          order_date: newOrder.orderDate,
          subtotal: newOrder.subtotal,
          discount_amount: newOrder.discountAmount,
          delivery_fee: newOrder.deliveryFee,
          installation_fee: newOrder.installationFee,
          tax_amount: newOrder.taxAmount,
          total_amount: newOrder.totalAmount,
          amount_paid: newOrder.amountPaid,
          balance_due: newOrder.balanceDue,
          delivery_address: newOrder.deliveryAddress,
          requires_installation: newOrder.requiresInstallation,
          internal_notes: newOrder.internalNotes,
          created_by: newOrder.createdBy,
          created_at: newOrder.createdAt,
          updated_at: newOrder.updatedAt,
        });

        if (orderErr) {
          console.warn('[OrderRepository] Supabase insert failed, saving locally:', orderErr);
        } else {
          // Insert items
          const itemsPayload = orderItems.map((it) => ({
            id: it.id,
            order_id: it.orderId,
            product_id: it.productId,
            variant_id: it.variantId,
            description: it.productName + (it.description ? ` - ${it.description}` : ''),
            unit: it.unit,
            quantity: it.quantity,
            unit_price: it.unitPrice,
            discount_amount: it.discountAmount,
            line_total: it.lineTotal,
            sort_order: it.sortOrder,
            created_at: it.createdAt,
          }));

          await (supabase.from('order_items' as any) as any).insert(itemsPayload);
        }
      } catch (err) {
        console.warn('[OrderRepository] Supabase error during order creation:', err);
      }
    }

    // Save to local cache
    const currentOrders = await this.getAllOrders();
    const updatedOrders = [newOrder, ...currentOrders.filter((o) => o.id !== newOrder.id)];
    this.saveToLocalStorage(updatedOrders);

    return newOrder;
  }

  /**
   * Create direct order (without quotation or from approved request)
   */
  async createDirectOrder(dto: CreateDirectOrderDTO): Promise<Order> {
    const newId = crypto.randomUUID();
    const orderNumber = await this.generateNextOrderNumber();
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    // Compute line totals
    let computedSubtotal = 0;
    const orderItems: OrderItem[] = dto.items.map((it, idx) => {
      const lineTot = calculateLineTotal(it.quantity, it.unitPrice, it.discountAmount || 0);
      computedSubtotal += lineTot;
      return {
        id: crypto.randomUUID(),
        orderId: newId,
        itemType: it.itemType || 'product',
        productId: it.productId ?? null,
        variantId: it.variantId ?? null,
        productName: it.productName,
        variantDescription: it.variantDescription ?? null,
        sku: it.sku ?? null,
        description: it.description || '',
        unit: it.unit || 'piece',
        quantity: Math.max(0, it.quantity),
        unitPrice: Math.max(0, it.unitPrice),
        discountAmount: Math.max(0, it.discountAmount || 0),
        lineTotal: lineTot,
        sortOrder: idx,
        createdAt: now,
      };
    });

    computedSubtotal = roundMoney(computedSubtotal);
    let finalDiscount = 0;
    if (dto.discountPercentage && dto.discountPercentage > 0) {
      finalDiscount = roundMoney((computedSubtotal * dto.discountPercentage) / 100);
    } else if (dto.discountAmount && dto.discountAmount > 0) {
      finalDiscount = roundMoney(dto.discountAmount);
    }

    const deliveryFee = roundMoney(dto.deliveryFee || 0);
    const installationFee = roundMoney(dto.installationFee || 0);
    const otherChargesFee = roundMoney(dto.otherChargesFee || 0);
    const taxRate = dto.taxRate || 0;
    const taxableBase = Math.max(0, computedSubtotal - finalDiscount + deliveryFee + installationFee + otherChargesFee);
    const taxAmount = taxRate > 0 ? roundMoney((taxableBase * taxRate) / 100) : 0;
    const totalAmount = roundMoney(taxableBase + taxAmount);

    const initialHistory: OrderStatusHistory = {
      id: crypto.randomUUID(),
      orderId: newId,
      previousStatus: null,
      newStatus: 'pending',
      changedBy: dto.createdBy || 'system',
      changedByName: dto.createdByName || 'Staff Member',
      timestamp: now,
      note: 'Direct order registered in management queue.',
      isCustomerVisible: true,
    };

    const newOrder: Order = {
      id: newId,
      orderNumber,
      customerId: dto.customerId ?? null,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      customerEmail: dto.customerEmail ?? null,
      customerAddress: dto.customerAddress ?? null,
      customerType: dto.customerType,

      sourceRequestId: dto.sourceRequestId ?? null,
      sourceRequestNumber: dto.sourceRequestNumber ?? null,
      sourceQuotationId: null,
      sourceQuotationNumber: null,

      orderDate: today,
      orderType: dto.orderType || 'standard',
      status: 'pending',
      paymentStatus: 'unpaid',
      currency: dto.currency || 'NGN',

      subtotal: computedSubtotal,
      discountAmount: finalDiscount,
      discountPercentage: dto.discountPercentage || 0,
      deliveryFee,
      installationFee,
      otherChargesFee,
      taxRate,
      taxAmount,
      totalAmount,
      amountPaid: 0,
      balanceDue: totalAmount,

      deliveryAddress: dto.deliveryAddress ?? dto.customerAddress ?? null,
      deliveryCity: dto.deliveryCity ?? null,
      deliveryState: dto.deliveryState ?? null,
      gpsLatitude: dto.gpsLatitude ?? null,
      gpsLongitude: dto.gpsLongitude ?? null,
      requiresInstallation: Boolean(dto.requiresInstallation || installationFee > 0),
      deliveryNotes: dto.deliveryNotes ?? null,

      customerNotes: dto.customerNotes ?? null,
      internalNotes: dto.internalNotes ?? null,

      createdBy: dto.createdBy ?? null,
      createdByName: dto.createdByName ?? null,
      createdAt: now,
      updatedAt: now,

      items: orderItems,
      statusHistory: [initialHistory],
    };

    const currentOrders = await this.getAllOrders();
    const updatedOrders = [newOrder, ...currentOrders.filter((o) => o.id !== newOrder.id)];
    this.saveToLocalStorage(updatedOrders);

    return newOrder;
  }

  /**
   * Update order status with lifecycle validation and history tracking
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    changedBy: string,
    changedByName?: string,
    note?: string,
    isCustomerVisible = true
  ): Promise<Order> {
    const order = await this.getOrderById(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    if (order.status === newStatus) {
      return order;
    }

    // Validate state transition
    const allowed = ORDER_STATUS_CONFIG[order.status].allowedNextStatuses;
    if (!allowed.includes(newStatus)) {
      throw new Error(
        `Cannot transition order from "${ORDER_STATUS_CONFIG[order.status].label}" to "${ORDER_STATUS_CONFIG[newStatus].label}".`
      );
    }

    const now = new Date().toISOString();
    const historyEntry: OrderStatusHistory = {
      id: crypto.randomUUID(),
      orderId,
      previousStatus: order.status,
      newStatus,
      changedBy,
      changedByName,
      timestamp: now,
      note: note || `Status transitioned to ${ORDER_STATUS_CONFIG[newStatus].label}.`,
      isCustomerVisible,
    };

    const updated: Order = {
      ...order,
      status: newStatus,
      updatedAt: now,
      statusHistory: [historyEntry, ...(order.statusHistory || [])],
    };

    // Multi-tier persistence
    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const supabase = getSupabaseClient();
        await (supabase.from('orders' as any) as any)
          .update({
            status: updated.status,
            updated_at: updated.updatedAt,
          })
          .eq('id', orderId);
      } catch (err) {
        console.warn('[OrderRepository] Supabase updateOrderStatus failed:', err);
      }
    }

    const all = await this.getAllOrders();
    const updatedAll = all.map((o) => (o.id === orderId ? updated : o));
    this.saveToLocalStorage(updatedAll);

    return updated;
  }

  /**
   * Controlled Order Cancellation
   * SECTION 15: Requires reason, preserves record & financial history, does not delete
   */
  async cancelOrder(dto: CancelOrderDTO): Promise<Order> {
    const order = await this.getOrderById(dto.orderId);
    if (!order) {
      throw new Error(`Order ${dto.orderId} not found.`);
    }

    if (order.status === 'cancelled') {
      throw new Error(`Order #${order.orderNumber} is already cancelled.`);
    }

    if (order.status === 'completed') {
      throw new Error(`Completed order #${order.orderNumber} cannot be cancelled.`);
    }

    if (!dto.reason.trim()) {
      throw new Error('A valid cancellation reason is required to cancel an order.');
    }

    const now = new Date().toISOString();
    const historyEntry: OrderStatusHistory = {
      id: crypto.randomUUID(),
      orderId: order.id,
      previousStatus: order.status,
      newStatus: 'cancelled',
      changedBy: dto.cancelledBy,
      changedByName: dto.cancelledByName,
      timestamp: now,
      note: `Order cancelled. Reason: ${dto.reason.trim()}`,
      isCustomerVisible: true,
    };

    const updated: Order = {
      ...order,
      status: 'cancelled',
      cancelledAt: now,
      cancelledBy: dto.cancelledBy,
      cancellationReason: dto.reason.trim(),
      updatedAt: now,
      statusHistory: [historyEntry, ...(order.statusHistory || [])],
    };

    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const supabase = getSupabaseClient();
        await (supabase.from('orders' as any) as any)
          .update({
            status: 'cancelled',
            updated_at: now,
          })
          .eq('id', dto.orderId);
      } catch (err) {
        console.warn('[OrderRepository] Supabase cancelOrder failed:', err);
      }
    }

    const all = await this.getAllOrders();
    const updatedAll = all.map((o) => (o.id === dto.orderId ? updated : o));
    this.saveToLocalStorage(updatedAll);

    return updated;
  }

  /**
   * Recalculates order payment totals when a payment is recorded or refunded
   * SECTION 11: Non-negative balance, idempotent aggregation
   */
  async applyPaymentToOrder(
    orderId: string,
    verifiedAmountDelta: number
  ): Promise<Order> {
    const order = await this.getOrderById(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    const currentPaid = order.amountPaid || 0;
    const newPaid = Math.max(0, roundMoney(currentPaid + verifiedAmountDelta));
    const newBalance = Math.max(0, roundMoney(order.totalAmount - newPaid));

    let newPaymentStatus: OrderPaymentStatus = 'unpaid';
    if (newPaid >= order.totalAmount && order.totalAmount > 0) {
      newPaymentStatus = 'paid';
    } else if (newPaid > 0) {
      newPaymentStatus = 'partially_paid';
    }

    // Auto-update order status if in awaiting payment state
    let newOrderStatus = order.status;
    if (order.status === 'awaiting_payment' || order.status === 'confirmed' || order.status === 'pending') {
      if (newPaymentStatus === 'paid') {
        newOrderStatus = 'paid';
      } else if (newPaymentStatus === 'partially_paid') {
        newOrderStatus = 'partially_paid';
      }
    }

    const now = new Date().toISOString();
    const updated: Order = {
      ...order,
      amountPaid: newPaid,
      balanceDue: newBalance,
      paymentStatus: newPaymentStatus,
      status: newOrderStatus,
      updatedAt: now,
    };

    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const supabase = getSupabaseClient();
        await (supabase.from('orders' as any) as any)
          .update({
            amount_paid: updated.amountPaid,
            balance_due: updated.balanceDue,
            payment_status: updated.paymentStatus,
            status: updated.status,
            updated_at: updated.updatedAt,
          })
          .eq('id', orderId);
      } catch (err) {
        console.warn('[OrderRepository] Supabase applyPaymentToOrder failed:', err);
      }
    }

    const all = await this.getAllOrders();
    const updatedAll = all.map((o) => (o.id === orderId ? updated : o));
    this.saveToLocalStorage(updatedAll);

    return updated;
  }

  /**
   * Aggregate order performance metrics
   */
  async getOrderStats(): Promise<OrderStats> {
    const all = await this.getAllOrders();

    let totalOrders = 0;
    let pendingOrders = 0;
    let confirmedOrders = 0;
    let processingOrders = 0;
    let completedOrders = 0;
    let cancelledOrders = 0;
    let totalGrossRevenue = 0;
    let totalAmountPaid = 0;
    let totalOutstandingBalance = 0;

    for (const o of all) {
      totalOrders++;
      if (o.status === 'pending') pendingOrders++;
      if (o.status === 'confirmed' || o.status === 'awaiting_payment' || o.status === 'partially_paid' || o.status === 'paid') confirmedOrders++;
      if (o.status === 'processing' || o.status === 'ready') processingOrders++;
      if (o.status === 'completed') completedOrders++;
      if (o.status === 'cancelled') cancelledOrders++;

      if (o.status !== 'cancelled') {
        totalGrossRevenue += o.totalAmount;
        totalAmountPaid += o.amountPaid;
        totalOutstandingBalance += o.balanceDue;
      }
    }

    return {
      totalOrders,
      pendingOrders,
      confirmedOrders,
      processingOrders,
      completedOrders,
      cancelledOrders,
      totalGrossRevenue: roundMoney(totalGrossRevenue),
      totalAmountPaid: roundMoney(totalAmountPaid),
      totalOutstandingBalance: roundMoney(totalOutstandingBalance),
    };
  }
}

export const orderRepository = new OrderRepository();
