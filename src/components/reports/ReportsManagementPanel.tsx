/**
 * Reports & Business Analytics Management Panel
 * Module 20 — Reporting, Analytics & Management Dashboard
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Operational and commercial intelligence center integrating real-time sales,
 * yard inventory & physical count discrepancies, commercial orders, field installations,
 * customer pipeline, operating finance (recorded income/expenses/net movement),
 * and factual staff operational activity.
 *
 * Strictly adheres to Module 20 boundaries:
 * - Uses existing transactional records and calculations
 * - Zero artificial employee scoring or subjective productivity rankings
 * - Africa/Lagos (WAT) business timezone
 * - Standardized UTF-8 CSV exports across all report dimensions
 */

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Package,
  ShoppingCart,
  Wrench,
  Users,
  CreditCard,
  Truck,
  UserCheck,
  FileSpreadsheet,
  AlertTriangle,
  ArrowRight,
  Filter,
  CheckCircle2,
  Clock,
  Building,
  HelpCircle,
  Eye,
  Layers,
  Search,
  ExternalLink,
  ChevronDown,
  BarChart2,
  Activity,
  Calendar,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { reportService } from '../../services/report.service';
import { auditService } from '../../services/audit.service';
import { ReportFilterBar } from './ReportFilterBar';
import {
  ReportDateFilter,
  ReportTab,
  SalesReportMetrics,
  InventoryReportMetrics,
  OperationsReportMetrics,
  CustomerReportMetrics,
  FinancialReportMetrics,
  SupplierReportMetrics,
  ExecutiveDashboardSummary,
  OrderReportMetrics,
  StaffActivityReportItem,
  SalesByProductItem,
} from '../../types/report';

export interface ReportsManagementPanelProps {
  initialTab?: ReportTab;
  onNavigateToModule?: (moduleId: string) => void;
}

export const ReportsManagementPanel: React.FC<ReportsManagementPanelProps> = ({
  initialTab = 'sales',
  onNavigateToModule,
}) => {
  const toast = useToast();
  const { hasPermission, isAdministrator, profile, role } = useAuth();

  // Active Report Tab
  const [activeTab, setActiveTab] = useState<ReportTab>(initialTab);

  // Active Reporting Date Filter (Defaults to Current Month in Africa/Lagos WAT)
  const [dateFilter, setDateFilter] = useState<ReportDateFilter>(
    reportService.getDateRange('this_month')
  );

  // Loading & Data States
  const [isLoading, setIsLoading] = useState(true);
  const [summaryData, setSummaryData] = useState<ExecutiveDashboardSummary | null>(null);
  const [salesData, setSalesData] = useState<SalesReportMetrics | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryReportMetrics | null>(null);
  const [ordersData, setOrdersData] = useState<OrderReportMetrics | null>(null);
  const [operationsData, setOperationsData] = useState<OperationsReportMetrics | null>(null);
  const [customerData, setCustomerData] = useState<CustomerReportMetrics | null>(null);
  const [financialData, setFinancialData] = useState<FinancialReportMetrics | null>(null);
  const [staffData, setStaffData] = useState<StaffActivityReportItem[]>([]);
  const [supplierData, setSupplierData] = useState<SupplierReportMetrics | null>(null);

  // Interactive Table Filters & Sort States
  const [productSortBy, setProductSortBy] = useState<'value_desc' | 'qty_desc' | 'qty_asc'>('value_desc');
  const [salesCategoryFilter, setSalesCategoryFilter] = useState<string>('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Sync initial tab when changed from props
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Load Report Data whenever activeTab or dateFilter changes
  useEffect(() => {
    loadActiveReportData();
  }, [dateFilter, activeTab]);

  const loadActiveReportData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'overview') {
        const summary = await reportService.getExecutiveDashboardSummary(dateFilter);
        setSummaryData(summary);
      } else if (activeTab === 'sales') {
        const sales = await reportService.getSalesReport(dateFilter);
        setSalesData(sales);
      } else if (activeTab === 'inventory') {
        const inv = await reportService.getInventoryReport();
        setInventoryData(inv);
      } else if (activeTab === 'orders') {
        const ord = await reportService.getOrderReport(dateFilter);
        setOrdersData(ord);
      } else if (activeTab === 'operations') {
        const ops = await reportService.getOperationsReport(dateFilter);
        setOperationsData(ops);
      } else if (activeTab === 'requests_quotations' || activeTab === 'customers') {
        const cust = await reportService.getCustomerReport(dateFilter);
        setCustomerData(cust);
      } else if (activeTab === 'finance') {
        const fin = await reportService.getFinancialReport(dateFilter);
        setFinancialData(fin);
      } else if (activeTab === 'staff') {
        const stf = await reportService.getStaffActivityReport(dateFilter);
        setStaffData(stf);
      } else if (activeTab === 'suppliers') {
        const sup = await reportService.getSupplierReport();
        setSupplierData(sup);
      }
    } catch (err: any) {
      console.error('Error generating report:', err);
      toast.showToast('Could not compile report calculations.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const formatNaira = (val: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // --------------------------------------------------------------------------
  // EXPORT CSV HANDLERS PER TAB
  // --------------------------------------------------------------------------
  const handleExportCsv = () => {
    const periodTag = `${dateFilter.startDate}_to_${dateFilter.endDate}`;

    // Module 21: Log report export to audit trail (Section 15)
    auditService.logBusinessAction({
      action: 'EXPORT',
      entityType: 'report',
      entityId: `report-${activeTab}`,
      entityReference: `Report: ${activeTab.toUpperCase()}`,
      actor: {
        id: profile?.id,
        email: profile?.email,
        name: profile?.full_name,
        role: role?.name || 'administrator',
      },
      reason: `Exported ${activeTab} report (${dateFilter.label}) to CSV.`,
      metadata: {
        reportType: activeTab,
        dateRange: dateFilter.label,
        startDate: dateFilter.startDate,
        endDate: dateFilter.endDate,
        format: 'CSV',
      },
      source: 'Admin Web',
    }).catch((err) => console.warn('[Reports] Audit export log failed:', err));

    switch (activeTab) {
      case 'overview': {
        if (!summaryData) return;
        const headers = ['Category', 'Indicator', 'Value', 'Reporting Scope'];
        const rows = [
          ['Sales', 'Total Sales Revenue (Orders + POS)', summaryData.sales.totalSales, dateFilter.label],
          ['Sales', 'Sales Today', summaryData.sales.salesToday, 'Today'],
          ['Sales', 'Sales This Week', summaryData.sales.salesThisWeek, 'This Week'],
          ['Sales', 'Sales This Month', summaryData.sales.salesThisMonth, 'This Month'],
          ['Sales', 'Commercial Orders Count', summaryData.sales.ordersCount, dateFilter.label],
          ['Sales', 'Average Order Value', summaryData.sales.averageOrderValue, dateFilter.label],
          ['Sales', 'POS Counter Sales', summaryData.sales.posSales, dateFilter.label],
          ['Sales', 'Collections Inflow', summaryData.sales.collectionsInflow, dateFilter.label],
          ['Inventory', 'Active SKUs', summaryData.inventory.totalActiveSKUs, 'Current'],
          ['Inventory', 'Low Stock Items', summaryData.inventory.lowStockCount, 'Current'],
          ['Inventory', 'Out of Stock Items', summaryData.inventory.outOfStockCount, 'Current'],
          ['Inventory', 'Yard Valuation', summaryData.inventory.valuation, 'Current'],
          ['Operations', 'Pending Warehouse Tasks', summaryData.operations.pendingWarehouseTasks, 'Current'],
          ['Operations', 'Active Site Jobs', summaryData.operations.activeSiteJobs, 'Current'],
          ['Finance', 'Recorded Income', summaryData.finance.recordedIncome, dateFilter.label],
          ['Finance', 'Recorded Operating Expenses', summaryData.finance.recordedExpenses, dateFilter.label],
          ['Finance', 'Net Recorded Movement', summaryData.finance.netRecordedMovement, dateFilter.label],
        ];
        reportService.exportToCsv(`XFORCE_Executive_Summary_${periodTag}`, headers, rows);
        toast.showToast('Executive overview CSV exported.', 'success');
        break;
      }

      case 'sales': {
        if (!salesData) return;
        const headers = [
          'Product / Model',
          'Variant',
          'Category',
          'Units Sold',
          'Total Sales Value (NGN)',
          'Order Count',
          'Current Stock on Hand',
        ];
        const rows = salesData.salesByProduct.map((p) => [
          p.productName,
          p.variantName || 'Standard',
          p.category,
          p.unitsSold,
          p.totalSalesValue,
          p.orderCount,
          p.currentStock,
        ]);
        reportService.exportToCsv(`XFORCE_Sales_Report_${periodTag}`, headers, rows);
        toast.showToast('Sales by product CSV exported.', 'success');
        break;
      }

      case 'inventory': {
        if (!inventoryData) return;
        const headers = [
          'Item Name',
          'SKU',
          'Yard Location',
          'Qty on Hand',
          'Reorder Level',
          'Stock Status',
          'Deficit Units',
          'Unit',
        ];
        const rows = inventoryData.lowStockAlerts.map((i) => [
          i.name,
          i.sku,
          i.location,
          i.quantityOnHand,
          i.reorderLevel,
          i.status.toUpperCase(),
          i.deficit,
          i.unit,
        ]);
        reportService.exportToCsv(`XFORCE_Inventory_Health_${periodTag}`, headers, rows);
        toast.showToast('Inventory report CSV exported.', 'success');
        break;
      }

      case 'orders': {
        if (!ordersData) return;
        const headers = [
          'Order Number',
          'Date',
          'Customer Name',
          'Order Status',
          'Payment Status',
          'Total Amount (NGN)',
          'Amount Paid',
          'Balance Due',
          'Item Count',
          'Channel',
        ];
        const rows = ordersData.orders.map((o) => [
          o.orderNumber,
          o.orderDate,
          o.customerName,
          o.status.toUpperCase(),
          o.paymentStatus.toUpperCase(),
          o.totalAmount,
          o.amountPaid,
          o.balanceDue,
          o.itemCount,
          o.salesChannel,
        ]);
        reportService.exportToCsv(`XFORCE_Orders_Report_${periodTag}`, headers, rows);
        toast.showToast('Commercial orders report CSV exported.', 'success');
        break;
      }

      case 'operations': {
        if (!operationsData) return;
        const headers = ['Service Type', 'Job Count', 'Square Meters Installed (m²)'];
        const rows = operationsData.typeBreakdown.map((t) => [
          t.label,
          t.count,
          t.squareMetersInstalled,
        ]);
        reportService.exportToCsv(`XFORCE_Operations_Services_${periodTag}`, headers, rows);
        toast.showToast('Operations & services CSV exported.', 'success');
        break;
      }

      case 'requests_quotations': {
        if (!customerData) return;
        const headers = ['Pipeline Indicator', 'Count / Value', 'Reporting Scope'];
        const rows = [
          ['Inbound Requests Submitted', customerData.requestsSubmittedCount, dateFilter.label],
          ['Requests Under Engineering Review', customerData.requestsUnderReviewCount, dateFilter.label],
          ['Requests Converted to Quotation/Order', customerData.requestsConvertedCount, dateFilter.label],
          ['Draft Quotations', customerData.quotationsDraftCount, dateFilter.label],
          ['Quotations Sent / Client Viewed', customerData.quotationsSentCount, dateFilter.label],
          ['Quotations Accepted by Client', customerData.quotationsAcceptedCount, dateFilter.label],
          ['Quotations Declined', customerData.quotationsDeclinedCount, dateFilter.label],
          ['Quotations Expired', customerData.quotationsExpiredCount, dateFilter.label],
          ['Quotation-to-Order Conversion Ratio', `${customerData.quotationToOrderRatioPercentage}%`, dateFilter.label],
          ['Accepted Quotations Value (NGN)', customerData.acceptedQuotationsTotalValue, dateFilter.label],
          ['Quotations Awaiting Client Response (NGN)', customerData.pendingClientResponseValue, dateFilter.label],
        ];
        reportService.exportToCsv(`XFORCE_Request_Quotation_Pipeline_${periodTag}`, headers, rows);
        toast.showToast('Pipeline report CSV exported.', 'success');
        break;
      }

      case 'customers': {
        if (!customerData) return;
        const headers = ['Metric', 'Count', 'Scope'];
        const rows = [
          ['Total Registered Customers in System', customerData.totalCustomers, 'All-Time'],
          ['Active Customers in Scope (Orders/Inquiries)', customerData.activeCustomersInPeriod, dateFilter.label],
          ['New Customer Inquiries in Scope', customerData.newCustomersInPeriod, dateFilter.label],
        ];
        reportService.exportToCsv(`XFORCE_Customer_Summary_${periodTag}`, headers, rows);
        toast.showToast('Customer analytics CSV exported.', 'success');
        break;
      }

      case 'finance': {
        if (!financialData) return;
        const headers = [
          'Expense Category',
          'Total Amount (NGN)',
          'Record Count',
          'Share of Recorded Expenses (%)',
        ];
        const rows = financialData.expensesByCategory.map((c) => [
          c.label,
          c.amount,
          c.count,
          `${c.percentage}%`,
        ]);
        rows.unshift(
          ['Recorded Income (Orders + POS)', financialData.recordedIncome, 0, 'Inflow'],
          ['Approved Operating Expenses', financialData.approvedExpenses, 0, 'Outflow'],
          ['Net Recorded Movement', financialData.netRecordedMovement, 0, 'Net Cashflow']
        );
        reportService.exportToCsv(`XFORCE_Financial_Summary_${periodTag}`, headers, rows);
        toast.showToast('Financial summary CSV exported.', 'success');
        break;
      }

      case 'staff': {
        if (!staffData || staffData.length === 0) return;
        const headers = [
          'Staff ID',
          'Full Name',
          'Department',
          'Job Title',
          'Site Jobs Assigned',
          'Site Jobs Completed',
          'Warehouse Tasks Assigned',
          'Warehouse Tasks Completed',
          'POS Counter Sales Count',
          'POS Counter Volume (NGN)',
          'Submitted Expenses Count',
          'Submitted Expenses Volume (NGN)',
        ];
        const rows = staffData.map((s) => [
          s.staffNumber,
          s.fullName,
          s.departmentLabel,
          s.jobTitle,
          s.assignedInstallationJobsCount,
          s.completedInstallationJobsCount,
          s.assignedWarehouseTasksCount,
          s.completedWarehouseTasksCount,
          s.posSalesCount,
          s.posSalesVolume,
          s.submittedExpensesCount,
          s.submittedExpensesVolume,
        ]);
        reportService.exportToCsv(`XFORCE_Staff_Operational_Workload_${periodTag}`, headers, rows);
        toast.showToast('Staff workload summary CSV exported.', 'success');
        break;
      }

      case 'suppliers': {
        if (!supplierData) return;
        const headers = ['Category', 'Supplier Count'];
        const rows = supplierData.byCategory.map((c) => [c.label, c.count]);
        reportService.exportToCsv(`XFORCE_Suppliers_Report_${periodTag}`, headers, rows);
        toast.showToast('Suppliers report CSV exported.', 'success');
        break;
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Tab definitions
  const tabsList: Array<{ id: ReportTab; label: string; icon: any; permission?: string }> = [
    { id: 'overview', label: 'Management Overview', icon: Activity },
    { id: 'sales', label: 'Sales & Performance', icon: TrendingUp },
    { id: 'inventory', label: 'Inventory & Physical Counts', icon: Package },
    { id: 'orders', label: 'Commercial Orders', icon: ShoppingCart },
    { id: 'operations', label: 'Operations & Services', icon: Wrench },
    { id: 'requests_quotations', label: 'Requests & Quotations', icon: Layers },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'finance', label: 'Finance & Expenses', icon: CreditCard },
    { id: 'staff', label: 'Staff Workload', icon: UserCheck },
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
  ];

  return (
    <div className="space-y-6 text-left max-w-7xl mx-auto pb-16 print:p-0 print:m-0" id="reports-management-root">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Reporting, Analytics & Management Reports
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Authoritative cross-departmental records for XFORCE Construction Ltd / X-FORCE BRICKS.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <Badge variant="outline" size="sm">
            Module 20
          </Badge>
          <Badge variant="outline" size="sm" className="bg-slate-50 dark:bg-slate-800">
            Africa/Lagos (WAT)
          </Badge>
        </div>
      </div>

      {/* Date Filter & Control Bar */}
      <ReportFilterBar
        currentFilter={dateFilter}
        onFilterChange={(newFilter) => setDateFilter(newFilter)}
        onRefresh={loadActiveReportData}
        onExportCsv={handleExportCsv}
        onPrint={handlePrint}
        isLoading={isLoading}
      />

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800 text-xs print:hidden">
        {tabsList.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border-b-2 border-amber-500 rounded-b-none'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. OVERVIEW TAB: Management Rollup & Attention Items                      */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card
              className="cursor-pointer hover:border-amber-400 transition shadow-2xs"
              onClick={() => setActiveTab('sales')}
            >
              <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Total Sales Revenue
                </span>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {summaryData ? formatNaira(summaryData.sales.totalSales) : '₦0'}
                </div>
                <div className="mt-1 text-[11px] text-slate-500 flex justify-between">
                  <span>Today: {summaryData ? formatNaira(summaryData.sales.salesToday) : '₦0'}</span>
                  <span>This Week: {summaryData ? formatNaira(summaryData.sales.salesThisWeek) : '₦0'}</span>
                </div>
                <div className="mt-2 text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                  <span>View Sales Breakdown</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:border-amber-400 transition shadow-2xs"
              onClick={() => setActiveTab('inventory')}
            >
              <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Yard Low Stock Alerts
                </span>
                <Package className="h-4 w-4 text-rose-500" />
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <div className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{summaryData?.inventory.lowStockCount || 0}</span>
                  {(summaryData?.inventory.lowStockCount || 0) > 0 && (
                    <Badge variant="danger" size="sm">
                      Reorder Needed
                    </Badge>
                  )}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  <span>Out of stock: {summaryData?.inventory.outOfStockCount || 0} lines</span>
                </div>
                <div className="mt-2 text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                  <span>Inspect Yard Inventory</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:border-amber-400 transition shadow-2xs"
              onClick={() => setActiveTab('operations')}
            >
              <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Active Site Installations
                </span>
                <Wrench className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {summaryData?.operations.activeSiteJobs || 0}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  <span>Awaiting inspection: {summaryData?.operations.jobsAwaitingInspection || 0}</span>
                </div>
                <div className="mt-2 text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                  <span>Open Installations Report</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:border-amber-400 transition shadow-2xs"
              onClick={() => setActiveTab('finance')}
            >
              <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Net Recorded Movement
                </span>
                <CreditCard className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <div
                  className={`text-2xl font-black ${
                    (summaryData?.finance.netRecordedMovement || 0) >= 0
                      ? 'text-slate-900 dark:text-white'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {summaryData ? formatNaira(summaryData.finance.netRecordedMovement) : '₦0'}
                </div>
                <div className="mt-1 text-[11px] text-slate-500 flex justify-between">
                  <span>In: {summaryData ? formatNaira(summaryData.finance.recordedIncome) : '₦0'}</span>
                  <span>Out: {summaryData ? formatNaira(summaryData.finance.recordedExpenses) : '₦0'}</span>
                </div>
                <div className="mt-2 text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                  <span>Review Financial Ledger</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Attention Items */}
          {summaryData && summaryData.attentionItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Operations Requiring Management Attention ({summaryData.attentionItems.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {summaryData.attentionItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.actionTargetModule === 'inventory') setActiveTab('inventory');
                      else if (item.actionTargetModule === 'expenses') setActiveTab('finance');
                      else if (item.actionTargetModule === 'requests') setActiveTab('requests_quotations');
                      else if (item.actionTargetModule === 'warehouse') setActiveTab('operations');
                      else onNavigateToModule?.(item.actionTargetModule);
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition flex items-start justify-between gap-3 ${
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
                      <p className="text-xs text-slate-600 dark:text-slate-300">{item.description}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0 text-slate-400">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cross-Link Direct Actions */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Direct System Navigation Links:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateToModule?.('orders')}
                className="text-xs"
              >
                <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                Orders (M10)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateToModule?.('inventory')}
                className="text-xs"
              >
                <Package className="h-3.5 w-3.5 mr-1" />
                Yard Inventory (M11)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateToModule?.('pos')}
                className="text-xs"
              >
                <CreditCard className="h-3.5 w-3.5 mr-1" />
                POS Counter (M13)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateToModule?.('warehouse')}
                className="text-xs"
              >
                <Truck className="h-3.5 w-3.5 mr-1" />
                Warehouse (M14)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateToModule?.('installations')}
                className="text-xs"
              >
                <Wrench className="h-3.5 w-3.5 mr-1" />
                Installations (M15)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateToModule?.('expenses')}
                className="text-xs"
              >
                <CreditCard className="h-3.5 w-3.5 mr-1" />
                Expenses (M17)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SALES & PERFORMANCE REPORT                                            */}
      {/* ========================================================================= */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          {/* Sales Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Total Sales Revenue</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {salesData ? formatNaira(salesData.totalSales) : '₦0'}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Orders: {salesData ? formatNaira(salesData.ordersRevenue) : '₦0'} • POS:{' '}
                {salesData ? formatNaira(salesData.posCounterRevenue) : '₦0'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Completed Commercial Orders</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {salesData?.ordersCount || 0}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Average Value: {salesData ? formatNaira(salesData.averageOrderValue) : '₦0'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Recorded Collections Inflow</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {salesData ? formatNaira(salesData.recordedCollections) : '₦0'}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Verified payment receipts in scope
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Active Product Lines Sold</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {salesData?.salesByProduct.length || 0}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Categories: {salesData?.salesByCategory.length || 0}
              </span>
            </div>
          </div>

          {/* Daily Sales Trend Breakdown Table */}
          {salesData && salesData.dailySales.length > 0 && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Daily Sales Activity & Volume
                  </h3>
                  <p className="text-xs text-slate-500">
                    Day-by-day commercial order and POS counter inflow in selected date window.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-800/40">
                      <th className="p-2.5 font-semibold">Date (WAT)</th>
                      <th className="p-2.5 font-semibold">Orders Count</th>
                      <th className="p-2.5 font-semibold text-right">Orders Revenue</th>
                      <th className="p-2.5 font-semibold text-right">POS Counter Sales</th>
                      <th className="p-2.5 font-semibold text-right">Total Daily Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {salesData.dailySales.map((d) => (
                      <tr key={d.date} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-2.5 font-medium text-slate-900 dark:text-white">
                          {d.formattedDate}
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-300">
                          {d.ordersCount} orders
                        </td>
                        <td className="p-2.5 text-right font-medium text-slate-800 dark:text-slate-200">
                          {formatNaira(d.ordersRevenue)}
                        </td>
                        <td className="p-2.5 text-right font-medium text-slate-800 dark:text-slate-200">
                          {formatNaira(d.posRevenue)}
                        </td>
                        <td className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {formatNaira(d.totalSales)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Product Performance Table (Section 7) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Product Sales Performance & Stock Health
                </h3>
                <p className="text-xs text-slate-500">
                  Neutral metrics sorting (highest sales value, highest quantity sold, lowest quantity sold).
                </p>
              </div>

              {/* Neutral Sorting Controls */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Sort By:</span>
                <select
                  value={productSortBy}
                  onChange={(e) => setProductSortBy(e.target.value as any)}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  <option value="value_desc">Highest sales value</option>
                  <option value="qty_desc">Highest quantity sold</option>
                  <option value="qty_asc">Lowest quantity sold</option>
                </select>
              </div>
            </div>

            {salesData && salesData.salesByProduct.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-800/40">
                      <th className="p-3 font-semibold">Product Name / Variant</th>
                      <th className="p-3 font-semibold">Category</th>
                      <th className="p-3 font-semibold text-right">Units Sold</th>
                      <th className="p-3 font-semibold text-right">Total Sales Value</th>
                      <th className="p-3 font-semibold text-right">Order Count</th>
                      <th className="p-3 font-semibold text-right">Yard Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {salesData.salesByProduct
                      .slice()
                      .sort((a, b) => {
                        if (productSortBy === 'qty_desc') return b.unitsSold - a.unitsSold;
                        if (productSortBy === 'qty_asc') return a.unitsSold - b.unitsSold;
                        return b.totalSalesValue - a.totalSalesValue;
                      })
                      .map((prod, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3">
                            <span className="font-semibold text-slate-900 dark:text-white block">
                              {prod.productName}
                            </span>
                            {prod.variantName && (
                              <span className="text-[11px] text-slate-400">{prod.variantName}</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300">
                            <Badge variant="outline" size="sm">
                              {prod.category}
                            </Badge>
                          </td>
                          <td className="p-3 text-right font-semibold text-slate-800 dark:text-slate-200">
                            {prod.unitsSold.toLocaleString()} units
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                            {formatNaira(prod.totalSalesValue)}
                          </td>
                          <td className="p-3 text-right text-slate-600 dark:text-slate-300">
                            {prod.orderCount}
                          </td>
                          <td className="p-3 text-right">
                            <span
                              className={`font-semibold ${
                                prod.currentStock <= 0
                                  ? 'text-rose-600'
                                  : prod.currentStock < 500
                                  ? 'text-amber-600'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {prod.currentStock.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={<TrendingUp className="h-6 w-6" />}
                title="No Sales Recorded in Period"
                description="Adjust the date filter above to see completed commercial orders or POS sales."
              />
            )}
          </div>

          {/* Category & Payment Method Split Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sales by Category */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Sales by Product Category</h3>
              <div className="space-y-2.5">
                {(salesData?.salesByCategory || []).map((cat) => (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{cat.category}</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatNaira(cat.totalSalesValue)} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(3, cat.percentage))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sales by Payment Method */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Sales by Payment Channel</h3>
              <div className="space-y-2">
                {(salesData?.salesByPaymentMethod || []).map((pm) => (
                  <div
                    key={pm.method}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white block">
                        {pm.label}
                      </span>
                      <span className="text-[11px] text-slate-400">{pm.transactionCount} transactions</span>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatNaira(pm.totalAmount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. INVENTORY & PHYSICAL COUNT DISCREPANCY REPORT                         */}
      {/* ========================================================================= */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Inventory Overview Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Total Yard Inventory Value</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {inventoryData ? formatNaira(inventoryData.totalInventoryValuation) : '₦0'}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Total Units on Hand: {inventoryData?.totalUnitsOnHand.toLocaleString() || 0}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Catalogued SKUs</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {inventoryData?.totalSKUs || 0}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                In Stock: {inventoryData?.inStockCount || 0} • Low Stock: {inventoryData?.lowStockCount || 0}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Items Below Safety Threshold</span>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {inventoryData?.lowStockCount || 0}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Out of Stock: {inventoryData?.outOfStockCount || 0}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Physical Stock Audits</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {inventoryData?.recentDiscrepancies.length || 0}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Logged variances across stock counts
              </span>
            </div>
          </div>

          {/* Low-Stock & Deficit Alert List */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Low Stock & Reorder Deficit Watchlist
                </h3>
                <p className="text-xs text-slate-500">
                  Authoritative reorder level calculation from Module 11 inventory records.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateToModule?.('inventory')}
                className="text-xs"
              >
                Open Yard Inventory (M11)
              </Button>
            </div>

            {inventoryData && inventoryData.lowStockAlerts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-800/40">
                      <th className="p-3 font-semibold">Item & SKU</th>
                      <th className="p-3 font-semibold">Location</th>
                      <th className="p-3 font-semibold text-right">On Hand</th>
                      <th className="p-3 font-semibold text-right">Reorder Level</th>
                      <th className="p-3 font-semibold text-right">Deficit</th>
                      <th className="p-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {inventoryData.lowStockAlerts.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-medium text-slate-900 dark:text-white">
                          <span>{item.name}</span>
                          <span className="text-[11px] text-slate-400 block">{item.sku}</span>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{item.location}</td>
                        <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                          {item.quantityOnHand} {item.unit}
                        </td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-300">
                          {item.reorderLevel} {item.unit}
                        </td>
                        <td className="p-3 text-right font-bold text-rose-600 dark:text-rose-400">
                          -{item.deficit} {item.unit}
                        </td>
                        <td className="p-3">
                          <Badge variant={item.status === 'out_of_stock' ? 'danger' : 'warning'} size="sm">
                            {item.status === 'out_of_stock' ? 'OUT OF STOCK' : 'LOW STOCK'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-3">All catalogued items are above safety thresholds.</p>
            )}
          </div>

          {/* Physical Count Discrepancies Table (Section 9) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Physical Count Discrepancies & Variances (Section 9)
                </h3>
                <p className="text-xs text-slate-500">
                  Differences recorded between system records and physical audit sessions. Stock adjustments must proceed through the controlled inventory workflow.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateToModule?.('stock-counts')}
                className="text-xs"
              >
                Open Stock Counts (M12)
              </Button>
            </div>

            {inventoryData && inventoryData.recentDiscrepancies.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-800/40">
                      <th className="p-3 font-semibold">Audit Session</th>
                      <th className="p-3 font-semibold">Conducted Date</th>
                      <th className="p-3 font-semibold">Product / Variant</th>
                      <th className="p-3 font-semibold">Location</th>
                      <th className="p-3 font-semibold text-right">System Qty</th>
                      <th className="p-3 font-semibold text-right">Counted Qty</th>
                      <th className="p-3 font-semibold text-right">Variance</th>
                      <th className="p-3 font-semibold">Auditor</th>
                      <th className="p-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {inventoryData.recentDiscrepancies.map((d, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-mono font-medium text-slate-900 dark:text-white">
                          #{d.countNumber}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{d.conductedDate}</td>
                        <td className="p-3 font-medium text-slate-900 dark:text-white">
                          {d.productName}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{d.locationName}</td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-300">
                          {d.systemQuantity}
                        </td>
                        <td className="p-3 text-right font-medium text-slate-900 dark:text-white">
                          {d.countedQuantity}
                        </td>
                        <td className="p-3 text-right font-bold">
                          <span className={d.varianceUnits < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                            {d.varianceUnits > 0 ? `+${d.varianceUnits}` : d.varianceUnits}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{d.conductedByName}</td>
                        <td className="p-3">
                          <Badge variant="outline" size="sm">
                            {d.status.toUpperCase()}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-3">No physical count variances recorded.</p>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. COMMERCIAL ORDERS REPORT (Section 11)                                  */}
      {/* ========================================================================= */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Order KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Total Commercial Orders</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {ordersData?.totalOrders || 0}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Scope: {dateFilter.label}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Total Orders Value</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {ordersData ? formatNaira(ordersData.totalOrdersValue) : '₦0'}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Avg Value: {ordersData ? formatNaira(ordersData.averageOrderValue) : '₦0'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Pending Fulfilment</span>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {(ordersData?.statusBreakdown['confirmed'] || 0) +
                  (ordersData?.statusBreakdown['processing'] || 0)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Orders undergoing yard staging
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Completed Deliveries</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {ordersData?.statusBreakdown['delivered'] || ordersData?.statusBreakdown['completed'] || 0}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Cancelled: {ordersData?.statusBreakdown['cancelled'] || 0}
              </span>
            </div>
          </div>

          {/* Orders Table with drill-down */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Commercial Orders List & Drill-Down
                </h3>
                <p className="text-xs text-slate-500">
                  Click any order to jump directly to order fulfilment details in Module 10.
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Status:</span>
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {ordersData && ordersData.orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-800/40">
                      <th className="p-3 font-semibold">Order Ref</th>
                      <th className="p-3 font-semibold">Order Date</th>
                      <th className="p-3 font-semibold">Customer</th>
                      <th className="p-3 font-semibold">Channel</th>
                      <th className="p-3 font-semibold text-right">Total Amount</th>
                      <th className="p-3 font-semibold text-right">Balance Due</th>
                      <th className="p-3 font-semibold">Status</th>
                      <th className="p-3 font-semibold">Payment</th>
                      <th className="p-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {ordersData.orders
                      .filter((o) => (orderStatusFilter === 'all' ? true : o.status === orderStatusFilter))
                      .map((ord) => (
                        <tr key={ord.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                            #{ord.orderNumber}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300">{ord.orderDate}</td>
                          <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                            {ord.customerName}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" size="sm">
                              {ord.salesChannel === 'direct_commercial' ? 'Direct' : 'Quotation'}
                            </Badge>
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                            {formatNaira(ord.totalAmount)}
                          </td>
                          <td className="p-3 text-right font-medium">
                            <span className={ord.balanceDue > 0 ? 'text-amber-600 font-bold' : 'text-slate-500'}>
                              {formatNaira(ord.balanceDue)}
                            </span>
                          </td>
                          <td className="p-3">
                            <Badge
                              variant={
                                ord.status === 'completed' || ord.status === 'delivered'
                                  ? 'success'
                                  : ord.status === 'cancelled'
                                  ? 'danger'
                                  : 'warning'
                              }
                              size="sm"
                            >
                              {ord.status.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge
                              variant={
                                ord.paymentStatus === 'completed' || ord.paymentStatus === 'paid'
                                  ? 'success'
                                  : ord.paymentStatus === 'partial'
                                  ? 'info'
                                  : 'outline'
                              }
                              size="sm"
                            >
                              {ord.paymentStatus.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onNavigateToModule?.('orders')}
                              className="text-xs h-7 px-2"
                              title="Drill-down into Order"
                            >
                              <span>Inspect</span>
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={<ShoppingCart className="h-6 w-6" />}
                title="No Orders Found"
                description="No commercial orders recorded in the active period window."
              />
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. OPERATIONS & FIELD INSTALLATIONS REPORT                                */}
      {/* ========================================================================= */}
      {activeTab === 'operations' && (
        <div className="space-y-6">
          {/* Operations Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Active Warehouse Tasks</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {operationsData?.warehouse.pendingTasksCount || 0}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Picking & staging operations
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Fulfilments Staged / Dispatched</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {(operationsData?.warehouse.stagedAndPackedCount || 0) +
                  (operationsData?.warehouse.dispatchedCount || 0)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Ready for road delivery
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Field Laying & Installation Jobs</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {operationsData?.totalServiceJobs || 0}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Active Sites: {operationsData?.activeInstallationJobsCount || 0}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Awaiting Quality Inspection</span>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {operationsData?.awaitingQualityCheckCount || 0}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Supervisor signoff queue
              </span>
            </div>
          </div>

          {/* Service Job Types Breakdown (Section 13) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Field Installation Scope & Laying Area Completed
                </h3>
                <p className="text-xs text-slate-500">
                  Neutral operational statistics from Module 15 service records.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateToModule?.('installations')}
                className="text-xs"
              >
                Open Field Installations (M15)
              </Button>
            </div>

            {operationsData && operationsData.typeBreakdown.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-800/40">
                      <th className="p-3 font-semibold">Service Type</th>
                      <th className="p-3 font-semibold text-right">Job Count</th>
                      <th className="p-3 font-semibold text-right">Area Laid (m²)</th>
                      <th className="p-3 font-semibold text-right">Assignments</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {operationsData.typeBreakdown.map((t, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-medium text-slate-900 dark:text-white">{t.label}</td>
                        <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                          {t.count} jobs
                        </td>
                        <td className="p-3 text-right font-bold text-amber-600 dark:text-amber-400">
                          {t.squareMetersInstalled.toLocaleString()} m²
                        </td>
                        <td className="p-3 text-right text-slate-500">
                          Staff / Contractor Crews
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-3">No service jobs scheduled in period.</p>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. REQUESTS & QUOTATIONS PIPELINE REPORT (Section 10)                     */}
      {/* ========================================================================= */}
      {activeTab === 'requests_quotations' && (
        <div className="space-y-6">
          {/* Pipeline Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Inbound Client Inquiries</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {customerData?.requestsSubmittedCount || 0}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Under review: {customerData?.requestsUnderReviewCount || 0}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Quotations Sent to Clients</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {customerData?.quotationsSentCount || 0}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Pending Value: {customerData ? formatNaira(customerData.pendingClientResponseValue) : '₦0'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Accepted Quotations</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {customerData?.quotationsAcceptedCount || 0}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Accepted Value: {customerData ? formatNaira(customerData.acceptedQuotationsTotalValue) : '₦0'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Quotation Acceptance Ratio</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {customerData?.quotationToOrderRatioPercentage || 0}%
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Accepted / Resolved quotes ratio
              </span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Estimation Intake & Commercial Conversion Notes
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Conversion statistics are calculated solely from verified customer request submissions and quotation status transitions. Unanswered quotations continue to be tracked with their expiration windows.
            </p>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateToModule?.('requests')}
                className="text-xs"
              >
                View Inbound Requests (M09)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateToModule?.('quotations')}
                className="text-xs"
              >
                View Commercial Quotations (M09)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. CUSTOMER ANALYTICS REPORT (Section 12)                                 */}
      {/* ========================================================================= */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Total Registered Customers</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {customerData?.totalCustomers || 0}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Master client directory</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Active Clients in Scope</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {customerData?.activeCustomersInPeriod || 0}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">With orders or inquiries</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">New Customer Inquiries</span>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {customerData?.newCustomersInPeriod || 0}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">In selected date window</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Privacy & Ethical Standards</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Customer analytics adhere to the XFORCE ethical boundary guidelines: no behavioral profiling, surveillance metrics, or personal exposure. Aggregates reflect operational order and quotation engagements.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateToModule?.('customers')}
              className="text-xs"
            >
              Open Customer Directory (M08)
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. EXPENSES & BASIC FINANCIAL SUMMARY (Sections 17 & 18)                  */}
      {/* ========================================================================= */}
      {activeTab === 'finance' && (
        <div className="space-y-6">
          {/* Statutory Financial Disclaimer (Section 18) */}
          <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2 font-bold mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Operational Cash Flow Movement Summary</span>
            </div>
            <p className="leading-relaxed">
              Figures reflect internal cash flow recordings (Order Collections, POS Counter Sales, and Documented Operational Expenses). This summary is an operational management tool and is not an audited profit/loss statement.
            </p>
          </div>

          {/* Primary Financial Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 font-semibold block">Recorded Income</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {financialData ? formatNaira(financialData.recordedIncome) : '₦0'}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Order Collections: {financialData ? formatNaira(financialData.orderPaymentsTotal) : '₦0'} • POS:{' '}
                {financialData ? formatNaira(financialData.posCounterSalesTotal) : '₦0'}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 font-semibold block">Recorded Operating Expenses</span>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                {financialData ? formatNaira(financialData.recordedExpenses) : '₦0'}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Approved & Paid: {financialData ? formatNaira(financialData.approvedExpenses) : '₦0'}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 font-semibold block">Net Recorded Movement</span>
              <div
                className={`text-2xl font-black mt-1 ${
                  (financialData?.netRecordedMovement || 0) >= 0
                    ? 'text-slate-900 dark:text-white'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {financialData ? formatNaira(financialData.netRecordedMovement) : '₦0'}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Recorded Income minus Approved Expenses
              </span>
            </div>
          </div>

          {/* Expense Categories Breakdown (Section 17) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Operating Expenses by Category
                </h3>
                <p className="text-xs text-slate-500">
                  Cost breakdown across diesel, equipment servicing, raw materials, logistics, and site sundries.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateToModule?.('expenses')}
                className="text-xs"
              >
                Open Expenses Manager (M17)
              </Button>
            </div>

            {financialData && financialData.expensesByCategory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-800/40">
                      <th className="p-3 font-semibold">Expense Category</th>
                      <th className="p-3 font-semibold text-right">Transactions</th>
                      <th className="p-3 font-semibold text-right">Recorded Amount</th>
                      <th className="p-3 font-semibold text-right">Share of Outflow</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {financialData.expensesByCategory.map((c) => (
                      <tr key={c.category} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-medium text-slate-900 dark:text-white">{c.label}</td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-300">
                          {c.count} claim(s)
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                          {formatNaira(c.amount)}
                        </td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-300 font-semibold">
                          {c.percentage}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-3">No expenses recorded in selected date range.</p>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. STAFF OPERATIONAL WORKLOAD SUMMARY (Section 19)                        */}
      {/* ========================================================================= */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          {/* Ethical Guidance Header */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-amber-500" />
              Factual Operational Workload Records
            </span>
            <p className="leading-relaxed">
              This summary displays factual operational assignments (Service Jobs, Warehouse Staging Tasks, POS Register Operations, and Submitted Expense Claims). In accordance with XFORCE constitutional boundaries, the system does not calculate performance scores, subjective productivity metrics, or competence ratings.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Staff Operational Activity Overview
                </h3>
                <p className="text-xs text-slate-500">
                  Factual activity logs across yard, sales counter, and laying sites.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateToModule?.('staff')}
                className="text-xs"
              >
                Open Staff Directory (M17)
              </Button>
            </div>

            {staffData && staffData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50 dark:bg-slate-800/40">
                      <th className="p-3 font-semibold">Staff Member</th>
                      <th className="p-3 font-semibold">Department & Role</th>
                      <th className="p-3 font-semibold text-right">Site Jobs (Assigned / Done)</th>
                      <th className="p-3 font-semibold text-right">Yard Tasks (Assigned / Done)</th>
                      <th className="p-3 font-semibold text-right">POS Register Sales</th>
                      <th className="p-3 font-semibold text-right">Submitted Expenses</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {staffData.map((s) => (
                      <tr key={s.staffId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-medium text-slate-900 dark:text-white">
                          <span>{s.fullName}</span>
                          <span className="text-[11px] text-slate-400 font-mono block">
                            {s.staffNumber}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-medium text-slate-800 dark:text-slate-200 block">
                            {s.jobTitle}
                          </span>
                          <Badge variant="outline" size="sm">
                            {s.departmentLabel}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {s.assignedInstallationJobsCount}
                          </span>
                          <span className="text-slate-400"> ({s.completedInstallationJobsCount} done)</span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {s.assignedWarehouseTasksCount}
                          </span>
                          <span className="text-slate-400"> ({s.completedWarehouseTasksCount} done)</span>
                        </td>
                        <td className="p-3 text-right">
                          {s.posSalesCount > 0 ? (
                            <span>
                              <strong className="text-slate-900 dark:text-white">{s.posSalesCount}</strong>{' '}
                              <span className="text-slate-400">({formatNaira(s.posSalesVolume)})</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {s.submittedExpensesCount > 0 ? (
                            <span>
                              <strong className="text-slate-900 dark:text-white">{s.submittedExpensesCount}</strong>{' '}
                              <span className="text-slate-400">({formatNaira(s.submittedExpensesVolume)})</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-3">No staff members registered.</p>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. SUPPLIERS REPORT (Section 16)                                         */}
      {/* ========================================================================= */}
      {activeTab === 'suppliers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Total Registered Suppliers</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {supplierData?.totalSuppliers || 0}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Active Vendors: {supplierData?.activeSuppliersCount || 0}</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Average Material Lead Time</span>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {supplierData?.averageLeadTimeDays || 0} Days
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">From PO dispatch to yard arrival</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium">Supply Categories</span>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {supplierData?.byCategory.length || 0}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Cement, sand, stone, equipment</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Active Supplier Categories</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(supplierData?.byCategory || []).map((cat) => (
                <div key={cat.category} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{cat.label}</span>
                  <Badge variant="outline" size="sm">
                    {cat.count} vendor(s)
                  </Badge>
                </div>
              ))}
            </div>
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateToModule?.('suppliers')}
                className="text-xs"
              >
                Open Suppliers Directory (M17)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
