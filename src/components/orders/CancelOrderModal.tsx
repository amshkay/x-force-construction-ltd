/**
 * Cancel Order Modal
 * Module 10 — Orders, Payments & Customer Tracking
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Implements controlled order cancellation requiring documented reasons.
 */

import React, { useState } from 'react';
import { AlertTriangle, X, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { Order } from '../../types/order';
import { orderService } from '../../services/order.service';

interface CancelOrderModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderCancelled: () => void;
}

export const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  order,
  isOpen,
  onClose,
  onOrderCancelled,
}) => {
  const toast = useToast();
  const { profile } = useAuth();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !order) return null;

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      toast.warning('A valid operational cancellation reason is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await orderService.cancelOrder({
        orderId: order.id,
        reason: reason.trim(),
        cancelledBy: profile?.id || 'admin',
        cancelledByName: profile?.full_name || 'Administrator',
      });

      toast.info(`Order #${order.orderNumber} has been officially cancelled.`);
      onOrderCancelled();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Cancel Order #{order.orderNumber}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300">
          Cancelling an order halts all hydraulic pressing, yard staging, and haulage logistics.
          This action will be permanently recorded in the system audit trail.
        </p>

        {order.amountPaid > 0 && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-300">
            <strong>Financial Notice:</strong> This order has recorded payments totaling{' '}
            <strong>{order.currency} {order.amountPaid.toLocaleString()}</strong>. Existing payment receipts
            will remain preserved in the ledger for accounting reconciliation.
          </div>
        )}

        <form onSubmit={handleCancelSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Cancellation Reason *
            </label>
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Client requested project deferral; site foundation delayed by rainy season."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs text-slate-900 dark:text-white focus:border-rose-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
              Keep Order Active
            </Button>
            <Button
              variant="danger"
              size="sm"
              type="submit"
              disabled={isSubmitting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isSubmitting ? 'Cancelling...' : 'Confirm Order Cancellation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
