import React, { useState, useEffect, useMemo } from 'react';
import {
  Wrench,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  User,
  Users,
  Search,
  Filter,
  Plus,
  Compass,
  Layers,
  ShieldCheck,
  Sparkles,
  Printer,
  ChevronRight,
  RefreshCw,
  Smartphone,
  SlidersHorizontal,
} from 'lucide-react';
import {
  ServiceJobRecord,
  ServiceJobStatus,
  ServiceType,
  ServicePriority,
  ServiceJobFilters,
} from '../../types/installation';
import { installationService, ServiceDashboardMetrics } from '../../services/installation.service';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { SearchInput } from '../ui/SearchInput';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { CreateServiceJobModal } from './CreateServiceJobModal';
import { ServiceJobDetailModal } from './ServiceJobDetailModal';
import { ServiceJobPrintModal } from './ServiceJobPrintModal';
import { MobileStaffJobView } from './MobileStaffJobView';
import { ServicesManagementModal } from '../settings/ServicesManagementModal';

interface InstallationManagementPanelProps {
  initialOrderId?: string | null;
  onClearInitialOrder?: () => void;
  onNavigateToOrders?: () => void;
}

export const InstallationManagementPanel: React.FC<InstallationManagementPanelProps> = ({
  initialOrderId,
  onClearInitialOrder,
  onNavigateToOrders,
}) => {
  const toast = useToast();
  const { profile, role, isAdministrator, can } = useAuth();

  const isFieldStaff = role?.name === 'installation_staff';

  // View mode: 'manager' or 'mobile_staff'
  const [viewMode, setViewMode] = useState<'manager' | 'mobile_staff'>(
    isFieldStaff ? 'mobile_staff' : 'manager'
  );

  const [jobs, setJobs] = useState<ServiceJobRecord[]>([]);
  const [metrics, setMetrics] = useState<ServiceDashboardMetrics>({
    totalJobs: 0,
    todayJobs: 0,
    activeJobs: 0,
    awaitingAssignment: 0,
    awaitingInspection: 0,
    inInstallation: 0,
    awaitingQualityCheck: 0,
    completedJobs: 0,
    cancelledJobs: 0,
    totalSquareMetersInstalled: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ServiceJobStatus | 'all'>('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<ServiceType | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<ServicePriority | 'all'>('all');
  const [statusTab, setStatusTab] = useState<'all' | 'scheduled' | 'in_progress' | 'quality' | 'completed'>('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedJobForDetail, setSelectedJobForDetail] = useState<ServiceJobRecord | null>(null);
  const [selectedJobForPrint, setSelectedJobForPrint] = useState<ServiceJobRecord | null>(null);
  const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);

  const serviceTypes = useMemo(() => installationService.getServiceTypes(), []);

  const loadJobsAndMetrics = async () => {
    setLoading(true);
    try {
      const allJobs = await installationService.getServiceJobs();
      setJobs(allJobs);
      const computedMetrics = await installationService.getDashboardMetrics();
      setMetrics(computedMetrics);
    } catch (err) {
      console.error('Failed to load installation service jobs:', err);
      toast.error('Unable to fetch service jobs from local storage.', 'Loading Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobsAndMetrics();
  }, []);

  // If navigated with initial order, open create modal automatically
  useEffect(() => {
    if (initialOrderId) {
      setIsCreateModalOpen(true);
    }
  }, [initialOrderId]);

  // Tab and filter evaluation
  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    // Status Tab mapping
    if (statusTab === 'scheduled') {
      result = result.filter((j) => j.status === 'draft' || j.status === 'scheduled' || j.status === 'assigned');
    } else if (statusTab === 'in_progress') {
      result = result.filter(
        (j) =>
          j.status === 'on_site' ||
          j.status === 'inspection' ||
          j.status === 'preparation' ||
          j.status === 'installation'
      );
    } else if (statusTab === 'quality') {
      result = result.filter((j) => j.status === 'quality_check' || j.status === 'final_cleaning' || j.status === 'customer_confirmation');
    } else if (statusTab === 'completed') {
      result = result.filter((j) => j.status === 'completed');
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(
        (j) =>
          j.jobReference.toLowerCase().includes(term) ||
          j.customerName.toLowerCase().includes(term) ||
          j.customerPhone.includes(term) ||
          (j.orderNumber && j.orderNumber.toLowerCase().includes(term)) ||
          j.siteAddress.toLowerCase().includes(term) ||
          (j.assignedStaffName && j.assignedStaffName.toLowerCase().includes(term))
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((j) => j.status === statusFilter);
    }

    if (serviceTypeFilter !== 'all') {
      result = result.filter((j) => j.serviceType === serviceTypeFilter);
    }

    if (priorityFilter !== 'all') {
      result = result.filter((j) => j.priority === priorityFilter);
    }

    return result;
  }, [jobs, statusTab, searchTerm, statusFilter, serviceTypeFilter, priorityFilter]);

  // Filtered jobs for field staff
  const staffJobs = useMemo(() => {
    if (isFieldStaff && profile?.id) {
      return jobs.filter((j) => j.assignedStaffId === profile.id || j.assignedStaffId === 'dev-inst-uid-0004');
    }
    return jobs;
  }, [jobs, isFieldStaff, profile]);

  const handleJobCreated = (newJob: ServiceJobRecord) => {
    setJobs((prev) => [newJob, ...prev]);
    loadJobsAndMetrics();
    if (onClearInitialOrder) onClearInitialOrder();
  };

  const handleJobUpdated = (updated: ServiceJobRecord) => {
    setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
    if (selectedJobForDetail?.id === updated.id) {
      setSelectedJobForDetail(updated);
    }
    loadJobsAndMetrics();
  };

  return (
    <div className="space-y-6 text-left" id="installation-management-panel">
      {/* Top Header */}
      <PageHeader
        title="Installation & Field Service Operations"
        description="Schedule on-site bricklaying teams, manage site leveling inspections, track daily m² progress, and perform quality audits."
        primaryAction={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Schedule Service Job
          </Button>
        }
        secondaryActions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Sparkles className="h-4 w-4 text-orange-500" />}
              onClick={() => setIsServicesModalOpen(true)}
              title="Manage Specialized Installation Services & Photos displayed on public website"
            >
              Public Services & Photos
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={viewMode === 'manager' ? <Smartphone className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
              onClick={() => setViewMode(viewMode === 'manager' ? 'mobile_staff' : 'manager')}
            >
              {viewMode === 'manager' ? 'Mobile Tasks View' : 'Manager Dashboard'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={loadJobsAndMetrics}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Jobs
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {metrics.totalJobs}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {metrics.totalSquareMetersInstalled} m² installed
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
            Today's Scheduled
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {metrics.todayJobs}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Site work booked</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Unassigned / Prep
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {metrics.awaitingAssignment}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Awaiting crew dispatch</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            In Installation
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {metrics.inInstallation}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Laying blocks on site</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            Quality Check / Clean
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {metrics.awaitingQualityCheck}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Audit & wash stage</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Completed & Signed
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {metrics.completedJobs}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Customer accepted</div>
        </div>
      </div>

      {/* RENDER VIEW MODE: MOBILE TASKS VIEW OR MANAGER DASHBOARD */}
      {viewMode === 'mobile_staff' ? (
        <MobileStaffJobView
          jobs={staffJobs}
          onOpenDetailModal={(j) => setSelectedJobForDetail(j)}
          onJobUpdated={handleJobUpdated}
        />
      ) : (
        <div className="space-y-4">
          {/* Sub-Tabs for Fast Pipeline Filtering */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto">
            {[
              { id: 'all', label: `All Jobs (${jobs.length})` },
              { id: 'scheduled', label: `Scheduled & Assigned (${metrics.awaitingAssignment})` },
              { id: 'in_progress', label: `On Site & Laying (${metrics.inInstallation})` },
              { id: 'quality', label: `Quality Check & Clean (${metrics.awaitingQualityCheck})` },
              { id: 'completed', label: `Completed (${metrics.completedJobs})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusTab(tab.id as any)}
                className={`py-2 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
                  statusTab === tab.id
                    ? 'border-orange-600 text-orange-600 dark:border-orange-500 dark:text-orange-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-1 w-full sm:w-auto">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search reference (SRV-2026-0001), customer, phone, site address, lead mason..."
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <select
                value={serviceTypeFilter}
                onChange={(e) => setServiceTypeFilter(e.target.value as any)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="all">All Service Types</option>
                {serviceTypes.map((st) => (
                  <option key={st.type} value={st.type}>
                    {st.label}
                  </option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as any)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Job Records Table */}
          {filteredJobs.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/80">
                    <tr>
                      <th className="py-3 px-4">Service Job Ref</th>
                      <th className="py-3 px-4">Customer & Project</th>
                      <th className="py-3 px-4">Service Type</th>
                      <th className="py-3 px-4">Site Location</th>
                      <th className="py-3 px-4">Scheduled Date</th>
                      <th className="py-3 px-4">Assigned Crew</th>
                      <th className="py-3 px-4">Checklist Progress</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredJobs.map((j) => {
                      const completedCount = j.checklists.filter((c) => c.isCompleted).length;
                      const checkPercent = j.checklists.length
                        ? Math.round((completedCount / j.checklists.length) * 100)
                        : 0;

                      return (
                        <tr
                          key={j.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition cursor-pointer"
                          onClick={() => setSelectedJobForDetail(j)}
                        >
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-extrabold text-slate-900 dark:text-white">
                              {j.jobReference}
                            </span>
                            {j.orderNumber && (
                              <div className="text-[10px] font-mono text-slate-400">
                                Order: {j.orderNumber}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {j.customerName}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {j.companyName || j.customerPhone}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                            {j.serviceTypeLabel}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 truncate max-w-xs">
                              <MapPin className="h-3 w-3 text-emerald-600 shrink-0" />
                              <span className="truncate">
                                {j.siteAddress}, {j.siteCity || 'Enugu'}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {j.scheduledDate || 'Not set'}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {j.scheduledTime || '08:30 AM'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {j.assignedStaffName || (
                                <span className="text-amber-500 font-normal italic">
                                  Unassigned
                                </span>
                              )}
                            </div>
                            {j.teamMembers && j.teamMembers.length > 1 && (
                              <div className="text-[10px] text-slate-400">
                                +{j.teamMembers.length - 1} crew members
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-200 rounded-full h-1.5 dark:bg-slate-700">
                                <div
                                  className="bg-orange-600 h-1.5 rounded-full"
                                  style={{ width: `${checkPercent}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-500">
                                {completedCount}/{j.checklists.length}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <Badge
                              variant={
                                j.status === 'completed'
                                  ? 'success'
                                  : j.status === 'installation' || j.status === 'quality_check'
                                  ? 'warning'
                                  : j.status === 'cancelled'
                                  ? 'danger'
                                  : 'info'
                              }
                              size="sm"
                            >
                              {j.status.replace(/_/g, ' ').toUpperCase()}
                            </Badge>
                          </td>

                          <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedJobForDetail(j)}
                              >
                                Details
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedJobForPrint(j)}
                                title="Print Job Card"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No service jobs found"
              description="No service jobs match the active status tab or search filter. Create a new service job or clear filters."
              actionLabel="Schedule Service Job"
              onAction={() => setIsCreateModalOpen(true)}
            />
          )}
        </div>
      )}

      {/* Create Service Job Modal */}
      <CreateServiceJobModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          if (onClearInitialOrder) onClearInitialOrder();
        }}
        initialOrderId={initialOrderId}
        onServiceJobCreated={handleJobCreated}
      />

      {/* Service Job Detail Modal */}
      {selectedJobForDetail && (
        <ServiceJobDetailModal
          isOpen={!!selectedJobForDetail}
          onClose={() => setSelectedJobForDetail(null)}
          serviceJobId={selectedJobForDetail.id}
          onJobUpdated={handleJobUpdated}
          onOpenPrintModal={(j) => setSelectedJobForPrint(j)}
        />
      )}

      {/* Service Job Print Modal */}
      {selectedJobForPrint && (
        <ServiceJobPrintModal
          isOpen={!!selectedJobForPrint}
          onClose={() => setSelectedJobForPrint(null)}
          job={selectedJobForPrint}
        />
      )}

      {/* Public Specialized Installation Services Manager Modal */}
      {isServicesModalOpen && (
        <ServicesManagementModal
          isOpen={isServicesModalOpen}
          onClose={() => setIsServicesModalOpen(false)}
        />
      )}
    </div>
  );
};
