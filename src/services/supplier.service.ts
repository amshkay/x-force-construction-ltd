/**
 * Supplier Management Service
 * Module 17 — Staff, Suppliers, Expenses & Basic Finance
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Dedicated business logic layer for vendor onboarding, materials catalogue,
 * bank details verification, and CSV reporting.
 */

import {
  Supplier,
  SupplierFilters,
  CreateSupplierDTO,
  UpdateSupplierDTO,
  SupplierStatus,
} from '../types/supplier';
import { supplierRepository } from '../repositories/supplier.repository';
import { auditService } from './audit.service';

export class SupplierService {
  async getAllSuppliers(filters?: SupplierFilters): Promise<Supplier[]> {
    if (filters) {
      return supplierRepository.filter(filters);
    }
    return supplierRepository.getAll();
  }

  async getActiveSuppliers(): Promise<Supplier[]> {
    return supplierRepository.getActiveSuppliers();
  }

  async getSupplierById(id: string): Promise<Supplier | null> {
    return supplierRepository.getById(id);
  }

  async getSupplierByNumber(number: string): Promise<Supplier | null> {
    return supplierRepository.getBySupplierNumber(number);
  }

  async createSupplier(dto: CreateSupplierDTO, userId: string): Promise<Supplier> {
    if (!dto.name || !dto.name.trim()) {
      throw new Error('Supplier business or company name is required.');
    }
    if (!dto.contactPerson || !dto.contactPerson.trim()) {
      throw new Error('Contact person name is required.');
    }
    if (!dto.phone || !dto.phone.trim()) {
      throw new Error('Phone number is required.');
    }

    const created = await supplierRepository.create(dto);

    auditService.logEvent({
      action: 'supplier.created',
      entity_type: 'supplier',
      entity_id: created.id,
      user_id: userId,
      reason: `Registered new vendor: ${created.supplierNumber} (${created.name})`,
      new_values: {
        supplierNumber: created.supplierNumber,
        name: created.name,
        category: created.category,
        contactPerson: created.contactPerson,
      },
    });

    return created;
  }

  async updateSupplier(id: string, dto: UpdateSupplierDTO, userId: string): Promise<Supplier> {
    const previous = await supplierRepository.getById(id);
    const updated = await supplierRepository.update(id, dto);

    auditService.logEvent({
      action: 'supplier.updated',
      entity_type: 'supplier',
      entity_id: id,
      user_id: userId,
      reason: `Updated supplier details for ${updated.supplierNumber}`,
      old_values: previous ? { name: previous.name, category: previous.category, status: previous.status } : undefined,
      new_values: { name: updated.name, category: updated.category, status: updated.status },
    });

    return updated;
  }

  async setSupplierStatus(
    id: string,
    status: SupplierStatus,
    userId: string,
    reason?: string
  ): Promise<Supplier> {
    const updated = await supplierRepository.setStatus(id, status);

    auditService.logEvent({
      action: 'supplier.status_change',
      entity_type: 'supplier',
      entity_id: id,
      user_id: userId,
      reason: reason || `Supplier status changed to ${status}`,
      new_values: { status },
    });

    return updated;
  }

  /**
   * Generates a downloadable CSV string of suppliers
   */
  exportSuppliersToCSV(suppliers: Supplier[]): string {
    const headers = [
      'Supplier Number',
      'Company Name',
      'Contact Person',
      'Phone',
      'Email',
      'Category',
      'Status',
      'City',
      'State',
      'Supplied Items',
      'Bank Name',
      'Account Number',
      'Payment Terms',
      'Lead Time (Days)',
    ];

    const rows = suppliers.map((s) => [
      s.supplierNumber,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.contactPerson.replace(/"/g, '""')}"`,
      s.phone,
      s.email || '',
      s.category,
      s.status,
      s.city,
      s.state,
      `"${s.suppliedItems.join('; ').replace(/"/g, '""')}"`,
      s.bankDetails?.bankName || '',
      s.bankDetails?.accountNumber || '',
      s.paymentTerms || '',
      s.leadTimeDays ?? '',
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

export const supplierService = new SupplierService();
