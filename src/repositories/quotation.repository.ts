/**
 * Quotation Repository
 * Module 09 — Customer Requests & Quotation Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Implements resilient multi-tier persistence (Memory -> LocalStorage -> Supabase)
 * with safe financial calculation snapshots and quotation numbering.
 */

import { getSupabaseClient, isNetworkOrFetchError, markRemoteDbUnavailable } from '../lib/supabase/client';
import { appConfig } from '../config/app.config';
import { localStore } from '../lib/storage/localStorage';
import { businessSettingsService } from '../services/settings.service';
import {
  Quotation,
  QuotationItem,
  CreateQuotationDTO,
  UpdateQuotationDTO,
  QuotationFilters,
  QuotationStats,
  QuotationStatus,
} from '../types/quotation';
import { calculateQuotationFinancials } from '../utils/quotationCalculations';

const QUOTATIONS_LOCAL_STORAGE_KEY = 'xforce_quotations_cache_v1';

export class QuotationRepository {
  private memoryCache: Quotation[] | null = null;
  private isRemoteTableAvailable: boolean = true;
  private warnedAboutMissingTable: boolean = false;

  constructor() {
    const stored = localStore.get<Quotation[] | null>(QUOTATIONS_LOCAL_STORAGE_KEY, null);
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
      msg.includes('relation "quotations" does not exist') ||
      msg.includes('relation "public.quotations" does not exist')
    );
  }

  private mapDbRowToQuotation(row: any, items: any[] = []): Quotation {
    const mappedItems: QuotationItem[] = items.map((it) => ({
      id: it.id,
      quotationId: it.quotation_id || row.id,
      itemType: it.item_type || 'product',
      productId: it.product_id ?? null,
      variantId: it.variant_id ?? null,
      sku: it.sku ?? null,
      description: it.description || 'Quoted Item',
      unit: it.unit || 'piece',
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unit_price) || 0,
      discountAmount: Number(it.discount_amount) || 0,
      lineTotal: Number(it.line_total) || 0,
      sortOrder: it.sort_order ?? 0,
      createdAt: it.created_at || row.created_at,
    }));

    return {
      id: row.id,
      quotationNumber: row.quotation_number,
      customerId: row.customer_id ?? null,
      requestId: row.request_id ?? null,
      requestNumber: row.request_number ?? null,
      customerName: row.customer_name || 'Client',
      customerPhone: row.customer_phone || '',
      customerEmail: row.customer_email ?? null,
      customerAddress: row.customer_address ?? null,
      status: row.status || 'draft',
      quotationDate: row.quotation_date || new Date().toISOString().split('T')[0],
      validUntil: row.valid_until || new Date().toISOString().split('T')[0],
      currency: row.currency || 'NGN',

      subtotal: Number(row.subtotal) || 0,
      discountAmount: Number(row.discount_amount) || 0,
      discountPercentage: Number(row.discount_percentage) || 0,
      deliveryFee: Number(row.delivery_fee) || 0,
      installationFee: Number(row.installation_fee) || 0,
      otherChargesFee: Number(row.other_charges_fee) || 0,
      otherChargesDescription: row.other_charges_description ?? null,
      taxRate: Number(row.tax_rate) || 0,
      taxAmount: Number(row.tax_amount) || 0,
      totalAmount: Number(row.total_amount) || 0,
      depositRequired: Number(row.deposit_required) || 0,
      balanceDue: Number(row.balance_due) || 0,

      notes: row.notes ?? null,
      termsAndConditions: row.terms_and_conditions ?? null,
      internalNotes: row.internal_notes ?? null,

      createdBy: row.created_by ?? null,
      createdByName: row.created_by_name ?? null,
      acceptedAt: row.accepted_at ?? null,
      acceptedBy: row.accepted_by ?? null,
      declinedAt: row.declined_at ?? null,
      declineReason: row.decline_reason ?? null,
      sentAt: row.sent_at ?? null,
      viewedAt: row.viewed_at ?? null,

      items: mappedItems,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }

  private saveToLocalStorage(quotations: Quotation[]): void {
    try {
      this.memoryCache = [...quotations];
      localStore.set(QUOTATIONS_LOCAL_STORAGE_KEY, quotations);
    } catch (err) {
      console.warn('[QuotationRepository] Failed to update localStorage cache:', err);
    }
  }

  /**
   * Generates a unique human-readable quotation reference number
   * Format: {PREFIX}-{YEAR}-{SEQUENCE} e.g. XFQ-2026-0001
   */
  async generateNextQuotationNumber(): Promise<string> {
    const numbering = await businessSettingsService.getNumberingSettings();
    const prefix = numbering?.defaultQuotationPrefix || 'XFQ';
    const year = new Date().getFullYear();

    const allQuotations = await this.getAllQuotations();
    const yearPrefix = `${prefix}-${year}-`;
    const yearQuotations = allQuotations.filter((q) => q.quotationNumber.startsWith(yearPrefix));

    let maxSequence = 0;
    for (const q of yearQuotations) {
      const parts = q.quotationNumber.split('-');
      if (parts.length >= 3) {
        const seq = parseInt(parts[2], 10);
        if (!isNaN(seq) && seq > maxSequence) {
          maxSequence = seq;
        }
      }
    }

    const nextSeq = (maxSequence + 1).toString().padStart(4, '0');
    return `${prefix}-${year}-${nextSeq}`;
  }

  /**
   * Fetches all quotations with optional filtering
   */
  async getAllQuotations(filters?: QuotationFilters): Promise<Quotation[]> {
    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const supabase = getSupabaseClient();
        const { data: quoteRows, error } = await (supabase.from('quotations' as any) as any)
          .select(`
            *,
            quotation_items (*)
          `)
          .order('quotation_date', { ascending: false });

        if (error) {
          if (this.isTableMissingError(error)) {
            if (!this.warnedAboutMissingTable) {
              console.info('[QuotationRepository] quotations table not yet present in Supabase. Using resilient local cache.');
              this.warnedAboutMissingTable = true;
            }
            this.isRemoteTableAvailable = false;
          } else {
            console.warn('[QuotationRepository] Error querying quotations from Supabase:', error);
          }
        } else if (quoteRows) {
          const mappedList = quoteRows.map((q: any) =>
            this.mapDbRowToQuotation(q, q.quotation_items || [])
          );
          this.saveToLocalStorage(mappedList);
        }
      } catch (err) {
        console.warn('[QuotationRepository] Supabase quotations query failed, using offline cache:', err);
      }
    }

    let results = this.memoryCache || [];

    if (filters) {
      if (filters.search) {
        const q = filters.search.toLowerCase().trim();
        results = results.filter(
          (quote) =>
            quote.quotationNumber.toLowerCase().includes(q) ||
            quote.customerName.toLowerCase().includes(q) ||
            quote.customerPhone.toLowerCase().includes(q) ||
            (quote.customerEmail && quote.customerEmail.toLowerCase().includes(q)) ||
            (quote.requestNumber && quote.requestNumber.toLowerCase().includes(q))
        );
      }

      if (filters.status && filters.status !== 'all') {
        results = results.filter((quote) => quote.status === filters.status);
      }

      if (filters.customerId) {
        results = results.filter((quote) => quote.customerId === filters.customerId);
      }

      if (filters.requestId) {
        results = results.filter((quote) => quote.requestId === filters.requestId);
      }

      if (filters.dateFrom) {
        results = results.filter((quote) => quote.quotationDate >= filters.dateFrom!);
      }

      if (filters.dateTo) {
        results = results.filter((quote) => quote.quotationDate <= filters.dateTo!);
      }
    }

    return results;
  }

  /**
   * Retrieves single quotation by ID
   */
  async getQuotationById(id: string): Promise<Quotation | null> {
    const all = await this.getAllQuotations();
    return all.find((q) => q.id === id) || null;
  }

  /**
   * Retrieves single quotation by quotation number (case-insensitive)
   */
  async getQuotationByNumber(quotationNumber: string): Promise<Quotation | null> {
    const cleaned = quotationNumber.trim().toUpperCase();
    const all = await this.getAllQuotations();
    return all.find((q) => q.quotationNumber.toUpperCase() === cleaned) || null;
  }

  /**
   * Retrieves quotations for a given customer
   */
  async getQuotationsByCustomerId(customerId: string): Promise<Quotation[]> {
    const all = await this.getAllQuotations();
    return all.filter((q) => q.customerId === customerId);
  }

  /**
   * Creates a new quotation
   */
  async createQuotation(
    dto: CreateQuotationDTO,
    createdByStaff?: { id: string; name: string }
  ): Promise<Quotation> {
    const newId = crypto.randomUUID();
    const quotationNumber = await this.generateNextQuotationNumber();
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    // Compute safe financials
    const financials = calculateQuotationFinancials({
      items: dto.items,
      discountAmount: dto.discountAmount,
      discountPercentage: dto.discountPercentage,
      deliveryFee: dto.deliveryFee,
      installationFee: dto.installationFee,
      otherChargesFee: dto.otherChargesFee,
      taxRate: dto.taxRate,
      explicitDepositRequired: dto.depositRequired,
    });

    const quotationItems: QuotationItem[] = dto.items.map((it, idx) => {
      const qty = Math.max(0, Number(it.quantity) || 1);
      const price = Math.max(0, Number(it.unitPrice) || 0);
      const disc = Math.max(0, Number(it.discountAmount) || 0);
      const lineTotal = Math.max(0, qty * price - disc);

      return {
        id: crypto.randomUUID(),
        quotationId: newId,
        itemType: it.itemType || 'product',
        productId: it.productId ?? null,
        variantId: it.variantId ?? null,
        sku: it.sku ?? null,
        description: it.description,
        unit: it.unit || 'piece',
        quantity: qty,
        unitPrice: price,
        discountAmount: disc,
        lineTotal,
        sortOrder: idx,
        createdAt: now,
      };
    });

    const regional = await businessSettingsService.getRegionalSettings();
    const currency = dto.currency || regional?.currencyCode || 'NGN';

    const newQuotation: Quotation = {
      id: newId,
      quotationNumber,
      customerId: dto.customerId ?? null,
      requestId: dto.requestId ?? null,
      requestNumber: dto.requestNumber ?? null,
      customerName: dto.customerName.trim(),
      customerPhone: dto.customerPhone.trim(),
      customerEmail: dto.customerEmail ? dto.customerEmail.trim() : null,
      customerAddress: dto.customerAddress ? dto.customerAddress.trim() : null,
      status: dto.status || 'draft',
      quotationDate: dto.quotationDate || today,
      validUntil: dto.validUntil,
      currency,

      subtotal: financials.subtotal,
      discountAmount: financials.discountAmount,
      discountPercentage: dto.discountPercentage || 0,
      deliveryFee: financials.deliveryFee,
      installationFee: financials.installationFee,
      otherChargesFee: financials.otherChargesFee,
      otherChargesDescription: dto.otherChargesDescription ?? null,
      taxRate: financials.taxRate,
      taxAmount: financials.taxAmount,
      totalAmount: financials.totalAmount,
      depositRequired: financials.depositRequired,
      balanceDue: financials.balanceDue,

      notes: dto.notes ? dto.notes.trim() : null,
      termsAndConditions: dto.termsAndConditions ? dto.termsAndConditions.trim() : null,
      internalNotes: dto.internalNotes ? dto.internalNotes.trim() : null,

      createdBy: createdByStaff?.id ?? null,
      createdByName: createdByStaff?.name ?? null,
      acceptedAt: null,
      acceptedBy: null,
      declinedAt: null,
      declineReason: null,
      sentAt: dto.status === 'sent' ? now : null,
      viewedAt: null,

      items: quotationItems,
      createdAt: now,
      updatedAt: now,
    };

    // 1. Try persisting to Supabase
    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const supabase = getSupabaseClient();
        const { error: quoteErr } = await (supabase.from('quotations' as any) as any).insert({
          id: newQuotation.id,
          quotation_number: newQuotation.quotationNumber,
          customer_id: newQuotation.customerId,
          request_id: newQuotation.requestId,
          status: newQuotation.status,
          quotation_date: newQuotation.quotationDate,
          valid_until: newQuotation.validUntil,
          subtotal: newQuotation.subtotal,
          discount_amount: newQuotation.discountAmount,
          delivery_fee: newQuotation.deliveryFee,
          installation_fee: newQuotation.installationFee,
          tax_amount: newQuotation.taxAmount,
          total_amount: newQuotation.totalAmount,
          deposit_required: newQuotation.depositRequired,
          balance_due: newQuotation.balanceDue,
          notes: newQuotation.notes,
          terms_and_conditions: newQuotation.termsAndConditions,
          created_by: newQuotation.createdBy,
          customer_name: newQuotation.customerName,
          customer_phone: newQuotation.customerPhone,
          customer_email: newQuotation.customerEmail,
          customer_address: newQuotation.customerAddress,
          currency: newQuotation.currency,
          discount_percentage: newQuotation.discountPercentage,
          other_charges_fee: newQuotation.otherChargesFee,
          other_charges_description: newQuotation.otherChargesDescription,
          tax_rate: newQuotation.taxRate,
          internal_notes: newQuotation.internalNotes,
          created_at: newQuotation.createdAt,
          updated_at: newQuotation.updatedAt,
        });

        if (quoteErr) {
          if (this.isTableMissingError(quoteErr)) {
            this.isRemoteTableAvailable = false;
          } else {
            console.warn('[QuotationRepository] Error inserting quotation in Supabase:', quoteErr);
          }
        } else if (quotationItems.length > 0) {
          const itemsPayload = quotationItems.map((it) => ({
            id: it.id,
            quotation_id: it.quotationId,
            item_type: it.itemType,
            product_id: it.productId,
            variant_id: it.variantId,
            sku: it.sku,
            description: it.description,
            unit: it.unit,
            quantity: it.quantity,
            unit_price: it.unitPrice,
            discount_amount: it.discountAmount,
            line_total: it.lineTotal,
            sort_order: it.sortOrder,
            created_at: it.createdAt,
          }));

          await (supabase.from('quotation_items' as any) as any).insert(itemsPayload);
        }
      } catch (err) {
        console.warn('[QuotationRepository] Supabase insert failed, saving locally:', err);
      }
    }

    // 2. Save locally
    const currentList = this.memoryCache || [];
    this.saveToLocalStorage([newQuotation, ...currentList]);

    return newQuotation;
  }

  /**
   * Updates an existing quotation
   */
  async updateQuotation(id: string, dto: UpdateQuotationDTO): Promise<Quotation> {
    const existing = await this.getQuotationById(id);
    if (!existing) {
      throw new Error(`Quotation with ID ${id} not found.`);
    }

    const now = new Date().toISOString();

    // Recalculate financials if items or adjustments changed
    const itemsToCalculate = dto.items || existing.items;
    const financials = calculateQuotationFinancials({
      items: itemsToCalculate,
      discountAmount: dto.discountAmount !== undefined ? dto.discountAmount : existing.discountAmount,
      discountPercentage: dto.discountPercentage !== undefined ? dto.discountPercentage : existing.discountPercentage,
      deliveryFee: dto.deliveryFee !== undefined ? dto.deliveryFee : existing.deliveryFee,
      installationFee: dto.installationFee !== undefined ? dto.installationFee : existing.installationFee,
      otherChargesFee: dto.otherChargesFee !== undefined ? dto.otherChargesFee : existing.otherChargesFee,
      taxRate: dto.taxRate !== undefined ? dto.taxRate : existing.taxRate,
      explicitDepositRequired: dto.depositRequired !== undefined ? dto.depositRequired : existing.depositRequired,
    });

    let updatedItems = existing.items;
    if (dto.items) {
      updatedItems = dto.items.map((it, idx) => {
        const qty = Math.max(0, Number(it.quantity) || 1);
        const price = Math.max(0, Number(it.unitPrice) || 0);
        const disc = Math.max(0, Number(it.discountAmount) || 0);
        return {
          id: crypto.randomUUID(),
          quotationId: id,
          itemType: it.itemType || 'product',
          productId: it.productId ?? null,
          variantId: it.variantId ?? null,
          sku: it.sku ?? null,
          description: it.description,
          unit: it.unit || 'piece',
          quantity: qty,
          unitPrice: price,
          discountAmount: disc,
          lineTotal: Math.max(0, qty * price - disc),
          sortOrder: idx,
          createdAt: now,
        };
      });
    }

    const updated: Quotation = {
      ...existing,
      status: dto.status ?? existing.status,
      validUntil: dto.validUntil ?? existing.validUntil,
      notes: dto.notes !== undefined ? dto.notes : existing.notes,
      termsAndConditions: dto.termsAndConditions !== undefined ? dto.termsAndConditions : existing.termsAndConditions,
      internalNotes: dto.internalNotes !== undefined ? dto.internalNotes : existing.internalNotes,
      subtotal: financials.subtotal,
      discountAmount: financials.discountAmount,
      discountPercentage: dto.discountPercentage !== undefined ? dto.discountPercentage : existing.discountPercentage,
      deliveryFee: financials.deliveryFee,
      installationFee: financials.installationFee,
      otherChargesFee: financials.otherChargesFee,
      otherChargesDescription: dto.otherChargesDescription !== undefined ? dto.otherChargesDescription : existing.otherChargesDescription,
      taxRate: financials.taxRate,
      taxAmount: financials.taxAmount,
      totalAmount: financials.totalAmount,
      depositRequired: financials.depositRequired,
      balanceDue: financials.balanceDue,
      acceptedAt: dto.acceptedAt !== undefined ? dto.acceptedAt : existing.acceptedAt,
      acceptedBy: dto.acceptedBy !== undefined ? dto.acceptedBy : existing.acceptedBy,
      declinedAt: dto.declinedAt !== undefined ? dto.declinedAt : existing.declinedAt,
      declineReason: dto.declineReason !== undefined ? dto.declineReason : existing.declineReason,
      sentAt: dto.sentAt !== undefined ? dto.sentAt : existing.sentAt,
      viewedAt: dto.viewedAt !== undefined ? dto.viewedAt : existing.viewedAt,
      items: updatedItems,
      updatedAt: now,
    };

    // Update in Supabase
    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const supabase = getSupabaseClient();
        await (supabase.from('quotations' as any) as any)
          .update({
            status: updated.status,
            valid_until: updated.validUntil,
            subtotal: updated.subtotal,
            discount_amount: updated.discountAmount,
            delivery_fee: updated.deliveryFee,
            installation_fee: updated.installationFee,
            tax_amount: updated.taxAmount,
            total_amount: updated.totalAmount,
            deposit_required: updated.depositRequired,
            balance_due: updated.balanceDue,
            notes: updated.notes,
            terms_and_conditions: updated.termsAndConditions,
            internal_notes: updated.internalNotes,
            discount_percentage: updated.discountPercentage,
            other_charges_fee: updated.otherChargesFee,
            other_charges_description: updated.otherChargesDescription,
            tax_rate: updated.taxRate,
            accepted_at: updated.acceptedAt,
            accepted_by: updated.acceptedBy,
            declined_at: updated.declinedAt,
            decline_reason: updated.declineReason,
            sent_at: updated.sentAt,
            viewed_at: updated.viewedAt,
            updated_at: updated.updatedAt,
          })
          .eq('id', id);
      } catch (err) {
        console.warn('[QuotationRepository] Supabase update failed:', err);
      }
    }

    // Update local cache
    const currentList = this.memoryCache || [];
    const index = currentList.findIndex((q) => q.id === id);
    if (index >= 0) {
      currentList[index] = updated;
      this.saveToLocalStorage([...currentList]);
    }

    return updated;
  }

  /**
   * Updates quotation status
   */
  async updateStatus(id: string, status: QuotationStatus, note?: string): Promise<Quotation> {
    const existing = await this.getQuotationById(id);
    if (!existing) {
      throw new Error(`Quotation ${id} not found.`);
    }

    const now = new Date().toISOString();
    let sentAt = existing.sentAt;
    if (status === 'sent' && !sentAt) {
      sentAt = now;
    }

    let internalNotes = existing.internalNotes || '';
    if (note && note.trim()) {
      const timestamp = new Date().toLocaleString();
      const newEntry = `[${timestamp} Status changed to "${status}"]: ${note.trim()}`;
      internalNotes = internalNotes ? `${internalNotes}\n${newEntry}` : newEntry;
    }

    return this.updateQuotation(id, {
      status,
      sentAt,
      internalNotes,
    });
  }

  /**
   * Records customer acceptance of quotation
   * STRICT BOUNDARY: Records acceptance ONLY. Does NOT create an order (Module 10).
   */
  async recordCustomerAcceptance(
    id: string,
    acceptedByName: string,
    remarks?: string
  ): Promise<Quotation> {
    const existing = await this.getQuotationById(id);
    if (!existing) {
      throw new Error(`Quotation ${id} not found.`);
    }

    const now = new Date().toISOString();
    const timestamp = new Date().toLocaleString();
    let internalNotes = existing.internalNotes || '';
    const noteText = remarks ? ` Remarks: ${remarks.trim()}` : '';
    const newEntry = `[${timestamp} Formal Acceptance Recorded]: Accepted by ${acceptedByName}.${noteText}`;
    internalNotes = internalNotes ? `${internalNotes}\n${newEntry}` : newEntry;

    return this.updateQuotation(id, {
      status: 'accepted',
      acceptedAt: now,
      acceptedBy: acceptedByName.trim(),
      internalNotes,
    });
  }

  /**
   * Records customer rejection of quotation
   */
  async recordCustomerDecline(id: string, reason?: string): Promise<Quotation> {
    const existing = await this.getQuotationById(id);
    if (!existing) {
      throw new Error(`Quotation ${id} not found.`);
    }

    const now = new Date().toISOString();
    const timestamp = new Date().toLocaleString();
    let internalNotes = existing.internalNotes || '';
    const newEntry = `[${timestamp} Quotation Declined]: Reason: ${reason || 'Not specified'}`;
    internalNotes = internalNotes ? `${internalNotes}\n${newEntry}` : newEntry;

    return this.updateQuotation(id, {
      status: 'declined',
      declinedAt: now,
      declineReason: reason || 'Declined by customer',
      internalNotes,
    });
  }

  /**
   * Computes aggregate metrics for quotations
   */
  async getQuotationStats(): Promise<QuotationStats> {
    const all = await this.getAllQuotations();
    const acceptedQuotes = all.filter((q) => q.status === 'accepted');

    return {
      total: all.length,
      drafts: all.filter((q) => q.status === 'draft').length,
      pendingApproval: all.filter((q) => q.status === 'pending_approval').length,
      sent: all.filter((q) => q.status === 'sent' || q.status === 'viewed').length,
      accepted: acceptedQuotes.length,
      declined: all.filter((q) => q.status === 'declined').length,
      expired: all.filter((q) => q.status === 'expired').length,
      totalQuotedValue: all.reduce((sum, q) => sum + (q.totalAmount || 0), 0),
      totalAcceptedValue: acceptedQuotes.reduce((sum, q) => sum + (q.totalAmount || 0), 0),
    };
  }
}

export const quotationRepository = new QuotationRepository();
