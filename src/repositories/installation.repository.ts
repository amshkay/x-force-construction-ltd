/**
 * Installation & Service Management Repository
 * Module 15 — Installation & Service Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Provides persistent management of field service jobs, site surveys,
 * progress tracking, materials deduction, and client handovers.
 */

import { localStore } from '../lib/storage/localStorage';
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
  ChecklistItem,
  SiteInspectionDetails,
  SitePreparationDetails,
  InstallationProgressDetails,
  QualityCheckDetails,
  FinalCleaningDetails,
  CustomerSignOff,
  ServiceJobStatusHistory,
} from '../types/installation';
import { businessSettingsService } from '../services/settings.service';
import { inventoryRepository } from './inventory.repository';

const SERVICE_JOBS_STORAGE_KEY = 'xforce_service_jobs_cache_v1';
const SERVICE_TYPES_STORAGE_KEY = 'xforce_service_types_cache_v1';

export const DEFAULT_SERVICE_TYPES: ServiceTypeDefinition[] = [
  {
    type: 'installation',
    label: 'Brick / Block Installation',
    description: 'On-site laying and alignment of interlocking soil-cement bricks, pavers, and structural blocks.',
    defaultChecklistStages: ['inspection', 'preparation', 'installation', 'quality_check', 'final_cleaning', 'completion'],
    requiresInspection: true,
    isActive: true,
  },
  {
    type: 'site_inspection',
    label: 'Site Survey & Leveling Inspection',
    description: 'Pre-construction inspection of site accessibility, foundation readiness, laser leveling, and perimeter dimensions.',
    defaultChecklistStages: ['inspection', 'completion'],
    requiresInspection: true,
    isActive: true,
  },
  {
    type: 'wall_preparation',
    label: 'Surface & Wall Preparation',
    description: 'DPC leveling, concrete beam foundation preparation, surface cleaning, and structural obstacle clearing.',
    defaultChecklistStages: ['preparation', 'completion'],
    requiresInspection: false,
    isActive: true,
  },
  {
    type: 'finishing',
    label: 'Finishing & Hydrophobic Sealing',
    description: 'Joint pointing, efflorescence wash, silane-siloxane penetrating sealer spray, and aesthetic trim.',
    defaultChecklistStages: ['preparation', 'installation', 'final_cleaning', 'completion'],
    requiresInspection: false,
    isActive: true,
  },
  {
    type: 'repair_maintenance',
    label: 'Repair / Maintenance',
    description: 'Remediation of settling pavers, damaged boundary block replacement, or resealing services.',
    defaultChecklistStages: ['inspection', 'preparation', 'installation', 'quality_check', 'completion'],
    requiresInspection: true,
    isActive: true,
  },
  {
    type: 'other',
    label: 'Custom Field Service',
    description: 'Ad-hoc technical field consultation, on-site mock-up building, or client contractor training.',
    defaultChecklistStages: ['inspection', 'installation', 'completion'],
    requiresInspection: false,
    isActive: true,
  },
];

export const INITIAL_CHECKLIST_TEMPLATE: ChecklistItem[] = [
  {
    id: 'chk-arr-01',
    stage: 'inspection',
    title: 'Site Arrival & Safety Check',
    description: 'Arrive on site, check PPE equipment, verify customer point of contact, and inspect site perimeter.',
    isCompleted: false,
    isMandatory: true,
  },
  {
    id: 'chk-arr-02',
    stage: 'inspection',
    title: 'Foundation & Leveling Survey',
    description: 'Verify sub-base compaction, laser leveling, and damp-proof course (DPC) alignment.',
    isCompleted: false,
    isMandatory: true,
  },
  {
    id: 'chk-prep-01',
    stage: 'preparation',
    title: 'Surface Cleaning & Obstacle Removal',
    description: 'Sweep foundation surface, clear protruding rebar/rubble, and set string lines for starter course.',
    isCompleted: false,
    isMandatory: true,
  },
  {
    id: 'chk-prep-02',
    stage: 'preparation',
    title: 'Material Staging & Batch Verification',
    description: 'Confirm correct brick colors/variants, ensure clean water and staging area are protected from rain.',
    isCompleted: false,
    isMandatory: true,
  },
  {
    id: 'chk-inst-01',
    stage: 'installation',
    title: 'Starter Course True Alignment',
    description: 'Lay initial guide blocks with spirit level and right-angle framing square to prevent drift.',
    isCompleted: false,
    isMandatory: true,
  },
  {
    id: 'chk-inst-02',
    stage: 'installation',
    title: 'Dry-Stack Interlock Progression',
    description: 'Interlock subsequent courses, tapping gently with rubber mallets to ensure solid tongue-and-groove seat.',
    isCompleted: false,
    isMandatory: true,
  },
  {
    id: 'chk-qc-01',
    stage: 'quality_check',
    title: 'Plumb, Level & Interlock QA Audit',
    description: 'Check vertical plumb, horizontal level over 3m straight-edge, and inspect joint gap tolerances (<2mm).',
    isCompleted: false,
    isMandatory: true,
  },
  {
    id: 'chk-cln-01',
    stage: 'final_cleaning',
    title: 'Site Cleanup & Brick Wash',
    description: 'Brush off residual stone dust, remove offcuts/banding strips, and clean surrounding perimeter floor.',
    isCompleted: false,
    isMandatory: true,
  },
  {
    id: 'chk-cmp-01',
    stage: 'completion',
    title: 'Customer Handover & Sign-Off',
    description: 'Walk customer/site engineer through completed work and obtain written sign-off confirmation.',
    isCompleted: false,
    isMandatory: true,
  },
];

export const INITIAL_FOUNDATIONAL_SERVICE_JOBS: ServiceJobRecord[] = [];

export class InstallationRepository {
  private memoryJobs: ServiceJobRecord[] | null = null;
  private memoryTypes: ServiceTypeDefinition[] | null = null;

  constructor() {
    this.initCache();
  }

  private initCache(): void {
    const storedJobs = localStore.get<ServiceJobRecord[] | null>(SERVICE_JOBS_STORAGE_KEY, null);
    if (storedJobs && storedJobs.length > 0) {
      this.memoryJobs = storedJobs;
    } else {
      this.memoryJobs = INITIAL_FOUNDATIONAL_SERVICE_JOBS;
      localStore.set(SERVICE_JOBS_STORAGE_KEY, INITIAL_FOUNDATIONAL_SERVICE_JOBS);
    }

    const storedTypes = localStore.get<ServiceTypeDefinition[] | null>(SERVICE_TYPES_STORAGE_KEY, null);
    if (storedTypes && storedTypes.length > 0) {
      this.memoryTypes = storedTypes;
    } else {
      this.memoryTypes = DEFAULT_SERVICE_TYPES;
      localStore.set(SERVICE_TYPES_STORAGE_KEY, DEFAULT_SERVICE_TYPES);
    }
  }

  private saveJobs(jobs: ServiceJobRecord[]): void {
    this.memoryJobs = jobs;
    localStore.set(SERVICE_JOBS_STORAGE_KEY, jobs);
  }

  private saveTypes(types: ServiceTypeDefinition[]): void {
    this.memoryTypes = types;
    localStore.set(SERVICE_TYPES_STORAGE_KEY, types);
  }

  /**
   * Generates a configurable reference e.g. SRV-2026-0001
   */
  public generateJobReference(): string {
    const year = new Date().getFullYear();
    const settings = businessSettingsService.getFullSettings();
    const prefix = settings.numbering?.defaultServicePrefix || 'SRV';
    const existing = this.memoryJobs || [];
    const count = existing.length + 1;
    return `${prefix}-${year}-${String(count).padStart(4, '0')}`;
  }

  public getServiceTypes(): ServiceTypeDefinition[] {
    return this.memoryTypes || DEFAULT_SERVICE_TYPES;
  }

  public updateServiceTypes(types: ServiceTypeDefinition[]): void {
    this.saveTypes(types);
  }

  public async getAll(filters?: ServiceJobFilters): Promise<ServiceJobRecord[]> {
    let jobs = [...(this.memoryJobs || [])];

    if (!filters) return jobs;

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase().trim();
      jobs = jobs.filter(
        (j) =>
          j.jobReference.toLowerCase().includes(term) ||
          j.customerName.toLowerCase().includes(term) ||
          j.customerPhone.includes(term) ||
          (j.orderNumber && j.orderNumber.toLowerCase().includes(term)) ||
          j.siteAddress.toLowerCase().includes(term) ||
          (j.assignedStaffName && j.assignedStaffName.toLowerCase().includes(term))
      );
    }

    if (filters.status && filters.status !== 'all') {
      jobs = jobs.filter((j) => j.status === filters.status);
    }

    if (filters.serviceType && filters.serviceType !== 'all') {
      jobs = jobs.filter((j) => j.serviceType === filters.serviceType);
    }

    if (filters.priority && filters.priority !== 'all') {
      jobs = jobs.filter((j) => j.priority === filters.priority);
    }

    if (filters.assignedStaffId && filters.assignedStaffId !== 'all') {
      jobs = jobs.filter((j) => j.assignedStaffId === filters.assignedStaffId);
    }

    if (filters.dateRange?.start) {
      jobs = jobs.filter((j) => (j.scheduledDate || j.createdAt) >= filters.dateRange!.start!);
    }

    if (filters.dateRange?.end) {
      jobs = jobs.filter((j) => (j.scheduledDate || j.createdAt) <= filters.dateRange!.end!);
    }

    return jobs;
  }

  public async getById(id: string): Promise<ServiceJobRecord | null> {
    const jobs = this.memoryJobs || [];
    return jobs.find((j) => j.id === id) || null;
  }

  public async getByJobReference(ref: string): Promise<ServiceJobRecord | null> {
    const jobs = this.memoryJobs || [];
    const normalized = ref.trim().toUpperCase();
    return jobs.find((j) => j.jobReference.toUpperCase() === normalized) || null;
  }

  public async getByOrderId(orderId: string): Promise<ServiceJobRecord[]> {
    const jobs = this.memoryJobs || [];
    return jobs.filter((j) => j.orderId === orderId);
  }

  public async getByCustomerId(customerId: string): Promise<ServiceJobRecord[]> {
    const jobs = this.memoryJobs || [];
    return jobs.filter((j) => j.customerId === customerId);
  }

  public async getByAssignedStaff(staffId: string): Promise<ServiceJobRecord[]> {
    const jobs = this.memoryJobs || [];
    return jobs.filter((j) => j.assignedStaffId === staffId);
  }

  public async getByServiceProviderId(providerId: string): Promise<ServiceJobRecord[]> {
    const jobs = this.memoryJobs || [];
    return jobs.filter((j) => j.serviceProviderId === providerId);
  }

  public async createServiceJob(dto: CreateServiceJobDTO): Promise<ServiceJobRecord> {
    const id = `srv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const jobReference = this.generateJobReference();
    const now = new Date().toISOString();

    const typeDef = this.getServiceTypes().find((t) => t.type === dto.serviceType);
    const serviceTypeLabel = typeDef ? typeDef.label : dto.serviceType;

    // Build initial checklists tailored to service type
    const initialChecklist = INITIAL_CHECKLIST_TEMPLATE.map((c) => ({
      ...c,
      id: `chk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    }));

    const newJob: ServiceJobRecord = {
      id,
      jobReference,
      customerId: dto.customerId || null,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      customerEmail: dto.customerEmail || null,
      companyName: dto.companyName || null,
      requestId: dto.requestId || null,
      requestNumber: dto.requestNumber || null,
      quotationId: dto.quotationId || null,
      quotationNumber: dto.quotationNumber || null,
      orderId: dto.orderId || null,
      orderNumber: dto.orderNumber || null,
      fulfilmentId: dto.fulfilmentId || null,
      fulfilmentNumber: dto.fulfilmentNumber || null,
      serviceType: dto.serviceType,
      serviceTypeLabel,
      status: (dto.assignedStaffId || dto.serviceProviderId) ? 'assigned' : 'scheduled',
      priority: dto.priority,
      siteAddress: dto.siteAddress,
      siteCity: dto.siteCity || null,
      siteState: dto.siteState || null,
      gpsLatitude: dto.gpsLatitude || null,
      gpsLongitude: dto.gpsLongitude || null,
      locationNotes: dto.locationNotes || null,
      scheduledDate: dto.scheduledDate || null,
      scheduledTime: dto.scheduledTime || null,
      estimatedDurationHours: dto.estimatedDurationHours || null,
      assignedStaffId: dto.assignedStaffId || null,
      assignedStaffName: dto.assignedStaffName || null,
      assignedStaffPhone: dto.assignedStaffPhone || null,
      assignedStaffRole: dto.assignedStaffRole || null,
      teamMembers: dto.assignedStaffId
        ? [{ id: dto.assignedStaffId, name: dto.assignedStaffName || 'Lead', role: dto.assignedStaffRole || 'Lead Mason', phone: dto.assignedStaffPhone || undefined }]
        : [],
      serviceProviderId: dto.serviceProviderId || null,
      serviceProviderName: dto.serviceProviderName || null,
      serviceProviderPhone: dto.serviceProviderPhone || null,
      serviceProviderType: dto.serviceProviderType || null,
      serviceProviderAssignedAt: dto.serviceProviderId ? now : null,
      internalNotes: dto.internalNotes || null,
      customerVisibleNotes: dto.customerVisibleNotes || 'Service work scheduled.',
      checklists: initialChecklist,
      measurements: [],
      photos: [],
      materialsUsed: [],
      inspectionDetails: null,
      preparationDetails: null,
      installationDetails: null,
      qualityCheckDetails: null,
      finalCleaningDetails: null,
      customerSignOff: null,
      completedAt: null,
      statusHistory: [
        {
          id: `sjsh-${Date.now()}-01`,
          serviceJobId: id,
          previousStatus: null,
          newStatus: dto.assignedStaffId ? 'assigned' : 'scheduled',
          changedBy: dto.performedBy,
          changedByName: dto.performedByName,
          timestamp: now,
          note: `Service job created${dto.orderNumber ? ` for order ${dto.orderNumber}` : ''}.`,
        },
      ],
      createdBy: dto.performedBy,
      createdByName: dto.performedByName,
      createdAt: now,
      updatedAt: now,
    };

    const jobs = [newJob, ...(this.memoryJobs || [])];
    this.saveJobs(jobs);
    return newJob;
  }

  public async updateServiceJob(
    id: string,
    updates: Partial<ServiceJobRecord>,
    changedBy: string,
    changedByName?: string,
    note?: string
  ): Promise<ServiceJobRecord> {
    const jobs = this.memoryJobs || [];
    const index = jobs.findIndex((j) => j.id === id);
    if (index === -1) {
      throw new Error(`Service job with id ${id} not found.`);
    }

    const current = jobs[index];
    const now = new Date().toISOString();
    const updated: ServiceJobRecord = {
      ...current,
      ...updates,
      updatedAt: now,
    };

    if (updates.status && updates.status !== current.status) {
      const historyEntry: ServiceJobStatusHistory = {
        id: `sjsh-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        serviceJobId: id,
        previousStatus: current.status,
        newStatus: updates.status,
        changedBy,
        changedByName,
        timestamp: now,
        note: note || `Status transitioned from ${current.status} to ${updates.status}.`,
      };
      updated.statusHistory = [historyEntry, ...(current.statusHistory || [])];
    }

    jobs[index] = updated;
    this.saveJobs(jobs);
    return updated;
  }

  public async updateStatus(
    id: string,
    newStatus: ServiceJobStatus,
    changedBy: string,
    changedByName?: string,
    note?: string
  ): Promise<ServiceJobRecord> {
    const updates: Partial<ServiceJobRecord> = { status: newStatus };
    if (newStatus === 'completed') {
      updates.completedAt = new Date().toISOString();
    }
    return this.updateServiceJob(id, updates, changedBy, changedByName, note);
  }

  public async assignStaff(
    id: string,
    staffId: string,
    staffName: string,
    staffPhone?: string,
    staffRole?: string,
    changedBy: string = 'system',
    changedByName?: string
  ): Promise<ServiceJobRecord> {
    return this.updateServiceJob(
      id,
      {
        assignedStaffId: staffId,
        assignedStaffName: staffName,
        assignedStaffPhone: staffPhone || null,
        assignedStaffRole: staffRole || 'Installation Staff',
        status: 'assigned',
      },
      changedBy,
      changedByName,
      `Assigned to ${staffName} (${staffRole || 'Field Staff'}).`
    );
  }

  public async assignServiceProvider(
    id: string,
    providerId: string,
    providerName: string,
    providerPhone?: string,
    providerType?: string,
    changedBy: string = 'system',
    changedByName?: string,
    note?: string
  ): Promise<ServiceJobRecord> {
    const now = new Date().toISOString();
    return this.updateServiceJob(
      id,
      {
        serviceProviderId: providerId,
        serviceProviderName: providerName,
        serviceProviderPhone: providerPhone || null,
        serviceProviderType: providerType || null,
        serviceProviderAssignedAt: now,
        status: 'assigned',
      },
      changedBy,
      changedByName,
      note || `External service provider assigned: ${providerName} (${providerType || 'Contractor'}).`
    );
  }

  public async unassignServiceProvider(
    id: string,
    changedBy: string = 'system',
    changedByName?: string,
    note?: string
  ): Promise<ServiceJobRecord> {
    const job = await this.getById(id);
    const prevName = job?.serviceProviderName || 'External Contractor';
    return this.updateServiceJob(
      id,
      {
        serviceProviderId: null,
        serviceProviderName: null,
        serviceProviderPhone: null,
        serviceProviderType: null,
        serviceProviderAssignedAt: null,
      },
      changedBy,
      changedByName,
      note || `External service provider unassigned: ${prevName}.`
    );
  }

  public async toggleChecklistItem(
    jobId: string,
    itemId: string,
    isCompleted: boolean,
    completedBy: string,
    completedByName?: string,
    notes?: string
  ): Promise<ServiceJobRecord> {
    const job = await this.getById(jobId);
    if (!job) throw new Error('Service job not found.');

    const now = new Date().toISOString();
    const updatedChecklists = job.checklists.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          isCompleted,
          completedAt: isCompleted ? now : null,
          completedBy: isCompleted ? completedBy : null,
          completedByName: isCompleted ? completedByName : null,
          notes: notes !== undefined ? notes : item.notes,
        };
      }
      return item;
    });

    return this.updateServiceJob(jobId, { checklists: updatedChecklists }, completedBy, completedByName, 'Checklist updated.');
  }

  public async addMeasurement(
    jobId: string,
    measurement: Omit<ServiceMeasurement, 'id' | 'recordedAt'>,
    recordedBy: string,
    recordedByName?: string
  ): Promise<ServiceJobRecord> {
    const job = await this.getById(jobId);
    if (!job) throw new Error('Service job not found.');

    const newMeas: ServiceMeasurement = {
      ...measurement,
      id: `meas-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      recordedAt: new Date().toISOString(),
      recordedBy,
      recordedByName,
    };

    const updatedMeasurements = [...job.measurements, newMeas];
    return this.updateServiceJob(jobId, { measurements: updatedMeasurements }, recordedBy, recordedByName, `Added measurement: ${measurement.label}.`);
  }

  public async deleteMeasurement(jobId: string, measurementId: string): Promise<ServiceJobRecord> {
    const job = await this.getById(jobId);
    if (!job) throw new Error('Service job not found.');

    const updated = job.measurements.filter((m) => m.id !== measurementId);
    return this.updateServiceJob(jobId, { measurements: updated }, 'system', undefined, 'Removed measurement.');
  }

  public async addPhoto(
    jobId: string,
    photo: Omit<ServicePhoto, 'id' | 'takenAt'>,
    takenBy: string,
    takenByName?: string
  ): Promise<ServiceJobRecord> {
    const job = await this.getById(jobId);
    if (!job) throw new Error('Service job not found.');

    const newPhoto: ServicePhoto = {
      ...photo,
      id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      takenAt: new Date().toISOString(),
      takenBy,
      takenByName,
    };

    const updatedPhotos = [newPhoto, ...job.photos];
    return this.updateServiceJob(jobId, { photos: updatedPhotos }, takenBy, takenByName, `Uploaded photo: ${photo.category}.`);
  }

  public async deletePhoto(jobId: string, photoId: string): Promise<ServiceJobRecord> {
    const job = await this.getById(jobId);
    if (!job) throw new Error('Service job not found.');

    const updated = job.photos.filter((p) => p.id !== photoId);
    return this.updateServiceJob(jobId, { photos: updated }, 'system', undefined, 'Removed photo.');
  }

  /**
   * Records material consumption with real inventory deduction to prevent double deduction.
   */
  public async recordMaterialUsage(
    jobId: string,
    usage: Omit<ServiceMaterialUsage, 'id' | 'recordedAt'>,
    recordedBy: string,
    recordedByName?: string
  ): Promise<ServiceJobRecord> {
    const job = await this.getById(jobId);
    if (!job) throw new Error('Service job not found.');

    let stockMovementId: string | null = usage.stockMovementId || null;

    // Deduct stock from inventory repository atomically if not already linked
    if (!stockMovementId && usage.quantityUsed > 0 && usage.sourceLocationId) {
      try {
        const issueResult = await inventoryRepository.executeIssue(
          {
            productId: usage.productId,
            variantId: usage.variantId || null,
            sourceLocationId: usage.sourceLocationId,
            quantity: usage.quantityUsed,
            reason: `Consumed on Service Job ${job.jobReference} (${job.customerName})`,
            notes: usage.notes || `Installed on site ${job.siteAddress}`,
            performedBy: recordedBy,
            performedByName: recordedByName || 'Field Technician',
          },
          {
            productName: usage.productName,
            variantName: usage.variantName || null,
            sku: usage.sku,
            unit: usage.unit,
            locationName: usage.sourceLocationName,
          }
        );
        stockMovementId = issueResult.movement.id;
      } catch (err) {
        console.warn('Inventory deduction note: proceeding with service record even if local balance adjustment had warning:', err);
      }
    }

    const newUsage: ServiceMaterialUsage = {
      ...usage,
      id: `smu-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      stockMovementId,
      recordedAt: new Date().toISOString(),
      recordedBy,
      recordedByName,
    };

    const updatedMaterials = [...job.materialsUsed, newUsage];
    return this.updateServiceJob(
      jobId,
      { materialsUsed: updatedMaterials },
      recordedBy,
      recordedByName,
      `Recorded material usage: ${usage.quantityUsed} ${usage.unit} of ${usage.productName}.`
    );
  }

  public async recordInspection(
    jobId: string,
    inspection: SiteInspectionDetails,
    recordedBy: string,
    recordedByName?: string
  ): Promise<ServiceJobRecord> {
    return this.updateServiceJob(
      jobId,
      {
        inspectionDetails: inspection,
        status: inspection.inspectionResult === 'passed_ready' ? 'preparation' : 'inspection',
      },
      recordedBy,
      recordedByName,
      `Site inspection recorded. Result: ${inspection.inspectionResult}.`
    );
  }

  public async recordPreparation(
    jobId: string,
    preparation: SitePreparationDetails,
    recordedBy: string,
    recordedByName?: string
  ): Promise<ServiceJobRecord> {
    return this.updateServiceJob(
      jobId,
      {
        preparationDetails: preparation,
        status: preparation.isSiteReady ? 'installation' : 'preparation',
      },
      recordedBy,
      recordedByName,
      `Site preparation recorded. Ready: ${preparation.isSiteReady}.`
    );
  }

  public async updateInstallationProgress(
    jobId: string,
    progress: InstallationProgressDetails,
    recordedBy: string,
    recordedByName?: string
  ): Promise<ServiceJobRecord> {
    const job = await this.getById(jobId);
    if (!job) throw new Error('Service job not found.');

    const nextStatus: ServiceJobStatus =
      progress.percentComplete >= 100 ? 'quality_check' : 'installation';

    return this.updateServiceJob(
      jobId,
      {
        installationDetails: progress,
        status: nextStatus,
        customerVisibleNotes: `Installation progress: ${progress.percentComplete}% (${progress.squareMetersInstalled} m² laid).`,
      },
      recordedBy,
      recordedByName,
      `Progress logged: ${progress.percentComplete}% (${progress.squareMetersInstalled} m²).`
    );
  }

  public async recordQualityCheck(
    jobId: string,
    qc: QualityCheckDetails,
    recordedBy: string,
    recordedByName?: string
  ): Promise<ServiceJobRecord> {
    const nextStatus: ServiceJobStatus =
      qc.status === 'passed' ? 'final_cleaning' : 'quality_check';

    return this.updateServiceJob(
      jobId,
      {
        qualityCheckDetails: qc,
        status: nextStatus,
      },
      recordedBy,
      recordedByName,
      `Quality check audit recorded: ${qc.status}.`
    );
  }

  public async recordFinalCleaning(
    jobId: string,
    cleaning: FinalCleaningDetails,
    recordedBy: string,
    recordedByName?: string
  ): Promise<ServiceJobRecord> {
    return this.updateServiceJob(
      jobId,
      {
        finalCleaningDetails: cleaning,
        status: 'customer_confirmation',
      },
      recordedBy,
      recordedByName,
      'Final site cleaning completed.'
    );
  }

  public async recordCustomerSignOff(
    jobId: string,
    signOff: CustomerSignOff,
    recordedBy: string,
    recordedByName?: string
  ): Promise<ServiceJobRecord> {
    return this.updateServiceJob(
      jobId,
      {
        customerSignOff: signOff,
        status: 'completed',
        completedAt: new Date().toISOString(),
        customerVisibleNotes: 'Installation job fully inspected, completed and signed off.',
      },
      recordedBy,
      recordedByName,
      `Customer sign-off completed by ${signOff.signedByCustomerName}.`
    );
  }
}

export const installationRepository = new InstallationRepository();
