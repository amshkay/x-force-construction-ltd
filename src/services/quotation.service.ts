/**
 * Quotation Service
 * Module 09 — Customer Requests & Quotation Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 */

import { quotationRepository } from '../repositories/quotation.repository';
import { requestRepository } from '../repositories/request.repository';
import { auditService } from './audit.service';
import {
  Quotation,
  CreateQuotationDTO,
  UpdateQuotationDTO,
  QuotationFilters,
  QuotationStats,
  QuotationStatus,
} from '../types/quotation';

export class QuotationService {
  /**
   * Retrieves all quotations with optional filters
   */
  async getQuotations(filters?: QuotationFilters): Promise<Quotation[]> {
    return quotationRepository.getAllQuotations(filters);
  }

  /**
   * Retrieves single quotation by ID
   */
  async getQuotationById(id: string): Promise<Quotation | null> {
    return quotationRepository.getQuotationById(id);
  }

  /**
   * Retrieves single quotation by human-readable reference number
   */
  async getQuotationByNumber(quotationNumber: string): Promise<Quotation | null> {
    return quotationRepository.getQuotationByNumber(quotationNumber);
  }

  /**
   * Retrieves quotations for a specific customer
   */
  async getCustomerQuotations(customerId: string): Promise<Quotation[]> {
    return quotationRepository.getQuotationsByCustomerId(customerId);
  }

  /**
   * Creates a new quotation
   */
  async createQuotation(
    dto: CreateQuotationDTO,
    staffUser?: { id: string; name: string }
  ): Promise<Quotation> {
    if (!dto.customerName || !dto.customerName.trim()) {
      throw new Error('Customer name is required.');
    }
    if (!dto.items || dto.items.length === 0) {
      throw new Error('At least one line item is required.');
    }

    const created = await quotationRepository.createQuotation(dto, staffUser);

    await auditService.logEvent({
      action: 'create',
      entity_type: 'quotation',
      entity_id: created.id,
      reason: `Quotation #${created.quotationNumber} generated for ${created.customerName}`,
      new_values: {
        quotationNumber: created.quotationNumber,
        totalAmount: created.totalAmount,
        itemCount: created.items.length,
      },
    });

    return created;
  }

  /**
   * Updates an existing quotation
   */
  async updateQuotation(id: string, dto: UpdateQuotationDTO): Promise<Quotation> {
    const updated = await quotationRepository.updateQuotation(id, dto);

    await auditService.logEvent({
      action: 'update',
      entity_type: 'quotation',
      entity_id: updated.id,
      reason: `Quotation #${updated.quotationNumber} updated`,
      new_values: {
        quotationNumber: updated.quotationNumber,
        status: updated.status,
        totalAmount: updated.totalAmount,
      },
    });

    return updated;
  }

  /**
   * Marks a quotation as sent to the customer
   */
  async sendQuotation(id: string, staffName?: string): Promise<Quotation> {
    const quote = await quotationRepository.getQuotationById(id);
    if (!quote) {
      throw new Error(`Quotation with ID ${id} not found.`);
    }

    const now = new Date().toISOString();
    const updated = await quotationRepository.updateQuotation(id, {
      status: 'sent',
      sentAt: now,
    });

    // If linked to a request, advance request status to 'quotation_sent'
    if (quote.requestId) {
      try {
        await requestRepository.updateStatus(quote.requestId, 'quotation_sent');
      } catch (err) {
        console.warn('[QuotationService] Failed to update request status on send:', err);
      }
    }

    await auditService.logEvent({
      action: 'update',
      entity_type: 'quotation',
      entity_id: updated.id,
      reason: `Quotation #${updated.quotationNumber} sent to client ${updated.customerName}`,
      new_values: {
        quotationNumber: updated.quotationNumber,
        staffName,
      },
    });

    return updated;
  }

  /**
   * Marks a quotation as viewed by customer
   */
  async markAsViewed(id: string): Promise<Quotation> {
    const quote = await quotationRepository.getQuotationById(id);
    if (!quote) {
      throw new Error(`Quotation with ID ${id} not found.`);
    }

    if (quote.status === 'sent') {
      return quotationRepository.updateQuotation(id, {
        status: 'viewed',
        viewedAt: new Date().toISOString(),
      });
    }

    return quote;
  }

  /**
   * Customer accepts quotation terms
   * STRICT BOUNDARY: Records acceptance ONLY.
   * Does NOT create an order (conversion to order belongs to Module 10).
   */
  async acceptQuotation(
    id: string,
    acceptedByName: string,
    remarks?: string
  ): Promise<Quotation> {
    const quote = await quotationRepository.getQuotationById(id);
    if (!quote) {
      throw new Error(`Quotation with ID ${id} not found.`);
    }

    if (quote.status === 'cancelled' || quote.status === 'expired') {
      throw new Error(`Cannot accept quotation in "${quote.status}" status.`);
    }

    const updated = await quotationRepository.recordCustomerAcceptance(
      id,
      acceptedByName,
      remarks
    );

    // Update linked request if present
    if (quote.requestId) {
      try {
        await requestRepository.updateStatus(
          quote.requestId,
          'accepted',
          `Quotation #${quote.quotationNumber} accepted by customer.`
        );
      } catch (err) {
        console.warn('[QuotationService] Failed to advance request status:', err);
      }
    }

    await auditService.logEvent({
      action: 'update',
      entity_type: 'quotation',
      entity_id: updated.id,
      reason: `Quotation #${updated.quotationNumber} formally accepted by ${acceptedByName}`,
      new_values: {
        quotationNumber: updated.quotationNumber,
        acceptedBy: acceptedByName,
        totalAmount: updated.totalAmount,
      },
    });

    return updated;
  }

  /**
   * Customer or sales desk records quotation decline
   */
  async declineQuotation(id: string, reason?: string): Promise<Quotation> {
    const quote = await quotationRepository.getQuotationById(id);
    if (!quote) {
      throw new Error(`Quotation with ID ${id} not found.`);
    }

    const updated = await quotationRepository.recordCustomerDecline(id, reason);

    if (quote.requestId) {
      try {
        await requestRepository.updateStatus(
          quote.requestId,
          'declined',
          `Quotation #${quote.quotationNumber} declined by customer: ${reason || 'No reason provided'}`
        );
      } catch (err) {
        console.warn('[QuotationService] Failed to advance request status:', err);
      }
    }

    await auditService.logEvent({
      action: 'update',
      entity_type: 'quotation',
      entity_id: updated.id,
      reason: `Quotation #${updated.quotationNumber} declined`,
      new_values: {
        quotationNumber: updated.quotationNumber,
        reason,
      },
    });

    return updated;
  }

  /**
   * Cancels quotation
   */
  async cancelQuotation(id: string, reason?: string): Promise<Quotation> {
    const updated = await quotationRepository.updateStatus(id, 'cancelled', reason);

    await auditService.logEvent({
      action: 'update',
      entity_type: 'quotation',
      entity_id: updated.id,
      reason: `Quotation #${updated.quotationNumber} cancelled`,
      new_values: {
        quotationNumber: updated.quotationNumber,
        reason,
      },
    });

    return updated;
  }

  /**
   * Retrieves quotation metrics
   */
  async getStats(): Promise<QuotationStats> {
    return quotationRepository.getQuotationStats();
  }

  /**
   * Module 10: Convert accepted quotation to order
   */
  async convertToOrder(id: string, options?: any) {
    const { orderService } = await import('./order.service');
    return orderService.convertQuotationToOrder(id, options);
  }
}

export const quotationService = new QuotationService();
