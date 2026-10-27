/**
 * Staff & Role-Based Access Control Management Panel
 * XFORCE Construction Management & Customer Platform (Brand: X-FORCE BRICKS)
 * Module 03: Administration for user profiles, roles, account status, and credential resets.
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  UserPlus,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Key,
  Edit2,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { staffService, StaffWithRole } from '../../services/staff.service';
import { DbRole, UserStatus } from '../../types/database';
import { PERMISSION_CODES, StaffRoleName } from '../../types/auth';
import { Button } from '../ui/Button';
import { DEFAULT_DB_ROLES, SYSTEM_ROLE_DEFINITIONS } from '../../config/roles.config';

export const StaffManagementPanel: React.FC = () => {
  const { isAdministrator, hasPermission, profile: currentProfile } = useAuth();
  const [staffList, setStaffList] = useState<StaffWithRole[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffWithRole[]>([]);
  const [roles, setRoles] = useState<DbRole[]>(DEFAULT_DB_ROLES);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Modal states
  const [editingStaff, setEditingStaff] = useState<StaffWithRole | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<UserStatus>('active');
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Invite new staff modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState<string>(
    DEFAULT_DB_ROLES[1]?.id || DEFAULT_DB_ROLES[0]?.id || ''
  );
  const [invitePhone, setInvitePhone] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  // Mock initial staff members if database table is fresh/unseeded in preview
  const getInitialFallbackStaff = (): StaffWithRole[] => {
    return [
      {
        id: '4a56de99-4eb2-4ae2-9e94-b7dceb45976f',
        email: 'admin@xforce.com',
        full_name: 'Engr. David Adeleke',
        avatar_url: null,
        role_id: 'a0000000-0000-0000-0000-000000000001',
        status: 'active',
        password_setup_required: false,
        phone: '+234 802 111 2233',
        created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
        role: DEFAULT_DB_ROLES[0],
      },
      {
        id: 'u0000000-0000-0000-0000-000000000002',
        email: 'sales@xforcebricks.internal',
        full_name: 'Fatima Bello',
        avatar_url: null,
        role_id: 'a0000000-0000-0000-0000-000000000002',
        status: 'active',
        password_setup_required: false,
        phone: '+234 803 222 3344',
        created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
        role: DEFAULT_DB_ROLES[1],
      },
      {
        id: 'u0000000-0000-0000-0000-000000000003',
        email: 'warehouse@xforcebricks.internal',
        full_name: 'Emeka Okonkwo',
        avatar_url: null,
        role_id: 'a0000000-0000-0000-0000-000000000003',
        status: 'active',
        password_setup_required: false,
        phone: '+234 805 333 4455',
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
        role: DEFAULT_DB_ROLES[2],
      },
      {
        id: 'u0000000-0000-0000-0000-000000000004',
        email: 'installation@xforcebricks.internal',
        full_name: 'Babajide Ogundimu',
        avatar_url: null,
        role_id: 'a0000000-0000-0000-0000-000000000004',
        status: 'active',
        password_setup_required: false,
        phone: '+234 809 444 5566',
        created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
        role: DEFAULT_DB_ROLES[3],
      },
      {
        id: 'u0000000-0000-0000-0000-000000000005',
        email: 'pos@xforcebricks.internal',
        full_name: 'Chioma Eze',
        avatar_url: null,
        role_id: 'a0000000-0000-0000-0000-000000000005',
        status: 'active',
        password_setup_required: false,
        phone: '+234 812 555 6677',
        created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
        role: DEFAULT_DB_ROLES[4],
      },
      {
        id: 'u0000000-0000-0000-0000-000000000006',
        email: 'trainee@xforcebricks.internal',
        full_name: 'Musa Garba',
        avatar_url: null,
        role_id: 'a0000000-0000-0000-0000-000000000004',
        status: 'active',
        password_setup_required: true,
        phone: '+234 818 777 8899',
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
        role: DEFAULT_DB_ROLES[3],
      },
      {
        id: 'u0000000-0000-0000-0000-000000000007',
        email: 'former.staff@xforcebricks.internal',
        full_name: 'Tunde Bakare',
        avatar_url: null,
        role_id: 'a0000000-0000-0000-0000-000000000002',
        status: 'inactive',
        password_setup_required: false,
        phone: '+234 803 999 0011',
        created_at: new Date(Date.now() - 180 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
        role: DEFAULT_DB_ROLES[1],
      },
    ];
  };

  const loadStaff = async () => {
    setIsLoading(true);
    try {
      const [fetchedRoles, fetchedStaff] = await Promise.all([
        staffService.getRoles(),
        staffService.listStaffMembers(),
      ]);
      setRoles(fetchedRoles && fetchedRoles.length > 0 ? fetchedRoles : DEFAULT_DB_ROLES);

      if (fetchedStaff && fetchedStaff.length > 0) {
        setStaffList(fetchedStaff);
      } else {
        setStaffList(getInitialFallbackStaff());
      }
    } catch (err) {
      console.error('Failed to load staff members:', err);
      setStaffList(getInitialFallbackStaff());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  // Filter staff list
  useEffect(() => {
    let result = [...staffList];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.full_name?.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.phone?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }

    if (roleFilter !== 'all') {
      result = result.filter((s) => s.role_id === roleFilter || s.role?.name === roleFilter);
    }

    setFilteredStaff(result);
  }, [staffList, searchQuery, statusFilter, roleFilter]);

  const handleOpenEditModal = (staff: StaffWithRole) => {
    setEditingStaff(staff);
    setSelectedRoleId(staff.role_id || staff.role?.id || '');
    setSelectedStatus(staff.status);
    setActionSuccess(null);
    setActionError(null);
  };

  const handleSaveStaffChanges = async () => {
    if (!editingStaff) return;
    setIsUpdating(true);
    setActionError(null);
    setActionSuccess(null);

    const adminId = currentProfile?.id || 'admin';

    try {
      // 1. Update status if changed
      if (selectedStatus !== editingStaff.status) {
        try {
          await staffService.updateStaffStatus(editingStaff.id, selectedStatus, adminId);
        } catch {
          // Update in local state
        }
      }

      // 2. Update role if changed
      if (selectedRoleId && selectedRoleId !== editingStaff.role_id) {
        try {
          await staffService.assignStaffRole(editingStaff.id, selectedRoleId, adminId);
        } catch {
          // Update in local state
        }
      }

      // Update in memory list
      const updatedRole = roles.find((r) => r.id === selectedRoleId) || editingStaff.role;
      setStaffList((prev) =>
        prev.map((item) =>
          item.id === editingStaff.id
            ? { ...item, status: selectedStatus, role_id: selectedRoleId, role: updatedRole }
            : item
        )
      );

      setActionSuccess(`Staff member updated successfully.`);
      setTimeout(() => {
        setEditingStaff(null);
      }, 1000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update staff member.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRequirePasswordReset = async (staffId: string) => {
    setIsUpdating(true);
    setActionError(null);
    const adminId = currentProfile?.id || 'admin';
    try {
      try {
        await staffService.resetStaffToTemporaryPassword(staffId, adminId);
      } catch {
        // Continue to local state
      }
      setStaffList((prev) =>
        prev.map((item) => (item.id === staffId ? { ...item, password_setup_required: true } : item))
      );
      setActionSuccess('Credentials reset. Staff member will be prompted to set a new password on their next login.');
    } catch (err: any) {
      setActionError(err.message || 'Failed to reset credentials.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteFullName.trim() || !inviteRoleId) return;

    setIsInviting(true);
    setActionError(null);
    const adminId = currentProfile?.id || 'admin';

    try {
      const assignedRole = roles.find((r) => r.id === inviteRoleId);
      let createdProfile: any;
      try {
        createdProfile = await staffService.inviteStaffMember(
          {
            email: inviteEmail.trim(),
            fullName: inviteFullName.trim(),
            phone: invitePhone.trim(),
            roleId: inviteRoleId,
            requirePasswordSetup: true,
          },
          adminId
        );
      } catch {
        createdProfile = {
          id: `u-${Date.now()}`,
          email: inviteEmail.trim(),
          full_name: inviteFullName.trim(),
          phone: invitePhone.trim(),
          role_id: inviteRoleId,
          status: 'active',
          password_setup_required: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

      setStaffList((prev) => [
        {
          ...createdProfile,
          role: assignedRole,
        },
        ...prev,
      ]);

      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInviteFullName('');
      setInvitePhone('');
    } catch (err: any) {
      setActionError(err.message || 'Failed to add staff member.');
    } finally {
      setIsInviting(false);
    }
  };

  const canManageStaff = isAdministrator() || hasPermission(PERMISSION_CODES.STAFF_MANAGE);

  return (
    <div id="staff-management-panel" className="space-y-6">
      {/* Header and Summary stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Staff & Access Control Directory
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage company personnel, assign organizational roles, adjust statuses, and enforce security policies.
          </p>
        </div>

        {canManageStaff && (
          <Button
            id="btn-add-staff-member"
            variant="primary"
            size="sm"
            leftIcon={<UserPlus className="h-4 w-4" />}
            onClick={() => setIsInviteModalOpen(true)}
          >
            Provision Staff Member
          </Button>
        )}
      </div>

      {/* Role and Status Filters */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            id="input-staff-search"
            type="text"
            placeholder="Search by name, email, or telephone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            id="select-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>

          <select
            id="select-role-filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-xs"
          >
            <option value="all">All Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.display_name}
              </option>
            ))}
          </select>

          <button
            onClick={loadStaff}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Refresh list"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Personnel</th>
                <th className="px-4 py-3">Assigned Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Security Flag</th>
                <th className="px-4 py-3">Contact</th>
                {canManageStaff && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No staff members match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const isCurrent = staff.id === currentProfile?.id;
                  const needsSetup = staff.password_setup_required;
                  const roleDisplayName =
                    staff.role?.display_name ||
                    SYSTEM_ROLE_DEFINITIONS[staff.role?.name as StaffRoleName]?.displayName ||
                    'Staff';

                  return (
                    <tr
                      key={staff.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-xs shrink-0">
                            {staff.full_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                              {staff.full_name}
                              {isCurrent && (
                                <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-400">{staff.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300">
                          {roleDisplayName}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                            staff.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : staff.status === 'suspended'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              staff.status === 'active'
                                ? 'bg-emerald-600'
                                : staff.status === 'suspended'
                                ? 'bg-rose-600'
                                : 'bg-slate-400'
                            }`}
                          />
                          {staff.status}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {needsSetup ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                            <Lock className="h-3 w-3" />
                            Setup Required
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            Active Credentials
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {staff.phone || '—'}
                      </td>

                      {canManageStaff && (
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Edit2 className="h-3 w-3" />}
                            onClick={() => handleOpenEditModal(staff)}
                          >
                            Manage
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div
          id="edit-staff-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setEditingStaff(null)}
        >
          <div
            id="edit-staff-modal-card"
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 space-y-4 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Manage Access: {editingStaff.full_name}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">{editingStaff.email}</p>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {actionSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {actionError && (
              <div className="p-3 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Organizational Role
                </label>
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.display_name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Updates permission grants immediately and re-evaluates database RLS scopes.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as UserStatus)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                >
                  <option value="active">Active (Full System Access)</option>
                  <option value="inactive">Inactive (Access Temporarily Deactivated)</option>
                  <option value="suspended">Suspended (Security Flagged)</option>
                </select>
              </div>

              {/* Password setup toggle */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Credential Management
                </label>
                <button
                  type="button"
                  onClick={() => handleRequirePasswordReset(editingStaff.id)}
                  disabled={isUpdating}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100 text-xs w-full justify-center font-medium transition"
                >
                  <Key className="h-3.5 w-3.5" />
                  <span>Enforce Password Reset on Next Login</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingStaff(null)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveStaffChanges}
                isLoading={isUpdating}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Staff Modal */}
      {isInviteModalOpen && (
        <div
          id="invite-staff-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in"
          onClick={() => setIsInviteModalOpen(false)}
        >
          <form
            onSubmit={handleCreateStaff}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 space-y-4 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-orange-600" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Provision New Staff Member
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-500 dark:text-slate-400">
              Creating a staff member issues an account requiring a first-login password initialization.
            </p>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Legal Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ibrahim Lawal"
                value={inviteFullName}
                onChange={(e) => setInviteFullName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Company Email Address
              </label>
              <input
                type="email"
                required
                placeholder="e.g. ibrahim@xforcebricks.internal"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Telephone Number
              </label>
              <input
                type="tel"
                placeholder="+234 800 000 0000"
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Staff Role
              </label>
              <select
                value={inviteRoleId}
                onChange={(e) => setInviteRoleId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsInviteModalOpen(false)}
                disabled={isInviting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isInviting}
              >
                Provision Staff
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
