/**
 * Payment Receipt Modal
 * Module 10 — Orders, Payments & Customer Tracking
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Provides a clean, print-ready official payment receipt with corporate identity.
 */

import React, { useState, useEffect } from 'react';
import { Printer, Download, X, CheckCircle2, Building, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { PaymentReceiptData } from '../../types/payment';
import { paymentService } from '../../services/payment.service';
import { useToast } from '../ui/Toast';

interface PaymentReceiptModalProps {
  paymentId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  paymentId,
  isOpen,
  onClose,
}) => {
  const toast = useToast();
  const [receipt, setReceipt] = useState<PaymentReceiptData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && paymentId) {
      setIsLoading(true);
      paymentService
        .generateReceiptData(paymentId)
        .then((data) => {
          setReceipt(data);
          setIsLoading(false);
        })
        .catch((err) => {
          toast.error(err.message || 'Could not load payment receipt.');
          setIsLoading(false);
        });
    } else {
      setReceipt(null);
    }
  }, [isOpen, paymentId]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:border-none print:shadow-none print:rounded-none">
        {/* Actions Bar (Hidden on print) */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3 sm:px-6 sm:py-3.5 bg-slate-50 dark:bg-slate-800/60 print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Official Payment Receipt</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Printer className="h-4 w-4" />}
              onClick={handlePrint}
            >
              Print Receipt
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Content */}
        <div className="p-4 sm:p-8 overflow-y-auto space-y-6 text-slate-900 dark:text-slate-100 print:text-black print:overflow-visible print:p-8">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Generating official receipt...
            </div>
          ) : receipt ? (
            <div id="printable-payment-receipt" className="space-y-6">
              {/* Receipt Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 dark:border-slate-800 pb-5 print:border-slate-400">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-orange-600 flex items-center justify-center text-white font-black text-base print:bg-black">
                      X
                    </div>
                    <div>
                      <h1 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white print:text-black">
                        {receipt.company.legalName}
                      </h1>
                      <p className="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest print:text-black">
                        {receipt.company.brandName}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-700">
                    {receipt.company.address} • Tel: {receipt.company.phone}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 print:text-slate-600">
                    Email: {receipt.company.email} | TIN: {receipt.company.tin}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-800/40 text-right min-w-[180px] print:border-slate-400 print:bg-white">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Payment Receipt
                  </span>
                  <span className="text-base font-mono font-black text-orange-600 dark:text-orange-400 block print:text-black">
                    {receipt.receiptNumber}
                  </span>
                  <div className="text-xs text-slate-600 dark:text-slate-400 pt-1 space-y-0.5">
                    <p>Order: <strong>#{receipt.orderNumber}</strong></p>
                    <p>Date: {receipt.paymentDate}</p>
                  </div>
                </div>
              </div>

              {/* Customer and Settlement Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Received From Client:
                  </span>
                  <p className="font-bold text-sm text-slate-900 dark:text-white print:text-black">
                    {receipt.customer.name}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400">Phone: {receipt.customer.phone}</p>
                  {receipt.customer.email && (
                    <p className="text-slate-600 dark:text-slate-400">Email: {receipt.customer.email}</p>
                  )}
                  {receipt.customer.address && (
                    <p className="text-slate-600 dark:text-slate-400">Site: {receipt.customer.address}</p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Settlement Details:
                  </span>
                  <p className="text-slate-700 dark:text-slate-300">
                    Payment Channel: <strong>{receipt.paymentMethodLabel}</strong>
                  </p>
                  {receipt.bankName && (
                    <p className="text-slate-700 dark:text-slate-300">Bank: {receipt.bankName}</p>
                  )}
                  <p className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                    Reference / Teller: <strong>{receipt.referenceNumber}</strong>
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Authorized Cashier: {receipt.recordedBy || 'Accounts Desk'}
                  </p>
                </div>
              </div>

              {/* Payment Amount Display Card */}
              <div className="rounded-xl bg-orange-50 dark:bg-orange-950/30 p-4 border border-orange-200 dark:border-orange-900/60 flex items-center justify-between print:border-black print:bg-slate-100">
                <div>
                  <span className="text-xs font-semibold text-orange-900 dark:text-orange-300 block">
                    Amount Received & Cleared:
                  </span>
                  <span className="text-xs text-orange-700 dark:text-orange-400">
                    Official value credited to corporate account
                  </span>
                </div>
                <div className="text-2xl font-black text-orange-600 dark:text-orange-400 print:text-black">
                  {receipt.currency} {receipt.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Order Ledger Balance Snapshot */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Order Total</th>
                      <th className="p-3">Prior Payments</th>
                      <th className="p-3 font-bold text-orange-600">This Payment</th>
                      <th className="p-3">Total Paid</th>
                      <th className="p-3 text-right">Remaining Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    <tr>
                      <td className="p-3">{receipt.currency} {receipt.orderSummary.orderTotal.toLocaleString()}</td>
                      <td className="p-3">{receipt.currency} {receipt.orderSummary.previouslyPaid.toLocaleString()}</td>
                      <td className="p-3 font-bold text-orange-600 dark:text-orange-400 print:text-black">
                        {receipt.currency} {receipt.orderSummary.thisPayment.toLocaleString()}
                      </td>
                      <td className="p-3 text-emerald-600 font-semibold">{receipt.currency} {receipt.orderSummary.totalPaidNow.toLocaleString()}</td>
                      <td className="p-3 text-right font-black text-rose-600">
                        {receipt.currency} {receipt.orderSummary.remainingBalance.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {receipt.notes && (
                <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="font-semibold block mb-0.5">Notes:</span>
                  <p>{receipt.notes}</p>
                </div>
              )}

              {/* Sign-off Stamps */}
              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 print:border-slate-400">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Received By:</p>
                  <div className="h-10 border-b border-dashed border-slate-300 dark:border-slate-700"></div>
                  <p className="mt-1 text-[11px]">{receipt.recordedBy || 'Authorized Cashier'} • XFORCE</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Customer Acknowledgment:</p>
                  <div className="h-10 border-b border-dashed border-slate-300 dark:border-slate-700"></div>
                  <p className="mt-1 text-[11px]">Signature & Date</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              Receipt data not available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
