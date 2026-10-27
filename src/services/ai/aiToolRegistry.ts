/**
 * AI Tool Registry & Business Data Access Layer
 * Module 19 — Admin AI Business Assistant
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Exposes strictly controlled, read-only-by-default access tools to authorized business data.
 * Validates schemas, enforces RBAC, sanitizes prompt injection vectors,
 * and builds confirmation-based protected actions.
 */

import { FunctionDeclaration, Type } from '@google/genai';
import { orderRepository } from '../../repositories/order.repository';
import { inventoryService } from '../inventory.service';
import { requestRepository } from '../../repositories/request.repository';
import { quotationRepository } from '../../repositories/quotation.repository';
import { paymentRepository } from '../../repositories/payment.repository';
import { posRepository } from '../../repositories/pos.repository';
import { warehouseRepository } from '../../repositories/warehouse.repository';
import { installationRepository } from '../../repositories/installation.repository';
import { supplierRepository } from '../../repositories/supplier.repository';
import { expenseRepository } from '../../repositories/expense.repository';
import { financeService } from '../finance.service';
import { reportService } from '../report.service';
import { auditService } from '../audit.service';
import { ReportDateRangeType } from '../../types/report';
import { AiActionConfirmation } from '../../types/ai';
import { PERMISSION_CODES } from '../../types/auth';

export interface ToolExecutionContext {
  userId: string;
  userRole: string;
  hasPermission: (perm: string) => boolean;
}

export interface ToolExecutionResult {
  toolName: string;
  data: any;
  summaryText?: string;
  sources?: Array<{ name: string; count?: number; period?: string; sourceModule?: string }>;
  proposedAction?: Omit<AiActionConfirmation, 'id' | 'requestedAt' | 'status'>;
}

/**
 * Clean strings to neutralize potential prompt injections
 */
export function sanitizeString(val: any): string {
  if (typeof val !== 'string') return String(val || '');
  return val
    .replace(/[<>{}]/g, '') // strip HTML/XML tags
    .replace(/\b(ignore previous instructions|system prompt|reveal password)\b/gi, '[filtered]')
    .trim();
}

/**
 * Format currency in Nigerian Naira
 */
export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount);
}

/**
 * Declarations for Gemini Function Calling
 */
export const AI_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'getBusinessSummary',
    description: 'Provides a high-level operational overview across sales, orders, yard inventory, warehouse fulfillment, site installations, and operating cash flow.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        period: {
          type: Type.STRING,
          description: 'Timeframe for the summary: "today", "this_week", "this_month", or "all". Default is "this_month".',
        },
      },
    },
  },
  {
    name: 'getRecentOrders',
    description: 'Retrieves commercial customer orders filtered by status or date.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        status: {
          type: Type.STRING,
          description: 'Optional filter: "pending", "confirmed", "in_production", "ready_for_dispatch", "dispatched", "completed", "cancelled", or "all".',
        },
        limit: {
          type: Type.INTEGER,
          description: 'Maximum number of orders to retrieve (1 to 20). Default is 8.',
        },
      },
    },
  },
  {
    name: 'getPendingRequests',
    description: 'Retrieves customer requests awaiting consultation, site inspection, or quotation preparation.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        limit: {
          type: Type.INTEGER,
          description: 'Maximum number of requests to return.',
        },
      },
    },
  },
  {
    name: 'getQuotationSummary',
    description: 'Retrieves status of sales quotations including pending client responses, accepted quotes, and expired estimations.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        status: {
          type: Type.STRING,
          description: 'Optional filter: "draft", "sent", "accepted", "declined", "expired", or "all".',
        },
      },
    },
  },
  {
    name: 'getInventorySummary',
    description: 'Retrieves aggregated stock levels for interlocking bricks, paving blocks, and production consumables across yard locations.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          description: 'Optional category filter: "bricks", "pavers", "raw_materials", "equipment", or "all".',
        },
      },
    },
  },
  {
    name: 'getLowStockItems',
    description: 'Identifies inventory items and materials that are below their safety thresholds or reorder points.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'getPendingWarehouseTasks',
    description: 'Retrieves active yard fulfillment operations, staging queue, and waybills awaiting loading or dispatch.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        status: {
          type: Type.STRING,
          description: 'Optional filter: "allocated", "picking", "packed", "ready_for_dispatch", or "all".',
        },
      },
    },
  },
  {
    name: 'getActiveServiceJobs',
    description: 'Retrieves site installation and paving jobs with their supervisors, assigned laying teams, and completion progress.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        status: {
          type: Type.STRING,
          description: 'Optional filter: "scheduled", "in_progress", "quality_check", "completed", or "all".',
        },
      },
    },
  },
  {
    name: 'getCustomerSummary',
    description: 'Retrieves high-level summary of registered customers, recent inquiries, and active client projects.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        searchQuery: {
          type: Type.STRING,
          description: 'Optional name, phone, or company search string.',
        },
      },
    },
  },
  {
    name: 'getPaymentSummary',
    description: 'Retrieves recent payment receipts, POS counter sales totals, and outstanding order balances.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        period: {
          type: Type.STRING,
          description: 'Optional timeframe: "today", "this_week", "this_month".',
        },
      },
    },
  },
  {
    name: 'getExpenseSummary',
    description: 'Retrieves business operating expenses, cost breakdowns by category (diesel, repairs, logistics), and claims awaiting manager approval.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        status: {
          type: Type.STRING,
          description: 'Optional filter: "pending", "approved", "paid", "rejected", or "all".',
        },
      },
    },
  },
  {
    name: 'getSupplierSummary',
    description: 'Retrieves registered raw material vendors (cement, sand, granite, equipment) and their active supply status.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          description: 'Optional vendor category filter.',
        },
      },
    },
  },
  {
    name: 'getSalesReport',
    description: 'Retrieves official, trusted sales metrics from Module 20 reporting engine: total sales, order count, average order value, POS counter sales, and daily volume.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        period: {
          type: Type.STRING,
          description: 'Reporting scope: "today", "yesterday", "this_week", "this_month", "last_month", or "this_year". Defaults to "this_month".',
        },
      },
    },
  },
  {
    name: 'getExecutiveOverviewReport',
    description: 'Retrieves comprehensive executive management summary across sales, yard inventory, site operations, operating cash movement, and pending attention items.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        period: {
          type: Type.STRING,
          description: 'Reporting scope: "today", "this_week", "this_month", "last_month", or "this_year". Defaults to "this_month".',
        },
      },
    },
  },
  {
    name: 'getAuditLogs',
    description: 'Queries official append-only system audit logs for administrative accountability, sensitive action history, or entity changes.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        entityType: {
          type: Type.STRING,
          description: 'Optional entity type (e.g. "order", "inventory", "expense", "stock_count", "staff", "settings").',
        },
        action: {
          type: Type.STRING,
          description: 'Optional action type (e.g. "CREATE", "APPROVE", "REJECT", "UPDATE", "LOGIN").',
        },
        searchQuery: {
          type: Type.STRING,
          description: 'Optional search text (e.g. order number, staff name, reference code).',
        },
      },
    },
  },
  {
    name: 'proposeServiceCompletion',
    description: 'Protected Action: Proposes marking an installation service job as completed. Requires explicit user confirmation in the UI.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        serviceJobId: {
          type: Type.STRING,
          description: 'The unique service ID or reference (e.g. "SRV-2026-0001").',
        },
        completionNotes: {
          type: Type.STRING,
          description: 'Summary of the final inspection or client signoff.',
        },
      },
      required: ['serviceJobId'],
    },
  },
  {
    name: 'proposeExpenseApproval',
    description: 'Protected Action: Proposes approving a pending operating expense voucher. Requires explicit user confirmation in the UI.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        expenseId: {
          type: Type.STRING,
          description: 'The unique expense ID or expense number (e.g. "EXP-2026-0008").',
        },
        notes: {
          type: Type.STRING,
          description: 'Optional manager approval commentary.',
        },
      },
      required: ['expenseId'],
    },
  },
  {
    name: 'getTrustedSalesReport',
    description: 'Retrieves authoritative, validated sales metrics and product breakdown using the official Module 20 Reporting Service.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        timeframe: {
          type: Type.STRING,
          description: 'Reporting period: "today", "yesterday", "this_week", "this_month", "last_month", or "this_year". Default is "this_month".',
        },
      },
    },
  },
];

/**
 * Execute tool requests against real application repositories
 */
export async function executeAiTool(
  toolName: string,
  args: Record<string, any>,
  context: ToolExecutionContext
): Promise<ToolExecutionResult> {
  const isAuthorized = (perm: string) =>
    context.userRole === 'administrator' || (typeof context.hasPermission === 'function' && context.hasPermission(perm));

  switch (toolName) {
    case 'getTrustedSalesReport': {
      if (!isAuthorized(PERMISSION_CODES.REPORTS_SALES) && !isAuthorized(PERMISSION_CODES.REPORTS_FINANCE)) {
        return {
          toolName,
          data: { error: 'Permission Denied: Insufficient authorization to access financial sales reports.' },
          summaryText: 'Security Notice: User lacks permission to query sales and revenue metrics.',
        };
      }
      const tf = (args.timeframe || 'this_month') as ReportDateRangeType;
      const range = reportService.getDateRange(tf);
      const sales = await reportService.getSalesReport(range);

      return {
        toolName,
        data: {
          period: range.label,
          totalSalesFormatted: formatNaira(sales.totalSales),
          ordersCount: sales.ordersCount,
          averageOrderValueFormatted: formatNaira(sales.averageOrderValue),
          posRevenueFormatted: formatNaira(sales.posCounterRevenue),
          collectionsFormatted: formatNaira(sales.recordedCollections),
          topSellingProducts: sales.salesByProduct.slice(0, 5).map((p) => ({
            name: p.productName + (p.variantName ? ` (${p.variantName})` : ''),
            category: p.category,
            unitsSold: p.unitsSold,
            totalSalesValue: formatNaira(p.totalSalesValue),
            currentStock: p.currentStock,
          })),
        },
        sources: [
          { name: 'Module 20 Trusted Sales Report', count: sales.ordersCount, period: range.label, sourceModule: 'reports' },
        ],
      };
    }

    case 'getBusinessSummary': {
      const [orders, invItems, pendingReqs, expenses, services, finSummary] = await Promise.all([
        orderRepository.getAllOrders(),
        inventoryService.getInventoryItems(),
        requestRepository.getAllRequests(),
        expenseRepository.getAll(),
        installationRepository.getAll(),
        financeService.getFinanceSummary('this_month'),
      ]);

      const lowStock = invItems.filter((i) => i.status === 'low_stock' || i.status === 'out_of_stock');
      const activeOrders = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'completed');
      const pendingExpenses = expenses.filter((e) => e.status === 'pending');
      const activeServices = services.filter((s) => s.status === 'installation' || s.status === 'scheduled' || s.status === 'inspection');
      const unreviewedRequests = pendingReqs.filter((r) => r.status === 'submitted' || r.status === 'under_review');

      return {
        toolName,
        data: {
          activeOrdersCount: activeOrders.length,
          activeOrdersValue: formatNaira(activeOrders.reduce((sum: number, o) => sum + (o.totalAmount || 0), 0)),
          lowStockAlertsCount: lowStock.length,
          pendingExpenseApprovalsCount: pendingExpenses.length,
          pendingExpensesTotalAmount: formatNaira(pendingExpenses.reduce((sum: number, e) => sum + e.amount, 0)),
          activeSiteJobsCount: activeServices.length,
          unreviewedRequestsCount: unreviewedRequests.length,
          cashFlow: {
            grossRevenue: formatNaira(finSummary.totalGrossRevenue),
            operatingExpenses: formatNaira(finSummary.totalApprovedExpenses),
            netOperatingFlow: formatNaira(finSummary.netOperatingCashBalance),
          },
        },
        sources: [
          { name: 'Commercial Orders', count: orders.length, sourceModule: 'orders' },
          { name: 'Yard Stock Inventory', count: lowStock.length, sourceModule: 'inventory' },
          { name: 'Operating Expenses', count: expenses.length, sourceModule: 'expenses' },
          { name: 'Installation Jobs', count: services.length, sourceModule: 'installations' },
        ],
      };
    }

    case 'getRecentOrders': {
      const statusFilter = args.status;
      const limit = Math.min(Math.max(args.limit || 8, 1), 20);
      const orders = await orderRepository.getAllOrders();

      let filtered = orders;
      if (statusFilter && statusFilter !== 'all') {
        filtered = orders.filter((o) => o.status === statusFilter);
      }

      const sliced = filtered.slice(0, limit).map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: sanitizeString(o.customerName),
        orderDate: o.orderDate,
        status: o.status,
        paymentStatus: o.paymentStatus,
        totalAmountFormatted: formatNaira(o.totalAmount),
        balanceDueFormatted: formatNaira(o.balanceDue),
        itemCount: o.items?.length || 0,
        requiresInstallation: !!o.requiresInstallation,
      }));

      return {
        toolName,
        data: {
          totalMatching: filtered.length,
          orders: sliced,
        },
        sources: [{ name: 'Orders Registry', count: filtered.length, sourceModule: 'orders' }],
      };
    }

    case 'getPendingRequests': {
      const limit = Math.min(args.limit || 10, 25);
      const all = await requestRepository.getAllRequests();
      const pending = all.filter((r) => r.status === 'submitted' || r.status === 'under_review');

      const sliced = pending.slice(0, limit).map((r) => ({
        id: r.id,
        requestNumber: r.requestNumber,
        customerName: sanitizeString(r.customerName),
        requestType: sanitizeString(r.requestType),
        status: r.status,
        siteLocation: sanitizeString(r.projectCity || r.projectAddress || 'Enugu'),
        createdAt: r.createdAt,
      }));

      return {
        toolName,
        data: {
          pendingRequestsCount: pending.length,
          requests: sliced,
        },
        sources: [{ name: 'Inbound Requests', count: pending.length, sourceModule: 'requests' }],
      };
    }

    case 'getQuotationSummary': {
      const quotations = await quotationRepository.getAllQuotations();
      const statusFilter = args.status;

      let filtered = quotations;
      if (statusFilter && statusFilter !== 'all') {
        filtered = quotations.filter((q) => q.status === statusFilter);
      }

      const pendingClientResponse = quotations.filter(
        (q) => q.status === 'sent' || q.status === 'viewed'
      );
      const accepted = quotations.filter((q) => q.status === 'accepted');

      return {
        toolName,
        data: {
          totalQuotationsCount: quotations.length,
          pendingClientResponseCount: pendingClientResponse.length,
          pendingTotalValue: formatNaira(
            pendingClientResponse.reduce((sum, q) => sum + (q.totalAmount || 0), 0)
          ),
          acceptedCount: accepted.length,
          sampleQuotations: filtered.slice(0, 6).map((q) => ({
            id: q.id,
            quotationNumber: q.quotationNumber,
            customerName: sanitizeString(q.customerName),
            status: q.status,
            grandTotal: formatNaira(q.totalAmount),
            expiresAt: q.validUntil,
          })),
        },
        sources: [{ name: 'Commercial Quotations', count: quotations.length, sourceModule: 'quotations' }],
      };
    }

    case 'getInventorySummary': {
      const items = await inventoryService.getInventoryItems();
      const categoryFilter = args.category;

      let filtered = items;
      if (categoryFilter && categoryFilter !== 'all') {
        filtered = items.filter((i) => i.categoryName.toLowerCase().includes(categoryFilter.toLowerCase()));
      }

      return {
        toolName,
        data: {
          totalSKUsCount: filtered.length,
          items: filtered.slice(0, 10).map((i) => ({
            id: i.id,
            name: sanitizeString(i.productName + (i.variantName ? ` (${i.variantName})` : '')),
            sku: i.sku,
            currentStock: i.quantityOnHand,
            unit: i.unit,
            status: i.status,
            location: sanitizeString(i.locationName),
          })),
        },
        sources: [{ name: 'Yard Stock Inventory', count: items.length, sourceModule: 'inventory' }],
      };
    }

    case 'getLowStockItems': {
      const items = await inventoryService.getInventoryItems();
      const lowStock = items.filter((i) => i.status === 'low_stock' || i.status === 'out_of_stock');

      return {
        toolName,
        data: {
          count: lowStock.length,
          items: lowStock.map((i) => ({
            id: i.id,
            name: sanitizeString(i.productName + (i.variantName ? ` (${i.variantName})` : '')),
            sku: i.sku,
            currentStock: i.quantityOnHand,
            reorderPoint: i.reorderLevel,
            unit: i.unit,
            location: sanitizeString(i.locationName),
            deficit: Math.max(0, i.reorderLevel - i.quantityOnHand),
          })),
        },
        sources: [{ name: 'Low Stock Alerts', count: lowStock.length, sourceModule: 'inventory' }],
      };
    }

    case 'getPendingWarehouseTasks': {
      const fulfilments = await warehouseRepository.getAllFulfilments();
      const tasks = await warehouseRepository.getAllTasks();
      const pendingDispatch = fulfilments.filter(
        (f) =>
          f.status === 'allocated' ||
          f.status === 'picking' ||
          f.status === 'picked' ||
          f.status === 'packed' ||
          f.status === 'ready_for_dispatch'
      );

      return {
        toolName,
        data: {
          activeFulfilmentsCount: fulfilments.length,
          pendingDispatchCount: pendingDispatch.length,
          activeWarehouseTasksCount: tasks.length,
          stagingQueue: pendingDispatch.slice(0, 8).map((f) => ({
            id: f.id,
            fulfilmentNumber: f.fulfilmentNumber,
            orderNumber: f.orderNumber,
            customerName: sanitizeString(f.customerName),
            status: f.status,
            destination: sanitizeString(f.destinationAddress),
          })),
        },
        sources: [{ name: 'Warehouse Logistics', count: fulfilments.length, sourceModule: 'warehouse' }],
      };
    }

    case 'getActiveServiceJobs': {
      const jobs = await installationRepository.getAll();
      const statusFilter = args.status;

      let filtered = jobs;
      if (statusFilter && statusFilter !== 'all') {
        filtered = jobs.filter((j) => j.status === statusFilter);
      } else {
        filtered = jobs.filter((j) => j.status !== 'completed' && j.status !== 'cancelled');
      }

      return {
        toolName,
        data: {
          totalActiveJobs: filtered.length,
          jobs: filtered.slice(0, 8).map((j) => ({
            id: j.id,
            serviceNumber: j.jobReference,
            jobTitle: sanitizeString(j.serviceTypeLabel),
            siteAddress: sanitizeString(j.siteAddress),
            status: j.status,
            progressPercentage: j.status === 'completed' ? 100 : j.status === 'installation' ? 65 : 20,
            supervisorName: sanitizeString(j.assignedStaffName || 'Unassigned'),
            scheduledStartDate: j.scheduledDate,
          })),
        },
        sources: [{ name: 'Installation Jobs', count: filtered.length, sourceModule: 'installations' }],
      };
    }

    case 'getCustomerSummary': {
      const orders = await orderRepository.getAllOrders();
      const unique = new Map<string, string>();
      orders.forEach((o) => unique.set(o.customerId || o.customerName, o.customerName));
      const customers = Array.from(unique.entries()).map(([id, name]) => ({ id, name }));

      return {
        toolName,
        data: {
          activeCustomersCount: customers.length,
          sampleCustomers: customers.slice(0, 10).map((c) => ({
            id: c.id,
            name: sanitizeString(c.name),
          })),
        },
        sources: [{ name: 'Customer Directory', count: customers.length, sourceModule: 'customers' }],
      };
    }

    case 'getPaymentSummary': {
      if (!isAuthorized(PERMISSION_CODES.PAYMENTS_VIEW) && !isAuthorized(PERMISSION_CODES.REPORTS_FINANCE)) {
        return {
          toolName,
          data: { error: 'Permission Denied: Insufficient authorization to inspect payment inflow.' },
          summaryText: 'Security Notice: User lacks permission to query customer payment records.',
        };
      }
      const payments = await paymentRepository.getAllPayments();
      const posSales = await posRepository.getAllSales();

      const totalRecordedPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalPosSales = posSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

      return {
        toolName,
        data: {
          totalRecordedInflow: formatNaira(totalRecordedPayments + totalPosSales),
          invoicedPaymentsTotal: formatNaira(totalRecordedPayments),
          posCounterSalesTotal: formatNaira(totalPosSales),
          recentTransactionsCount: payments.length + posSales.length,
          recentPayments: payments.slice(0, 6).map((p) => ({
            id: p.id,
            amountFormatted: formatNaira(p.amount),
            paymentMethod: p.paymentMethod,
            paymentDate: p.paymentDate,
            customerName: sanitizeString(p.customerName || 'Customer'),
          })),
        },
        sources: [
          { name: 'Payment Receipts', count: payments.length, sourceModule: 'payments' },
          { name: 'POS Counter Ledger', count: posSales.length, sourceModule: 'pos' },
        ],
      };
    }

    case 'getExpenseSummary': {
      const expenses = await expenseRepository.getAll();
      const statusFilter = args.status;

      let filtered = expenses;
      if (statusFilter && statusFilter !== 'all') {
        filtered = expenses.filter((e) => e.status === statusFilter);
      }

      const pending = expenses.filter((e) => e.status === 'pending');

      const byCategory: Record<string, number> = {};
      expenses.forEach((e) => {
        byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
      });

      return {
        toolName,
        data: {
          totalExpensesCount: expenses.length,
          totalExpenditureAmount: formatNaira(expenses.reduce((sum, e) => sum + e.amount, 0)),
          pendingApprovalCount: pending.length,
          pendingApprovalAmount: formatNaira(pending.reduce((sum, e) => sum + e.amount, 0)),
          breakdownByCategory: Object.entries(byCategory).map(([cat, amt]) => ({
            category: cat,
            totalFormatted: formatNaira(amt),
          })),
          pendingList: pending.map((e) => ({
            id: e.id,
            expenseNumber: e.expenseNumber,
            title: sanitizeString(e.title),
            amount: formatNaira(e.amount),
            category: e.category,
            recordedByName: sanitizeString(e.recordedByName),
            expenseDate: e.dateIncurred,
          })),
        },
        sources: [{ name: 'Operating Expenses', count: expenses.length, sourceModule: 'expenses' }],
      };
    }

    case 'getSupplierSummary': {
      const suppliers = await supplierRepository.getAll();
      const activeSuppliers = suppliers.filter((s) => s.status === 'active');

      return {
        toolName,
        data: {
          totalSuppliers: suppliers.length,
          activeSuppliersCount: activeSuppliers.length,
          suppliers: activeSuppliers.map((s) => ({
            id: s.id,
            supplierNumber: s.supplierNumber,
            name: sanitizeString(s.name),
            category: s.category,
            contactPerson: sanitizeString(s.contactPerson),
            suppliedItems: s.suppliedItems,
            leadTimeDays: s.leadTimeDays,
          })),
        },
        sources: [{ name: 'Supplier Management', count: suppliers.length, sourceModule: 'suppliers' }],
      };
    }

    case 'getSalesReport': {
      const p = (args.period || 'this_month') as ReportDateRangeType;
      const range = reportService.getDateRange(p);
      const metrics = await reportService.getSalesReport(range);

      return {
        toolName,
        data: {
          periodScope: range.label,
          startDate: range.startDate,
          endDate: range.endDate,
          totalSalesFormatted: formatNaira(metrics.totalSales),
          ordersRevenueFormatted: formatNaira(metrics.ordersRevenue),
          posCounterSalesFormatted: formatNaira(metrics.posCounterRevenue),
          ordersCount: metrics.ordersCount,
          averageOrderValueFormatted: formatNaira(metrics.averageOrderValue),
          recordedCollectionsFormatted: formatNaira(metrics.recordedCollections),
          topProducts: metrics.salesByProduct.slice(0, 5).map((p) => ({
            productName: p.productName,
            variantName: p.variantName || 'Standard',
            unitsSold: p.unitsSold,
            salesValue: formatNaira(p.totalSalesValue),
            currentStock: p.currentStock,
          })),
        },
        sources: [
          { name: `Module 20 Sales Report (${range.label})`, count: metrics.ordersCount, sourceModule: 'reports' },
        ],
      };
    }

    case 'getExecutiveOverviewReport': {
      const p = (args.period || 'this_month') as ReportDateRangeType;
      const range = reportService.getDateRange(p);
      const overview = await reportService.getExecutiveDashboardSummary(range);

      return {
        toolName,
        data: {
          periodScope: range.label,
          totalSales: formatNaira(overview.sales.totalSales),
          salesToday: formatNaira(overview.sales.salesToday),
          salesThisWeek: formatNaira(overview.sales.salesThisWeek),
          salesThisMonth: formatNaira(overview.sales.salesThisMonth),
          ordersCount: overview.sales.ordersCount,
          averageOrderValue: formatNaira(overview.sales.averageOrderValue),
          yardValuation: formatNaira(overview.inventory.valuation),
          lowStockCount: overview.inventory.lowStockCount,
          outOfStockCount: overview.inventory.outOfStockCount,
          activeSiteJobs: overview.operations.activeSiteJobs,
          pendingInspectionCount: overview.operations.jobsAwaitingInspection,
          recordedIncome: formatNaira(overview.finance.recordedIncome),
          recordedExpenses: formatNaira(overview.finance.recordedExpenses),
          netRecordedMovement: formatNaira(overview.finance.netRecordedMovement),
          attentionItems: overview.attentionItems.map((a) => ({
            module: a.module,
            title: a.title,
            severity: a.severity,
          })),
        },
        sources: [
          { name: `Module 20 Executive Dashboard Summary (${range.label})`, sourceModule: 'reports' },
        ],
      };
    }

    case 'getAuditLogs': {
      const result = await auditService.getAuditLogs(
        {
          dateRange: 'all',
          action: (args.action as any) || 'all',
          entityType: (args.entityType as any) || 'all',
          searchQuery: args.searchQuery,
        },
        { page: 1, pageSize: 15 }
      );

      return {
        toolName,
        data: {
          totalEvents: result.total,
          recordsReturned: result.items.length,
          events: result.items.map((log) => ({
            id: log.id,
            timestamp: log.timestamp,
            action: log.action,
            entityType: log.entityType,
            entityReference: log.entityReference || log.entityId,
            actor: log.actorUserName || log.actorUserEmail || 'System',
            actorRole: log.actorUserRole,
            reason: log.reason,
            status: log.status,
            narrative: auditService.generateTimelineNarrative(log),
          })),
        },
        sources: [
          { name: 'Immutable Audit Log Repository', count: result.total, sourceModule: 'audit-logs' },
        ],
      };
    }

    case 'proposeServiceCompletion': {
      const { serviceJobId, completionNotes } = args;
      const jobs = await installationRepository.getAll();
      const targetJob = jobs.find(
        (j) => j.id === serviceJobId || j.jobReference.toLowerCase() === serviceJobId.toLowerCase()
      );

      if (!targetJob) {
        return {
          toolName,
          data: { error: `Service Job "${serviceJobId}" not found in installation registry.` },
        };
      }

      return {
        toolName,
        data: {
          status: 'PROPOSAL_GENERATED',
          message: `Confirmation required to mark Job #${targetJob.jobReference} (${targetJob.serviceTypeLabel}) as Completed.`,
          serviceJob: {
            id: targetJob.id,
            serviceNumber: targetJob.jobReference,
            title: targetJob.serviceTypeLabel,
            currentStatus: targetJob.status,
          },
        },
        proposedAction: {
          actionType: 'complete_service',
          title: `Mark Service Job #${targetJob.jobReference} as Completed`,
          description: `Confirm completion of "${targetJob.serviceTypeLabel}" at ${targetJob.siteAddress}. Notes: ${sanitizeString(completionNotes || 'Final inspection passed')}`,
          targetEntityId: targetJob.id,
          targetEntityType: 'installation',
          payload: {
            serviceId: targetJob.id,
            notes: sanitizeString(completionNotes || 'Completed via Manager AI confirmation'),
          },
        },
      };
    }

    case 'proposeExpenseApproval': {
      const { expenseId, notes } = args;
      const expenses = await expenseRepository.getAll();
      const targetExpense = expenses.find(
        (e) => e.id === expenseId || e.expenseNumber.toLowerCase() === expenseId.toLowerCase()
      );

      if (!targetExpense) {
        return {
          toolName,
          data: { error: `Expense record "${expenseId}" not found.` },
        };
      }

      return {
        toolName,
        data: {
          status: 'PROPOSAL_GENERATED',
          message: `Confirmation required to approve Expense #${targetExpense.expenseNumber} (${formatNaira(targetExpense.amount)} for ${targetExpense.title}).`,
          expense: {
            id: targetExpense.id,
            expenseNumber: targetExpense.expenseNumber,
            title: targetExpense.title,
            amount: formatNaira(targetExpense.amount),
            status: targetExpense.status,
          },
        },
        proposedAction: {
          actionType: 'approve_expense',
          title: `Approve Expense #${targetExpense.expenseNumber} (${formatNaira(targetExpense.amount)})`,
          description: `Authorizing disbursement for "${targetExpense.title}" (Recorded by: ${targetExpense.recordedByName}). ${notes ? `Notes: ${sanitizeString(notes)}` : ''}`,
          targetEntityId: targetExpense.id,
          targetEntityType: 'expense',
          payload: {
            expenseId: targetExpense.id,
            notes: sanitizeString(notes || 'Approved via Manager AI confirmation'),
          },
        },
      };
    }

    default:
      return {
        toolName,
        data: { error: `Unknown tool "${toolName}".` },
      };
  }
}
