/**
 * Deactivate Staff Modal
 * Module 17 — Staff, Suppliers, Expenses & Basic Finance
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Confirmation modal for deactivating or suspending a staff member account
 * ensuring existing operational linkages and historical logs remain intact.
 */

import React, { useState } from 'react';
import { X, AlertTriangle, ShieldAlert, CheckCircle2, UserX } from 'lucide-react';
import { StaffMember } from '../../types/staff';
import { UserStatus } from '../../types/database';
import { staffService } from '../../services/staff.service';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../ui/Toast';

interface DeactivateStaffModalProps {
  staff: StaffMember | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeactivateStaffModal: React.FC<DeactivateStaffModalProps> = ({
  staff,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { profile } = useAuth();
  const toast = useToast();
  const [targetStatus, setTargetStatus] = useState<UserStatus>('suspended');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !staff) return null;

  const isCurrentlyActive = staff.accountStatus === 'active';

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setIsSubmitting(true);
      await staffService.updateStaffStatus(
        staff.id,
        isCurrentlyActive ? targetStatus : 'active',
        profile.id,
        reason.trim() || undefined
      );

      toast.success(
        'Staff Status Updated',
        `${staff.fullName} (${staff.staffNumber}) is now ${isCurrentlyActive ? targetStatus : 'active'}.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Action Failed', err.message || 'Could not update staff status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${isCurrentlyActive ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'}`}>
              {isCurrentlyActive ? <UserX className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isCurrentlyActive ? 'Modify Staff Account Access' : 'Reactivate Staff Account'}
              </h2>
              <p className="text-xs text-slate-500">
                {staff.fullName} • {staff.staffNumber}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleStatusChange} className="p-5 space-y-4">
          {isCurrentlyActive ? (
            <>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-200/90 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  Preserved Operational Integrity
                </p>
                <p>
                  Staff records are never deleted. All past sales, warehouse picks, and installation job
                  assignments will permanently reference this personnel record.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Target Account State
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetStatus('suspended')}
                    className={`p-3 rounded-lg border text-left text-xs transition ${
                      targetStatus === 'suspended'
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <p className="font-bold flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> Suspended
                    </p>
                    <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-1">
                      Temporary freeze of system access pending review.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetStatus('inactive')}
                    className={`p-3 rounded-lg border text-left text-xs transition ${
                      targetStatus === 'inactive'
                        ? 'border-slate-500 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <p className="font-bold">Inactive</p>
                    <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-1">
                      Separated or departed personnel.
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Status Change (Recorded in Audit Logs)
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. End of contract period / Leave of absence"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </>
          ) : (
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 space-y-2">
              <p className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Reactivate Account Access
              </p>
              <p>
                Re-enabling this account will restore full system login privileges under their assigned role (
                {staff.roleDisplayName}).
              </p>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-1.5 text-xs font-semibold text-white rounded-lg transition disabled:opacity-50 ${
                isCurrentlyActive
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-sm'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-sm'
              }`}
            >
              {isSubmitting
                ? 'Updating...'
                : isCurrentlyActive
                ? `Confirm ${targetStatus === 'suspended' ? 'Suspension' : 'Deactivation'}`
                : 'Reactivate Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
