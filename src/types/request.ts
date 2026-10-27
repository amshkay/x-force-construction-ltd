/**
 * Customer Requests Domain Types
 * Module 09 — Customer Requests & Quotation Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 */

export type RequestType =
  | 'product_only'
  | 'service_only'
  | 'product_and_service'
  | 'site_inspection'
  | 'general_quotation';

export type RequestStatus =
  | 'submitted'
  | 'under_review'
  | 'awaiting_customer_info'
  | 'quotation_prepared'
  | 'quotation_sent'
  | 'customer_reviewing'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'closed';

export interface CustomerRequestItem {
  id: string;
  requestId: string;
  productId?: string | null;
  variantId?: string | null;
  itemName: string;
  itemCategory?: string | null;
  quantity: number;
  unit: string;
  customerNotes?: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface CustomerRequestAttachment {
  id: string;
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
  createdAt?: string;
}

export interface CustomerRequest {
  id: string;
  requestNumber: string; // e.g. XFR-2026-0001
  customerId?: string | null;
  requestType: RequestType;
  status: RequestStatus;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  companyName?: string | null;
  projectAddress?: string | null;
  projectCity?: string | null;
  projectState?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  desiredTimeline?: string | null;
  preferredContactMethod?: 'phone' | 'whatsapp' | 'email' | 'sms';
  customerComments?: string | null;
  internalNotes?: string | null;
  assignedTo?: string | null; // Staff User ID
  assignedToName?: string | null;
  items: CustomerRequestItem[];
  attachments: CustomerRequestAttachment[];
  quotationId?: string | null;
  quotationNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerRequestItemDTO {
  productId?: string | null;
  variantId?: string | null;
  itemName: string;
  itemCategory?: string | null;
  quantity: number;
  unit?: string;
  customerNotes?: string | null;
}

export interface CreateCustomerRequestDTO {
  customerId?: string | null;
  requestType: RequestType;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  companyName?: string | null;
  projectAddress?: string | null;
  projectCity?: string | null;
  projectState?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  desiredTimeline?: string | null;
  preferredContactMethod?: 'phone' | 'whatsapp' | 'email' | 'sms';
  customerComments?: string | null;
  internalNotes?: string | null;
  assignedTo?: string | null;
  assignedToName?: string | null;
  items: CreateCustomerRequestItemDTO[];
  attachments?: CustomerRequestAttachment[];
}

export interface UpdateCustomerRequestDTO {
  status?: RequestStatus;
  requestType?: RequestType;
  projectAddress?: string | null;
  projectCity?: string | null;
  projectState?: string | null;
  desiredTimeline?: string | null;
  customerComments?: string | null;
  internalNotes?: string | null;
  assignedTo?: string | null;
  assignedToName?: string | null;
  items?: CreateCustomerRequestItemDTO[];
  attachments?: CustomerRequestAttachment[];
}

export interface RequestFilters {
  search?: string;
  status?: RequestStatus | 'all';
  requestType?: RequestType | 'all';
  customerId?: string;
  assignedTo?: string | 'all';
  dateFrom?: string;
  dateTo?: string;
}

export interface RequestStats {
  total: number;
  submitted: number;
  underReview: number;
  quotationPrepared: number;
  quotationSent: number;
  accepted: number;
  closed: number;
}

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  product_only: 'Materials Only',
  service_only: 'Installation / Services Only',
  product_and_service: 'Materials + Installation (Turnkey)',
  site_inspection: 'Site Inspection & Assessment',
  general_quotation: 'General Project Quotation',
};

export const REQUEST_STATUS_CONFIG: Record<
  RequestStatus,
  { label: string; badgeVariant: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'outline'; description: string }
> = {
  submitted: {
    label: 'Submitted',
    badgeVariant: 'info',
    description: 'New inquiry logged by customer or visitor.',
  },
  under_review: {
    label: 'Under Review',
    badgeVariant: 'warning',
    description: 'Engineering sales team evaluating site logistics and bill of quantities.',
  },
  awaiting_customer_info: {
    label: 'Awaiting Info',
    badgeVariant: 'outline',
    description: 'Awaiting site layout drawings or dimensional clarifications from client.',
  },
  quotation_prepared: {
    label: 'Quotation Ready',
    badgeVariant: 'primary',
    description: 'Quotation created and pending managerial sign-off or transmission.',
  },
  quotation_sent: {
    label: 'Quotation Sent',
    badgeVariant: 'primary',
    description: 'Official quotation transmitted to client for review.',
  },
  customer_reviewing: {
    label: 'Client Reviewing',
    badgeVariant: 'info',
    description: 'Client actively assessing line items and pricing.',
  },
  accepted: {
    label: 'Client Accepted',
    badgeVariant: 'success',
    description: 'Customer approved quotation terms. Ready for order booking.',
  },
  declined: {
    label: 'Declined',
    badgeVariant: 'danger',
    description: 'Customer opted out or declined offer.',
  },
  cancelled: {
    label: 'Cancelled',
    badgeVariant: 'default',
    description: 'Inquiry voided or cancelled by customer request.',
  },
  closed: {
    label: 'Closed',
    badgeVariant: 'default',
    description: 'Archived or completed request workflow.',
  },
};
