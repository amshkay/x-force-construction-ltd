import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  RotateCcw,
  LayoutGrid,
  List,
  Phone,
  MessageCircle,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Archive,
  Download,
  Eye,
  Edit,
  Wrench,
  Building,
  UserCheck,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { serviceProviderService } from '../../services/serviceProvider.service';
import {
  ServiceProvider,
  ServiceProviderFilters,
  ProviderType,
  ProviderCapability,
  ProviderStatus,
  ProviderAvailability,
} from '../../types/serviceProvider';
import { CreateServiceProviderModal } from './CreateServiceProviderModal';
import { EditServiceProviderModal } from './EditServiceProviderModal';
import { ServiceProviderDetailModal } from './ServiceProviderDetailModal';
import { DeactivateProviderModal } from './DeactivateProviderModal';
import { AssignJobToProviderModal } from './AssignJobToProviderModal';

interface ServiceProviderManagementPanelProps {
  onNavigateToInstallations?: (jobId?: string) => void;
}

export const ServiceProviderManagementPanel: React.FC<ServiceProviderManagementPanelProps> = ({
  onNavigateToInstallations,
}) => {
  const { can } = useAuth();
  const toast = useToast();

  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProviderStatus | 'all'>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<ProviderAvailability | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ProviderType | 'all'>('all');
  const [capabilityFilter, setCapabilityFilter] = useState<ProviderCapability | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Modals State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateAction, setDeactivateAction] = useState<'deactivate' | 'suspend' | 'activate'>('deactivate');
  const [showAssignModal, setShowAssignModal] = useState(false);

  const canCreate = can('service_providers.create');
  const canEdit = can('service_providers.edit');
  const canDeactivate = can('service_providers.deactivate');
  const canAssign = can('service_providers.assign');

  const providerTypes = useMemo(() => serviceProviderService.getProviderTypes(), []);
  const capabilitiesList = useMemo(() => serviceProviderService.getCapabilities(), []);

  // Fetch Providers
  const loadProviders = async () => {
    setLoading(true);
    try {
      const filters: ServiceProviderFilters = {
        searchTerm: searchTerm.trim() || undefined,
        status: statusFilter,
        availability: availabilityFilter,
        providerType: typeFilter,
        capability: capabilityFilter,
      };
      const data = await serviceProviderService.getAllProviders(filters);
      setProviders(data);
    } catch (err: any) {
      toast.error('Failed to load service providers directory.', 'Data Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, [searchTerm, statusFilter, availabilityFilter, typeFilter, capabilityFilter]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = providers.length;
    const active = providers.filter((p) => p.status === 'active').length;
    const available = providers.filter((p) => p.status === 'active' && p.availability === 'available').length;
    const inactiveOrSuspended = providers.filter((p) => p.status !== 'active').length;
    return { total, active, available, inactiveOrSuspended };
  }, [providers]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setAvailabilityFilter('all');
    setTypeFilter('all');
    setCapabilityFilter('all');
  };

  const handleExportCSV = () => {
    if (providers.length === 0) {
      toast.info('No provider records to export.', 'Empty List');
      return;
    }
    const headers = [
      'Provider Number',
      'Name',
      'Classification',
      'Contact Person',
      'Phone',
      'WhatsApp',
      'Email',
      'City',
      'State',
      'Service Areas',
      'Capabilities',
      'Status',
      'Availability',
      'CAC Registration',
      'Created At',
    ];
    const rows = providers.map((p) => [
      `"${p.providerNumber}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.providerTypeLabel}"`,
      `"${p.contactPerson || ''}"`,
      `"${p.phone}"`,
      `"${p.whatsappNumber || ''}"`,
      `"${p.email || ''}"`,
      `"${p.city || ''}"`,
      `"${p.state || ''}"`,
      `"${(p.serviceAreas || []).join('; ')}"`,
      `"${(p.capabilities || []).join('; ')}"`,
      `"${p.status}"`,
      `"${p.availability}"`,
      `"${p.registrationNumber || ''}"`,
      `"${new Date(p.createdAt).toLocaleDateString()}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `xforce_service_providers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Service provider directory exported as CSV.', 'Export Complete');
  };

  const openDetail = (provider: ServiceProvider) => {
    setSelectedProvider(provider);
    setShowDetailModal(true);
  };

  const openEdit = (provider: ServiceProvider) => {
    setSelectedProvider(provider);
    setShowEditModal(true);
  };

  const openDeactivate = (
    provider: ServiceProvider,
    action: 'deactivate' | 'suspend' | 'activate'
  ) => {
    setSelectedProvider(provider);
    setDeactivateAction(action);
    setShowDeactivateModal(true);
  };

  const openAssign = (provider: ServiceProvider) => {
    setSelectedProvider(provider);
    setShowAssignModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-orange-600" />
            Service Provider Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            External contractors, certified brick masons, paving artisans, and specialist site crews.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={handleExportCSV}
          >
            Export Directory
          </Button>

          {canCreate && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setShowCreateModal(true)}
            >
              Register Provider
            </Button>
          )}
        </div>
      </div>

      {/* Operational Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Providers
            </span>
            <Building className="h-4 w-4 text-orange-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {metrics.total}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Registered partner database</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Active Network
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {metrics.active}
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            Eligible for job assignment
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Available Now
            </span>
            <UserCheck className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-blue-600 dark:text-blue-400">
            {metrics.available}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Immediate mobilization capacity</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Inactive / Suspended
            </span>
            <Archive className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            {metrics.inactiveOrSuspended}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Historical records preserved</div>
        </div>
      </div>

      {/* Search, Filter & View Controls */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by provider name, SPV number, phone, email, contact person, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Filter className="h-3.5 w-3.5" />}
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-orange-50 border-orange-300 text-orange-600 dark:bg-orange-950/40 dark:border-orange-900' : ''}
            >
              Filters
            </Button>

            <div className="flex items-center rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded ${viewMode === 'cards' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'}`}
                title="Grid Cards View"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-orange-600 text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'}`}
                title="Table List View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible Filter Bar */}
        {showFilters && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
                <option value="suspended">Suspended Only</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Availability
              </label>
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="all">All Availabilities</option>
                <option value="available">Available</option>
                <option value="temporarily_unavailable">Temporarily Unavailable</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Classification Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="all">All Provider Types</option>
                {providerTypes.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Specialized Capability
              </label>
              <select
                value={capabilityFilter}
                onChange={(e) => setCapabilityFilter(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="all">All Capabilities</option>
                {capabilitiesList.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-end">
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-orange-600 dark:hover:text-orange-400"
              >
                <RotateCcw className="h-3 w-3" />
                Reset All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          Loading service providers...
        </div>
      ) : providers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <Briefcase className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            No service providers found
          </h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Try adjusting your search criteria or resetting filters.'
              : 'Register external contractors, artisans, and masonry crews to begin assigning service jobs.'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {searchTerm || statusFilter !== 'all' ? (
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                Clear Filters
              </Button>
            ) : canCreate ? (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setShowCreateModal(true)}
              >
                Register First Provider
              </Button>
            ) : null}
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((p) => {
            const rawPhone = p.phone.replace(/[^0-9+]/g, '');
            const rawWhatsApp = (p.whatsappNumber || p.phone).replace(/[^0-9]/g, '');

            return (
              <div
                key={p.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-orange-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Bar: Provider Number & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      {p.providerNumber}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={
                          p.status === 'active'
                            ? 'success'
                            : p.status === 'suspended'
                            ? 'warning'
                            : 'danger'
                        }
                        size="sm"
                      >
                        {p.status.toUpperCase()}
                      </Badge>
                      <Badge
                        variant={
                          p.availability === 'available'
                            ? 'info'
                            : p.availability === 'temporarily_unavailable'
                            ? 'warning'
                            : 'default'
                        }
                        size="sm"
                      >
                        {p.availability === 'temporarily_unavailable' ? 'TEMP BUSY' : p.availability.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {/* Name & Type */}
                  <div>
                    <h3
                      className="text-sm font-bold text-slate-900 dark:text-white hover:text-orange-600 cursor-pointer"
                      onClick={() => openDetail(p)}
                    >
                      {p.name}
                    </h3>
                    <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                      {p.providerTypeLabel}
                    </p>
                  </div>

                  {/* Contact Info */}
                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                    {p.contactPerson && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">Contact:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {p.contactPerson}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <a href={`tel:${rawPhone}`} className="hover:underline">
                          {p.phone}
                        </a>
                      </div>
                      {p.whatsappNumber && (
                        <a
                          href={`https://wa.me/${rawWhatsApp}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-semibold text-emerald-600 hover:underline flex items-center gap-1"
                        >
                          <MessageCircle className="h-3 w-3" />
                          WhatsApp
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <MapPin className="h-3 w-3 text-emerald-600 shrink-0" />
                      <span className="truncate">
                        {p.city ? `${p.city}, ` : ''}
                        {p.state || 'Enugu State'}
                      </span>
                    </div>
                  </div>

                  {/* Capabilities Tags */}
                  <div className="flex items-center gap-1 flex-wrap pt-1">
                    {p.capabilities.slice(0, 3).map((cap) => {
                      const capDef = capabilitiesList.find((c) => c.code === cap);
                      return (
                        <span
                          key={cap}
                          className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {capDef?.label || cap}
                        </span>
                      );
                    })}
                    {p.capabilities.length > 3 && (
                      <span className="text-[10px] font-semibold text-slate-400">
                        +{p.capabilities.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer Action Bar */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openDetail(p)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View Details
                  </button>

                  <div className="flex items-center gap-1">
                    {canAssign && p.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => openAssign(p)}
                        className="rounded p-1 text-slate-400 hover:text-orange-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Assign to Service Job"
                      >
                        <Wrench className="h-4 w-4" />
                      </button>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="rounded p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Edit Provider"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    {canDeactivate && p.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => openDeactivate(p, 'suspend')}
                        className="rounded p-1 text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Suspend Provider"
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Provider Number</th>
                  <th className="px-4 py-3">Provider Name & Type</th>
                  <th className="px-4 py-3">Contact Person & Phone</th>
                  <th className="px-4 py-3">Territory</th>
                  <th className="px-4 py-3">Capabilities</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {providers.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer"
                    onClick={() => openDetail(p)}
                  >
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-900 dark:text-white">
                      {p.providerNumber}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                      <div className="text-[11px] text-orange-600 dark:text-orange-400 font-medium">
                        {p.providerTypeLabel}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {p.contactPerson || '—'}
                      </div>
                      <div className="text-[11px] text-slate-500">{p.phone}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-slate-800 dark:text-slate-200">
                        {p.city ? `${p.city}, ` : ''}
                        {p.state || 'Enugu'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {p.serviceAreas.slice(0, 2).join(', ')}
                        {p.serviceAreas.length > 2 ? '...' : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 flex-wrap max-w-xs">
                        {p.capabilities.slice(0, 2).map((cap) => {
                          const capDef = capabilitiesList.find((c) => c.code === cap);
                          return (
                            <span
                              key={cap}
                              className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            >
                              {capDef?.label || cap}
                            </span>
                          );
                        })}
                        {p.capabilities.length > 2 && (
                          <span className="text-[10px] text-slate-400">
                            +{p.capabilities.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        variant={
                          p.status === 'active'
                            ? 'success'
                            : p.status === 'suspended'
                            ? 'warning'
                            : 'danger'
                        }
                        size="sm"
                      >
                        {p.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td
                      className="px-4 py-3.5 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openDetail(p)}
                          className="rounded p-1 text-slate-500 hover:text-orange-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {canAssign && p.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => openAssign(p)}
                            className="rounded p-1 text-slate-500 hover:text-orange-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Assign to Job"
                          >
                            <Wrench className="h-4 w-4" />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            className="rounded p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateServiceProviderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onProviderCreated={(created) => {
          loadProviders();
          openDetail(created);
        }}
      />

      <EditServiceProviderModal
        isOpen={showEditModal}
        provider={selectedProvider}
        onClose={() => setShowEditModal(false)}
        onProviderUpdated={(updated) => {
          loadProviders();
          setSelectedProvider(updated);
        }}
      />

      <ServiceProviderDetailModal
        isOpen={showDetailModal}
        provider={selectedProvider}
        onClose={() => setShowDetailModal(false)}
        onEdit={(p) => {
          setShowDetailModal(false);
          openEdit(p);
        }}
        onDeactivate={(p, action) => {
          setShowDetailModal(false);
          openDeactivate(p, action);
        }}
        onAssignJob={(p) => {
          setShowDetailModal(false);
          openAssign(p);
        }}
        onProviderUpdated={(updated) => {
          setSelectedProvider(updated);
          loadProviders();
        }}
        onViewJob={(jobId) => {
          setShowDetailModal(false);
          if (onNavigateToInstallations) {
            onNavigateToInstallations(jobId);
          }
        }}
      />

      <DeactivateProviderModal
        isOpen={showDeactivateModal}
        provider={selectedProvider}
        targetAction={deactivateAction}
        onClose={() => setShowDeactivateModal(false)}
        onStatusChanged={(_updated) => {
          loadProviders();
        }}
      />

      <AssignJobToProviderModal
        isOpen={showAssignModal}
        provider={selectedProvider}
        onClose={() => setShowAssignModal(false)}
        onJobAssigned={() => {
          loadProviders();
        }}
      />
    </div>
  );
};
