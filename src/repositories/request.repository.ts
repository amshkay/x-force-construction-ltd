/**
 * Customer Request Repository
 * Module 09 — Customer Requests & Quotation Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Implements resilient multi-tier persistence (Memory -> LocalStorage -> Supabase)
 * with robust offline support and human-readable reference number generation.
 */

import { getSupabaseClient, isNetworkOrFetchError, markRemoteDbUnavailable } from '../lib/supabase/client';
import { appConfig } from '../config/app.config';
import { localStore } from '../lib/storage/localStorage';
import { businessSettingsService } from '../services/settings.service';
import {
  CustomerRequest,
  CustomerRequestItem,
  CustomerRequestAttachment,
  CreateCustomerRequestDTO,
  UpdateCustomerRequestDTO,
  RequestFilters,
  RequestStats,
  RequestStatus,
} from '../types/request';

const REQUESTS_LOCAL_STORAGE_KEY = 'xforce_requests_cache_v1';

export class RequestRepository {
  private memoryCache: CustomerRequest[] | null = null;
  private isRemoteTableAvailable: boolean = true;
  private warnedAboutMissingTable: boolean = false;

  constructor() {
    const stored = localStore.get<CustomerRequest[] | null>(REQUESTS_LOCAL_STORAGE_KEY, null);
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
      msg.includes('relation "customer_requests" does not exist') ||
      msg.includes('relation "public.customer_requests" does not exist')
    );
  }

  private mapDbRowToRequest(row: any, items: any[] = []): CustomerRequest {
    const mappedItems: CustomerRequestItem[] = items.map((it) => ({
      id: it.id,
      requestId: it.request_id || row.id,
      productId: it.product_id ?? null,
      variantId: it.variant_id ?? null,
      itemName: it.item_name || 'Material Item',
      itemCategory: it.item_category ?? null,
      quantity: Number(it.quantity) || 1,
      unit: it.unit || 'piece',
      customerNotes: it.customer_notes ?? null,
      sortOrder: it.sort_order ?? 0,
      createdAt: it.created_at || row.created_at,
    }));

    let attachments: CustomerRequestAttachment[] = [];
    if (Array.isArray(row.attachments)) {
      attachments = row.attachments;
    } else if (typeof row.attachments === 'string') {
      try {
        attachments = JSON.parse(row.attachments);
      } catch {
        attachments = [];
      }
    }

    return {
      id: row.id,
      requestNumber: row.request_number,
      customerId: row.customer_id ?? null,
      requestType: row.request_type || 'general_quotation',
      status: row.status || 'submitted',
      customerName: row.customer_name || 'Anonymous Client',
      customerPhone: row.customer_phone || '',
      customerEmail: row.customer_email ?? null,
      companyName: row.company_name ?? null,
      projectAddress: row.project_address ?? null,
      projectCity: row.project_city ?? null,
      projectState: row.project_state ?? null,
      gpsLatitude: row.gps_latitude !== null && row.gps_latitude !== undefined ? Number(row.gps_latitude) : null,
      gpsLongitude: row.gps_longitude !== null && row.gps_longitude !== undefined ? Number(row.gps_longitude) : null,
      desiredTimeline: row.desired_timeline ?? null,
      preferredContactMethod: row.preferred_contact_method || 'phone',
      customerComments: row.customer_comments ?? null,
      internalNotes: row.internal_notes ?? null,
      assignedTo: row.assigned_to ?? null,
      assignedToName: row.assigned_to_name ?? null,
      items: mappedItems,
      attachments,
      quotationId: row.quotation_id ?? null,
      quotationNumber: row.quotation_number ?? null,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }

  private saveToLocalStorage(requests: CustomerRequest[]): void {
    try {
      this.memoryCache = [...requests];
      localStore.set(REQUESTS_LOCAL_STORAGE_KEY, requests);
    } catch (err) {
      console.warn('[RequestRepository] Failed to update localStorage cache:', err);
    }
  }

  /**
   * Generates a unique human-readable request reference number
   * Format: {PREFIX}-{YEAR}-{SEQUENCE} e.g. XFR-2026-0001
   */
  async generateNextRequestNumber(): Promise<string> {
    const numbering = await businessSettingsService.getNumberingSettings();
    const prefix = numbering?.defaultRequestPrefix || 'XFR';
    const year = new Date().getFullYear();

    const allRequests = await this.getAllRequests();
    const yearPrefix = `${prefix}-${year}-`;
    const yearRequests = allRequests.filter((r) => r.requestNumber.startsWith(yearPrefix));

    let maxSequence = 0;
    for (const r of yearRequests) {
      const parts = r.requestNumber.split('-');
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
   * Fetches all customer requests with optional filtering
   */
  async getAllRequests(filters?: RequestFilters): Promise<CustomerRequest[]> {
    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const supabase = getSupabaseClient();
        const { data: requestRows, error } = await supabase
          .from('customer_requests' as any)
          .select(`
            *,
            customer_request_items (*)
          `)
          .order('created_at', { ascending: false });

        if (error) {
          if (this.isTableMissingError(error)) {
            if (!this.warnedAboutMissingTable) {
              console.info('[RequestRepository] customer_requests table not yet present in Supabase. Using resilient local cache.');
              this.warnedAboutMissingTable = true;
            }
            this.isRemoteTableAvailable = false;
          } else {
            console.warn('[RequestRepository] Error querying customer_requests from Supabase:', error);
          }
        } else if (requestRows) {
          const mappedList = requestRows.map((r: any) =>
            this.mapDbRowToRequest(r, r.customer_request_items || [])
          );
          this.saveToLocalStorage(mappedList);
        }
      } catch (err) {
        console.warn('[RequestRepository] Supabase request query failed, using offline cache:', err);
      }
    }

    let results = this.memoryCache || [];

    if (filters) {
      if (filters.search) {
        const q = filters.search.toLowerCase().trim();
        results = results.filter(
          (r) =>
            r.requestNumber.toLowerCase().includes(q) ||
            r.customerName.toLowerCase().includes(q) ||
            r.customerPhone.toLowerCase().includes(q) ||
            (r.customerEmail && r.customerEmail.toLowerCase().includes(q)) ||
            (r.companyName && r.companyName.toLowerCase().includes(q)) ||
            (r.projectCity && r.projectCity.toLowerCase().includes(q)) ||
            r.items.some((it) => it.itemName.toLowerCase().includes(q))
        );
      }

      if (filters.status && filters.status !== 'all') {
        results = results.filter((r) => r.status === filters.status);
      }

      if (filters.requestType && filters.requestType !== 'all') {
        results = results.filter((r) => r.requestType === filters.requestType);
      }

      if (filters.customerId) {
        results = results.filter((r) => r.customerId === filters.customerId);
      }

      if (filters.assignedTo && filters.assignedTo !== 'all') {
        results = results.filter((r) => r.assignedTo === filters.assignedTo);
      }

      if (filters.dateFrom) {
        results = results.filter((r) => r.createdAt >= filters.dateFrom!);
      }

      if (filters.dateTo) {
        results = results.filter((r) => r.createdAt <= filters.dateTo!);
      }
    }

    return results;
  }

  /**
   * Retrieves single request by ID
   */
  async getRequestById(id: string): Promise<CustomerRequest | null> {
    const all = await this.getAllRequests();
    return all.find((r) => r.id === id) || null;
  }

  /**
   * Retrieves single request by human-readable reference number (case-insensitive)
   */
  async getRequestByNumber(referenceNumber: string): Promise<CustomerRequest | null> {
    const cleaned = referenceNumber.trim().toUpperCase();
    const all = await this.getAllRequests();
    return all.find((r) => r.requestNumber.toUpperCase() === cleaned) || null;
  }

  /**
   * Retrieves requests belonging to a specific customer ID
   */
  async getRequestsByCustomerId(customerId: string): Promise<CustomerRequest[]> {
    const all = await this.getAllRequests();
    return all.filter((r) => r.customerId === customerId);
  }

  /**
   * Creates a new customer request
   */
  async createRequest(dto: CreateCustomerRequestDTO): Promise<CustomerRequest> {
    const newId = crypto.randomUUID();
    const requestNumber = await this.generateNextRequestNumber();
    const now = new Date().toISOString();

    const requestItems: CustomerRequestItem[] = (dto.items || []).map((it, idx) => ({
      id: crypto.randomUUID(),
      requestId: newId,
      productId: it.productId ?? null,
      variantId: it.variantId ?? null,
      itemName: it.itemName,
      itemCategory: it.itemCategory ?? null,
      quantity: Number(it.quantity) || 1,
      unit: it.unit || 'piece',
      customerNotes: it.customerNotes ?? null,
      sortOrder: idx,
      createdAt: now,
    }));

    const newRequest: CustomerRequest = {
      id: newId,
      requestNumber,
      customerId: dto.customerId ?? null,
      requestType: dto.requestType || 'general_quotation',
      status: 'submitted',
      customerName: dto.customerName.trim(),
      customerPhone: dto.customerPhone.trim(),
      customerEmail: dto.customerEmail ? dto.customerEmail.trim() : null,
      companyName: dto.companyName ? dto.companyName.trim() : null,
      projectAddress: dto.projectAddress ? dto.projectAddress.trim() : null,
      projectCity: dto.projectCity ? dto.projectCity.trim() : null,
      projectState: dto.projectState ? dto.projectState.trim() : null,
      gpsLatitude: dto.gpsLatitude !== undefined && dto.gpsLatitude !== null ? Number(dto.gpsLatitude) : null,
      gpsLongitude: dto.gpsLongitude !== undefined && dto.gpsLongitude !== null ? Number(dto.gpsLongitude) : null,
      desiredTimeline: dto.desiredTimeline ?? null,
      preferredContactMethod: dto.preferredContactMethod || 'phone',
      customerComments: dto.customerComments ? dto.customerComments.trim() : null,
      internalNotes: dto.internalNotes ? dto.internalNotes.trim() : null,
      assignedTo: dto.assignedTo ?? null,
      assignedToName: dto.assignedToName ?? null,
      items: requestItems,
      attachments: dto.attachments || [],
      createdAt: now,
      updatedAt: now,
    };

    // 1. Try persisting to Supabase
    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const supabase = getSupabaseClient();
        const { error: reqError } = await (supabase.from('customer_requests' as any) as any).insert({
          id: newRequest.id,
          request_number: newRequest.requestNumber,
          customer_id: newRequest.customerId,
          request_type: newRequest.requestType,
          status: newRequest.status,
          customer_name: newRequest.customerName,
          customer_phone: newRequest.customerPhone,
          customer_email: newRequest.customerEmail,
          company_name: newRequest.companyName,
          project_address: newRequest.projectAddress,
          project_city: newRequest.projectCity,
          project_state: newRequest.projectState,
          gps_latitude: newRequest.gpsLatitude,
          gps_longitude: newRequest.gpsLongitude,
          desired_timeline: newRequest.desiredTimeline,
          preferred_contact_method: newRequest.preferredContactMethod,
          customer_comments: newRequest.customerComments,
          internal_notes: newRequest.internalNotes,
          assigned_to: newRequest.assignedTo,
          assigned_to_name: newRequest.assignedToName,
          attachments: newRequest.attachments,
          created_at: newRequest.createdAt,
          updated_at: newRequest.updatedAt,
        });

        if (reqError) {
          if (this.isTableMissingError(reqError)) {
            this.isRemoteTableAvailable = false;
          } else {
            console.warn('[RequestRepository] Error inserting customer_requests in Supabase:', reqError);
          }
        } else if (requestItems.length > 0) {
          // Insert items
          const itemsPayload = requestItems.map((it) => ({
            id: it.id,
            request_id: it.requestId,
            product_id: it.productId,
            variant_id: it.variantId,
            item_name: it.itemName,
            item_category: it.itemCategory,
            quantity: it.quantity,
            unit: it.unit,
            customer_notes: it.customerNotes,
            sort_order: it.sortOrder,
            created_at: it.createdAt,
          }));

          await (supabase.from('customer_request_items' as any) as any).insert(itemsPayload);
        }
      } catch (err) {
        console.warn('[RequestRepository] Supabase insert failed, saving locally:', err);
      }
    }

    // 2. Save locally
    const currentList = this.memoryCache || [];
    this.saveToLocalStorage([newRequest, ...currentList]);

    return newRequest;
  }

  /**
   * Updates an existing customer request
   */
  async updateRequest(id: string, dto: UpdateCustomerRequestDTO): Promise<CustomerRequest> {
    const existing = await this.getRequestById(id);
    if (!existing) {
      throw new Error(`Customer request with ID ${id} not found.`);
    }

    const now = new Date().toISOString();
    const updated: CustomerRequest = {
      ...existing,
      status: dto.status ?? existing.status,
      requestType: dto.requestType ?? existing.requestType,
      projectAddress: dto.projectAddress !== undefined ? dto.projectAddress : existing.projectAddress,
      projectCity: dto.projectCity !== undefined ? dto.projectCity : existing.projectCity,
      projectState: dto.projectState !== undefined ? dto.projectState : existing.projectState,
      desiredTimeline: dto.desiredTimeline !== undefined ? dto.desiredTimeline : existing.desiredTimeline,
      customerComments: dto.customerComments !== undefined ? dto.customerComments : existing.customerComments,
      internalNotes: dto.internalNotes !== undefined ? dto.internalNotes : existing.internalNotes,
      assignedTo: dto.assignedTo !== undefined ? dto.assignedTo : existing.assignedTo,
      assignedToName: dto.assignedToName !== undefined ? dto.assignedToName : existing.assignedToName,
      attachments: dto.attachments !== undefined ? dto.attachments : existing.attachments,
      updatedAt: now,
    };

    // Update in Supabase
    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const supabase = getSupabaseClient();
        await (supabase.from('customer_requests' as any) as any)
          .update({
            status: updated.status,
            request_type: updated.requestType,
            project_address: updated.projectAddress,
            project_city: updated.projectCity,
            project_state: updated.projectState,
            desired_timeline: updated.desiredTimeline,
            customer_comments: updated.customerComments,
            internal_notes: updated.internalNotes,
            assigned_to: updated.assignedTo,
            assigned_to_name: updated.assignedToName,
            attachments: updated.attachments,
            updated_at: updated.updatedAt,
          })
          .eq('id', id);
      } catch (err) {
        console.warn('[RequestRepository] Supabase update failed:', err);
      }
    }

    // Update local cache
    const currentList = this.memoryCache || [];
    const index = currentList.findIndex((r) => r.id === id);
    if (index >= 0) {
      currentList[index] = updated;
      this.saveToLocalStorage([...currentList]);
    }

    return updated;
  }

  /**
   * Updates status with optional appended internal audit note
   */
  async updateStatus(id: string, status: RequestStatus, note?: string): Promise<CustomerRequest> {
    const existing = await this.getRequestById(id);
    if (!existing) {
      throw new Error(`Request ${id} not found.`);
    }

    let internalNotes = existing.internalNotes || '';
    if (note && note.trim()) {
      const timestamp = new Date().toLocaleString();
      const newEntry = `[${timestamp} Status changed to "${status}"]: ${note.trim()}`;
      internalNotes = internalNotes ? `${internalNotes}\n${newEntry}` : newEntry;
    }

    return this.updateRequest(id, {
      status,
      internalNotes,
    });
  }

  /**
   * Assigns request to a staff member
   */
  async assignStaff(id: string, staffId: string | null, staffName: string | null): Promise<CustomerRequest> {
    return this.updateRequest(id, {
      assignedTo: staffId,
      assignedToName: staffName,
    });
  }

  /**
   * Appends an internal staff note
   */
  async addInternalNote(id: string, noteText: string, authorName: string): Promise<CustomerRequest> {
    const existing = await this.getRequestById(id);
    if (!existing) {
      throw new Error(`Request ${id} not found.`);
    }

    const timestamp = new Date().toLocaleString();
    const newEntry = `[${timestamp} - ${authorName}]: ${noteText.trim()}`;
    const internalNotes = existing.internalNotes ? `${existing.internalNotes}\n${newEntry}` : newEntry;

    return this.updateRequest(id, { internalNotes });
  }

  /**
   * Links a generated quotation to this request
   */
  async linkQuotation(requestId: string, quotationId: string, quotationNumber: string): Promise<void> {
    const existing = await this.getRequestById(requestId);
    if (!existing) return;

    const now = new Date().toISOString();
    const updated: CustomerRequest = {
      ...existing,
      quotationId,
      quotationNumber,
      status: 'quotation_prepared',
      updatedAt: now,
    };

    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const supabase = getSupabaseClient();
        await (supabase.from('customer_requests' as any) as any)
          .update({
            status: 'quotation_prepared',
            updated_at: now,
          })
          .eq('id', requestId);
      } catch (err) {
        console.warn('[RequestRepository] Error linking quotation in Supabase:', err);
      }
    }

    const currentList = this.memoryCache || [];
    const index = currentList.findIndex((r) => r.id === requestId);
    if (index >= 0) {
      currentList[index] = updated;
      this.saveToLocalStorage([...currentList]);
    }
  }

  /**
   * Computes dashboard statistics for requests
   */
  async getRequestStats(): Promise<RequestStats> {
    const all = await this.getAllRequests();
    return {
      total: all.length,
      submitted: all.filter((r) => r.status === 'submitted').length,
      underReview: all.filter((r) => r.status === 'under_review').length,
      quotationPrepared: all.filter((r) => r.status === 'quotation_prepared').length,
      quotationSent: all.filter((r) => r.status === 'quotation_sent').length,
      accepted: all.filter((r) => r.status === 'accepted').length,
      closed: all.filter((r) => r.status === 'closed' || r.status === 'cancelled').length,
    };
  }
}

export const requestRepository = new RequestRepository();
