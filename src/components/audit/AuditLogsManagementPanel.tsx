/**
 * Audit Logs & System Activity Management Panel
 * Module 21 — Audit Logs & System Activity
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Provides executive accountability, immutable historical logging,
 * full-text search & filtering, property state diff inspection,
 * and operational activity timelines across all business modules.
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  FileDown,
  Clock,
  User,
  Activity,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Eye,
  Calendar,
  Lock,
  History,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { PERMISSION_CODES } from '../../types/auth';
import { auditService } from '../../services/audit.service';
import {
  AuditLogEntry,
  AuditLogFilters,
  AuditAction,
  AuditEntityType,
  AuditSource,
  AuditDateRangePreset,
  AuditSummaryStats,
} from '../../types/audit';
import { AuditLogDetailModal } from './AuditLogDetailModal';
import { EntityAuditHistoryModal } from './EntityAuditHistoryModal';

export const AuditLogsManagementPanel: React.FC = () => {
  const toast = useToast();
  const { hasPermission, isAdministrator, profile, role } = useAuth();

  // Mode View: Tabular Grid vs Narrative Timeline (Section 28)
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');

  // Filters State
  const [filters, setFilters] = useState<AuditLogFilters>({
    dateRange: 'this_month',
    action: 'all',
    entityType: 'all',
    source: 'all',
    status: 'all',
    searchQuery: '',
  });

  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [showCustomRange, setShowCustomRange] = useState<boolean>(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Data & Loading States
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [summaryStats, setSummaryStats] = useState<AuditSummaryStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [entityHistoryTarget, setEntityHistoryTarget] = useState<{
    type: string;
    id: string;
    ref?: string;
  } | null>(null);

  // Fetch logs whenever filters, page, or page size change
  useEffect(() => {
    loadAuditLogs();
  }, [filters, currentPage, pageSize]);

  // Load summary stats on initial mount
  useEffect(() => {
    loadSummaryStats();
  }, []);

  const loadAuditLogs = async () => {
    setIsLoading(true);
    try {
      const result = await auditService.getAuditLogs(filters, {
        page: currentPage,
        pageSize,
      });
      setLogs(result.items);
      setTotalRecords(result.total);
      setTotalPages(result.totalPages);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
      toast.showToast('Could not retrieve audit logs from repository.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSummaryStats = async () => {
    try {
      const stats = await auditService.getSummaryStats();
      setSummaryStats(stats);
    } catch (err: any) {
      console.warn('Failed to load summary stats:', err);
    }
  };

  const handleDatePresetChange = (preset: AuditDateRangePreset) => {
    if (preset === 'custom') {
      setShowCustomRange(true);
      setFilters((prev) => ({ ...prev, dateRange: preset }));
    } else {
      setShowCustomRange(false);
      setFilters((prev) => ({
        ...prev,
        dateRange: preset,
        startDate: undefined,
        endDate: undefined,
      }));
    }
    setCurrentPage(1);
  };

  const handleApplyCustomDates = () => {
    if (!customStart || !customEnd) {
      toast.showToast('Please select both start and end dates.', 'warning');
      return;
    }
    setFilters((prev) => ({
      ...prev,
      dateRange: 'custom',
      startDate: customStart,
      endDate: customEnd,
    }));
    setCurrentPage(1);
  };

  const handleExportCsv = () => {
    if (!isAdministrator() && !hasPermission(PERMISSION_CODES.AUDIT_LOGS_EXPORT)) {
      toast.showToast('You do not have permission to export audit logs.', 'error');
      return;
    }

    if (logs.length === 0) {
      toast.showToast('No audit logs available to export.', 'warning');
      return;
    }
    auditService.exportToCsv(logs, 'XFORCE_Audit_Trail');
    toast.showToast(`Exported ${logs.length} audit records to CSV.`, 'success');

    // Record audit event for the export operation (Section 15)
    auditService.logBusinessAction({
      action: 'EXPORT',
      entityType: 'report',
      entityId: 'audit-trail-export',
      entityReference: 'Audit Trail Export',
      actor: {
        id: profile?.id,
        email: profile?.email,
        name: profile?.full_name,
        role: role?.name || 'administrator',
      },
      reason: `Exported ${logs.length} system audit records to CSV archive.`,
      metadata: {
        recordsCount: logs.length,
        filtersApplied: {
          dateRange: filters.dateRange,
          action: filters.action,
          entityType: filters.entityType,
          status: filters.status,
          source: filters.source,
        },
      },
      source: 'Admin Web',
    }).catch(console.warn);
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'CREATE':
      case 'STOCK_COUNT_APPROVED':
      case 'SERVICE_COMPLETED':
      case 'APPROVE':
      case 'PAYMENT_RECORDED':
      case 'ACTIVATE':
        return 'success';
      case 'REJECT':
      case 'CANCEL':
      case 'DELETE':
      case 'DEACTIVATE':
        return 'danger';
      case 'LOGIN':
      case 'LOGOUT':
      case 'PASSWORD_RESET':
      case 'SETTINGS_CHANGED':
        return 'warning';
      case 'ASSIGN':
      case 'UNASSIGN':
      case 'INVENTORY_ADJUSTED':
        return 'info';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6 text-left max-w-7xl mx-auto pb-16 print:p-0 print:m-0" id="audit-logs-root">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  System Audit Logs & Activity Trail
                </h1>
                <Badge variant="outline" size="sm">
                  Module 21
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Append-only immutable record of sensitive business operations, state diffs, and security events.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Tabular Log
            </button>
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'timeline'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              Activity Stream
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={isLoading || logs.length === 0}
            className="text-xs"
            title="Export filtered audit logs to CSV"
          >
            <FileDown className="h-3.5 w-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadAuditLogs();
              loadSummaryStats();
            }}
            disabled={isLoading}
            className="text-xs"
            title="Refresh logs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-2xs">
          <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Recorded Events
            </span>
            <History className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {summaryStats?.totalEvents.toLocaleString() || totalRecords.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Immutable append-only history
            </span>
          </CardContent>
        </Card>

        <Card className="shadow-2xs">
          <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Events Logged Today
            </span>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {summaryStats?.todayEvents || 0}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Africa/Lagos business day
            </span>
          </CardContent>
        </Card>

        <Card className="shadow-2xs">
          <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Security & Auth Events
            </span>
            <Lock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {summaryStats?.securityEvents || 0}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Logins, settings & credential actions
            </span>
          </CardContent>
        </Card>

        <Card className="shadow-2xs">
          <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Failed Operations
            </span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {summaryStats?.failedOperations || 0}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Rejected permission & privileged attempts
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar Controls */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Date Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-xl max-w-full">
            {(
              [
                ['today', 'Today'],
                ['yesterday', 'Yesterday'],
                ['this_week', 'This Week'],
                ['this_month', 'This Month'],
                ['last_month', 'Last Month'],
                ['all', 'All Time'],
                ['custom', 'Custom'],
              ] as const
            ).map(([preset, label]) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleDatePresetChange(preset)}
                className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer whitespace-nowrap ${
                  filters.dateRange === preset
                    ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-400 shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search actor, reference, reason, IP..."
              value={filters.searchQuery || ''}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, searchQuery: e.target.value }));
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Secondary Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
          {/* Action Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-500">Action Type:</label>
            <select
              value={filters.action || 'all'}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, action: e.target.value as any }));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs"
            >
              <option value="all">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="APPROVE">APPROVE</option>
              <option value="REJECT">REJECT</option>
              <option value="CANCEL">CANCEL</option>
              <option value="COMPLETE">COMPLETE</option>
              <option value="ASSIGN">ASSIGN</option>
              <option value="UNASSIGN">UNASSIGN</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGOUT">LOGOUT</option>
              <option value="PASSWORD_RESET">PASSWORD_RESET</option>
              <option value="PAYMENT_RECORDED">PAYMENT_RECORDED</option>
              <option value="INVENTORY_ADJUSTED">INVENTORY_ADJUSTED</option>
              <option value="STOCK_COUNT_APPROVED">STOCK_COUNT_APPROVED</option>
              <option value="SERVICE_COMPLETED">SERVICE_COMPLETED</option>
              <option value="SETTINGS_CHANGED">SETTINGS_CHANGED</option>
              <option value="EXPORT">EXPORT</option>
            </select>
          </div>

          {/* Entity Type Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-500">Entity Type:</label>
            <select
              value={filters.entityType || 'all'}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, entityType: e.target.value as any }));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs"
            >
              <option value="all">All Entities</option>
              <option value="order">Commercial Orders</option>
              <option value="inventory">Yard Inventory</option>
              <option value="stock_count">Stock Audits</option>
              <option value="expense">Business Expenses</option>
              <option value="payment">Payments</option>
              <option value="installation">Installations</option>
              <option value="customer">Customers</option>
              <option value="product">Products</option>
              <option value="warehouse">Warehouse</option>
              <option value="staff">Staff Accounts</option>
              <option value="supplier">Suppliers</option>
              <option value="settings">Settings</option>
              <option value="auth">Auth & Sessions</option>
              <option value="ai_assistant">AI Assistant</option>
              <option value="report">Reports</option>
            </select>
          </div>

          {/* Source Channel Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-500">Source Channel:</label>
            <select
              value={filters.source || 'all'}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, source: e.target.value as any }));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs"
            >
              <option value="all">All Sources</option>
              <option value="Admin Web">Admin Web</option>
              <option value="POS">POS Counter</option>
              <option value="Warehouse">Warehouse</option>
              <option value="Service">Service</option>
              <option value="Customer Portal">Customer Portal</option>
              <option value="AI Assistant">AI Assistant</option>
              <option value="System">System</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-500">Status:</label>
            <select
              value={filters.status || 'all'}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, status: e.target.value as any }));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs"
            >
              <option value="all">All Outcomes</option>
              <option value="success">Success</option>
              <option value="failure">Failure / Rejected</option>
            </select>
          </div>
        </div>

        {/* Custom Range Drawer */}
        {showCustomRange && (
          <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Custom Date Span:</span>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">From:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">To:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </div>
            <Button variant="primary" size="sm" onClick={handleApplyCustomDates} className="text-xs">
              Apply Date Window
            </Button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {viewMode === 'table' ? (
        /* ========================================================================= */
        /* TABULAR AUDIT LOG VIEW                                                    */
        /* ========================================================================= */
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Chronological Audit Log Entries ({totalRecords.toLocaleString()} events)
              </h3>
              <p className="text-xs text-slate-500">
                Sorted newest first. Click any event to inspect before/after diffs and context.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-16 text-slate-400 text-xs">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
              <span>Querying audit records...</span>
            </div>
          ) : logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-800/40">
                    <th className="p-3 font-semibold">Timestamp (WAT)</th>
                    <th className="p-3 font-semibold">Actor / User</th>
                    <th className="p-3 font-semibold">Action</th>
                    <th className="p-3 font-semibold">Entity Reference</th>
                    <th className="p-3 font-semibold">Channel</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition"
                    >
                      <td className="p-3 font-mono text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('en-NG', {
                          timeZone: 'Africa/Lagos',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>

                      <td className="p-3">
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          {log.actorUserName || log.actorUserEmail || 'System'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {log.actorUserRole || 'system'}
                        </span>
                      </td>

                      <td className="p-3">
                        <Badge variant={getActionBadgeVariant(log.action)} size="sm">
                          {log.action}
                        </Badge>
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <div>
                            <span className="font-medium text-slate-800 dark:text-slate-200 block">
                              {log.entityReference || log.entityId}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                              {log.entityType}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEntityHistoryTarget({
                                type: log.entityType,
                                id: log.entityId,
                                ref: log.entityReference || undefined,
                              });
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title={`View all audit events for ${log.entityReference || log.entityId}`}
                          >
                            <History className="h-3 w-3" />
                          </button>
                        </div>
                      </td>

                      <td className="p-3 text-slate-600 dark:text-slate-300">
                        <Badge variant="outline" size="sm">
                          {log.source}
                        </Badge>
                      </td>

                      <td className="p-3">
                        <span
                          className={`font-semibold flex items-center gap-1 ${
                            log.status === 'success' ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {log.status === 'success' ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5" />
                          )}
                          <span className="uppercase text-[11px]">{log.status}</span>
                        </span>
                      </td>

                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="h-7 text-xs text-amber-600 dark:text-amber-400 font-medium px-2"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          <span>Inspect</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={<History className="h-6 w-6" />}
              title="No Audit Records Found"
              description="No business operations or system activity match the selected filters."
            />
          )}

          {/* Pagination Controls */}
          {logs.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>
                  Showing {(currentPage - 1) * pageSize + 1} to{' '}
                  {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords.toLocaleString()} entries
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-7 px-2"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
                  Previous
                </Button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-7 px-2"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* SYSTEM ACTIVITY TIMELINE STREAM (Section 28)                              */
        /* ========================================================================= */
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              System Activity Timeline Stream (Section 28)
            </h3>
            <p className="text-xs text-slate-500">
              Natural-language operational statements generated from verified append-only audit entries.
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-16 text-slate-400 text-xs">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
              <span>Compiling activity timeline...</span>
            </div>
          ) : logs.length > 0 ? (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {logs.map((log) => (
                <div key={log.id} className="relative group">
                  <div className="absolute -left-[27px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-amber-500 shadow-2xs group-hover:scale-125 transition-transform" />

                  <div
                    onClick={() => setSelectedLog(log)}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-amber-400 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <Badge variant={getActionBadgeVariant(log.action)} size="sm">
                          {log.action}
                        </Badge>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {auditService.generateTimelineNarrative(log)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span>Source: <strong className="text-slate-700 dark:text-slate-300">{log.source}</strong></span>
                        {log.reason && <span>• Note: {log.reason}</span>}
                        {log.ipAddress && <span>• IP: {log.ipAddress}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-mono text-slate-400">
                        {new Date(log.timestamp).toLocaleString('en-NG', {
                          timeZone: 'Africa/Lagos',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Activity className="h-6 w-6" />}
              title="No Activity Events"
              description="No activity narrative records found for the selected filter scope."
            />
          )}
        </div>
      )}

      {/* Audit Detail Modal Drawer */}
      <AuditLogDetailModal
        isOpen={!!selectedLog}
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
        onViewEntityHistory={(type, id, ref) => {
          setSelectedLog(null);
          setEntityHistoryTarget({ type, id, ref });
        }}
      />

      {/* Entity Chronological Audit History Modal */}
      <EntityAuditHistoryModal
        isOpen={!!entityHistoryTarget}
        entityType={entityHistoryTarget?.type || ''}
        entityId={entityHistoryTarget?.id || ''}
        entityReference={entityHistoryTarget?.ref}
        onClose={() => setEntityHistoryTarget(null)}
      />
    </div>
  );
};
