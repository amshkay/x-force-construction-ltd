/**
 * Supplier Management Types
 * Module 17 — Staff, Suppliers, Expenses & Basic Finance
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Dedicated to raw material, packaging, equipment, consumables, and utility vendors.
 * Strictly separate from external service providers (Module 16).
 */

import { SupplierStatus } from './database';
export type { SupplierStatus };

export type SupplierCategory =
  | 'raw_materials'
  | 'packaging'
  | 'equipment'
  | 'tools'
  | 'consumables'
  | 'fuel_utilities'
  | 'maintenance'
  | 'other';

export interface SupplierCategoryDefinition {
  code: SupplierCategory;
  label: string;
  description: string;
}

export interface SupplierBankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  sortCode?: string;
  branchName?: string;
}

export interface Supplier {
  id: string; // UUID
  supplierNumber: string; // e.g. SUP-2026-0001
  name: string; // Business/Company or Vendor Name
  contactPerson: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  category: SupplierCategory;
  suppliedItems: string[]; // List of materials/items supplied e.g. ['Dangote 42.5R Cement', 'Quarry Dust']
  status: SupplierStatus;
  paymentTerms?: string; // e.g. 'Net 15', 'Cash on Delivery', '50% Advance'
  leadTimeDays?: number; // Estimated days from order to yard delivery
  tinNumber?: string; // Tax Identification Number / RC Number
  bankDetails?: SupplierBankDetails;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierFilters {
  searchQuery?: string;
  category?: SupplierCategory | 'all';
  status?: SupplierStatus | 'all';
  state?: string | 'all';
  sortBy?: 'name' | 'supplierNumber' | 'category' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateSupplierDTO {
  name: string;
  contactPerson: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  country?: string;
  category: SupplierCategory;
  suppliedItems: string[];
  paymentTerms?: string;
  leadTimeDays?: number;
  tinNumber?: string;
  bankDetails?: SupplierBankDetails;
  notes?: string;
}

export interface UpdateSupplierDTO {
  name?: string;
  contactPerson?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  category?: SupplierCategory;
  suppliedItems?: string[];
  status?: SupplierStatus;
  paymentTerms?: string;
  leadTimeDays?: number;
  tinNumber?: string;
  bankDetails?: SupplierBankDetails;
  notes?: string;
}
