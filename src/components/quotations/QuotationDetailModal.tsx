/**
 * Quotation Detail & Official Print View Modal
 * Module 09 — Customer Requests & Quotation Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 */

import React, { useState } from 'react';
import {
  X,
  Printer,
  Send,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Building,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  ShieldCheck,
  Clock,
  Layers,
  FileCheck,
  ShoppingCart,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';
import {
  Quotation,
  QUOTATION_STATUS_CONFIG,
} from '../../types/quotation';
import { quotationService } from '../../services/quotation.service';

interface QuotationDetailModalProps {
  quotation: Quotation | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated?: (updated: Quotation) => void;
  currentStaffName?: string;
  onNavigateToOrder?: (orderId: string) => void;
}

export const QuotationDetailModal: React.FC<QuotationDetailModalProps> = ({
  quotation,
  isOpen,
  onClose,
  onStatusUpdated,
  currentStaffName = 'Staff Engineer',
  onNavigateToOrder,
}) => {
  const toast = useToast();
  const { settings } = useBusinessSettings();
  const regionalSettings = settings?.regional;
  const bankTransferMethod = settings?.paymentMethods?.find(
    (m) => m.code === 'bank_transfer' && m.isEnabled
  ) || settings?.paymentMethods?.find((m) => m.code === 'bank_transfer');
  const bankDetails = bankTransferMethod?.bankDetails;

  const [isProcessing, setIsProcessing] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [acceptorName, setAcceptorName] = useState(quotation?.customerName || '');
  const [acceptRemarks, setAcceptRemarks] = useState('');

  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  React.useEffect(() => {
    if (quotation) {
      setAcceptorName(quotation.customerName);
      setAcceptRemarks('');
      setDeclineReason('');
    }
  }, [quotation]);

  if (!isOpen || !quotation) return null;

  const statusConfig = QUOTATION_STATUS_CONFIG[quotation.status];

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Mark as Sent
  const handleSendToCustomer = async () => {
    setIsProcessing(true);
    try {
      const updated = await quotationService.sendQuotation(
        quotation.id,
        currentStaffName
      );
      toast.success(
        `Quotation #${quotation.quotationNumber} marked as sent to ${quotation.customerName}.`,
        'Sent'
      );
      onStatusUpdated?.(updated);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update quotation.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Record Customer Acceptance (STRICT BOUNDARY: Does NOT create order)
  const handleConfirmAcceptance = async () => {
    if (!acceptorName.trim()) {
      toast.warning('Please enter the name of the accepting client representative.');
      return;
    }

    setIsProcessing(true);
    try {
      const updated = await quotationService.acceptQuotation(
        quotation.id,
        acceptorName.trim(),
        acceptRemarks.trim() || undefined
      );
      toast.success(
        `Quotation #${quotation.quotationNumber} formally accepted. Recorded for order booking.`,
        'Quotation Accepted'
      );
      setShowAcceptModal(false);
      onStatusUpdated?.(updated);
    } catch (err: any) {
      toast.error(err.message || 'Failed to record acceptance.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Record Customer Decline
  const handleConfirmDecline = async () => {
    setIsProcessing(true);
    try {
      const updated = await quotationService.declineQuotation(
        quotation.id,
        declineReason.trim() || 'Declined by customer'
      );
      toast.info(`Quotation #${quotation.quotationNumber} marked as declined.`);
      setShowDeclineModal(false);
      onStatusUpdated?.(updated);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Module 10: Convert accepted quotation to order
  const handleConvertToOrder = async () => {
    setIsProcessing(true);
    try {
      const order = await quotationService.convertToOrder(quotation.id, {
        createdByName: currentStaffName,
      });
      toast.success(
        `Quotation #${quotation.quotationNumber} converted to Order #${order.orderNumber}!`,
        'Order Confirmed'
      );
      if (onStatusUpdated) {
        onStatusUpdated({ ...quotation, status: 'converted' });
      }
      onClose();
      if (onNavigateToOrder) {
        onNavigateToOrder(order.id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to convert quotation to order.');
    } finally {
      setIsProcessing(false);
    }
  };

  const currencySymbol = regionalSettings.currencySymbol || '₦';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm print:p-0 print:bg-white print:static">
        <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-4 sm:p-8 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left print:border-none print:shadow-none print:max-h-none print:p-0">
          {/* Action Bar (Hidden in Print) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 print:hidden">
            <div className="flex items-center gap-3">
              <Badge variant={statusConfig.badgeVariant}>{statusConfig.label}</Badge>
              <span className="font-mono text-xs text-slate-500">
                Created: {new Date(quotation.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="flex items-center gap-1.5"
              >
                <Printer className="h-4 w-4" />
                <span>Print Quotation</span>
              </Button>

              {quotation.status === 'draft' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSendToCustomer}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5"
                >
                  <Send className="h-4 w-4" />
                  <span>Mark as Sent</span>
                </Button>
              )}

              {(quotation.status === 'sent' || quotation.status === 'viewed') && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowAcceptModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                >
                  <FileCheck className="h-4 w-4" />
                  <span>Record Acceptance</span>
                </Button>
              )}

              {quotation.status === 'accepted' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConvertToOrder}
                  disabled={isProcessing}
                  className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-1.5"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>{isProcessing ? 'Converting...' : 'Convert to Order'}</span>
                </Button>
              )}

              {quotation.status === 'converted' && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Converted to Order</span>
                </span>
              )}

              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* ============================================================== */}
          {/* OFFICIAL CORPORATE QUOTATION SHEET (PRINT READY)               */}
          {/* ============================================================== */}
          <div id="printable-quotation-sheet" className="space-y-6 text-slate-900 dark:text-slate-100 print:text-black">
            {/* Header: Company Profile & Document Metadata */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 dark:border-slate-800 pb-6 print:border-slate-400">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-lg bg-orange-600 flex items-center justify-center text-white font-black text-lg">
                    X
                  </div>
                  <div>
                    <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white print:text-black">
                      {settings?.companyName || 'XFORCE CONSTRUCTION LTD'}
                    </h1>
                    <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">
                      {settings?.publicBrandName || 'X-FORCE BRICKS'}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5 pt-1 print:text-slate-600">
                  <p>{settings?.address ? `${settings.address.street}, ${settings.address.city}, ${settings.address.state}` : 'Factory Yard & Works: Industrial Layout, Enugu, Nigeria'}</p>
                  <p>
                    Tel: {settings?.contactPhone || '+234 800 000 0000'} | WhatsApp: {settings?.whatsappNumber || '+234 800 000 0000'}
                  </p>
                  <p>Email: {settings?.contactEmail || 'sales@xforcebricks.com'} | TIN: {settings?.tinNumber || 'RC-1928374'}</p>
                </div>
              </div>

              {/* Quotation Identity Block */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800/40 text-right min-w-[220px] print:border-slate-400 print:bg-white">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Commercial Quotation
                </span>
                <span className="text-xl font-mono font-black text-orange-600 dark:text-orange-400 block my-1">
                  {quotation.quotationNumber}
                </span>

                <div className="text-xs space-y-1 pt-1 text-slate-600 dark:text-slate-400 print:text-slate-700">
                  <div className="flex justify-between gap-4">
                    <span>Issue Date:</span>
                    <strong className="font-mono">{quotation.quotationDate}</strong>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Valid Until:</span>
                    <strong className="font-mono text-slate-900 dark:text-white print:text-black">
                      {quotation.validUntil}
                    </strong>
                  </div>
                  {quotation.requestNumber && (
                    <div className="flex justify-between gap-4 text-[11px]">
                      <span>Ref Request:</span>
                      <strong className="font-mono">{quotation.requestNumber}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Client Bill To & Delivery Site */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/30 print:border-slate-300 print:bg-transparent">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Quotation Issued To (Client):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white print:text-black">
                    {quotation.customerName}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 font-mono mt-0.5">
                    {quotation.customerPhone}
                  </p>
                  {quotation.customerEmail && (
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      {quotation.customerEmail}
                    </p>
                  )}
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Project Delivery Site:</span>
                  <p className="text-slate-800 dark:text-slate-200 mt-0.5">
                    {quotation.customerAddress || 'Direct Factory Yard Collection (EXW)'}
                  </p>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-400">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-100 font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 print:bg-slate-100 print:border-slate-400">
                  <tr>
                    <th className="py-3 pl-4 pr-2 w-10">#</th>
                    <th className="px-3 py-3">Description & Specification</th>
                    <th className="px-3 py-3 text-center w-20">Unit</th>
                    <th className="px-3 py-3 text-right w-24">Qty</th>
                    <th className="px-3 py-3 text-right w-28">Unit Rate</th>
                    <th className="px-3 py-3 text-right w-24">Disc</th>
                    <th className="py-3 pl-3 pr-4 text-right w-32">Total ({currencySymbol})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 print:divide-slate-300">
                  {quotation.items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/50">
                      <td className="py-3 pl-4 pr-2 text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white print:text-black">
                          {item.description}
                        </div>
                        {item.sku && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            SKU: {item.sku}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-slate-600 dark:text-slate-400">
                        {item.unit}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-semibold text-slate-900 dark:text-white print:text-black">
                        {item.quantity.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {currencySymbol}{item.unitPrice.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-slate-500">
                        {item.discountAmount > 0 ? `-${currencySymbol}${item.discountAmount.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-3 pl-3 pr-4 text-right font-mono font-bold text-slate-900 dark:text-white print:text-black">
                        {currencySymbol}{item.lineTotal.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary & Bank Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              {/* Payment Instructions & Bank Details */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 bg-slate-50/40 dark:bg-slate-800/20 text-xs print:border-slate-300 print:bg-transparent">
                <span className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-orange-600" />
                  Bank Remittance & Deposit Instructions
                </span>
                <p className="text-slate-600 dark:text-slate-400">
                  Please remit official mobilization deposits directly to the corporate account:
                </p>
                <div className="rounded-lg bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 space-y-1 font-mono text-[11px] print:border-slate-400">
                  <p>Bank: <strong>{bankDetails?.bankName || 'Zenith Bank PLC'}</strong></p>
                  <p>Account Name: <strong>{bankDetails?.accountName || 'XFORCE CONSTRUCTION LTD'}</strong></p>
                  <p>Account Number: <strong className="text-orange-600 text-sm">{bankDetails?.accountNumber || '1019283746'}</strong></p>
                  <p className="text-[10px] text-slate-500">
                    Use Quotation Ref <strong>{quotation.quotationNumber}</strong> as payment reference.
                  </p>
                </div>
              </div>

              {/* Commercial Breakdown */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 bg-slate-50 dark:bg-slate-800/60 text-xs print:border-slate-400 print:bg-white">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Materials Subtotal:</span>
                  <span className="font-mono">{currencySymbol}{quotation.subtotal.toLocaleString()}</span>
                </div>

                {quotation.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span className="font-mono">-{currencySymbol}{quotation.discountAmount.toLocaleString()}</span>
                  </div>
                )}

                {quotation.deliveryFee > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Flatbed Delivery & Haulage:</span>
                    <span className="font-mono">+{currencySymbol}{quotation.deliveryFee.toLocaleString()}</span>
                  </div>
                )}

                {quotation.installationFee > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Artisan Installation Services:</span>
                    <span className="font-mono">+{currencySymbol}{quotation.installationFee.toLocaleString()}</span>
                  </div>
                )}

                {quotation.otherChargesFee > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>{quotation.otherChargesDescription || 'Other Charges'}:</span>
                    <span className="font-mono">+{currencySymbol}{quotation.otherChargesFee.toLocaleString()}</span>
                  </div>
                )}

                {quotation.taxAmount > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>VAT ({quotation.taxRate}%):</span>
                    <span className="font-mono">+{currencySymbol}{quotation.taxAmount.toLocaleString()}</span>
                  </div>
                )}

                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between text-base font-black text-slate-900 dark:text-white print:text-black">
                  <span>Grand Total:</span>
                  <span className="font-mono text-orange-600 dark:text-orange-400 print:text-black">
                    {currencySymbol}{quotation.totalAmount.toLocaleString()}
                  </span>
                </div>

                <div className="rounded-lg bg-orange-50/50 dark:bg-orange-950/20 p-2.5 border border-orange-200 dark:border-orange-900/40 text-[11px] space-y-1 print:border-slate-300">
                  <div className="flex justify-between font-bold text-orange-900 dark:text-orange-200 print:text-black">
                    <span>Advance Mobilization Required:</span>
                    <span className="font-mono">{currencySymbol}{quotation.depositRequired.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Balance Due on Dispatch:</span>
                    <span className="font-mono">{currencySymbol}{quotation.balanceDue.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms and Acceptance Signature Area */}
            {quotation.termsAndConditions && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-[11px] bg-slate-50/30 dark:bg-slate-800/10 space-y-1.5 print:border-slate-300 print:bg-transparent">
                <span className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Terms, Conditions & Factory Policy
                </span>
                <p className="text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed font-mono">
                  {quotation.termsAndConditions}
                </p>
              </div>
            )}

            {/* Acceptance Status Banner or Signature Block */}
            {quotation.status === 'accepted' ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30 p-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span>
                    Formally Accepted by: <strong>{quotation.acceptedBy || quotation.customerName}</strong>
                  </span>
                </div>
                <span className="font-mono text-emerald-700 dark:text-emerald-400 text-[11px]">
                  Timestamp: {quotation.acceptedAt ? new Date(quotation.acceptedAt).toLocaleString() : 'Recorded'}
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 print:border-slate-400">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Prepared for XFORCE By:</p>
                  <div className="h-10 border-b border-dashed border-slate-300 dark:border-slate-700"></div>
                  <p className="mt-1 text-[11px]">Authorized Sales Engineer / Manager</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Client Acceptance Sign-off:</p>
                  <div className="h-10 border-b border-dashed border-slate-300 dark:border-slate-700"></div>
                  <p className="mt-1 text-[11px]">Signature & Date</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Acceptance Modal (Strictly Records Acceptance Only) */}
      {showAcceptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left space-y-4">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
              <CheckCircle2 className="h-5 w-5" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Record Customer Acceptance
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Record that the customer has formally approved Quotation <strong>#{quotation.quotationNumber}</strong>.
            </p>

            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 p-3 text-[11px] text-amber-800 dark:text-amber-300">
              <strong>Module Notice:</strong> This action records customer acceptance and logs the timestamp. Order creation and payment dispatch occur in <strong>Module 10 (Orders & Fulfillment)</strong>.
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Accepted By (Representative Name) *
                </label>
                <input
                  type="text"
                  value={acceptorName}
                  onChange={(e) => setAcceptorName(e.target.value)}
                  placeholder="Full name of client signatory..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 dark:text-slate-300 block mb-1">
                  Customer Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  value={acceptRemarks}
                  onChange={(e) => setAcceptRemarks(e.target.value)}
                  placeholder="e.g. Approved via WhatsApp agreement. Starting delivery next Monday."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAcceptModal(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmAcceptance}
                disabled={isProcessing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isProcessing ? 'Recording...' : 'Confirm Acceptance'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
