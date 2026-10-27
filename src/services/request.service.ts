/**
 * Customer Request Service
 * Module 09 — Customer Requests & Quotation Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 */

import { requestRepository } from '../repositories/request.repository';
import { quotationRepository } from '../repositories/quotation.repository';
import { customerRepository } from '../repositories/customer.repository';
import { productRepository } from '../repositories/product.repository';
import { businessSettingsService } from './settings.service';
import { auditService } from './audit.service';
import {
  CustomerRequest,
  CreateCustomerRequestDTO,
  UpdateCustomerRequestDTO,
  RequestFilters,
  RequestStats,
  RequestStatus,
} from '../types/request';
import { Quotation, CreateQuotationItemDTO } from '../types/quotation';

export class RequestService {
  /**
   * Retrieves all requests with optional filters
   */
  async getRequests(filters?: RequestFilters): Promise<CustomerRequest[]> {
    return requestRepository.getAllRequests(filters);
  }

  /**
   * Retrieves single request by ID
   */
  async getRequestById(id: string): Promise<CustomerRequest | null> {
    return requestRepository.getRequestById(id);
  }

  /**
   * Retrieves single request by human-readable reference number
   */
  async getRequestByNumber(referenceNumber: string): Promise<CustomerRequest | null> {
    return requestRepository.getRequestByNumber(referenceNumber);
  }

  /**
   * Retrieves requests submitted by a specific customer
   */
  async getCustomerRequests(customerId: string): Promise<CustomerRequest[]> {
    return requestRepository.getRequestsByCustomerId(customerId);
  }

  /**
   * Submits a customer quote request (guest or authenticated)
   */
  async submitRequest(
    dto: CreateCustomerRequestDTO,
    actorProfile?: { id: string; email?: string }
  ): Promise<CustomerRequest> {
    // 1. Validation
    if (!dto.customerName || !dto.customerName.trim()) {
      throw new Error('Customer full name is required.');
    }
    if (!dto.customerPhone || !dto.customerPhone.trim()) {
      throw new Error('Contact phone or WhatsApp number is required.');
    }

    // 2. Auto-match or link existing customer if customerId not provided but phone matches
    let linkedCustomerId = dto.customerId || null;
    if (!linkedCustomerId) {
      try {
        const allCustomers = await customerRepository.getAllCustomers();
        const cleanTarget = dto.customerPhone.replace(/\D/g, '');
        const existingCustomer = allCustomers.find(
          (c) => c.phone && c.phone.replace(/\D/g, '') === cleanTarget
        );
        if (existingCustomer) {
          linkedCustomerId = existingCustomer.id;
        }
      } catch (err) {
        console.warn('[RequestService] Phone lookup check skipped:', err);
      }
    }

    const created = await requestRepository.createRequest({
      ...dto,
      customerId: linkedCustomerId,
    });

    // 3. Audit logging
    await auditService.logEvent({
      action: 'create',
      entity_type: 'customer_request',
      entity_id: created.id,
      reason: `New customer request #${created.requestNumber} logged for ${created.customerName}`,
      new_values: {
        requestNumber: created.requestNumber,
        requestType: created.requestType,
        customerPhone: created.customerPhone,
        itemCount: created.items.length,
      },
    });

    // 4. Module 22: Enqueue for server synchronization if offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        const { syncEngine } = await import('./sync/syncEngine');
        await syncEngine.enqueue({
          operationType: 'CREATE_REQUEST',
          entityType: 'request',
          localEntityId: created.id,
          payload: {
            clientRequestId: created.requestNumber,
            fullName: created.customerName,
            phone: created.customerPhone,
            email: created.customerEmail || undefined,
            deliveryAddress: created.projectAddress || '',
            landmark: created.projectCity || undefined,
            projectType: created.requestType,
            estimatedUnits: created.items?.reduce((s, it) => s + (it.quantity || 0), 0) || 0,
            productId: created.items?.[0]?.productId,
            notes: created.customerComments || undefined,
            offlineCreatedAt: created.createdAt,
          },
          actor: {
            userId: actorProfile?.id,
            userEmail: actorProfile?.email,
          },
        });
      } catch (queueErr) {
        console.warn('[RequestService] Offline queueing warning:', queueErr);
      }
    }

    return created;
  }

  /**
   * Updates request information
   */
  async updateRequest(
    id: string,
    dto: UpdateCustomerRequestDTO,
    actorProfile?: { id: string; email?: string }
  ): Promise<CustomerRequest> {
    const updated = await requestRepository.updateRequest(id, dto);

    await auditService.logEvent({
      action: 'update',
      entity_type: 'customer_request',
      entity_id: updated.id,
      reason: `Request #${updated.requestNumber} updated`,
      new_values: {
        requestNumber: updated.requestNumber,
        status: updated.status,
      },
    });

    return updated;
  }

  /**
   * Updates request status
   */
  async updateStatus(
    id: string,
    status: RequestStatus,
    note?: string,
    actorProfile?: { id: string; email?: string }
  ): Promise<CustomerRequest> {
    const updated = await requestRepository.updateStatus(id, status, note);

    await auditService.logEvent({
      action: 'update',
      entity_type: 'customer_request',
      entity_id: updated.id,
      reason: `Request #${updated.requestNumber} status changed to ${status}`,
      new_values: {
        requestNumber: updated.requestNumber,
        status,
        note,
      },
    });

    return updated;
  }

  /**
   * Assigns request to staff member
   */
  async assignStaff(
    id: string,
    staffId: string | null,
    staffName: string | null,
    actorProfile?: { id: string; email?: string }
  ): Promise<CustomerRequest> {
    const updated = await requestRepository.assignStaff(id, staffId, staffName);

    await auditService.logEvent({
      action: 'update',
      entity_type: 'customer_request',
      entity_id: updated.id,
      reason: `Request #${updated.requestNumber} assigned to ${staffName || 'Unassigned'}`,
      new_values: {
        requestNumber: updated.requestNumber,
        assignedTo: staffId,
        assignedToName: staffName,
      },
    });

    return updated;
  }

  /**
   * Appends internal staff note
   */
  async addInternalNote(
    id: string,
    noteText: string,
    authorName: string
  ): Promise<CustomerRequest> {
    return requestRepository.addInternalNote(id, noteText, authorName);
  }

  /**
   * Compiles and creates a draft quotation directly from a customer request
   * Automatically populates authoritative prices from Module 06 product catalogue.
   */
  async createQuotationFromRequest(
    requestId: string,
    staffUser?: { id: string; name: string }
  ): Promise<Quotation> {
    const req = await requestRepository.getRequestById(requestId);
    if (!req) {
      throw new Error(`Customer request with ID ${requestId} not found.`);
    }

    // 1. Fetch products to get authoritative selling prices
    const allProducts = await productRepository.getAllProducts();
    const productMap = new Map(allProducts.map((p) => [p.id, p]));

    // 2. Map request items to quotation items with prices
    const quotationItems: CreateQuotationItemDTO[] = [];

    if (req.items && req.items.length > 0) {
      for (const reqItem of req.items) {
        let unitPrice = 0;
        let sku = '';
        let desc = reqItem.itemName;
        let unit = reqItem.unit || 'piece';

        if (reqItem.productId && productMap.has(reqItem.productId)) {
          const prod = productMap.get(reqItem.productId)!;
          unitPrice = prod.sellingPrice;
          sku = prod.sku;
          unit = prod.unit;

          // Check if variant price override applies
          if (reqItem.variantId && prod.variants) {
            const variant = prod.variants.find((v) => v.id === reqItem.variantId);
            if (variant) {
              if (variant.priceOverride !== null && variant.priceOverride !== undefined) {
                unitPrice = variant.priceOverride;
              }
              sku = variant.sku || prod.sku;
              desc = `${prod.name} (${variant.name})`;
            }
          }
        }

        quotationItems.push({
          itemType: 'product',
          productId: reqItem.productId,
          variantId: reqItem.variantId,
          sku,
          description: desc,
          unit,
          quantity: reqItem.quantity,
          unitPrice,
          discountAmount: 0,
        });
      }
    } else {
      // General request without specific item breakdown
      quotationItems.push({
        itemType: 'custom',
        description: `Project Materials & Supply: ${req.customerComments || 'Custom inquiry specification'}`,
        unit: 'lot',
        quantity: 1,
        unitPrice: 0,
        discountAmount: 0,
      });
    }

    // 3. Set valid until date: 30 days from today
    const validityDate = new Date();
    validityDate.setDate(validityDate.getDate() + 30);
    const validUntilStr = validityDate.toISOString().split('T')[0];

    // 4. Default terms & payment notes from business settings
    const regional = await businessSettingsService.getRegionalSettings();

    const createdQuotation = await quotationRepository.createQuotation(
      {
        customerId: req.customerId,
        requestId: req.id,
        requestNumber: req.requestNumber,
        customerName: req.customerName,
        customerPhone: req.customerPhone,
        customerEmail: req.customerEmail,
        customerAddress: req.projectAddress
          ? `${req.projectAddress}, ${req.projectCity || ''}`.trim()
          : null,
        validUntil: validUntilStr,
        currency: regional?.currencyCode || 'NGN',
        status: 'draft',
        items: quotationItems,
        notes: `Prepared pursuant to client request #${req.requestNumber}. Preferred timeline: ${req.desiredTimeline || 'Standard supply queue'}.`,
        termsAndConditions:
          '1. Validity: 30 days from issue date.\n' +
          '2. Standard Payment Terms: 70% mobilization deposit upon order confirmation, 30% balance prior to factory dispatch.\n' +
          '3. Transport & Offloading: Flatbed truck access to site must be clear of low-hanging wires and unpaved swamp terrain.',
        internalNotes: `Auto-generated draft from Request #${req.requestNumber} on ${new Date().toLocaleString()}`,
      },
      staffUser
    );

    // 5. Link quotation back to request
    await requestRepository.linkQuotation(req.id, createdQuotation.id, createdQuotation.quotationNumber);

    // 6. Audit log
    await auditService.logEvent({
      action: 'create',
      entity_type: 'quotation',
      entity_id: createdQuotation.id,
      reason: `Quotation #${createdQuotation.quotationNumber} prepared from Request #${req.requestNumber}`,
      new_values: {
        quotationNumber: createdQuotation.quotationNumber,
        requestNumber: req.requestNumber,
        totalAmount: createdQuotation.totalAmount,
      },
    });

    return createdQuotation;
  }

  /**
   * Retrieves request statistics
   */
  async getStats(): Promise<RequestStats> {
    return requestRepository.getRequestStats();
  }
}

export const requestService = new RequestService();
