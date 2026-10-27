import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Receipt,
  Eye,
  CheckCircle2,
  Clock,
  Ban,
  ArrowUpDown,
  Calendar,
  Building,
} from 'lucide-react';
import { PosSale, PosFilterParams } from '../../types/pos';
import { StockLocation } from '../../types/inventory';
import { posService } from '../../services/pos.service';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface PosSalesHistoryViewProps {
  locations: StockLocation[];
  onViewSale: (sale: PosSale) => void;
  onReprintReceipt: (saleId: string) => void;
}

export const PosSalesHistoryView: React.FC<PosSalesHistoryViewProps> = ({
  locations,
  onViewSale,
  onReprintReceipt,
}) => {
  const [sales, setSales] = useState<PosSale[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const loadSales = async () => {
    try {
      setLoading(true);
      const data = await posService.getSales();
      setSales(data);
    } catch (err) {
      console.error('[PosSalesHistoryView] Error fetching sales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  const filteredSales = useMemo(() => {
    let result = [...sales];

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.saleReference.toLowerCase().includes(q) ||
          s.customerName.toLowerCase().includes(q) ||
          (s.customerPhone && s.customerPhone.toLowerCase().includes(q)) ||
          s.cashierName.toLowerCase().includes(q) ||
          s.items.some((i) => i.productName.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
      );
    }

    // Location
    if (selectedLocation !== 'all') {
      result = result.filter((s) => s.locationId === selectedLocation);
    }

    // Status
    if (selectedStatus !== 'all') {
      result = result.filter((s) => s.status === selectedStatus);
    }

    // Payment Status
    if (selectedPaymentStatus !== 'all') {
      result = result.filter((s) => s.paymentStatus === selectedPaymentStatus);
    }

    // Payment Method
    if (selectedPaymentMethod !== 'all') {
      result = result.filter((s) => s.paymentMethod === selectedPaymentMethod);
    }

    // Date Range
    if (dateRange !== 'all') {
      const now = new Date();
      if (dateRange === 'today') {
        const todayStr = now.toISOString().split('T')[0];
        result = result.filter((s) => s.createdAt.startsWith(todayStr));
      } else if (dateRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
        result = result.filter((s) => new Date(s.createdAt).getTime() >= weekAgo);
      } else if (dateRange === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).getTime();
        result = result.filter((s) => new Date(s.createdAt).getTime() >= monthAgo);
      }
    }

    return result;
  }, [
    sales,
    search,
    selectedLocation,
    selectedStatus,
    selectedPaymentStatus,
    selectedPaymentMethod,
    dateRange,
  ]);

  const handleExportCSV = () => {
    if (filteredSales.length === 0) return;

    const headers = [
      'Sale Reference',
      'Date & Time',
      'Location',
      'Customer',
      'Customer Phone',
      'Cashier',
      'Items Count',
      'Subtotal',
      'Discount',
      'Charges',
      'Total Amount',
      'Amount Paid',
      'Balance Due',
      'Payment Method',
      'Payment Status',
      'Sale Status',
    ];

    const rows = filteredSales.map((s) => [
      `"${s.saleReference}"`,
      `"${new Date(s.createdAt).toISOString()}"`,
      `"${s.locationName}"`,
      `"${s.customerName}"`,
      `"${s.customerPhone || ''}"`,
      `"${s.cashierName}"`,
      s.items.length,
      s.subtotal,
      s.totalDiscountAmount,
      s.additionalChargesFee,
      s.totalAmount,
      s.amountPaid,
      s.balanceDue,
      `"${s.paymentMethod}"`,
      `"${s.paymentStatus}"`,
      `"${s.status}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `xforce_pos_sales_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by sale ref (POS-2026-0001), customer, cashier, product or SKU..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={filteredSales.length === 0}
              className="text-xs flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV ({filteredSales.length})</span>
            </Button>
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Stock Location</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Time Period</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Payment Method</label>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="card_pos">Card POS</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="paystack">Paystack Online</option>
              <option value="ussd">USSD</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Payment Status</label>
            <select
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">All Payment Statuses</option>
              <option value="paid">Fully Paid</option>
              <option value="partially_paid">Partially Paid (Credit)</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Sale Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="all">All Sales</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Voided / Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sales Ledger Table */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">Loading sales transactions...</div>
        ) : filteredSales.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 space-y-2">
            <Receipt className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">No sales transactions found</p>
            <p className="text-slate-400">Try adjusting your search criteria or switch to the Sales Counter tab to make a new sale.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Sale Ref</th>
                  <th className="py-2.5 px-3 font-semibold">Date & Time</th>
                  <th className="py-2.5 px-3 font-semibold">Location</th>
                  <th className="py-2.5 px-3 font-semibold">Customer</th>
                  <th className="py-2.5 px-3 font-semibold">Cashier</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Items</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Total (₦)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Paid (₦)</th>
                  <th className="py-2.5 px-3 font-semibold">Payment</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="py-2.5 px-3">
                      <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                        {sale.saleReference}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      <div>{new Date(sale.createdAt).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                      {sale.locationName}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {sale.customerName}
                      </div>
                      {sale.customerPhone && (
                        <div className="text-[10px] text-slate-400">{sale.customerPhone}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                      {sale.cashierName}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                      {sale.items.length} {sale.items.length === 1 ? 'line' : 'lines'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                      ₦{sale.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      ₦{sale.amountPaid.toLocaleString()}
                      {sale.balanceDue > 0 && (
                        <div className="text-[10px] text-red-500 font-normal">
                          Bal: ₦{sale.balanceDue.toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-slate-700 dark:text-slate-300 block">
                        {sale.paymentMethod.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase">
                        {sale.paymentStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {sale.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                          <Ban className="h-3 w-3" /> Voided
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onViewSale(sale)}
                          className="h-7 px-2 text-xs"
                          title="View Details & Snapshot"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-500" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onReprintReceipt(sale.id)}
                          className="h-7 px-2 text-xs text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                          title="Print Receipt"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
