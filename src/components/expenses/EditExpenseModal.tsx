/**
 * Edit Expense Modal
 * Module 17 — Staff, Suppliers, Expenses & Basic Finance
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Form modal to update pending or un-disbursed expense vouchers.
 */

import React, { useState, useEffect } from 'react';
import { X, Edit, CreditCard, Tag, DollarSign, Calendar, Upload } from 'lucide-react';
import {
  BusinessExpense,
  UpdateExpenseDTO,
  ExpenseCategory,
  ExpensePaymentMethod,
} from '../../types/expense';
import { expenseService } from '../../services/expense.service';
import { mediaService } from '../../services/media.service';
import { DEFAULT_EXPENSE_CATEGORIES } from '../../repositories/expense.repository';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../ui/Toast';
import { ImageInputWithUpload } from '../ui/ImageInputWithUpload';

interface EditExpenseModalProps {
  expense: BusinessExpense | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  expense,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { profile } = useAuth();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState<UpdateExpenseDTO>({
    title: '',
    description: '',
    category: 'fuel_utilities',
    amount: 0,
    dateIncurred: '',
    paymentMethod: 'bank_transfer',
    payeeName: '',
    receiptReference: '',
    receiptAttachmentUrl: '',
    receiptFileName: '',
    notes: '',
  });

  useEffect(() => {
    if (expense) {
      setFormData({
        title: expense.title,
        description: expense.description || '',
        category: expense.category,
        amount: expense.amount,
        dateIncurred: expense.dateIncurred,
        paymentMethod: expense.paymentMethod,
        payeeName: expense.payeeName,
        receiptReference: expense.receiptReference || '',
        receiptAttachmentUrl: expense.receiptAttachmentUrl || '',
        receiptFileName: expense.receiptFileName || '',
        notes: expense.notes || '',
      });
    }
  }, [expense]);

  if (!isOpen || !expense) return null;

  const handleReceiptFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const res = await mediaService.uploadMedia(file, 'expenses');
      setFormData({
        ...formData,
        receiptAttachmentUrl: res.url,
        receiptFileName: file.name,
      });
      toast.success('Receipt Attached', 'Voucher image updated successfully.');
    } catch (err: any) {
      toast.error('Upload Error', err.message || 'Could not upload receipt image.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!formData.title?.trim()) {
      toast.error('Validation Error', 'Title is required.');
      return;
    }
    if (!formData.amount || formData.amount <= 0) {
      toast.error('Validation Error', 'A positive amount is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await expenseService.updateExpense(expense.id, formData, {
        id: profile.id,
        fullName: profile.full_name || 'Admin',
      });
      toast.success('Expense Updated', `Updated voucher ${expense.expenseNumber}.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Update Failed', err.message || 'Could not update expense voucher.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Edit Expense Voucher
                </h2>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {expense.expenseNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500">Modify voucher parameters prior to disbursement</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Expenditure Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Amount (NGN ₦) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={formData.amount || ''}
                onChange={(e) =>
                  setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cost Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                {DEFAULT_EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Date Incurred
              </label>
              <input
                type="date"
                required
                value={formData.dateIncurred}
                onChange={(e) => setFormData({ ...formData, dateIncurred: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Channel
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) =>
                  setFormData({ ...formData, paymentMethod: e.target.value as ExpensePaymentMethod })
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="bank_transfer">Direct Bank Transfer</option>
                <option value="cash">Counter Petty Cash</option>
                <option value="card_pos">Company POS / Card</option>
                <option value="cheque">Corporate Cheque</option>
                <option value="other">Other Method</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Beneficiary / Payee Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.payeeName}
                onChange={(e) => setFormData({ ...formData, payeeName: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Invoice / Receipt Ref Number
              </label>
              <input
                type="text"
                value={formData.receiptReference}
                onChange={(e) => setFormData({ ...formData, receiptReference: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <ImageInputWithUpload
              label="Update Receipt / Voucher Proof"
              value={formData.receiptAttachmentUrl || ''}
              onChange={(url) => setFormData({ ...formData, receiptAttachmentUrl: url })}
              bucket="business-assets"
              folder="expenses"
              placeholder="https://... or upload updated receipt image"
              helperText="Upload scanned voucher, POS slip, or paste receipt image URL"
              previewHeight="h-28"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Internal Justification Notes
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="px-5 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              <CreditCard className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : 'Save Voucher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
