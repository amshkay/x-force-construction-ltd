/**
 * Service Provider Management Repository
 * Module 16 — Service Provider Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Provides persistent management of external contractors, specialized artisans,
 * independent masons, and third-party installation partners.
 * Strictly separate from internal Installation Staff.
 */

import {
  ServiceProvider,
  ServiceProviderFilters,
  CreateServiceProviderDTO,
  UpdateServiceProviderDTO,
  ProviderType,
  ProviderCapability,
  ProviderStatus,
  ProviderAvailability,
  ProviderDocument,
  ProviderTypeDefinition,
  ProviderCapabilityDefinition,
} from '../types/serviceProvider';
import { businessSettingsService } from '../services/settings.service';

const STORAGE_KEY = 'xforce_service_providers_v1';

export const DEFAULT_PROVIDER_TYPES: ProviderTypeDefinition[] = [
  {
    type: 'contractor',
    label: 'Installation Contractor',
    description: 'Licensed contracting firms managing multi-man masonry and paving crews.',
  },
  {
    type: 'installation_specialist',
    label: 'Brick Installer / Paving Specialist',
    description: 'Specialists certified in interlocking brick dry-stacking and aesthetic paving.',
  },
  {
    type: 'artisan',
    label: 'Mason / Artisan',
    description: 'Skilled trade artisan with verified field masonry experience.',
  },
  {
    type: 'technician',
    label: 'Finishing & Wall Technician',
    description: 'Technicians specialized in wall alignment, joint pointing, and surface sealing.',
  },
  {
    type: 'individual',
    label: 'Independent Specialist',
    description: 'Individual independent tradesperson engaged for specific site jobs.',
  },
  {
    type: 'company',
    label: 'Engineering / Construction Company',
    description: 'Corporate civil engineering or construction subcontractor.',
  },
  {
    type: 'other',
    label: 'Other External Partner',
    description: 'Third-party auxiliary external service partner.',
  },
];

export const DEFAULT_PROVIDER_CAPABILITIES: ProviderCapabilityDefinition[] = [
  {
    code: 'brick_installation',
    label: 'Brick Installation',
    description: 'Precision laying and interlocking of hydraulic soil-cement bricks and pavers.',
  },
  {
    code: 'wall_preparation',
    label: 'Wall & Foundation Preparation',
    description: 'Laser-level survey, DPC inspection, starter course foundation alignment.',
  },
  {
    code: 'finishing',
    label: 'Finishing & Sealing',
    description: 'Efflorescence cleanup, joint pointing, protective weather-sealant application.',
  },
  {
    code: 'repairs',
    label: 'Repairs & Remediation',
    description: 'Snag rectifications, replacement of damaged blocks, structural bonding fixes.',
  },
  {
    code: 'maintenance',
    label: 'Site Maintenance',
    description: 'Periodic surface cleaning, weed clearance in paver joints, re-leveling.',
  },
  {
    code: 'site_inspection',
    label: 'Site Inspection & Survey',
    description: 'Preliminary site accessibility, soil suitability, and dimensional measurements.',
  },
  {
    code: 'other',
    label: 'Auxiliary Services',
    description: 'Equipment operation, scaffolding erection, site staging support.',
  },
];

const INITIAL_PROVIDERS_SEED: ServiceProvider[] = [];

export class ServiceProviderRepository {
  private memoryProviders: ServiceProvider[] = [];
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init(): void {
    if (this.isInitialized) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.memoryProviders = parsed;
          this.isInitialized = true;
          return;
        }
      }
    } catch (e) {
      console.warn('Could not read service providers from localStorage, seeding defaults:', e);
    }

    this.memoryProviders = [...INITIAL_PROVIDERS_SEED];
    this.saveProviders(this.memoryProviders);
    this.isInitialized = true;
  }

  private saveProviders(providers: ServiceProvider[]): void {
    this.memoryProviders = providers;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(providers));
    } catch (e) {
      console.error('Failed to save service providers to localStorage:', e);
    }
  }

  public getProviderTypes(): ProviderTypeDefinition[] {
    return DEFAULT_PROVIDER_TYPES;
  }

  public getCapabilities(): ProviderCapabilityDefinition[] {
    return DEFAULT_PROVIDER_CAPABILITIES;
  }

  public generateProviderNumber(): string {
    const settings = businessSettingsService.getFullSettings();
    const prefix = settings.numbering?.defaultServiceProviderPrefix || 'SPV';
    const year = new Date().getFullYear();

    const currentYearPrefix = `${prefix}-${year}-`;
    const countForYear = (this.memoryProviders || []).filter((p) =>
      p.providerNumber.startsWith(currentYearPrefix)
    ).length;

    const nextSeq = String(countForYear + 1).padStart(4, '0');
    return `${prefix}-${year}-${nextSeq}`;
  }

  public async getAll(filters?: ServiceProviderFilters): Promise<ServiceProvider[]> {
    this.init();
    let providers = [...this.memoryProviders];

    if (!filters) {
      return providers.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    if (filters.searchTerm && filters.searchTerm.trim()) {
      const term = filters.searchTerm.trim().toLowerCase();
      providers = providers.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.providerNumber.toLowerCase().includes(term) ||
          (p.contactPerson && p.contactPerson.toLowerCase().includes(term)) ||
          p.phone.toLowerCase().includes(term) ||
          (p.email && p.email.toLowerCase().includes(term)) ||
          (p.city && p.city.toLowerCase().includes(term)) ||
          (p.state && p.state.toLowerCase().includes(term)) ||
          p.serviceAreas.some((area) => area.toLowerCase().includes(term))
      );
    }

    if (filters.status && filters.status !== 'all') {
      providers = providers.filter((p) => p.status === filters.status);
    }

    if (filters.availability && filters.availability !== 'all') {
      providers = providers.filter((p) => p.availability === filters.availability);
    }

    if (filters.providerType && filters.providerType !== 'all') {
      providers = providers.filter((p) => p.providerType === filters.providerType);
    }

    if (filters.capability && filters.capability !== 'all') {
      providers = providers.filter((p) => p.capabilities.includes(filters.capability as ProviderCapability));
    }

    if (filters.serviceArea && filters.serviceArea !== 'all') {
      const areaTerm = filters.serviceArea.toLowerCase();
      providers = providers.filter(
        (p) =>
          (p.state && p.state.toLowerCase().includes(areaTerm)) ||
          (p.city && p.city.toLowerCase().includes(areaTerm)) ||
          p.serviceAreas.some((a) => a.toLowerCase().includes(areaTerm))
      );
    }

    return providers.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public async getById(id: string): Promise<ServiceProvider | null> {
    this.init();
    return this.memoryProviders.find((p) => p.id === id) || null;
  }

  public async getByProviderNumber(number: string): Promise<ServiceProvider | null> {
    this.init();
    const normalized = number.trim().toUpperCase();
    return this.memoryProviders.find((p) => p.providerNumber.toUpperCase() === normalized) || null;
  }

  public async getActiveProviders(): Promise<ServiceProvider[]> {
    this.init();
    return this.memoryProviders.filter((p) => p.status === 'active');
  }

  public async create(
    dto: CreateServiceProviderDTO,
    _createdBy?: string,
    _createdByName?: string
  ): Promise<ServiceProvider> {
    this.init();

    const id = `spv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const providerNumber = this.generateProviderNumber();
    const now = new Date().toISOString();

    const typeDef = DEFAULT_PROVIDER_TYPES.find((t) => t.type === dto.providerType);
    const providerTypeLabel = typeDef ? typeDef.label : dto.providerType;

    const newProvider: ServiceProvider = {
      id,
      providerNumber,
      name: dto.name.trim(),
      contactPerson: dto.contactPerson?.trim() || null,
      phone: dto.phone.trim(),
      whatsappNumber: dto.whatsappNumber?.trim() || dto.phone.trim(),
      email: dto.email?.trim() || null,
      address: dto.address?.trim() || null,
      city: dto.city?.trim() || null,
      state: dto.state?.trim() || null,
      serviceAreas: dto.serviceAreas && dto.serviceAreas.length > 0 ? dto.serviceAreas : [dto.city || dto.state || 'Local'],
      gpsLatitude: dto.gpsLatitude || null,
      gpsLongitude: dto.gpsLongitude || null,
      serviceAreaNotes: dto.serviceAreaNotes?.trim() || null,
      providerType: dto.providerType,
      providerTypeLabel,
      capabilities: dto.capabilities && dto.capabilities.length > 0 ? dto.capabilities : ['brick_installation'],
      description: dto.description?.trim() || null,
      status: dto.status || 'active',
      availability: dto.availability || 'available',
      registrationNumber: dto.registrationNumber?.trim() || null,
      taxId: dto.taxId?.trim() || null,
      internalNotes: dto.internalNotes?.trim() || null,
      documents: [],
      createdAt: now,
      updatedAt: now,
    };

    const updatedList = [newProvider, ...this.memoryProviders];
    this.saveProviders(updatedList);
    return newProvider;
  }

  public async update(
    id: string,
    dto: UpdateServiceProviderDTO,
    _updatedBy?: string,
    _updatedByName?: string
  ): Promise<ServiceProvider> {
    this.init();
    const index = this.memoryProviders.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error(`Service Provider with ID ${id} not found.`);
    }

    const current = this.memoryProviders[index];
    const now = new Date().toISOString();

    let providerTypeLabel = current.providerTypeLabel;
    if (dto.providerType && dto.providerType !== current.providerType) {
      const typeDef = DEFAULT_PROVIDER_TYPES.find((t) => t.type === dto.providerType);
      providerTypeLabel = typeDef ? typeDef.label : dto.providerType;
    }

    const updated: ServiceProvider = {
      ...current,
      name: dto.name !== undefined ? dto.name.trim() : current.name,
      contactPerson: dto.contactPerson !== undefined ? dto.contactPerson?.trim() || null : current.contactPerson,
      phone: dto.phone !== undefined ? dto.phone.trim() : current.phone,
      whatsappNumber: dto.whatsappNumber !== undefined ? dto.whatsappNumber?.trim() || null : current.whatsappNumber,
      email: dto.email !== undefined ? dto.email?.trim() || null : current.email,
      address: dto.address !== undefined ? dto.address?.trim() || null : current.address,
      city: dto.city !== undefined ? dto.city?.trim() || null : current.city,
      state: dto.state !== undefined ? dto.state?.trim() || null : current.state,
      serviceAreas: dto.serviceAreas !== undefined ? dto.serviceAreas : current.serviceAreas,
      gpsLatitude: dto.gpsLatitude !== undefined ? dto.gpsLatitude : current.gpsLatitude,
      gpsLongitude: dto.gpsLongitude !== undefined ? dto.gpsLongitude : current.gpsLongitude,
      serviceAreaNotes: dto.serviceAreaNotes !== undefined ? dto.serviceAreaNotes?.trim() || null : current.serviceAreaNotes,
      providerType: dto.providerType !== undefined ? dto.providerType : current.providerType,
      providerTypeLabel,
      capabilities: dto.capabilities !== undefined ? dto.capabilities : current.capabilities,
      description: dto.description !== undefined ? dto.description?.trim() || null : current.description,
      status: dto.status !== undefined ? dto.status : current.status,
      availability: dto.availability !== undefined ? dto.availability : current.availability,
      registrationNumber: dto.registrationNumber !== undefined ? dto.registrationNumber?.trim() || null : current.registrationNumber,
      taxId: dto.taxId !== undefined ? dto.taxId?.trim() || null : current.taxId,
      internalNotes: dto.internalNotes !== undefined ? dto.internalNotes?.trim() || null : current.internalNotes,
      updatedAt: now,
    };

    this.memoryProviders[index] = updated;
    this.saveProviders(this.memoryProviders);
    return updated;
  }

  public async setStatus(
    id: string,
    status: ProviderStatus,
    reason?: string,
    _changedBy?: string
  ): Promise<ServiceProvider> {
    const provider = await this.getById(id);
    if (!provider) throw new Error('Provider not found.');

    const noteAddition = reason ? `\n[Status Change to ${status} on ${new Date().toLocaleDateString()}]: ${reason}` : '';
    const updatedNotes = provider.internalNotes ? `${provider.internalNotes}${noteAddition}` : reason || null;

    return this.update(id, {
      status,
      internalNotes: updatedNotes,
    });
  }

  public async setAvailability(
    id: string,
    availability: ProviderAvailability
  ): Promise<ServiceProvider> {
    return this.update(id, { availability });
  }

  public async addDocument(
    providerId: string,
    doc: Omit<ProviderDocument, 'id' | 'providerId' | 'uploadedAt'>,
    uploadedBy?: string,
    uploadedByName?: string
  ): Promise<ServiceProvider> {
    this.init();
    const provider = await this.getById(providerId);
    if (!provider) throw new Error('Provider not found.');

    const newDoc: ProviderDocument = {
      ...doc,
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      providerId,
      uploadedAt: new Date().toISOString(),
      uploadedBy: uploadedBy || null,
      uploadedByName: uploadedByName || null,
    };

    const updatedDocuments = [newDoc, ...(provider.documents || [])];
    return this.update(providerId, {
      ...provider,
    }).then(() => {
      provider.documents = updatedDocuments;
      provider.updatedAt = new Date().toISOString();
      this.saveProviders(this.memoryProviders);
      return provider;
    });
  }

  public async removeDocument(providerId: string, documentId: string): Promise<ServiceProvider> {
    this.init();
    const provider = await this.getById(providerId);
    if (!provider) throw new Error('Provider not found.');

    provider.documents = (provider.documents || []).filter((d) => d.id !== documentId);
    provider.updatedAt = new Date().toISOString();
    this.saveProviders(this.memoryProviders);
    return provider;
  }

  public async resetDefaults(): Promise<void> {
    this.memoryProviders = [...INITIAL_PROVIDERS_SEED];
    this.saveProviders(this.memoryProviders);
  }
}

export const serviceProviderRepository = new ServiceProviderRepository();
