import React from 'react';
import {
  X,
  ClipboardList,
  Calendar,
  MapPin,
  User,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileCheck,
  Printer,
  Download,
  Eye,
  EyeOff,
  History,
} from 'lucide-react';
import { StockCountSession } from '../../types/stockCount';
import { formatDate } from '../../utils/formatters';
import { stockCountService } from '../../services/stockCount.service';

interface StockCountDetailModalProps {
  isOpen: boolean;
  session: StockCountSession | null;
  onClose: () => void;
  onOpenCountingSheet: () => void;
  onOpenReview: () => void;
  onOpenReconcile: () => void;
  onOpenPrint: () => void;
}

export const StockCountDetailModal: React.FC<StockCountDetailModalProps> = ({
  isOpen,
  session,
  onClose,
  onOpenCountingSheet,
  onOpenReview,
  onOpenReconcile,
  onOpenPrint,
}) => {
  if (!isOpen || !session) return null;

  const totalItems = session.items.length;
  const countedItems = session.items.filter((i) => i.countedQuantity !== null);
  const matchedItems = session.items.filter((i) => i.variance === 0);
  const shortageItems = session.items.filter((i) => i.variance !== null && i.variance < 0);
  const surplusItems = session.items.filter((i) => i.variance !== null && i.variance > 0);
  const uncountedItems = totalItems - countedItems.length;

  const handleExportCSV = () => {
    const csvContent = stockCountService.generateSessionCSV(session);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${session.countNumber}_count_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: StockCountSession['status']) => {
    switch (status) {
      case 'reconciled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
            Reconciled
          </span>
        );
      case 'approved':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
            Approved
          </span>
        );
      case 'submitted':
      case 'under_review':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
            Under Review
          </span>
        );
      case 'counting':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
            Counting in Progress
          </span>
        );
      case 'open':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            Open
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-slate-900 dark:text-white font-mono">
                  {session.countNumber}
                </h2>
                {getStatusBadge(session.status)}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Stock Count Session Details & Reconciliation Status
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenPrint}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Print Count Sheet"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={handleExportCSV}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Export CSV"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <MapPin className="w-3.5 h-3.5" />
                Location
              </div>
              <div className="font-semibold text-sm text-slate-900 dark:text-white">
                {session.locationName}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">{session.locationCode}</div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <Calendar className="w-3.5 h-3.5" />
                Count Date
              </div>
              <div className="font-semibold text-sm text-slate-900 dark:text-white">
                {session.countDate}
              </div>
              <div className="text-[11px] text-slate-400">
                Created: {formatDate(session.createdAt, 'short')}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <User className="w-3.5 h-3.5" />
                Initiated By
              </div>
              <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                {session.initiatedByName}
              </div>
              <div className="text-[11px] text-slate-400">
                Scope: {session.scope.replace('_', ' ')}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                {session.isBlindCount ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                Counting Protocol
              </div>
              <div className="font-semibold text-sm text-slate-900 dark:text-white">
                {session.isBlindCount ? 'Blind Count' : 'Standard'}
              </div>
              <div className="text-[11px] text-slate-400">
                {session.significantVarianceThreshold ? 'Threshold Active' : 'Standard Tolerance'}
              </div>
            </div>
          </div>

          {/* KPI Count Results */}
          <div>
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
              Physical Count Results Overview
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <span className="text-xs text-slate-500">Total Items</span>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {totalItems}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20">
                <span className="text-xs text-emerald-600 dark:text-emerald-400">Matched (0 Delta)</span>
                <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                  {matchedItems.length}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/20">
                <span className="text-xs text-red-600 dark:text-red-400">Shortages</span>
                <div className="text-lg font-bold text-red-700 dark:text-red-300 mt-1">
                  {shortageItems.length}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/20">
                <span className="text-xs text-blue-600 dark:text-blue-400">Surpluses</span>
                <div className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-1">
                  {surplusItems.length}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <span className="text-xs text-slate-500">Uncounted</span>
                <div className="text-lg font-bold text-slate-600 dark:text-slate-400 mt-1">
                  {uncountedItems}
                </div>
              </div>
            </div>
          </div>

          {/* Audit Trail & Sign-offs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <span className="font-semibold text-slate-900 dark:text-white block uppercase tracking-wider text-[11px]">
                Session Workflow & Approvals
              </span>
              <div className="flex justify-between text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700">
                <span>Initiated:</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {session.initiatedByName} ({formatDate(session.createdAt, 'short')})
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Submitted:</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {session.completedAt ? formatDate(session.completedAt, 'short') : 'In progress'}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Approved:</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {session.approvedByName
                    ? `${session.approvedByName} (${session.approvedAt ? formatDate(session.approvedAt, 'short') : '-'})`
                    : 'Pending supervisor approval'}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Reconciled:</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {session.reconciledByName
                    ? `${session.reconciledByName} (${session.reconciledAt ? formatDate(session.reconciledAt, 'short') : '-'})`
                    : 'Not reconciled'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <span className="font-semibold text-slate-900 dark:text-white block uppercase tracking-wider text-[11px]">
                Notes & Supervisor Review
              </span>
              <div className="text-slate-600 dark:text-slate-400">
                <span className="font-medium text-slate-700 dark:text-slate-300">Session Notes:</span>{' '}
                {session.notes || 'None recorded.'}
              </div>
              {session.reviewNotes && (
                <div className="text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Review Notes:</span>{' '}
                  {session.reviewNotes}
                </div>
              )}
            </div>
          </div>

          {/* Items Summary Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Session Items Inventory Ledger ({totalItems} products)
              </h3>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 sticky top-0">
                    <tr>
                      <th className="p-2.5">Product & SKU</th>
                      <th className="p-2.5 text-right">System Snapshot</th>
                      <th className="p-2.5 text-right">Counted</th>
                      <th className="p-2.5 text-right">Variance</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {session.items.map((item) => {
                      const v = item.variance;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="p-2.5">
                            <span className="font-semibold text-slate-900 dark:text-white block">
                              {item.productName}
                            </span>
                            <span className="text-slate-500 text-[11px]">
                              {item.variantName ? `${item.variantName} · ` : ''}SKU: {item.sku}
                            </span>
                          </td>
                          <td className="p-2.5 text-right text-slate-700 dark:text-slate-300">
                            {item.systemQuantitySnapshot.toLocaleString()} {item.unit}
                          </td>
                          <td className="p-2.5 text-right font-medium text-slate-900 dark:text-white">
                            {item.countedQuantity !== null ? `${item.countedQuantity.toLocaleString()} ${item.unit}` : '-'}
                          </td>
                          <td className="p-2.5 text-right">
                            {v !== null ? (
                              v === 0 ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">0</span>
                              ) : v < 0 ? (
                                <span className="text-red-600 dark:text-red-400 font-bold">{v}</span>
                              ) : (
                                <span className="text-blue-600 dark:text-blue-400 font-bold">+{v}</span>
                              )
                            ) : (
                              <span className="text-slate-400 italic">Uncounted</span>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                              {item.varianceStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2.5">
            {['open', 'counting'].includes(session.status) && (
              <button
                type="button"
                onClick={onOpenCountingSheet}
                className="px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <ClipboardList className="w-4 h-4" />
                Open Counting Sheet
              </button>
            )}

            {['submitted', 'under_review'].includes(session.status) && (
              <button
                type="button"
                onClick={onOpenReview}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4" />
                Review Discrepancies
              </button>
            )}

            {session.status === 'approved' && (
              <button
                type="button"
                onClick={onOpenReconcile}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <FileCheck className="w-4 h-4" />
                Reconcile Inventory
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
