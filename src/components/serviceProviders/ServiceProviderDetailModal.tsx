import React, { useState, useEffect } from 'react';
import {
  X,
  Briefcase,
  User,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Compass,
  Calendar,
  FileText,
  Upload,
  Trash2,
  ExternalLink,
  Edit,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Archive,
  Wrench,
  Eye,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { serviceProviderService } from '../../services/serviceProvider.service';
import { mediaService } from '../../services/media.service';
import {
  ServiceProvider,
  ProviderDocument,
  ProviderDocumentType,
} from '../../types/serviceProvider';
import { ServiceJobRecord } from '../../types/installation';
import { formatBytes } from '../../utils/formatters';

interface ServiceProviderDetailModalProps {
  isOpen: boolean;
  provider: ServiceProvider | null;
  onClose: () => void;
  onEdit: (provider: ServiceProvider) => void;
  onDeactivate: (provider: ServiceProvider, action: 'deactivate' | 'suspend' | 'activate') => void;
  onAssignJob: (provider: ServiceProvider) => void;
  onProviderUpdated: (updated: ServiceProvider) => void;
  onViewJob?: (jobId: string) => void;
}

export const ServiceProviderDetailModal: React.FC<ServiceProviderDetailModalProps> = ({
  isOpen,
  provider,
  onClose,
  onEdit,
  onDeactivate,
  onAssignJob,
  onProviderUpdated,
  onViewJob,
}) => {
  const { profile, can } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'capabilities' | 'history' | 'documents' | 'notes'
  >('overview');

  const [serviceJobs, setServiceJobs] = useState<ServiceJobRecord[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Document Upload State
  const [showUploadDoc, setShowUploadDoc] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState<ProviderDocumentType>('agreement');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Note update state
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Load service history when modal opens or provider changes
  useEffect(() => {
    if (!isOpen || !provider) return;

    setNoteContent(provider.internalNotes || '');

    const loadHistory = async () => {
      setLoadingJobs(true);
      try {
        const jobs = await serviceProviderService.getAssignedJobs(provider.id);
        setServiceJobs(jobs);
      } catch (err) {
        console.error('Failed to load service job history for provider:', err);
      } finally {
        setLoadingJobs(false);
      }
    };

    loadHistory();
  }, [isOpen, provider]);

  if (!isOpen || !provider) return null;

  const canEdit = can('service_providers.edit');
  const canDeactivate = can('service_providers.deactivate');
  const canAssign = can('service_providers.assign');

  // Contact quick actions
  const rawPhone = provider.phone.replace(/[^0-9+]/g, '');
  const rawWhatsApp = (provider.whatsappNumber || provider.phone).replace(/[^0-9]/g, '');

  const handleFileUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!docTitle) {
        setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUploadDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) {
      toast.error('Document title is required.', 'Missing Title');
      return;
    }
    if (!selectedFile) {
      toast.error('Please select a file to upload.', 'Missing File');
      return;
    }

    setIsUploading(true);
    try {
      // Reuse Module 07 media/storage service
      const uploadResult = await mediaService.uploadMedia(
        selectedFile,
        `providers/${provider.id}/${Date.now()}_${selectedFile.name}`
      );

      const docPayload: Omit<ProviderDocument, 'id' | 'providerId' | 'uploadedAt'> = {
        title: docTitle.trim(),
        documentType: docType,
        fileName: selectedFile.name,
        fileUrl: uploadResult.url,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
      };

      const updated = await serviceProviderService.addProviderDocument(
        provider.id,
        docPayload,
        profile?.id || 'dev-admin-uid-0001',
        profile?.full_name || 'Administrator'
      );

      toast.success(`Document "${docTitle}" uploaded securely.`, 'Document Attached');
      onProviderUpdated(updated);
      setShowUploadDoc(false);
      setDocTitle('');
      setSelectedFile(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload document.', 'Upload Failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to remove the document "${title}"?`)) {
      return;
    }
    try {
      const updated = await serviceProviderService.removeProviderDocument(
        provider.id,
        docId,
        profile?.id || 'dev-admin-uid-0001',
        profile?.full_name || 'Administrator'
      );
      toast.info(`Document "${title}" removed.`, 'Document Deleted');
      onProviderUpdated(updated);
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove document.', 'Error');
    }
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      const updated = await serviceProviderService.updateProvider(
        provider.id,
        { internalNotes: noteContent.trim() || null },
        profile?.id || 'dev-admin-uid-0001',
        profile?.full_name || 'Administrator'
      );
      toast.success('Internal management notes saved.', 'Notes Updated');
      onProviderUpdated(updated);
      setIsEditingNotes(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save notes.', 'Error');
    } finally {
      setIsSavingNotes(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 my-8 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {provider.name}
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                  {provider.providerNumber}
                </span>
                <Badge
                  variant={
                    provider.status === 'active'
                      ? 'success'
                      : provider.status === 'suspended'
                      ? 'warning'
                      : 'danger'
                  }
                  size="sm"
                >
                  {provider.status.toUpperCase()}
                </Badge>
                <Badge
                  variant={
                    provider.availability === 'available'
                      ? 'info'
                      : provider.availability === 'temporarily_unavailable'
                      ? 'warning'
                      : 'default'
                  }
                  size="sm"
                >
                  {provider.availability.replace(/_/g, ' ').toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {provider.providerTypeLabel} • Registered:{' '}
                {new Date(provider.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {canAssign && provider.status === 'active' && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Wrench className="h-3.5 w-3.5" />}
                onClick={() => onAssignJob(provider)}
              >
                Assign to Job
              </Button>
            )}

            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Edit className="h-3.5 w-3.5" />}
                onClick={() => onEdit(provider)}
              >
                Edit
              </Button>
            )}

            {canDeactivate && (
              <>
                {provider.status === 'active' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-amber-600 hover:text-amber-700 border-amber-300"
                    leftIcon={<AlertTriangle className="h-3.5 w-3.5" />}
                    onClick={() => onDeactivate(provider, 'suspend')}
                  >
                    Suspend
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-emerald-600 hover:text-emerald-700 border-emerald-300"
                    leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    onClick={() => onDeactivate(provider, 'activate')}
                  >
                    Re-activate
                  </Button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 dark:border-slate-800 overflow-x-auto gap-4 bg-slate-50 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-orange-600 text-orange-600 dark:border-orange-400 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            Overview & Contact
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('capabilities')}
            className={`py-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'capabilities'
                ? 'border-orange-600 text-orange-600 dark:border-orange-400 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            Capabilities & Areas
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-orange-600 text-orange-600 dark:border-orange-400 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Service Jobs History ({serviceJobs.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`py-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'documents'
                ? 'border-orange-600 text-orange-600 dark:border-orange-400 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Documents & Compliance ({provider.documents?.length || 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`py-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'notes'
                ? 'border-orange-600 text-orange-600 dark:border-orange-400 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Internal Notes
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: OVERVIEW & CONTACT */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Contact Bar */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-500 font-medium">Principal Contact:</div>
                  <div className="text-base font-bold text-slate-900 dark:text-white">
                    {provider.contactPerson || provider.name}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Phone: <span className="font-semibold">{provider.phone}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href={`tel:${rawPhone}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <Phone className="h-3.5 w-3.5 text-emerald-600" />
                    Call
                  </a>

                  {provider.whatsappNumber && (
                    <a
                      href={`https://wa.me/${rawWhatsApp}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    >
                      <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                      WhatsApp
                    </a>
                  )}

                  {provider.email && (
                    <a
                      href={`mailto:${provider.email}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <Mail className="h-3.5 w-3.5 text-blue-600" />
                      Email
                    </a>
                  )}
                </div>
              </div>

              {/* Information Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Physical Location */}
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-orange-600" />
                    Base Location & Operating Office
                  </h4>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {provider.address || 'No specific physical street address recorded'}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    City: {provider.city || 'Enugu'} • State: {provider.state || 'Enugu State'}
                  </div>
                  {provider.gpsLatitude && provider.gpsLongitude && (
                    <div className="pt-1">
                      <a
                        href={`https://www.google.com/maps?q=${provider.gpsLatitude},${provider.gpsLongitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:underline"
                      >
                        <Compass className="h-3.5 w-3.5" />
                        View Base Coordinates on Google Maps ({provider.gpsLatitude},{' '}
                        {provider.gpsLongitude})
                      </a>
                    </div>
                  )}
                </div>

                {/* Legal & Registrations */}
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-orange-600" />
                    Commercial & Regulatory Records
                  </h4>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500">CAC / Reg Number:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {provider.registrationNumber || 'Unregistered / Informal Artisan'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Tax Identification (TIN):</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {provider.taxId || 'Not on file'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Classification:</span>
                    <span className="font-semibold text-orange-600 dark:text-orange-400">
                      {provider.providerTypeLabel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Public Description */}
              {provider.description && (
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Professional Profile & Bio
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {provider.description}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CAPABILITIES & AREAS */}
          {activeTab === 'capabilities' && (
            <div className="space-y-6">
              {/* Capabilities */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                  <Wrench className="h-4 w-4 text-orange-600" />
                  Service Capabilities
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {provider.capabilities.map((cap) => {
                    const capDef = serviceProviderService
                      .getCapabilities()
                      .find((c) => c.code === cap);
                    return (
                      <div
                        key={cap}
                        className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/40"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {capDef?.label || cap.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {capDef?.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 pl-6">
                            {capDef.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Service Areas */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-orange-600" />
                  Covered Service Territories & Municipalities
                </h4>
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {provider.serviceAreas.map((area, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800 dark:bg-orange-950/60 dark:text-orange-300"
                    >
                      <MapPin className="h-3 w-3" />
                      {area}
                    </span>
                  ))}
                </div>
                {provider.serviceAreaNotes && (
                  <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      Territory Notes:{' '}
                    </span>
                    {provider.serviceAreaNotes}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SERVICE JOB HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Assigned Field Service Jobs
                  </h4>
                  <p className="text-xs text-slate-500">
                    Historical and ongoing installations linked to this external contractor
                  </p>
                </div>
                {canAssign && provider.status === 'active' && (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Wrench className="h-3.5 w-3.5" />}
                    onClick={() => onAssignJob(provider)}
                  >
                    Assign New Job
                  </Button>
                )}
              </div>

              {loadingJobs ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  Loading service relationships...
                </div>
              ) : serviceJobs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                  <Briefcase className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    No service jobs associated with this contractor yet.
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                    When this contractor is assigned to field installation jobs in Module 15, they
                    will automatically appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {serviceJobs.map((job) => (
                    <div
                      key={job.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-orange-300 dark:border-slate-800 dark:bg-slate-900 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
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
                          <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                            {job.serviceTypeLabel}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {job.customerName} {job.companyName ? `(${job.companyName})` : ''}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-emerald-600" />
                          <span>{job.siteAddress}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-0.5">
                          <span>
                            Scheduled: {job.scheduledDate || 'Flexible'} • Internal Lead:{' '}
                            {job.assignedStaffName || 'None'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {onViewJob && (
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Eye className="h-3.5 w-3.5" />}
                            onClick={() => onViewJob(job.id)}
                          >
                            View Work Order
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DOCUMENTS & COMPLIANCE */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Private Provider Documents
                  </h4>
                  <p className="text-xs text-slate-500">
                    Secured contractor agreements, certifications, and identification
                  </p>
                </div>
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Upload className="h-3.5 w-3.5" />}
                    onClick={() => setShowUploadDoc(!showUploadDoc)}
                  >
                    {showUploadDoc ? 'Cancel Upload' : 'Upload Document'}
                  </Button>
                )}
              </div>

              {/* Upload Document Sub-form */}
              {showUploadDoc && (
                <form
                  onSubmit={handleUploadDocumentSubmit}
                  className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 dark:border-orange-900/60 dark:bg-orange-950/20 space-y-4"
                >
                  <h5 className="text-xs font-bold text-orange-900 dark:text-orange-300">
                    Attach New Document to {provider.name}
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Document Title *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 2026 Subcontractor Agreement"
                        value={docTitle}
                        onChange={(e) => setDocTitle(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Document Type *
                      </label>
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value as ProviderDocumentType)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        <option value="agreement">Contract / Master Agreement</option>
                        <option value="certificate">CAC / Professional Certificate</option>
                        <option value="id_document">National ID / Passport</option>
                        <option value="license">Trade License / Guild Permit</option>
                        <option value="other">Other Supporting Document</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Select File (PDF, PNG, JPG) *
                      </label>
                      <input
                        type="file"
                        required
                        accept=".pdf,image/*"
                        onChange={handleFileUploadChange}
                        className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-orange-600 file:text-white hover:file:bg-orange-700 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => setShowUploadDoc(false)}
                      disabled={isUploading}
                    >
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" type="submit" isLoading={isUploading}>
                      Upload Document
                    </Button>
                  </div>
                </form>
              )}

              {/* Documents List */}
              {(!provider.documents || provider.documents.length === 0) ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                  <FileText className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    No documents on file for this provider.
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Upload subcontractor agreements, trade certificates, or identification for
                    regulatory compliance.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {provider.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {doc.title}
                            </span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300 uppercase">
                              {doc.documentType}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {doc.fileName}{' '}
                            {doc.fileSize ? `(${formatBytes(doc.fileSize)})` : ''} • Uploaded:{' '}
                            {new Date(doc.uploadedAt).toLocaleDateString()}
                            {doc.uploadedByName ? ` by ${doc.uploadedByName}` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View
                        </a>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(doc.id, doc.title)}
                            className="rounded p-1 text-slate-400 hover:text-rose-600"
                            title="Remove Document"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: INTERNAL NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Internal Management Observations & Notes
                  </h4>
                  <p className="text-xs text-slate-500">
                    Confidential administrative records. Never exposed to customers or external
                    parties.
                  </p>
                </div>
                {canEdit && !isEditingNotes && (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Edit className="h-3.5 w-3.5" />}
                    onClick={() => setIsEditingNotes(true)}
                  >
                    Edit Notes
                  </Button>
                )}
              </div>

              {isEditingNotes ? (
                <div className="space-y-3">
                  <textarea
                    rows={6}
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Enter management notes, performance observations, preferred rates, site supervisor feedback..."
                    className="w-full rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white leading-relaxed font-mono"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingNotes(false)}
                      disabled={isSavingNotes}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveNotes}
                      isLoading={isSavingNotes}
                    >
                      Save Notes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40 text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {provider.internalNotes ? (
                    provider.internalNotes
                  ) : (
                    <span className="italic text-slate-400">
                      No internal notes recorded yet. Click "Edit Notes" to add administrative
                      observations.
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
