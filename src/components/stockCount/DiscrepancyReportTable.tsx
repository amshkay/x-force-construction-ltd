import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Search,
  Download,
  RotateCcw,
  Eye,
  Filter,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';
import { StockCountSession, StockCountItem, StockCountStatus } from '../../types/stockCount';
import { stockCountService } from '../../services/stockCount.service';
import { StockLocation } from '../../types/inventory';
import { formatDate } from '../../utils/formatters';

interface DiscrepancyReportTableProps {
  sessions: StockCountSession[];
  locations: StockLocation[];
  onOpenSessionDetail: (session: StockCountSession) => void;
  onOpenReviewSession: (session: StockCountSession) => void;
  onRecountItem: (item: StockCountItem, session: StockCountSession) => void;
}

interface EnrichedDiscrepancyItem extends StockCountItem {
  session: StockCountSession;
}

export const DiscrepancyReportTable: React.FC<DiscrepancyReportTableProps> = ({
  sessions,
  locations,
  onOpenSessionDetail,
  onOpenReviewSession,
  onRecountItem,
}) => {
  const [typeFilter, setTypeFilter] = useState<'all' | 'shortage' | 'surplus'>('all');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract all discrepancy items across sessions
  const allDiscrepancies = useMemo(() => {
    const list: EnrichedDiscrepancyItem[] = [];
    sessions.forEach((s) => {
      s.items.forEach((item) => {
        if (item.variance !== null && item.variance !== 0) {
          list.push({
            ...item,
            session: s,
          });
        }
      });
    });
    return list;
  }, [sessions]);

  // Filtered discrepancies
  const filteredItems = useMemo(() => {
    return allDiscrepancies.filter((item) => {
      // Type filter
      if (typeFilter === 'shortage' && (item.variance ?? 0) >= 0) return false;
      if (typeFilter === 'surplus' && (item.variance ?? 0) <= 0) return false;

      // Location filter
      if (selectedLocationId !== 'all' && item.locationId !== selectedLocationId) return false;

      // Session filter
      if (selectedSessionId !== 'all' && item.stockCountId !== selectedSessionId) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          item.productName.toLowerCase().includes(q) ||
          (item.variantName && item.variantName.toLowerCase().includes(q)) ||
          item.sku.toLowerCase().includes(q) ||
          item.session.countNumber.toLowerCase().includes(q) ||
          item.session.locationName.toLowerCase().includes(q) ||
          (item.counterName && item.counterName.toLowerCase().includes(q)) ||
          (item.notes && item.notes.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [allDiscrepancies, typeFilter, selectedLocationId, selectedSessionId, searchQuery]);

  // Aggregate Metrics
  const totalDiscrepancies = allDiscrepancies.length;
  const shortageCount = allDiscrepancies.filter((d) => (d.variance ?? 0) < 0).length;
  const surplusCount = allDiscrepancies.filter((d) => (d.variance ?? 0) > 0).length;

  const handleExportCSV = () => {
    if (filteredItems.length === 0) return;

    const payload = filteredItems.map((it) => ({
      ...it,
      sessionCountNumber: it.session.countNumber,
      sessionLocationName: it.session.locationName,
      sessionDate: it.session.countDate,
    }));

    const csvContent = stockCountService.generateDiscrepanciesCSV(payload);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `xforce_stock_discrepancies_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Total Discrepancies</span>
            <AlertTriangle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {totalDiscrepancies} items
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Variance items across all counts</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-red-200 dark:border-red-900/40 shadow-xs">
          <div className="flex items-center justify-between text-xs text-red-600 dark:text-red-400">
            <span>Physical Shortages</span>
            <ArrowDownRight className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">
            {shortageCount} items
          </div>
          <span className="text-[11px] text-red-500/80 mt-1 block">Counted lower than system snapshot</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-blue-200 dark:border-blue-900/40 shadow-xs">
          <div className="flex items-center justify-between text-xs text-blue-600 dark:text-blue-400">
            <span>Physical Surpluses</span>
            <ArrowUpRight className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
            {surplusCount} items
          </div>
          <span className="text-[11px] text-blue-500/80 mt-1 block">Counted higher than system snapshot</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
        {/* Type tabs */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                typeFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              All Discrepancies ({allDiscrepancies.length})
            </button>
            <button
              onClick={() => setTypeFilter('shortage')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                typeFilter === 'shortage'
                  ? 'bg-red-600 text-white font-semibold'
                  : 'text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
              }`}
            >
              Shortages Only ({shortageCount})
            </button>
            <button
              onClick={() => setTypeFilter('surplus')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                typeFilter === 'surplus'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30'
              }`}
            >
              Surpluses Only ({surplusCount})
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredItems.length === 0}
            className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export Discrepancies CSV
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product, SKU, count #, notes..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="all">All Stock Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="all">All Count Sessions</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.countNumber} — {s.locationName} ({s.countDate})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Discrepancies Table */}
      <div className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3.5">Count Session</th>
                <th className="p-3.5">Location</th>
                <th className="p-3.5">Product & Variant</th>
                <th className="p-3.5 text-right">System Snapshot</th>
                <th className="p-3.5 text-right">Physical Count</th>
                <th className="p-3.5 text-right">Variance</th>
                <th className="p-3.5">Counter / Recount</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No stock count discrepancies match filters
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchQuery || selectedLocationId !== 'all' || selectedSessionId !== 'all'
                        ? 'Try clearing your search filters.'
                        : 'Yard physical counts and system balances are currently 100% matched.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const v = item.variance ?? 0;
                  const isShortage = v < 0;

                  return (
                    <tr
                      key={`${item.stockCountId}-${item.id}`}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-3.5">
                        <button
                          type="button"
                          onClick={() => onOpenSessionDetail(item.session)}
                          className="font-mono font-bold text-orange-600 dark:text-orange-400 hover:underline block text-left"
                        >
                          {item.session.countNumber}
                        </button>
                        <span className="text-[11px] text-slate-400">
                          Date: {item.session.countDate}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          {item.session.locationName}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {item.session.locationCode}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          {item.productName}
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          {item.variantName ? `${item.variantName} · ` : ''}SKU: {item.sku}
                        </span>
                        {item.hasMovementDuringCount && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            Live movement during count
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-right font-medium text-slate-700 dark:text-slate-300">
                        {item.systemQuantitySnapshot.toLocaleString()} {item.unit}
                      </td>

                      <td className="p-3.5 text-right font-semibold text-slate-900 dark:text-white">
                        {item.countedQuantity !== null ? item.countedQuantity.toLocaleString() : '-'} {item.unit}
                      </td>

                      <td className="p-3.5 text-right">
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                            isShortage
                              ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                              : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                          }`}
                        >
                          {isShortage ? `${v}` : `+${v}`} {item.unit}
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-600 dark:text-slate-400 max-w-xs">
                        <span className="block text-slate-800 dark:text-slate-200 font-medium">
                          {item.counterName || item.session.initiatedByName}
                        </span>
                        {item.isRecounted && (
                          <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 block">
                            Recounted ({item.recounts.length}x)
                          </span>
                        )}
                        {item.notes && (
                          <span className="block text-[11px] text-slate-500 italic truncate max-w-[180px]">
                            {item.notes}
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-center">
                        {item.varianceStatus === 'recount_required' ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                            Recount Requested
                          </span>
                        ) : item.varianceStatus === 'approved' ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                            Approved
                          </span>
                        ) : item.varianceStatus === 'reconciled' ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                            Reconciled
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                            Pending Review
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {['submitted', 'under_review'].includes(item.session.status) && (
                            <button
                              type="button"
                              onClick={() => onOpenReviewSession(item.session)}
                              className="px-2 py-1 text-xs rounded bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors"
                              title="Review Discrepancies"
                            >
                              Review
                            </button>
                          )}

                          {!['reconciled', 'cancelled'].includes(item.session.status) && (
                            <button
                              type="button"
                              onClick={() => onRecountItem(item, item.session)}
                              className="p-1 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 rounded hover:bg-purple-50 dark:hover:bg-purple-950/40"
                              title="Request or Perform Recount"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onOpenSessionDetail(item.session)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                            title="View Session Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
