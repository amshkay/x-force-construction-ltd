/**
 * Installation & Service Management Service
 * Module 15 — Installation & Service Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Business logic, workflow state machine enforcement, staff assignment,
 * and operational dashboard metrics.
 */

import {
  installationRepository,
  DEFAULT_SERVICE_TYPES,
} from '../repositories/installation.repository';
import {
  ServiceJobRecord,
  ServiceJobFilters,
  CreateServiceJobDTO,
  ServiceJobStatus,
  ServiceType,
  ServiceTypeDefinition,
  ServiceMeasurement,
  ServicePhoto,
  ServiceMaterialUsage,
  SiteInspectionDetails,
  SitePreparationDetails,
  InstallationProgressDetails,
  QualityCheckDetails,
  FinalCleaningDetails,
  CustomerSignOff,
} from '../types/installation';
import { auditService } from './audit.service';

export interface ServiceDashboardMetrics {
  totalJobs: number;
  todayJobs: number;
  activeJobs: number;
  awaitingAssignment: number;
  awaitingInspection: number;
  inInstallation: number;
  awaitingQualityCheck: number;
  completedJobs: number;
  cancelledJobs: number;
  totalSquareMetersInstalled: number;
}

export class InstallationService {
  /**
   * Retrieves all service jobs applying optional filters
   */
  public async getServiceJobs(filters?: ServiceJobFilters): Promise<ServiceJobRecord[]> {
    return installationRepository.getAll(filters);
  }

  /**
   * Retrieves a single service job by internal ID
   */
  public async getServiceJobById(id: string): Promise<ServiceJobRecord | null> {
    return installationRepository.getById(id);
  }

  /**
   * Retrieves a single service job by human-readable reference e.g. SRV-2026-0001
   */
  public async getServiceJobByReference(ref: string): Promise<ServiceJobRecord | null> {
    return installationRepository.getByJobReference(ref);
  }

  /**
   * Retrieves service jobs linked to an order
   */
  public async getJobsByOrderId(orderId: string): Promise<ServiceJobRecord[]> {
    return installationRepository.getByOrderId(orderId);
  }

  /**
   * Retrieves service jobs assigned to a specific staff member
   */
  public async getJobsByAssignedStaff(staffId: string): Promise<ServiceJobRecord[]> {
    return installationRepository.getByAssignedStaff(staffId);
  }

  /**
   * Configurable service types
   */
  public getServiceTypes(): ServiceTypeDefinition[] {
    return installationRepository.getServiceTypes();
  }

  /**
   * Computes authoritative real-time dashboard metrics
   */
  public async getDashboardMetrics(): Promise<ServiceDashboardMetrics> {
    const jobs = await installationRepository.getAll();
    const todayStr = new Date().toISOString().split('T')[0];

    let todayJobs = 0;
    let activeJobs = 0;
    let awaitingAssignment = 0;
    let awaitingInspection = 0;
    let inInstallation = 0;
    let awaitingQualityCheck = 0;
    let completedJobs = 0;
    let cancelledJobs = 0;
    let totalSquareMetersInstalled = 0;

    for (const job of jobs) {
      if (job.status === 'cancelled') {
        cancelledJobs++;
        continue;
      }

      if (job.status === 'completed') {
        completedJobs++;
      } else {
        activeJobs++;
      }

      if (job.scheduledDate === todayStr) {
        todayJobs++;
      }

      if (!job.assignedStaffId || job.status === 'scheduled') {
        awaitingAssignment++;
      }

      if (job.status === 'inspection') {
        awaitingInspection++;
      }

      if (job.status === 'installation' || job.status === 'preparation') {
        inInstallation++;
      }

      if (job.status === 'quality_check') {
        awaitingQualityCheck++;
      }

      if (job.installationDetails?.squareMetersInstalled) {
        totalSquareMetersInstalled += job.installationDetails.squareMetersInstalled;
      }
    }

    return {
      totalJobs: jobs.length,
      todayJobs,
      activeJobs,
      awaitingAssignment,
      awaitingInspection,
      inInstallation,
      awaitingQualityCheck,
      completedJobs,
      cancelledJobs,
      totalSquareMetersInstalled: Math.round(totalSquareMetersInstalled * 10) / 10,
    };
  }

  /**
   * Creates a new service job with audit log
   */
  public async createServiceJob(
    dto: CreateServiceJobDTO,
    userId: string,
    userName: string
  ): Promise<ServiceJobRecord> {
    if (!dto.customerName || !dto.customerPhone) {
      throw new Error('Customer name and phone number are required.');
    }
    if (!dto.siteAddress) {
      throw new Error('Physical site address is required.');
    }

    const job = await installationRepository.createServiceJob({
      ...dto,
      performedBy: userId,
      performedByName: userName,
    });

    auditService.logEvent({
      action: 'service_job.created',
      entity_type: 'service_job',
      entity_id: job.id,
      user_id: userId,
      reason: `Service job ${job.jobReference} created for ${job.customerName}`,
      new_values: { jobReference: job.jobReference, status: job.status, siteAddress: job.siteAddress },
    });

    return job;
  }

  /**
   * Assigns field installation staff to job
   */
  public async assignStaff(
    jobId: string,
    staffId: string,
    staffName: string,
    staffPhone?: string,
    staffRole?: string,
    userId: string = 'system',
    userName?: string
  ): Promise<ServiceJobRecord> {
    const job = await installationRepository.assignStaff(
      jobId,
      staffId,
      staffName,
      staffPhone,
      staffRole,
      userId,
      userName
    );

    auditService.logEvent({
      action: 'service_job.staff_assigned',
      entity_type: 'service_job',
      entity_id: jobId,
      user_id: userId,
      reason: `Assigned ${staffName} to ${job.jobReference}`,
      new_values: { assignedStaffId: staffId, assignedStaffName: staffName },
    });

    return job;
  }

  /**
   * Updates workflow status
   */
  public async updateJobStatus(
    jobId: string,
    newStatus: ServiceJobStatus,
    userId: string,
    userName?: string,
    note?: string
  ): Promise<ServiceJobRecord> {
    const job = await installationRepository.updateStatus(jobId, newStatus, userId, userName, note);

    auditService.logEvent({
      action: 'service_job.status_change',
      entity_type: 'service_job',
      entity_id: jobId,
      user_id: userId,
      reason: note || `Status changed to ${newStatus}`,
      new_values: { status: newStatus },
    });

    return job;
  }

  /**
   * Toggles checklist item state
   */
  public async toggleChecklistItem(
    jobId: string,
    itemId: string,
    isCompleted: boolean,
    userId: string,
    userName?: string,
    notes?: string
  ): Promise<ServiceJobRecord> {
    return installationRepository.toggleChecklistItem(jobId, itemId, isCompleted, userId, userName, notes);
  }

  /**
   * Adds service measurement
   */
  public async addMeasurement(
    jobId: string,
    measurement: Omit<ServiceMeasurement, 'id' | 'recordedAt'>,
    userId: string,
    userName?: string
  ): Promise<ServiceJobRecord> {
    return installationRepository.addMeasurement(jobId, measurement, userId, userName);
  }

  public async deleteMeasurement(jobId: string, measurementId: string): Promise<ServiceJobRecord> {
    return installationRepository.deleteMeasurement(jobId, measurementId);
  }

  /**
   * Adds photograph
   */
  public async addPhoto(
    jobId: string,
    photo: Omit<ServicePhoto, 'id' | 'takenAt'>,
    userId: string,
    userName?: string
  ): Promise<ServiceJobRecord> {
    return installationRepository.addPhoto(jobId, photo, userId, userName);
  }

  public async deletePhoto(jobId: string, photoId: string): Promise<ServiceJobRecord> {
    return installationRepository.deletePhoto(jobId, photoId);
  }

  /**
   * Records material consumption from stock location
   */
  public async recordMaterialUsage(
    jobId: string,
    usage: Omit<ServiceMaterialUsage, 'id' | 'recordedAt'>,
    userId: string,
    userName?: string
  ): Promise<ServiceJobRecord> {
    const job = await installationRepository.recordMaterialUsage(jobId, usage, userId, userName);

    auditService.logEvent({
      action: 'service_job.material_used',
      entity_type: 'service_job',
      entity_id: jobId,
      user_id: userId,
      reason: `Consumed ${usage.quantityUsed} ${usage.unit} of ${usage.productName} for ${job.jobReference}`,
      new_values: { productId: usage.productId, quantityUsed: usage.quantityUsed, sourceLocationId: usage.sourceLocationId },
    });

    return job;
  }

  /**
   * Records site inspection survey
   */
  public async recordInspection(
    jobId: string,
    inspection: SiteInspectionDetails,
    userId: string,
    userName?: string
  ): Promise<ServiceJobRecord> {
    return installationRepository.recordInspection(jobId, inspection, userId, userName);
  }

  /**
   * Records site preparation status
   */
  public async recordPreparation(
    jobId: string,
    preparation: SitePreparationDetails,
    userId: string,
    userName?: string
  ): Promise<ServiceJobRecord> {
    return installationRepository.recordPreparation(jobId, preparation, userId, userName);
  }

  /**
   * Logs daily/session installation progress
   */
  public async updateInstallationProgress(
    jobId: string,
    progress: InstallationProgressDetails,
    userId: string,
    userName?: string
  ): Promise<ServiceJobRecord> {
    return installationRepository.updateInstallationProgress(jobId, progress, userId, userName);
  }

  /**
   * Records Quality Check audit
   */
  public async recordQualityCheck(
    jobId: string,
    qc: QualityCheckDetails,
    userId: string,
    userName?: string
  ): Promise<ServiceJobRecord> {
    return installationRepository.recordQualityCheck(jobId, qc, userId, userName);
  }

  /**
   * Records final cleaning
   */
  public async recordFinalCleaning(
    jobId: string,
    cleaning: FinalCleaningDetails,
    userId: string,
    userName?: string
  ): Promise<ServiceJobRecord> {
    return installationRepository.recordFinalCleaning(jobId, cleaning, userId, userName);
  }

  /**
   * Records customer completion sign-off
   */
  public async recordCustomerSignOff(
    jobId: string,
    signOff: CustomerSignOff,
    userId: string,
    userName?: string
  ): Promise<ServiceJobRecord> {
    const job = await installationRepository.recordCustomerSignOff(jobId, signOff, userId, userName);

    auditService.logEvent({
      action: 'service_job.sign_off',
      entity_type: 'service_job',
      entity_id: jobId,
      user_id: userId,
      reason: `Customer sign-off completed by ${signOff.signedByCustomerName} for ${job.jobReference}`,
      new_values: { signedByCustomerName: signOff.signedByCustomerName, satisfactionRating: signOff.satisfactionRating },
    });

    return job;
  }

  /**
   * Assigns an external service provider to a job with audit log
   */
  public async assignServiceProvider(
    jobId: string,
    providerId: string,
    providerName: string,
    providerPhone?: string,
    providerType?: string,
    userId: string = 'system',
    userName?: string,
    note?: string
  ): Promise<ServiceJobRecord> {
    const job = await installationRepository.assignServiceProvider(
      jobId,
      providerId,
      providerName,
      providerPhone,
      providerType,
      userId,
      userName,
      note
    );

    auditService.logEvent({
      action: 'service_job.provider_assigned',
      entity_type: 'service_job',
      entity_id: jobId,
      user_id: userId,
      reason: note || `Assigned service provider ${providerName} to ${job.jobReference}`,
      new_values: { serviceProviderId: providerId, serviceProviderName: providerName },
    });

    return job;
  }

  /**
   * Unassigns an external service provider from a job with audit log
   */
  public async unassignServiceProvider(
    jobId: string,
    userId: string = 'system',
    userName?: string,
    note?: string
  ): Promise<ServiceJobRecord> {
    const job = await installationRepository.unassignServiceProvider(
      jobId,
      userId,
      userName,
      note
    );

    auditService.logEvent({
      action: 'service_job.provider_unassigned',
      entity_type: 'service_job',
      entity_id: jobId,
      user_id: userId,
      reason: note || `Unassigned external service provider from ${job.jobReference}`,
      new_values: { serviceProviderId: null },
    });

    return job;
  }

  /**
   * Retrieves all jobs associated with a specific service provider
   */
  public async getJobsByServiceProvider(providerId: string): Promise<ServiceJobRecord[]> {
    return installationRepository.getByServiceProviderId(providerId);
  }
}

export const installationService = new InstallationService();
