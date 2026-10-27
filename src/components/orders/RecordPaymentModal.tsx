/**
 * Record Payment Modal
 * Module 10 — Orders, Payments & Customer Tracking
 * XFORCE Construction Ltd / X-FORCE BRICKS
 */

import React, { useState } from 'react';
import {
  CreditCard,
  Building,
  CheckCircle2,
  X,
  AlertCircle,
  FileText,
  DollarSign,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';
import { useAuth } from '../../hooks/useAuth';
import { Order } from '../../types/order';
import { PaymentMethod, PAYMENT_METHOD_CONFIG } from '../../types/payment';
import { paymentService } from '../../services/payment.service';
import { roundMoney } from '../../utils/quotationCalculations';
import { ImageInputWithUpload } from '../ui/ImageInputWithUpload';

interface RecordPaymentModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentRecorded: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  order,
  isOpen,
  onClose,
  onPaymentRecorded,
}) => {
  const toast = useToast();
  const { profile } = useAuth();
  const { settings } = useBusinessSettings();

  const [amount, setAmount] = useState<string>(() =>
    order ? String(order.balanceDue > 0 ? order.balanceDue : order.totalAmount) : '0'
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [bankName, setBankName] = useState('Zenith Bank Plc');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync default amount when order opens
  React.useEffect(() => {
    if (order) {
      setAmount(String(order.balanceDue > 0 ? order.balanceDue : order.totalAmount));
      setReferenceNumber('');
      setReceiptUrl('');
      setNotes('');
    }
  }, [order]);

  if (!isOpen || !order) return null;

  const numAmount = parseFloat(amount) || 0;
  const safeAmount = roundMoney(numAmount);
  const projectedBalance = Math.max(0, roundMoney(order.balanceDue - safeAmount));

  const handleQuickAmount = (type: 'full' | '70' | '50') => {
    if (type === 'full') {
      setAmount(String(order.balanceDue));
    } else if (type === '70') {
      setAmount(String(roundMoney((order.totalAmount * 70) / 100)));
    } else if (type === '50') {
      setAmount(String(roundMoney((order.totalAmount * 50) / 100)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (safeAmount <= 0) {
      toast.warning('Please enter a payment amount greater than zero.');
      return;
    }

    const methodCfg = PAYMENT_METHOD_CONFIG[paymentMethod];
    if (methodCfg.requiresReference && !referenceNumber.trim()) {
      toast.warning(`Reference / Teller number is required for ${methodCfg.label}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await paymentService.recordPayment({
        orderId: order.id,
        amount: safeAmount,
        paymentMethod,
        referenceNumber: referenceNumber.trim() || `MANUAL-${Date.now()}`,
        bankName: paymentMethod === 'bank_transfer' ? bankName : undefined,
        paymentDate,
        receiptUrl: receiptUrl.trim() || undefined,
        notes: notes.trim() || undefined,
        recordedBy: profile?.id || undefined,
        recordedByName: profile?.full_name || 'Staff Officer',
      });

      toast.success(
        `Payment of ${order.currency} ${safeAmount.toLocaleString()} recorded for Order #${order.orderNumber}.`,
        'Payment Recorded'
      );
      onPaymentRecorded();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record payment transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-orange-600 dark:text-orange-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Record Payment
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Order <span className="font-semibold text-orange-600 dark:text-orange-400 font-mono">#{order.orderNumber}</span> • {order.customerName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Financial Summary Card */}
        <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3.5 border border-slate-200 dark:border-slate-700/60 text-xs">
          <div>
            <span className="text-[11px] text-slate-500 block">Total Order</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm">
              {order.currency} {order.totalAmount.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">Already Paid</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              {order.currency} {order.amountPaid.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">Balance Due</span>
            <span className="font-black text-rose-600 dark:text-rose-400 text-sm">
              {order.currency} {order.balanceDue.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Amount and Quick Presets */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700 dark:text-slate-200">
                Payment Amount ({order.currency}) *
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleQuickAmount('full')}
                  className="rounded bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-300 hover:bg-orange-100 dark:hover:bg-orange-950"
                >
                  Full Balance
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAmount('70')}
                  className="rounded bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-300 hover:bg-orange-100 dark:hover:bg-orange-950"
                >
                  70% Deposit
                </button>
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 font-bold text-slate-400 text-sm">₦</span>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-8 pr-3 py-2 text-sm font-semibold text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
                placeholder="0.00"
              />
            </div>
            {safeAmount > 0 && (
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Projected Remaining Balance:{' '}
                <strong className={projectedBalance === 0 ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-300'}>
                  {order.currency} {projectedBalance.toLocaleString()}
                </strong>
                {projectedBalance === 0 && ' (Order will be fully paid)'}
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
              Payment Method *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
            >
              <option value="bank_transfer">Corporate Bank Transfer (Zenith Bank)</option>
              <option value="card_pos">POS Card Terminal (Yard Office)</option>
              <option value="cash">Cash Settlement (Counter)</option>
              <option value="ussd">Direct USSD Code</option>
              <option value="other">Other Commercial Draft</option>
            </select>
          </div>

          {/* Bank / Reference Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {paymentMethod === 'bank_transfer' && (
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                  Receiving Bank
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
                  placeholder="e.g. Zenith Bank Plc"
                />
              </div>
            )}

            <div className={paymentMethod === 'bank_transfer' ? '' : 'sm:col-span-2'}>
              <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                Transaction Reference / Bank Teller # {PAYMENT_METHOD_CONFIG[paymentMethod].requiresReference ? '*' : ''}
              </label>
              <input
                type="text"
                required={PAYMENT_METHOD_CONFIG[paymentMethod].requiresReference}
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. ZEN-TXN-9021482 or POS RRN"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Payment Date */}
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
              Payment Date *
            </label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
            />
          </div>

          {/* Payment Receipt / Teller Slip Attachment */}
          <div>
            <ImageInputWithUpload
              id="payment-receipt-uploader"
              label="Payment Receipt / Teller Slip (Optional)"
              helperText="Upload bank teller slip, POS voucher, or transfer receipt, or paste an image URL."
              value={receiptUrl}
              onChange={(url) => setReceiptUrl(url)}
              onRemove={() => setReceiptUrl('')}
              bucket="customer-uploads"
              folder="receipts"
              placeholder="https://... payment receipt URL"
              previewHeight="h-28"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
              Internal Remarks (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Verified by accountant from Zenith bank statement alert."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs text-slate-900 dark:text-white"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? 'Recording...' : 'Confirm & Save Payment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
