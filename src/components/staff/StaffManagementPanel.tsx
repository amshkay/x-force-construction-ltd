/**
 * Staff Directory & RBAC Management Panel
 * Module 17 — Staff, Suppliers, Expenses & Basic Finance
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Primary administrative panel for internal team management,
 * department categorization, and operational personnel status.
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  Briefcase,
  Building2,
  Mail,
  Phone,
  LayoutGrid,
  Table as TableIcon,
  Eye,
  Edit,
  UserX,
  RefreshCw,
} from 'lucide-react';
import {
  StaffMember,
  StaffFilters,
  StaffDepartment,
  StaffEmploymentStatus,
} from '../../types/staff';
import { StaffRoleName, PERMISSION_CODES } from '../../types/auth';
import { UserStatus } from '../../types/database';
import { staffService } from '../../services/staff.service';
import { DEFAULT_STAFF_DEPARTMENTS } from '../../repositories/staff.repository';
import { DEFAULT_DB_ROLES } from '../../config/roles.config';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../ui/Toast';
import { StaffDetailModal } from './StaffDetailModal';
import { CreateStaffModal } from './CreateStaffModal';
import { EditStaffModal } from './EditStaffModal';
import { DeactivateStaffModal } from './DeactivateStaffModal';

export const StaffManagementPanel: React.FC = () => {
  const { hasPermission, isAdministrator } = useAuth();
  const toast = useToast();

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [activeTab, setActiveTab] = useState<'directory' | 'roles'>('directory');

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<StaffDepartment | 'all'>('all');
  const [roleFilter, setRoleFilter] = useState<StaffRoleName | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');
  const [employmentFilter, setEmploymentFilter] = useState<StaffEmploymentStatus | 'all'>('all');

  // Modals state
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);

  const canManage = isAdministrator() || hasPermission(PERMISSION_CODES.STAFF_MANAGE);
  const canCreate = isAdministrator() || hasPermission(PERMISSION_CODES.STAFF_CREATE) || canManage;

  const loadStaff = async () => {
    try {
      setIsLoading(true);
      const filters: StaffFilters = {
        searchQuery: searchQuery.trim() || undefined,
        department: departmentFilter !== 'all' ? departmentFilter : undefined,
        roleName: roleFilter !== 'all' ? roleFilter : undefined,
        accountStatus: statusFilter !== 'all' ? statusFilter : undefined,
        employmentStatus: employmentFilter !== 'all' ? employmentFilter : undefined,
      };
      const data = await staffService.getAllStaff(filters);
      setStaffList(data);
    } catch (err: any) {
      toast.error('Error', 'Failed to load staff list.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, [searchQuery, departmentFilter, roleFilter, statusFilter, employmentFilter]);

  const handleExportCSV = () => {
    const headers = [
      'Staff Number',
      'Full Name',
      'Email',
      'Phone',
      'Role',
      'Job Title',
      'Department',
      'Account Status',
      'Employment Status',
      'Date of Joining',
    ];

    const rows = staffList.map((s) => [
      s.staffNumber,
      `"${s.fullName.replace(/"/g, '""')}"`,
      s.email,
      s.phone,
      s.roleDisplayName,
      `"${s.jobTitle.replace(/"/g, '""')}"`,
      s.department,
      s.accountStatus,
      s.employmentStatus,
      s.dateOfJoining || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `xforce_staff_directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Export Complete', 'Staff directory downloaded as CSV.');
  };

  // Stat metrics
  const totalStaff = staffList.length;
  const activeStaff = staffList.filter((s) => s.accountStatus === 'active').length;
  const suspendedStaff = staffList.filter((s) => s.accountStatus === 'suspended').length;
  const inactiveStaff = staffList.filter((s) => s.accountStatus === 'inactive').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Personnel */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Personnel
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalStaff}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Across {DEFAULT_STAFF_DEPARTMENTS.length} departments</p>
          </div>
          <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Active Accounts */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Authorized
            </p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {activeStaff}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Full system access enabled</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Suspended Accounts */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Suspended Accounts
            </p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              {suspendedStaff}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Access temporarily frozen</p>
          </div>
          <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Inactive Accounts */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Inactive / Departed
            </p>
            <p className="text-2xl font-bold text-slate-600 dark:text-slate-300 mt-1">
              {inactiveStaff}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Historical logs intact</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs and Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'directory'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            Staff Directory ({staffList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'roles'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            RBAC Roles & Permissions
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === 'directory' && (
            <>
              {/* View toggle */}
              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 bg-white dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded ${
                    viewMode === 'table' ? 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Table View"
                >
                  <TableIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded ${
                    viewMode === 'cards' ? 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Cards View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>

              {/* Export */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </>
          )}

          {canCreate && (
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              Onboard Staff Member
            </button>
          )}
        </div>
      </div>

      {activeTab === 'directory' ? (
        <>
          {/* Search & Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Search input */}
              <div className="lg:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by name, staff number, email, phone, job..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              {/* Department filter */}
              <div>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value as StaffDepartment | 'all')}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="all">All Departments</option>
                  {DEFAULT_STAFF_DEPARTMENTS.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Role filter */}
              <div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as StaffRoleName | 'all')}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="all">All Roles</option>
                  {DEFAULT_DB_ROLES.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.display_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as UserStatus | 'all')}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="all">All Account States</option>
                  <option value="active">Active Only</option>
                  <option value="suspended">Suspended Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Directory Listings */}
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-orange-600" />
              <p className="text-xs">Loading personnel directory...</p>
            </div>
          ) : staffList.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No staff members found
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Try adjusting your search criteria or register a new team member.
              </p>
            </div>
          ) : viewMode === 'table' ? (
            /* Table View */
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Department & Title</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Role (RBAC)</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {staffList.map((s) => (
                      <tr
                        key={s.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-xs shrink-0">
                              {s.fullName
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .substring(0, 2)
                                .toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                {s.fullName}
                              </p>
                              <span className="text-[11px] font-mono text-orange-600 dark:text-orange-400 font-medium">
                                {s.staffNumber}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-800 dark:text-slate-200">{s.jobTitle}</p>
                          <span className="text-[11px] text-slate-400 capitalize">
                            {s.department} • {s.employmentStatus.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <p className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">{s.email}</p>
                          <a
                            href={`tel:${s.phone}`}
                            className="text-[11px] text-orange-600 dark:text-orange-400 hover:underline"
                          >
                            {s.phone}
                          </a>
                        </td>

                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                            {s.roleDisplayName}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {s.accountStatus === 'active' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active
                            </span>
                          ) : s.accountStatus === 'suspended' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                              Suspended
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                              Inactive
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStaff(s);
                                setDetailModalOpen(true);
                              }}
                              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
                              title="View Details & History"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {canManage && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedStaff(s);
                                    setEditModalOpen(true);
                                  }}
                                  className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-orange-600"
                                  title="Edit Profile"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedStaff(s);
                                    setDeactivateModalOpen(true);
                                  }}
                                  className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-600"
                                  title="Change Status"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Cards View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {staffList.map((s) => (
                <div
                  key={s.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4 hover:border-orange-300 dark:hover:border-orange-900 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-sm shrink-0">
                          {s.fullName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .substring(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                            {s.fullName}
                          </h3>
                          <span className="text-[11px] font-mono text-orange-600 dark:text-orange-400 font-semibold">
                            {s.staffNumber}
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {s.department}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-xs">
                      <p className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        {s.jobTitle}
                      </p>
                      <p className="text-slate-500 flex items-center gap-1.5 font-mono">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {s.email}
                      </p>
                      <p className="text-slate-500 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {s.phone}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                      {s.roleDisplayName}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStaff(s);
                          setDetailModalOpen(true);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                      >
                        Profile
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* RBAC Roles Matrix Tab */
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-600" />
              Role-Based Access Control Architecture
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Pre-configured, non-tamperable role permissions synchronized with database security policies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEFAULT_DB_ROLES.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {r.display_name}
                  </span>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                    {r.name}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {r.description}
                </p>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
                  <span>Assigned Staff:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {staffList.filter((s) => s.roleName === r.name).length} members
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <StaffDetailModal
        staff={selectedStaff}
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedStaff(null);
        }}
        onEdit={(staff) => {
          setSelectedStaff(staff);
          setEditModalOpen(true);
        }}
        onStatusChange={(staff) => {
          setSelectedStaff(staff);
          setDeactivateModalOpen(true);
        }}
        onRefresh={loadStaff}
      />

      <CreateStaffModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={loadStaff}
      />

      <EditStaffModal
        staff={selectedStaff}
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedStaff(null);
        }}
        onSuccess={loadStaff}
      />

      <DeactivateStaffModal
        staff={selectedStaff}
        isOpen={deactivateModalOpen}
        onClose={() => {
          setDeactivateModalOpen(false);
          setSelectedStaff(null);
        }}
        onSuccess={loadStaff}
      />
    </div>
  );
};
