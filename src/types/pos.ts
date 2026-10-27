/**
 * Point of Sale (POS) / Sales Counter Domain Types
 * Module 13 — POS / Sales Counter
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Implements data structures for direct counter sales, customer snapshots,
 * decimal-safe line snapshots, split/cash/online payment snapshots,
 * and location-bound inventory deductions.
 */

import { PaymentMethod } from './payment';

export type PosDiscountType = 'none' | 'fixed' | 'percentage';

export type PosSaleStatus = 'completed' | 'cancelled';

export type PosPaymentStatus = 'paid' | 'partially_paid' | 'unpaid';

export interface PosSaleItem {
  id: string;
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  sku: string;
  unit: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  originalUnitPrice: number;
  isPriceOverridden: boolean;
  overrideReason?: string | null;
  discountType: PosDiscountType;
  discountValue: number;
  discountAmount: number;
  lineTotal: number;
}

export interface PosCartItem {
  id: string; // temporary cart key e.g. `${productId}-${variantId || 'base'}`
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  categoryName: string;
  sku: string;
  unit: string;
  imageUrl: string | null;
  standardPrice: number;
  unitPrice: number;
  isPriceOverridden: boolean;
  overrideReason?: string;
  quantity: number;
  availableStock: number;
  discountType: PosDiscountType;
  discountValue: number;
  discountAmount: number;
  lineTotal: number;
}

export interface PosSale {
  id: string;
  saleReference: string; // e.g. POS-2026-0001
  customerId: string | null;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  isGuestCustomer: boolean;
  locationId: string;
  locationName: string;
  locationCode: string;
  cashierId: string;
  cashierName: string;
  items: PosSaleItem[];
  subtotal: number;
  cartDiscountType: PosDiscountType;
  cartDiscountValue: number;
  cartDiscountAmount: number;
  additionalChargesFee: number;
  additionalChargesNote?: string | null;
  totalDiscountAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  amountTendered?: number | null;
  changeGiven?: number | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PosPaymentStatus;
  paymentReference?: string | null;
  paymentId?: string | null;
  status: PosSaleStatus;
  cancellationReason?: string | null;
  cancelledBy?: string | null;
  cancelledByName?: string | null;
  cancelledAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePosSaleDTO {
  customerId?: string | null;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  isGuestCustomer?: boolean;
  locationId: string;
  items: Array<{
    productId: string;
    variantId?: string | null;
    quantity: number;
    unitPrice: number;
    originalUnitPrice?: number;
    isPriceOverridden?: boolean;
    overrideReason?: string;
    discountType?: PosDiscountType;
    discountValue?: number;
  }>;
  cartDiscountType?: PosDiscountType;
  cartDiscountValue?: number;
  additionalChargesFee?: number;
  additionalChargesNote?: string;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  amountTendered?: number;
  referenceNumber?: string;
  bankName?: string;
  notes?: string;
  performedBy?: string;
  performedByName?: string;
}

export interface PosFilterParams {
  search?: string;
  locationId?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
  cashierId?: string;
  status?: PosSaleStatus | 'all';
}

export interface PosSummaryStats {
  todaySalesCount: number;
  todaySalesTotal: number;
  todayCashTotal: number;
  todayTransferTotal: number;
  todayCardTotal: number;
  todayOnlineTotal: number;
  todayCreditTotal: number;
  totalItemsSold: number;
}

export interface PosReceiptData {
  saleReference: string;
  date: string;
  cashierName: string;
  locationName: string;
  locationCode: string;
  customer: {
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    isGuest: boolean;
  };
  items: PosSaleItem[];
  subtotal: number;
  cartDiscountAmount: number;
  totalDiscountAmount: number;
  additionalChargesFee: number;
  additionalChargesNote?: string | null;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  amountTendered?: number | null;
  changeGiven?: number | null;
  balanceDue: number;
  paymentStatus: PosPaymentStatus;
  paymentReference?: string | null;
  company: {
    name: string;
    brand: string;
    address: string;
    phone: string;
    email: string;
    tin?: string;
    logoUrl?: string | null;
    footerText?: string;
  };
  notes?: string | null;
}
