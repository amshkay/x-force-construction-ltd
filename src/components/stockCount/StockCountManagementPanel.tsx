import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Printer,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RotateCcw,
  FileCheck,
  ChevronRight,
  Eye,
  Trash2,
  Calendar,
  X,
} from 'lucide-react';
import {
  StockCountSession,
  StockCountItem,
  StockCountStatus,
  StockCountStats,
} from '../../types/stockCount';
import { stockCountService } from '../../services/stockCount.service';
import { stockLocationRepository } from '../../repositories/stockLocation.repository';
import { StockLocation } from '../../types/inventory';
import { useAuth } from '../../hooks/useAuth';
import { PERMISSION_CODES } from '../../types/auth';
import { formatDate } from '../../utils/formatters';

import { CreateStockCountModal } from './CreateStockCountModal';
import { CountingSheetModal } from './CountingSheetModal';
import { DiscrepancyReviewModal } from './DiscrepancyReviewModal';
import { ReconcileModal } from './ReconcileModal';
import { RecountItemModal } from './RecountItemModal';
import { PrintCountSheetModal } from './PrintCountSheetModal';
import { StockCountDetailModal } from './StockCountDetailModal';
import { DiscrepancyReportTable } from './DiscrepancyReportTable';

export const StockCountManagementPanel: React.FC = () => {
  const { hasPermission, profile, currentUser } = useAuth();
  const canCreate = hasPermission(PERMISSION_CODES.STOCK_COUNTS_CREATE);
  const canCount = hasPermission(PERMISSION_CODES.STOCK_COUNTS_COUNT);
  const canReview = hasPermission(PERMISSION_CODES.STOCK_COUNTS_REVIEW);
  const canReconcile = hasPermission(PERMISSION_CODES.STOCK_COUNTS_RECONCILE);
  const canCancel = hasPermission(PERMISSION_CODES.STOCK_COUNTS_CANCEL);

  const [activeViewTab, setActiveViewTab] = useState<'sessions' | 'discrepancies'>('sessions');

  const [sessions, setSessions] = useState<StockCountSession[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [stats, setStats] = useState<StockCountStats>({
    totalSessions: 0,
    activeSessions: 0,
    pendingReviewSessions: 0,
    reconciledSessions: 0,
    totalDiscrepancyItems: 0,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');

  // Cancel Session State
  const [sessionToCancel, setSessionToCancel] = useState<StockCountSession | null>(null);
  const [cancellationReason, setCancellationReason] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedSessionForDetail, setSelectedSessionForDetail] = useState<StockCountSession | null>(null);
  const [activeCountingSession, setActiveCountingSession] = useState<StockCountSession | null>(null);
  const [activeReviewSession, setActiveReviewSession] = useState<StockCountSession | null>(null);
  const [activeReconcileSession, setActiveReconcileSession] = useState<StockCountSession | null>(null);
  const [activePrintSession, setActivePrintSession] = useState<StockCountSession | null>(null);
  const [activeRecountItem, setActiveRecountItem] = useState<{ item: StockCountItem; session: StockCountSession } | null>(null);

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [fetchedSessions, fetchedLocations, fetchedStats] = await Promise.all([
        stockCountService.getSessions({
          locationId: locationFilter !== 'all' ? locationFilter : undefined,
          status: statusFilter !== 'all' ? (statusFilter as StockCountStatus) : undefined,
          searchQuery: searchQuery.trim() || undefined,
        }),
        stockLocationRepository.getActiveLocations(),
        stockCountService.getStats(),
      ]);

      setSessions(fetchedSessions);
      setLocations(fetchedLocations);
      setStats(fetchedStats);
    } catch (err: any) {
      showNotification('Failed to load physical stock counts.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, locationFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleExportAllCSV = () => {
    if (sessions.length === 0) {
      showNotification('No stock count sessions available to export.', 'error');
      return;
    }

    const headers = [
      'Count Reference',
      'Location',
      'Count Date',
      'Scope',
      'Status',
      'Blind Mode',
      'Total Items',
      'Matched',
      'Discrepancies',
      'Initiated By',
      'Approved By',
      'Reconciled By',
    ];

    const rows = sessions.map((s) => {
      const matched = s.items.filter((i) => i.variance === 0).length;
      const discrepancies = s.items.filter((i) => i.variance !== null && i.variance !== 0).length;
      return [
        `"${s.countNumber}"`,
        `"${s.locationName}"`,
        `"${s.countDate}"`,
        `"${s.scope}"`,
        `"${s.status}"`,
        s.isBlindCount ? 'Yes' : 'No',
        s.items.length,
        matched,
        discrepancies,
        `"${s.initiatedByName}"`,
        `"${s.approvedByName || '-'}"`,
        `"${s.reconciledByName || '-'}"`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `xforce_stock_counts_summary_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCancelSession = (session: StockCountSession) => {
    setSessionToCancel(session);
    setCancellationReason('');
  };

  const confirmCancelSession = async () => {
    if (!sessionToCancel) return;
    try {
      setIsCancelling(true);
      await stockCountService.cancelSession(
        sessionToCancel.id,
        cancellationReason.trim() || 'Cancelled by authorized staff',
        profile?.id || currentUser?.id || 'admin-user',
        profile?.full_name || profile?.email || 'Staff Officer'
      );
      showNotification(`Session ${sessionToCancel.countNumber} has been cancelled.`);
      setSessionToCancel(null);
      setCancellationReason('');
      loadData();
    } catch (err: any) {
      showNotification(err.message || 'Failed to cancel session.', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = (status: StockCountStatus) => {
    switch (status) {
      case 'reconciled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3" />
            Reconciled
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
            <FileCheck className="w-3 h-3" />
            Approved
          </span>
        );
      case 'submitted':
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
            <AlertTriangle className="w-3 h-3" />
            Review Needed
          </span>
        );
      case 'counting':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
            <Clock className="w-3 h-3" />
            Counting
          </span>
        );
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            Open
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300">
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
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-xl border text-xs font-semibold flex items-center gap-2.5 animate-in slide-in-from-top-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/90 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-orange-600 text-white shadow-sm">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Physical Stock Counting & Reconciliation
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Module 12 · Yard stocktaking worksheets, blind counting, variance reviews, and atomic reconciliation
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportAllCSV}
            className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={loadData}
            className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {canCreate && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              New Stock Count
            </button>
          )}
        </div>
      </div>

      {/* Top View Selector: Sessions vs Discrepancies (Module 12 Section 17) */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveViewTab('sessions')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeViewTab === 'sessions'
              ? 'border-orange-600 text-orange-600 dark:text-orange-500'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ClipboardCheck className="h-4 w-4" />
          <span>Count Sessions ({sessions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveViewTab('discrepancies')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeViewTab === 'discrepancies'
              ? 'border-orange-600 text-orange-600 dark:text-orange-500'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span>Discrepancy Report & Ledger</span>
          {stats.totalDiscrepancyItems > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
              {stats.totalDiscrepancyItems}
            </span>
          )}
        </button>
      </div>

      {activeViewTab === 'discrepancies' ? (
        <DiscrepancyReportTable
          sessions={sessions}
          locations={locations}
          onOpenSessionDetail={(session) => setSelectedSessionForDetail(session)}
          onOpenReviewSession={(session) => setActiveReviewSession(session)}
          onRecountItem={(item, session) => setActiveRecountItem({ item, session })}
        />
      ) : (
        <>
          {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Total Sessions</span>
            <ClipboardCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {stats.totalSessions}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Full count audit sessions</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-purple-200 dark:border-purple-900/40 shadow-xs">
          <div className="flex items-center justify-between text-xs text-purple-600 dark:text-purple-400">
            <span>In-Progress Counts</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">
            {stats.activeSessions}
          </div>
          <span className="text-[11px] text-purple-500/80 mt-1 block">Open & yard counting active</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-amber-200 dark:border-amber-900/40 shadow-xs">
          <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400">
            <span>Pending Review</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">
            {stats.pendingReviewSessions}
          </div>
          <span className="text-[11px] text-amber-500/80 mt-1 block">Awaiting supervisor sign-off</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-emerald-200 dark:border-emerald-900/40 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
            <span>Reconciled</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
            {stats.reconciledSessions}
          </div>
          <span className="text-[11px] text-emerald-500/80 mt-1 block">Inventory ledger adjusted</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: 'All Sessions' },
            { id: 'open', label: 'Open' },
            { id: 'counting', label: 'In Progress' },
            { id: 'submitted', label: 'Pending Review' },
            { id: 'approved', label: 'Approved' },
            { id: 'reconciled', label: 'Reconciled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Inputs */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by count number, location, counter, or notes..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="all">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.code})
                </option>
              ))}
            </select>
          </div>
        </form>
      </div>

      {/* Main Sessions Table */}
      <div className="bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3.5">Count Reference</th>
                <th className="p-3.5">Stock Location</th>
                <th className="p-3.5">Count Date</th>
                <th className="p-3.5">Scope & Protocol</th>
                <th className="p-3.5">Counted / Total</th>
                <th className="p-3.5">Discrepancies</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    Loading physical count sessions...
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500">
                    <ClipboardCheck className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No stock count sessions found
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {statusFilter !== 'all' || locationFilter !== 'all'
                        ? 'Try adjusting your filters.'
                        : 'Initiate a new physical stock count to audit your yard inventory.'}
                    </p>
                  </td>
                </tr>
              ) : (
                sessions.map((session) => {
                  const total = session.items.length;
                  const counted = session.items.filter((i) => i.countedQuantity !== null).length;
                  const discrepancies = session.items.filter(
                    (i) => i.variance !== null && i.variance !== 0
                  ).length;

                  return (
                    <tr
                      key={session.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-3.5">
                        <button
                          type="button"
                          onClick={() => setSelectedSessionForDetail(session)}
                          className="font-mono font-bold text-orange-600 dark:text-orange-400 hover:underline block text-left"
                        >
                          {session.countNumber}
                        </button>
                        <span className="text-[11px] text-slate-400">
                          By: {session.initiatedByName}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          {session.locationName}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {session.locationCode}
                        </span>
                      </td>

                      <td className="p-3.5 text-slate-700 dark:text-slate-300">
                        {session.countDate}
                      </td>

                      <td className="p-3.5">
                        <span className="text-slate-800 dark:text-slate-200 capitalize font-medium block">
                          {session.scope.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {session.isBlindCount ? 'Blind Count' : 'Standard'}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {counted}
                        </span>
                        <span className="text-slate-400"> / {total}</span>
                        <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-1 mt-1">
                          <div
                            className="bg-orange-500 h-1 rounded-full"
                            style={{ width: `${total > 0 ? (counted / total) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        {discrepancies > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                            {discrepancies} variance{discrepancies > 1 ? 's' : ''}
                          </span>
                        ) : counted === total && total > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                            0 Delta
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Pending count</span>
                        )}
                      </td>

                      <td className="p-3.5 text-center">
                        {getStatusBadge(session.status)}
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Counting Action */}
                          {['open', 'counting'].includes(session.status) && canCount && (
                            <button
                              type="button"
                              onClick={() => setActiveCountingSession(session)}
                              className="px-2.5 py-1 rounded bg-orange-600 hover:bg-orange-500 text-white font-semibold transition-colors flex items-center gap-1 text-[11px]"
                              title="Enter Physical Counts"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5" />
                              Count
                            </button>
                          )}

                          {/* Review Action */}
                          {['submitted', 'under_review'].includes(session.status) && canReview && (
                            <button
                              type="button"
                              onClick={() => setActiveReviewSession(session)}
                              className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-colors flex items-center gap-1 text-[11px]"
                              title="Review Variances & Discrepancies"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Review
                            </button>
                          )}

                          {/* Reconcile Action */}
                          {session.status === 'approved' && canReconcile && (
                            <button
                              type="button"
                              onClick={() => setActiveReconcileSession(session)}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors flex items-center gap-1 text-[11px]"
                              title="Reconcile to Inventory Ledger"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              Reconcile
                            </button>
                          )}

                          {/* Print Worksheet */}
                          <button
                            type="button"
                            onClick={() => setActivePrintSession(session)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                            title="Print Count Sheet"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* View Detail */}
                          <button
                            type="button"
                            onClick={() => setSelectedSessionForDetail(session)}
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                            title="View Full Details"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>

                          {/* Cancel if draft/open */}
                          {session.status === 'open' && canCancel && (
                            <button
                              type="button"
                              onClick={() => handleCancelSession(session)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                              title="Cancel Session"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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
        </>
      )}

      {/* Cancel Confirmation Modal */}
      {sessionToCancel && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold text-sm">
                <Trash2 className="w-4 h-4" />
                <span>Cancel Stock Count Session</span>
              </div>
              <button
                type="button"
                onClick={() => setSessionToCancel(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to cancel count session <strong className="font-mono text-orange-600 dark:text-orange-400">{sessionToCancel.countNumber}</strong> for {sessionToCancel.locationName}? This action cannot be undone.
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Reason for Cancellation
              </label>
              <input
                type="text"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="e.g. Yard count rescheduled due to weather"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSessionToCancel(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Keep Session
              </button>
              <button
                type="button"
                onClick={confirmCancelSession}
                disabled={isCancelling}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-sm disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel Session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals Mounting */}
      <CreateStockCountModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(countNumber) => {
          showNotification(`Physical stock count ${countNumber} initiated.`);
          loadData();
        }}
      />

      {activeCountingSession && (
        <CountingSheetModal
          isOpen={!!activeCountingSession}
          session={activeCountingSession}
          onClose={() => setActiveCountingSession(null)}
          onSuccess={() => {
            showNotification(`Counts for session ${activeCountingSession.countNumber} submitted.`);
            setActiveCountingSession(null);
            loadData();
          }}
          onRequestRecount={(item) => {
            setActiveRecountItem({ item, session: activeCountingSession });
          }}
        />
      )}

      {activeReviewSession && (
        <DiscrepancyReviewModal
          isOpen={!!activeReviewSession}
          session={activeReviewSession}
          onClose={() => setActiveReviewSession(null)}
          onSuccess={() => {
            showNotification(`Count session ${activeReviewSession.countNumber} approved.`);
            setActiveReviewSession(null);
            loadData();
          }}
          onRequestRecount={(item) => {
            setActiveRecountItem({ item, session: activeReviewSession });
          }}
          onOpenReconcileModal={() => {
            const current = activeReviewSession;
            setActiveReviewSession(null);
            setActiveReconcileSession(current);
          }}
        />
      )}

      {activeReconcileSession && (
        <ReconcileModal
          isOpen={!!activeReconcileSession}
          session={activeReconcileSession}
          onClose={() => setActiveReconcileSession(null)}
          onSuccess={() => {
            showNotification(`Stock count ${activeReconcileSession.countNumber} reconciled to inventory ledger!`);
            setActiveReconcileSession(null);
            loadData();
          }}
        />
      )}

      {activePrintSession && (
        <PrintCountSheetModal
          isOpen={!!activePrintSession}
          session={activePrintSession}
          onClose={() => setActivePrintSession(null)}
        />
      )}

      {selectedSessionForDetail && (
        <StockCountDetailModal
          isOpen={!!selectedSessionForDetail}
          session={selectedSessionForDetail}
          onClose={() => setSelectedSessionForDetail(null)}
          onOpenCountingSheet={() => {
            const s = selectedSessionForDetail;
            setSelectedSessionForDetail(null);
            setActiveCountingSession(s);
          }}
          onOpenReview={() => {
            const s = selectedSessionForDetail;
            setSelectedSessionForDetail(null);
            setActiveReviewSession(s);
          }}
          onOpenReconcile={() => {
            const s = selectedSessionForDetail;
            setSelectedSessionForDetail(null);
            setActiveReconcileSession(s);
          }}
          onOpenPrint={() => {
            const s = selectedSessionForDetail;
            setSelectedSessionForDetail(null);
            setActivePrintSession(s);
          }}
        />
      )}

      {activeRecountItem && (
        <RecountItemModal
          isOpen={!!activeRecountItem}
          item={activeRecountItem.item}
          stockCountId={activeRecountItem.session.id}
          countNumber={activeRecountItem.session.countNumber}
          onClose={() => setActiveRecountItem(null)}
          onSuccess={() => {
            showNotification(`Physical recount saved for ${activeRecountItem.item.productName}.`);
            setActiveRecountItem(null);
            loadData();
          }}
        />
      )}
    </div>
  );
};
