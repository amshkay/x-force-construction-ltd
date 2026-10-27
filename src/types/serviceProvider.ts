/**
 * Service Provider Management Domain Types
 * Module 16 — Service Provider Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Operational system for managing external contractors, specialized artisans,
 * independent masons, and third-party installation partners.
 * Strictly separate from internal Installation Staff.
 */

export type ProviderType =
  | 'individual'
  | 'contractor'
  | 'company'
  | 'artisan'
  | 'installation_specialist'
  | 'technician'
  | 'other';

export type ProviderCapability =
  | 'brick_installation'
  | 'wall_preparation'
  | 'finishing'
  | 'repairs'
  | 'maintenance'
  | 'site_inspection'
  | 'other';

export type ProviderStatus = 'active' | 'inactive' | 'suspended';

export type ProviderAvailability = 'available' | 'unavailable' | 'temporarily_unavailable';

export type ProviderDocumentType =
  | 'agreement'
  | 'certificate'
  | 'id_document'
  | 'license'
  | 'other';

export interface ProviderDocument {
  id: string;
  providerId: string;
  title: string;
  documentType: ProviderDocumentType;
  fileUrl: string;
  fileName: string;
  fileSize?: number | null;
  mimeType?: string | null;
  uploadedAt: string;
  uploadedBy?: string | null;
  uploadedByName?: string | null;
}

export interface ProviderCapabilityDefinition {
  code: ProviderCapability;
  label: string;
  description: string;
}

export interface ProviderTypeDefinition {
  type: ProviderType;
  label: string;
  description: string;
}

export interface ServiceProvider {
  id: string;
  providerNumber: string; // e.g. SPV-2026-0001
  name: string;
  contactPerson?: string | null;
  phone: string;
  whatsappNumber?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  serviceAreas: string[];
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  serviceAreaNotes?: string | null;

  providerType: ProviderType;
  providerTypeLabel: string;
  capabilities: ProviderCapability[];
  description?: string | null;

  status: ProviderStatus;
  availability: ProviderAvailability;

  registrationNumber?: string | null; // CAC / Trade Union / Guild Reg
  taxId?: string | null;

  internalNotes?: string | null;
  documents: ProviderDocument[];

  createdAt: string;
  updatedAt: string;
}

export interface ServiceProviderFilters {
  searchTerm?: string;
  status?: ProviderStatus | 'all';
  availability?: ProviderAvailability | 'all';
  providerType?: ProviderType | 'all';
  capability?: ProviderCapability | 'all';
  serviceArea?: string | 'all';
}

export interface CreateServiceProviderDTO {
  name: string;
  contactPerson?: string | null;
  phone: string;
  whatsappNumber?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  serviceAreas?: string[];
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  serviceAreaNotes?: string | null;
  providerType: ProviderType;
  capabilities: ProviderCapability[];
  description?: string | null;
  status?: ProviderStatus;
  availability?: ProviderAvailability;
  registrationNumber?: string | null;
  taxId?: string | null;
  internalNotes?: string | null;
}

export interface UpdateServiceProviderDTO {
  name?: string;
  contactPerson?: string | null;
  phone?: string;
  whatsappNumber?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  serviceAreas?: string[];
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  serviceAreaNotes?: string | null;
  providerType?: ProviderType;
  capabilities?: ProviderCapability[];
  description?: string | null;
  status?: ProviderStatus;
  availability?: ProviderAvailability;
  registrationNumber?: string | null;
  taxId?: string | null;
  internalNotes?: string | null;
}

export interface ServiceProviderAssignment {
  id: string;
  serviceJobId: string;
  serviceJobReference: string;
  serviceProviderId: string;
  serviceProviderName: string;
  serviceProviderPhone?: string | null;
  serviceProviderType?: string | null;
  assignedBy: string;
  assignedByName?: string | null;
  assignedAt: string;
  status: 'active' | 'completed' | 'cancelled' | 'reassigned';
  notes?: string | null;
}
