/**
 * Approve Expense Modal
 * Module 17 — Staff, Suppliers, Expenses & Basic Finance
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Managerial review modal to approve or reject expenditure vouchers
 * prior to disbursement.
 */

import React, { useState } from 'react';
import { X, ShieldCheck, AlertTriangle, Check, XCircle } from 'lucide-react';
import { BusinessExpense } from '../../types/expense';
import { expenseService } from '../../services/expense.service';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../ui/Toast';

interface ApproveExpenseModalProps {
  expense: BusinessExpense | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ApproveExpenseModal: React.FC<ApproveExpenseModalProps> = ({
  expense,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { profile } = useAuth();
  const toast = useToast();
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !expense) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (decision === 'reject' && !comment.trim()) {
      toast.error('Feedback Required', 'Please provide a reason for rejecting this expenditure voucher.');
      return;
    }

    try {
      setIsSubmitting(true);
      await expenseService.approveOrRejectExpense(
        expense.id,
        {
          approved: decision === 'approve',
          notes: decision === 'approve' ? comment.trim() : undefined,
          rejectionReason: decision === 'reject' ? comment.trim() : undefined,
        },
        {
          id: profile.id,
          fullName: profile.full_name || 'Manager',
        }
      );

      toast.success(
        decision === 'approve' ? 'Voucher Approved' : 'Voucher Rejected',
        `Expense ${expense.expenseNumber} has been ${decision === 'approve' ? 'approved' : 'rejected'}.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Action Failed', err.message || 'Could not process voucher decision.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Managerial Voucher Decision
              </h2>
              <p className="text-xs text-slate-500">
                {expense.expenseNumber} • ₦{expense.amount.toLocaleString()}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Summary Box */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
            <p className="font-bold text-slate-900 dark:text-white">{expense.title}</p>
            <p className="text-slate-500">
              Payee: <span className="font-semibold text-slate-700 dark:text-slate-300">{expense.payeeName}</span>
            </p>
            <p className="text-slate-500">
              Category: <span className="capitalize">{expense.category.replace('_', ' ')}</span> • Date:{' '}
              {expense.dateIncurred}
            </p>
          </div>

          {/* Decision Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Decision
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDecision('approve')}
                className={`p-3 rounded-lg border text-left text-xs transition ${
                  decision === 'approve'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <p className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" /> Approve Voucher
                </p>
                <p className="text-[11px] font-normal text-slate-500 mt-1">
                  Authorize expenditure disbursement.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setDecision('reject')}
                className={`p-3 rounded-lg border text-left text-xs transition ${
                  decision === 'reject'
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-bold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <p className="flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-rose-600" /> Reject Voucher
                </p>
                <p className="text-[11px] font-normal text-slate-500 mt-1">
                  Disallow disbursement with feedback.
                </p>
              </button>
            </div>
          </div>

          {/* Comment / Justification */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {decision === 'approve' ? 'Approval Notes (Optional)' : 'Rejection Reason (Required)'}
            </label>
            <textarea
              rows={2}
              required={decision === 'reject'}
              placeholder={
                decision === 'approve'
                  ? 'e.g. Approved per factory routine maintenance budget.'
                  : 'e.g. Missing supplier tax invoice receipt attachment.'
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Form Actions */}
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
                decision === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-sm'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-sm'
              }`}
            >
              {isSubmitting
                ? 'Processing...'
                : decision === 'approve'
                ? 'Authorize Voucher'
                : 'Reject Voucher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
