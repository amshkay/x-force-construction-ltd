/**
 * Supplier Detail Modal
 * Module 17 — Staff, Suppliers, Expenses & Basic Finance
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Detailed supplier dossier showcasing materials supplied, bank payment details,
 * lead time, WhatsApp contact action, and status history.
 */

import React from 'react';
import {
  X,
  Truck,
  Building2,
  Mail,
  Phone,
  MessageSquare,
  MapPin,
  CreditCard,
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Edit,
  UserX,
} from 'lucide-react';
import { Supplier } from '../../types/supplier';
import { useAuth } from '../../hooks/useAuth';
import { PERMISSION_CODES } from '../../types/auth';

interface SupplierDetailModalProps {
  supplier: Supplier | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (supplier: Supplier) => void;
  onStatusChange: (supplier: Supplier) => void;
}

export const SupplierDetailModal: React.FC<SupplierDetailModalProps> = ({
  supplier,
  isOpen,
  onClose,
  onEdit,
  onStatusChange,
}) => {
  const { hasPermission, isAdministrator } = useAuth();

  if (!isOpen || !supplier) return null;

  const canManage = isAdministrator() || hasPermission(PERMISSION_CODES.SUPPLIERS_MANAGE);

  const cleanWhatsAppNumber = supplier.whatsapp
    ? supplier.whatsapp.replace(/[^0-9]/g, '')
    : supplier.phone.replace(/[^0-9]/g, '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 border-b border-slate-800">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-orange-600/20 border-2 border-orange-500 flex items-center justify-center text-orange-400 font-bold text-xl shadow-inner">
                <Truck className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-bold tracking-tight text-white">{supplier.name}</h2>
                  <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-orange-400">
                    {supplier.supplierNumber}
                  </span>
                  {supplier.status === 'active' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active Vendor
                    </span>
                  ) : supplier.status === 'suspended' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      <AlertTriangle className="w-3.5 h-3.5" /> Suspended
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/20 text-slate-300 border border-slate-500/30">
                      <Clock className="w-3.5 h-3.5" /> Inactive
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-300 mt-1 flex items-center gap-2">
                  <span className="capitalize">{supplier.category.replace('_', ' ')}</span>
                  <span className="text-slate-600">•</span>
                  <span>Contact: {supplier.contactPerson}</span>
                  <span className="text-slate-600">•</span>
                  <span>{supplier.city}, {supplier.state}</span>
                </p>
              </div>
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
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Quick Action Contact Bar */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/40">
            <span className="text-xs font-semibold text-orange-900 dark:text-orange-200 flex-1">
              Direct Vendor Dispatch Actions:
            </span>
            <a
              href={`tel:${supplier.phone}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white dark:bg-slate-800 border border-orange-300 dark:border-orange-800 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-orange-100 transition shadow-sm"
            >
              <Phone className="w-3.5 h-3.5 text-orange-600" /> Call {supplier.phone}
            </a>
            {cleanWhatsAppNumber && (
              <a
                href={`https://wa.me/${cleanWhatsAppNumber}?text=${encodeURIComponent(
                  `Hello ${supplier.contactPerson}, this is XFORCE Construction Ltd inquiring about supply orders.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition shadow-sm"
              >
                <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Vendor
              </a>
            )}
          </div>

          {/* Grid Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Supplies & Lead Time */}
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-orange-500" />
                Supplied Materials & Inventory
              </h3>
              <div className="space-y-1.5">
                {supplier.suppliedItems && supplier.suppliedItems.length > 0 ? (
                  supplier.suppliedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="px-2.5 py-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      <span>{item}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No specific catalog items listed.</p>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Lead Time:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {supplier.leadTimeDays ? `${supplier.leadTimeDays} Business Days` : 'Same-day / On demand'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Payment Terms:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {supplier.paymentTerms || 'Cash on Delivery'}
                  </p>
                </div>
              </div>
            </div>

            {/* Bank Details for Disbursements */}
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-orange-500" />
                Banking & Payment Settlement
              </h3>
              {supplier.bankDetails ? (
                <div className="space-y-2 text-sm bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Bank Name</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      {supplier.bankDetails.bankName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Account Number</span>
                    <span className="font-mono font-bold text-orange-600 dark:text-orange-400 text-sm select-all">
                      {supplier.bankDetails.accountNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Account Name</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                      {supplier.bankDetails.accountName}
                    </span>
                  </div>
                  {supplier.bankDetails.sortCode && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Sort Code</span>
                      <span className="font-mono text-slate-600 dark:text-slate-400 text-xs">
                        {supplier.bankDetails.sortCode}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No banking records on file.</p>
              )}

              {supplier.tinNumber && (
                <div className="text-xs">
                  <span className="text-slate-500">Tax Identification / RC:</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200 ml-2">
                    {supplier.tinNumber}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Physical Address */}
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
            <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-orange-500" /> Physical Facility / Depot Address:
            </span>
            <p className="text-slate-700 dark:text-slate-300">
              {supplier.address}, {supplier.city}, {supplier.state}, {supplier.country}
            </p>
          </div>

          {/* Notes */}
          {supplier.notes && (
            <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs">
              <span className="font-semibold text-amber-800 dark:text-amber-300">Operational Notes:</span>
              <p className="text-amber-900 dark:text-amber-200/80 mt-1 whitespace-pre-wrap">
                {supplier.notes}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-slate-400">
            Registered: {new Date(supplier.createdAt).toLocaleDateString()}
          </div>

          <div className="flex items-center gap-2">
            {canManage && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStatusChange(supplier);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                >
                  <UserX className="w-3.5 h-3.5" />
                  Change Status
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(supplier);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white transition shadow-sm"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit Supplier
                </button>
              </>
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
