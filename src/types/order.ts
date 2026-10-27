/**
 * Order Domain Types
 * Module 10 — Orders, Payments & Customer Tracking
 * XFORCE Construction Ltd / X-FORCE BRICKS
 */

import { CustomerType } from './customer';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'awaiting_payment'
  | 'partially_paid'
  | 'paid'
  | 'processing'
  | 'ready'
  | 'completed'
  | 'cancelled';

export type OrderPaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'refunded';

export type OrderType = 'standard' | 'custom' | 'project' | 'counter';

export type OrderItemType = 'product' | 'service' | 'custom';

export interface OrderItem {
  id: string;
  orderId: string;
  itemType: OrderItemType;
  productId?: string | null;
  variantId?: string | null;
  productName: string;
  variantDescription?: string | null;
  sku?: string | null;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
  sortOrder: number;
  createdAt: string;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  previousStatus: OrderStatus | null;
  newStatus: OrderStatus;
  changedBy: string;
  changedByName?: string;
  timestamp: string;
  note?: string | null;
  isCustomerVisible: boolean;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. XFO-2026-0001
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  customerAddress?: string | null;
  customerType?: CustomerType;

  // Commercial Provenance
  sourceRequestId?: string | null;
  sourceRequestNumber?: string | null;
  sourceQuotationId?: string | null;
  sourceQuotationNumber?: string | null;

  orderDate: string; // YYYY-MM-DD
  orderType: OrderType;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  currency: string; // e.g. 'NGN'

  // Financials (Decimal-Safe)
  subtotal: number;
  discountAmount: number;
  discountPercentage?: number;
  deliveryFee: number;
  installationFee: number;
  otherChargesFee: number;
  taxRate: number; // e.g. 7.5
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;

  // Site & Delivery Snapshot
  deliveryAddress?: string | null;
  deliveryCity?: string | null;
  deliveryState?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  requiresInstallation: boolean;
  deliveryNotes?: string | null;

  // Notes
  customerNotes?: string | null;
  internalNotes?: string | null;

  // Audit & Attribution
  createdBy?: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;

  // Cancellation (Controlled lifecycle)
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  cancellationReason?: string | null;

  // Embedded Data
  items: OrderItem[];
  statusHistory?: OrderStatusHistory[];
}

export interface CreateOrderItemDTO {
  itemType?: OrderItemType;
  productId?: string | null;
  variantId?: string | null;
  productName: string;
  variantDescription?: string | null;
  sku?: string | null;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
}

export interface CreateOrderFromQuotationDTO {
  quotationId: string;
  customerNotes?: string;
  internalNotes?: string;
  orderType?: OrderType;
  initialDepositAmount?: number;
  initialPaymentMethod?: string;
  initialPaymentReference?: string;
  createdBy?: string;
  createdByName?: string;
}

export interface CreateDirectOrderDTO {
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  customerAddress?: string | null;
  customerType?: CustomerType;
  sourceRequestId?: string | null;
  sourceRequestNumber?: string | null;
  orderType?: OrderType;
  items: CreateOrderItemDTO[];
  discountAmount?: number;
  discountPercentage?: number;
  deliveryFee?: number;
  installationFee?: number;
  otherChargesFee?: number;
  taxRate?: number;
  currency?: string;
  deliveryAddress?: string | null;
  deliveryCity?: string | null;
  deliveryState?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  requiresInstallation?: boolean;
  deliveryNotes?: string | null;
  customerNotes?: string | null;
  internalNotes?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
}

export interface UpdateOrderDTO {
  status?: OrderStatus;
  deliveryAddress?: string | null;
  deliveryCity?: string | null;
  deliveryState?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  deliveryNotes?: string | null;
  customerNotes?: string | null;
  internalNotes?: string | null;
  updatedBy?: string | null;
  statusNote?: string | null;
}

export interface CancelOrderDTO {
  orderId: string;
  reason: string;
  cancelledBy: string;
  cancelledByName?: string;
}

export interface OrderFilters {
  searchTerm?: string;
  status?: OrderStatus | 'all';
  paymentStatus?: OrderPaymentStatus | 'all';
  customerId?: string;
  sourceQuotationId?: string;
  startDate?: string;
  endDate?: string;
  orderType?: OrderType | 'all';
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  processingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalGrossRevenue: number;
  totalAmountPaid: number;
  totalOutstandingBalance: number;
}

export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  {
    label: string;
    badgeVariant: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
    description: string;
    allowedNextStatuses: OrderStatus[];
  }
> = {
  pending: {
    label: 'Pending',
    badgeVariant: 'warning',
    description: 'Order logged and awaiting sales confirmation.',
    allowedNextStatuses: ['confirmed', 'cancelled'],
  },
  confirmed: {
    label: 'Confirmed',
    badgeVariant: 'info',
    description: 'Commercial terms agreed. Production queue staging.',
    allowedNextStatuses: ['awaiting_payment', 'partially_paid', 'paid', 'processing', 'ready', 'cancelled'],
  },
  awaiting_payment: {
    label: 'Awaiting Payment',
    badgeVariant: 'outline',
    description: 'Awaiting mobilization deposit or full payment.',
    allowedNextStatuses: ['partially_paid', 'paid', 'processing', 'ready', 'cancelled'],
  },
  partially_paid: {
    label: 'Partially Paid',
    badgeVariant: 'primary',
    description: 'Deposit received. Production authorized.',
    allowedNextStatuses: ['paid', 'processing', 'ready', 'cancelled'],
  },
  paid: {
    label: 'Paid in Full',
    badgeVariant: 'success',
    description: 'Full balance settled by customer.',
    allowedNextStatuses: ['processing', 'ready', 'completed', 'cancelled'],
  },
  processing: {
    label: 'In Production',
    badgeVariant: 'primary',
    description: 'Hydraulic pressing, block curing, or yard sorting in progress.',
    allowedNextStatuses: ['ready', 'completed', 'cancelled'],
  },
  ready: {
    label: 'Ready for Dispatch',
    badgeVariant: 'info',
    description: 'Materials cured, palletized, and ready for site haulage.',
    allowedNextStatuses: ['completed', 'cancelled'],
  },
  completed: {
    label: 'Completed',
    badgeVariant: 'success',
    description: 'Order fully dispatched and delivered to client site.',
    allowedNextStatuses: [],
  },
  cancelled: {
    label: 'Cancelled',
    badgeVariant: 'danger',
    description: 'Order voided under controlled management approval.',
    allowedNextStatuses: [],
  },
};

export const ORDER_PAYMENT_STATUS_CONFIG: Record<
  OrderPaymentStatus,
  {
    label: string;
    badgeVariant: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
    description: string;
  }
> = {
  unpaid: {
    label: 'Unpaid',
    badgeVariant: 'danger',
    description: 'No verified payments recorded against order.',
  },
  partially_paid: {
    label: 'Partially Paid',
    badgeVariant: 'warning',
    description: 'Deposit or installment received with outstanding balance.',
  },
  paid: {
    label: 'Fully Paid',
    badgeVariant: 'success',
    description: 'Total order balance cleared in full.',
  },
  refunded: {
    label: 'Refunded',
    badgeVariant: 'outline',
    description: 'Payment returned or credited to client.',
  },
};
