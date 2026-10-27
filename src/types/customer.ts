/**
 * Customer Management Types
 * Module 08: Customer Management
 * XFORCE Construction Management & Customer Platform (Brand: X-FORCE BRICKS)
 */

export type CustomerType =
  | 'individual'
  | 'homeowner'
  | 'contractor'
  | 'architect'
  | 'real_estate_developer'
  | 'corporate'
  | 'organization'
  | 'distributor'
  | 'other';

export type CustomerStatus =
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'lead'
  | 'blacklisted';

export type CustomerAccountStatus =
  | 'active'
  | 'pending'
  | 'no_account'
  | 'suspended';

export type PreferredContactMethod =
  | 'phone'
  | 'whatsapp'
  | 'email'
  | 'sms';

export type RegistrationSource =
  | 'staff'
  | 'portal'
  | 'request'
  | 'walk_in'
  | 'csv_import';

export interface Customer {
  id: string;
  customerNumber: string; // e.g. XFC-000001
  userId: string | null; // Linked Supabase Auth User ID
  fullName: string;
  firstName?: string;
  lastName?: string;
  companyName: string | null;
  phone: string;
  altPhone?: string | null;
  email: string | null;
  whatsappNumber?: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  customerType: CustomerType;
  status: CustomerStatus;
  accountStatus: CustomerAccountStatus;
  preferredContactMethod: PreferredContactMethod;
  registrationSource: RegistrationSource;
  notes: string | null; // Staff-only internal notes
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerDTO {
  fullName: string;
  firstName?: string;
  lastName?: string;
  companyName?: string | null;
  phone: string;
  altPhone?: string | null;
  email?: string | null;
  whatsappNumber?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  customerType?: CustomerType;
  status?: CustomerStatus;
  preferredContactMethod?: PreferredContactMethod;
  registrationSource?: RegistrationSource;
  notes?: string | null;
  userId?: string | null;
  accountStatus?: CustomerAccountStatus;
}

export interface UpdateCustomerDTO extends Partial<CreateCustomerDTO> {
  customerNumber?: string;
}

export interface CustomerFilters {
  searchQuery?: string;
  customerType?: CustomerType | 'all';
  status?: CustomerStatus | 'all';
  accountStatus?: CustomerAccountStatus | 'all';
  sortBy?: 'name' | 'number' | 'created' | 'updated';
  sortDirection?: 'asc' | 'desc';
}

export interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  withPortalAccount: number;
  contractors: number;
  homeowners: number;
}

export interface DuplicateWarning {
  field: 'phone' | 'email' | 'customerNumber';
  matchedCustomer: Customer;
  message: string;
}

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  individual: 'Individual Buyer',
  homeowner: 'Homeowner / Private Builder',
  contractor: 'Building & Paving Contractor',
  architect: 'Architect / Consultant',
  real_estate_developer: 'Real Estate Developer',
  corporate: 'Corporate / Commercial Entity',
  organization: 'Government / Non-Profit Org',
  distributor: 'Distributor / Reseller',
  other: 'Other Classification',
};

export const CUSTOMER_STATUS_CONFIG: Record<
  CustomerStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  active: {
    label: 'Active',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    dotClass: 'bg-emerald-500',
  },
  inactive: {
    label: 'Inactive',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    dotClass: 'bg-slate-400',
  },
  suspended: {
    label: 'Suspended',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    dotClass: 'bg-amber-500',
  },
  lead: {
    label: 'Prospect / Lead',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    dotClass: 'bg-blue-500',
  },
  blacklisted: {
    label: 'Blacklisted',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    dotClass: 'bg-rose-500',
  },
};

export const ACCOUNT_STATUS_CONFIG: Record<
  CustomerAccountStatus,
  { label: string; badgeClass: string }
> = {
  active: {
    label: 'Portal Active',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
  },
  pending: {
    label: 'Invite Sent',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  },
  no_account: {
    label: 'Record Only',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700',
  },
  suspended: {
    label: 'Portal Suspended',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
  },
};
