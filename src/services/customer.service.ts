/**
 * Customer Management Service
 * Module 08: Customer Management
 * XFORCE Construction Management & Customer Platform (Brand: X-FORCE BRICKS)
 *
 * Implements business validation, duplicate verification, audit logging,
 * statistics calculation, CSV import/export, and customer auth account linking.
 */

import { customerRepository } from '../repositories/customer.repository';
import { auditService } from './audit.service';
import { sanitizeInputString } from '../utils/securitySanitizer';
import {
  Customer,
  CreateCustomerDTO,
  UpdateCustomerDTO,
  CustomerFilters,
  CustomerStats,
  DuplicateWarning,
  CustomerType,
  CustomerStatus,
} from '../types/customer';

export interface CustomerValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface CsvImportResult {
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  errors: string[];
}

export class CustomerService {
  /**
   * Comprehensive validation for customer inputs
   */
  public validateCustomerData(data: Partial<CreateCustomerDTO>): CustomerValidationResult {
    const errors: Record<string, string> = {};

    // Full name validation
    if (!data.fullName || !data.fullName.trim()) {
      errors.fullName = 'Customer or Contact name is required.';
    } else if (data.fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters.';
    }

    // Phone validation
    if (!data.phone || !data.phone.trim()) {
      errors.phone = 'Phone number is required for all customer records.';
    } else {
      const cleanPhone = data.phone.replace(/[^\d+]/g, '');
      if (cleanPhone.length < 7) {
        errors.phone = 'Please enter a valid phone number with at least 7 digits.';
      }
    }

    // Email validation (optional but format-checked if provided)
    if (data.email && data.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email.trim())) {
        errors.email = 'Please provide a valid email address.';
      }
    }

    // GPS Latitude validation (-90 to 90)
    if (data.gpsLatitude !== undefined && data.gpsLatitude !== null) {
      const lat = Number(data.gpsLatitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        errors.gpsLatitude = 'Latitude must be a valid coordinate between -90 and 90 degrees.';
      }
    }

    // GPS Longitude validation (-180 to 180)
    if (data.gpsLongitude !== undefined && data.gpsLongitude !== null) {
      const lng = Number(data.gpsLongitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        errors.gpsLongitude = 'Longitude must be a valid coordinate between -180 and 180 degrees.';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Retrieves customer directory
   */
  public async listCustomers(filters?: CustomerFilters): Promise<Customer[]> {
    return customerRepository.listCustomers(filters);
  }

  /**
   * Retrieves single customer by ID
   */
  public async getCustomerById(id: string): Promise<Customer | null> {
    return customerRepository.getCustomerById(id);
  }

  /**
   * Retrieves single customer by linked Supabase Auth User ID
   */
  public async getCustomerByUserId(userId: string): Promise<Customer | null> {
    return customerRepository.getCustomerByUserId(userId);
  }

  /**
   * Checks for potential duplicate customer entries
   */
  public async checkDuplicates(
    phone: string,
    email?: string | null,
    customerNumber?: string | null,
    excludeId?: string
  ): Promise<DuplicateWarning[]> {
    return customerRepository.findPotentialDuplicates(phone, email, customerNumber, excludeId);
  }

  /**
   * Creates a new customer record with validation and audit logging
   */
  public async createCustomer(dto: CreateCustomerDTO, staffUserId?: string): Promise<Customer> {
    const sanitizedDto: CreateCustomerDTO = {
      ...dto,
      fullName: sanitizeInputString(dto.fullName),
      companyName: dto.companyName ? sanitizeInputString(dto.companyName) : undefined,
      address: dto.address ? sanitizeInputString(dto.address) : undefined,
      city: dto.city ? sanitizeInputString(dto.city) : undefined,
      notes: staffUserId && dto.notes ? sanitizeInputString(dto.notes) : null,
    };

    const validation = this.validateCustomerData(sanitizedDto);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      throw new Error(firstError || 'Customer data validation failed.');
    }

    const created = await customerRepository.createCustomer(sanitizedDto);

    // Audit log
    auditService.logEvent({
      action: 'customer.create',
      entity_type: 'customer',
      entity_id: created.id,
      user_id: staffUserId || 'system',
      reason: `Created customer record ${created.customerNumber} (${created.fullName})`,
      new_values: {
        customerNumber: created.customerNumber,
        fullName: created.fullName,
        phone: created.phone,
        customerType: created.customerType,
        accountStatus: created.accountStatus,
      },
    });

    return created;
  }

  /**
   * Updates an existing customer record
   */
  public async updateCustomer(
    id: string,
    updates: UpdateCustomerDTO,
    staffUserId?: string,
    reason?: string
  ): Promise<Customer> {
    const current = await customerRepository.getCustomerById(id);
    if (!current) {
      throw new Error(`Customer with ID ${id} was not found.`);
    }

    // Security Hardening (Section 7): If not updated by staff, strip privileged fields
    const safeUpdates: UpdateCustomerDTO = { ...updates };
    if (!staffUserId) {
      delete safeUpdates.accountStatus;
      delete safeUpdates.status;
      delete safeUpdates.notes;
      delete safeUpdates.customerNumber;
      delete safeUpdates.userId;
      delete safeUpdates.registrationSource;
    }

    if (safeUpdates.fullName) safeUpdates.fullName = sanitizeInputString(safeUpdates.fullName);
    if (safeUpdates.companyName) safeUpdates.companyName = sanitizeInputString(safeUpdates.companyName);
    if (safeUpdates.address) safeUpdates.address = sanitizeInputString(safeUpdates.address);
    if (safeUpdates.city) safeUpdates.city = sanitizeInputString(safeUpdates.city);
    if (safeUpdates.notes && staffUserId) safeUpdates.notes = sanitizeInputString(safeUpdates.notes);

    const validation = this.validateCustomerData({
      fullName: safeUpdates.fullName || current.fullName,
      phone: safeUpdates.phone || current.phone,
      email: safeUpdates.email !== undefined ? safeUpdates.email : current.email,
      gpsLatitude: safeUpdates.gpsLatitude !== undefined ? safeUpdates.gpsLatitude : current.gpsLatitude,
      gpsLongitude: safeUpdates.gpsLongitude !== undefined ? safeUpdates.gpsLongitude : current.gpsLongitude,
    });

    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      throw new Error(firstError || 'Customer update validation failed.');
    }

    const updated = await customerRepository.updateCustomer(id, safeUpdates);

    auditService.logEvent({
      action: 'customer.update',
      entity_type: 'customer',
      entity_id: id,
      user_id: staffUserId || 'system',
      reason: reason || `Updated customer ${updated.customerNumber}`,
      old_values: {
        fullName: current.fullName,
        phone: current.phone,
        status: current.status,
      },
      new_values: {
        fullName: updated.fullName,
        phone: updated.phone,
        status: updated.status,
      },
    });

    return updated;
  }

  /**
   * Deactivates a customer (soft status change)
   */
  public async deactivateCustomer(id: string, staffUserId?: string, reason?: string): Promise<Customer> {
    const customer = await customerRepository.deactivateCustomer(id);

    auditService.logEvent({
      action: 'customer.deactivate',
      entity_type: 'customer',
      entity_id: id,
      user_id: staffUserId || 'system',
      reason: reason || 'Customer deactivated by authorized staff',
      new_values: { status: 'inactive' },
    });

    return customer;
  }

  /**
   * Activates a customer
   */
  public async activateCustomer(id: string, staffUserId?: string): Promise<Customer> {
    const customer = await customerRepository.activateCustomer(id);

    auditService.logEvent({
      action: 'customer.activate',
      entity_type: 'customer',
      entity_id: id,
      user_id: staffUserId || 'system',
      reason: 'Customer reactivated by authorized staff',
      new_values: { status: 'active' },
    });

    return customer;
  }

  /**
   * Deletes an unused customer record
   */
  public async deleteCustomer(id: string, staffUserId?: string, reason?: string): Promise<boolean> {
    const customer = await customerRepository.getCustomerById(id);
    if (!customer) return false;

    const result = await customerRepository.deleteCustomer(id);
    if (result) {
      auditService.logEvent({
        action: 'customer.delete',
        entity_type: 'customer',
        entity_id: id,
        user_id: staffUserId || 'system',
        reason: reason || `Deleted customer ${customer.customerNumber}`,
        old_values: { customerNumber: customer.customerNumber, fullName: customer.fullName },
      });
    }
    return result;
  }

  /**
   * Links a Supabase Auth user account to a customer record
   */
  public async linkAuthAccount(customerId: string, userId: string, staffUserId?: string): Promise<Customer> {
    const customer = await customerRepository.linkAuthAccount(customerId, userId);

    auditService.logEvent({
      action: 'customer.link_account',
      entity_type: 'customer',
      entity_id: customerId,
      user_id: staffUserId || 'system',
      reason: `Linked customer to auth user ID: ${userId}`,
      new_values: { userId, accountStatus: 'active' },
    });

    return customer;
  }

  /**
   * Unlinks an Auth account from a customer record
   */
  public async unlinkAuthAccount(customerId: string, staffUserId?: string): Promise<Customer> {
    const customer = await customerRepository.unlinkAuthAccount(customerId);

    auditService.logEvent({
      action: 'customer.unlink_account',
      entity_type: 'customer',
      entity_id: customerId,
      user_id: staffUserId || 'system',
      reason: 'Unlinked auth login from customer record',
      new_values: { userId: null, accountStatus: 'no_account' },
    });

    return customer;
  }

  /**
   * Ensures an authoritative customer record exists for an authenticated customer user.
   * Links existing record by phone/email if found, or creates a new profile.
   */
  public async getOrCreateCustomerForAuthUser(
    userId: string,
    email: string,
    metadata?: {
      fullName?: string;
      phone?: string;
      clientType?: string;
      companyName?: string;
    }
  ): Promise<Customer> {
    // 1. Check if already linked
    const existing = await customerRepository.getCustomerByUserId(userId);
    if (existing) {
      return existing;
    }

    // 2. Search if customer matches by email
    const all = await customerRepository.listCustomers();
    const emailMatch = all.find((c) => c.email && c.email.toLowerCase() === email.toLowerCase());
    if (emailMatch) {
      return this.linkAuthAccount(emailMatch.id, userId);
    }

    // 3. Search if customer matches by phone
    if (metadata?.phone) {
      const cleanPhone = metadata.phone.replace(/[^\d+]/g, '');
      const phoneMatch = all.find((c) => c.phone.replace(/[^\d+]/g, '') === cleanPhone);
      if (phoneMatch) {
        return this.linkAuthAccount(phoneMatch.id, userId);
      }
    }

    // 4. Map clientType string to CustomerType enum
    let type: CustomerType = 'individual';
    const ct = (metadata?.clientType || '').toLowerCase();
    if (ct.includes('contractor') || ct.includes('paving')) type = 'contractor';
    else if (ct.includes('homeowner') || ct.includes('private')) type = 'homeowner';
    else if (ct.includes('architect')) type = 'architect';
    else if (ct.includes('developer')) type = 'real_estate_developer';
    else if (ct.includes('corporate') || ct.includes('commercial')) type = 'corporate';

    // 5. Create new authoritative record
    return this.createCustomer({
      fullName: metadata?.fullName?.trim() || email.split('@')[0],
      email: email.toLowerCase().trim(),
      phone: metadata?.phone?.trim() || '+234 000 000 0000',
      companyName: metadata?.companyName?.trim() || null,
      customerType: type,
      userId,
      accountStatus: 'active',
      registrationSource: 'portal',
      status: 'active',
    });
  }

  /**
   * Calculates high-level customer directory statistics
   */
  public async getStats(): Promise<CustomerStats> {
    const list = await customerRepository.listCustomers();

    return {
      total: list.length,
      active: list.filter((c) => c.status === 'active').length,
      inactive: list.filter((c) => c.status === 'inactive').length,
      suspended: list.filter((c) => c.status === 'suspended').length,
      withPortalAccount: list.filter((c) => Boolean(c.userId)).length,
      contractors: list.filter((c) => c.customerType === 'contractor').length,
      homeowners: list.filter((c) => c.customerType === 'homeowner').length,
    };
  }

  /**
   * Exports authorized customer directory to CSV and initiates download
   */
  public exportCustomersToCsv(customers: Customer[]): void {
    const headers = [
      'Customer Number',
      'Full Name',
      'Company Name',
      'Customer Type',
      'Phone',
      'Alternative Phone',
      'Email',
      'WhatsApp Number',
      'Address',
      'City',
      'State',
      'Country',
      'Latitude',
      'Longitude',
      'Status',
      'Account Status',
      'Preferred Contact',
      'Registration Source',
      'Date Created',
    ];

    const escapeCsv = (str: string | null | undefined): string => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = customers.map((c) => [
      escapeCsv(c.customerNumber),
      escapeCsv(c.fullName),
      escapeCsv(c.companyName),
      escapeCsv(c.customerType),
      escapeCsv(c.phone),
      escapeCsv(c.altPhone),
      escapeCsv(c.email),
      escapeCsv(c.whatsappNumber),
      escapeCsv(c.address),
      escapeCsv(c.city),
      escapeCsv(c.state),
      escapeCsv(c.country),
      escapeCsv(c.gpsLatitude !== null ? String(c.gpsLatitude) : ''),
      escapeCsv(c.gpsLongitude !== null ? String(c.gpsLongitude) : ''),
      escapeCsv(c.status),
      escapeCsv(c.accountStatus),
      escapeCsv(c.preferredContactMethod),
      escapeCsv(c.registrationSource),
      escapeCsv(c.createdAt),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `XFORCE_Customers_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Imports customer directory from CSV string
   */
  public async importCustomersFromCsv(csvText: string, staffUserId?: string): Promise<CsvImportResult> {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      return { totalRows: 0, importedCount: 0, skippedCount: 0, errors: ['CSV file is empty or missing data rows.'] };
    }

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headerRow = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const getColIndex = (keywords: string[]): number => {
      return headerRow.findIndex((col) => keywords.some((k) => col.includes(k)));
    };

    const nameIdx = getColIndex(['fullname', 'name', 'customername', 'client']);
    const phoneIdx = getColIndex(['phone', 'phonenumber', 'mobile', 'tel']);
    const emailIdx = getColIndex(['email', 'mail']);
    const companyIdx = getColIndex(['company', 'business', 'organization']);
    const addressIdx = getColIndex(['address', 'street', 'location']);
    const cityIdx = getColIndex(['city', 'town']);
    const stateIdx = getColIndex(['state', 'province']);
    const typeIdx = getColIndex(['type', 'customertype', 'classification']);

    if (nameIdx === -1 || phoneIdx === -1) {
      return {
        totalRows: lines.length - 1,
        importedCount: 0,
        skippedCount: lines.length - 1,
        errors: ['CSV must contain at least "Full Name" and "Phone" columns.'],
      };
    }

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseLine(lines[i]);
      const fullName = cols[nameIdx] || '';
      const phone = cols[phoneIdx] || '';
      const email = emailIdx !== -1 ? cols[emailIdx] : undefined;
      const companyName = companyIdx !== -1 ? cols[companyIdx] : undefined;
      const address = addressIdx !== -1 ? cols[addressIdx] : undefined;
      const city = cityIdx !== -1 ? cols[cityIdx] : undefined;
      const state = stateIdx !== -1 ? cols[stateIdx] : undefined;
      const rawType = typeIdx !== -1 ? cols[typeIdx] : '';

      if (!fullName.trim() || !phone.trim()) {
        skippedCount++;
        errors.push(`Row ${i + 1}: Missing required name or phone.`);
        continue;
      }

      // Determine customer classification
      let customerType: CustomerType = 'individual';
      const lt = rawType.toLowerCase();
      if (lt.includes('contractor') || lt.includes('paving')) customerType = 'contractor';
      else if (lt.includes('homeowner') || lt.includes('private')) customerType = 'homeowner';
      else if (lt.includes('architect')) customerType = 'architect';
      else if (lt.includes('developer')) customerType = 'real_estate_developer';
      else if (lt.includes('corporate') || lt.includes('company')) customerType = 'corporate';
      else if (lt.includes('distributor')) customerType = 'distributor';
      else if (lt.includes('org')) customerType = 'organization';

      try {
        await this.createCustomer(
          {
            fullName: fullName.trim(),
            phone: phone.trim(),
            email: email && email.trim() ? email.trim().toLowerCase() : null,
            companyName: companyName && companyName.trim() ? companyName.trim() : null,
            address: address && address.trim() ? address.trim() : null,
            city: city && city.trim() ? city.trim() : null,
            state: state && state.trim() ? state.trim() : null,
            customerType,
            registrationSource: 'csv_import',
            status: 'active',
          },
          staffUserId
        );
        importedCount++;
      } catch (err: any) {
        skippedCount++;
        errors.push(`Row ${i + 1} (${fullName}): ${err.message || 'Import error'}`);
      }
    }

    return {
      totalRows: lines.length - 1,
      importedCount,
      skippedCount,
      errors: errors.slice(0, 10), // Limit error list
    };
  }
}

export const customerService = new CustomerService();
