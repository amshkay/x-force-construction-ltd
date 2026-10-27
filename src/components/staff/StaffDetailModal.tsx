/**
 * Staff Detail Modal
 * Module 17 — Staff, Suppliers, Expenses & Basic Finance
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Detailed profile modal showcasing internal credentials, department assignment,
 * emergency contacts, and cross-module operational activity statistics.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Shield,
  Briefcase,
  Calendar,
  Warehouse,
  Receipt,
  Wrench,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit,
  UserX,
} from 'lucide-react';
import { StaffMember, StaffOperationalSummary } from '../../types/staff';
import { staffService } from '../../services/staff.service';
import { useAuth } from '../../hooks/useAuth';
import { PERMISSION_CODES } from '../../types/auth';
import { useToast } from '../ui/Toast';

interface StaffDetailModalProps {
  staff: StaffMember | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (staff: StaffMember) => void;
  onStatusChange: (staff: StaffMember) => void;
  onRefresh: () => void;
}

export const StaffDetailModal: React.FC<StaffDetailModalProps> = ({
  staff,
  isOpen,
  onClose,
  onEdit,
  onStatusChange,
  onRefresh,
}) => {
  const { hasPermission, isAdministrator, profile: currentProfile } = useAuth();
  const toast = useToast();
  const [operationalSummary, setOperationalSummary] = useState<StaffOperationalSummary | null>(null);
  const [isLoadingOps, setIsLoadingOps] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  useEffect(() => {
    if (isOpen && staff) {
      setIsLoadingOps(true);
      staffService
        .getStaffOperationalSummary(staff.id)
        .then((summary) => setOperationalSummary(summary))
        .catch(() => setOperationalSummary(null))
        .finally(() => setIsLoadingOps(false));
    }
  }, [isOpen, staff]);

  if (!isOpen || !staff) return null;

  const canManageStaff = isAdministrator() || hasPermission(PERMISSION_CODES.STAFF_MANAGE);
  const isSelf = currentProfile?.id === staff.id;

  const handleRequirePasswordReset = async () => {
    if (!currentProfile) return;
    try {
      setIsResettingPassword(true);
      const res = await staffService.resetStaffToTemporaryPassword(staff.id, currentProfile.id);
      toast.success(
        'Credentials Reset',
        res.message
      );
      onRefresh();
    } catch (err: any) {
      toast.error('Action Failed', err.message || 'Could not reset staff credentials.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Active
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <AlertTriangle className="w-3.5 h-3.5" />
            Suspended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            <Clock className="w-3.5 h-3.5" />
            Inactive
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 border-b border-slate-800">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-orange-600/20 border-2 border-orange-500 flex items-center justify-center text-orange-400 font-bold text-xl shadow-inner">
                {staff.fullName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-bold tracking-tight text-white">{staff.fullName}</h2>
                  <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-orange-400">
                    {staff.staffNumber}
                  </span>
                  {getStatusBadge(staff.accountStatus)}
                </div>
                <p className="text-sm text-slate-300 mt-1 flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-orange-400" />
                  <span>{staff.jobTitle}</span>
                  <span className="text-slate-600">•</span>
                  <span className="capitalize">{staff.department} Department</span>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Grid of Key Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contact Details Card */}
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-orange-500" />
                Contact Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
                  <span className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Email Address
                  </span>
                  <span className="font-medium font-mono text-xs select-all">{staff.email}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700 dark:text-slate-200">
                  <span className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Mobile Phone
                  </span>
                  <a
                    href={`tel:${staff.phone}`}
                    className="font-medium text-orange-600 dark:text-orange-400 hover:underline"
                  >
                    {staff.phone}
                  </a>
                </div>
                {staff.emergencyContactName && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
                    <p className="text-xs text-slate-500">Emergency Contact</p>
                    <p className="font-medium text-slate-800 dark:text-slate-200 text-xs mt-0.5">
                      {staff.emergencyContactName} ({staff.emergencyContactPhone || 'No phone'})
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Employment & Role Card */}
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-orange-500" />
                Role & Employment
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">System Role</span>
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                    {staff.roleDisplayName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Employment Basis</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 capitalize text-xs">
                    {staff.employmentStatus.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Date Joined
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                    {staff.dateOfJoining || staff.createdAt.split('T')[0]}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Password Setup</span>
                  <span
                    className={`text-xs font-medium ${
                      staff.passwordSetupRequired ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-500'
                    }`}
                  >
                    {staff.passwordSetupRequired ? 'Required on Next Login' : 'Configured'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Relationships Section */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-orange-600" />
                Cross-Module Operational Activity
              </h3>
              {isLoadingOps && (
                <span className="text-[11px] text-slate-400 animate-pulse">Syncing logs...</span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Warehouse Yard Activity */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  <Warehouse className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Warehouse Picking
                  </p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {operationalSummary?.completedWarehouseTasksCount ?? 0}
                    <span className="text-xs text-slate-400 font-normal">
                      {' '}
                      / {operationalSummary?.assignedWarehouseTasksCount ?? 0} tasks
                    </span>
                  </p>
                </div>
              </div>

              {/* POS Sales Counter Activity */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    POS Sales Settled
                  </p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    ₦{(operationalSummary?.totalPosSalesVolume ?? 0).toLocaleString()}
                    <span className="text-xs text-slate-400 font-normal">
                      {' '}
                      ({operationalSummary?.posSalesCount ?? 0} bills)
                    </span>
                  </p>
                </div>
              </div>

              {/* Installation Field Activity */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Site Service Jobs
                  </p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {operationalSummary?.completedInstallationJobsCount ?? 0}
                    <span className="text-xs text-slate-400 font-normal">
                      {' '}
                      / {operationalSummary?.assignedInstallationJobsCount ?? 0} jobs
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Internal Notes */}
          {staff.notes && (
            <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">
                Internal Administrative Notes:
              </p>
              <p className="text-xs text-amber-900 dark:text-amber-200/80 whitespace-pre-wrap">
                {staff.notes}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {canManageStaff && !isSelf && (
              <button
                type="button"
                onClick={handleRequirePasswordReset}
                disabled={isResettingPassword}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                {isResettingPassword ? 'Flagging...' : 'Force Password Reset'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canManageStaff && !isSelf && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStatusChange(staff);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
              >
                <UserX className="w-3.5 h-3.5" />
                Change Status
              </button>
            )}

            {canManageStaff && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(staff);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white transition shadow-sm"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit Profile
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
