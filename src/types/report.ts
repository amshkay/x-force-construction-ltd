/**
 * Reporting, Analytics & Management Dashboard Types
 * Module 20 — Reporting, Analytics & Management Dashboard
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Grounded data schemas for operational analytics, neutral performance metrics,
 * multi-period date windowing in Africa/Lagos (WAT) timezone, and CSV report export formats.
 */

export type ReportDateRangeType =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom';

export interface ReportDateFilter {
  type: ReportDateRangeType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  label: string;
}

export type ReportTab =
  | 'overview'
  | 'sales'
  | 'inventory'
  | 'orders'
  | 'operations'
  | 'requests_quotations'
  | 'customers'
  | 'finance'
  | 'staff'
  | 'suppliers';

// ----------------------------------------------------------------------
// SALES REPORT METRICS
// ----------------------------------------------------------------------

export interface SalesByProductItem {
  productId: string;
  variantId?: string | null;
  productName: string;
  variantName?: string | null;
  category: string;
  unitsSold: number;
  totalSalesValue: number;
  orderCount: number;
  currentStock: number;
}

export interface SalesByCategoryItem {
  category: string;
  totalSalesValue: number;
  orderCount: number;
  percentage: number;
}

export interface SalesByPaymentMethodItem {
  method: string;
  label: string;
  totalAmount: number;
  transactionCount: number;
}

export interface DailySalesDataPoint {
  date: string; // YYYY-MM-DD
  formattedDate: string;
  ordersRevenue: number;
  posRevenue: number;
  totalSales: number;
  ordersCount: number;
}

export interface SalesReportMetrics {
  totalSales: number; // Combined completed/confirmed orders + completed POS
  ordersCount: number;
  averageOrderValue: number;
  ordersRevenue: number;
  posCounterRevenue: number;
  recordedCollections: number;
  salesByProduct: SalesByProductItem[];
  salesByCategory: SalesByCategoryItem[];
  salesByPaymentMethod: SalesByPaymentMethodItem[];
  dailySales: DailySalesDataPoint[];
  orderStatusCounts: Record<string, number>;
}

// ----------------------------------------------------------------------
// INVENTORY REPORT METRICS
// ----------------------------------------------------------------------

export interface InventoryLocationBreakdown {
  locationId: string;
  locationName: string;
  skuCount: number;
  totalUnits: number;
  valuation: number;
}

export interface LowStockReportItem {
  id: string;
  name: string;
  sku: string;
  location: string;
  quantityOnHand: number;
  reorderLevel: number;
  minimumStock: number;
  deficit: number;
  status: 'low_stock' | 'out_of_stock';
  unit: string;
}

export interface PhysicalCountDiscrepancyItem {
  countId: string;
  countNumber: string;
  locationName: string;
  conductedDate: string;
  conductedByName: string;
  productName: string;
  systemQuantity: number;
  countedQuantity: number;
  varianceUnits: number;
  status: string;
}

export interface InventoryReportMetrics {
  totalSKUs: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalInventoryValuation: number;
  totalUnitsOnHand: number;
  locationsBreakdown: InventoryLocationBreakdown[];
  lowStockAlerts: LowStockReportItem[];
  recentDiscrepancies: PhysicalCountDiscrepancyItem[];
  movementsCount: number;
}

// ----------------------------------------------------------------------
// OPERATIONS & SERVICE JOBS REPORT METRICS
// ----------------------------------------------------------------------

export interface ServiceJobStatusBreakdown {
  status: string;
  label: string;
  count: number;
}

export interface ServiceJobTypeBreakdown {
  type: string;
  label: string;
  count: number;
  squareMetersInstalled: number;
}

export interface WarehouseOperationSummary {
  totalFulfilments: number;
  allocatedCount: number;
  pickingCount: number;
  stagedAndPackedCount: number;
  dispatchedCount: number;
  inTransitCount: number;
  deliveredCount: number;
  pendingTasksCount: number;
}

export interface OperationsReportMetrics {
  warehouse: WarehouseOperationSummary;
  totalServiceJobs: number;
  scheduledJobsCount: number;
  activeInstallationJobsCount: number;
  awaitingQualityCheckCount: number;
  completedJobsCount: number;
  cancelledJobsCount: number;
  statusBreakdown: ServiceJobStatusBreakdown[];
  typeBreakdown: ServiceJobTypeBreakdown[];
  staffAssignedCount: number;
  contractorAssignedCount: number;
}

// ----------------------------------------------------------------------
// CUSTOMER & REQUEST/QUOTATION PIPELINE METRICS
// ----------------------------------------------------------------------

export interface CustomerReportMetrics {
  totalCustomers: number;
  activeCustomersInPeriod: number;
  newCustomersInPeriod: number;
  requestsSubmittedCount: number;
  requestsUnderReviewCount: number;
  requestsConvertedCount: number;
  quotationsDraftCount: number;
  quotationsSentCount: number;
  quotationsAcceptedCount: number;
  quotationsDeclinedCount: number;
  quotationsExpiredCount: number;
  quotationToOrderRatioPercentage: number;
  acceptedQuotationsTotalValue: number;
  pendingClientResponseValue: number;
}

// ----------------------------------------------------------------------
// BASIC FINANCIAL SUMMARY METRICS
// ----------------------------------------------------------------------

export interface FinancialReportMetrics {
  recordedIncome: number; // Confirmed order payments + POS sales
  recordedExpenses: number; // All non-rejected expenses incurred in period
  approvedExpenses: number; // Approved & paid expenses
  pendingExpensesApproval: number; // Awaiting managerial signoff
  netRecordedMovement: number; // recordedIncome - approvedExpenses
  orderPaymentsTotal: number;
  posCounterSalesTotal: number;
  expensesByCategory: Array<{
    category: string;
    label: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  expensesByStatus: Record<string, { count: number; totalAmount: number }>;
}

// ----------------------------------------------------------------------
// SUPPLIER REPORT METRICS
// ----------------------------------------------------------------------

export interface SupplierReportMetrics {
  totalSuppliers: number;
  activeSuppliersCount: number;
  averageLeadTimeDays: number;
  byCategory: Array<{
    category: string;
    label: string;
    count: number;
  }>;
}

// ----------------------------------------------------------------------
// ORDER REPORT METRICS
// ----------------------------------------------------------------------

export interface OrderReportMetrics {
  totalOrders: number;
  totalOrdersValue: number;
  averageOrderValue: number;
  statusBreakdown: Record<string, number>;
  paymentStatusBreakdown: Record<string, number>;
  fulfilmentStatusBreakdown: Record<string, number>;
  orders: Array<{
    id: string;
    orderNumber: string;
    orderDate: string;
    customerName: string;
    status: string;
    paymentStatus: string;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    itemCount: number;
    salesChannel: 'quotation_order' | 'direct_commercial';
  }>;
}

// ----------------------------------------------------------------------
// STAFF OPERATIONAL ACTIVITY METRICS (FACTUAL WORKLOAD ONLY)
// ----------------------------------------------------------------------

export interface StaffActivityReportItem {
  staffId: string;
  staffNumber: string;
  fullName: string;
  department: string;
  departmentLabel: string;
  jobTitle: string;
  assignedInstallationJobsCount: number;
  completedInstallationJobsCount: number;
  assignedWarehouseTasksCount: number;
  completedWarehouseTasksCount: number;
  posSalesCount: number;
  posSalesVolume: number;
  submittedExpensesCount: number;
  submittedExpensesVolume: number;
}

// ----------------------------------------------------------------------
// COMPREHENSIVE EXECUTIVE DASHBOARD SUMMARY
// ----------------------------------------------------------------------

export interface ExecutiveDashboardSummary {
  period: ReportDateFilter;
  sales: {
    totalSales: number;
    ordersCount: number;
    averageOrderValue: number;
    posSales: number;
    collectionsInflow: number;
    salesToday: number;
    salesThisWeek: number;
    salesThisMonth: number;
  };
  inventory: {
    totalActiveSKUs: number;
    lowStockCount: number;
    outOfStockCount: number;
    valuation: number;
  };
  operations: {
    pendingWarehouseTasks: number;
    activeFulfilments: number;
    activeSiteJobs: number;
    jobsAwaitingInspection: number;
  };
  customers: {
    totalCustomers: number;
    activeCustomersInPeriod: number;
    pendingRequests: number;
    activeQuotationsValue: number;
  };
  finance: {
    recordedIncome: number;
    recordedExpenses: number;
    netRecordedMovement: number;
    pendingExpensesApprovalCount: number;
    pendingExpensesApprovalAmount: number;
  };
  attentionItems: Array<{
    id: string;
    module: string;
    title: string;
    description: string;
    severity: 'warning' | 'danger' | 'info';
    actionTargetModule: string;
  }>;
}
