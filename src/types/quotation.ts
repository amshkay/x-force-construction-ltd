/**
 * Quotation Domain Types
 * Module 09 — Customer Requests & Quotation Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 */

export type QuotationStatus =
  | 'draft'
  | 'pending_approval'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'converted'
  | 'cancelled';

export type QuotationItemType = 'product' | 'service' | 'custom';

export interface QuotationItem {
  id: string;
  quotationId: string;
  itemType: QuotationItemType;
  productId?: string | null;
  variantId?: string | null;
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

export interface Quotation {
  id: string;
  quotationNumber: string; // e.g. XFQ-2026-0001
  customerId?: string | null;
  requestId?: string | null;
  requestNumber?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  customerAddress?: string | null;
  status: QuotationStatus;
  quotationDate: string; // YYYY-MM-DD
  validUntil: string; // YYYY-MM-DD
  currency: string; // e.g. 'NGN'

  // Financials
  subtotal: number;
  discountAmount: number;
  discountPercentage?: number;
  deliveryFee: number;
  installationFee: number;
  otherChargesFee: number;
  otherChargesDescription?: string | null;
  taxRate: number; // e.g. 7.5 for 7.5% VAT, or 0
  taxAmount: number;
  totalAmount: number;
  depositRequired: number;
  balanceDue: number;

  // Notes & Terms
  notes?: string | null;
  termsAndConditions?: string | null;
  internalNotes?: string | null;

  // Audit & Workflow
  createdBy?: string | null;
  createdByName?: string | null;
  acceptedAt?: string | null;
  acceptedBy?: string | null;
  declinedAt?: string | null;
  declineReason?: string | null;
  sentAt?: string | null;
  viewedAt?: string | null;

  items: QuotationItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuotationItemDTO {
  itemType?: QuotationItemType;
  productId?: string | null;
  variantId?: string | null;
  sku?: string | null;
  description: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
}

export interface CreateQuotationDTO {
  customerId?: string | null;
  requestId?: string | null;
  requestNumber?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  customerAddress?: string | null;
  quotationDate?: string;
  validUntil: string;
  currency?: string;
  status?: QuotationStatus;
  discountAmount?: number;
  discountPercentage?: number;
  deliveryFee?: number;
  installationFee?: number;
  otherChargesFee?: number;
  otherChargesDescription?: string | null;
  taxRate?: number;
  depositRequired?: number;
  notes?: string | null;
  termsAndConditions?: string | null;
  internalNotes?: string | null;
  items: CreateQuotationItemDTO[];
}

export interface UpdateQuotationDTO extends Partial<CreateQuotationDTO> {
  status?: QuotationStatus;
  acceptedAt?: string | null;
  acceptedBy?: string | null;
  declinedAt?: string | null;
  declineReason?: string | null;
  sentAt?: string | null;
  viewedAt?: string | null;
}

export interface QuotationFilters {
  search?: string;
  status?: QuotationStatus | 'all';
  customerId?: string;
  requestId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface QuotationStats {
  total: number;
  drafts: number;
  pendingApproval: number;
  sent: number;
  accepted: number;
  declined: number;
  expired: number;
  totalQuotedValue: number;
  totalAcceptedValue: number;
}

export const QUOTATION_STATUS_CONFIG: Record<
  QuotationStatus,
  { label: string; badgeVariant: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'outline'; description: string }
> = {
  draft: {
    label: 'Draft',
    badgeVariant: 'outline',
    description: 'Internal draft under compilation.',
  },
  pending_approval: {
    label: 'Pending Approval',
    badgeVariant: 'warning',
    description: 'Awaiting managerial margin or discount authorization.',
  },
  sent: {
    label: 'Sent to Customer',
    badgeVariant: 'primary',
    description: 'Issued and communicated to client.',
  },
  viewed: {
    label: 'Viewed by Customer',
    badgeVariant: 'info',
    description: 'Customer opened and reviewed quotation.',
  },
  accepted: {
    label: 'Accepted',
    badgeVariant: 'success',
    description: 'Client formally accepted terms and pricing (Module 10 converts to order).',
  },
  declined: {
    label: 'Declined',
    badgeVariant: 'danger',
    description: 'Quotation rejected by client.',
  },
  expired: {
    label: 'Expired',
    badgeVariant: 'default',
    description: 'Passed validity period without confirmation.',
  },
  converted: {
    label: 'Converted to Order',
    badgeVariant: 'success',
    description: 'Converted into confirmed factory order (Module 10).',
  },
  cancelled: {
    label: 'Cancelled',
    badgeVariant: 'default',
    description: 'Withdrawn by XFORCE sales desk.',
  },
};
