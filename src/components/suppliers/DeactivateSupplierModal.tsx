/**
 * Deactivate Supplier Modal
 * Module 17 — Staff, Suppliers, Expenses & Basic Finance
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Confirmation modal for deactivating or suspending a supplier
 * preserving historical purchase orders and inventory intake logs.
 */

import React, { useState } from 'react';
import { X, AlertTriangle, ShieldAlert, CheckCircle2, UserX, Truck } from 'lucide-react';
import { Supplier, SupplierStatus } from '../../types/supplier';
import { supplierService } from '../../services/supplier.service';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../ui/Toast';

interface DeactivateSupplierModalProps {
  supplier: Supplier | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeactivateSupplierModal: React.FC<DeactivateSupplierModalProps> = ({
  supplier,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { profile } = useAuth();
  const toast = useToast();
  const [targetStatus, setTargetStatus] = useState<SupplierStatus>('suspended');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !supplier) return null;

  const isCurrentlyActive = supplier.status === 'active';

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setIsSubmitting(true);
      await supplierService.setSupplierStatus(
        supplier.id,
        isCurrentlyActive ? targetStatus : 'active',
        profile.id,
        reason.trim() || undefined
      );

      toast.success(
        'Supplier Status Updated',
        `${supplier.name} (${supplier.supplierNumber}) is now ${isCurrentlyActive ? targetStatus : 'active'}.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Action Failed', err.message || 'Could not update supplier status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg ${
                isCurrentlyActive
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                  : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
              }`}
            >
              {isCurrentlyActive ? <UserX className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isCurrentlyActive ? 'Change Vendor Status' : 'Reactivate Supplier'}
              </h2>
              <p className="text-xs text-slate-500">
                {supplier.name} • {supplier.supplierNumber}
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
                  Preserved Purchasing History
                </p>
                <p>
                  Deactivating this vendor prevents new procurement vouchers and intake allocations, while
                  preserving all previous inventory waybills and accounts payable records.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target State
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
                      Temporary freeze due to quality snags or price disputes.
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
                      Defunct or discontinued supplier.
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Status Modification (Audit Log)
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Quality audit failed on last sand haulage delivery / Contract expired"
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
                Restore Active Purchasing Status
              </p>
              <p>
                Re-enabling this supplier will allow warehouse managers to record new raw material intake and
                issue purchasing payment vouchers.
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
                : 'Reactivate Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
