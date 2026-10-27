/**
 * Customer Repository
 * Module 08: Customer Management
 * XFORCE Construction Management & Customer Platform (Brand: X-FORCE BRICKS)
 *
 * Implements multi-tier persistence (Memory -> LocalStorage -> Supabase)
 * with robust offline resiliency, unique customer number generation,
 * and duplicate verification.
 */

import { getSupabaseClient, isNetworkOrFetchError, markRemoteDbUnavailable } from '../lib/supabase/client';
import { appConfig } from '../config/app.config';
import { localStore } from '../lib/storage/localStorage';
import { businessSettingsService } from '../services/settings.service';
import {
  Customer,
  CreateCustomerDTO,
  UpdateCustomerDTO,
  CustomerFilters,
  DuplicateWarning,
} from '../types/customer';

const CUSTOMERS_LOCAL_STORAGE_KEY = 'xforce_customers_cache_v1';

export class CustomerRepository {
  private memoryCache: Customer[] | null = null;
  private isRemoteTableAvailable: boolean = true;
  private warnedAboutMissingTable: boolean = false;

  constructor() {
    const stored = localStore.get<Customer[] | null>(CUSTOMERS_LOCAL_STORAGE_KEY, null);
    if (stored && Array.isArray(stored)) {
      this.memoryCache = stored;
    } else {
      this.memoryCache = [];
    }
  }

  private isTableMissingError(error: any): boolean {
    if (!error) return false;
    if (isNetworkOrFetchError(error)) {
      markRemoteDbUnavailable(error);
      return true;
    }
    const msg = typeof error.message === 'string' ? error.message : '';
    const code = error.code;
    return (
      code === 'PGRST205' ||
      code === '42P01' ||
      msg.includes('in the schema cache') ||
      msg.includes('Could not find the table') ||
      msg.includes('relation "customers" does not exist') ||
      msg.includes('relation "public.customers" does not exist')
    );
  }

  /**
   * Maps database snake_case row to domain camelCase model
   */
  private mapDbRowToCustomer(row: any): Customer {
    return {
      id: row.id,
      customerNumber: row.customer_number,
      userId: row.user_id ?? null,
      fullName: row.full_name,
      firstName: row.first_name ?? undefined,
      lastName: row.last_name ?? undefined,
      companyName: row.company_name ?? null,
      phone: row.phone,
      altPhone: row.alt_phone ?? null,
      email: row.email ?? null,
      whatsappNumber: row.whatsapp_number ?? null,
      address: row.address ?? null,
      city: row.city ?? null,
      state: row.state ?? null,
      country: row.country ?? 'Nigeria',
      gpsLatitude: row.gps_latitude !== null && row.gps_latitude !== undefined ? Number(row.gps_latitude) : null,
      gpsLongitude: row.gps_longitude !== null && row.gps_longitude !== undefined ? Number(row.gps_longitude) : null,
      customerType: row.customer_type || 'individual',
      status: row.status || 'active',
      accountStatus: row.account_status || (row.user_id ? 'active' : 'no_account'),
      preferredContactMethod: row.preferred_contact_method || 'phone',
      registrationSource: row.registration_source || 'staff',
      notes: row.notes ?? null,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }

  /**
   * Maps domain camelCase customer to database snake_case row
   */
  private mapCustomerToDbRow(customer: Customer): any {
    return {
      id: customer.id,
      customer_number: customer.customerNumber,
      user_id: customer.userId,
      full_name: customer.fullName,
      first_name: customer.firstName || null,
      last_name: customer.lastName || null,
      company_name: customer.companyName || null,
      phone: customer.phone,
      alt_phone: customer.altPhone || null,
      email: customer.email || null,
      whatsapp_number: customer.whatsappNumber || null,
      address: customer.address || null,
      city: customer.city || null,
      state: customer.state || null,
      country: customer.country || 'Nigeria',
      gps_latitude: customer.gpsLatitude,
      gps_longitude: customer.gpsLongitude,
      customer_type: customer.customerType,
      status: customer.status,
      account_status: customer.accountStatus,
      preferred_contact_method: customer.preferredContactMethod,
      registration_source: customer.registrationSource,
      notes: customer.notes || null,
      created_at: customer.createdAt,
      updated_at: customer.updatedAt,
    };
  }

  /**
   * Syncs internal memory cache to localStorage
   */
  private saveToLocal(customers: Customer[]): void {
    this.memoryCache = [...customers];
    localStore.set(CUSTOMERS_LOCAL_STORAGE_KEY, this.memoryCache);
  }

  /**
   * Retrieves all customers with optional filtering and sorting
   */
  public async listCustomers(filters?: CustomerFilters): Promise<Customer[]> {
    let items: Customer[] = [];

    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          if (this.isTableMissingError(error)) {
            this.isRemoteTableAvailable = false;
            if (!this.warnedAboutMissingTable) {
              console.info(
                '[CustomerRepository] Supabase "customers" table not yet created in schema cache. Running in local-first mode.'
              );
              this.warnedAboutMissingTable = true;
            }
          } else {
            console.warn('[CustomerRepository] Failed to fetch customers from Supabase:', error.message);
          }
          items = this.memoryCache || [];
        } else if (data) {
          items = data.map((row) => this.mapDbRowToCustomer(row));
          this.saveToLocal(items);
        }
      } catch (err: any) {
        if (this.isTableMissingError(err)) {
          this.isRemoteTableAvailable = false;
        } else {
          console.warn('[CustomerRepository] Fetch exception:', err?.message || err);
        }
        items = this.memoryCache || [];
      }
    } else {
      items = this.memoryCache || [];
    }

    // Apply in-memory search and filter criteria
    if (!filters) {
      return items;
    }

    let filtered = [...items];

    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (c) =>
          c.customerNumber.toLowerCase().includes(q) ||
          c.fullName.toLowerCase().includes(q) ||
          (c.companyName && c.companyName.toLowerCase().includes(q)) ||
          c.phone.includes(q) ||
          (c.altPhone && c.altPhone.includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.city && c.city.toLowerCase().includes(q))
      );
    }

    if (filters.customerType && filters.customerType !== 'all') {
      filtered = filtered.filter((c) => c.customerType === filters.customerType);
    }

    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter((c) => c.status === filters.status);
    }

    if (filters.accountStatus && filters.accountStatus !== 'all') {
      filtered = filtered.filter((c) => c.accountStatus === filters.accountStatus);
    }

    // Sorting
    const sortBy = filters.sortBy || 'created';
    const direction = filters.sortDirection === 'asc' ? 1 : -1;

    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.fullName.localeCompare(b.fullName) * direction;
      }
      if (sortBy === 'number') {
        return a.customerNumber.localeCompare(b.customerNumber) * direction;
      }
      if (sortBy === 'updated') {
        return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * direction;
      }
      // default 'created'
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * direction;
    });

    return filtered;
  }

  /**
   * Alias for listCustomers for repository consistency across modules
   */
  public async getAllCustomers(filters?: CustomerFilters): Promise<Customer[]> {
    return this.listCustomers(filters);
  }

  /**
   * Retrieves single customer by internal UUID
   */
  public async getCustomerById(id: string): Promise<Customer | null> {
    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (!error && data) {
          return this.mapDbRowToCustomer(data);
        }
      } catch (err) {
        // Fall back to local
      }
    }

    return (this.memoryCache || []).find((c) => c.id === id) || null;
  }

  /**
   * Retrieves single customer by linked Supabase Auth User ID
   */
  public async getCustomerByUserId(userId: string): Promise<Customer | null> {
    if (!userId) return null;

    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (!error && data) {
          return this.mapDbRowToCustomer(data);
        }
      } catch (err) {
        // Fall back to local
      }
    }

    return (this.memoryCache || []).find((c) => c.userId === userId) || null;
  }

  /**
   * Retrieves single customer by public Customer Number (e.g. XFC-000001)
   */
  public async getCustomerByNumber(customerNumber: string): Promise<Customer | null> {
    if (!customerNumber) return null;
    const clean = customerNumber.trim().toUpperCase();

    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('customer_number', clean)
          .maybeSingle();

        if (!error && data) {
          return this.mapDbRowToCustomer(data);
        }
      } catch (err) {
        // Fall back to local
      }
    }

    return (this.memoryCache || []).find((c) => c.customerNumber.toUpperCase() === clean) || null;
  }

  /**
   * Finds potential duplicate customers matching phone, email, or number
   */
  public async findPotentialDuplicates(
    phone: string,
    email?: string | null,
    customerNumber?: string | null,
    excludeId?: string
  ): Promise<DuplicateWarning[]> {
    const list = await this.listCustomers();
    const warnings: DuplicateWarning[] = [];

    const normPhone = phone.replace(/[^\d+]/g, '');
    const normEmail = email ? email.toLowerCase().trim() : null;
    const normNumber = customerNumber ? customerNumber.toUpperCase().trim() : null;

    for (const c of list) {
      if (excludeId && c.id === excludeId) continue;

      if (normNumber && c.customerNumber.toUpperCase().trim() === normNumber) {
        warnings.push({
          field: 'customerNumber',
          matchedCustomer: c,
          message: `Customer number ${c.customerNumber} is already assigned to "${c.fullName}".`,
        });
      }

      const cPhone = c.phone.replace(/[^\d+]/g, '');
      if (normPhone && (cPhone === normPhone || (normPhone.length > 7 && cPhone.endsWith(normPhone.slice(-7))))) {
        warnings.push({
          field: 'phone',
          matchedCustomer: c,
          message: `Phone number ${phone} matches existing customer "${c.fullName}" (${c.customerNumber}).`,
        });
      }

      if (normEmail && c.email && c.email.toLowerCase().trim() === normEmail) {
        warnings.push({
          field: 'email',
          matchedCustomer: c,
          message: `Email address ${email} matches existing customer "${c.fullName}" (${c.customerNumber}).`,
        });
      }
    }

    return warnings;
  }

  /**
   * Generates next sequential unique Customer Number based on business settings
   * Example: XFC-000001
   */
  public async generateCustomerNumber(): Promise<string> {
    let prefix = 'XFC';
    try {
      const numbering = await businessSettingsService.getNumberingSettings();
      if (numbering?.defaultCustomerPrefix) {
        prefix = numbering.defaultCustomerPrefix.trim().toUpperCase();
      }
    } catch (err) {
      // Use fallback prefix
    }

    const all = await this.listCustomers();
    let maxNumber = 0;

    const regex = new RegExp(`^${prefix}-(\\d+)$`, 'i');
    for (const item of all) {
      const match = item.customerNumber.match(regex);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    }

    const nextNumber = maxNumber + 1;
    const padded = String(nextNumber).padStart(6, '0');
    return `${prefix}-${padded}`;
  }

  /**
   * Creates a new customer record
   */
  public async createCustomer(dto: CreateCustomerDTO): Promise<Customer> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const customerNumber = await this.generateCustomerNumber();

    const newCustomer: Customer = {
      id,
      customerNumber,
      userId: dto.userId ?? null,
      fullName: dto.fullName.trim(),
      firstName: dto.firstName?.trim() || undefined,
      lastName: dto.lastName?.trim() || undefined,
      companyName: dto.companyName?.trim() || null,
      phone: dto.phone.trim(),
      altPhone: dto.altPhone?.trim() || null,
      email: dto.email?.toLowerCase().trim() || null,
      whatsappNumber: dto.whatsappNumber?.trim() || null,
      address: dto.address?.trim() || null,
      city: dto.city?.trim() || null,
      state: dto.state?.trim() || null,
      country: dto.country?.trim() || 'Nigeria',
      gpsLatitude: dto.gpsLatitude !== undefined ? dto.gpsLatitude : null,
      gpsLongitude: dto.gpsLongitude !== undefined ? dto.gpsLongitude : null,
      customerType: dto.customerType || 'individual',
      status: dto.status || 'active',
      accountStatus: dto.accountStatus || (dto.userId ? 'active' : 'no_account'),
      preferredContactMethod: dto.preferredContactMethod || 'phone',
      registrationSource: dto.registrationSource || 'staff',
      notes: dto.notes?.trim() || null,
      createdAt: now,
      updatedAt: now,
    };

    // Save to local storage first
    const current = this.memoryCache || [];
    this.saveToLocal([newCustomer, ...current]);

    // Persist to Supabase if configured
    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const supabase = getSupabaseClient();
        const row = this.mapCustomerToDbRow(newCustomer);
        const { error } = await supabase.from('customers').insert(row);
        if (error) {
          if (this.isTableMissingError(error)) {
            this.isRemoteTableAvailable = false;
            console.info('[CustomerRepository] Table not yet created; saved customer locally.');
          } else {
            console.warn('[CustomerRepository] Supabase insert warning:', error.message);
          }
        }
      } catch (err: any) {
        if (this.isTableMissingError(err)) {
          this.isRemoteTableAvailable = false;
        } else {
          console.warn('[CustomerRepository] Supabase insert exception:', err?.message || err);
        }
      }
    }

    return newCustomer;
  }

  /**
   * Updates an existing customer record
   */
  public async updateCustomer(id: string, updates: UpdateCustomerDTO): Promise<Customer> {
    const existing = await this.getCustomerById(id);
    if (!existing) {
      throw new Error(`Customer with ID ${id} not found.`);
    }

    const now = new Date().toISOString();
    const updatedRecord: Customer = {
      ...existing,
      ...updates,
      // Protected fields: ID, createdAt remain unchanged
      id: existing.id,
      customerNumber: updates.customerNumber ? updates.customerNumber.trim().toUpperCase() : existing.customerNumber,
      createdAt: existing.createdAt,
      updatedAt: now,
    };

    // Update in local cache
    const current = this.memoryCache || [];
    const idx = current.findIndex((c) => c.id === id);
    if (idx >= 0) {
      current[idx] = updatedRecord;
      this.saveToLocal(current);
    } else {
      this.saveToLocal([updatedRecord, ...current]);
    }

    // Persist to Supabase
    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const supabase = getSupabaseClient();
        const row = this.mapCustomerToDbRow(updatedRecord);
        const { error } = await supabase.from('customers').update(row).eq('id', id);
        if (error) {
          if (this.isTableMissingError(error)) {
            this.isRemoteTableAvailable = false;
          } else {
            console.warn('[CustomerRepository] Supabase update error:', error.message);
          }
        }
      } catch (err: any) {
        if (this.isTableMissingError(err)) {
          this.isRemoteTableAvailable = false;
        }
      }
    }

    return updatedRecord;
  }

  /**
   * Deactivates a customer (preferred over permanent deletion)
   */
  public async deactivateCustomer(id: string): Promise<Customer> {
    return this.updateCustomer(id, { status: 'inactive' });
  }

  /**
   * Activates a customer
   */
  public async activateCustomer(id: string): Promise<Customer> {
    return this.updateCustomer(id, { status: 'active' });
  }

  /**
   * Safe deletion of an unused customer record
   */
  public async deleteCustomer(id: string): Promise<boolean> {
    const current = this.memoryCache || [];
    const filtered = current.filter((c) => c.id !== id);
    this.saveToLocal(filtered);

    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const supabase = getSupabaseClient();
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) {
          console.warn('[CustomerRepository] Supabase delete warning:', error.message);
          return false;
        }
      } catch (err) {
        // Handled
      }
    }

    return true;
  }

  /**
   * Links a customer record to a Supabase Auth User ID
   */
  public async linkAuthAccount(customerId: string, userId: string): Promise<Customer> {
    return this.updateCustomer(customerId, {
      userId,
      accountStatus: 'active',
    });
  }

  /**
   * Unlinks a customer record from a Supabase Auth User ID
   */
  public async unlinkAuthAccount(customerId: string): Promise<Customer> {
    return this.updateCustomer(customerId, {
      userId: null,
      accountStatus: 'no_account',
    });
  }
}

export const customerRepository = new CustomerRepository();
