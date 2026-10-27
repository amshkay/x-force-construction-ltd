/**
 * Request Management Panel
 * Module 09 — Customer Requests & Quotation Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Eye,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  User,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useToast } from '../ui/Toast';
import {
  CustomerRequest,
  RequestStatus,
  RequestType,
  RequestStats,
  REQUEST_TYPE_LABELS,
  REQUEST_STATUS_CONFIG,
} from '../../types/request';
import { requestService } from '../../services/request.service';
import { RequestDetailModal } from './RequestDetailModal';

interface RequestManagementPanelProps {
  onNavigateToQuotationBuilder?: (requestId?: string) => void;
}

export const RequestManagementPanel: React.FC<RequestManagementPanelProps> = ({
  onNavigateToQuotationBuilder,
}) => {
  const toast = useToast();
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [stats, setStats] = useState<RequestStats>({
    total: 0,
    submitted: 0,
    underReview: 0,
    quotationPrepared: 0,
    quotationSent: 0,
    accepted: 0,
    closed: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Selected request for details modal
  const [selectedRequest, setSelectedRequest] = useState<CustomerRequest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Load requests
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedRequests, fetchedStats] = await Promise.all([
        requestService.getRequests({
          search: searchQuery || undefined,
          status: statusFilter === 'all' ? undefined : (statusFilter as RequestStatus),
          requestType: typeFilter === 'all' ? undefined : (typeFilter as RequestType),
        }),
        requestService.getStats(),
      ]);

      setRequests(fetchedRequests);
      setStats(fetchedStats);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load customer requests.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleOpenDetail = (req: CustomerRequest) => {
    setSelectedRequest(req);
    setIsDetailModalOpen(true);
  };

  const handleCreateQuotation = (req: CustomerRequest) => {
    setIsDetailModalOpen(false);
    onNavigateToQuotationBuilder?.(req.id);
  };

  return (
    <div className="space-y-6 text-left" id="module09-request-management">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Inquiries</span>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">New Submitted</span>
          <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.submitted}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Under Review</span>
          <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.underReview}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">Quote Prepared</span>
          <p className="mt-1 text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.quotationPrepared}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Quote Sent</span>
          <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.quotationSent}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Client Accepted</span>
          <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.accepted}</p>
        </div>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ref #, client name, phone, city..."
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
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="awaiting_customer_info">Awaiting Customer Info</option>
            <option value="quotation_prepared">Quotation Prepared</option>
            <option value="quotation_sent">Quotation Sent</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
            <option value="closed">Closed</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Request Types</option>
            <option value="product_only">Materials Only</option>
            <option value="service_only">Installation Only</option>
            <option value="product_and_service">Materials + Installation</option>
            <option value="site_inspection">Site Inspection</option>
            <option value="general_quotation">General Project Quotation</option>
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
        </div>
      </div>

      {/* Requests Data Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-orange-600" />
            Loading customer requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
            <FileText className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">No customer requests found</p>
            <p className="text-xs">
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try broadening your search query or adjusting your filters.'
                : 'Customer inquiries submitted via the public quote request portal will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                <tr>
                  <th className="py-3.5 pl-4 pr-3">Reference #</th>
                  <th className="px-3 py-3.5">Customer & Site</th>
                  <th className="px-3 py-3.5">Type & Items</th>
                  <th className="px-3 py-3.5">Status</th>
                  <th className="px-3 py-3.5">Quotation Ref</th>
                  <th className="px-3 py-3.5">Date</th>
                  <th className="py-3.5 pl-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {requests.map((req) => {
                  const statusConf = REQUEST_STATUS_CONFIG[req.status];
                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="py-3.5 pl-4 pr-3 font-mono font-bold text-orange-600 dark:text-orange-400">
                        {req.requestNumber}
                      </td>

                      <td className="px-3 py-3.5">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {req.customerName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Phone className="h-3 w-3" />
                          <span>{req.customerPhone}</span>
                          {req.projectCity && <span>• {req.projectCity}</span>}
                        </div>
                      </td>

                      <td className="px-3 py-3.5">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {REQUEST_TYPE_LABELS[req.requestType]}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs mt-0.5">
                          {req.items.length > 0
                            ? req.items.map((it) => `${it.quantity} ${it.unit} ${it.itemName}`).join(', ')
                            : req.customerComments || 'General project inquiry'}
                        </div>
                      </td>

                      <td className="px-3 py-3.5">
                        <Badge variant={statusConf.badgeVariant}>
                          {statusConf.label}
                        </Badge>
                      </td>

                      <td className="px-3 py-3.5 font-mono text-[11px]">
                        {req.quotationNumber ? (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {req.quotationNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      <td className="px-3 py-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 pl-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDetail(req)}
                            className="h-7 text-xs px-2"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Review
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleCreateQuotation(req)}
                            className="h-7 text-xs px-2"
                            title="Compile official quotation"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />
                            Quote
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

      {/* Detail Slideover / Modal */}
      <RequestDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        request={selectedRequest}
        onStatusUpdated={(updated) => {
          setSelectedRequest(updated);
          loadData();
        }}
        onCreateQuotation={handleCreateQuotation}
      />
    </div>
  );
};
