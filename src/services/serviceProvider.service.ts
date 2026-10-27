/**
 * Service Provider Management Service
 * Module 16 — Service Provider Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Business logic, audit logging, status state management, and service job
 * assignment validation for third-party contractors and artisans.
 */

import {
  ServiceProvider,
  ServiceProviderFilters,
  CreateServiceProviderDTO,
  UpdateServiceProviderDTO,
  ProviderStatus,
  ProviderAvailability,
  ProviderDocument,
  ProviderTypeDefinition,
  ProviderCapabilityDefinition,
} from '../types/serviceProvider';
import { serviceProviderRepository } from '../repositories/serviceProvider.repository';
import { installationRepository } from '../repositories/installation.repository';
import { installationService } from './installation.service';
import { auditService } from './audit.service';
import { ServiceJobRecord } from '../types/installation';

export class ServiceProviderService {
  /**
   * Retrieves all service providers matching optional filters
   */
  public async getAllProviders(filters?: ServiceProviderFilters): Promise<ServiceProvider[]> {
    return serviceProviderRepository.getAll(filters);
  }

  /**
   * Retrieves a single provider by ID
   */
  public async getProviderById(id: string): Promise<ServiceProvider | null> {
    return serviceProviderRepository.getById(id);
  }

  /**
   * Retrieves a provider by formatted number (e.g. SPV-2026-0001)
   */
  public async getProviderByNumber(number: string): Promise<ServiceProvider | null> {
    return serviceProviderRepository.getByProviderNumber(number);
  }

  /**
   * Retrieves all active providers available for new job assignments
   */
  public async getActiveProviders(): Promise<ServiceProvider[]> {
    return serviceProviderRepository.getActiveProviders();
  }

  /**
   * Returns configurable provider types
   */
  public getProviderTypes(): ProviderTypeDefinition[] {
    return serviceProviderRepository.getProviderTypes();
  }

  /**
   * Returns configurable service capabilities
   */
  public getCapabilities(): ProviderCapabilityDefinition[] {
    return serviceProviderRepository.getCapabilities();
  }

  /**
   * Creates a new external service provider with audit log
   */
  public async createProvider(
    dto: CreateServiceProviderDTO,
    userId: string,
    userName?: string
  ): Promise<ServiceProvider> {
    if (!dto.name || !dto.name.trim()) {
      throw new Error('Provider or business name is required.');
    }
    if (!dto.phone || !dto.phone.trim()) {
      throw new Error('Contact phone number is required.');
    }

    const provider = await serviceProviderRepository.create(dto, userId, userName);

    auditService.logEvent({
      action: 'service_provider.create',
      entity_type: 'service_provider',
      entity_id: provider.id,
      user_id: userId,
      reason: `Registered new service provider ${provider.name} (${provider.providerNumber})`,
      new_values: {
        name: provider.name,
        providerNumber: provider.providerNumber,
        providerType: provider.providerType,
        status: provider.status,
      },
    });

    return provider;
  }

  /**
   * Updates an existing service provider's details with audit log
   */
  public async updateProvider(
    id: string,
    dto: UpdateServiceProviderDTO,
    userId: string,
    userName?: string
  ): Promise<ServiceProvider> {
    const existing = await serviceProviderRepository.getById(id);
    if (!existing) {
      throw new Error(`Service Provider with ID ${id} not found.`);
    }

    const updated = await serviceProviderRepository.update(id, dto, userId, userName);

    auditService.logEvent({
      action: 'service_provider.update',
      entity_type: 'service_provider',
      entity_id: id,
      user_id: userId,
      reason: `Updated details for ${updated.name} (${updated.providerNumber})`,
      old_values: { name: existing.name, status: existing.status, availability: existing.availability },
      new_values: { name: updated.name, status: updated.status, availability: updated.availability },
    });

    return updated;
  }

  /**
   * Transitions provider status (active, inactive, suspended) with confirmation reasoning
   */
  public async setProviderStatus(
    id: string,
    status: ProviderStatus,
    reason?: string,
    userId: string = 'system',
    _userName?: string
  ): Promise<ServiceProvider> {
    const existing = await serviceProviderRepository.getById(id);
    if (!existing) throw new Error('Service provider not found.');

    const updated = await serviceProviderRepository.setStatus(id, status, reason, userId);

    auditService.logEvent({
      action: 'service_provider.status_change',
      entity_type: 'service_provider',
      entity_id: id,
      user_id: userId,
      reason: reason || `Provider status changed to ${status}`,
      old_values: { status: existing.status },
      new_values: { status },
    });

    return updated;
  }

  /**
   * Updates operational availability
   */
  public async setProviderAvailability(
    id: string,
    availability: ProviderAvailability,
    userId: string = 'system',
    _userName?: string
  ): Promise<ServiceProvider> {
    const existing = await serviceProviderRepository.getById(id);
    if (!existing) throw new Error('Service provider not found.');

    const updated = await serviceProviderRepository.setAvailability(id, availability);

    auditService.logEvent({
      action: 'service_provider.availability_change',
      entity_type: 'service_provider',
      entity_id: id,
      user_id: userId,
      reason: `Provider availability changed to ${availability}`,
      old_values: { availability: existing.availability },
      new_values: { availability },
    });

    return updated;
  }

  /**
   * Adds an authenticated compliance/agreement document
   */
  public async addProviderDocument(
    providerId: string,
    doc: Omit<ProviderDocument, 'id' | 'providerId' | 'uploadedAt'>,
    userId: string = 'system',
    userName?: string
  ): Promise<ServiceProvider> {
    const updated = await serviceProviderRepository.addDocument(providerId, doc, userId, userName);

    auditService.logEvent({
      action: 'service_provider.document_upload',
      entity_type: 'service_provider',
      entity_id: providerId,
      user_id: userId,
      reason: `Uploaded ${doc.documentType} document: ${doc.title}`,
      new_values: { title: doc.title, documentType: doc.documentType },
    });

    return updated;
  }

  /**
   * Removes a document from the provider's file registry
   */
  public async removeProviderDocument(
    providerId: string,
    documentId: string,
    userId: string = 'system',
    _userName?: string
  ): Promise<ServiceProvider> {
    const updated = await serviceProviderRepository.removeDocument(providerId, documentId);

    auditService.logEvent({
      action: 'service_provider.document_remove',
      entity_type: 'service_provider',
      entity_id: providerId,
      user_id: userId,
      reason: `Removed document ID ${documentId}`,
    });

    return updated;
  }

  /**
   * Assigns an active provider to a service job (enforcing rule that inactive/suspended providers cannot be assigned)
   */
  public async assignProviderToJob(
    jobId: string,
    providerId: string,
    userId: string = 'system',
    userName?: string,
    note?: string
  ): Promise<ServiceJobRecord> {
    const provider = await serviceProviderRepository.getById(providerId);
    if (!provider) {
      throw new Error(`Service Provider with ID ${providerId} does not exist.`);
    }

    if (provider.status !== 'active') {
      throw new Error(
        `Cannot assign provider "${provider.name}" because their status is currently ${provider.status.toUpperCase()}. Only active providers may be assigned.`
      );
    }

    return installationService.assignServiceProvider(
      jobId,
      provider.id,
      provider.name,
      provider.phone,
      provider.providerTypeLabel,
      userId,
      userName,
      note
    );
  }

  /**
   * Unassigns external service provider from a job
   */
  public async unassignProviderFromJob(
    jobId: string,
    userId: string = 'system',
    userName?: string,
    note?: string
  ): Promise<ServiceJobRecord> {
    return installationService.unassignServiceProvider(jobId, userId, userName, note);
  }

  /**
   * Retrieves all actual service jobs linked to this provider (historical relationship preservation)
   */
  public async getAssignedJobs(providerId: string): Promise<ServiceJobRecord[]> {
    return installationRepository.getByServiceProviderId(providerId);
  }

  /**
   * Resets default demo data
   */
  public async resetDefaultData(): Promise<void> {
    return serviceProviderRepository.resetDefaults();
  }
}

export const serviceProviderService = new ServiceProviderService();
