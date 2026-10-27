/**
 * Create Expense Modal
 * Module 17 — Staff, Suppliers, Expenses & Basic Finance
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Form modal to record business operating expenses, upload receipts,
 * and link payees across Suppliers, Service Providers, Staff, and external vendors.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Tag,
  DollarSign,
  Calendar,
  Building2,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  CreateExpenseDTO,
  ExpenseCategory,
  ExpensePaymentMethod,
  ExpensePayeeType,
} from '../../types/expense';
import { expenseService } from '../../services/expense.service';
import { supplierService } from '../../services/supplier.service';
import { serviceProviderService } from '../../services/serviceProvider.service';
import { staffService } from '../../services/staff.service';
import { mediaService } from '../../services/media.service';
import { DEFAULT_EXPENSE_CATEGORIES } from '../../repositories/expense.repository';
import { Supplier } from '../../types/supplier';
import { ServiceProvider } from '../../types/serviceProvider';
import { StaffMember } from '../../types/staff';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../ui/Toast';
import { ImageInputWithUpload } from '../ui/ImageInputWithUpload';

interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateExpenseModal: React.FC<CreateExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { profile } = useAuth();
  const toast = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Entities for payee picker
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  const [formData, setFormData] = useState<CreateExpenseDTO>({
    title: '',
    description: '',
    category: 'fuel_utilities',
    amount: 0,
    dateIncurred: new Date().toISOString().split('T')[0],
    paymentMethod: 'bank_transfer',
    payeeType: 'supplier',
    payeeName: '',
    payeeId: undefined,
    receiptReference: '',
    receiptAttachmentUrl: '',
    receiptFileName: '',
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      supplierService.getActiveSuppliers().then(setSuppliers).catch(() => {});
      serviceProviderService.getActiveProviders().then(setProviders).catch(() => {});
      staffService.getAllStaff().then(setStaffList).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle payee type switch
  const handlePayeeTypeChange = (type: ExpensePayeeType) => {
    setFormData({
      ...formData,
      payeeType: type,
      payeeName: '',
      payeeId: undefined,
    });
  };

  const handlePayeeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (!selectedId) {
      setFormData({ ...formData, payeeId: undefined, payeeName: '' });
      return;
    }

    if (formData.payeeType === 'supplier') {
      const supp = suppliers.find((s) => s.id === selectedId);
      if (supp) {
        setFormData({ ...formData, payeeId: supp.id, payeeName: supp.name });
      }
    } else if (formData.payeeType === 'service_provider') {
      const prov = providers.find((p) => p.id === selectedId);
      if (prov) {
        setFormData({ ...formData, payeeId: prov.id, payeeName: prov.name });
      }
    } else if (formData.payeeType === 'staff') {
      const st = staffList.find((s) => s.id === selectedId);
      if (st) {
        setFormData({ ...formData, payeeId: st.id, payeeName: st.fullName });
      }
    }
  };

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
      toast.success('Receipt Attached', 'Voucher image uploaded successfully.');
    } catch (err: any) {
      toast.error('Upload Error', err.message || 'Could not upload receipt image.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!formData.title.trim()) {
      toast.error('Validation Error', 'Expense title is required.');
      return;
    }
    if (!formData.amount || formData.amount <= 0) {
      toast.error('Validation Error', 'A positive expense amount in NGN is required.');
      return;
    }
    if (!formData.payeeName.trim()) {
      toast.error('Validation Error', 'Beneficiary / payee name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await expenseService.createExpense(formData, {
        id: profile.id,
        fullName: profile.full_name || 'Internal Staff',
      });
      toast.success(
        'Expense Recorded',
        `Created voucher ${created.expenseNumber} for ₦${created.amount.toLocaleString()}.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Submission Failed', err.message || 'Could not record expense voucher.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Record Operating Expense Voucher
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Module 17: Operating cost ledger, receipt proof, and managerial approvals
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Title & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Expenditure Title / Purpose <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Generator Diesel AGO (5,000 Liters)"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
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
                placeholder="e.g. 500000"
                value={formData.amount || ''}
                onChange={(e) =>
                  setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Category, Date & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cost Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
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
                Date Incurred <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.dateIncurred}
                onChange={(e) => setFormData({ ...formData, dateIncurred: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
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
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                <option value="bank_transfer">Direct Bank Transfer</option>
                <option value="cash">Counter Petty Cash</option>
                <option value="card_pos">Company POS / Card</option>
                <option value="cheque">Corporate Cheque</option>
                <option value="other">Other Method</option>
              </select>
            </div>
          </div>

          {/* Payee Selection Section */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Beneficiary / Payee Details
            </label>

            {/* Payee Type Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { type: 'supplier', label: 'Supplier / Vendor' },
                  { type: 'service_provider', label: 'Contractor (M16)' },
                  { type: 'staff', label: 'Staff Member' },
                  { type: 'external_vendor', label: 'External Payee' },
                ] as const
              ).map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handlePayeeTypeChange(item.type)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition text-center ${
                    formData.payeeType === item.type
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/60 text-orange-900 dark:text-orange-200 font-bold'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Dynamic Payee Selection Input */}
            {formData.payeeType === 'supplier' ? (
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  Select Registered Supplier
                </label>
                <select
                  value={formData.payeeId || ''}
                  onChange={handlePayeeSelect}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.supplierNumber})
                    </option>
                  ))}
                </select>
              </div>
            ) : formData.payeeType === 'service_provider' ? (
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  Select External Service Provider (Module 16)
                </label>
                <select
                  value={formData.payeeId || ''}
                  onChange={handlePayeeSelect}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  <option value="">-- Choose Provider --</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.providerNumber})
                    </option>
                  ))}
                </select>
              </div>
            ) : formData.payeeType === 'staff' ? (
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  Select Staff Member (Disbursement / Reimbursement)
                </label>
                <select
                  value={formData.payeeId || ''}
                  onChange={handlePayeeSelect}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  <option value="">-- Choose Staff Member --</option>
                  {staffList.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.fullName} ({st.staffNumber} - {st.jobTitle})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  Payee / Vendor Business Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ikeja Pump & Pipe Repairs Ltd"
                  value={formData.payeeName}
                  onChange={(e) => setFormData({ ...formData, payeeName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Invoice Reference & Receipt Upload */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Vendor Invoice / Receipt Ref Number
              </label>
              <input
                type="text"
                placeholder="e.g. INV-2026-9921"
                value={formData.receiptReference}
                onChange={(e) => setFormData({ ...formData, receiptReference: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <ImageInputWithUpload
                label="Receipt / Voucher Proof"
                value={formData.receiptAttachmentUrl || ''}
                onChange={(url) => setFormData({ ...formData, receiptAttachmentUrl: url })}
                bucket="business-assets"
                folder="expenses"
                placeholder="https://... or upload receipt image"
                helperText="Upload scanned voucher, POS slip, or paste receipt image URL"
                previewHeight="h-28"
              />
            </div>
          </div>

          {/* Description & Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Operational Notes / Justification
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Approved diesel top-up for 150kVA Perkins main generator powering press lines."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          {/* Form Actions */}
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
              {isSubmitting ? 'Recording...' : 'Record Voucher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
