/**
 * Payment Domain Types
 * Module 10 — Orders, Payments & Customer Tracking
 * XFORCE Construction Ltd / X-FORCE BRICKS
 */

export type PaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'card_pos'
  | 'ussd'
  | 'paystack'
  | 'other';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export type PaymentProvider = 'manual' | 'paystack' | 'bank_transfer' | 'pos_terminal';

export interface PaymentRecord {
  id: string;
  paymentNumber: string; // e.g. XFP-2026-0001
  orderId?: string | null;
  orderNumber?: string | null;
  saleId?: string | null;
  saleReference?: string | null;
  quotationId?: string | null;
  customerId?: string | null;
  customerName: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  referenceNumber: string; // Unique transaction/teller/gateway reference
  paymentDate: string; // ISO 8601 string or YYYY-MM-DD
  provider: PaymentProvider;
  providerReference?: string | null;
  bankName?: string | null;
  notes?: string | null;
  receiptUrl?: string | null;
  recordedBy?: string | null;
  recordedByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecordPaymentDTO {
  orderId?: string | null;
  saleId?: string | null;
  saleReference?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  paymentDate?: string;
  bankName?: string;
  notes?: string;
  receiptUrl?: string;
  provider?: PaymentProvider;
  providerReference?: string;
  recordedBy?: string;
  recordedByName?: string;
}

export interface PaymentReceiptData {
  receiptNumber: string;
  orderNumber: string;
  quotationNumber?: string | null;
  paymentDate: string;
  amountPaid: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentMethodLabel: string;
  referenceNumber: string;
  bankName?: string | null;
  customer: {
    name: string;
    phone: string;
    email?: string | null;
    address?: string | null;
  };
  orderSummary: {
    orderTotal: number;
    previouslyPaid: number;
    thisPayment: number;
    totalPaidNow: number;
    remainingBalance: number;
    paymentStatus: string;
  };
  company: {
    legalName: string;
    brandName: string;
    address: string;
    phone: string;
    email: string;
    tin?: string;
  };
  recordedBy?: string;
  notes?: string | null;
}

export interface PaystackInitializeConfig {
  amount: number; // in NGN (will be converted to kobo)
  email: string;
  reference: string;
  orderNumber: string;
  customerName: string;
  metadata?: Record<string, any>;
}

export interface PaystackVerifyResult {
  success: boolean;
  status: 'success' | 'failed' | 'abandoned' | 'pending';
  reference: string;
  amount: number; // in NGN
  gatewayResponse: string;
  paidAt?: string;
  channel?: string;
  currency?: string;
  message?: string;
}

export const PAYMENT_METHOD_CONFIG: Record<
  PaymentMethod,
  {
    label: string;
    description: string;
    isOnline: boolean;
    requiresReference: boolean;
  }
> = {
  bank_transfer: {
    label: 'Corporate Bank Transfer',
    description: 'Direct wire / electronic funds transfer to corporate Zenith Bank account.',
    isOnline: false,
    requiresReference: true,
  },
  paystack: {
    label: 'Paystack Gateway',
    description: 'Online card payment, USSD, Apple Pay, or direct bank debit via Paystack.',
    isOnline: true,
    requiresReference: true,
  },
  card_pos: {
    label: 'POS Card Terminal',
    description: 'Physical debit/credit card swipe or tap at yard counter.',
    isOnline: false,
    requiresReference: true,
  },
  cash: {
    label: 'Cash Settlement',
    description: 'Physical cash received at factory yard office.',
    isOnline: false,
    requiresReference: false,
  },
  ussd: {
    label: 'Direct USSD Code',
    description: 'Mobile banking USSD transaction reference.',
    isOnline: false,
    requiresReference: true,
  },
  other: {
    label: 'Other Tender',
    description: 'Special bank draft, certified cheque, or barter credit.',
    isOnline: false,
    requiresReference: true,
  },
};
