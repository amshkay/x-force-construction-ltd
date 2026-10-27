import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Wrench,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  User,
  Users,
  Camera,
  Layers,
  Ruler,
  ShieldCheck,
  Sparkles,
  FileText,
  Printer,
  ChevronRight,
  Plus,
  Trash2,
  ExternalLink,
  Info,
  Building,
  Phone,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  Star,
  Compass,
  Briefcase,
  MessageCircle,
} from 'lucide-react';
import {
  ServiceJobRecord,
  ServiceJobStatus,
  ServiceStage,
  ServiceMeasurement,
  ServicePhoto,
  ServiceMaterialUsage,
  SiteInspectionDetails,
  SitePreparationDetails,
  InstallationProgressDetails,
  QualityCheckDetails,
  FinalCleaningDetails,
  CustomerSignOff,
} from '../../types/installation';
import { ServiceProvider } from '../../types/serviceProvider';
import { StockLocation, InventoryItem } from '../../types/inventory';
import { stockLocationRepository } from '../../repositories/stockLocation.repository';
import { inventoryService } from '../../services/inventory.service';
import { installationService } from '../../services/installation.service';
import { serviceProviderService } from '../../services/serviceProvider.service';
import { mediaService } from '../../services/media.service';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../hooks/useAuth';

interface ServiceJobDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceJobId: string;
  onJobUpdated: (updated: ServiceJobRecord) => void;
  onOpenPrintModal: (job: ServiceJobRecord) => void;
}

type TabType =
  | 'overview'
  | 'checklists'
  | 'inspection_measurements'
  | 'installation_materials'
  | 'quality_cleaning'
  | 'photos'
  | 'signoff'
  | 'history';

const STATUS_PIPELINE: { status: ServiceJobStatus; label: string }[] = [
  { status: 'scheduled', label: 'Scheduled' },
  { status: 'assigned', label: 'Assigned' },
  { status: 'on_site', label: 'On Site' },
  { status: 'inspection', label: 'Inspection' },
  { status: 'preparation', label: 'Preparation' },
  { status: 'installation', label: 'Installation' },
  { status: 'quality_check', label: 'Quality Check' },
  { status: 'final_cleaning', label: 'Cleaning' },
  { status: 'completed', label: 'Completed' },
];

export const ServiceJobDetailModal: React.FC<ServiceJobDetailModalProps> = ({
  isOpen,
  onClose,
  serviceJobId,
  onJobUpdated,
  onOpenPrintModal,
}) => {
  const toast = useToast();
  const { profile, can, isAdministrator } = useAuth();

  const [job, setJob] = useState<ServiceJobRecord | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);

  // Locations and stock inventory items for material usage recording
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  // Modals / sub-dialogs inside tabs
  const [showAddMeasurement, setShowAddMeasurement] = useState(false);
  const [newMeasLabel, setNewMeasLabel] = useState('');
  const [newMeasLength, setNewMeasLength] = useState<string>('');
  const [newMeasHeight, setNewMeasHeight] = useState<string>('');
  const [newMeasArea, setNewMeasArea] = useState<string>('');
  const [newMeasUnit, setNewMeasUnit] = useState<string>('m²');
  const [newMeasStage, setNewMeasStage] = useState<ServiceStage>('inspection');
  const [newMeasNotes, setNewMeasNotes] = useState('');

  // Material usage form
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [selectedBalanceId, setSelectedBalanceId] = useState('');
  const [materialQtyUsed, setMaterialQtyUsed] = useState<string>('');
  const [materialNotes, setMaterialNotes] = useState('');

  // Progress update form
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressSqMeters, setProgressSqMeters] = useState<string>('');
  const [progressUnitsLaid, setProgressUnitsLaid] = useState<string>('');
  const [progressNotes, setProgressNotes] = useState('');

  // Quality check form
  const [qcStatus, setQcStatus] = useState<'passed' | 'conditional_pass' | 'rework_required' | 'rejected'>('passed');
  const [qcAlignment, setQcAlignment] = useState(true);
  const [qcInterlock, setQcInterlock] = useState(true);
  const [qcPlumb, setQcPlumb] = useState(true);
  const [qcBond, setQcBond] = useState(true);
  const [qcDefects, setQcDefects] = useState('');
  const [qcCorrective, setQcCorrective] = useState('');

  // Final cleaning form
  const [cleanDebris, setCleanDebris] = useState(true);
  const [cleanEfflorescence, setCleanEfflorescence] = useState(true);
  const [cleanWashed, setCleanWashed] = useState(true);
  const [cleanIssues, setCleanIssues] = useState('');

  // Sign off form
  const [signOffName, setSignOffName] = useState('');
  const [signOffPhone, setSignOffPhone] = useState('');
  const [signOffRating, setSignOffRating] = useState<number>(5);
  const [signOffNotes, setSignOffNotes] = useState('');

  // Photo upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoCategory, setPhotoCategory] = useState<
    'before' | 'during' | 'after' | 'inspection' | 'preparation' | 'quality_check' | 'completion' | 'other'
  >('during');
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoCustomerVisible, setPhotoCustomerVisible] = useState(true);
  const [onlinePhotoUrl, setOnlinePhotoUrl] = useState('');

  // Status override select
  const [targetStatus, setTargetStatus] = useState<ServiceJobStatus>('installation');
  const [statusChangeNote, setStatusChangeNote] = useState('');

  // Service Provider Assignment State (Module 16)
  const [showAssignProviderModal, setShowAssignProviderModal] = useState(false);
  const [activeProviders, setActiveProviders] = useState<ServiceProvider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [providerNote, setProviderNote] = useState('');
  const [isAssigningProvider, setIsAssigningProvider] = useState(false);

  const loadJobData = async () => {
    if (!serviceJobId) return;
    setLoading(true);
    try {
      const data = await installationService.getServiceJobById(serviceJobId);
      if (data) {
        setJob(data);
        setTargetStatus(data.status);
        if (data.installationDetails) {
          setProgressPercent(data.installationDetails.percentComplete);
          setProgressSqMeters(String(data.installationDetails.squareMetersInstalled || ''));
          setProgressUnitsLaid(String(data.installationDetails.unitsOrBricksLaid || ''));
          setProgressNotes(data.installationDetails.currentSectionNotes || '');
        }
        if (data.customerSignOff) {
          setSignOffName(data.customerSignOff.signedByCustomerName);
          setSignOffPhone(data.customerSignOff.customerPhone || '');
          setSignOffRating(data.customerSignOff.satisfactionRating || 5);
          setSignOffNotes(data.customerSignOff.signOffNotes || '');
        } else {
          setSignOffName(data.customerName);
          setSignOffPhone(data.customerPhone);
        }
      }
    } catch (err) {
      console.error('Failed to load service job:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadJobData();

      // Load stock locations and inventory items
      const loadInventory = async () => {
        try {
          const locs = await stockLocationRepository.getAllLocations();
          setLocations(locs.filter((l) => l.isActive));
          const items = await inventoryService.getInventoryItems();
          setInventoryItems(items);
        } catch (err) {
          console.warn('Inventory loading note:', err);
        }
      };
      loadInventory();

      // Load active service providers for external assignment
      const loadActiveProviders = async () => {
        try {
          const list = await serviceProviderService.getActiveProviders();
          setActiveProviders(list);
          if (list.length > 0) {
            setSelectedProviderId(list[0].id);
          }
        } catch (err) {
          console.warn('Service provider loading note:', err);
        }
      };
      loadActiveProviders();
    }
  }, [isOpen, serviceJobId]);

  if (!isOpen || !job) return null;

  const currentStepIndex = STATUS_PIPELINE.findIndex((p) => p.status === job.status);

  // Handlers
  const handleStatusChange = async () => {
    if (!targetStatus || targetStatus === job.status) return;
    try {
      const updated = await installationService.updateJobStatus(
        job.id,
        targetStatus,
        profile?.id || 'dev-admin-uid-0001',
        profile?.full_name || 'Administrator',
        statusChangeNote || `Status changed to ${targetStatus}`
      );
      setJob(updated);
      onJobUpdated(updated);
      setStatusChangeNote('');
      toast.success(`Service Job status updated to ${targetStatus}.`, 'Status Updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status.', 'Error');
    }
  };

  const handleAssignProviderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProviderId) {
      toast.error('Please select an active external service provider.', 'Validation Error');
      return;
    }
    setIsAssigningProvider(true);
    try {
      const updated = await serviceProviderService.assignProviderToJob(
        job.id,
        selectedProviderId,
        profile?.id || 'dev-admin-uid-0001',
        profile?.full_name || 'Administrator',
        providerNote.trim() || undefined
      );
      setJob(updated);
      onJobUpdated(updated);
      setShowAssignProviderModal(false);
      setProviderNote('');
      toast.success(
        `External provider ${updated.serviceProviderName} assigned to job.`,
        'Provider Assigned'
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign provider.', 'Error');
    } finally {
      setIsAssigningProvider(false);
    }
  };

  const handleUnassignProvider = async () => {
    if (!window.confirm('Are you sure you want to unassign the external service provider from this job?')) {
      return;
    }
    try {
      const updated = await serviceProviderService.unassignProviderFromJob(
        job.id,
        profile?.id || 'dev-admin-uid-0001',
        profile?.full_name || 'Administrator',
        'External contractor unassigned by administrator.'
      );
      setJob(updated);
      onJobUpdated(updated);
      toast.info('External contractor removed from this job.', 'Provider Unassigned');
    } catch (err: any) {
      toast.error(err.message || 'Failed to unassign provider.', 'Error');
    }
  };

  const handleToggleChecklist = async (itemId: string, currentVal: boolean) => {
    try {
      const updated = await installationService.toggleChecklistItem(
        job.id,
        itemId,
        !currentVal,
        profile?.id || 'dev-inst-uid-0004',
        profile?.full_name || 'Staff'
      );
      setJob(updated);
      onJobUpdated(updated);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update checklist item.', 'Error');
    }
  };

  const handleAddMeasurementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeasLabel.trim()) {
      toast.error('Measurement label is required.', 'Missing Field');
      return;
    }
    const len = parseFloat(newMeasLength) || undefined;
    const hgt = parseFloat(newMeasHeight) || undefined;
    const area = parseFloat(newMeasArea) || (len && hgt ? Math.round(len * hgt * 100) / 100 : undefined);

    try {
      const updated = await installationService.addMeasurement(
        job.id,
        {
          label: newMeasLabel.trim(),
          lengthM: len,
          heightM: hgt,
          areaSqM: area,
          unit: newMeasUnit,
          stage: newMeasStage,
          notes: newMeasNotes.trim() || undefined,
        },
        profile?.id || 'dev-inst-uid-0004',
        profile?.full_name || 'Staff'
      );
      setJob(updated);
      onJobUpdated(updated);
      setShowAddMeasurement(false);
      setNewMeasLabel('');
      setNewMeasLength('');
      setNewMeasHeight('');
      setNewMeasArea('');
      setNewMeasNotes('');
      toast.success('Service measurement recorded.', 'Measurement Saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save measurement.', 'Error');
    }
  };

  const handleDeleteMeasurement = async (measId: string) => {
    try {
      const updated = await installationService.deleteMeasurement(job.id, measId);
      setJob(updated);
      onJobUpdated(updated);
      toast.info('Measurement removed.', 'Updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete measurement.', 'Error');
    }
  };

  const handleAddMaterialUsageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(materialQtyUsed);
    if (!selectedBalanceId || isNaN(qty) || qty <= 0) {
      toast.error('Please select an inventory item and enter a valid quantity.', 'Validation Error');
      return;
    }

    const item = inventoryItems.find((b) => b.id === selectedBalanceId);
    if (!item) return;

    try {
      const updated = await installationService.recordMaterialUsage(
        job.id,
        {
          serviceJobId: job.id,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          variantName: item.variantName,
          sku: item.sku,
          unit: item.unit,
          quantityUsed: qty,
          sourceLocationId: item.locationId,
          sourceLocationName: item.locationName,
          notes: materialNotes.trim() || undefined,
        },
        profile?.id || 'dev-inst-uid-0004',
        profile?.full_name || 'Sunday Nwosu'
      );
      setJob(updated);
      onJobUpdated(updated);
      setShowAddMaterial(false);
      setSelectedBalanceId('');
      setMaterialQtyUsed('');
      setMaterialNotes('');
      toast.success(`Recorded ${qty} ${item.unit} consumed from ${item.locationName}.`, 'Material Recorded');
    } catch (err: any) {
      toast.error(err.message || 'Failed to record material usage.', 'Error');
    }
  };

  const handleUpdateProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await installationService.updateInstallationProgress(
        job.id,
        {
          startedAt: job.installationDetails?.startedAt || new Date().toISOString(),
          percentComplete: progressPercent,
          squareMetersInstalled: parseFloat(progressSqMeters) || 0,
          unitsOrBricksLaid: parseInt(progressUnitsLaid) || 0,
          currentSectionNotes: progressNotes.trim() || undefined,
          lastProgressUpdate: new Date().toISOString(),
          leadMasonName: job.assignedStaffName || 'Sunday Nwosu',
        },
        profile?.id || 'dev-inst-uid-0004',
        profile?.full_name || 'Sunday Nwosu'
      );
      setJob(updated);
      onJobUpdated(updated);
      toast.success(`Installation progress updated to ${progressPercent}%.`, 'Progress Updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update progress.', 'Error');
    }
  };

  const handleQualityCheckSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await installationService.recordQualityCheck(
        job.id,
        {
          status: qcStatus,
          alignmentChecked: qcAlignment,
          jointInterlockVerified: qcInterlock,
          plumbAndLevelVerified: qcPlumb,
          structuralBondVerified: qcBond,
          defectsIdentified: qcDefects.trim() || undefined,
          correctiveAction: qcCorrective.trim() || undefined,
          checkedBy: profile?.id || 'dev-inst-uid-0004',
          checkedByName: profile?.full_name || 'Sunday Nwosu',
          checkedAt: new Date().toISOString(),
        },
        profile?.id || 'dev-inst-uid-0004',
        profile?.full_name || 'Sunday Nwosu'
      );
      setJob(updated);
      onJobUpdated(updated);
      toast.success(`Quality Check audit saved (${qcStatus}).`, 'Quality Audit Complete');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save quality check.', 'Error');
    }
  };

  const handleFinalCleaningSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await installationService.recordFinalCleaning(
        job.id,
        {
          debrisRemoved: cleanDebris,
          efflorescenceCleaned: cleanEfflorescence,
          surfaceWashedOrBrushed: cleanWashed,
          remainingIssues: cleanIssues.trim() || undefined,
          cleanedBy: profile?.id || 'dev-inst-uid-0004',
          cleanedByName: profile?.full_name || 'Sunday Nwosu',
          cleanedAt: new Date().toISOString(),
        },
        profile?.id || 'dev-inst-uid-0004',
        profile?.full_name || 'Sunday Nwosu'
      );
      setJob(updated);
      onJobUpdated(updated);
      toast.success('Final site cleaning recorded. Ready for customer handover.', 'Cleaning Logged');
    } catch (err: any) {
      toast.error(err.message || 'Failed to record cleaning.', 'Error');
    }
  };

  const handleCustomerSignOffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signOffName.trim()) {
      toast.error('Sign-off representative name is required.', 'Missing Name');
      return;
    }
    try {
      const updated = await installationService.recordCustomerSignOff(
        job.id,
        {
          signedByCustomerName: signOffName.trim(),
          customerPhone: signOffPhone.trim() || undefined,
          satisfactionRating: signOffRating,
          signOffNotes: signOffNotes.trim() || undefined,
          signedAt: new Date().toISOString(),
          verifiedByStaffId: profile?.id || 'dev-inst-uid-0004',
          verifiedByStaffName: profile?.full_name || 'Sunday Nwosu',
        },
        profile?.id || 'dev-inst-uid-0004',
        profile?.full_name || 'Sunday Nwosu'
      );
      setJob(updated);
      onJobUpdated(updated);
      toast.success(
        `Job ${job.jobReference} successfully completed and signed off with 5-star customer acknowledgement!`,
        'Job Completed'
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to record sign-off.', 'Error');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uploaded = await mediaService.uploadMedia(
        file,
        `service-jobs/${job.id}/${Date.now()}_${cleanName}`,
        {
          bucket: 'project-media',
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
        }
      );

      const updated = await installationService.addPhoto(
        job.id,
        {
          url: uploaded.url,
          category: photoCategory,
          caption: photoCaption.trim() || undefined,
          isCustomerVisible: photoCustomerVisible,
        },
        profile?.id || 'dev-inst-uid-0004',
        profile?.full_name || 'Sunday Nwosu'
      );
      setJob(updated);
      onJobUpdated(updated);
      setPhotoCaption('');
      toast.success('Site photograph added to service record.', 'Photo Uploaded');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload photo.', 'Error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddPhotoUrl = async () => {
    const trimmed = onlinePhotoUrl.trim();
    if (!trimmed || !job) return;
    try {
      const updated = await installationService.addPhoto(
        job.id,
        {
          url: trimmed,
          category: photoCategory,
          caption: photoCaption.trim() || undefined,
          isCustomerVisible: photoCustomerVisible,
        },
        profile?.id || 'dev-inst-uid-0004',
        profile?.full_name || 'Sunday Nwosu'
      );
      setJob(updated);
      onJobUpdated(updated);
      setPhotoCaption('');
      setOnlinePhotoUrl('');
      toast.success('Online photograph added to service record.', 'Photo Linked');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add photo URL.', 'Error');
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      const updated = await installationService.deletePhoto(job.id, photoId);
      setJob(updated);
      onJobUpdated(updated);
      toast.info('Photo removed from record.', 'Updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete photo.', 'Error');
    }
  };

  const completedChecklistCount = job.checklists.filter((c) => c.isCompleted).length;
  const checklistPercent =
    job.checklists.length > 0
      ? Math.round((completedChecklistCount / job.checklists.length) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-8 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
              <Wrench className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-base font-extrabold text-slate-900 dark:text-white">
                  {job.jobReference}
                </span>
                <Badge
                  variant={
                    job.status === 'completed'
                      ? 'success'
                      : job.status === 'installation' || job.status === 'quality_check'
                      ? 'warning'
                      : job.status === 'cancelled'
                      ? 'danger'
                      : 'info'
                  }
                  size="sm"
                >
                  {job.status.replace(/_/g, ' ').toUpperCase()}
                </Badge>
                <Badge
                  variant={
                    job.priority === 'urgent'
                      ? 'danger'
                      : job.priority === 'high'
                      ? 'warning'
                      : 'default'
                  }
                  size="sm"
                >
                  {job.priority.toUpperCase()} PRIORITY
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {job.serviceTypeLabel} • {job.customerName}{' '}
                {job.companyName ? `(${job.companyName})` : ''} • Site: {job.siteAddress}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Printer className="h-4 w-4" />}
              onClick={() => onOpenPrintModal(job)}
            >
              Print Work Order
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Status Pipeline Progress Indicator */}
        <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-3 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {STATUS_PIPELINE.map((step, idx) => {
              const isPast = currentStepIndex > idx;
              const isCurrent = currentStepIndex === idx;
              return (
                <React.Fragment key={step.status}>
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition ${
                        isPast
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-orange-600 text-white ring-2 ring-orange-200 dark:ring-orange-900'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                      }`}
                    >
                      {isPast ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                    </div>
                    <span
                      className={`text-xs ${
                        isCurrent
                          ? 'font-bold text-orange-600 dark:text-orange-400'
                          : isPast
                          ? 'font-medium text-slate-700 dark:text-slate-300'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < STATUS_PIPELINE.length - 1 && (
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview & Schedule', icon: Info },
            {
              id: 'checklists',
              label: `Checklist (${completedChecklistCount}/${job.checklists.length})`,
              icon: CheckSquare,
            },
            {
              id: 'inspection_measurements',
              label: `Inspection & Measurements (${job.measurements.length})`,
              icon: Ruler,
            },
            {
              id: 'installation_materials',
              label: `Progress & Materials (${job.materialsUsed.length})`,
              icon: Layers,
            },
            { id: 'quality_cleaning', label: 'QC & Final Cleaning', icon: ShieldCheck },
            { id: 'photos', label: `Photos (${job.photos.length})`, icon: Camera },
            {
              id: 'signoff',
              label: job.customerSignOff ? 'Sign-Off (Verified)' : 'Client Sign-Off',
              icon: Star,
            },
            { id: 'history', label: 'Audit History', icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 border-b-2 py-3 px-3.5 text-xs font-semibold whitespace-nowrap transition ${
                  isActive
                    ? 'border-orange-600 text-orange-600 dark:border-orange-500 dark:text-orange-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: OVERVIEW & SCHEDULE */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Customer & Location */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-orange-600" />
                    Customer & Site
                  </h4>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {job.customerName}
                  </div>
                  {job.companyName && (
                    <div className="text-xs text-slate-500">{job.companyName}</div>
                  )}
                  <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 pt-1">
                    <Phone className="h-3 w-3 text-slate-400" />
                    <a href={`tel:${job.customerPhone}`} className="hover:underline">
                      {job.customerPhone}
                    </a>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5 pt-1">
                    <MapPin className="h-3 w-3 text-emerald-600 mt-0.5 shrink-0" />
                    <span>
                      {job.siteAddress}
                      {job.siteCity ? `, ${job.siteCity}` : ''}
                      {job.siteState ? `, ${job.siteState}` : ''}
                    </span>
                  </div>
                  {job.gpsLatitude && job.gpsLongitude && (
                    <div className="pt-2">
                      <a
                        href={`https://www.google.com/maps?q=${job.gpsLatitude},${job.gpsLongitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:underline"
                      >
                        <Compass className="h-3 w-3" />
                        Open GPS in Google Maps ({job.gpsLatitude}, {job.gpsLongitude})
                      </a>
                    </div>
                  )}
                </div>

                {/* Schedule & Internal Staff */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-orange-600" />
                    Internal Staff (Mod 15)
                  </h4>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500">Scheduled Date:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {job.scheduledDate || 'Not scheduled'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Time:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {job.scheduledTime || '08:30 AM'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Est. Duration:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {job.estimatedDurationHours || 8} hours
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
                    <div className="text-xs text-slate-500 mb-0.5">Assigned Lead Mason:</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {job.assignedStaffName || 'Unassigned'}
                    </div>
                    {job.assignedStaffPhone && (
                      <div className="text-[11px] text-slate-500">{job.assignedStaffPhone}</div>
                    )}
                  </div>
                </div>

                {/* External Service Provider (Module 16) */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-2 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-orange-600" />
                        External Provider (Mod 16)
                      </h4>
                      {job.serviceProviderId && (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          PARTNER
                        </span>
                      )}
                    </div>

                    {job.serviceProviderId ? (
                      <div className="space-y-1.5 pt-1">
                        <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          {job.serviceProviderName}
                        </div>
                        <div className="text-[11px] text-orange-600 dark:text-orange-400 font-medium">
                          {job.serviceProviderType || 'External Contractor'}
                        </div>
                        {job.serviceProviderPhone && (
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between pt-1">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-slate-400" />
                              <a href={`tel:${job.serviceProviderPhone}`} className="hover:underline">
                                {job.serviceProviderPhone}
                              </a>
                            </span>
                            <a
                              href={`https://wa.me/${job.serviceProviderPhone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:underline flex items-center gap-0.5 text-[10px] font-semibold"
                            >
                              <MessageCircle className="h-3 w-3" />
                              WhatsApp
                            </a>
                          </div>
                        )}
                        {job.serviceProviderAssignedAt && (
                          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700/60">
                            Assigned on {new Date(job.serviceProviderAssignedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-2 text-center text-xs text-slate-400 space-y-1">
                        <p className="font-medium text-slate-500">No external contractor</p>
                        <p className="text-[11px] text-slate-400">Handled by internal installation staff.</p>
                      </div>
                    )}
                  </div>

                  {/* Actions for Manager / Admin */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAssignProviderModal(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400"
                    >
                      <Briefcase className="h-3 w-3" />
                      {job.serviceProviderId ? 'Change Provider' : '+ Assign Provider'}
                    </button>
                    {job.serviceProviderId && (
                      <button
                        type="button"
                        onClick={handleUnassignProvider}
                        className="text-[11px] text-rose-500 hover:text-rose-700 ml-auto font-medium"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Linked Order & Status Quick Action */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-orange-600" />
                    Commercial Reference
                  </h4>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500">Sales Order:</span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      {job.orderNumber || 'Independent Job'}
                    </span>
                  </div>
                  {job.quotationNumber && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Quotation:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {job.quotationNumber}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Service Type:</span>
                    <span className="font-medium text-orange-600 dark:text-orange-400">
                      {job.serviceTypeLabel}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
                    <div className="text-xs text-slate-500 mb-1">Checklist Progress:</div>
                    <div className="w-full bg-slate-200 rounded-full h-2 dark:bg-slate-700">
                      <div
                        className="bg-orange-600 h-2 rounded-full transition-all"
                        style={{ width: `${checklistPercent}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 text-right mt-1">
                      {checklistPercent}% Complete ({completedChecklistCount}/{job.checklists.length})
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Override Panel for Managers & Admins */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-orange-600" />
                  Supervisor Workflow Stage & Status Override
                </h4>
                <p className="text-xs text-slate-500">
                  Advance the service job through on-site milestones or adjust state if conditions change.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value as ServiceJobStatus)}
                    className="w-full sm:w-64 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="assigned">Assigned</option>
                    <option value="on_site">On Site</option>
                    <option value="inspection">Inspection</option>
                    <option value="preparation">Preparation</option>
                    <option value="installation">Installation</option>
                    <option value="quality_check">Quality Check</option>
                    <option value="final_cleaning">Final Cleaning</option>
                    <option value="customer_confirmation">Customer Confirmation</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  <input
                    type="text"
                    value={statusChangeNote}
                    onChange={(e) => setStatusChangeNote(e.target.value)}
                    placeholder="Optional supervisor transition note..."
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleStatusChange}
                    disabled={targetStatus === job.status}
                  >
                    Update Stage
                  </Button>
                </div>
              </div>

              {/* Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Internal Operational Notes:
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-400">
                    {job.internalNotes || 'No internal notes provided.'}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Customer-Visible Status Notice:
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-400">
                    {job.customerVisibleNotes || 'Standard status updates visible.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CHECKLISTS */}
          {activeTab === 'checklists' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Field Service Protocol Checklist
                  </h3>
                  <p className="text-xs text-slate-500">
                    Laying crew and supervisor tasks across arrival, prep, installation, quality check, and handover.
                  </p>
                </div>
                <Badge variant={checklistPercent === 100 ? 'success' : 'info'} size="md">
                  {checklistPercent}% Complete
                </Badge>
              </div>

              <div className="space-y-2">
                {job.checklists.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleChecklist(item.id, item.isCompleted)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer select-none ${
                      item.isCompleted
                        ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-950 dark:bg-emerald-950/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                    }`}
                  >
                    <div className="pt-0.5">
                      {item.isCompleted ? (
                        <CheckSquare className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Square className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold ${
                            item.isCompleted
                              ? 'line-through text-slate-500 dark:text-slate-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {item.title}
                        </span>
                        <span className="text-[10px] font-mono uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">
                          {item.stage}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                      )}
                      {item.completedAt && (
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
                          Completed on {new Date(item.completedAt).toLocaleString()} by {item.completedByName || 'Technician'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: INSPECTION & MEASUREMENTS */}
          {activeTab === 'inspection_measurements' && (
            <div className="space-y-6">
              {/* Site Inspection Overview */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Compass className="h-4 w-4 text-emerald-600" />
                    Site Inspection Survey Status
                  </h4>
                  {job.inspectionDetails?.inspectionResult && (
                    <Badge
                      variant={
                        job.inspectionDetails.inspectionResult === 'passed_ready'
                          ? 'success'
                          : 'warning'
                      }
                      size="sm"
                    >
                      {job.inspectionDetails.inspectionResult.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  )}
                </div>

                {job.inspectionDetails ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                    <div>
                      <span className="text-slate-500">Accessibility:</span>
                      <div className="font-semibold capitalize text-slate-900 dark:text-white">
                        {job.inspectionDetails.accessibility}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Foundation Ready:</span>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {job.inspectionDetails.foundationReady ? '✓ Ready' : '✗ Needs Work'}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Water / Electricity:</span>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {job.inspectionDetails.waterElectricityAvailable ? '✓ Available' : '✗ Unavailable'}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Inspector:</span>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {job.inspectionDetails.inspectorName || 'Sunday Nwosu'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">
                    No preliminary site survey recorded yet. Field technicians can record measurements below.
                  </div>
                )}
              </div>

              {/* Service Measurements Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Ruler className="h-4 w-4 text-orange-600" />
                      Recorded On-Site Measurements
                    </h4>
                    <p className="text-xs text-slate-500">
                      Wall lengths, heights, surface area calculations, and boundary runs.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={() => setShowAddMeasurement(!showAddMeasurement)}
                  >
                    Add Measurement
                  </Button>
                </div>

                {/* Add Measurement Sub-form */}
                {showAddMeasurement && (
                  <form
                    onSubmit={handleAddMeasurementSubmit}
                    className="p-4 rounded-xl border border-orange-200 bg-orange-50/50 dark:border-orange-900/60 dark:bg-orange-950/20 space-y-3"
                  >
                    <div className="font-bold text-xs text-orange-700 dark:text-orange-400">
                      New Site Dimension
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Label / Location *
                        </label>
                        <input
                          type="text"
                          required
                          value={newMeasLabel}
                          onChange={(e) => setNewMeasLabel(e.target.value)}
                          placeholder="e.g. East Perimeter Wall"
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Length (m)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={newMeasLength}
                          onChange={(e) => {
                            setNewMeasLength(e.target.value);
                            const l = parseFloat(e.target.value);
                            const h = parseFloat(newMeasHeight);
                            if (l && h) setNewMeasArea((l * h).toFixed(2));
                          }}
                          placeholder="32.5"
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Height (m)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={newMeasHeight}
                          onChange={(e) => {
                            setNewMeasHeight(e.target.value);
                            const l = parseFloat(newMeasLength);
                            const h = parseFloat(e.target.value);
                            if (l && h) setNewMeasArea((l * h).toFixed(2));
                          }}
                          placeholder="2.4"
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Area (m²)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={newMeasArea}
                          onChange={(e) => setNewMeasArea(e.target.value)}
                          placeholder="78.0"
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddMeasurement(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" variant="primary" size="sm">
                        Save Dimension
                      </Button>
                    </div>
                  </form>
                )}

                {/* Measurements Table */}
                {job.measurements.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] dark:bg-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Location / Section</th>
                          <th className="py-2.5 px-3">Length</th>
                          <th className="py-2.5 px-3">Height</th>
                          <th className="py-2.5 px-3">Area</th>
                          <th className="py-2.5 px-3">Stage</th>
                          <th className="py-2.5 px-3">Recorded By</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {job.measurements.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                              {m.label}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                              {m.lengthM ? `${m.lengthM} m` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                              {m.heightM ? `${m.heightM} m` : '—'}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-orange-600">
                              {m.areaSqM ? `${m.areaSqM} m²` : '—'}
                            </td>
                            <td className="py-2.5 px-3 uppercase text-[10px] text-slate-500">
                              {m.stage}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {m.recordedByName || 'Staff'}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteMeasurement(m.id)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed rounded-xl text-xs text-slate-400">
                    No measurements logged yet. Click "Add Measurement" to record on-site dimensions.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PROGRESS & MATERIALS */}
          {activeTab === 'installation_materials' && (
            <div className="space-y-6">
              {/* Progress Update Form */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-orange-600" />
                    Installation Progress & Laying Output
                  </h4>
                  <Badge variant={progressPercent >= 100 ? 'success' : 'info'} size="sm">
                    {progressPercent}% Complete
                  </Badge>
                </div>

                <form onSubmit={handleUpdateProgressSubmit} className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-medium mb-1">
                      <span>Completion Percentage</span>
                      <span className="font-bold text-orange-600">{progressPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={progressPercent}
                      onChange={(e) => setProgressPercent(parseInt(e.target.value))}
                      className="w-full accent-orange-600 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Square Meters Installed (m²)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={progressSqMeters}
                        onChange={(e) => setProgressSqMeters(e.target.value)}
                        placeholder="e.g. 35.5"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Total Units / Bricks Laid
                      </label>
                      <input
                        type="number"
                        value={progressUnitsLaid}
                        onChange={(e) => setProgressUnitsLaid(e.target.value)}
                        placeholder="e.g. 1420"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Current Work Section / Shift Notes
                    </label>
                    <input
                      type="text"
                      value={progressNotes}
                      onChange={(e) => setProgressNotes(e.target.value)}
                      placeholder="e.g. Completed East boundary wall 4th course, beginning North perimeter."
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" variant="primary" size="sm">
                      Log Progress Update
                    </Button>
                  </div>
                </form>
              </div>

              {/* Physical Materials Consumed */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-emerald-600" />
                      Materials / Products Consumed
                    </h4>
                    <p className="text-xs text-slate-500">
                      Physical inventory deductions recorded on this installation job.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={() => setShowAddMaterial(!showAddMaterial)}
                  >
                    Record Material Usage
                  </Button>
                </div>

                {showAddMaterial && (
                  <form
                    onSubmit={handleAddMaterialUsageSubmit}
                    className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-950 dark:bg-emerald-950/20 space-y-3"
                  >
                    <div className="font-bold text-xs text-emerald-800 dark:text-emerald-400">
                      Deduct Material From Physical Inventory
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Product / Variant at Stock Location *
                        </label>
                        <select
                          required
                          value={selectedBalanceId}
                          onChange={(e) => setSelectedBalanceId(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                        >
                          <option value="">-- Select Product & Location --</option>
                          {inventoryItems.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.productName} ({b.variantName || 'Std'}) • Avail: {b.quantityAvailable}{' '}
                              {b.unit} @ {b.locationName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Quantity Consumed *
                        </label>
                        <input
                          type="number"
                          step="1"
                          required
                          value={materialQtyUsed}
                          onChange={(e) => setMaterialQtyUsed(e.target.value)}
                          placeholder="e.g. 500"
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Usage Note / Section
                      </label>
                      <input
                        type="text"
                        value={materialNotes}
                        onChange={(e) => setMaterialNotes(e.target.value)}
                        placeholder="e.g. Used for east wing fence starter courses."
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddMaterial(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" variant="primary" size="sm">
                        Record & Deduct Stock
                      </Button>
                    </div>
                  </form>
                )}

                {job.materialsUsed.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] dark:bg-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Product / Variant</th>
                          <th className="py-2.5 px-3">SKU</th>
                          <th className="py-2.5 px-3">Quantity Used</th>
                          <th className="py-2.5 px-3">Source Location</th>
                          <th className="py-2.5 px-3">Stock Movement Ref</th>
                          <th className="py-2.5 px-3">Recorded At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {job.materialsUsed.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {u.productName}
                              </div>
                              {u.variantName && (
                                <div className="text-[10px] text-slate-500">{u.variantName}</div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                              {u.sku}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-orange-600">
                              {u.quantityUsed.toLocaleString()} {u.unit}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                              {u.sourceLocationName}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[10px] text-emerald-600">
                              {u.stockMovementId ? 'Deducted (SM-OK)' : 'Direct Staging'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                              {new Date(u.recordedAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed rounded-xl text-xs text-slate-400">
                    No physical materials logged. Click "Record Material Usage" to deduct items used.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: QUALITY CHECK & CLEANING */}
          {activeTab === 'quality_cleaning' && (
            <div className="space-y-6">
              {/* Quality Check Card */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Quality Assurance Audit
                  </h4>
                  <Badge
                    variant={
                      qcStatus === 'passed'
                        ? 'success'
                        : qcStatus === 'conditional_pass'
                        ? 'warning'
                        : 'danger'
                    }
                    size="sm"
                  >
                    {qcStatus.toUpperCase()}
                  </Badge>
                </div>

                <form onSubmit={handleQualityCheckSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { label: 'Alignment Checked', val: qcAlignment, set: setQcAlignment },
                      { label: 'Joint Interlock Verified', val: qcInterlock, set: setQcInterlock },
                      { label: 'Plumb & Level True', val: qcPlumb, set: setQcPlumb },
                      { label: 'Structural Bond Verified', val: qcBond, set: setQcBond },
                    ].map((item, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => item.set(!item.val)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition text-left ${
                          item.val
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {item.val ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400 shrink-0" />
                        )}
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Quality Audit Verdict *
                      </label>
                      <select
                        value={qcStatus}
                        onChange={(e) => setQcStatus(e.target.value as any)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                      >
                        <option value="passed">Passed (Ready for Cleaning)</option>
                        <option value="conditional_pass">Conditional Pass (Minor Snags)</option>
                        <option value="rework_required">Rework Required</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Defects / Corrective Action Required
                      </label>
                      <input
                        type="text"
                        value={qcDefects}
                        onChange={(e) => setQcDefects(e.target.value)}
                        placeholder="e.g. Minor edge chip on corner brick; seal joint gap before wash."
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button type="submit" variant="primary" size="sm">
                      Record Quality Audit
                    </Button>
                  </div>
                </form>
              </div>

              {/* Final Cleaning Card */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-orange-600" />
                    Final Site Cleaning & Surface Finishing
                  </h4>
                </div>

                <form onSubmit={handleFinalCleaningSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      { label: 'Debris & Rubble Cleared', val: cleanDebris, set: setCleanDebris },
                      { label: 'Efflorescence Cleaned', val: cleanEfflorescence, set: setCleanEfflorescence },
                      { label: 'Surface Washed & Brushed', val: cleanWashed, set: setCleanWashed },
                    ].map((item, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => item.set(!item.val)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition text-left ${
                          item.val
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {item.val ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400 shrink-0" />
                        )}
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Remaining Finishing Remarks
                    </label>
                    <input
                      type="text"
                      value={cleanIssues}
                      onChange={(e) => setCleanIssues(e.target.value)}
                      placeholder="e.g. Perimeter cleaned, pallets stacked neatly for collection."
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" variant="primary" size="sm">
                      Complete Final Cleaning
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 6: PHOTOS & EVIDENCE */}
          {activeTab === 'photos' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-orange-600" />
                    Attach Service Photograph
                  </h4>
                  <p className="text-xs text-slate-500">
                    Snap or upload before, during, QC audit, or completion photos.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={photoCategory}
                    onChange={(e) => setPhotoCategory(e.target.value as any)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="before">Before Work</option>
                    <option value="during">During Laying</option>
                    <option value="inspection">Site Inspection</option>
                    <option value="quality_check">Quality Check</option>
                    <option value="after">Completed Finish</option>
                    <option value="completion">Handover</option>
                    <option value="other">Other</option>
                  </select>

                  <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={photoCustomerVisible}
                      onChange={(e) => setPhotoCustomerVisible(e.target.checked)}
                      className="rounded text-orange-600"
                    />
                    <span>Customer Visible</span>
                  </label>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    leftIcon={<Camera className="h-4 w-4" />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload Photo
                  </Button>
                </div>

                {/* Online Photo URL input */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <input
                    type="url"
                    value={onlinePhotoUrl}
                    onChange={(e) => setOnlinePhotoUrl(e.target.value)}
                    placeholder="Or paste online photo link (https://...)"
                    className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPhotoUrl();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddPhotoUrl}
                    disabled={!onlinePhotoUrl.trim()}
                    className="shrink-0 text-xs h-8"
                  >
                    Add URL
                  </Button>
                </div>
              </div>

              {/* Photo Grid */}
              {job.photos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {job.photos.map((p) => (
                    <div
                      key={p.id}
                      className="group relative rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="aspect-video w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <img
                          src={p.url}
                          alt={p.caption || 'Service photo'}
                          className="h-full w-full object-cover group-hover:scale-105 transition"
                        />
                      </div>
                      <div className="p-2.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 dark:bg-orange-950/60 px-1.5 py-0.5 rounded">
                            {p.category}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {p.isCustomerVisible ? (
                              <span title="Visible to customer">
                                <Eye className="h-3 w-3 text-emerald-500 inline" />
                              </span>
                            ) : (
                              <span title="Private operational photo">
                                <EyeOff className="h-3 w-3 text-slate-400 inline" />
                              </span>
                            )}
                          </span>
                        </div>
                        {p.caption && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                            {p.caption}
                          </p>
                        )}
                        <div className="text-[10px] text-slate-400">
                          {new Date(p.takenAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(p.id)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition hover:bg-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 border border-dashed rounded-xl text-xs text-slate-400">
                  No site photos uploaded yet. Click "Upload Photo" or take a photo with your mobile camera.
                </div>
              )}
            </div>
          )}

          {/* TAB 7: CLIENT SIGNOFF & HANDOVER */}
          {activeTab === 'signoff' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Customer Completion Sign-Off & Handover
                  </h4>
                  <p className="text-xs text-slate-500">
                    Capture the client or on-site engineer sign-off to formally close the service job.
                  </p>
                </div>

                <form onSubmit={handleCustomerSignOffSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Signee / Representative Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={signOffName}
                        onChange={(e) => setSignOffName(e.target.value)}
                        placeholder="e.g. Chief Emeka Okonkwo"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Contact Phone
                      </label>
                      <input
                        type="tel"
                        value={signOffPhone}
                        onChange={(e) => setSignOffPhone(e.target.value)}
                        placeholder="e.g. +234 803 555 1234"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Customer Satisfaction Rating
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setSignOffRating(star)}
                          className={`p-1.5 rounded-lg border transition ${
                            signOffRating >= star
                              ? 'border-amber-400 bg-amber-50 text-amber-500 dark:bg-amber-950/40'
                              : 'border-slate-200 text-slate-300 dark:border-slate-700'
                          }`}
                        >
                          <Star className="h-5 w-5 fill-current" />
                        </button>
                      ))}
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 ml-2">
                        {signOffRating} / 5 Stars
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Customer Handover Sign-Off Notes
                    </label>
                    <textarea
                      rows={3}
                      value={signOffNotes}
                      onChange={(e) => setSignOffNotes(e.target.value)}
                      placeholder="e.g. Client inspected interlocking masonry. All joints aligned true. Handover accepted with 3-year warranty."
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] text-slate-500">
                      Sign-off automatically marks the service job as COMPLETED.
                    </span>
                    <Button
                      type="submit"
                      variant="primary"
                      leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    >
                      Confirm Sign-Off & Close Job
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 8: AUDIT HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Service Job Status & Event Trail
              </h3>
              <div className="space-y-3">
                {job.statusHistory.map((h) => (
                  <div
                    key={h.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 flex items-start gap-3"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-xs shrink-0">
                      <Clock className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Transitioned to {h.newStatus.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(h.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {h.note && <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{h.note}</p>}
                      <div className="text-[10px] text-slate-400 mt-1">
                        By {h.changedByName || 'System'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Assign External Service Provider Modal Dialog */}
        {showAssignProviderModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setShowAssignProviderModal(false)}
                className="absolute top-4 right-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Assign External Contractor
                  </h3>
                  <p className="text-xs text-slate-500">{job.jobReference}</p>
                </div>
              </div>

              {activeProviders.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  No active external service providers available. Register or activate providers in
                  Module 16 first.
                </div>
              ) : (
                <form onSubmit={handleAssignProviderSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Choose Active Partner / Contractor *
                    </label>
                    <select
                      value={selectedProviderId}
                      onChange={(e) => setSelectedProviderId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      required
                    >
                      {activeProviders.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.providerNumber} - {p.providerTypeLabel})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedProviderId && (
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-3 text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 space-y-1">
                      {(() => {
                        const p = activeProviders.find((x) => x.id === selectedProviderId);
                        if (!p) return null;
                        return (
                          <>
                            <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                            <div>Phone: {p.phone}</div>
                            <div>Areas: {p.serviceAreas.join(', ')}</div>
                            <div className="text-[11px] text-orange-600 dark:text-orange-400 font-medium">
                              Capabilities: {p.capabilities.map((c) => c.replace(/_/g, ' ')).join(', ')}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Assignment Note / Special Instructions
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Assigned for perimeter foundation leveling and primary course dry stacking..."
                      value={providerNote}
                      onChange={(e) => setProviderNote(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setShowAssignProviderModal(false)}
                      disabled={isAssigningProvider}
                    >
                      Cancel
                    </Button>
                    <Button variant="primary" type="submit" isLoading={isAssigningProvider}>
                      Confirm Assignment
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
