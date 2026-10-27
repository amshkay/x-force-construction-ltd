/**
 * Payment Repository
 * Module 10 — Orders, Payments & Customer Tracking
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Handles recording, verification, idempotent reference checks,
 * and persistence of financial transactions.
 */

import { getSupabaseClient, isNetworkOrFetchError, markRemoteDbUnavailable } from '../lib/supabase/client';
import { appConfig } from '../config/app.config';
import { localStore } from '../lib/storage/localStorage';
import { businessSettingsService } from '../services/settings.service';
import { PaymentRecord, RecordPaymentDTO } from '../types/payment';
import { Order } from '../types/order';
import { orderRepository } from './order.repository';
import { roundMoney } from '../utils/quotationCalculations';

const PAYMENTS_LOCAL_STORAGE_KEY = 'xforce_payments_cache_v1';

export class PaymentRepository {
  private memoryPayments: PaymentRecord[] | null = null;
  private isRemoteTableAvailable: boolean = true;
  private warnedAboutMissingTable: boolean = false;

  constructor() {
    const stored = localStore.get<PaymentRecord[] | null>(PAYMENTS_LOCAL_STORAGE_KEY, null);
    if (stored && Array.isArray(stored)) {
      this.memoryPayments = stored;
    } else {
      this.memoryPayments = [];
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
      msg.includes('relation "payments" does not exist') ||
      msg.includes('relation "public.payments" does not exist')
    );
  }

  private mapDbRowToPayment(row: any): PaymentRecord {
    return {
      id: row.id,
      paymentNumber: row.payment_number || `XFP-${row.id.substring(0, 8).toUpperCase()}`,
      orderId: row.order_id,
      orderNumber: row.order_number || '',
      quotationId: row.quotation_id ?? null,
      customerId: row.customer_id ?? null,
      customerName: row.customer_name || 'Client',
      amount: Number(row.amount) || 0,
      currency: row.currency || 'NGN',
      paymentMethod: row.payment_method || 'bank_transfer',
      paymentStatus: row.payment_status || 'completed',
      referenceNumber: row.reference_number || row.payment_reference || '',
      paymentDate: row.payment_date || row.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      provider: row.provider || 'manual',
      providerReference: row.provider_reference ?? null,
      bankName: row.bank_name ?? null,
      notes: row.notes ?? null,
      receiptUrl: row.receipt_url ?? null,
      recordedBy: row.recorded_by ?? null,
      recordedByName: row.recorded_by_name ?? null,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }

  private saveToLocalStorage(payments: PaymentRecord[]): void {
    try {
      localStore.set(PAYMENTS_LOCAL_STORAGE_KEY, payments);
      this.memoryPayments = payments;
    } catch (err) {
      console.warn('[PaymentRepository] Failed to write payments to localStorage:', err);
    }
  }

  /**
   * Generates sequential payment number
   * Format: {PREFIX}-{YEAR}-{SEQUENCE} e.g. XFP-2026-0001
   */
  async generateNextPaymentNumber(): Promise<string> {
    const numbering = await businessSettingsService.getNumberingSettings();
    const prefix = numbering?.defaultPaymentPrefix || 'XFP';
    const year = new Date().getFullYear();

    const allPayments = await this.getAllPayments();
    const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);

    let maxSeq = 0;
    for (const p of allPayments) {
      const match = p.paymentNumber?.match(pattern);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }

    const nextSeq = String(maxSeq + 1).padStart(4, '0');
    return `${prefix}-${year}-${nextSeq}`;
  }

  /**
   * Retrieve all payments or payments for an order
   */
  async getAllPayments(orderId?: string): Promise<PaymentRecord[]> {
    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const supabase = getSupabaseClient();
        let query = (supabase.from('payments' as any) as any)
          .select('*')
          .order('created_at', { ascending: false });

        if (orderId) {
          query = query.eq('order_id', orderId);
        }

        const { data: rows, error } = await query;
        if (error) {
          if (this.isTableMissingError(error)) {
            if (!this.warnedAboutMissingTable) {
              console.info('[PaymentRepository] Supabase payments table not active, using resilient local store.');
              this.warnedAboutMissingTable = true;
            }
            this.isRemoteTableAvailable = false;
          } else {
            console.warn('[PaymentRepository] Supabase query failed:', error);
          }
        } else if (rows) {
          const mapped = rows.map((r: any) => this.mapDbRowToPayment(r));
          this.saveToLocalStorage(mapped);
          return orderId ? mapped.filter((p: PaymentRecord) => p.orderId === orderId) : mapped;
        }
      } catch (err) {
        console.warn('[PaymentRepository] Remote connection failed:', err);
      }
    }

    const cached = this.memoryPayments || localStore.get<PaymentRecord[]>(PAYMENTS_LOCAL_STORAGE_KEY, []);
    return orderId ? cached.filter((p) => p.orderId === orderId) : cached;
  }

  /**
   * Retrieve single payment by id
   */
  async getPaymentById(id: string): Promise<PaymentRecord | null> {
    const all = await this.getAllPayments();
    return all.find((p) => p.id === id) || null;
  }

  /**
   * Check for duplicate reference number (Idempotency)
   * SECTION 10: Prevents double recording of same bank transaction or Paystack ref
   */
  async getPaymentByReference(referenceNumber: string): Promise<PaymentRecord | null> {
    if (!referenceNumber || !referenceNumber.trim()) return null;
    const cleanRef = referenceNumber.trim().toUpperCase();
    const all = await this.getAllPayments();
    return all.find((p) => p.referenceNumber.toUpperCase() === cleanRef) || null;
  }

  /**
   * Retrieve payments for customer
   */
  async getPaymentsByCustomerId(customerId: string): Promise<PaymentRecord[]> {
    const all = await this.getAllPayments();
    return all.filter((p) => p.customerId === customerId);
  }

  /**
   * Record a payment against an order
   * SECTION 9, 10, 11: Validates amount, checks idempotency, updates order totals
   */
  async recordPayment(dto: RecordPaymentDTO, order: Order): Promise<PaymentRecord> {
    const safeAmount = roundMoney(dto.amount);
    if (safeAmount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    // Idempotency verification
    if (dto.referenceNumber && dto.referenceNumber.trim()) {
      const existingRef = await this.getPaymentByReference(dto.referenceNumber.trim());
      if (existingRef && existingRef.paymentStatus === 'completed') {
        throw new Error(
          `Payment with reference "${dto.referenceNumber.trim()}" has already been processed on ${existingRef.paymentDate} for Order #${existingRef.orderNumber}.`
        );
      }
    }

    const newId = crypto.randomUUID();
    const paymentNumber = await this.generateNextPaymentNumber();
    const now = new Date().toISOString();
    const paymentDate = dto.paymentDate || now.split('T')[0];

    const newPayment: PaymentRecord = {
      id: newId,
      paymentNumber,
      orderId: order.id,
      orderNumber: order.orderNumber,
      quotationId: order.sourceQuotationId ?? null,
      customerId: order.customerId ?? null,
      customerName: order.customerName,
      amount: safeAmount,
      currency: order.currency || 'NGN',
      paymentMethod: dto.paymentMethod,
      paymentStatus: 'completed',
      referenceNumber: dto.referenceNumber?.trim() || `${paymentNumber}-REF`,
      paymentDate,
      provider: dto.provider || 'manual',
      providerReference: dto.providerReference ?? null,
      bankName: dto.bankName ?? null,
      notes: dto.notes ?? null,
      receiptUrl: dto.receiptUrl ?? null,
      recordedBy: dto.recordedBy ?? null,
      recordedByName: dto.recordedByName ?? null,
      createdAt: now,
      updatedAt: now,
    };

    // 1. Persist to Remote if active
    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const supabase = getSupabaseClient();
        await (supabase.from('payments' as any) as any).insert({
          id: newPayment.id,
          order_id: newPayment.orderId,
          amount: newPayment.amount,
          currency: newPayment.currency,
          payment_method: newPayment.paymentMethod,
          payment_status: newPayment.paymentStatus,
          payment_reference: newPayment.referenceNumber,
          notes: newPayment.notes,
          created_by: newPayment.recordedBy,
          created_at: newPayment.createdAt,
          updated_at: newPayment.updatedAt,
        });
      } catch (err) {
        console.warn('[PaymentRepository] Supabase insert failed, saving locally:', err);
      }
    }

    // 2. Persist to Local Storage
    const all = await this.getAllPayments();
    const updated = [newPayment, ...all.filter((p) => p.id !== newPayment.id)];
    this.saveToLocalStorage(updated);

    // 3. Update the associated order financials
    await orderRepository.applyPaymentToOrder(order.id, safeAmount);

    return newPayment;
  }

  /**
   * Record a payment associated with a direct POS counter sale
   * Reuses the existing payment records and storage without duplicating tables.
   */
  async recordPosPayment(dto: RecordPaymentDTO): Promise<PaymentRecord> {
    const safeAmount = roundMoney(dto.amount);
    if (safeAmount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    if (dto.referenceNumber && dto.referenceNumber.trim()) {
      const existingRef = await this.getPaymentByReference(dto.referenceNumber.trim());
      if (existingRef && existingRef.paymentStatus === 'completed') {
        throw new Error(
          `Payment with reference "${dto.referenceNumber.trim()}" has already been processed on ${existingRef.paymentDate}.`
        );
      }
    }

    const newId = crypto.randomUUID();
    const paymentNumber = await this.generateNextPaymentNumber();
    const now = new Date().toISOString();
    const paymentDate = dto.paymentDate || now.split('T')[0];

    const newPayment: PaymentRecord = {
      id: newId,
      paymentNumber,
      orderId: null,
      orderNumber: null,
      saleId: dto.saleId || null,
      saleReference: dto.saleReference || null,
      quotationId: null,
      customerId: dto.customerId ?? null,
      customerName: dto.customerName || 'Walk-in Customer',
      amount: safeAmount,
      currency: 'NGN',
      paymentMethod: dto.paymentMethod,
      paymentStatus: 'completed',
      referenceNumber: dto.referenceNumber?.trim() || `${paymentNumber}-REF`,
      paymentDate,
      provider: dto.provider || (dto.paymentMethod === 'paystack' ? 'paystack' : 'manual'),
      providerReference: dto.providerReference ?? null,
      bankName: dto.bankName ?? null,
      notes: dto.notes ?? null,
      receiptUrl: dto.receiptUrl ?? null,
      recordedBy: dto.recordedBy ?? null,
      recordedByName: dto.recordedByName ?? null,
      createdAt: now,
      updatedAt: now,
    };

    // 1. Persist to Remote if active
    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const supabase = getSupabaseClient();
        await (supabase.from('payments' as any) as any).insert({
          id: newPayment.id,
          order_id: null,
          amount: newPayment.amount,
          currency: newPayment.currency,
          payment_method: newPayment.paymentMethod,
          payment_status: newPayment.paymentStatus,
          payment_reference: newPayment.referenceNumber,
          notes: newPayment.notes,
          created_by: newPayment.recordedBy,
          created_at: newPayment.createdAt,
          updated_at: newPayment.updatedAt,
        });
      } catch (err) {
        console.warn('[PaymentRepository] Supabase insert failed, saving locally:', err);
      }
    }

    // 2. Persist to Local Storage
    const all = await this.getAllPayments();
    const updated = [newPayment, ...all.filter((p) => p.id !== newPayment.id)];
    this.saveToLocalStorage(updated);

    return newPayment;
  }
}

export const paymentRepository = new PaymentRepository();
