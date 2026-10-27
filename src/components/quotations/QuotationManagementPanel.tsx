/**
 * Quotation Management Panel
 * Module 09 — Customer Requests & Quotation Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 */

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Eye,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  User,
  Calendar,
  Send,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import {
  Quotation,
  QuotationStatus,
  QuotationStats,
  QUOTATION_STATUS_CONFIG,
} from '../../types/quotation';
import { quotationService } from '../../services/quotation.service';
import { QuotationBuilderModal } from './QuotationBuilderModal';
import { QuotationDetailModal } from './QuotationDetailModal';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';

interface QuotationManagementPanelProps {
  initialRequestId?: string | null;
  onClearInitialRequest?: () => void;
  onNavigateToOrders?: (orderId?: string) => void;
}

export const QuotationManagementPanel: React.FC<QuotationManagementPanelProps> = ({
  initialRequestId,
  onClearInitialRequest,
  onNavigateToOrders,
}) => {
  const toast = useToast();
  const { settings } = useBusinessSettings();
  const currencySymbol = settings?.regional?.currencySymbol || '₦';

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [stats, setStats] = useState<QuotationStats>({
    total: 0,
    drafts: 0,
    pendingApproval: 0,
    sent: 0,
    accepted: 0,
    declined: 0,
    expired: 0,
    totalQuotedValue: 0,
    totalAcceptedValue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal states
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [builderRequestId, setBuilderRequestId] = useState<string | null>(initialRequestId || null);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);

  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Auto-open builder if initialRequestId is passed
  useEffect(() => {
    if (initialRequestId) {
      setBuilderRequestId(initialRequestId);
      setEditingQuotation(null);
      setIsBuilderOpen(true);
      onClearInitialRequest?.();
    }
  }, [initialRequestId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allQuotes, allStats] = await Promise.all([
        quotationService.getQuotations({
          search: searchQuery || undefined,
          status: statusFilter === 'all' ? undefined : (statusFilter as QuotationStatus),
        }),
        quotationService.getStats(),
      ]);

      setQuotations(allQuotes);
      setStats(allStats);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load quotations.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleCreateNew = () => {
    setBuilderRequestId(null);
    setEditingQuotation(null);
    setIsBuilderOpen(true);
  };

  const handleViewQuotation = (q: Quotation) => {
    setSelectedQuotation(q);
    setIsDetailOpen(true);
  };

  const handleEditDraft = (q: Quotation) => {
    setEditingQuotation(q);
    setBuilderRequestId(null);
    setIsBuilderOpen(true);
  };

  return (
    <div className="space-y-6 text-left" id="module09-quotations-management">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Quotes</span>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Drafts</span>
          <p className="mt-1 text-2xl font-bold text-slate-700 dark:text-slate-300">{stats.drafts}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Sent / In Review</span>
          <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.sent}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Accepted</span>
          <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.accepted}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Total Quoted Value</span>
          <p className="mt-1 text-lg font-bold font-mono text-slate-900 dark:text-white truncate">
            {currencySymbol}{stats.totalQuotedValue.toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Accepted Value</span>
          <p className="mt-1 text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400 truncate">
            {currencySymbol}{stats.totalAcceptedValue.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by quote #, client name, phone, request #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <Button type="submit" size="sm" variant="outline">
            Filter
          </Button>
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Quotations</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="viewed">Viewed</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <Button
            size="sm"
            variant="ghost"
            onClick={loadData}
            title="Refresh List"
            className="p-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={handleCreateNew}
            className="flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Create Quotation</span>
          </Button>
        </div>
      </div>

      {/* Quotations Data Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-orange-600" />
            Loading quotations...
          </div>
        ) : quotations.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
            <FileSpreadsheet className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">No quotations found</p>
            <p className="text-xs">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search criteria.'
                : 'Click "Create Quotation" or generate one directly from a Customer Request.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                <tr>
                  <th className="py-3.5 pl-4 pr-3">Quotation #</th>
                  <th className="px-3 py-3.5">Customer & Site</th>
                  <th className="px-3 py-3.5">Summary</th>
                  <th className="px-3 py-3.5">Grand Total</th>
                  <th className="px-3 py-3.5">Status</th>
                  <th className="px-3 py-3.5">Valid Until</th>
                  <th className="py-3.5 pl-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {quotations.map((q) => {
                  const statusConf = QUOTATION_STATUS_CONFIG[q.status];
                  return (
                    <tr
                      key={q.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="py-3.5 pl-4 pr-3">
                        <span className="font-mono font-bold text-orange-600 dark:text-orange-400 block">
                          {q.quotationNumber}
                        </span>
                        {q.requestNumber && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Ref: {q.requestNumber}
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3.5">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {q.customerName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Phone className="h-3 w-3" />
                          <span>{q.customerPhone}</span>
                        </div>
                      </td>

                      <td className="px-3 py-3.5">
                        <div className="text-slate-800 dark:text-slate-200 font-medium">
                          {q.items.length} line item{q.items.length !== 1 ? 's' : ''}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs mt-0.5">
                          {q.items.map((it) => it.description).join(', ')}
                        </div>
                      </td>

                      <td className="px-3 py-3.5 font-mono font-bold text-slate-900 dark:text-white">
                        {currencySymbol}{q.totalAmount.toLocaleString()}
                      </td>

                      <td className="px-3 py-3.5">
                        <Badge variant={statusConf.badgeVariant}>
                          {statusConf.label}
                        </Badge>
                      </td>

                      <td className="px-3 py-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {q.validUntil}
                      </td>

                      <td className="py-3.5 pl-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {q.status === 'draft' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditDraft(q)}
                              className="h-7 text-xs px-2"
                              title="Edit Draft"
                            >
                              Edit
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewQuotation(q)}
                            className="h-7 text-xs px-2"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View / Print
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Builder Modal */}
      <QuotationBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        initialRequestId={builderRequestId}
        existingQuotation={editingQuotation}
        onQuotationCreated={() => {
          loadData();
        }}
      />

      {/* Detail / Official Print Modal */}
      <QuotationDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        quotation={selectedQuotation}
        onNavigateToOrder={onNavigateToOrders}
        onStatusUpdated={(updated) => {
          setSelectedQuotation(updated);
          loadData();
        }}
      />
    </div>
  );
};
