/**
 * System Health & Operational Diagnostics Panel
 * Module 26 — Production Monitoring, Health & Operational Diagnostics
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Provides non-technical business administrators with clear infrastructure visibility,
 * sync outbox health, failed operation inspections, and actionable resolution tools.
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  Database,
  Lock,
  Layers,
  HardDrive,
  Cpu,
  Smartphone,
  CreditCard,
  MessageSquare,
  Sparkles,
  ShieldAlert,
  Search,
  Check,
  Trash2,
  ExternalLink,
  ChevronDown,
  Info,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { systemHealthService } from '../../services/diagnostics/systemHealth.service';
import { errorLogger } from '../../services/diagnostics/errorLogger.service';
import { syncEngine } from '../../services/sync/syncEngine';
import {
  OverallSystemHealth,
  SystemComponentHealth,
  OperationalError,
  ErrorSeverity,
} from '../../types/diagnostics';
import { SyncQueueItem, SyncEngineStatus } from '../../types/sync';
import { formatRelativeTime } from '../../utils/formatters';

export interface SystemHealthPanelProps {
  onNavigateToModule?: (moduleId: string) => void;
}

export const SystemHealthPanel: React.FC<SystemHealthPanelProps> = ({ onNavigateToModule }) => {
  const toast = useToast();
  const { isAdministrator, profile } = useAuth();

  const [health, setHealth] = useState<OverallSystemHealth | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncEngineStatus | null>(null);
  const [syncItems, setSyncItems] = useState<SyncQueueItem[]>([]);
  const [errors, setErrors] = useState<OperationalError[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'sync' | 'errors' | 'environment'>('overview');

  const [isLoading, setIsLoading] = useState(false);
  const [selectedError, setSelectedError] = useState<OperationalError | null>(null);
  const [severityFilter, setSeverityFilter] = useState<ErrorSeverity | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadHealthData();
  }, []);

  const loadHealthData = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      const [healthData, currentSyncStatus, currentErrors] = await Promise.all([
        systemHealthService.getSystemHealth(forceRefresh),
        syncEngine.getStatus(),
        Promise.resolve(errorLogger.getAllErrors()),
      ]);

      setHealth(healthData);
      setSyncStatus(currentSyncStatus);
      setErrors(currentErrors);
    } catch (err: any) {
      toast.error('Failed to query operational health data.', 'Diagnostics Error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveError = (errorId: string) => {
    const resolverName = profile?.full_name || 'Administrator';
    const success = errorLogger.resolveError(errorId, resolverName);
    if (success) {
      setErrors(errorLogger.getAllErrors());
      if (selectedError?.id === errorId) {
        setSelectedError({
          ...selectedError,
          resolved: true,
          resolvedAt: new Date().toISOString(),
          resolvedByName: resolverName,
        });
      }
      toast.success(`Diagnostic record ${errorId} marked as resolved.`, 'Resolved');
    }
  };

  const handleClearResolved = () => {
    const count = errorLogger.clearResolvedErrors();
    setErrors(errorLogger.getAllErrors());
    toast.info(`Cleared ${count} resolved operational records.`, 'Cleanup');
  };

  const handleTriggerSync = async () => {
    try {
      toast.info('Triggering immediate synchronization outbox flush...', 'Syncing');
      await syncEngine.syncNow();
      await loadHealthData(true);
      toast.success('Sync engine cycle completed.', 'Sync Complete');
    } catch (err: any) {
      toast.error('Sync attempt failed. Please check network connectivity.', 'Sync Error');
    }
  };

  const getStatusBadge = (status: SystemComponentHealth['status']) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="success">Healthy</Badge>;
      case 'warning':
        return <Badge variant="warning">Warning</Badge>;
      case 'offline':
        return <Badge variant="outline">Offline</Badge>;
      case 'error':
        return <Badge variant="danger">Error</Badge>;
      case 'not_configured':
        return <Badge variant="outline">Not Set</Badge>;
      default:
        return <Badge variant="default">Untested</Badge>;
    }
  };

  const getComponentIcon = (id: string) => {
    switch (id) {
      case 'app_core':
        return <Activity className="h-5 w-5 text-emerald-500" />;
      case 'database':
        return <Database className="h-5 w-5 text-blue-500" />;
      case 'auth':
        return <Lock className="h-5 w-5 text-indigo-500" />;
      case 'sync_engine':
        return <RefreshCw className="h-5 w-5 text-orange-500" />;
      case 'offline_storage':
        return <HardDrive className="h-5 w-5 text-cyan-500" />;
      case 'pwa':
        return <Smartphone className="h-5 w-5 text-teal-500" />;
      case 'storage_buckets':
        return <Layers className="h-5 w-5 text-violet-500" />;
      case 'paystack':
        return <CreditCard className="h-5 w-5 text-green-500" />;
      case 'whatsapp':
        return <MessageSquare className="h-5 w-5 text-emerald-600" />;
      case 'ai_assistant':
        return <Sparkles className="h-5 w-5 text-amber-500" />;
      default:
        return <Cpu className="h-5 w-5 text-slate-500" />;
    }
  };

  const filteredErrors = errors.filter((err) => {
    if (severityFilter !== 'ALL' && err.severity !== severityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matches =
        err.id.toLowerCase().includes(q) ||
        err.module.toLowerCase().includes(q) ||
        err.operation.toLowerCase().includes(q) ||
        err.userMessage.toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6" id="system-health-panel">
      {/* Top Banner & Overview */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                health?.status === 'healthy'
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                  : health?.status === 'warning'
                  ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                  : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
              }`}
            >
              {health?.status === 'healthy' ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : health?.status === 'warning' ? (
                <AlertTriangle className="h-6 w-6" />
              ) : (
                <ShieldAlert className="h-6 w-6" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  System Health & Diagnostics
                </h1>
                <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {health?.isOnline ? (
                    <>
                      <Wifi className="h-3 w-3 text-emerald-500" /> Online
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3 w-3 text-amber-500" /> Offline PWA
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {health?.label || 'Querying operational status...'} &bull; Last inspected{' '}
                {health?.lastChecked ? formatRelativeTime(health.lastChecked) : 'just now'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadHealthData(true)}
              disabled={isLoading}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Checking...' : 'Run Diagnostics'}</span>
            </Button>
          </div>
        </div>

        {/* Quick Health Stats Bar */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">System Health Score</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white">
              {health?.score ?? 100}%
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Sync Outbox</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white">
              {syncStatus?.pendingCount ?? 0} <span className="text-xs font-normal text-slate-500">pending</span>
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Sync Conflicts</p>
            <p className={`text-xl font-extrabold ${(syncStatus?.conflictCount ?? 0) > 0 ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>
              {syncStatus?.conflictCount ?? 0}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Unresolved Errors</p>
            <p className={`text-xl font-extrabold ${errors.filter(e => !e.resolved).length > 0 ? 'text-orange-600' : 'text-slate-900 dark:text-white'}`}>
              {errors.filter((e) => !e.resolved).length}
            </p>
          </div>
        </div>
      </div>

      {/* Diagnostic Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 text-sm font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 font-semibold transition cursor-pointer ${
            activeTab === 'overview'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>Services & Infrastructure ({health?.components.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sync')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 font-semibold transition cursor-pointer ${
            activeTab === 'sync'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <RefreshCw className="h-4 w-4" />
          <span>Sync Outbox & Offline Health</span>
          {(syncStatus?.pendingCount ?? 0) > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-orange-100 text-orange-700 font-bold">
              {syncStatus?.pendingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('errors')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 font-semibold transition cursor-pointer ${
            activeTab === 'errors'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          <span>Operational Error Log</span>
          {errors.filter((e) => !e.resolved).length > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-red-100 text-red-700 font-bold">
              {errors.filter((e) => !e.resolved).length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('environment')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 font-semibold transition cursor-pointer ${
            activeTab === 'environment'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Info className="h-4 w-4" />
          <span>Environment & Build Details</span>
        </button>
      </div>

      {/* TAB 1: Infrastructure Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {health?.components.map((comp) => (
            <div
              key={comp.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 transition"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                    {getComponentIcon(comp.id)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {comp.name}
                    </h3>
                    <p className="text-[11px] font-mono text-slate-400">{comp.statusLabel}</p>
                  </div>
                </div>
                {getStatusBadge(comp.status)}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                {comp.summary}
              </p>

              {comp.latencyMs !== undefined && comp.latencyMs !== null && (
                <div className="mt-3 flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                  <span>Latency:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {comp.latencyMs}ms
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: Sync Outbox & Offline Diagnostics */}
      {activeTab === 'sync' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Module 22 Synchronization Engine Status
                </h3>
                <p className="text-xs text-slate-500">
                  Manages offline queueing, optimistic local operations, and idempotent replay to Supabase.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleTriggerSync}
                  disabled={!health?.isOnline || syncStatus?.isSyncing}
                  className="flex items-center gap-1.5"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${syncStatus?.isSyncing ? 'animate-spin' : ''}`} />
                  <span>{syncStatus?.isSyncing ? 'Synchronizing...' : 'Sync Outbox Now'}</span>
                </Button>

                {onNavigateToModule && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigateToModule('sync-center')}
                    className="flex items-center gap-1"
                  >
                    <span>Open Sync Center</span>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <span className="text-[11px] text-slate-500">Queue State</span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {syncStatus?.isSyncing ? 'Syncing...' : syncStatus?.pendingCount ? 'Pending Queue' : 'Synchronized'}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <span className="text-[11px] text-slate-500">Last Synced</span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {syncStatus?.lastSyncedAt ? formatRelativeTime(syncStatus.lastSyncedAt) : 'Never'}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <span className="text-[11px] text-slate-500">Failed Operations</span>
                <p className={`text-sm font-bold ${(syncStatus?.failedCount ?? 0) > 0 ? 'text-red-600' : 'text-slate-800 dark:text-slate-100'}`}>
                  {syncStatus?.failedCount ?? 0}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                <span className="text-[11px] text-slate-500">Network Interface</span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {health?.isOnline ? 'Online (Broadband)' : 'Offline (Local Only)'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Operational Error Log */}
      {activeTab === 'errors' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search error reference or message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500 w-64"
                />
              </div>

              <div className="flex items-center gap-1 text-xs">
                {(['ALL', 'CRITICAL', 'ERROR', 'WARNING', 'INFO'] as const).map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                      severityFilter === sev
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearResolved}
                className="flex items-center gap-1.5 text-xs text-slate-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear Resolved</span>
              </Button>
            </div>
          </div>

          {filteredErrors.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                No Operational Errors Recorded
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                All client requests, transactions, and synchronization tasks are executing cleanly.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredErrors.map((err) => (
                  <div
                    key={err.id}
                    className={`p-4 transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                      err.resolved ? 'opacity-60 bg-slate-50/50 dark:bg-slate-900/50' : ''
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400">
                          {err.id}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                            err.severity === 'CRITICAL'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                              : err.severity === 'ERROR'
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {err.severity}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          [{err.module}] {err.operation}
                        </span>
                        {err.resolved && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                            Resolved
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-800 dark:text-slate-200">
                        {err.userMessage}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span>{formatRelativeTime(err.timestamp)}</span>
                        {err.referenceId && <span>Entity: {err.referenceId}</span>}
                        <span>User Role: {err.userRole || 'staff'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedError(err)}
                        className="text-xs"
                      >
                        Inspect Details
                      </Button>

                      {!err.resolved && (
                        <Button
                          size="sm"
                          onClick={() => handleResolveError(err.id)}
                          className="text-xs flex items-center gap-1"
                        >
                          <Check className="h-3 w-3" />
                          <span>Resolve</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Environment & Build Information */}
      {activeTab === 'environment' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Deployment & Platform Specifications
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60">
              <span className="text-slate-400 font-mono text-[11px]">APPLICATION VERSION</span>
              <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">v1.0.0 (Module 26)</p>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60">
              <span className="text-slate-400 font-mono text-[11px]">HOSTING ARCHITECTURE</span>
              <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">Vercel Edge SPA + Static Bundling</p>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60">
              <span className="text-slate-400 font-mono text-[11px]">DATABASE TIER</span>
              <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">Supabase PostgreSQL + RLS</p>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60">
              <span className="text-slate-400 font-mono text-[11px]">OFFLINE PERSISTENCE</span>
              <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">IndexedDB + localStorage Fallback</p>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60">
              <span className="text-slate-400 font-mono text-[11px]">PROGRESSIVE WEB APP (PWA)</span>
              <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">Workbox autoUpdate Service Worker</p>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60">
              <span className="text-slate-400 font-mono text-[11px]">AI ASSISTANT ENGINE</span>
              <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">Gemini 3.8 Flash (Server Proxy)</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Details Modal */}
      {selectedError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-w-lg w-full rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-orange-600">
                  {selectedError.id}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Operational Error Diagnostic
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedError(null)}
                className="text-slate-400 hover:text-slate-600 p-1 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-semibold">User-Facing Explanation:</span>
                <p className="text-slate-800 dark:text-slate-200 mt-0.5 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg">
                  {selectedError.userMessage}
                </p>
              </div>

              {selectedError.technicalSummary && (
                <div>
                  <span className="text-slate-400 font-semibold">Sanitized Technical Summary:</span>
                  <pre className="text-[11px] font-mono text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2.5 rounded-lg overflow-auto max-h-36 whitespace-pre-wrap">
                    {selectedError.technicalSummary}
                  </pre>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400">Timestamp:</span>
                  <p className="font-mono">{new Date(selectedError.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Status:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedError.resolved ? 'Resolved' : 'Active / Pending Review'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedError(null)}
              >
                Close
              </Button>
              {!selectedError.resolved && (
                <Button
                  size="sm"
                  onClick={() => handleResolveError(selectedError.id)}
                  className="flex items-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Mark as Resolved</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
