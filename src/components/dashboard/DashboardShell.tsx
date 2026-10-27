/**
 * Executive Management Dashboard Shell
 * Module 20 — Reporting, Analytics & Management Dashboard
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Authoritative business operations command center integrating real-time sales,
 * yard stock health, field installations, and operating cash movement.
 * Grounded in Africa/Lagos (WAT) business timezone with 1-click drill-downs.
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Package,
  ClipboardCheck,
  Users,
  ShoppingCart,
  Receipt,
  FileSpreadsheet,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  Clock,
  Printer,
  FileDown,
  Wrench,
  Truck,
  CreditCard,
  ShieldAlert,
  SlidersHorizontal,
  Activity,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { QuickActions } from '../ui/QuickActions';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { reportService } from '../../services/report.service';
import {
  ReportDateFilter,
  ReportDateRangeType,
  ExecutiveDashboardSummary,
} from '../../types/report';
import { HealthStatusBadge } from '../diagnostics/HealthStatusBadge';

export interface DashboardShellProps {
  onNavigateToModule?: (moduleId: string) => void;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({ onNavigateToModule }) => {
  const toast = useToast();
  const { isAdministrator } = useAuth();

  const [dateRangeType, setDateRangeType] = useState<ReportDateRangeType>('this_month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [currentFilter, setCurrentFilter] = useState<ReportDateFilter>(
    reportService.getDateRange('this_month')
  );

  const [summary, setSummary] = useState<ExecutiveDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load metrics when date filter changes
  useEffect(() => {
    loadDashboardData(currentFilter);
  }, [currentFilter]);

  const loadDashboardData = async (filter: ReportDateFilter) => {
    setIsLoading(true);
    try {
      const data = await reportService.getExecutiveDashboardSummary(filter);
      setSummary(data);
    } catch (err: any) {
      console.error('Failed to load dashboard metrics:', err);
      toast.showToast('Could not aggregate dashboard data.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRangeChange = (type: ReportDateRangeType) => {
    setDateRangeType(type);
    if (type !== 'custom') {
      const newFilter = reportService.getDateRange(type);
      setCurrentFilter(newFilter);
    }
  };

  const handleApplyCustomDate = () => {
    if (!customStart || !customEnd) {
      toast.showToast('Please select both start and end dates.', 'warning');
      return;
    }
    const newFilter = reportService.getDateRange('custom', customStart, customEnd);
    setCurrentFilter(newFilter);
  };

  const formatNaira = (val: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleExportCsv = () => {
    if (!summary) return;
    const headers = ['Metric Category', 'Indicator', 'Value', 'Period'];
    const rows: (string | number)[][] = [
      ['Sales', 'Total Sales Revenue (Orders + POS)', summary.sales.totalSales, currentFilter.label],
      ['Sales', 'Order Count', summary.sales.ordersCount, currentFilter.label],
      ['Sales', 'Average Order Value', summary.sales.averageOrderValue, currentFilter.label],
      ['Sales', 'POS Counter Sales', summary.sales.posSales, currentFilter.label],
      ['Sales', 'Total Collections Inflow', summary.sales.collectionsInflow, currentFilter.label],
      ['Inventory', 'Total Active SKUs', summary.inventory.totalActiveSKUs, 'Current'],
      ['Inventory', 'Low Stock Count', summary.inventory.lowStockCount, 'Current'],
      ['Inventory', 'Out of Stock Count', summary.inventory.outOfStockCount, 'Current'],
      ['Inventory', 'Yard Valuation', summary.inventory.valuation, 'Current'],
      ['Operations', 'Pending Warehouse Tasks', summary.operations.pendingWarehouseTasks, 'Current'],
      ['Operations', 'Active Site Installation Jobs', summary.operations.activeSiteJobs, 'Current'],
      ['Finance', 'Recorded Income', summary.finance.recordedIncome, currentFilter.label],
      ['Finance', 'Recorded Operating Expenses', summary.finance.recordedExpenses, currentFilter.label],
      ['Finance', 'Net Operating Movement', summary.finance.netRecordedMovement, currentFilter.label],
    ];

    reportService.exportToCsv(`XFORCE_Executive_Dashboard_${currentFilter.startDate}_${currentFilter.endDate}`, headers, rows);
    toast.showToast('Executive dashboard CSV exported.', 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  const quickActionItems = [
    {
      id: 'qa-orders',
      label: 'Commercial Orders',
      description: 'Module 10',
      icon: ShoppingCart,
      onClick: () => onNavigateToModule?.('orders'),
      badgeText: 'M10',
    },
    {
      id: 'qa-pos',
      label: 'POS Sales Counter',
      description: 'Module 13',
      icon: Receipt,
      onClick: () => onNavigateToModule?.('pos'),
      badgeText: 'M13',
    },
    {
      id: 'qa-reports',
      label: 'Detailed Reports',
      description: 'Module 20',
      icon: FileSpreadsheet,
      onClick: () => onNavigateToModule?.('reports'),
      badgeText: 'M20',
    },
    {
      id: 'qa-inventory',
      label: 'Yard Inventory',
      description: 'Module 11',
      icon: Package,
      onClick: () => onNavigateToModule?.('inventory'),
      badgeText: 'M11',
    },
    {
      id: 'qa-installations',
      label: 'Field Installations',
      description: 'Module 15',
      icon: Wrench,
      onClick: () => onNavigateToModule?.('installations'),
      badgeText: 'M15',
    },
    {
      id: 'qa-expenses',
      label: 'Record Expense',
      description: 'Module 17',
      icon: CreditCard,
      onClick: () => onNavigateToModule?.('expenses'),
      badgeText: 'M17',
    },
    {
      id: 'qa-audit',
      label: 'Audit & Activity',
      description: 'Module 21',
      icon: ShieldAlert,
      onClick: () => onNavigateToModule?.('audit-logs'),
      badgeText: 'M21',
    },
    {
      id: 'qa-diagnostics',
      label: 'System Health & Diag',
      description: 'Module 26',
      icon: Activity,
      onClick: () => onNavigateToModule?.('system-health'),
      badgeText: 'M26',
    },
  ];

  return (
    <div className="space-y-6 text-left max-w-7xl mx-auto pb-12 print:p-0 print:m-0" id="executive-dashboard-root">
      {/* Dashboard Top Header & Date Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Executive Management Dashboard
            </h1>
            <Badge variant="outline" size="sm">
              WAT (UTC+1)
            </Badge>
            <HealthStatusBadge onClick={() => onNavigateToModule?.('system-health')} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Operational and commercial activity across XFORCE Construction Ltd & X-FORCE BRICKS.
          </p>
        </div>

        {/* Date Filter & Export Controls */}
        <div className="flex flex-wrap items-center gap-2 print:hidden w-full md:w-auto">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs overflow-x-auto max-w-full scrollbar-none whitespace-nowrap">
            {(
              [
                ['today', 'Today'],
                ['yesterday', 'Yesterday'],
                ['this_week', 'This Week'],
                ['this_month', 'This Month'],
                ['last_month', 'Last Month'],
                ['this_year', 'This Year'],
                ['custom', 'Custom'],
              ] as const
            ).map(([type, label]) => (
              <button
                key={type}
                type="button"
                onClick={() => handleRangeChange(type)}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                  dateRangeType === type
                    ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadDashboardData(currentFilter)}
            disabled={isLoading}
            className="text-xs"
            title="Refresh Metrics"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={isLoading || !summary}
            className="text-xs"
            title="Export CSV"
          >
            <FileDown className="h-3.5 w-3.5 mr-1" />
            CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="text-xs"
            title="Print Dashboard"
          >
            <Printer className="h-3.5 w-3.5 mr-1" />
            Print
          </Button>
        </div>
      </div>

      {/* Custom Date Selector Drawer */}
      {dateRangeType === 'custom' && (
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 flex flex-wrap items-center gap-3 text-xs print:hidden">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Custom Period:</span>
          <div className="flex items-center gap-2">
            <label className="text-slate-500">From:</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-500">To:</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
          </div>
          <Button variant="primary" size="sm" onClick={handleApplyCustomDate} className="text-xs">
            Apply Date Window
          </Button>
        </div>
      )}

      {/* Period Notice */}
      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between px-1">
        <span className="flex items-center gap-1.5 font-medium">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          Active Reporting Scope: <strong className="text-slate-800 dark:text-slate-200">{currentFilter.label}</strong> ({currentFilter.startDate} to {currentFilter.endDate})
        </span>
        <span className="text-[11px] text-slate-400">
          Enugu Yard Headquarters • Africa/Lagos Time
        </span>
      </div>

      {/* Primary KPI Metrics Cards (Grounded in real records) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Sales Revenue */}
        <Card
          id="metric-sales-card"
          className="cursor-pointer hover:border-amber-400 dark:hover:border-amber-500 transition-all shadow-xs group"
          onClick={() => onNavigateToModule?.('reports')}
        >
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Sales (Orders + POS)
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <TrendingUp className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {summary ? formatNaira(summary.sales.totalSales) : '₦0'}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>{summary?.sales.ordersCount || 0} commercial orders</span>
              <span>POS: {summary ? formatNaira(summary.sales.posSales) : '₦0'}</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-1">
              <span>Today: <strong className="text-slate-800 dark:text-slate-200">{summary ? formatNaira(summary.sales.salesToday) : '₦0'}</strong></span>
              <span>This Week: <strong className="text-slate-800 dark:text-slate-200">{summary ? formatNaira(summary.sales.salesThisWeek) : '₦0'}</strong></span>
            </div>
            <div className="mt-2 text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
              <span>Open Detailed Sales Report</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Low Stock & Deficits */}
        <Card
          id="metric-inventory-card"
          className="cursor-pointer hover:border-amber-400 dark:hover:border-amber-500 transition-all shadow-xs group"
          onClick={() => onNavigateToModule?.('inventory')}
        >
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Low Stock Alerts
            </span>
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                summary && summary.inventory.lowStockCount > 0
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              } group-hover:scale-105 transition-transform`}
            >
              <Package className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>{summary?.inventory.lowStockCount || 0}</span>
              {summary && summary.inventory.lowStockCount > 0 && (
                <Badge variant="danger" size="sm">
                  Action Required
                </Badge>
              )}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>{summary?.inventory.totalActiveSKUs || 0} catalogue SKUs</span>
              <span>Valuation: {summary ? formatNaira(summary.inventory.valuation) : '₦0'}</span>
            </div>
            <div className="mt-2 text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
              <span>Inspect Yard Inventory</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Active Installations & Services */}
        <Card
          id="metric-services-card"
          className="cursor-pointer hover:border-amber-400 dark:hover:border-amber-500 transition-all shadow-xs group"
          onClick={() => onNavigateToModule?.('installations')}
        >
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Site Installations
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 group-hover:scale-105 transition-transform">
              <Wrench className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {summary?.operations.activeSiteJobs || 0}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>{summary?.operations.jobsAwaitingInspection || 0} awaiting inspection</span>
              <span>Yard tasks: {summary?.operations.pendingWarehouseTasks || 0}</span>
            </div>
            <div className="mt-2 text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
              <span>Manage Service Jobs</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Operating Cash Movement */}
        <Card
          id="metric-finance-card"
          className="cursor-pointer hover:border-amber-400 dark:hover:border-amber-500 transition-all shadow-xs group"
          onClick={() => onNavigateToModule?.('reports')}
        >
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Net Recorded Movement
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 group-hover:scale-105 transition-transform">
              <CreditCard className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div
              className={`text-2xl font-black ${
                (summary?.finance.netRecordedMovement || 0) >= 0
                  ? 'text-slate-900 dark:text-white'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {summary ? formatNaira(summary.finance.netRecordedMovement) : '₦0'}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>In: {summary ? formatNaira(summary.finance.recordedIncome) : '₦0'}</span>
              <span>Out: {summary ? formatNaira(summary.finance.recordedExpenses) : '₦0'}</span>
            </div>
            <div className="mt-2 text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
              <span>View Financial Summary</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Requiring Management Attention (Section 3 & Section 21) */}
      {summary && summary.attentionItems.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Items Requiring Management Attention ({summary.attentionItems.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {summary.attentionItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onNavigateToModule?.(item.actionTargetModule)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                  item.severity === 'danger'
                    ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 hover:border-rose-400'
                    : item.severity === 'warning'
                    ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 hover:border-amber-400'
                    : 'border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 hover:border-blue-400'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      {item.title}
                    </span>
                    <Badge
                      variant={
                        item.severity === 'danger'
                          ? 'danger'
                          : item.severity === 'warning'
                          ? 'warning'
                          : 'info'
                      }
                      size="sm"
                    >
                      {item.module.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0 text-slate-400">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operational Shortcuts & Workflow Buttons */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs print:hidden">
        <QuickActions title="Direct Operational Actions" actions={quickActionItems} />
      </div>

      {/* Departmental Operations Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Sales & Pipeline Health */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-emerald-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Commercial Pipeline & Sales Status
              </h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateToModule?.('reports')}
              className="text-xs"
            >
              Open Full Sales Report
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 text-[11px] block">Average Order Value</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5 block">
                {summary ? formatNaira(summary.sales.averageOrderValue) : '₦0'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 text-[11px] block">Recorded Collections</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5 block">
                {summary ? formatNaira(summary.sales.collectionsInflow) : '₦0'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 text-[11px] block">Pending Customer Requests</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5 block">
                {summary?.customers.pendingRequests || 0} Inquiries
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 text-[11px] block">Quotations Awaiting Response</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5 block">
                {summary ? formatNaira(summary.customers.activeQuotationsValue) : '₦0'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Yard Logistics & Fulfillment */}
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Logistics & Field Site Operations
              </h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateToModule?.('warehouse')}
              className="text-xs"
            >
              Open Warehouse Board
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 text-[11px] block">Active Fulfilments</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5 block">
                {summary?.operations.activeFulfilments || 0} Orders Staged
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 text-[11px] block">Pending Warehouse Tasks</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5 block">
                {summary?.operations.pendingWarehouseTasks || 0} Yard Tasks
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 text-[11px] block">Active Installation Jobs</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5 block">
                {summary?.operations.activeSiteJobs || 0} Laying Sites
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <span className="text-slate-400 text-[11px] block">Awaiting Quality Check</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5 block">
                {summary?.operations.jobsAwaitingInspection || 0} Inspections
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
