/**
 * Business Expense Service
 * Module 17 — Staff, Suppliers, Expenses & Basic Finance
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Handles recording operational expenses, receipt voucher attachments,
 * managerial sign-offs, and CSV exports.
 */

import {
  BusinessExpense,
  ExpenseFilters,
  CreateExpenseDTO,
  UpdateExpenseDTO,
  ApproveExpenseDTO,
} from '../types/expense';
import { expenseRepository } from '../repositories/expense.repository';
import { auditService } from './audit.service';

export class ExpenseService {
  async getAllExpenses(filters?: ExpenseFilters): Promise<BusinessExpense[]> {
    if (filters) {
      return expenseRepository.filter(filters);
    }
    return expenseRepository.getAll();
  }

  async getExpenseById(id: string): Promise<BusinessExpense | null> {
    return expenseRepository.getById(id);
  }

  async getExpenseByNumber(number: string): Promise<BusinessExpense | null> {
    return expenseRepository.getByExpenseNumber(number);
  }

  async createExpense(
    dto: CreateExpenseDTO,
    user: { id: string; fullName: string }
  ): Promise<BusinessExpense> {
    if (!dto.title || !dto.title.trim()) {
      throw new Error('Expense title/description is required.');
    }
    if (!dto.amount || dto.amount <= 0) {
      throw new Error('Expense amount must be greater than zero.');
    }
    if (!dto.payeeName || !dto.payeeName.trim()) {
      throw new Error('Payee or vendor name is required.');
    }

    const created = await expenseRepository.create(dto, user.id, user.fullName);

    auditService.logEvent({
      action: 'expense.created',
      entity_type: 'expense',
      entity_id: created.id,
      user_id: user.id,
      reason: `Recorded expense voucher: ${created.expenseNumber} (₦${created.amount.toLocaleString()} - ${created.title})`,
      new_values: {
        expenseNumber: created.expenseNumber,
        amount: created.amount,
        category: created.category,
        payeeName: created.payeeName,
        paymentMethod: created.paymentMethod,
      },
    });

    return created;
  }

  async updateExpense(
    id: string,
    dto: UpdateExpenseDTO,
    user: { id: string; fullName: string }
  ): Promise<BusinessExpense> {
    const existing = await expenseRepository.getById(id);
    if (!existing) {
      throw new Error(`Expense with ID "${id}" not found.`);
    }

    if (existing.status === 'paid') {
      throw new Error('Cannot edit an expense that has already been marked as paid.');
    }

    const updated = await expenseRepository.update(id, dto);

    auditService.logEvent({
      action: 'expense.updated',
      entity_type: 'expense',
      entity_id: id,
      user_id: user.id,
      reason: `Updated expense voucher ${updated.expenseNumber}`,
      new_values: {
        amount: updated.amount,
        category: updated.category,
        title: updated.title,
      },
    });

    return updated;
  }

  async approveOrRejectExpense(
    id: string,
    dto: ApproveExpenseDTO,
    user: { id: string; fullName: string }
  ): Promise<BusinessExpense> {
    const updated = await expenseRepository.approveOrReject(id, dto, user.id, user.fullName);

    auditService.logEvent({
      action: dto.approved ? 'expense.approved' : 'expense.rejected',
      entity_type: 'expense',
      entity_id: id,
      user_id: user.id,
      reason: dto.approved
        ? `Approved expense voucher ${updated.expenseNumber} for ₦${updated.amount.toLocaleString()}`
        : `Rejected expense voucher ${updated.expenseNumber}: ${dto.rejectionReason || 'No reason provided'}`,
      new_values: { status: updated.status, approvedBy: user.fullName },
    });

    return updated;
  }

  async markAsPaid(id: string, user: { id: string; fullName: string }): Promise<BusinessExpense> {
    const updated = await expenseRepository.markAsPaid(id);

    auditService.logEvent({
      action: 'expense.paid',
      entity_type: 'expense',
      entity_id: id,
      user_id: user.id,
      reason: `Disbursed and marked as paid: ${updated.expenseNumber} (₦${updated.amount.toLocaleString()})`,
      new_values: { status: 'paid' },
    });

    return updated;
  }

  async deleteExpense(id: string, user: { id: string; fullName: string }): Promise<boolean> {
    const existing = await expenseRepository.getById(id);
    if (!existing) return false;

    if (existing.status === 'paid') {
      throw new Error('Cannot delete a finalized, paid expense voucher.');
    }

    const success = await expenseRepository.delete(id);
    if (success) {
      auditService.logEvent({
        action: 'expense.deleted',
        entity_type: 'expense',
        entity_id: id,
        user_id: user.id,
        reason: `Deleted expense voucher ${existing.expenseNumber}`,
      });
    }

    return success;
  }

  /**
   * Generates a downloadable CSV string of expenses
   */
  exportExpensesToCSV(expenses: BusinessExpense[]): string {
    const headers = [
      'Voucher Number',
      'Title',
      'Category',
      'Amount (NGN)',
      'Date Incurred',
      'Payment Method',
      'Payee Name',
      'Payee Type',
      'Status',
      'Receipt Reference',
      'Recorded By',
      'Approved By',
      'Notes',
    ];

    const rows = expenses.map((e) => [
      e.expenseNumber,
      `"${e.title.replace(/"/g, '""')}"`,
      e.category,
      e.amount,
      e.dateIncurred,
      e.paymentMethod,
      `"${e.payeeName.replace(/"/g, '""')}"`,
      e.payeeType,
      e.status,
      e.receiptReference || '',
      `"${e.recordedByName.replace(/"/g, '""')}"`,
      e.approvedByName || '',
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

export const expenseService = new ExpenseService();
