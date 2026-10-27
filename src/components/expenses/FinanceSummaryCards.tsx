/**
 * Basic Finance Summary Cards
 * Module 17 — Staff, Suppliers, Expenses & Basic Finance
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Executive KPI cards and category distribution breakdown displaying
 * Gross Revenue Inflows, Operating Expense Outflows, and Net Operating Balance.
 */

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Clock,
  PieChart,
  ShoppingBag,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { BasicFinanceSummary } from '../../types/expense';

interface FinanceSummaryCardsProps {
  summary: BasicFinanceSummary | null;
  isLoading: boolean;
}

export const FinanceSummaryCards: React.FC<FinanceSummaryCardsProps> = ({ summary, isLoading }) => {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
          />
        ))}
      </div>
    );
  }

  const isNetPositive = summary.netOperatingCashBalance >= 0;

  return (
    <div className="space-y-6">
      {/* 4 Primary Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inflows / Gross Revenue */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Inflows (Revenue)
            </span>
            <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              ₦{summary.totalGrossRevenue.toLocaleString()}
            </p>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
              <span>Orders: ₦{summary.totalOrdersRevenue.toLocaleString()}</span>
              <span>•</span>
              <span>POS: ₦{summary.totalPosRevenue.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Total Operating Expenses */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Operating Outflows
            </span>
            <div className="p-2.5 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
              ₦{summary.totalApprovedExpenses.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Approved & paid vouchers</p>
          </div>
        </div>

        {/* Net Operating Balance */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Net Operating Balance
            </span>
            <div
              className={`p-2.5 rounded-lg ${
                isNetPositive
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
                  : 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
              }`}
            >
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p
              className={`text-2xl font-black tracking-tight ${
                isNetPositive ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              ₦{summary.netOperatingCashBalance.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              {isNetPositive ? (
                <>
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Positive Operating Spread</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                  <span>Negative Operating Spread</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Pending Commitments */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pending Approvals
            </span>
            <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
              ₦{summary.totalPendingExpenses.toLocaleString()}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {summary.pendingApprovalsCount} voucher(s) awaiting managerial review
            </p>
          </div>
        </div>
      </div>

      {/* Expense Categories Distribution Visual Breakdown */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-orange-600" />
              Expenditure Breakdown by Cost Category
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Relative distribution of operating outflows for {summary.timeframeLabel}
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Total Outflows: ₦{summary.totalApprovedExpenses.toLocaleString()}
          </span>
        </div>

        {summary.categoryBreakdown.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4 text-center">
            No approved expenses recorded in this period.
          </p>
        ) : (
          <div className="space-y-3">
            {summary.categoryBreakdown.map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span>{cat.label}</span>
                    <span className="text-slate-400 text-[11px]">({cat.count} vouchers)</span>
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      ₦{cat.amount.toLocaleString()}
                    </span>
                    <span className="font-mono text-orange-600 dark:text-orange-400 w-12 text-right font-bold">
                      {cat.percentage}%
                    </span>
                  </div>
                </div>
                {/* Visual Progress Bar */}
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
