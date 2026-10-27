/**
 * Customer Directory & Accounts Management Panel
 * Module 08: Customer Management
 * XFORCE Construction Management & Customer Platform (Brand: X-FORCE BRICKS)
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Building,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Edit2,
  Eye,
  SlidersHorizontal,
  FileSpreadsheet,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { PERMISSION_CODES } from '../../types/auth';
import { customerService } from '../../services/customer.service';
import { buildWhatsAppInquiryUrl } from '../../utils/customerHelpers';
import {
  Customer,
  CustomerType,
  CustomerStatus,
  CustomerAccountStatus,
  CustomerStats,
  CUSTOMER_TYPE_LABELS,
  CUSTOMER_STATUS_CONFIG,
  ACCOUNT_STATUS_CONFIG,
} from '../../types/customer';
import { CustomerFormModal } from './CustomerFormModal';
import { CustomerDetailModal } from './CustomerDetailModal';
import { CustomerImportModal } from './CustomerImportModal';

export const CustomerManagementPanel: React.FC = () => {
  const toast = useToast();
  const { hasPermission, isAdministrator, profile } = useAuth();

  const canView = Boolean(hasPermission(PERMISSION_CODES.CUSTOMERS_VIEW) || isAdministrator());
  const canCreate = Boolean(hasPermission(PERMISSION_CODES.CUSTOMERS_CREATE) || isAdministrator());
  const canUpdate = Boolean(hasPermission(PERMISSION_CODES.CUSTOMERS_UPDATE) || isAdministrator());

  // Data & State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats>({
    total: 0,
    active: 0,
    inactive: 0,
    suspended: 0,
    withPortalAccount: 0,
    contractors: 0,
    homeowners: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<CustomerType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | 'all'>('all');
  const [accountStatusFilter, setAccountStatusFilter] = useState<CustomerAccountStatus | 'all'>('all');

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const loadData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [list, computedStats] = await Promise.all([
        customerService.listCustomers({
          searchQuery,
          customerType: typeFilter,
          status: statusFilter,
          accountStatus: accountStatusFilter,
        }),
        customerService.getStats(),
      ]);

      setCustomers(list);
      setStats(computedStats);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load customer records.', 'Error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, typeFilter, statusFilter, accountStatusFilter]);

  const handleOpenCreate = () => {
    setCustomerToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setCustomerToEdit(customer);
    setIsFormModalOpen(true);
  };

  const handleOpenDetail = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailModalOpen(true);
  };

  const handleCustomerSaved = (saved: Customer) => {
    loadData();
  };

  const handleExportCsv = () => {
    if (customers.length === 0) {
      toast.info('No customers available to export.', 'Export Notice');
      return;
    }
    customerService.exportCustomersToCsv(customers);
    toast.success(`Exported ${customers.length} customer records to CSV.`, 'Export Started');
  };

  if (!canView) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900 dark:bg-rose-950/40">
        <h3 className="text-sm font-bold text-rose-800 dark:text-rose-300">Access Restricted</h3>
        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
          You do not have permission to view the customer directory. Contact your administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left" id="customer-management-panel">
      {/* 1. Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Customers</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {stats.total}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>{stats.contractors} Contractors</span>
            <span>•</span>
            <span>{stats.homeowners} Homeowners</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Records</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.active}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {stats.inactive} Inactive / Suspended
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Portal Accounts</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
              <Building className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-sky-600 dark:text-sky-400">
            {stats.withPortalAccount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Linked to authenticated self-service
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Unlinked Walk-ins</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-700 dark:text-slate-300">
            {stats.total - stats.withPortalAccount}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Standard business records without login
          </div>
        </div>
      </div>

      {/* 2. Search & Action Controls Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer number, name, company, phone, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => loadData(true)}
              isLoading={isRefreshing}
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              className="text-xs"
              title="Refresh customer list"
            >
              Refresh
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCsv}
              leftIcon={<Download className="h-3.5 w-3.5" />}
              className="text-xs"
            >
              Export CSV
            </Button>

            {canCreate && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsImportModalOpen(true)}
                  leftIcon={<Upload className="h-3.5 w-3.5" />}
                  className="text-xs"
                >
                  Import CSV
                </Button>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleOpenCreate}
                  leftIcon={<UserPlus className="h-3.5 w-3.5" />}
                  className="text-xs"
                >
                  Add Customer
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
            <Filter className="h-3.5 w-3.5" />
            <span>Filter:</span>
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as CustomerType | 'all')}
            className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">All Classifications</option>
            {Object.entries(CUSTOMER_TYPE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CustomerStatus | 'all')}
            className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">All Record Statuses</option>
            <option value="active">Active</option>
            <option value="lead">Lead / Prospect</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="blacklisted">Blacklisted</option>
          </select>

          {/* Account Status Filter */}
          <select
            value={accountStatusFilter}
            onChange={(e) => setAccountStatusFilter(e.target.value as CustomerAccountStatus | 'all')}
            className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
          >
            <option value="all">All Portal Statuses</option>
            <option value="active">Portal Active</option>
            <option value="no_account">Record Only</option>
            <option value="pending">Invite Pending</option>
            <option value="suspended">Portal Suspended</option>
          </select>

          {(searchQuery || typeFilter !== 'all' || statusFilter !== 'all' || accountStatusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('all');
                setStatusFilter('all');
                setAccountStatusFilter('all');
              }}
              className="text-xs text-orange-600 hover:text-orange-700 underline font-medium ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 3. Customer Directory Table (Desktop) / Cards (Mobile) */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {isLoading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
              <p className="text-xs text-slate-500">Loading customers...</p>
            </div>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No Customer Records Found
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                  ? 'No customers match the current filter criteria. Try adjusting your search query.'
                  : 'Start by adding your first building contractor, architect, or homeowner contact.'}
              </p>
            </div>
            {canCreate && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleOpenCreate}
                  leftIcon={<UserPlus className="h-3.5 w-3.5" />}
                >
                  Add Customer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsImportModalOpen(true)}
                  leftIcon={<Upload className="h-3.5 w-3.5" />}
                >
                  Import CSV
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Customer Number</th>
                    <th className="px-4 py-3">Customer / Company</th>
                    <th className="px-4 py-3">Classification</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Record Status</th>
                    <th className="px-4 py-3">Portal Standing</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {customers.map((c) => {
                    const statusCfg = CUSTOMER_STATUS_CONFIG[c.status];
                    const acctCfg = ACCOUNT_STATUS_CONFIG[c.accountStatus];
                    const waUrl = c.whatsappNumber || c.phone
                      ? buildWhatsAppInquiryUrl(c.whatsappNumber || c.phone, `Hello ${c.fullName}, XFORCE message.`)
                      : '#';

                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition cursor-pointer"
                        onClick={() => handleOpenDetail(c)}
                      >
                        {/* Customer Number */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-mono font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 px-2 py-0.5 rounded text-[11px]">
                            {c.customerNumber}
                          </span>
                        </td>

                        {/* Customer & Company */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {c.fullName}
                          </div>
                          {c.companyName && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              <span>{c.companyName}</span>
                            </div>
                          )}
                        </td>

                        {/* Classification */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                            {CUSTOMER_TYPE_LABELS[c.customerType] || c.customerType}
                          </span>
                        </td>

                        {/* Contact */}
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {c.phone}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {c.email && (
                              <span className="text-[11px] text-slate-400 truncate max-w-[140px]" title={c.email}>
                                {c.email}
                              </span>
                            )}
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                            >
                              WhatsApp
                            </a>
                          </div>
                        </td>

                        {/* Location */}
                        <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                          {c.city || c.state ? (
                            <span>{c.city ? `${c.city}, ` : ''}{c.state || 'Nigeria'}</span>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>

                        {/* Record Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusCfg.badgeClass}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dotClass}`} />
                            {statusCfg.label}
                          </span>
                        </td>

                        {/* Portal Standing */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${acctCfg.badgeClass}`}>
                            {acctCfg.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td
                          className="px-4 py-3 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(c)}
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                              title="View details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {canUpdate && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(c)}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                title="Edit profile"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Cards View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {customers.map((c) => {
                const statusCfg = CUSTOMER_STATUS_CONFIG[c.status];
                const acctCfg = ACCOUNT_STATUS_CONFIG[c.accountStatus];

                return (
                  <div
                    key={c.id}
                    onClick={() => handleOpenDetail(c)}
                    className="p-4 space-y-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400">
                            {c.customerNumber}
                          </span>
                          <span className={`rounded-full border px-1.5 py-0.2 text-[9px] font-medium ${statusCfg.badgeClass}`}>
                            {statusCfg.label}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                          {c.fullName}
                        </h4>
                        {c.companyName && (
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            <span>{c.companyName}</span>
                          </div>
                        )}
                      </div>

                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-medium ${acctCfg.badgeClass}`}>
                        {acctCfg.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1 font-medium">
                        <Phone className="h-3 w-3 text-slate-400" />
                        <span>{c.phone}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {c.city || 'Enugu'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 4. Modals */}
      <CustomerFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={handleCustomerSaved}
        customerToEdit={customerToEdit}
        currentStaffUserId={profile?.id}
      />

      <CustomerDetailModal
        isOpen={isDetailModalOpen}
        customer={selectedCustomer}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedCustomer(null);
        }}
        onEdit={(cust) => {
          setIsDetailModalOpen(false);
          handleOpenEdit(cust);
        }}
        onCustomerUpdated={(updated) => {
          setSelectedCustomer(updated);
          loadData();
        }}
        onCustomerDeleted={() => {
          setIsDetailModalOpen(false);
          setSelectedCustomer(null);
          loadData();
        }}
        currentStaffUserId={profile?.id}
        canEdit={canUpdate}
      />

      <CustomerImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportCompleted={() => {
          setIsImportModalOpen(false);
          loadData();
        }}
        currentStaffUserId={profile?.id}
      />
    </div>
  );
};
