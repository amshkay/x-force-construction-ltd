/**
 * Basic Finance & Operating Cash Flow Service
 * Module 17 — Staff, Suppliers, Expenses & Basic Finance
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Integrates revenue streams (Payments repository, POS counter sales)
 * with operating cost outflows (Approved/Paid expenses) to provide a clear,
 * pragmatic executive financial overview.
 */

import {
  BasicFinanceSummary,
  CategoryExpenseBreakdown,
  PaymentMethodBreakdown,
  ExpenseCategory,
  ExpensePaymentMethod,
} from '../types/expense';
import { expenseRepository, DEFAULT_EXPENSE_CATEGORIES } from '../repositories/expense.repository';
import { paymentRepository } from '../repositories/payment.repository';
import { posRepository } from '../repositories/pos.repository';

export type FinanceTimeframe =
  | 'all'
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'this_quarter';

export class FinanceService {
  /**
   * Calculates financial overview with timeframe filtering
   */
  async getFinanceSummary(timeframe: FinanceTimeframe = 'all'): Promise<BasicFinanceSummary> {
    const now = new Date();
    let startDate: string | null = null;
    let timeframeLabel = 'All Time';

    if (timeframe === 'today') {
      startDate = now.toISOString().split('T')[0];
      timeframeLabel = 'Today';
    } else if (timeframe === 'this_week') {
      const dayOfWeek = now.getDay();
      const diffToMonday = (dayOfWeek + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diffToMonday);
      startDate = monday.toISOString().split('T')[0];
      timeframeLabel = 'This Week';
    } else if (timeframe === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = firstDay.toISOString().split('T')[0];
      timeframeLabel = `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
    } else if (timeframe === 'this_quarter') {
      const currentQuarterMonth = Math.floor(now.getMonth() / 3) * 3;
      const firstQuarterDay = new Date(now.getFullYear(), currentQuarterMonth, 1);
      startDate = firstQuarterDay.toISOString().split('T')[0];
      timeframeLabel = `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`;
    }

    // 1. Fetch Expenses
    const allExpenses = await expenseRepository.getAll();
    const filteredExpenses = startDate
      ? allExpenses.filter((e) => e.dateIncurred >= startDate!)
      : allExpenses;

    const approvedOrPaidExpenses = filteredExpenses.filter(
      (e) => e.status === 'approved' || e.status === 'paid'
    );
    const pendingExpenses = filteredExpenses.filter((e) => e.status === 'pending');

    const totalApprovedExpenses = approvedOrPaidExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalPendingExpenses = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);

    // 2. Fetch Customer Order Payments
    let totalOrdersRevenue = 0;
    try {
      const payments = await paymentRepository.getAllPayments();
      const filteredPayments = startDate
        ? payments.filter((p) => p.paymentDate && p.paymentDate >= startDate!)
        : payments;
      totalOrdersRevenue = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    } catch {
      totalOrdersRevenue = 0;
    }

    // 3. Fetch POS Counter Sales Revenue
    let totalPosRevenue = 0;
    try {
      const posSales = await posRepository.getAllSales();
      const filteredPos = startDate
        ? posSales.filter((s) => s.createdAt && s.createdAt.split('T')[0] >= startDate!)
        : posSales;
      totalPosRevenue = filteredPos
        .filter((s) => s.status === 'completed')
        .reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    } catch {
      totalPosRevenue = 0;
    }

    const totalGrossRevenue = totalOrdersRevenue + totalPosRevenue;
    const netOperatingCashBalance = totalGrossRevenue - totalApprovedExpenses;

    // 4. Category breakdown
    const categoryMap = new Map<ExpenseCategory, { amount: number; count: number }>();
    approvedOrPaidExpenses.forEach((e) => {
      const curr = categoryMap.get(e.category) || { amount: 0, count: 0 };
      categoryMap.set(e.category, {
        amount: curr.amount + e.amount,
        count: curr.count + 1,
      });
    });

    const categoryBreakdown: CategoryExpenseBreakdown[] = DEFAULT_EXPENSE_CATEGORIES.map((cat) => {
      const data = categoryMap.get(cat.code) || { amount: 0, count: 0 };
      const percentage =
        totalApprovedExpenses > 0 ? (data.amount / totalApprovedExpenses) * 100 : 0;
      return {
        category: cat.code,
        label: cat.label,
        amount: data.amount,
        percentage: Math.round(percentage * 10) / 10,
        count: data.count,
      };
    }).filter((c) => c.amount > 0 || c.count > 0);

    // Sort categories descending by amount
    categoryBreakdown.sort((a, b) => b.amount - a.amount);

    // 5. Payment method breakdown
    const paymentMap = new Map<ExpensePaymentMethod, { amount: number; count: number }>();
    approvedOrPaidExpenses.forEach((e) => {
      const curr = paymentMap.get(e.paymentMethod) || { amount: 0, count: 0 };
      paymentMap.set(e.paymentMethod, {
        amount: curr.amount + e.amount,
        count: curr.count + 1,
      });
    });

    const paymentMethodLabels: Record<ExpensePaymentMethod, string> = {
      bank_transfer: 'Bank Transfer',
      cash: 'Cash on Counter',
      card_pos: 'Card / POS Terminal',
      cheque: 'Corporate Cheque',
      other: 'Other Method',
    };

    const paymentMethodBreakdown: PaymentMethodBreakdown[] = Array.from(paymentMap.entries()).map(
      ([method, data]) => ({
        method,
        label: paymentMethodLabels[method] || method,
        amount: data.amount,
        count: data.count,
      })
    );

    return {
      totalGrossRevenue,
      totalApprovedExpenses,
      totalPendingExpenses,
      netOperatingCashBalance,
      totalOrdersRevenue,
      totalPosRevenue,
      totalExpensesCount: filteredExpenses.length,
      pendingApprovalsCount: pendingExpenses.length,
      categoryBreakdown,
      paymentMethodBreakdown,
      timeframeLabel,
      generatedAt: now.toISOString(),
    };
  }

  /**
   * Exports high-level financial performance report to CSV
   */
  exportFinancialReportToCSV(summary: BasicFinanceSummary): string {
    const lines: string[] = [];

    lines.push(`XFORCE CONSTRUCTION LTD — FINANCIAL SUMMARY REPORT`);
    lines.push(`Timeframe: ${summary.timeframeLabel}`);
    lines.push(`Generated: ${new Date(summary.generatedAt).toLocaleString()}`);
    lines.push(``);
    lines.push(`METRIC,AMOUNT (NGN)`);
    lines.push(`Total Inflows (Orders Revenue),${summary.totalOrdersRevenue}`);
    lines.push(`Total Inflows (POS Counter Sales),${summary.totalPosRevenue}`);
    lines.push(`TOTAL GROSS REVENUE,${summary.totalGrossRevenue}`);
    lines.push(`TOTAL APPROVED & PAID EXPENSES,${summary.totalApprovedExpenses}`);
    lines.push(`NET OPERATING CASH BALANCE,${summary.netOperatingCashBalance}`);
    lines.push(`PENDING EXPENSE COMMITMENTS,${summary.totalPendingExpenses}`);
    lines.push(``);
    lines.push(`EXPENSE BREAKDOWN BY CATEGORY`);
    lines.push(`Category,Amount (NGN),Percentage (%),Count`);
    summary.categoryBreakdown.forEach((c) => {
      lines.push(`"${c.label}",${c.amount},${c.percentage}%,${c.count}`);
    });
    lines.push(``);
    lines.push(`EXPENSE BREAKDOWN BY PAYMENT METHOD`);
    lines.push(`Payment Method,Amount (NGN),Count`);
    summary.paymentMethodBreakdown.forEach((p) => {
      lines.push(`"${p.label}",${p.amount},${p.count}`);
    });

    return lines.join('\n');
  }
}

export const financeService = new FinanceService();
