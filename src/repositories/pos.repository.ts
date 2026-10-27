/**
 * Point of Sale (POS) Repository
 * Module 13 — POS / Sales Counter
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Implements persistent storage for counter sales, configurable sequence numbering,
 * robust item snapshots, and resilient offline-first caching.
 */

import { getSupabaseClient, isNetworkOrFetchError, markRemoteDbUnavailable } from '../lib/supabase/client';
import { appConfig } from '../config/app.config';
import { localStore } from '../lib/storage/localStorage';
import { businessSettingsService } from '../services/settings.service';
import { PosSale, PosFilterParams } from '../types/pos';

const POS_SALES_LOCAL_STORAGE_KEY = 'xforce_pos_sales_v1';

export class PosRepository {
  private memorySales: PosSale[] | null = null;
  private isRemoteTableAvailable: boolean = true;
  private warnedAboutMissingTable: boolean = false;

  constructor() {
    const stored = localStore.get<PosSale[] | null>(POS_SALES_LOCAL_STORAGE_KEY, null);
    if (stored && Array.isArray(stored)) {
      this.memorySales = stored;
    } else {
      this.memorySales = [];
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
      msg.includes('relation "pos_sales" does not exist') ||
      msg.includes('relation "public.pos_sales" does not exist')
    );
  }

  private saveToLocalStorage(sales: PosSale[]): void {
    this.memorySales = sales;
    localStore.set(POS_SALES_LOCAL_STORAGE_KEY, sales);
  }

  /**
   * Generates a configurable, unique sequence sale reference (e.g. POS-2026-0001)
   */
  async generateNextSaleReference(): Promise<string> {
    const settings = await businessSettingsService.getBusinessSettings();
    const prefix = settings?.numbering?.defaultPosSalePrefix || 'POS';
    const year = new Date().getFullYear();

    const all = await this.getAllSales();
    const currentYearPrefix = `${prefix}-${year}-`;
    const matching = all.filter((s) => s.saleReference.startsWith(currentYearPrefix));

    let maxSeq = 0;
    matching.forEach((s) => {
      const parts = s.saleReference.split('-');
      if (parts.length >= 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    });

    const nextSeq = String(maxSeq + 1).padStart(4, '0');
    return `${prefix}-${year}-${nextSeq}`;
  }

  /**
   * Retrieves all POS sales, optionally filtered
   */
  async getAllSales(filters?: PosFilterParams): Promise<PosSale[]> {
    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await (supabase.from('pos_sales' as any) as any)
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          if (this.isTableMissingError(error)) {
            if (!this.warnedAboutMissingTable) {
              console.info('[PosRepository] Supabase pos_sales table not active, using resilient local storage.');
              this.warnedAboutMissingTable = true;
            }
            this.isRemoteTableAvailable = false;
          } else {
            console.warn('[PosRepository] Supabase query failed:', error);
          }
        } else if (data && Array.isArray(data)) {
          const mapped: PosSale[] = data.map((r: any) => ({
            id: r.id,
            saleReference: r.sale_reference || r.saleReference,
            customerId: r.customer_id ?? r.customerId ?? null,
            customerName: r.customer_name || r.customerName || 'Walk-in Customer',
            customerPhone: r.customer_phone ?? r.customerPhone ?? null,
            customerEmail: r.customer_email ?? r.customerEmail ?? null,
            customerAddress: r.customer_address ?? r.customerAddress ?? null,
            isGuestCustomer: Boolean(r.is_guest_customer ?? r.isGuestCustomer),
            locationId: r.location_id || r.locationId,
            locationName: r.location_name || r.locationName,
            locationCode: r.location_code || r.locationCode,
            cashierId: r.cashier_id || r.cashierId,
            cashierName: r.cashier_name || r.cashierName,
            items: r.items || [],
            subtotal: Number(r.subtotal) || 0,
            cartDiscountType: r.cart_discount_type || r.cartDiscountType || 'none',
            cartDiscountValue: Number(r.cart_discount_value ?? r.cartDiscountValue) || 0,
            cartDiscountAmount: Number(r.cart_discount_amount ?? r.cartDiscountAmount) || 0,
            additionalChargesFee: Number(r.additional_charges_fee ?? r.additionalChargesFee) || 0,
            additionalChargesNote: r.additional_charges_note ?? r.additionalChargesNote ?? null,
            totalDiscountAmount: Number(r.total_discount_amount ?? r.totalDiscountAmount) || 0,
            totalAmount: Number(r.total_amount ?? r.totalAmount) || 0,
            amountPaid: Number(r.amount_paid ?? r.amountPaid) || 0,
            balanceDue: Number(r.balance_due ?? r.balanceDue) || 0,
            amountTendered: r.amount_tendered != null ? Number(r.amount_tendered) : null,
            changeGiven: r.change_given != null ? Number(r.change_given) : null,
            paymentMethod: r.payment_method || r.paymentMethod,
            paymentStatus: r.payment_status || r.paymentStatus || 'paid',
            paymentReference: r.payment_reference ?? r.paymentReference ?? null,
            paymentId: r.payment_id ?? r.paymentId ?? null,
            status: r.status || 'completed',
            cancellationReason: r.cancellation_reason ?? r.cancellationReason ?? null,
            cancelledBy: r.cancelled_by ?? r.cancelledBy ?? null,
            cancelledByName: r.cancelled_by_name ?? r.cancelledByName ?? null,
            cancelledAt: r.cancelled_at ?? r.cancelledAt ?? null,
            notes: r.notes ?? null,
            createdAt: r.created_at || r.createdAt,
            updatedAt: r.updated_at || r.updatedAt,
          }));

          this.saveToLocalStorage(mapped);
          return this.applyFilters(mapped, filters);
        }
      } catch (err) {
        console.warn('[PosRepository] Remote query failed, falling back to local cache:', err);
      }
    }

    const cached = this.memorySales || localStore.get<PosSale[]>(POS_SALES_LOCAL_STORAGE_KEY, []);
    return this.applyFilters(cached, filters);
  }

  /**
   * Retrieves single POS sale by unique id
   */
  async getSaleById(id: string): Promise<PosSale | null> {
    const all = await this.getAllSales();
    return all.find((s) => s.id === id) || null;
  }

  /**
   * Retrieves single POS sale by human-readable reference
   */
  async getSaleByReference(reference: string): Promise<PosSale | null> {
    const all = await this.getAllSales();
    const cleanRef = reference.trim().toUpperCase();
    return all.find((s) => s.saleReference.toUpperCase() === cleanRef) || null;
  }

  /**
   * Creates a new POS sale atomically
   */
  async createSale(sale: PosSale): Promise<PosSale> {
    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const supabase = getSupabaseClient();
        await (supabase.from('pos_sales' as any) as any).insert({
          id: sale.id,
          sale_reference: sale.saleReference,
          customer_id: sale.customerId,
          customer_name: sale.customerName,
          customer_phone: sale.customerPhone,
          customer_email: sale.customerEmail,
          customer_address: sale.customerAddress,
          is_guest_customer: sale.isGuestCustomer,
          location_id: sale.locationId,
          location_name: sale.locationName,
          location_code: sale.locationCode,
          cashier_id: sale.cashierId,
          cashier_name: sale.cashierName,
          items: sale.items,
          subtotal: sale.subtotal,
          cart_discount_type: sale.cartDiscountType,
          cart_discount_value: sale.cartDiscountValue,
          cart_discount_amount: sale.cartDiscountAmount,
          additional_charges_fee: sale.additionalChargesFee,
          additional_charges_note: sale.additionalChargesNote,
          total_discount_amount: sale.totalDiscountAmount,
          total_amount: sale.totalAmount,
          amount_paid: sale.amountPaid,
          balance_due: sale.balanceDue,
          amount_tendered: sale.amountTendered,
          change_given: sale.changeGiven,
          payment_method: sale.paymentMethod,
          payment_status: sale.paymentStatus,
          payment_reference: sale.paymentReference,
          payment_id: sale.paymentId,
          status: sale.status,
          notes: sale.notes,
          created_at: sale.createdAt,
          updated_at: sale.updatedAt,
        });
      } catch (err) {
        console.warn('[PosRepository] Remote insert failed, persisting locally:', err);
      }
    }

    const all = await this.getAllSales();
    const updated = [sale, ...all.filter((s) => s.id !== sale.id)];
    this.saveToLocalStorage(updated);
    return sale;
  }

  /**
   * Updates an existing POS sale record
   */
  async updateSale(sale: PosSale): Promise<PosSale> {
    sale.updatedAt = new Date().toISOString();

    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const supabase = getSupabaseClient();
        await (supabase.from('pos_sales' as any) as any)
          .update({
            status: sale.status,
            cancellation_reason: sale.cancellationReason,
            cancelled_by: sale.cancelledBy,
            cancelled_by_name: sale.cancelledByName,
            cancelled_at: sale.cancelledAt,
            amount_paid: sale.amountPaid,
            balance_due: sale.balanceDue,
            payment_status: sale.paymentStatus,
            notes: sale.notes,
            updated_at: sale.updatedAt,
          })
          .eq('id', sale.id);
      } catch (err) {
        console.warn('[PosRepository] Remote update failed, persisting locally:', err);
      }
    }

    const all = await this.getAllSales();
    const updated = all.map((s) => (s.id === sale.id ? sale : s));
    this.saveToLocalStorage(updated);
    return sale;
  }

  private applyFilters(sales: PosSale[], filters?: PosFilterParams): PosSale[] {
    if (!filters) return sales;

    let result = [...sales];

    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.saleReference.toLowerCase().includes(q) ||
          s.customerName.toLowerCase().includes(q) ||
          (s.customerPhone && s.customerPhone.toLowerCase().includes(q)) ||
          s.cashierName.toLowerCase().includes(q) ||
          s.items.some((i) => i.productName.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
      );
    }

    if (filters.locationId && filters.locationId !== 'all') {
      result = result.filter((s) => s.locationId === filters.locationId);
    }

    if (filters.paymentStatus && filters.paymentStatus !== 'all') {
      result = result.filter((s) => s.paymentStatus === filters.paymentStatus);
    }

    if (filters.paymentMethod && filters.paymentMethod !== 'all') {
      result = result.filter((s) => s.paymentMethod === filters.paymentMethod);
    }

    if (filters.status && filters.status !== 'all') {
      result = result.filter((s) => s.status === filters.status);
    }

    if (filters.cashierId && filters.cashierId !== 'all') {
      result = result.filter((s) => s.cashierId === filters.cashierId);
    }

    if (filters.startDate) {
      const start = new Date(filters.startDate).getTime();
      result = result.filter((s) => new Date(s.createdAt).getTime() >= start);
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate).getTime() + 86400000; // inclusive full day
      result = result.filter((s) => new Date(s.createdAt).getTime() <= end);
    }

    return result;
  }
}

export const posRepository = new PosRepository();
