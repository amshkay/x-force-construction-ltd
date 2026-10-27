/**
 * Expense Detail Modal
 * Module 17 — Staff, Suppliers, Expenses & Basic Finance
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Comprehensive expense voucher modal with receipt preview,
 * vendor payee reference, audit approval trail, and disbursement actions.
 */

import React from 'react';
import {
  X,
  CreditCard,
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  ExternalLink,
  Edit,
  DollarSign,
  Tag,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { BusinessExpense } from '../../types/expense';
import { useAuth } from '../../hooks/useAuth';
import { PERMISSION_CODES } from '../../types/auth';

interface ExpenseDetailModalProps {
  expense: BusinessExpense | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (expense: BusinessExpense) => void;
  onApproveReject: (expense: BusinessExpense) => void;
  onMarkPaid: (expense: BusinessExpense) => void;
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  expense,
  isOpen,
  onClose,
  onEdit,
  onApproveReject,
  onMarkPaid,
}) => {
  const { hasPermission, isAdministrator } = useAuth();

  if (!isOpen || !expense) return null;

  const canApprove =
    isAdministrator() ||
    hasPermission(PERMISSION_CODES.EXPENSES_APPROVE) ||
    hasPermission(PERMISSION_CODES.EXPENSES_MANAGE);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Disbursed & Paid
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <ShieldCheck className="w-3.5 h-3.5" /> Approved by Management
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <AlertTriangle className="w-3.5 h-3.5" /> Rejected Voucher
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" /> Pending Review
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 border-b border-slate-800">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-orange-400">
                  {expense.expenseNumber}
                </span>
                {getStatusBadge(expense.status)}
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white mt-2">{expense.title}</h2>
              <p className="text-2xl font-black text-orange-400 mt-1">
                ₦{expense.amount.toLocaleString()}
              </p>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Key Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-orange-500" /> Cost Category
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                  {expense.category.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-orange-500" /> Date Incurred
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {expense.dateIncurred}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-orange-500" /> Payment Method
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                  {expense.paymentMethod.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-orange-500" /> Payee / Beneficiary
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {expense.payeeName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Beneficiary Type</span>
                <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium capitalize text-[11px]">
                  {expense.payeeType.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Invoice / Receipt Ref</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {expense.receiptReference || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          {expense.description && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                Expenditure Description:
              </span>
              <p className="text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap">
                {expense.description}
              </p>
            </div>
          )}

          {/* Receipt Attachment Section */}
          {expense.receiptAttachmentUrl && (
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-orange-500" />
                  Attached Receipt / Payment Voucher Proof
                </span>
                <a
                  href={expense.receiptAttachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Full Resolution
                </a>
              </div>

              <div className="max-h-60 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                <img
                  src={expense.receiptAttachmentUrl}
                  alt={`Receipt proof for ${expense.expenseNumber}`}
                  className="max-h-60 w-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}

          {/* Audit & Approval Trail */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
            <h4 className="font-bold uppercase tracking-wider text-slate-500 text-[11px]">
              Audit Trail & Governance
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
              <div>
                <span className="text-slate-400">Recorded By:</span>{' '}
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {expense.recordedByName}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Recorded On:</span>{' '}
                <span>{new Date(expense.createdAt).toLocaleString()}</span>
              </div>
              {expense.approvedByName && (
                <div>
                  <span className="text-slate-400">Reviewed By:</span>{' '}
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {expense.approvedByName}
                  </span>
                </div>
              )}
              {expense.approvedAt && (
                <div>
                  <span className="text-slate-400">Decision Date:</span>{' '}
                  <span>{new Date(expense.approvedAt).toLocaleString()}</span>
                </div>
              )}
            </div>

            {expense.rejectionReason && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400">
                <span className="font-semibold">Rejection Feedback:</span> {expense.rejectionReason}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div>
            {expense.status === 'pending' && canApprove && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onApproveReject(expense);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Review & Approve
              </button>
            )}

            {expense.status === 'approved' && canApprove && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onMarkPaid(expense);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-sm"
              >
                <DollarSign className="w-3.5 h-3.5" />
                Disburse & Mark as Paid
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {expense.status !== 'paid' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(expense);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit Voucher
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
