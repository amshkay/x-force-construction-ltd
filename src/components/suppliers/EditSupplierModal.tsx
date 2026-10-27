/**
 * Edit Supplier Modal
 * Module 17 — Staff, Suppliers, Expenses & Basic Finance
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Form modal to update vendor contact info, category, bank details, and catalog items.
 */

import React, { useState, useEffect } from 'react';
import { X, Edit, Truck, CreditCard, Plus, Trash2 } from 'lucide-react';
import { Supplier, UpdateSupplierDTO, SupplierCategory } from '../../types/supplier';
import { supplierService } from '../../services/supplier.service';
import { DEFAULT_SUPPLIER_CATEGORIES } from '../../repositories/supplier.repository';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../ui/Toast';

interface EditSupplierModalProps {
  supplier: Supplier | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditSupplierModal: React.FC<EditSupplierModalProps> = ({
  supplier,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { profile } = useAuth();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemInput, setItemInput] = useState('');

  const [formData, setFormData] = useState<UpdateSupplierDTO>({
    name: '',
    contactPerson: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    city: '',
    state: '',
    category: 'raw_materials',
    suppliedItems: [],
    paymentTerms: '',
    leadTimeDays: 2,
    tinNumber: '',
    bankDetails: {
      bankName: '',
      accountName: '',
      accountNumber: '',
      sortCode: '',
    },
    notes: '',
  });

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        contactPerson: supplier.contactPerson,
        phone: supplier.phone,
        whatsapp: supplier.whatsapp || '',
        email: supplier.email || '',
        address: supplier.address,
        city: supplier.city,
        state: supplier.state,
        category: supplier.category,
        suppliedItems: [...supplier.suppliedItems],
        paymentTerms: supplier.paymentTerms || '',
        leadTimeDays: supplier.leadTimeDays,
        tinNumber: supplier.tinNumber || '',
        bankDetails: supplier.bankDetails
          ? { ...supplier.bankDetails }
          : { bankName: '', accountName: '', accountNumber: '', sortCode: '' },
        notes: supplier.notes || '',
      });
    }
  }, [supplier]);

  if (!isOpen || !supplier) return null;

  const handleAddItem = () => {
    if (!itemInput.trim()) return;
    setFormData({
      ...formData,
      suppliedItems: [...(formData.suppliedItems || []), itemInput.trim()],
    });
    setItemInput('');
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      suppliedItems: (formData.suppliedItems || []).filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!formData.name?.trim()) {
      toast.error('Validation Error', 'Supplier name is required.');
      return;
    }
    if (!formData.contactPerson?.trim()) {
      toast.error('Validation Error', 'Contact person name is required.');
      return;
    }
    if (!formData.phone?.trim()) {
      toast.error('Validation Error', 'Phone number is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await supplierService.updateSupplier(supplier.id, formData, profile.id);
      toast.success(
        'Supplier Updated',
        `Successfully updated record for ${formData.name} (${supplier.supplierNumber}).`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Update Failed', err.message || 'Could not update supplier record.');
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
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Edit Supplier Record
                </h2>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {supplier.supplierNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Updating vendor commercial details, supplied materials, and payment records
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
          {/* Supplier Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Company Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Supply Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as SupplierCategory })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                {DEFAULT_SUPPLIER_CATEGORIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contact Person, Phone & WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Contact Person <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Direct Phone <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                WhatsApp Number
              </label>
              <input
                type="tel"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Address & City */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Facility / Depot Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                City / Town
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Supplied Materials Tag Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Supplied Items & Materials
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="e.g. Fine Quarry Dust (0-5mm)"
                value={itemInput}
                onChange={(e) => setItemInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddItem();
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg flex items-center gap-1 border border-slate-300 dark:border-slate-700"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>

            {formData.suppliedItems && formData.suppliedItems.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {formData.suppliedItems.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-300 text-xs border border-orange-200 dark:border-orange-800"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-orange-500 hover:text-rose-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Payment Terms & Lead Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Terms
              </label>
              <input
                type="text"
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Estimated Lead Time (Days)
              </label>
              <input
                type="number"
                min="0"
                value={formData.leadTimeDays ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    leadTimeDays: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Bank Payment Details */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-orange-500" />
              Vendor Settlement Bank Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={formData.bankDetails?.bankName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankDetails: { ...formData.bankDetails!, bankName: e.target.value },
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Account Number</label>
                <input
                  type="text"
                  value={formData.bankDetails?.accountNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankDetails: { ...formData.bankDetails!, accountNumber: e.target.value },
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Account Name</label>
                <input
                  type="text"
                  value={formData.bankDetails?.accountName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankDetails: { ...formData.bankDetails!, accountName: e.target.value },
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>
            </div>
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
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              <Truck className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
