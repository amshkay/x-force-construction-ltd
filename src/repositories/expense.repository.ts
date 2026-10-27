/**
 * Business Expense Repository
 * Module 17 — Staff, Suppliers, Expenses & Basic Finance
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Provides persistent recording of operating expenses, receipt vouchers,
 * managerial approval states, and category ledgers.
 */

import {
  BusinessExpense,
  ExpenseFilters,
  CreateExpenseDTO,
  UpdateExpenseDTO,
  ApproveExpenseDTO,
  ExpenseStatus,
  ExpenseCategoryDefinition,
} from '../types/expense';
import { businessSettingsService } from '../services/settings.service';
import { localStore } from '../lib/storage/localStorage';

const EXPENSES_LOCAL_STORAGE_KEY = 'xforce_business_expenses_v1';

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategoryDefinition[] = [
  {
    code: 'raw_materials',
    label: 'Raw Materials & Production',
    description: 'Bulk cement, fine quarry dust, masonry sand, oxide pigments, and chemical admixtures.',
  },
  {
    code: 'fuel_utilities',
    label: 'Generator Fuel & Utilities',
    description: 'Diesel (AGO) for 150kVA plant generators, electricity bills, and industrial water tankers.',
  },
  {
    code: 'plant_maintenance',
    label: 'Plant & Equipment Repairs',
    description: 'Hydraulic press servicing, mold refurbishment, conveyor rollers, and mixer maintenance.',
  },
  {
    code: 'logistics_haulage',
    label: 'Haulage & Vehicle Logistics',
    description: 'Third-party heavy tipper rentals, flatbed delivery truck fueling, and vehicle road taxes.',
  },
  {
    code: 'packaging',
    label: 'Crating & Palletizing Packaging',
    description: 'Heavy stretch film, polypropylene strapping bands, and wooden shipping pallets.',
  } as any,
  {
    code: 'installation_tools',
    label: 'Installation Tools & Masonry',
    description: 'Laser levels, rubber mallets, steel trowels, diamond cutting discs, and scaffolding rental.',
  },
  {
    code: 'safety_ppe',
    label: 'Site Safety & Worker PPE',
    description: 'Steel-toe boots, high-visibility reflector vests, dust respirators, and heavy gloves.',
  },
  {
    code: 'office_admin',
    label: 'Office & Administrative',
    description: 'Factory broadband internet, printing paper, stationeries, and corporate telecommunications.',
  },
  {
    code: 'marketing_sales',
    label: 'Marketing, Signage & Billboards',
    description: 'Showroom sample displays, branded road signs, project banner printing, and marketing flyers.',
  },
  {
    code: 'staff_welfare',
    label: 'Staff Welfare & Field Refreshments',
    description: 'Site drinking water, first-aid medical supplies, and factory worker break refreshments.',
  },
  {
    code: 'other',
    label: 'Miscellaneous Operational Expenses',
    description: 'Minor auxiliary disbursements, bank transfer charges, and council statutory fees.',
  },
];

const INITIAL_EXPENSES_SEED: BusinessExpense[] = [];

export class ExpenseRepository {
  private memoryExpenses: BusinessExpense[] | null = null;

  constructor() {
    const stored = localStore.get<BusinessExpense[] | null>(EXPENSES_LOCAL_STORAGE_KEY, null);
    if (stored && Array.isArray(stored) && stored.length > 0) {
      this.memoryExpenses = stored;
    } else {
      this.memoryExpenses = [...INITIAL_EXPENSES_SEED];
      localStore.set(EXPENSES_LOCAL_STORAGE_KEY, this.memoryExpenses);
    }
  }

  private save(expenses: BusinessExpense[]): void {
    this.memoryExpenses = expenses;
    localStore.set(EXPENSES_LOCAL_STORAGE_KEY, expenses);
  }

  /**
   * Generates a configurable sequence expense voucher number e.g. EXP-2026-0001
   */
  async generateExpenseNumber(): Promise<string> {
    const settings = await businessSettingsService.getBusinessSettings();
    const prefix = settings?.numbering?.defaultExpensePrefix || 'EXP';
    const year = new Date().getFullYear();

    const all = await this.getAll();
    const currentYearPrefix = `${prefix}-${year}-`;

    const matching = all
      .filter((e) => e.expenseNumber.startsWith(currentYearPrefix))
      .map((e) => {
        const numPart = e.expenseNumber.replace(currentYearPrefix, '');
        const val = parseInt(numPart, 10);
        return isNaN(val) ? 0 : val;
      });

    const nextSeq = matching.length > 0 ? Math.max(...matching) + 1 : all.length + 1;
    return `${currentYearPrefix}${String(nextSeq).padStart(4, '0')}`;
  }

  async getAll(): Promise<BusinessExpense[]> {
    if (!this.memoryExpenses) {
      const stored = localStore.get<BusinessExpense[] | null>(EXPENSES_LOCAL_STORAGE_KEY, null);
      this.memoryExpenses = stored && Array.isArray(stored) ? stored : [...INITIAL_EXPENSES_SEED];
    }
    return [...this.memoryExpenses];
  }

  async getById(id: string): Promise<BusinessExpense | null> {
    const all = await this.getAll();
    return all.find((e) => e.id === id) || null;
  }

  async getByExpenseNumber(number: string): Promise<BusinessExpense | null> {
    const all = await this.getAll();
    return all.find((e) => e.expenseNumber.toLowerCase() === number.toLowerCase().trim()) || null;
  }

  async filter(filters: ExpenseFilters): Promise<BusinessExpense[]> {
    let list = await this.getAll();

    if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
      const q = filters.searchQuery.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.expenseNumber.toLowerCase().includes(q) ||
          e.payeeName.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q)) ||
          (e.receiptReference && e.receiptReference.toLowerCase().includes(q)) ||
          e.recordedByName.toLowerCase().includes(q)
      );
    }

    if (filters.category && filters.category !== 'all') {
      list = list.filter((e) => e.category === filters.category);
    }

    if (filters.status && filters.status !== 'all') {
      list = list.filter((e) => e.status === filters.status);
    }

    if (filters.paymentMethod && filters.paymentMethod !== 'all') {
      list = list.filter((e) => e.paymentMethod === filters.paymentMethod);
    }

    if (filters.payeeType && filters.payeeType !== 'all') {
      list = list.filter((e) => e.payeeType === filters.payeeType);
    }

    if (filters.dateFrom) {
      list = list.filter((e) => e.dateIncurred >= filters.dateFrom!);
    }

    if (filters.dateTo) {
      list = list.filter((e) => e.dateIncurred <= filters.dateTo!);
    }

    if (filters.minAmount !== undefined) {
      list = list.filter((e) => e.amount >= filters.minAmount!);
    }

    if (filters.maxAmount !== undefined) {
      list = list.filter((e) => e.amount <= filters.maxAmount!);
    }

    const sortKey = filters.sortBy || 'dateIncurred';
    const sortOrder = filters.sortOrder || 'desc';

    list.sort((a, b) => {
      let valA: string | number = a[sortKey as keyof BusinessExpense] as string;
      let valB: string | number = b[sortKey as keyof BusinessExpense] as string;

      if (!valA) valA = '';
      if (!valB) valB = '';

      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB as string);
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      return sortOrder === 'asc'
        ? Number(valA) - Number(valB)
        : Number(valB) - Number(valA);
    });

    return list;
  }

  async create(
    dto: CreateExpenseDTO,
    recordedByUserId: string,
    recordedByName: string
  ): Promise<BusinessExpense> {
    const all = await this.getAll();
    const expenseNumber = await this.generateExpenseNumber();
    const now = new Date().toISOString();
    const newId = `exp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

    const newExpense: BusinessExpense = {
      id: newId,
      expenseNumber,
      title: dto.title.trim(),
      description: dto.description?.trim(),
      category: dto.category,
      amount: Math.abs(dto.amount),
      currency: 'NGN',
      dateIncurred: dto.dateIncurred || now.split('T')[0],
      paymentMethod: dto.paymentMethod,
      payeeType: dto.payeeType,
      payeeName: dto.payeeName.trim(),
      payeeId: dto.payeeId,
      receiptReference: dto.receiptReference?.trim(),
      receiptAttachmentUrl: dto.receiptAttachmentUrl,
      receiptFileName: dto.receiptFileName,
      recordedByUserId,
      recordedByName,
      status: 'pending',
      notes: dto.notes?.trim(),
      createdAt: now,
      updatedAt: now,
    };

    all.unshift(newExpense);
    this.save(all);
    return newExpense;
  }

  async update(id: string, dto: UpdateExpenseDTO): Promise<BusinessExpense> {
    const all = await this.getAll();
    const index = all.findIndex((e) => e.id === id);
    if (index === -1) {
      throw new Error(`Expense record with ID "${id}" not found.`);
    }

    const current = all[index];
    const updated: BusinessExpense = {
      ...current,
      title: dto.title !== undefined ? dto.title.trim() : current.title,
      description: dto.description !== undefined ? dto.description.trim() : current.description,
      category: dto.category !== undefined ? dto.category : current.category,
      amount: dto.amount !== undefined ? Math.abs(dto.amount) : current.amount,
      dateIncurred: dto.dateIncurred !== undefined ? dto.dateIncurred : current.dateIncurred,
      paymentMethod: dto.paymentMethod !== undefined ? dto.paymentMethod : current.paymentMethod,
      payeeType: dto.payeeType !== undefined ? dto.payeeType : current.payeeType,
      payeeName: dto.payeeName !== undefined ? dto.payeeName.trim() : current.payeeName,
      payeeId: dto.payeeId !== undefined ? dto.payeeId : current.payeeId,
      receiptReference: dto.receiptReference !== undefined ? dto.receiptReference.trim() : current.receiptReference,
      receiptAttachmentUrl: dto.receiptAttachmentUrl !== undefined ? dto.receiptAttachmentUrl : current.receiptAttachmentUrl,
      receiptFileName: dto.receiptFileName !== undefined ? dto.receiptFileName : current.receiptFileName,
      notes: dto.notes !== undefined ? dto.notes.trim() : current.notes,
      updatedAt: new Date().toISOString(),
    };

    all[index] = updated;
    this.save(all);
    return updated;
  }

  async approveOrReject(
    id: string,
    dto: ApproveExpenseDTO,
    approverUserId: string,
    approverName: string
  ): Promise<BusinessExpense> {
    const all = await this.getAll();
    const index = all.findIndex((e) => e.id === id);
    if (index === -1) {
      throw new Error(`Expense record with ID "${id}" not found.`);
    }

    const current = all[index];
    const now = new Date().toISOString();

    const updated: BusinessExpense = {
      ...current,
      status: dto.approved ? 'approved' : 'rejected',
      approvedByUserId: dto.approved ? approverUserId : undefined,
      approvedByName: dto.approved ? approverName : undefined,
      approvedAt: dto.approved ? now : undefined,
      rejectionReason: !dto.approved ? dto.rejectionReason || 'Rejected by management' : undefined,
      notes: dto.notes ? `${current.notes ? current.notes + '\n' : ''}${dto.notes}` : current.notes,
      updatedAt: now,
    };

    all[index] = updated;
    this.save(all);
    return updated;
  }

  async markAsPaid(id: string): Promise<BusinessExpense> {
    const all = await this.getAll();
    const index = all.findIndex((e) => e.id === id);
    if (index === -1) {
      throw new Error(`Expense record with ID "${id}" not found.`);
    }

    const current = all[index];
    const updated: BusinessExpense = {
      ...current,
      status: 'paid',
      updatedAt: new Date().toISOString(),
    };

    all[index] = updated;
    this.save(all);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const all = await this.getAll();
    const filtered = all.filter((e) => e.id !== id);
    if (filtered.length === all.length) return false;
    this.save(filtered);
    return true;
  }
}

export const expenseRepository = new ExpenseRepository();
