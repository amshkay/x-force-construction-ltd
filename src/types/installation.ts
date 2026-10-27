/**
 * Installation & Service Management Domain Types
 * Module 15 — Installation & Service Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Operational system for managing on-site installation, site inspection,
 * wall preparation, quality checks, materials consumption, and customer handover.
 */

export type ServiceType =
  | 'installation'
  | 'site_inspection'
  | 'wall_preparation'
  | 'finishing'
  | 'repair_maintenance'
  | 'other';

export type ServiceJobStatus =
  | 'draft'
  | 'scheduled'
  | 'assigned'
  | 'on_site'
  | 'inspection'
  | 'preparation'
  | 'installation'
  | 'quality_check'
  | 'final_cleaning'
  | 'completed'
  | 'customer_confirmation'
  | 'cancelled';

export type ServicePriority = 'low' | 'normal' | 'high' | 'urgent';

export type ServiceStage =
  | 'inspection'
  | 'preparation'
  | 'installation'
  | 'quality_check'
  | 'final_cleaning'
  | 'completion';

export type SiteAccessibility =
  | 'excellent'
  | 'good'
  | 'moderate'
  | 'difficult'
  | 'restricted'
  | 'requires_4wd';

export type InspectionResult =
  | 'passed_ready'
  | 'preparation_required'
  | 'remediation_needed'
  | 'unsuitable';

export type QualityCheckStatus =
  | 'passed'
  | 'conditional_pass'
  | 'rework_required'
  | 'rejected';

export interface ServiceTypeDefinition {
  type: ServiceType;
  label: string;
  description: string;
  defaultChecklistStages: ServiceStage[];
  requiresInspection: boolean;
  isActive: boolean;
}

export interface ServiceMeasurement {
  id: string;
  label: string;
  lengthM?: number | null;
  heightM?: number | null;
  areaSqM?: number | null;
  perimeterM?: number | null;
  unit: string;
  stage: ServiceStage;
  notes?: string | null;
  recordedAt: string;
  recordedBy?: string | null;
  recordedByName?: string | null;
}

export interface ServicePhoto {
  id: string;
  url: string;
  category:
    | 'before'
    | 'during'
    | 'after'
    | 'inspection'
    | 'preparation'
    | 'quality_check'
    | 'completion'
    | 'other';
  caption?: string | null;
  takenAt: string;
  takenBy?: string | null;
  takenByName?: string | null;
  isCustomerVisible: boolean;
}

export interface ServiceMaterialUsage {
  id: string;
  serviceJobId: string;
  productId: string;
  variantId?: string | null;
  productName: string;
  variantName?: string | null;
  sku: string;
  unit: string;
  quantityUsed: number;
  sourceLocationId: string;
  sourceLocationName: string;
  stockMovementId?: string | null;
  notes?: string | null;
  recordedBy?: string | null;
  recordedByName?: string | null;
  recordedAt: string;
}

export interface ChecklistItem {
  id: string;
  stage: ServiceStage;
  title: string;
  description?: string | null;
  isCompleted: boolean;
  completedAt?: string | null;
  completedBy?: string | null;
  completedByName?: string | null;
  notes?: string | null;
  isMandatory: boolean;
}

export interface SiteInspectionDetails {
  inspectedAt?: string | null;
  inspectorId?: string | null;
  inspectorName?: string | null;
  accessibility: SiteAccessibility;
  soilCondition?: string | null;
  foundationReady: boolean;
  wallSurfaceReady: boolean;
  waterElectricityAvailable: boolean;
  preparationRequirements: string[];
  recommendedAction: string;
  inspectionResult: InspectionResult;
  inspectorNotes?: string | null;
}

export interface SitePreparationDetails {
  isSiteReady: boolean;
  wallPrepRequired: boolean;
  cleaningCompleted: boolean;
  surfacePrepCompleted: boolean;
  obstaclesIdentified?: string | null;
  preparedBy?: string | null;
  preparedByName?: string | null;
  preparedAt?: string | null;
  notes?: string | null;
}

export interface InstallationProgressDetails {
  startedAt?: string | null;
  percentComplete: number;
  squareMetersInstalled: number;
  unitsOrBricksLaid: number;
  currentSectionNotes?: string | null;
  lastProgressUpdate?: string | null;
  leadMasonName?: string | null;
}

export interface QualityCheckDetails {
  status: QualityCheckStatus;
  alignmentChecked: boolean;
  jointInterlockVerified: boolean;
  plumbAndLevelVerified: boolean;
  structuralBondVerified: boolean;
  defectsIdentified?: string | null;
  correctiveAction?: string | null;
  checkedBy?: string | null;
  checkedByName?: string | null;
  checkedAt?: string | null;
  inspectorNotes?: string | null;
}

export interface FinalCleaningDetails {
  debrisRemoved: boolean;
  efflorescenceCleaned: boolean;
  surfaceWashedOrBrushed: boolean;
  remainingIssues?: string | null;
  cleanedBy?: string | null;
  cleanedByName?: string | null;
  cleanedAt?: string | null;
  notes?: string | null;
}

export interface CustomerSignOff {
  signedByCustomerName: string;
  customerPhone?: string | null;
  satisfactionRating?: number | null; // 1 to 5
  signOffNotes?: string | null;
  signatureDataUrl?: string | null;
  signedAt: string;
  verifiedByStaffId?: string | null;
  verifiedByStaffName?: string | null;
}

export interface ServiceJobStatusHistory {
  id: string;
  serviceJobId: string;
  previousStatus: ServiceJobStatus | null;
  newStatus: ServiceJobStatus;
  changedBy: string;
  changedByName?: string | null;
  timestamp: string;
  note?: string | null;
}

export interface ServiceJobRecord {
  id: string;
  jobReference: string; // e.g. SRV-2026-0001
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  companyName?: string | null;

  requestId?: string | null;
  requestNumber?: string | null;
  quotationId?: string | null;
  quotationNumber?: string | null;
  orderId?: string | null;
  orderNumber?: string | null;
  fulfilmentId?: string | null;
  fulfilmentNumber?: string | null;

  serviceType: ServiceType;
  serviceTypeLabel: string;
  status: ServiceJobStatus;
  priority: ServicePriority;

  // Site Location
  siteAddress: string;
  siteCity?: string | null;
  siteState?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  locationNotes?: string | null;

  // Scheduling
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  estimatedDurationHours?: number | null;

  // Staff Assignment
  assignedStaffId?: string | null;
  assignedStaffName?: string | null;
  assignedStaffPhone?: string | null;
  assignedStaffRole?: string | null;
  teamMembers?: { id: string; name: string; role: string; phone?: string }[];

  // External Service Provider Assignment (Module 16)
  serviceProviderId?: string | null;
  serviceProviderName?: string | null;
  serviceProviderPhone?: string | null;
  serviceProviderType?: string | null;
  serviceProviderAssignedAt?: string | null;

  // Notes
  internalNotes?: string | null;
  customerVisibleNotes?: string | null;

  // Workflows
  checklists: ChecklistItem[];
  measurements: ServiceMeasurement[];
  photos: ServicePhoto[];
  materialsUsed: ServiceMaterialUsage[];

  // Stage Details
  inspectionDetails?: SiteInspectionDetails | null;
  preparationDetails?: SitePreparationDetails | null;
  installationDetails?: InstallationProgressDetails | null;
  qualityCheckDetails?: QualityCheckDetails | null;
  finalCleaningDetails?: FinalCleaningDetails | null;
  customerSignOff?: CustomerSignOff | null;

  completedAt?: string | null;
  statusHistory: ServiceJobStatusHistory[];

  createdBy?: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceJobFilters {
  searchTerm?: string;
  status?: ServiceJobStatus | 'all';
  serviceType?: ServiceType | 'all';
  assignedStaffId?: string | 'all';
  priority?: ServicePriority | 'all';
  dateRange?: { start?: string; end?: string };
}

export interface CreateServiceJobDTO {
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  companyName?: string | null;
  requestId?: string | null;
  requestNumber?: string | null;
  quotationId?: string | null;
  quotationNumber?: string | null;
  orderId?: string | null;
  orderNumber?: string | null;
  fulfilmentId?: string | null;
  fulfilmentNumber?: string | null;
  serviceType: ServiceType;
  priority: ServicePriority;
  siteAddress: string;
  siteCity?: string | null;
  siteState?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  locationNotes?: string | null;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  estimatedDurationHours?: number | null;
  assignedStaffId?: string | null;
  assignedStaffName?: string | null;
  assignedStaffPhone?: string | null;
  assignedStaffRole?: string | null;
  serviceProviderId?: string | null;
  serviceProviderName?: string | null;
  serviceProviderPhone?: string | null;
  serviceProviderType?: string | null;
  internalNotes?: string | null;
  customerVisibleNotes?: string | null;
  performedBy: string;
  performedByName?: string;
}
