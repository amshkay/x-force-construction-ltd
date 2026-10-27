/**
 * Payment Service
 * Module 10 — Orders, Payments & Customer Tracking
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Handles recording manual and online transactions, idempotent processing,
 * receipt generation, and audit logging.
 */

import { paymentRepository } from '../repositories/payment.repository';
import { orderRepository } from '../repositories/order.repository';
import { businessSettingsService } from './settings.service';
import { auditService } from './audit.service';
import { paystackService } from './paystack.service';
import {
  PaymentRecord,
  RecordPaymentDTO,
  PaymentReceiptData,
  PAYMENT_METHOD_CONFIG,
} from '../types/payment';
import { Order } from '../types/order';
import { roundMoney } from '../utils/quotationCalculations';

export class PaymentService {
  /**
   * Retrieve all payments for an order
   */
  async getPaymentsForOrder(orderId: string): Promise<PaymentRecord[]> {
    return paymentRepository.getAllPayments(orderId);
  }

  /**
   * Retrieve payment by ID
   */
  async getPaymentById(id: string): Promise<PaymentRecord | null> {
    return paymentRepository.getPaymentById(id);
  }

  /**
   * Record a payment (Bank Transfer, Cash, POS Card, etc.)
   * SECTION 9 & 11: Validates order state, amount limits, updates balances
   */
  async recordPayment(dto: RecordPaymentDTO): Promise<{ payment: PaymentRecord; order: Order }> {
    if (!dto.orderId) {
      throw new Error('Order ID is required to record order payment.');
    }
    const order = await orderRepository.getOrderById(dto.orderId);
    if (!order) {
      throw new Error(`Order with ID "${dto.orderId}" not found.`);
    }

    if (order.status === 'cancelled') {
      throw new Error(`Cannot record payment against cancelled Order #${order.orderNumber}.`);
    }

    const safeAmount = roundMoney(dto.amount);
    if (safeAmount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    // Check if amount exceeds balance due
    if (safeAmount > order.balanceDue && order.balanceDue > 0) {
      // Overpayment warning
      const overAmount = roundMoney(safeAmount - order.balanceDue);
      if (overAmount > 50) {
        // More than 50 NGN excess
        throw new Error(
          `Payment amount (${order.currency} ${safeAmount.toLocaleString()}) exceeds the current balance due (${order.currency} ${order.balanceDue.toLocaleString()}).`
        );
      }
    }

    const payment = await paymentRepository.recordPayment(dto, order);
    const updatedOrder = (await orderRepository.getOrderById(order.id)) || order;

    // Log audit event
    await auditService.logEvent({
      action: 'create',
      entity_type: 'payment',
      entity_id: payment.id,
      reason: `Payment of ${payment.currency} ${payment.amount.toLocaleString()} recorded for Order #${order.orderNumber} via ${payment.paymentMethod}`,
      user_id: dto.recordedBy || null,
      new_values: {
        paymentNumber: payment.paymentNumber,
        orderNumber: order.orderNumber,
        amount: payment.amount,
        referenceNumber: payment.referenceNumber,
        paymentMethod: payment.paymentMethod,
        orderPaymentStatus: updatedOrder.paymentStatus,
        orderBalanceDue: updatedOrder.balanceDue,
      },
    });

    return { payment, order: updatedOrder };
  }

  /**
   * Complete Paystack payment verification and record transaction
   */
  async verifyAndRecordPaystackPayment(
    reference: string,
    orderId: string,
    recordedBy?: string,
    recordedByName?: string
  ): Promise<{ payment: PaymentRecord; order: Order }> {
    const order = await orderRepository.getOrderById(orderId);
    if (!order) {
      throw new Error(`Order with ID "${orderId}" not found.`);
    }

    // Verify with Paystack
    const verifyResult = await paystackService.verifyTransaction(reference);
    if (!verifyResult.success && verifyResult.status !== 'success') {
      throw new Error(
        `Paystack verification failed: ${verifyResult.gatewayResponse || 'Transaction not approved'}`
      );
    }

    const paymentAmount = verifyResult.amount > 0 ? verifyResult.amount : order.balanceDue;

    return this.recordPayment({
      orderId: order.id,
      amount: paymentAmount,
      paymentMethod: 'paystack',
      referenceNumber: reference,
      provider: 'paystack',
      providerReference: reference,
      notes: `Verified online transaction via Paystack. Gateway response: ${verifyResult.gatewayResponse}`,
      recordedBy,
      recordedByName: recordedByName || 'Paystack Gateway',
    });
  }

  /**
   * Generate official payment receipt data with corporate XFORCE branding
   * SECTION 13: Printable payment receipt view
   */
  async generateReceiptData(paymentId: string): Promise<PaymentReceiptData> {
    const payment = await paymentRepository.getPaymentById(paymentId);
    if (!payment) {
      throw new Error(`Payment with ID "${paymentId}" not found.`);
    }

    if (!payment.orderId) {
      throw new Error(`Payment #${payment.paymentNumber} is not associated with an Order.`);
    }

    const order = await orderRepository.getOrderById(payment.orderId);
    if (!order) {
      throw new Error(`Associated Order #${payment.orderNumber} not found.`);
    }

    const business = await businessSettingsService.getBusinessSettings();
    const methodCfg = PAYMENT_METHOD_CONFIG[payment.paymentMethod];

    // Calculate previous payments prior to this one
    const allOrderPayments = await paymentRepository.getAllPayments(order.id);
    const thisIndex = allOrderPayments.findIndex((p) => p.id === payment.id);
    const priorPayments = allOrderPayments.slice(thisIndex + 1);
    const previouslyPaid = priorPayments.reduce((acc, p) => acc + p.amount, 0);
    const totalPaidNow = previouslyPaid + payment.amount;
    const remainingBalance = Math.max(0, roundMoney(order.totalAmount - totalPaidNow));

    const formattedAddress = business?.address
      ? [business.address.street, business.address.city, business.address.state]
          .filter(Boolean)
          .join(', ')
      : 'Industrial Layout, Emene, Enugu State, Nigeria';

    return {
      receiptNumber: payment.paymentNumber,
      orderNumber: order.orderNumber,
      quotationNumber: order.sourceQuotationNumber,
      paymentDate: payment.paymentDate,
      amountPaid: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      paymentMethodLabel: methodCfg?.label || payment.paymentMethod.replace(/_/g, ' ').toUpperCase(),
      referenceNumber: payment.referenceNumber,
      bankName: payment.bankName,
      customer: {
        name: order.customerName,
        phone: order.customerPhone,
        email: order.customerEmail,
        address: order.customerAddress,
      },
      orderSummary: {
        orderTotal: order.totalAmount,
        previouslyPaid,
        thisPayment: payment.amount,
        totalPaidNow,
        remainingBalance,
        paymentStatus: order.paymentStatus.replace(/_/g, ' ').toUpperCase(),
      },
      company: {
        legalName: business?.companyName || 'XFORCE Construction Ltd',
        brandName: business?.publicBrandName || 'X-FORCE BRICKS & PAVERS',
        address: formattedAddress,
        phone: business?.contactPhone || '+234 803 000 0000',
        email: business?.contactEmail || 'orders@xforce.internal',
        tin: business?.tinNumber || 'RC-1849204',
      },
      recordedBy: payment.recordedByName || payment.recordedBy || 'Accounts Desk',
      notes: payment.notes,
    };
  }
}

export const paymentService = new PaymentService();
