/**
 * Order Detail Modal
 * Module 10 — Orders, Payments & Customer Tracking
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Provides complete administrative view of an order including line items,
 * financial balances, payment history, status progression, and tracking history.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Building,
  Truck,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  FileSpreadsheet,
  AlertTriangle,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import {
  Order,
  OrderStatus,
  ORDER_STATUS_CONFIG,
  ORDER_PAYMENT_STATUS_CONFIG,
} from '../../types/order';
import { PaymentRecord, PAYMENT_METHOD_CONFIG } from '../../types/payment';
import { orderService } from '../../services/order.service';
import { paymentService } from '../../services/payment.service';
import { ContextualChatButton } from '../messaging/ContextualChatButton';

interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated?: (order: Order) => void;
  onRecordPayment?: (order: Order) => void;
  onViewReceipt?: (paymentId: string) => void;
  onCancelOrder?: (order: Order) => void;
  onOpenChat?: (conversationId: string) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  isOpen,
  onClose,
  onOrderUpdated,
  onRecordPayment,
  onViewReceipt,
  onCancelOrder,
  onOpenChat,
}) => {
  const toast = useToast();
  const { profile, hasPermission } = useAuth();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [selectedNextStatus, setSelectedNextStatus] = useState<OrderStatus | ''>('');
  const [statusNote, setStatusNote] = useState('');

  useEffect(() => {
    if (isOpen && order) {
      setIsLoadingPayments(true);
      paymentService
        .getPaymentsForOrder(order.id)
        .then((res) => {
          setPayments(res);
          setIsLoadingPayments(false);
        })
        .catch(() => setIsLoadingPayments(false));

      setSelectedNextStatus('');
      setStatusNote('');
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const statusConfig = ORDER_STATUS_CONFIG[order.status];
  const paymentConfig = ORDER_PAYMENT_STATUS_CONFIG[order.paymentStatus];
  const allowedNext = statusConfig.allowedNextStatuses.filter((s) => s !== 'cancelled');

  const handleUpdateStatus = async () => {
    if (!selectedNextStatus) return;

    setIsChangingStatus(true);
    try {
      const updated = await orderService.updateOrderStatus(
        order.id,
        selectedNextStatus,
        profile?.id || 'admin',
        profile?.full_name || 'Staff Officer',
        statusNote.trim() || undefined
      );

      toast.success(
        `Order #${order.orderNumber} status changed to ${ORDER_STATUS_CONFIG[selectedNextStatus].label}.`,
        'Status Updated'
      );
      setSelectedNextStatus('');
      setStatusNote('');
      onOrderUpdated?.(updated);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update order status.');
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:rounded-none">
        {/* Modal Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-4 py-3.5 sm:px-6 sm:py-4 bg-slate-50 dark:bg-slate-800/60 print:hidden">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                  #{order.orderNumber}
                </h2>
                <Badge variant={statusConfig.badgeVariant} size="sm">
                  {statusConfig.label}
                </Badge>
                <Badge variant={paymentConfig.badgeVariant} size="sm">
                  {paymentConfig.label}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Client: <strong className="text-slate-700 dark:text-slate-200">{order.customerName}</strong> • Date: {order.orderDate}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end">
            {order.status !== 'cancelled' && order.balanceDue > 0 && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<CreditCard className="h-4 w-4" />}
                onClick={() => onRecordPayment?.(order)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Record Payment
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              leftIcon={<Printer className="h-4 w-4" />}
              onClick={handlePrint}
            >
              Print
            </Button>

            {onOpenChat && (
              <ContextualChatButton
                contextType="order"
                contextId={order.id}
                contextSummary={`Order #${order.orderNumber} (${order.customerName})`}
                onOpenChat={(convId) => {
                  onClose();
                  onOpenChat(convId);
                }}
              />
            )}

            {order.status !== 'cancelled' && order.status !== 'completed' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCancelOrder?.(order)}
                className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs"
              >
                Cancel Order
              </Button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs text-slate-700 dark:text-slate-300 print:overflow-visible print:p-8">
          {/* Status Progression Bar */}
          {order.status !== 'cancelled' ? (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-4 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Order Lifecycle Progression
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
                <div className={`p-2 rounded-lg border ${order.status !== 'pending' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold' : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 font-semibold'}`}>
                  1. Confirmed
                </div>
                <div className={`p-2 rounded-lg border ${order.paymentStatus === 'paid' || order.paymentStatus === 'partially_paid' || order.status === 'processing' || order.status === 'ready' || order.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold' : 'border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                  2. Payment / Mobilized
                </div>
                <div className={`p-2 rounded-lg border ${order.status === 'processing' || order.status === 'ready' || order.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold' : 'border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                  3. In Production
                </div>
                <div className={`p-2 rounded-lg border ${order.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold' : order.status === 'ready' ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 font-bold text-blue-700' : 'border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                  4. Dispatched / Delivered
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 p-3.5 border border-rose-200 dark:border-rose-900/60 flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-rose-600 flex-shrink-0" />
              <div>
                <strong className="text-rose-900 dark:text-rose-200 block text-xs">
                  This order was officially cancelled on {order.cancelledAt?.split('T')[0] || 'record'}.
                </strong>
                <p className="text-[11px] text-rose-700 dark:text-rose-300">
                  Reason: {order.cancellationReason || 'Management cancellation'}
                </p>
              </div>
            </div>
          )}

          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Customer Details */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Customer Snapshot
              </span>
              <p className="font-bold text-slate-900 dark:text-white text-sm">
                {order.customerName}
              </p>
              <p>Phone: <strong>{order.customerPhone}</strong></p>
              {order.customerEmail && <p>Email: {order.customerEmail}</p>}
              {order.customerAddress && <p>Billing: {order.customerAddress}</p>}
            </div>

            {/* Delivery & Logistics */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Site & Logistics
              </span>
              <p className="flex items-start gap-1">
                <MapPin className="h-3.5 w-3.5 text-orange-600 mt-0.5 flex-shrink-0" />
                <span>{order.deliveryAddress || order.customerAddress || 'Factory Yard Collection'}</span>
              </p>
              {order.deliveryCity && <p>City: {order.deliveryCity}, {order.deliveryState || 'Enugu'}</p>}
              {order.requiresInstallation && (
                <span className="inline-block rounded bg-orange-100 dark:bg-orange-950/60 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:text-orange-300">
                  Requires Installation / Laying
                </span>
              )}
            </div>

            {/* Commercial Provenance */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Commercial Provenance
              </span>
              {order.sourceQuotationNumber ? (
                <p>Origin Quotation: <strong className="font-mono text-orange-600 dark:text-orange-400">#{order.sourceQuotationNumber}</strong></p>
              ) : (
                <p>Origin: Direct Sales Order</p>
              )}
              {order.sourceRequestNumber && (
                <p>Origin Request: <strong className="font-mono">#{order.sourceRequestNumber}</strong></p>
              )}
              <p>Order Type: <strong className="capitalize">{order.orderType}</strong></p>
              <p>Registered By: {order.createdByName || 'Staff Desk'}</p>
            </div>
          </div>

          {/* Ordered Items Table */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
              Ordered Material Items & Specifications ({order.items.length})
            </h3>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Item & Technical Description</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3 text-right">Quantity</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {order.items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">
                        {item.productName}
                        {item.description && (
                          <span className="block text-[11px] font-normal text-slate-500 dark:text-slate-400">
                            {item.description}
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-500">
                        {item.sku || '—'}
                      </td>
                      <td className="p-3 text-right font-mono font-medium">
                        {item.quantity.toLocaleString()} {item.unit}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {order.currency} {item.unitPrice.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {order.currency} {item.lineTotal.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Breakdown & Balances */}
          <div className="flex flex-col sm:flex-row justify-end gap-6 pt-2">
            <div className="w-full sm:w-80 space-y-1.5 rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800/40">
              <div className="flex justify-between">
                <span className="text-slate-500">Items Subtotal:</span>
                <span className="font-mono">{order.currency} {order.subtotal.toLocaleString()}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Discount:</span>
                  <span className="font-mono">- {order.currency} {order.discountAmount.toLocaleString()}</span>
                </div>
              )}
              {order.deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Delivery Logistics:</span>
                  <span className="font-mono">{order.currency} {order.deliveryFee.toLocaleString()}</span>
                </div>
              )}
              {order.installationFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Installation Labor:</span>
                  <span className="font-mono">{order.currency} {order.installationFee.toLocaleString()}</span>
                </div>
              )}
              {order.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">VAT ({order.taxRate}%):</span>
                  <span className="font-mono">{order.currency} {order.taxAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-900 dark:text-white">
                <span>Grand Total:</span>
                <span className="font-mono text-orange-600 dark:text-orange-400">
                  {order.currency} {order.totalAmount.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>Amount Paid:</span>
                <span className="font-mono">{order.currency} {order.amountPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-black text-rose-600 dark:text-rose-400">
                <span>Balance Due:</span>
                <span className="font-mono text-sm">{order.currency} {order.balanceDue.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Payment History Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-emerald-600" />
                <span>Verified Payment Transactions ({payments.length})</span>
              </h3>
              {order.status !== 'cancelled' && order.balanceDue > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRecordPayment?.(order)}
                  className="text-xs"
                >
                  + Add Payment
                </Button>
              )}
            </div>

            {isLoadingPayments ? (
              <p className="text-slate-400 text-xs py-4 text-center">Loading payment records...</p>
            ) : payments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-400">
                No payments recorded yet against this order.
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Payment #</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Channel</th>
                      <th className="p-3">Reference</th>
                      <th className="p-3 text-right">Amount Paid</th>
                      <th className="p-3 text-right print:hidden">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{p.paymentNumber}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{p.paymentDate}</td>
                        <td className="p-3 text-slate-700 dark:text-slate-300 font-sans text-xs">
                          {PAYMENT_METHOD_CONFIG[p.paymentMethod]?.label || p.paymentMethod}
                        </td>
                        <td className="p-3 text-slate-500 text-[11px]">{p.referenceNumber}</td>
                        <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                          {p.currency} {p.amount.toLocaleString()}
                        </td>
                        <td className="p-3 text-right print:hidden font-sans">
                          <button
                            type="button"
                            onClick={() => onViewReceipt?.(p.id)}
                            className="rounded px-2 py-1 bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-orange-100 dark:hover:bg-orange-950 hover:text-orange-600"
                          >
                            Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Administrative Status Transition Control (Hidden on print) */}
          {order.status !== 'cancelled' && order.status !== 'completed' && allowedNext.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/60 dark:bg-slate-800/30 space-y-3 print:hidden">
              <span className="font-bold text-slate-900 dark:text-white text-xs block">
                Advance Production / Delivery Status
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <select
                    value={selectedNextStatus}
                    onChange={(e) => setSelectedNextStatus(e.target.value as OrderStatus)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="">-- Choose Next Status --</option>
                    {allowedNext.map((st) => (
                      <option key={st} value={st}>
                        {ORDER_STATUS_CONFIG[st].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 flex gap-2">
                  <input
                    type="text"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Status transition remarks (e.g. 5,000 blocks cured and ready for loading)..."
                    className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-xs text-slate-900 dark:text-white"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!selectedNextStatus || isChangingStatus}
                    onClick={handleUpdateStatus}
                  >
                    {isChangingStatus ? 'Updating...' : 'Update Status'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Audit Status History Timeline */}
          {order.statusHistory && order.statusHistory.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-wider block">
                Operational Audit Log & Status History
              </span>
              <div className="space-y-2">
                {order.statusHistory.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-start gap-2.5 rounded-lg border border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-800/40 p-2.5 text-[11px]"
                  >
                    <Clock className="h-3.5 w-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 dark:text-white capitalize">
                          {h.newStatus.replace(/_/g, ' ')}
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          {new Date(h.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 mt-0.5">{h.note}</p>
                      <span className="text-[10px] text-slate-400">By: {h.changedByName || h.changedBy}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
