/**
 * Expenses & Basic Finance Management Panel
 * Module 17 — Staff, Suppliers, Expenses & Basic Finance
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Central operational cost ledger, receipt attachment viewer,
 * managerial approval pipeline, and high-level gross margin summaries.
 */

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Edit,
  DollarSign,
  ShieldCheck,
  Calendar,
  FileSpreadsheet,
  PieChart,
  RefreshCw,
  Building2,
} from 'lucide-react';
import {
  BusinessExpense,
  ExpenseFilters,
  ExpenseCategory,
  ExpenseStatus,
  ExpensePaymentMethod,
  BasicFinanceSummary,
} from '../../types/expense';
import { expenseService } from '../../services/expense.service';
import { financeService, FinanceTimeframe } from '../../services/finance.service';
import { DEFAULT_EXPENSE_CATEGORIES } from '../../repositories/expense.repository';
import { useAuth } from '../../hooks/useAuth';
import { PERMISSION_CODES } from '../../types/auth';
import { useToast } from '../ui/Toast';
import { FinanceSummaryCards } from './FinanceSummaryCards';
import { ExpenseDetailModal } from './ExpenseDetailModal';
import { CreateExpenseModal } from './CreateExpenseModal';
import { EditExpenseModal } from './EditExpenseModal';
import { ApproveExpenseModal } from './ApproveExpenseModal';

export const ExpenseManagementPanel: React.FC = () => {
  const { hasPermission, isAdministrator, profile } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'ledger' | 'finance' | 'approvals'>('ledger');
  const [timeframe, setTimeframe] = useState<FinanceTimeframe>('all');

  const [expenses, setExpenses] = useState<BusinessExpense[]>([]);
  const [financeSummary, setFinanceSummary] = useState<BasicFinanceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | 'all'>('all');
  const [methodFilter, setMethodFilter] = useState<ExpensePaymentMethod | 'all'>('all');

  // Modals state
  const [selectedExpense, setSelectedExpense] = useState<BusinessExpense | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);

  const canCreate =
    isAdministrator() ||
    hasPermission(PERMISSION_CODES.EXPENSES_CREATE) ||
    hasPermission(PERMISSION_CODES.EXPENSES_MANAGE);
  const canApprove =
    isAdministrator() ||
    hasPermission(PERMISSION_CODES.EXPENSES_APPROVE) ||
    hasPermission(PERMISSION_CODES.EXPENSES_MANAGE);

  const loadData = async () => {
    try {
      setIsLoading(true);

      const filters: ExpenseFilters = {
        searchQuery: searchQuery.trim() || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        status:
          activeTab === 'approvals'
            ? 'pending'
            : statusFilter !== 'all'
            ? statusFilter
            : undefined,
        paymentMethod: methodFilter !== 'all' ? methodFilter : undefined,
      };

      const [expList, summaryData] = await Promise.all([
        expenseService.getAllExpenses(filters),
        financeService.getFinanceSummary(timeframe),
      ]);

      setExpenses(expList);
      setFinanceSummary(summaryData);
    } catch (err: any) {
      toast.error('Error', 'Failed to load expense records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, categoryFilter, statusFilter, methodFilter, activeTab, timeframe]);

  const handleExportExpensesCSV = () => {
    const csv = expenseService.exportExpensesToCSV(expenses);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `xforce_expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Export Complete', 'Expenses ledger downloaded as CSV.');
  };

  const handleExportFinanceCSV = () => {
    if (!financeSummary) return;
    const csv = financeService.exportFinancialReportToCSV(financeSummary);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `xforce_finance_summary_${timeframe}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Export Complete', 'Financial report exported.');
  };

  const handleMarkPaid = async (exp: BusinessExpense) => {
    if (!profile) return;
    try {
      await expenseService.markAsPaid(exp.id, {
        id: profile.id,
        fullName: profile.full_name || 'Cashier',
      });
      toast.success('Voucher Settled', `Disbursed and marked ${exp.expenseNumber} as paid.`);
      loadData();
    } catch (err: any) {
      toast.error('Action Failed', err.message || 'Could not mark expense as paid.');
    }
  };

  const pendingCount = financeSummary?.pendingApprovalsCount ?? 0;

  return (
    <div className="space-y-6">
      {/* Finance Overview KPI Cards */}
      <FinanceSummaryCards summary={financeSummary} isLoading={isLoading} />

      {/* Tabs & Top Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'ledger'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            Expenses Ledger
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('approvals')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'approvals'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <span>Pending Approvals</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('finance')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'finance'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            Financial Breakdown & Reports
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Timeframe Selector */}
          <div className="flex items-center gap-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as FinanceTimeframe)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="this_quarter">This Quarter</option>
            </select>
          </div>

          {activeTab === 'finance' ? (
            <button
              type="button"
              onClick={handleExportFinanceCSV}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5" /> Export Report CSV
            </button>
          ) : (
            <button
              type="button"
              onClick={handleExportExpensesCSV}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5" /> Export Ledger CSV
            </button>
          )}

          {canCreate && (
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition shadow-sm"
            >
              <Plus className="w-4 h-4" /> Record Expense
            </button>
          )}
        </div>
      </div>

      {activeTab === 'finance' ? (
        /* Financial Summary & Breakdown Tab */
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PieChart className="w-5 h-5 text-orange-600" />
              Executive Financial Statement & Cash Balances
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Timeframe: <span className="font-semibold">{financeSummary?.timeframeLabel}</span> •
              Revenues reconciled against approved operating cost outflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Revenue Inflow breakdown */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Gross Inflow Streams
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Client Orders & Commercial Invoices
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    ₦{(financeSummary?.totalOrdersRevenue ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    POS Sales Counter Walk-in Receipts
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    ₦{(financeSummary?.totalPosRevenue ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  <span>TOTAL GROSS INFLOWS:</span>
                  <span>₦{(financeSummary?.totalGrossRevenue ?? 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Outflow by Payment Method */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Outflows by Settlement Method
              </h4>
              <div className="space-y-2 text-xs">
                {financeSummary?.paymentMethodBreakdown.map((pm) => (
                  <div
                    key={pm.method}
                    className="flex items-center justify-between p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                  >
                    <span className="text-slate-700 dark:text-slate-300">
                      {pm.label} ({pm.count} vouchers)
                    </span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                      ₦{pm.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between font-bold text-rose-600 dark:text-rose-400 text-sm">
                  <span>TOTAL OUTFLOWS:</span>
                  <span>₦{(financeSummary?.totalApprovedExpenses ?? 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Ledger or Approvals Tab */
        <>
          {/* Search and Filters */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="lg:col-span-2 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by purpose, voucher number, payee, receipt ref..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              {/* Category */}
              <div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as ExpenseCategory | 'all')}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="all">All Cost Categories</option>
                  {DEFAULT_EXPENSE_CATEGORIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status (hidden on approvals tab) */}
              {activeTab !== 'approvals' ? (
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as ExpenseStatus | 'all')}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="all">All Voucher States</option>
                    <option value="pending">Pending Approval</option>
                    <option value="approved">Approved</option>
                    <option value="paid">Disbursed & Paid</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              ) : (
                <div>
                  <select
                    value={methodFilter}
                    onChange={(e) => setMethodFilter(e.target.value as ExpensePaymentMethod | 'all')}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="all">All Payment Channels</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Counter Cash</option>
                    <option value="card_pos">POS / Card</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Expenses Table */}
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-orange-600" />
              <p className="text-xs">Loading expenditure ledgers...</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <CreditCard className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {activeTab === 'approvals'
                  ? 'No pending vouchers awaiting review'
                  : 'No expense records found'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {activeTab === 'approvals'
                  ? 'All operating expenses have been reviewed by management.'
                  : 'Record a new operating expense voucher to start tracking.'}
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Voucher</th>
                      <th className="py-3 px-4">Category & Purpose</th>
                      <th className="py-3 px-4">Beneficiary</th>
                      <th className="py-3 px-4">Amount (NGN)</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {expenses.map((e) => (
                      <tr
                        key={e.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                      >
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                            {e.expenseNumber}
                          </span>
                          {e.receiptReference && (
                            <p className="text-[10px] text-slate-400 font-mono">
                              Ref: {e.receiptReference}
                            </p>
                          )}
                        </td>

                        <td className="py-3 px-4 max-w-xs">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">
                            {e.title}
                          </p>
                          <span className="text-[11px] text-slate-400 capitalize">
                            {e.category.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            {e.payeeName}
                          </p>
                          <span className="text-[10px] text-slate-400 capitalize">
                            {e.payeeType.replace('_', ' ')} • {e.paymentMethod.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                            ₦{e.amount.toLocaleString()}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="text-slate-600 dark:text-slate-300 font-medium">
                            {e.dateIncurred}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {e.status === 'paid' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              Paid
                            </span>
                          ) : e.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                              <ShieldCheck className="w-3 h-3 text-blue-500" />
                              Approved
                            </span>
                          ) : e.status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                              <AlertTriangle className="w-3 h-3 text-rose-500" />
                              Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              <Clock className="w-3 h-3 text-amber-500" />
                              Pending
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {e.status === 'pending' && canApprove && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedExpense(e);
                                  setApproveModalOpen(true);
                                }}
                                className="px-2 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition shadow-sm"
                                title="Approve or Reject"
                              >
                                Review
                              </button>
                            )}

                            {e.status === 'approved' && canApprove && (
                              <button
                                type="button"
                                onClick={() => handleMarkPaid(e)}
                                className="px-2 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition shadow-sm"
                                title="Disburse and mark as paid"
                              >
                                Disburse
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedExpense(e);
                                setDetailModalOpen(true);
                              }}
                              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
                              title="View Voucher"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {e.status !== 'paid' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedExpense(e);
                                  setEditModalOpen(true);
                                }}
                                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-orange-600"
                                title="Edit"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <ExpenseDetailModal
        expense={selectedExpense}
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedExpense(null);
        }}
        onEdit={(exp) => {
          setSelectedExpense(exp);
          setEditModalOpen(true);
        }}
        onApproveReject={(exp) => {
          setSelectedExpense(exp);
          setApproveModalOpen(true);
        }}
        onMarkPaid={(exp) => {
          handleMarkPaid(exp);
          setDetailModalOpen(false);
        }}
      />

      <CreateExpenseModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={loadData}
      />

      <EditExpenseModal
        expense={selectedExpense}
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedExpense(null);
        }}
        onSuccess={loadData}
      />

      <ApproveExpenseModal
        expense={selectedExpense}
        isOpen={approveModalOpen}
        onClose={() => {
          setApproveModalOpen(false);
          setSelectedExpense(null);
        }}
        onSuccess={loadData}
      />
    </div>
  );
};
