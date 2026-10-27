/**
 * Create Supplier Modal
 * Module 17 — Staff, Suppliers, Expenses & Basic Finance
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Form modal to onboard new raw material, machinery, and utility suppliers
 * with bank details, catalog items, and configurable numbering.
 */

import React, { useState } from 'react';
import { X, Truck, Building2, Phone, Mail, MapPin, CreditCard, Package, Plus, Trash2 } from 'lucide-react';
import { CreateSupplierDTO, SupplierCategory } from '../../types/supplier';
import { supplierService } from '../../services/supplier.service';
import { DEFAULT_SUPPLIER_CATEGORIES } from '../../repositories/supplier.repository';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../ui/Toast';

interface CreateSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateSupplierModal: React.FC<CreateSupplierModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { profile } = useAuth();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemInput, setItemInput] = useState('');

  const [formData, setFormData] = useState<CreateSupplierDTO>({
    name: '',
    contactPerson: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    city: '',
    state: 'Lagos State',
    country: 'Nigeria',
    category: 'raw_materials',
    suppliedItems: [],
    paymentTerms: 'Cash on Delivery',
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

  if (!isOpen) return null;

  const handleAddItem = () => {
    if (!itemInput.trim()) return;
    setFormData({
      ...formData,
      suppliedItems: [...formData.suppliedItems, itemInput.trim()],
    });
    setItemInput('');
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      suppliedItems: formData.suppliedItems.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (!formData.name.trim()) {
      toast.error('Validation Error', 'Supplier company name is required.');
      return;
    }
    if (!formData.contactPerson.trim()) {
      toast.error('Validation Error', 'Contact person name is required.');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Validation Error', 'Phone number is required.');
      return;
    }
    if (!formData.address.trim()) {
      toast.error('Validation Error', 'Address is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await supplierService.createSupplier(formData, profile.id);
      toast.success(
        'Supplier Registered',
        `Successfully onboarded ${created.name} (${created.supplierNumber}).`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Registration Failed', err.message || 'Could not register supplier.');
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
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Register New Supplier / Vendor
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Module 17: Raw materials, packaging, equipment, and utility partners
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
                Company / Vendor Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Dangote Cement Plc"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Supply Category <span className="text-rose-500">*</span>
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
                placeholder="e.g. Alhaji Sanusi"
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
                placeholder="+234 803 000 0000"
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
                placeholder="+234 803 000 0000"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Email & TIN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Vendor Email
              </label>
              <input
                type="email"
                placeholder="orders@vendor.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tax ID / RC Registration Number
              </label>
              <input
                type="text"
                placeholder="TIN-0019284729"
                value={formData.tinNumber}
                onChange={(e) => setFormData({ ...formData, tinNumber: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Facility Address, City & State */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Facility / Depot Street Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ibese Manufacturing Complex"
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
                placeholder="e.g. Ibese"
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
                placeholder="e.g. Grade 42.5R Portland Limestone Cement"
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

            {formData.suppliedItems.length > 0 && (
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
                placeholder="e.g. Net 15 Days / Cash on Delivery"
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
                placeholder="2"
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
                  placeholder="e.g. Access Bank"
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
                  placeholder="0123456789"
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
                  placeholder="e.g. Dangote Cement Sales"
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
              {isSubmitting ? 'Registering...' : 'Register Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
