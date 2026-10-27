import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  Receipt,
  Printer,
  Ban,
  Clock,
  MapPin,
  User,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { PosSale } from '../../types/pos';
import { posService } from '../../services/pos.service';
import { useAuth } from '../../hooks/useAuth';
import { PERMISSION_CODES } from '../../types/auth';

interface PosSaleDetailModalProps {
  isOpen: boolean;
  sale: PosSale | null;
  onClose: () => void;
  onReprintReceipt: (saleId: string) => void;
  onSaleUpdated: () => void;
}

export const PosSaleDetailModal: React.FC<PosSaleDetailModalProps> = ({
  isOpen,
  sale,
  onClose,
  onReprintReceipt,
  onSaleUpdated,
}) => {
  const { hasPermission, isAdministrator, profile } = useAuth();
  const canCancel = isAdministrator() || hasPermission(PERMISSION_CODES.POS_CANCEL_SALE);

  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!sale) return null;

  const handleCancelSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      setError('Please provide a reason for cancelling this sale.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await posService.cancelSale(
        sale.id,
        cancelReason.trim(),
        profile?.id,
        profile?.full_name || 'Manager'
      );
      setIsCancelling(false);
      onSaleUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel sale.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Sale Record — ${sale.saleReference}`}
      size="lg"
    >
      <div className="space-y-4">
        {/* Status Alert Banner if Cancelled */}
        {sale.status === 'cancelled' && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <XCircle className="h-4 w-4 text-red-600" />
              <span>SALE VOIDED / CANCELLED</span>
            </div>
            <p>
              Reason: <em>"{sale.cancellationReason || 'No reason provided'}"</em>
            </p>
            <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">
              Voided by: {sale.cancelledByName || 'Manager'} on{' '}
              {sale.cancelledAt ? new Date(sale.cancelledAt).toLocaleString() : 'N/A'}. Physical inventory has been returned to stock.
            </p>
          </div>
        )}

        {/* Top Metadata Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-900/50">
            <span className="text-slate-500 block flex items-center gap-1">
              <Clock className="h-3 w-3" /> Date & Time
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {new Date(sale.createdAt).toLocaleDateString()}{' '}
              {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-900/50">
            <span className="text-slate-500 block flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Location
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {sale.locationName} ({sale.locationCode})
            </span>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-900/50">
            <span className="text-slate-500 block flex items-center gap-1">
              <User className="h-3 w-3" /> Customer
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {sale.customerName}
            </span>
            {sale.customerPhone && (
              <span className="text-[10px] text-slate-400 block">{sale.customerPhone}</span>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-900/50">
            <span className="text-slate-500 block">Cashier</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {sale.cashierName}
            </span>
          </div>
        </div>

        {/* Items Table Snapshot */}
        <div>
          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Sale Item Snapshots ({sale.items.length})
          </h4>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2 px-3 font-semibold">Item & SKU</th>
                  <th className="py-2 px-3 font-semibold text-right">Quantity</th>
                  <th className="py-2 px-3 font-semibold text-right">Unit Price</th>
                  <th className="py-2 px-3 font-semibold text-right">Discount</th>
                  <th className="py-2 px-3 font-semibold text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sale.items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td className="py-2 px-3">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                        {it.productName}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        {it.variantName && <span>Variant: {it.variantName}</span>}
                        <span>SKU: {it.sku}</span>
                      </div>
                      {it.isPriceOverridden && (
                        <span className="inline-block text-[10px] text-amber-600 font-medium">
                          Override from ₦{it.originalUnitPrice.toLocaleString()} ({it.overrideReason || 'Approved'})
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-medium">
                      {it.quantity} {it.unit}
                    </td>
                    <td className="py-2 px-3 text-right">
                      ₦{it.unitPrice.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400">
                      {it.discountAmount > 0 ? `-₦${it.discountAmount.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-800 dark:text-slate-100">
                      ₦{it.lineTotal.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="rounded-lg bg-slate-50 dark:bg-slate-900/60 p-3.5 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Items Subtotal:</span>
            <span>₦{sale.subtotal.toLocaleString()}</span>
          </div>
          {sale.totalDiscountAmount > 0 && (
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
              <span>Discounts Applied:</span>
              <span>-₦{sale.totalDiscountAmount.toLocaleString()}</span>
            </div>
          )}
          {sale.additionalChargesFee > 0 && (
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Additional Logistics / Packing Fee:</span>
              <span>+₦{sale.additionalChargesFee.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
            <span>Grand Total:</span>
            <span className="text-orange-600 dark:text-orange-400">₦{sale.totalAmount.toLocaleString()}</span>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400 block">Payment Method:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {sale.paymentMethod.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Amount Paid:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                ₦{sale.amountPaid.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Change Given:</span>
              <span className="font-semibold">
                ₦{(sale.changeGiven || 0).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Balance Due:</span>
              <span className={`font-semibold ${sale.balanceDue > 0 ? 'text-red-600' : 'text-slate-700 dark:text-slate-300'}`}>
                ₦{sale.balanceDue.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Cancellation Section */}
        {isCancelling ? (
          <form onSubmit={handleCancelSale} className="rounded-lg border border-red-200 bg-red-50/70 p-3.5 dark:border-red-900/50 dark:bg-red-950/30 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-red-800 dark:text-red-300">
              <AlertTriangle className="h-4 w-4" />
              <span>Confirm Void / Cancel Sale</span>
            </div>
            <p className="text-xs text-red-700 dark:text-red-400">
              Cancelling this sale will immediately restore {sale.items.reduce((acc, i) => acc + i.quantity, 0)} items back to <strong>{sale.locationName}</strong> inventory via an automatic reversal movement.
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Reason for cancellation <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Customer changed mind, accidental duplicate scan"
                className="w-full"
                autoFocus
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCancelling(false)}>
                Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isSubmitting ? 'Voiding Sale...' : 'Confirm Void & Restore Stock'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
            <div>
              {sale.status === 'completed' && canCancel && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCancelling(true)}
                  className="text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 dark:border-red-900/50 flex items-center gap-1.5"
                >
                  <Ban className="h-3.5 w-3.5" />
                  <span>Void / Cancel Sale</span>
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => onReprintReceipt(sale.id)}
                className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-1.5 text-xs"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Reprint Receipt</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
