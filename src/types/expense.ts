/**
 * Business Expenses & Basic Finance Types
 * Module 17 — Staff, Suppliers, Expenses & Basic Finance
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Handles recording operational expenses, receipt vouchers, managerial approvals,
 * and high-level cash balance and expense category summaries.
 */

export type ExpenseCategory =
  | 'raw_materials'
  | 'logistics_haulage'
  | 'plant_maintenance'
  | 'fuel_utilities'
  | 'installation_tools'
  | 'safety_ppe'
  | 'office_admin'
  | 'marketing_sales'
  | 'staff_welfare'
  | 'other';

export type ExpenseStatus = 'pending' | 'approved' | 'paid' | 'rejected';

export type ExpensePaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'card_pos'
  | 'cheque'
  | 'other';

export type ExpensePayeeType =
  | 'supplier'
  | 'service_provider'
  | 'staff'
  | 'external_vendor';

export interface ExpenseCategoryDefinition {
  code: ExpenseCategory;
  label: string;
  description: string;
}

export interface BusinessExpense {
  id: string; // UUID
  expenseNumber: string; // e.g. EXP-2026-0001
  title: string;
  description?: string;
  category: ExpenseCategory;
  amount: number; // in NGN ₦
  currency: string; // 'NGN'
  dateIncurred: string; // YYYY-MM-DD
  paymentMethod: ExpensePaymentMethod;
  payeeType: ExpensePayeeType;
  payeeName: string;
  payeeId?: string; // Optional reference to Supplier UUID, Service Provider UUID, or Staff UUID
  receiptReference?: string; // Invoice / Receipt Number from vendor
  receiptAttachmentUrl?: string; // Public URL from media service upload
  receiptFileName?: string;
  recordedByUserId: string;
  recordedByName: string;
  status: ExpenseStatus;
  approvedByUserId?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseFilters {
  searchQuery?: string;
  category?: ExpenseCategory | 'all';
  status?: ExpenseStatus | 'all';
  paymentMethod?: ExpensePaymentMethod | 'all';
  payeeType?: ExpensePayeeType | 'all';
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: 'expenseNumber' | 'dateIncurred' | 'amount' | 'category' | 'status' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateExpenseDTO {
  title: string;
  description?: string;
  category: ExpenseCategory;
  amount: number;
  dateIncurred: string;
  paymentMethod: ExpensePaymentMethod;
  payeeType: ExpensePayeeType;
  payeeName: string;
  payeeId?: string;
  receiptReference?: string;
  receiptAttachmentUrl?: string;
  receiptFileName?: string;
  notes?: string;
}

export interface UpdateExpenseDTO {
  title?: string;
  description?: string;
  category?: ExpenseCategory;
  amount?: number;
  dateIncurred?: string;
  paymentMethod?: ExpensePaymentMethod;
  payeeType?: ExpensePayeeType;
  payeeName?: string;
  payeeId?: string;
  receiptReference?: string;
  receiptAttachmentUrl?: string;
  receiptFileName?: string;
  notes?: string;
}

export interface ApproveExpenseDTO {
  approved: boolean;
  notes?: string;
  rejectionReason?: string;
}

export interface CategoryExpenseBreakdown {
  category: ExpenseCategory;
  label: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface PaymentMethodBreakdown {
  method: ExpensePaymentMethod;
  label: string;
  amount: number;
  count: number;
}

export interface BasicFinanceSummary {
  totalGrossRevenue: number; // Sum of confirmed order payments & POS sales
  totalApprovedExpenses: number; // Sum of approved and paid expenses
  totalPendingExpenses: number; // Sum of pending expenses
  netOperatingCashBalance: number; // totalGrossRevenue - totalApprovedExpenses
  totalOrdersRevenue: number;
  totalPosRevenue: number;
  totalExpensesCount: number;
  pendingApprovalsCount: number;
  categoryBreakdown: CategoryExpenseBreakdown[];
  paymentMethodBreakdown: PaymentMethodBreakdown[];
  timeframeLabel: string;
  generatedAt: string;
}
