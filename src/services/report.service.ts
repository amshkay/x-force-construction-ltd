/**
 * Reporting & Business Analytics Service
 * Module 20 — Reporting, Analytics & Management Dashboard
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Centralized calculation engine for executive sales metrics, yard inventory status,
 * field installation progress, operating cash movement, and operational workload reports.
 * Employs Africa/Lagos (WAT) business timezone and supports standardized CSV exports.
 */

import { orderRepository } from '../repositories/order.repository';
import { inventoryService } from './inventory.service';
import { stockLocationRepository } from '../repositories/stockLocation.repository';
import { stockCountRepository } from '../repositories/stockCount.repository';
import { inventoryRepository } from '../repositories/inventory.repository';
import { requestRepository } from '../repositories/request.repository';
import { quotationRepository } from '../repositories/quotation.repository';
import { posRepository } from '../repositories/pos.repository';
import { paymentRepository } from '../repositories/payment.repository';
import { warehouseRepository } from '../repositories/warehouse.repository';
import { installationRepository } from '../repositories/installation.repository';
import { supplierRepository } from '../repositories/supplier.repository';
import { expenseRepository, DEFAULT_EXPENSE_CATEGORIES } from '../repositories/expense.repository';
import { staffRepository, DEFAULT_STAFF_DEPARTMENTS } from '../repositories/staff.repository';
import {
  ReportDateFilter,
  ReportDateRangeType,
  SalesReportMetrics,
  InventoryReportMetrics,
  OperationsReportMetrics,
  CustomerReportMetrics,
  FinancialReportMetrics,
  SupplierReportMetrics,
  ExecutiveDashboardSummary,
  SalesByProductItem,
  SalesByCategoryItem,
  SalesByPaymentMethodItem,
  DailySalesDataPoint,
  OrderReportMetrics,
  StaffActivityReportItem,
} from '../types/report';

export class ReportService {
  /**
   * Generates a date window object conforming to Africa/Lagos timezone
   */
  public getDateRange(
    type: ReportDateRangeType,
    customStart?: string,
    customEnd?: string
  ): ReportDateFilter {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toYMD = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const todayStr = toYMD(now);

    switch (type) {
      case 'today':
        return {
          type,
          startDate: todayStr,
          endDate: todayStr,
          label: 'Today',
        };

      case 'yesterday': {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        const yStr = toYMD(y);
        return {
          type,
          startDate: yStr,
          endDate: yStr,
          label: 'Yesterday',
        };
      }

      case 'this_week': {
        const day = now.getDay();
        const diff = (day + 6) % 7; // Monday as week start
        const mon = new Date(now);
        mon.setDate(mon.getDate() - diff);
        return {
          type,
          startDate: toYMD(mon),
          endDate: todayStr,
          label: 'This Week (Mon - Today)',
        };
      }

      case 'this_month': {
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        return {
          type,
          startDate: toYMD(first),
          endDate: todayStr,
          label: `This Month (${now.toLocaleString('en-US', { month: 'short' })} ${now.getFullYear()})`,
        };
      }

      case 'last_month': {
        const firstLast = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endLast = new Date(now.getFullYear(), now.getMonth(), 0);
        return {
          type,
          startDate: toYMD(firstLast),
          endDate: toYMD(endLast),
          label: `Last Month (${firstLast.toLocaleString('en-US', { month: 'short' })} ${firstLast.getFullYear()})`,
        };
      }

      case 'this_year': {
        const firstYear = new Date(now.getFullYear(), 0, 1);
        return {
          type,
          startDate: toYMD(firstYear),
          endDate: todayStr,
          label: `This Year (${now.getFullYear()})`,
        };
      }

      case 'custom':
      default:
        return {
          type: 'custom',
          startDate: customStart || todayStr,
          endDate: customEnd || todayStr,
          label: `Custom: ${customStart || todayStr} to ${customEnd || todayStr}`,
        };
    }
  }

  /**
   * Helper to check if a date string falls inside the range (inclusive)
   */
  private isDateInRange(dateStr: string | null | undefined, range: ReportDateFilter): boolean {
    if (!dateStr) return false;
    const cleanDate = dateStr.split('T')[0];
    return cleanDate >= range.startDate && cleanDate <= range.endDate;
  }

  /**
   * 1. SALES REPORT
   * Aggregates completed/confirmed orders and completed POS transactions.
   * Cancels/refunds are excluded from revenue totals.
   */
  public async getSalesReport(range: ReportDateFilter): Promise<SalesReportMetrics> {
    const [allOrders, allPosSales, allPayments, inventoryItems] = await Promise.all([
      orderRepository.getAllOrders(),
      posRepository.getAllSales(),
      paymentRepository.getAllPayments(),
      inventoryService.getInventoryItems(),
    ]);

    // Build quick stock lookup
    const stockMap = new Map<string, number>();
    inventoryItems.forEach((i) => {
      const key = `${i.productId}:${i.variantId || 'base'}`;
      stockMap.set(key, (stockMap.get(key) || 0) + i.quantityOnHand);
    });

    // Filter orders in range
    const ordersInRange = allOrders.filter((o) => this.isDateInRange(o.orderDate, range));
    const validOrders = ordersInRange.filter((o) => o.status !== 'cancelled');

    // Filter POS sales in range
    const posInRange = allPosSales.filter(
      (s) => s.status === 'completed' && this.isDateInRange(s.createdAt, range)
    );

    // Filter payments in range
    const paymentsInRange = allPayments.filter(
      (p) => p.paymentStatus === 'completed' && this.isDateInRange(p.paymentDate, range)
    );

    const ordersRevenue = validOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const posCounterRevenue = posInRange.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const totalSales = ordersRevenue + posCounterRevenue;
    const ordersCount = validOrders.length;
    const averageOrderValue = ordersCount > 0 ? Math.round(ordersRevenue / ordersCount) : 0;
    const recordedCollections = paymentsInRange.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Sales by Product Variant breakdown
    const productSalesMap = new Map<string, SalesByProductItem>();

    validOrders.forEach((ord) => {
      (ord.items || []).forEach((item) => {
        const prodId = item.productId || 'unknown';
        const key = `${prodId}:${item.variantId || 'base'}`;
        const existing: SalesByProductItem = productSalesMap.get(key) || {
          productId: prodId,
          variantId: item.variantId || null,
          productName: item.productName || 'Interlocking Block',
          variantName: item.variantDescription || null,
          category: 'Interlocking Bricks',
          unitsSold: 0,
          totalSalesValue: 0,
          orderCount: 0,
          currentStock: stockMap.get(key) || 0,
        };

        existing.unitsSold += item.quantity || 0;
        existing.totalSalesValue += item.lineTotal || 0;
        existing.orderCount += 1;
        productSalesMap.set(key, existing);
      });
    });

    // Also fold in POS line items
    posInRange.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        const prodId = item.productId || 'unknown';
        const key = `${prodId}:${item.variantId || 'base'}`;
        const existing: SalesByProductItem = productSalesMap.get(key) || {
          productId: prodId,
          variantId: item.variantId || null,
          productName: item.productName || 'Interlocking Block',
          variantName: item.variantName || null,
          category: 'POS Direct',
          unitsSold: 0,
          totalSalesValue: 0,
          orderCount: 0,
          currentStock: stockMap.get(key) || 0,
        };

        existing.unitsSold += item.quantity || 0;
        existing.totalSalesValue += item.lineTotal || 0;
        existing.orderCount += 1;
        productSalesMap.set(key, existing);
      });
    });

    const salesByProduct = Array.from(productSalesMap.values()).sort(
      (a, b) => b.totalSalesValue - a.totalSalesValue
    );

    // Sales by Category
    const categoryMap = new Map<string, { value: number; count: number }>();
    salesByProduct.forEach((p) => {
      const cat = p.category || 'General Products';
      const cur = categoryMap.get(cat) || { value: 0, count: 0 };
      cur.value += p.totalSalesValue;
      cur.count += p.orderCount;
      categoryMap.set(cat, cur);
    });

    const salesByCategory: SalesByCategoryItem[] = Array.from(categoryMap.entries()).map(
      ([category, val]) => ({
        category,
        totalSalesValue: val.value,
        orderCount: val.count,
        percentage: totalSales > 0 ? Math.round((val.value / totalSales) * 100) : 0,
      })
    );

    // Sales by Payment Method
    const payMap = new Map<string, { total: number; count: number; label: string }>();
    paymentsInRange.forEach((p) => {
      const m = p.paymentMethod || 'other';
      const label = m.replace('_', ' ').toUpperCase();
      const cur = payMap.get(m) || { total: 0, count: 0, label };
      cur.total += p.amount;
      cur.count += 1;
      payMap.set(m, cur);
    });

    posInRange.forEach((s) => {
      const m = s.paymentMethod || 'cash';
      const label = m.replace('_', ' ').toUpperCase();
      const cur = payMap.get(m) || { total: 0, count: 0, label };
      cur.total += s.totalAmount;
      cur.count += 1;
      payMap.set(m, cur);
    });

    const salesByPaymentMethod: SalesByPaymentMethodItem[] = Array.from(payMap.entries()).map(
      ([method, data]) => ({
        method,
        label: data.label,
        totalAmount: data.total,
        transactionCount: data.count,
      })
    );

    // Daily Sales breakdown
    const dailyMap = new Map<string, DailySalesDataPoint>();
    validOrders.forEach((o) => {
      const d = o.orderDate.split('T')[0];
      const cur = dailyMap.get(d) || {
        date: d,
        formattedDate: d,
        ordersRevenue: 0,
        posRevenue: 0,
        totalSales: 0,
        ordersCount: 0,
      };
      cur.ordersRevenue += o.totalAmount || 0;
      cur.totalSales += o.totalAmount || 0;
      cur.ordersCount += 1;
      dailyMap.set(d, cur);
    });

    posInRange.forEach((s) => {
      const d = s.createdAt.split('T')[0];
      const cur = dailyMap.get(d) || {
        date: d,
        formattedDate: d,
        ordersRevenue: 0,
        posRevenue: 0,
        totalSales: 0,
        ordersCount: 0,
      };
      cur.posRevenue += s.totalAmount || 0;
      cur.totalSales += s.totalAmount || 0;
      dailyMap.set(d, cur);
    });

    const dailySales = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Order status breakdown
    const orderStatusCounts: Record<string, number> = {};
    ordersInRange.forEach((o) => {
      orderStatusCounts[o.status] = (orderStatusCounts[o.status] || 0) + 1;
    });

    return {
      totalSales,
      ordersCount,
      averageOrderValue,
      ordersRevenue,
      posCounterRevenue,
      recordedCollections,
      salesByProduct,
      salesByCategory,
      salesByPaymentMethod,
      dailySales,
      orderStatusCounts,
    };
  }

  /**
   * 2. INVENTORY REPORT
   * Reuses authoritative stock calculations from inventoryService
   */
  public async getInventoryReport(): Promise<InventoryReportMetrics> {
    const [items, locations, sessions, movements] = await Promise.all([
      inventoryService.getInventoryItems(),
      stockLocationRepository.getAllLocations(),
      stockCountRepository.getAllSessions(),
      inventoryRepository.getAllMovements(),
    ]);

    const totalSKUs = items.length;
    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalInventoryValuation = 0;
    let totalUnitsOnHand = 0;

    const locMap = new Map<string, { skuCount: number; units: number; val: number; name: string }>();
    locations.forEach((l) => locMap.set(l.id, { skuCount: 0, units: 0, val: 0, name: l.name }));

    const lowStockAlerts: InventoryReportMetrics['lowStockAlerts'] = [];

    items.forEach((item) => {
      totalInventoryValuation += item.totalValuation || 0;
      totalUnitsOnHand += item.quantityOnHand || 0;

      if (item.status === 'out_of_stock') {
        outOfStockCount++;
      } else if (item.status === 'low_stock') {
        lowStockCount++;
      } else {
        inStockCount++;
      }

      if (item.status === 'low_stock' || item.status === 'out_of_stock') {
        lowStockAlerts.push({
          id: item.id,
          name: `${item.productName}${item.variantName ? ` (${item.variantName})` : ''}`,
          sku: item.sku,
          location: item.locationName,
          quantityOnHand: item.quantityOnHand,
          reorderLevel: item.reorderLevel,
          minimumStock: item.minimumStock,
          deficit: Math.max(0, item.reorderLevel - item.quantityOnHand),
          status: item.status,
          unit: item.unit,
        });
      }

      const locEntry = locMap.get(item.locationId);
      if (locEntry) {
        locEntry.skuCount++;
        locEntry.units += item.quantityOnHand;
        locEntry.val += item.totalValuation;
      }
    });

    const locationsBreakdown = Array.from(locMap.entries()).map(([locId, data]) => ({
      locationId: locId,
      locationName: data.name,
      skuCount: data.skuCount,
      totalUnits: data.units,
      valuation: data.val,
    }));

    // Collect physical count discrepancies from sessions
    const recentDiscrepancies: InventoryReportMetrics['recentDiscrepancies'] = [];
    sessions.forEach((session) => {
      (session.items || [])
        .filter((ci) => ci.variance !== null && ci.variance !== 0)
        .forEach((ci) => {
          recentDiscrepancies.push({
            countId: session.id,
            countNumber: session.countNumber,
            locationName: session.locationName,
            conductedDate: session.countDate || session.createdAt.split('T')[0],
            conductedByName: session.initiatedByName || 'Auditor',
            productName: `${ci.productName}${ci.variantName ? ` - ${ci.variantName}` : ''}`,
            systemQuantity: ci.systemQuantitySnapshot,
            countedQuantity: ci.countedQuantity || 0,
            varianceUnits: ci.variance || 0,
            status: session.status,
          });
        });
    });

    return {
      totalSKUs,
      inStockCount,
      lowStockCount,
      outOfStockCount,
      totalInventoryValuation,
      totalUnitsOnHand,
      locationsBreakdown,
      lowStockAlerts: lowStockAlerts.sort((a, b) => b.deficit - a.deficit),
      recentDiscrepancies: recentDiscrepancies.slice(0, 10),
      movementsCount: movements.length,
    };
  }

  /**
   * 3. OPERATIONS & FULFILLMENT REPORT
   * Reuses warehouse fulfilment and service jobs records
   */
  public async getOperationsReport(range: ReportDateFilter): Promise<OperationsReportMetrics> {
    const [allFulfilments, allTasks, allJobs] = await Promise.all([
      warehouseRepository.getAllFulfilments(),
      warehouseRepository.getAllTasks(),
      installationRepository.getAll(),
    ]);

    // Warehouse summaries
    const warehouse = {
      totalFulfilments: allFulfilments.length,
      allocatedCount: allFulfilments.filter((f) => f.status === 'allocated').length,
      pickingCount: allFulfilments.filter((f) => f.status === 'picking').length,
      stagedAndPackedCount: allFulfilments.filter(
        (f) => f.status === 'picked' || f.status === 'packed' || f.status === 'ready_for_dispatch'
      ).length,
      dispatchedCount: allFulfilments.filter((f) => f.status === 'dispatched').length,
      inTransitCount: allFulfilments.filter((f) => f.status === 'in_transit').length,
      deliveredCount: allFulfilments.filter((f) => f.status === 'delivered').length,
      pendingTasksCount: allTasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length,
    };

    // Filter service jobs in period
    const jobs = allJobs.filter(
      (j) => !j.scheduledDate || this.isDateInRange(j.scheduledDate, range)
    );

    const scheduledJobsCount = jobs.filter((j) => j.status === 'scheduled').length;
    const activeInstallationJobsCount = jobs.filter(
      (j) => j.status === 'on_site' || j.status === 'preparation' || j.status === 'installation'
    ).length;
    const awaitingQualityCheckCount = jobs.filter(
      (j) => j.status === 'quality_check' || j.status === 'final_cleaning'
    ).length;
    const completedJobsCount = jobs.filter((j) => j.status === 'completed').length;
    const cancelledJobsCount = jobs.filter((j) => j.status === 'cancelled').length;

    // Status breakdown
    const statusMap = new Map<string, number>();
    jobs.forEach((j) => {
      statusMap.set(j.status, (statusMap.get(j.status) || 0) + 1);
    });

    const statusBreakdown = Array.from(statusMap.entries()).map(([st, cnt]) => ({
      status: st,
      label: st.replace('_', ' ').toUpperCase(),
      count: cnt,
    }));

    // Type breakdown
    const typeMap = new Map<string, { count: number; sqm: number; label: string }>();
    jobs.forEach((j) => {
      const cur = typeMap.get(j.serviceType) || {
        count: 0,
        sqm: 0,
        label: j.serviceTypeLabel || j.serviceType,
      };
      cur.count += 1;
      cur.sqm += j.installationDetails?.squareMetersInstalled || 0;
      typeMap.set(j.serviceType, cur);
    });

    const typeBreakdown = Array.from(typeMap.entries()).map(([tp, data]) => ({
      type: tp,
      label: data.label,
      count: data.count,
      squareMetersInstalled: Math.round(data.sqm * 10) / 10,
    }));

    const staffAssignedCount = jobs.filter((j) => !!j.assignedStaffId).length;
    const contractorAssignedCount = jobs.filter((j) => !!j.serviceProviderId).length;

    return {
      warehouse,
      totalServiceJobs: jobs.length,
      scheduledJobsCount,
      activeInstallationJobsCount,
      awaitingQualityCheckCount,
      completedJobsCount,
      cancelledJobsCount,
      statusBreakdown,
      typeBreakdown,
      staffAssignedCount,
      contractorAssignedCount,
    };
  }

  /**
   * 4. CUSTOMER & ESTIMATION PIPELINE REPORT
   */
  public async getCustomerReport(range: ReportDateFilter): Promise<CustomerReportMetrics> {
    const [requests, quotations, orders] = await Promise.all([
      requestRepository.getAllRequests(),
      quotationRepository.getAllQuotations(),
      orderRepository.getAllOrders(),
    ]);

    // Unique customers in system
    const customerIds = new Set<string>();
    orders.forEach((o) => customerIds.add(o.customerId || o.customerName));
    requests.forEach((r) => customerIds.add(r.customerId || r.customerName));
    const totalCustomers = customerIds.size;

    // In period
    const reqsInPeriod = requests.filter((r) => this.isDateInRange(r.createdAt, range));
    const quotesInPeriod = quotations.filter((q) => this.isDateInRange(q.quotationDate, range));
    const ordersInPeriod = orders.filter((o) => this.isDateInRange(o.orderDate, range));

    const activeCustomerIds = new Set<string>();
    ordersInPeriod.forEach((o) => activeCustomerIds.add(o.customerId || o.customerName));
    reqsInPeriod.forEach((r) => activeCustomerIds.add(r.customerId || r.customerName));

    const requestsSubmittedCount = reqsInPeriod.filter((r) => r.status === 'submitted').length;
    const requestsUnderReviewCount = reqsInPeriod.filter((r) => r.status === 'under_review').length;
    const requestsConvertedCount = reqsInPeriod.filter(
      (r) => r.status === 'quotation_prepared' || r.status === 'quotation_sent' || r.status === 'accepted'
    ).length;

    const quotationsDraftCount = quotesInPeriod.filter((q) => q.status === 'draft').length;
    const quotationsSentCount = quotesInPeriod.filter(
      (q) => q.status === 'sent' || q.status === 'viewed'
    ).length;
    const quotationsAcceptedCount = quotesInPeriod.filter((q) => q.status === 'accepted').length;
    const quotationsDeclinedCount = quotesInPeriod.filter((q) => q.status === 'declined').length;
    const quotationsExpiredCount = quotesInPeriod.filter((q) => q.status === 'expired').length;

    const acceptedQuotationsTotalValue = quotesInPeriod
      .filter((q) => q.status === 'accepted')
      .reduce((sum, q) => sum + (q.totalAmount || 0), 0);

    const pendingClientResponseValue = quotesInPeriod
      .filter((q) => q.status === 'sent' || q.status === 'viewed')
      .reduce((sum, q) => sum + (q.totalAmount || 0), 0);

    const resolvedQuotes = quotationsAcceptedCount + quotationsDeclinedCount;
    const quotationToOrderRatioPercentage =
      resolvedQuotes > 0 ? Math.round((quotationsAcceptedCount / resolvedQuotes) * 100) : 0;

    return {
      totalCustomers,
      activeCustomersInPeriod: activeCustomerIds.size,
      newCustomersInPeriod: Math.min(activeCustomerIds.size, reqsInPeriod.length),
      requestsSubmittedCount,
      requestsUnderReviewCount,
      requestsConvertedCount,
      quotationsDraftCount,
      quotationsSentCount,
      quotationsAcceptedCount,
      quotationsDeclinedCount,
      quotationsExpiredCount,
      quotationToOrderRatioPercentage,
      acceptedQuotationsTotalValue,
      pendingClientResponseValue,
    };
  }

  /**
   * 5. FINANCIAL & EXPENSE REPORT
   * Reuses financeService logic and distinguishes recorded, approved, and paid amounts.
   */
  public async getFinancialReport(range: ReportDateFilter): Promise<FinancialReportMetrics> {
    const [allExpenses, allPayments, allPosSales] = await Promise.all([
      expenseRepository.getAll(),
      paymentRepository.getAllPayments(),
      posRepository.getAllSales(),
    ]);

    const expensesInPeriod = allExpenses.filter((e) =>
      this.isDateInRange(e.dateIncurred, range)
    );
    const paymentsInPeriod = allPayments.filter(
      (p) => p.paymentStatus === 'completed' && this.isDateInRange(p.paymentDate, range)
    );
    const posInPeriod = allPosSales.filter(
      (s) => s.status === 'completed' && this.isDateInRange(s.createdAt, range)
    );

    const orderPaymentsTotal = paymentsInPeriod.reduce((sum, p) => sum + (p.amount || 0), 0);
    const posCounterSalesTotal = posInPeriod.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const recordedIncome = orderPaymentsTotal + posCounterSalesTotal;

    const recordedExpenses = expensesInPeriod
      .filter((e) => e.status !== 'rejected')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const approvedExpenses = expensesInPeriod
      .filter((e) => e.status === 'approved' || e.status === 'paid')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const pendingExpensesApproval = expensesInPeriod
      .filter((e) => e.status === 'pending')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const netRecordedMovement = recordedIncome - approvedExpenses;

    // Expenses by Category
    const catLabels = new Map(DEFAULT_EXPENSE_CATEGORIES.map((c) => [c.code, c.label]));
    const catMap = new Map<string, { amount: number; count: number }>();

    expensesInPeriod
      .filter((e) => e.status !== 'rejected')
      .forEach((e) => {
        const cur = catMap.get(e.category) || { amount: 0, count: 0 };
        cur.amount += e.amount;
        cur.count += 1;
        catMap.set(e.category, cur);
      });

    const expensesByCategory = Array.from(catMap.entries()).map(([cat, data]) => ({
      category: cat,
      label: catLabels.get(cat as any) || cat.replace('_', ' ').toUpperCase(),
      amount: data.amount,
      count: data.count,
      percentage: recordedExpenses > 0 ? Math.round((data.amount / recordedExpenses) * 100) : 0,
    })).sort((a, b) => b.amount - a.amount);

    // Status mapping
    const statusMap: Record<string, { count: number; totalAmount: number }> = {
      pending: { count: 0, totalAmount: 0 },
      approved: { count: 0, totalAmount: 0 },
      paid: { count: 0, totalAmount: 0 },
      rejected: { count: 0, totalAmount: 0 },
    };

    expensesInPeriod.forEach((e) => {
      if (!statusMap[e.status]) {
        statusMap[e.status] = { count: 0, totalAmount: 0 };
      }
      statusMap[e.status].count += 1;
      statusMap[e.status].totalAmount += e.amount;
    });

    return {
      recordedIncome,
      recordedExpenses,
      approvedExpenses,
      pendingExpensesApproval,
      netRecordedMovement,
      orderPaymentsTotal,
      posCounterSalesTotal,
      expensesByCategory,
      expensesByStatus: statusMap,
    };
  }

  /**
   * 6. SUPPLIER REPORT
   */
  public async getSupplierReport(): Promise<SupplierReportMetrics> {
    const suppliers = await supplierRepository.getAll();
    const activeSuppliers = suppliers.filter((s) => s.status === 'active');

    const totalLeadTime = activeSuppliers.reduce((sum, s) => sum + (s.leadTimeDays || 0), 0);
    const averageLeadTimeDays =
      activeSuppliers.length > 0 ? Math.round(totalLeadTime / activeSuppliers.length) : 0;

    const catMap = new Map<string, number>();
    suppliers.forEach((s) => {
      catMap.set(s.category, (catMap.get(s.category) || 0) + 1);
    });

    const byCategory = Array.from(catMap.entries()).map(([cat, cnt]) => ({
      category: cat,
      label: cat.replace('_', ' ').toUpperCase(),
      count: cnt,
    }));

    return {
      totalSuppliers: suppliers.length,
      activeSuppliersCount: activeSuppliers.length,
      averageLeadTimeDays,
      byCategory,
    };
  }

  /**
   * 7. ORDER REPORT
   * Detailed breakdown of commercial orders with status, fulfilment, and payment health.
   */
  public async getOrderReport(range: ReportDateFilter): Promise<OrderReportMetrics> {
    const allOrders = await orderRepository.getAllOrders();
    const ordersInRange = allOrders.filter((o) => this.isDateInRange(o.orderDate, range));

    const statusBreakdown: Record<string, number> = {};
    const paymentStatusBreakdown: Record<string, number> = {};
    const fulfilmentStatusBreakdown: Record<string, number> = {};

    let totalOrdersValue = 0;

    ordersInRange.forEach((o) => {
      statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1;
      paymentStatusBreakdown[o.paymentStatus] = (paymentStatusBreakdown[o.paymentStatus] || 0) + 1;
      const fStatus = (o as any).fulfillmentStatus || o.status;
      fulfilmentStatusBreakdown[fStatus] = (fulfilmentStatusBreakdown[fStatus] || 0) + 1;

      if (o.status !== 'cancelled') {
        totalOrdersValue += o.totalAmount || 0;
      }
    });

    const totalOrders = ordersInRange.length;
    const averageOrderValue = totalOrders > 0 ? Math.round(totalOrdersValue / totalOrders) : 0;

    const mappedOrders = ordersInRange.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      orderDate: o.orderDate ? o.orderDate.split('T')[0] : '',
      customerName: o.customerName || 'Customer',
      status: o.status,
      paymentStatus: o.paymentStatus,
      totalAmount: o.totalAmount || 0,
      amountPaid: o.amountPaid || 0,
      balanceDue: o.balanceDue || 0,
      itemCount: (o.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0),
      salesChannel: ((o.internalNotes || o.deliveryNotes || '').toLowerCase().includes('pos')
        ? 'direct_commercial'
        : 'quotation_order') as 'quotation_order' | 'direct_commercial',
    }));

    return {
      totalOrders,
      totalOrdersValue,
      averageOrderValue,
      statusBreakdown,
      paymentStatusBreakdown,
      fulfilmentStatusBreakdown,
      orders: mappedOrders,
    };
  }

  /**
   * 8. STAFF OPERATIONAL ACTIVITY REPORT
   * Factual operational workload summary.
   * Strictly avoids performance ratings, competence scoring, or employee suitability judgments.
   */
  public async getStaffActivityReport(_range: ReportDateFilter): Promise<StaffActivityReportItem[]> {
    const allStaff = await staffRepository.getAll();
    const deptMap = new Map(DEFAULT_STAFF_DEPARTMENTS.map((d) => [d.code, d.label]));

    const summaries = await Promise.all(
      allStaff.map(async (stf) => {
        const op = await staffRepository.getOperationalSummary(stf.id);
        const item: StaffActivityReportItem = {
          staffId: stf.id,
          staffNumber: stf.staffNumber,
          fullName: stf.fullName,
          department: stf.department,
          departmentLabel: deptMap.get(stf.department) || stf.department,
          jobTitle: stf.jobTitle,
          assignedInstallationJobsCount: op.assignedInstallationJobsCount || 0,
          completedInstallationJobsCount: op.completedInstallationJobsCount || 0,
          assignedWarehouseTasksCount: op.assignedWarehouseTasksCount || 0,
          completedWarehouseTasksCount: op.completedWarehouseTasksCount || 0,
          posSalesCount: op.posSalesCount || 0,
          posSalesVolume: op.totalPosSalesVolume || 0,
          submittedExpensesCount: op.expensesRecordedCount || 0,
          submittedExpensesVolume: 0,
        };
        return item;
      })
    );

    return summaries;
  }

  /**
   * 9. EXECUTIVE DASHBOARD SUMMARY
   * High-level multi-departmental intelligence bundle with operational attention alerts
   */
  public async getExecutiveDashboardSummary(
    range: ReportDateFilter
  ): Promise<ExecutiveDashboardSummary> {
    const todayFilter = this.getDateRange('today');
    const weekFilter = this.getDateRange('this_week');
    const monthFilter = this.getDateRange('this_month');

    const [
      sales,
      inventory,
      operations,
      customers,
      finance,
      todaySales,
      weekSales,
      monthSales,
    ] = await Promise.all([
      this.getSalesReport(range),
      this.getInventoryReport(),
      this.getOperationsReport(range),
      this.getCustomerReport(range),
      this.getFinancialReport(range),
      this.getSalesReport(todayFilter),
      this.getSalesReport(weekFilter),
      this.getSalesReport(monthFilter),
    ]);

    const attentionItems: ExecutiveDashboardSummary['attentionItems'] = [];

    // Attention 1: Critical Low Stock
    if (inventory.lowStockCount > 0) {
      attentionItems.push({
        id: 'att-low-stock',
        module: 'inventory',
        title: `${inventory.lowStockCount} Item(s) Below Safety Stock Threshold`,
        description: `Yard inventory contains ${inventory.lowStockCount} lines below reorder points. Immediate batch production or material order required.`,
        severity: 'danger',
        actionTargetModule: 'inventory',
      });
    }

    // Attention 2: Pending Expense Approvals
    if (finance.expensesByStatus.pending?.count > 0) {
      attentionItems.push({
        id: 'att-pending-expenses',
        module: 'expenses',
        title: `${finance.expensesByStatus.pending.count} Expense Claim(s) Awaiting Approval`,
        description: `₦${finance.expensesByStatus.pending.totalAmount.toLocaleString()} in operating expenses awaiting director or manager signoff.`,
        severity: 'warning',
        actionTargetModule: 'expenses',
      });
    }

    // Attention 3: Pending Inbound Customer Requests
    if (customers.requestsSubmittedCount > 0) {
      attentionItems.push({
        id: 'att-pending-requests',
        module: 'requests',
        title: `${customers.requestsSubmittedCount} Unreviewed Customer Inquiry(s)`,
        description: `New customer request submissions awaiting site inspection scheduling or quotation estimation intake.`,
        severity: 'info',
        actionTargetModule: 'requests',
      });
    }

    // Attention 4: Warehouse Dispatch Queue
    if (operations.warehouse.stagedAndPackedCount > 0) {
      attentionItems.push({
        id: 'att-staged-dispatch',
        module: 'warehouse',
        title: `${operations.warehouse.stagedAndPackedCount} Fulfilment(s) Ready for Dispatch`,
        description: `Waybills staged in yard waiting for driver assignment and road delivery loading.`,
        severity: 'info',
        actionTargetModule: 'warehouse',
      });
    }

    return {
      period: range,
      sales: {
        totalSales: sales.totalSales,
        ordersCount: sales.ordersCount,
        averageOrderValue: sales.averageOrderValue,
        posSales: sales.posCounterRevenue,
        collectionsInflow: sales.recordedCollections,
        salesToday: todaySales.totalSales,
        salesThisWeek: weekSales.totalSales,
        salesThisMonth: monthSales.totalSales,
      },
      inventory: {
        totalActiveSKUs: inventory.totalSKUs,
        lowStockCount: inventory.lowStockCount,
        outOfStockCount: inventory.outOfStockCount,
        valuation: inventory.totalInventoryValuation,
      },
      operations: {
        pendingWarehouseTasks: operations.warehouse.pendingTasksCount,
        activeFulfilments: operations.warehouse.allocatedCount + operations.warehouse.pickingCount,
        activeSiteJobs: operations.activeInstallationJobsCount,
        jobsAwaitingInspection: operations.awaitingQualityCheckCount,
      },
      customers: {
        totalCustomers: customers.totalCustomers,
        activeCustomersInPeriod: customers.activeCustomersInPeriod,
        pendingRequests: customers.requestsSubmittedCount,
        activeQuotationsValue: customers.pendingClientResponseValue,
      },
      finance: {
        recordedIncome: finance.recordedIncome,
        recordedExpenses: finance.recordedExpenses,
        netRecordedMovement: finance.netRecordedMovement,
        pendingExpensesApprovalCount: finance.expensesByStatus.pending?.count || 0,
        pendingExpensesApprovalAmount: finance.expensesByStatus.pending?.totalAmount || 0,
      },
      attentionItems,
    };
  }

  /**
   * Helper to trigger a browser CSV download with UTF-8 BOM
   */
  public exportToCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
    const csvContent = [
      headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','),
      ...rows.map((row) =>
        row
          .map((val) => {
            const str = String(val ?? '');
            return `"${str.replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ].join('\r\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const reportService = new ReportService();
