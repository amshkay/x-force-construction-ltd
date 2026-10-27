/**
 * Order Management Panel
 * Module 10 — Orders, Payments & Customer Tracking
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Primary administrative control center for sales orders, payment records,
 * receipt generation, status transitions, and customer tracking provenance.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  CreditCard,
  Building,
  Truck,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Plus,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  DollarSign,
  PackageCheck,
  Ban,
  Receipt,
  Eye,
  Wrench,
} from 'lucide-react';
import { PageHeader } from '../ui/PageHeader';
import { SearchInput } from '../ui/SearchInput';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import {
  Order,
  OrderStatus,
  OrderPaymentStatus,
  OrderType,
  OrderFilters,
  OrderStats,
  ORDER_STATUS_CONFIG,
  ORDER_PAYMENT_STATUS_CONFIG,
} from '../../types/order';
import { orderService } from '../../services/order.service';
import { OrderDetailModal } from './OrderDetailModal';
import { RecordPaymentModal } from './RecordPaymentModal';
import { PaymentReceiptModal } from './PaymentReceiptModal';
import { CancelOrderModal } from './CancelOrderModal';

interface OrderManagementPanelProps {
  onNavigateToWarehouse?: (orderId?: string) => void;
  onNavigateToInstallations?: (orderId?: string) => void;
  onNavigateToCommunication?: (conversationId?: string) => void;
}

export const OrderManagementPanel: React.FC<OrderManagementPanelProps> = ({
  onNavigateToWarehouse,
  onNavigateToInstallations,
  onNavigateToCommunication,
}) => {
  const toast = useToast();
  const { hasPermission } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<OrderPaymentStatus | 'all'>('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState<OrderType | 'all'>('all');

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [orderForPayment, setOrderForPayment] = useState<Order | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const [orderForCancel, setOrderForCancel] = useState<Order | null>(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedOrders, fetchedStats] = await Promise.all([
        orderService.getAllOrders(),
        orderService.getOrderStats(),
      ]);
      setOrders(fetchedOrders);
      setStats(fetchedStats);
    } catch (err: any) {
      toast.error('Failed to load orders from system ledger.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (paymentStatusFilter !== 'all' && o.paymentStatus !== paymentStatusFilter) return false;
      if (orderTypeFilter !== 'all' && o.orderType !== orderTypeFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matches =
          o.orderNumber.toLowerCase().includes(term) ||
          o.customerName.toLowerCase().includes(term) ||
          o.customerPhone.toLowerCase().includes(term) ||
          (o.customerEmail && o.customerEmail.toLowerCase().includes(term)) ||
          (o.sourceQuotationNumber && o.sourceQuotationNumber.toLowerCase().includes(term)) ||
          (o.sourceRequestNumber && o.sourceRequestNumber.toLowerCase().includes(term));
        if (!matches) return false;
      }
      return true;
    });
  }, [orders, statusFilter, paymentStatusFilter, orderTypeFilter, searchTerm]);

  const handleOpenDetail = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const handleOpenPayment = (order: Order) => {
    setOrderForPayment(order);
    setIsPaymentOpen(true);
  };

  const handleOpenCancel = (order: Order) => {
    setOrderForCancel(order);
    setIsCancelOpen(true);
  };

  const handleOpenReceipt = (paymentId: string) => {
    setReceiptPaymentId(paymentId);
    setIsReceiptOpen(true);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPaymentStatusFilter('all');
    setOrderTypeFilter('all');
  };

  return (
    <div className="space-y-6 text-left" id="order-management-panel">
      {/* Page Header */}
      <PageHeader
        title="Orders & Payments Management"
        description="Oversee confirmed sales orders, track client payment settlements, generate official receipts, and monitor production fulfillment."
        primaryAction={
          <div className="flex items-center gap-2">
            {onNavigateToWarehouse && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Truck className="h-4 w-4 text-orange-600" />}
                onClick={() => onNavigateToWarehouse()}
                className="text-xs"
              >
                Warehouse & Dispatch
              </Button>
            )}
            {onNavigateToInstallations && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Wrench className="h-4 w-4 text-orange-600" />}
                onClick={() => onNavigateToInstallations()}
                className="text-xs"
              >
                Installation Services
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={loadData}
              disabled={isLoading}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Metric KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Orders
              </span>
              <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-orange-600">
                <ShoppingCart className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
              {stats.totalOrders}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Active Bookings in Queue
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Gross Order Value
              </span>
              <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
              ₦ {stats.totalGrossRevenue.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Total Contract Revenue
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Payments Received
              </span>
              <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                <CreditCard className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
              ₦ {stats.totalAmountPaid.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Cleared Cash & Transfers
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Outstanding Balance
              </span>
              <div className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">
              ₦ {stats.totalOutstandingBalance.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Receivables to Collect
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <SearchInput
            placeholder="Search by order #, client, phone, quote #..."
            value={searchTerm}
            onChange={(val) => setSearchTerm(val)}
          />

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
            >
              <option value="all">All Order Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="awaiting_payment">Awaiting Payment</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Fully Paid</option>
              <option value="processing">In Production</option>
              <option value="ready">Ready for Dispatch</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value as OrderPaymentStatus | 'all')}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
            >
              <option value="all">All Payment Statuses</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially Paid (Deposit)</option>
              <option value="paid">Fully Paid</option>
            </select>
          </div>

          <div>
            <select
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value as OrderType | 'all')}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
            >
              <option value="all">All Order Types</option>
              <option value="standard">Standard Supply</option>
              <option value="custom">Custom Batch</option>
              <option value="wholesale">Commercial Wholesale</option>
              <option value="walk_in">Yard Walk-In</option>
            </select>
          </div>
        </div>

        {(searchTerm || statusFilter !== 'all' || paymentStatusFilter !== 'all' || orderTypeFilter !== 'all') && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>
              Showing <strong>{filteredOrders.length}</strong> of {orders.length} orders
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-orange-600 hover:text-orange-700 font-semibold"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-orange-600 mb-2" />
            Loading orders ledger...
          </div>
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart className="h-10 w-10 text-slate-400" />}
            title="No Orders Found"
            description={
              searchTerm || statusFilter !== 'all' || paymentStatusFilter !== 'all'
                ? 'No orders match the selected filters. Try clearing filter criteria.'
                : 'No orders recorded yet. Accepted quotations in Module 09 can be converted to confirmed orders.'
            }
            actionLabel={(searchTerm || statusFilter !== 'all') ? 'Clear Filters' : undefined}
            onAction={(searchTerm || statusFilter !== 'all') ? handleResetFilters : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">Order #</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Origin / Date</th>
                  <th className="p-4">Items Summary</th>
                  <th className="p-4 text-right">Total Amount</th>
                  <th className="p-4 text-right">Paid / Balance</th>
                  <th className="p-4 text-center">Payment</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOrders.map((ord) => {
                  const stCfg = ORDER_STATUS_CONFIG[ord.status];
                  const payCfg = ORDER_PAYMENT_STATUS_CONFIG[ord.paymentStatus];

                  return (
                    <tr
                      key={ord.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(ord)}
                          className="hover:text-orange-600 hover:underline flex items-center gap-1"
                        >
                          <span>{ord.orderNumber}</span>
                          <ArrowUpRight className="h-3 w-3 text-slate-400" />
                        </button>
                      </td>

                      <td className="p-4">
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          {ord.customerName}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {ord.customerPhone}
                        </span>
                      </td>

                      <td className="p-4">
                        {ord.sourceQuotationNumber ? (
                          <span className="text-[11px] font-mono text-orange-600 dark:text-orange-400 block">
                            Quote #{ord.sourceQuotationNumber}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500 block">Direct Order</span>
                        )}
                        <span className="text-[11px] text-slate-400">{ord.orderDate}</span>
                      </td>

                      <td className="p-4 max-w-xs truncate text-slate-600 dark:text-slate-400">
                        {ord.items.map((it) => `${it.quantity} ${it.unit} ${it.productName}`).join(', ') || 'Building Materials'}
                      </td>

                      <td className="p-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {ord.currency} {ord.totalAmount.toLocaleString()}
                      </td>

                      <td className="p-4 text-right font-mono">
                        <span className="text-emerald-600 font-semibold block">
                          {ord.currency} {ord.amountPaid.toLocaleString()}
                        </span>
                        {ord.balanceDue > 0 ? (
                          <span className="text-rose-600 text-[11px] block">
                            Due: {ord.currency} {ord.balanceDue.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-emerald-600 text-[10px] block">Cleared</span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <Badge variant={payCfg.badgeVariant} size="sm">
                          {payCfg.label}
                        </Badge>
                      </td>

                      <td className="p-4 text-center">
                        <Badge variant={stCfg.badgeVariant} size="sm">
                          {stCfg.label}
                        </Badge>
                      </td>

                      <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDetail(ord)}
                          className="text-xs"
                        >
                          View
                        </Button>

                        {ord.requiresInstallation && onNavigateToInstallations && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onNavigateToInstallations(ord.id)}
                            className="text-xs text-orange-600 border-orange-200 dark:border-orange-900/60 hover:bg-orange-50 dark:hover:bg-orange-950/40"
                            title="Schedule or manage on-site installation job"
                          >
                            <Wrench className="h-3 w-3 mr-1" />
                            Install
                          </Button>
                        )}

                        {ord.status !== 'cancelled' && ord.balanceDue > 0 && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenPayment(ord)}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Pay
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <OrderDetailModal
        order={selectedOrder}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onOrderUpdated={(updated) => {
          setSelectedOrder(updated);
          loadData();
        }}
        onRecordPayment={(order) => {
          setIsDetailOpen(false);
          handleOpenPayment(order);
        }}
        onViewReceipt={(paymentId) => {
          handleOpenReceipt(paymentId);
        }}
        onCancelOrder={(order) => {
          setIsDetailOpen(false);
          handleOpenCancel(order);
        }}
        onOpenChat={(convId) => {
          setIsDetailOpen(false);
          onNavigateToCommunication?.(convId);
        }}
      />

      <RecordPaymentModal
        order={orderForPayment}
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onPaymentRecorded={() => {
          loadData();
          if (selectedOrder && orderForPayment && selectedOrder.id === orderForPayment.id) {
            orderService.getOrderById(selectedOrder.id).then((o) => {
              if (o) setSelectedOrder(o);
            });
          }
        }}
      />

      <PaymentReceiptModal
        paymentId={receiptPaymentId}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
      />

      <CancelOrderModal
        order={orderForCancel}
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        onOrderCancelled={() => {
          loadData();
        }}
      />
    </div>
  );
};
