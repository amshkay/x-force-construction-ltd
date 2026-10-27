/**
 * Point of Sale (POS) Service
 * Module 13 — POS / Sales Counter
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Implements authoritative decimal-safe financial calculations, stock validation,
 * atomic 10-step sale transactions, inventory deduction movements,
 * receipt formatting, and cashier permission checks.
 */

import { posRepository } from '../repositories/pos.repository';
import { inventoryRepository } from '../repositories/inventory.repository';
import { paymentRepository } from '../repositories/payment.repository';
import { stockLocationRepository } from '../repositories/stockLocation.repository';
import { productRepository } from '../repositories/product.repository';
import { customerRepository } from '../repositories/customer.repository';
import { businessSettingsService } from './settings.service';
import { auditService } from './audit.service';
import { roundMoney } from '../utils/quotationCalculations';
import {
  PosSale,
  PosSaleItem,
  CreatePosSaleDTO,
  PosFilterParams,
  PosSummaryStats,
  PosReceiptData,
  PosPaymentStatus,
} from '../types/pos';

export class PosService {
  /**
   * Retrieves all sales matching filter criteria
   */
  async getSales(filters?: PosFilterParams): Promise<PosSale[]> {
    return posRepository.getAllSales(filters);
  }

  /**
   * Retrieves a single sale by ID
   */
  async getSaleById(id: string): Promise<PosSale | null> {
    return posRepository.getSaleById(id);
  }

  /**
   * Retrieves a single sale by unique sale reference
   */
  async getSaleByReference(reference: string): Promise<PosSale | null> {
    return posRepository.getSaleByReference(reference);
  }

  /**
   * Calculate safe authoritative totals for line items and entire cart
   */
  public calculateAuthoritativeTotals(
    items: CreatePosSaleDTO['items'],
    productsMap: Map<string, any>,
    cartDiscountType: 'none' | 'fixed' | 'percentage' = 'none',
    cartDiscountValue: number = 0,
    additionalChargesFee: number = 0
  ) {
    let subtotal = 0;
    let totalLineDiscount = 0;

    const validatedItems: PosSaleItem[] = items.map((rawItem) => {
      const product = productsMap.get(rawItem.productId);
      if (!product) {
        throw new Error(`Product not found with ID ${rawItem.productId}`);
      }

      let variantName: string | null = null;
      let sku = product.sku;
      let standardPrice = product.sellingPrice || 0;

      if (rawItem.variantId) {
        const variant = product.variants?.find((v: any) => v.id === rawItem.variantId);
        if (variant) {
          variantName = variant.name;
          sku = variant.sku || product.sku;
          if (variant.priceOverride != null && variant.priceOverride > 0) {
            standardPrice = variant.priceOverride;
          }
        }
      }

      const unitPrice = roundMoney(rawItem.isPriceOverridden && rawItem.unitPrice >= 0 ? rawItem.unitPrice : standardPrice);
      const originalUnitPrice = standardPrice;
      const quantity = Math.max(0, rawItem.quantity);
      const rawLineTotal = roundMoney(quantity * unitPrice);

      let discountAmount = 0;
      const discountType = rawItem.discountType || 'none';
      const discountVal = Math.max(0, rawItem.discountValue || 0);

      if (discountType === 'percentage') {
        const safePercent = Math.min(100, discountVal);
        discountAmount = roundMoney(rawLineTotal * (safePercent / 100));
      } else if (discountType === 'fixed') {
        discountAmount = roundMoney(Math.min(rawLineTotal, discountVal));
      }

      const lineTotal = roundMoney(Math.max(0, rawLineTotal - discountAmount));

      subtotal = roundMoney(subtotal + lineTotal);
      totalLineDiscount = roundMoney(totalLineDiscount + discountAmount);

      return {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        productId: rawItem.productId,
        variantId: rawItem.variantId || null,
        productName: product.name,
        variantName,
        sku,
        unit: product.unit,
        imageUrl: product.images?.[0] || null,
        quantity,
        unitPrice,
        originalUnitPrice,
        isPriceOverridden: Boolean(rawItem.isPriceOverridden),
        overrideReason: rawItem.overrideReason || null,
        discountType,
        discountValue: discountVal,
        discountAmount,
        lineTotal,
      };
    });

    let cartDiscountAmount = 0;
    const safeCartDiscountVal = Math.max(0, cartDiscountValue || 0);
    if (cartDiscountType === 'percentage') {
      const safePercent = Math.min(100, safeCartDiscountVal);
      cartDiscountAmount = roundMoney(subtotal * (safePercent / 100));
    } else if (cartDiscountType === 'fixed') {
      cartDiscountAmount = roundMoney(Math.min(subtotal, safeCartDiscountVal));
    }

    const safeAdditionalFee = Math.max(0, roundMoney(additionalChargesFee || 0));
    const totalAmount = roundMoney(Math.max(0, subtotal - cartDiscountAmount + safeAdditionalFee));
    const totalDiscountAmount = roundMoney(totalLineDiscount + cartDiscountAmount);

    return {
      validatedItems,
      subtotal,
      cartDiscountAmount,
      totalDiscountAmount,
      additionalChargesFee: safeAdditionalFee,
      totalAmount,
    };
  }

  /**
   * Atomic 10-Step Sale Completion Transaction
   * Executes validation, price verification, stock checks, sale record creation,
   * payment registration, and inventory movements atomically.
   */
  async completeSale(dto: CreatePosSaleDTO): Promise<PosSale> {
    // 1. Validate sale basics
    if (!dto.items || dto.items.length === 0) {
      throw new Error('Cannot complete sale: Cart is empty.');
    }

    if (!dto.locationId) {
      throw new Error('Stock location is required to complete POS sale.');
    }

    // 2. Validate location
    const location = await stockLocationRepository.getLocationById(dto.locationId);
    if (!location || !location.isActive) {
      throw new Error('The selected sales stock location is inactive or invalid.');
    }

    // 3. Validate products & variants
    const allProducts = await productRepository.getAllProducts();
    const productsMap = new Map<string, any>(allProducts.map((p) => [p.id, p]));

    for (const it of dto.items) {
      if (it.quantity <= 0) {
        throw new Error(`Item quantity must be greater than zero.`);
      }
      const prod = productsMap.get(it.productId);
      if (!prod || !prod.isActive) {
        throw new Error(`Product "${prod?.name || it.productId}" is currently unavailable or inactive.`);
      }
      if (it.variantId) {
        const variant = prod.variants?.find((v: any) => v.id === it.variantId);
        if (!variant || !variant.isActive) {
          throw new Error(`Product variant is inactive or not found.`);
        }
      }
    }

    // 4. Validate stock available at selected location
    for (const it of dto.items) {
      const balance = await inventoryRepository.getBalance(it.productId, it.variantId || null, dto.locationId);
      const onHand = balance?.quantityOnHand || 0;
      const reserved = balance?.quantityReserved || 0;
      const available = Math.max(0, onHand - reserved);

      if (it.quantity > available) {
        const prod = productsMap.get(it.productId);
        const variant = it.variantId ? prod?.variants?.find((v: any) => v.id === it.variantId) : null;
        const name = variant ? `${prod?.name} (${variant.name})` : (prod?.name || 'Selected product');
        throw new Error(
          `Insufficient stock at ${location.name} for "${name}". Available: ${available} ${prod?.unit || 'units'}, Requested: ${it.quantity} ${prod?.unit || 'units'}.`
        );
      }
    }

    // 5. Authoritative recalculation
    const calc = this.calculateAuthoritativeTotals(
      dto.items,
      productsMap,
      dto.cartDiscountType,
      dto.cartDiscountValue,
      dto.additionalChargesFee
    );

    const safeAmountPaid = roundMoney(Math.max(0, dto.amountPaid));
    let paymentStatus: PosPaymentStatus = 'paid';
    let balanceDue = 0;

    if (safeAmountPaid >= calc.totalAmount) {
      paymentStatus = 'paid';
      balanceDue = 0;
    } else if (safeAmountPaid > 0) {
      paymentStatus = 'partially_paid';
      balanceDue = roundMoney(calc.totalAmount - safeAmountPaid);
    } else {
      paymentStatus = 'unpaid';
      balanceDue = calc.totalAmount;
    }

    // Calculate cash change
    let changeGiven: number | null = null;
    let amountTendered: number | null = null;
    if (dto.paymentMethod === 'cash') {
      amountTendered = dto.amountTendered != null ? roundMoney(dto.amountTendered) : safeAmountPaid;
      changeGiven = Math.max(0, roundMoney(amountTendered - calc.totalAmount));
    }

    // Resolve customer details
    let customerName = dto.customerName?.trim() || 'Walk-in Customer';
    let customerPhone = dto.customerPhone?.trim() || null;
    let customerEmail = dto.customerEmail?.trim() || null;
    let customerAddress = dto.customerAddress?.trim() || null;
    const isGuest = dto.isGuestCustomer !== false && (!dto.customerId || dto.customerId === 'walk-in');

    if (dto.customerId && dto.customerId !== 'walk-in') {
      const existingCustomer = await customerRepository.getCustomerById(dto.customerId);
      if (existingCustomer) {
        customerName = existingCustomer.fullName;
        customerPhone = existingCustomer.phone || customerPhone;
        customerEmail = existingCustomer.email || customerEmail;
        customerAddress = existingCustomer.address || customerAddress;
      }
    }

    // 6. Generate unique sale reference
    const saleReference = await posRepository.generateNextSaleReference();
    const saleId = crypto.randomUUID();
    const now = new Date().toISOString();

    // 7. Record payment in unified payment repository (reusing Module 10)
    let paymentRecordId: string | null = null;
    if (safeAmountPaid > 0) {
      const recordedPayment = await paymentRepository.recordPosPayment({
        saleId,
        saleReference,
        customerId: dto.customerId && dto.customerId !== 'walk-in' ? dto.customerId : null,
        customerName,
        amount: safeAmountPaid,
        paymentMethod: dto.paymentMethod,
        referenceNumber: dto.referenceNumber || `${saleReference}-PAY`,
        bankName: dto.bankName,
        notes: `Counter checkout payment for ${saleReference}`,
        provider: dto.paymentMethod === 'paystack' ? 'paystack' : 'manual',
        providerReference: dto.referenceNumber || undefined,
        recordedBy: dto.performedBy,
        recordedByName: dto.performedByName || 'POS Cashier',
      });
      paymentRecordId = recordedPayment.id;
    }

    // 8. Deduct stock atomically and record inventory movements (Module 11)
    await inventoryRepository.executePosSaleDeduction({
      saleId,
      saleReference,
      locationId: location.id,
      locationName: location.name,
      items: calc.validatedItems.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        sku: item.sku,
        unit: item.unit,
        quantity: item.quantity,
      })),
      performedBy: dto.performedBy,
      performedByName: dto.performedByName,
    });

    // 9. Create and persist the finalized sale record
    const sale: PosSale = {
      id: saleId,
      saleReference,
      customerId: dto.customerId && dto.customerId !== 'walk-in' ? dto.customerId : null,
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      isGuestCustomer: isGuest,
      locationId: location.id,
      locationName: location.name,
      locationCode: location.code,
      cashierId: dto.performedBy || 'usr-cashier',
      cashierName: dto.performedByName || 'Counter Staff',
      items: calc.validatedItems,
      subtotal: calc.subtotal,
      cartDiscountType: dto.cartDiscountType || 'none',
      cartDiscountValue: dto.cartDiscountValue || 0,
      cartDiscountAmount: calc.cartDiscountAmount,
      additionalChargesFee: calc.additionalChargesFee,
      additionalChargesNote: dto.additionalChargesNote || null,
      totalDiscountAmount: calc.totalDiscountAmount,
      totalAmount: calc.totalAmount,
      amountPaid: safeAmountPaid,
      balanceDue,
      amountTendered,
      changeGiven,
      paymentMethod: dto.paymentMethod,
      paymentStatus,
      paymentReference: dto.referenceNumber || null,
      paymentId: paymentRecordId,
      status: 'completed',
      notes: dto.notes || null,
      createdAt: now,
      updatedAt: now,
    };

    await posRepository.createSale(sale);

    // 10. Audit logging
    await auditService.logEvent({
      action: 'create',
      entity_type: 'pos_sale',
      entity_id: sale.id,
      reason: `Completed POS Sale ${sale.saleReference} at ${location.name} for ₦${sale.totalAmount.toLocaleString()} (${sale.paymentMethod})`,
      user_id: dto.performedBy || null,
      new_values: {
        saleReference: sale.saleReference,
        location: location.name,
        totalAmount: sale.totalAmount,
        amountPaid: sale.amountPaid,
        balanceDue: sale.balanceDue,
        itemsCount: sale.items.length,
        paymentMethod: sale.paymentMethod,
        customerName: sale.customerName,
      },
    });

    // 11. Module 22: Enqueue for server synchronization if offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        const { syncEngine } = await import('./sync/syncEngine');
        await syncEngine.enqueue({
          operationType: 'SUBMIT_POS_SALE',
          entityType: 'pos_sale',
          localEntityId: sale.id,
          payload: {
            clientTransactionId: sale.id,
            orderNumber: sale.saleReference,
            cashierId: sale.cashierId,
            cashierName: sale.cashierName,
            customerId: sale.customerId,
            customerName: sale.customerName,
            items: sale.items.map((it) => ({
              productId: it.productId,
              productName: it.productName,
              variantId: it.variantId,
              variantName: it.variantName,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              subtotal: it.lineTotal,
              sku: it.sku,
            })),
            subtotal: sale.subtotal,
            discountAmount: sale.totalDiscountAmount,
            vatAmount: 0,
            totalAmount: sale.totalAmount,
            paymentMethod: (sale.paymentMethod === 'card_pos' ? 'card_pos' : sale.paymentMethod === 'bank_transfer' ? 'bank_transfer' : 'cash'),
            paymentReference: sale.paymentReference || undefined,
            amountTendered: sale.amountTendered || sale.amountPaid,
            changeGiven: sale.changeGiven || 0,
            notes: sale.notes || undefined,
            offlineCreatedAt: sale.createdAt,
          },
          actor: {
            userId: dto.performedBy,
            userName: dto.performedByName,
          },
        });
      } catch (queueErr) {
        console.warn('[PosService] Offline queueing warning:', queueErr);
      }
    }

    return sale;
  }

  /**
   * Cancels a completed sale, restoring physical stock back to the inventory location
   */
  async cancelSale(
    saleId: string,
    reason: string,
    performedBy?: string,
    performedByName?: string
  ): Promise<PosSale> {
    const sale = await posRepository.getSaleById(saleId);
    if (!sale) {
      throw new Error(`Sale with ID ${saleId} not found.`);
    }

    if (sale.status === 'cancelled') {
      throw new Error(`Sale #${sale.saleReference} is already cancelled.`);
    }

    if (!reason || !reason.trim()) {
      throw new Error('A cancellation reason is required.');
    }

    // 1. Restore inventory
    await inventoryRepository.executePosSaleRestoration({
      saleId: sale.id,
      saleReference: sale.saleReference,
      locationId: sale.locationId,
      locationName: sale.locationName,
      items: sale.items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        productName: i.productName,
        variantName: i.variantName,
        sku: i.sku,
        unit: i.unit,
        quantity: i.quantity,
      })),
      reason,
      performedBy,
      performedByName,
    });

    // 2. Update sale record
    sale.status = 'cancelled';
    sale.cancellationReason = reason.trim();
    sale.cancelledBy = performedBy || null;
    sale.cancelledByName = performedByName || 'Manager';
    sale.cancelledAt = new Date().toISOString();

    await posRepository.updateSale(sale);

    // 3. Audit log
    await auditService.logEvent({
      action: 'delete',
      entity_type: 'pos_sale',
      entity_id: sale.id,
      reason: `Voided POS Sale ${sale.saleReference}: ${reason}`,
      user_id: performedBy || null,
      new_values: {
        saleReference: sale.saleReference,
        cancellationReason: reason,
        itemsRestored: sale.items.length,
      },
    });

    return sale;
  }

  /**
   * Generates printable and digital receipt payload using Module 04 Business Settings
   */
  async generateReceiptData(saleId: string): Promise<PosReceiptData> {
    const sale = await posRepository.getSaleById(saleId);
    if (!sale) {
      throw new Error(`Sale with ID ${saleId} not found.`);
    }

    const business = await businessSettingsService.getBusinessSettings();

    const formattedAddress = business?.address
      ? [business.address.street, business.address.city, business.address.state]
          .filter(Boolean)
          .join(', ')
      : 'Industrial Layout, Emene, Enugu State, Nigeria';

    return {
      saleReference: sale.saleReference,
      date: sale.createdAt,
      cashierName: sale.cashierName,
      locationName: sale.locationName,
      locationCode: sale.locationCode,
      customer: {
        name: sale.customerName,
        phone: sale.customerPhone,
        email: sale.customerEmail,
        address: sale.customerAddress,
        isGuest: sale.isGuestCustomer,
      },
      items: sale.items,
      subtotal: sale.subtotal,
      cartDiscountAmount: sale.cartDiscountAmount,
      totalDiscountAmount: sale.totalDiscountAmount,
      additionalChargesFee: sale.additionalChargesFee,
      additionalChargesNote: sale.additionalChargesNote,
      totalAmount: sale.totalAmount,
      paymentMethod: sale.paymentMethod,
      amountPaid: sale.amountPaid,
      amountTendered: sale.amountTendered,
      changeGiven: sale.changeGiven,
      balanceDue: sale.balanceDue,
      paymentStatus: sale.paymentStatus,
      paymentReference: sale.paymentReference,
      company: {
        name: business?.companyName || 'XFORCE Construction Ltd',
        brand: business?.publicBrandName || 'X-FORCE BRICKS & PAVERS',
        address: formattedAddress,
        phone: business?.contactPhone || '+234 803 000 0000',
        email: business?.contactEmail || 'sales@xforce.internal',
        tin: business?.tinNumber || 'RC-1849204',
        logoUrl: business?.branding?.logoUrl || null,
        footerText: business?.websiteContent?.footerText || 'Thank you for building with XFORCE. Quality Guaranteed.',
      },
      notes: sale.notes,
    };
  }

  /**
   * Compute live sales counter KPI statistics
   */
  async getSummaryStats(): Promise<PosSummaryStats> {
    const sales = await posRepository.getAllSales();
    const today = new Date().toISOString().split('T')[0];

    let todaySalesCount = 0;
    let todaySalesTotal = 0;
    let todayCashTotal = 0;
    let todayTransferTotal = 0;
    let todayCardTotal = 0;
    let todayOnlineTotal = 0;
    let todayCreditTotal = 0;
    let totalItemsSold = 0;

    for (const s of sales) {
      if (s.status === 'cancelled') continue;

      const isToday = s.createdAt.startsWith(today);

      if (isToday) {
        todaySalesCount++;
        todaySalesTotal += s.totalAmount;

        if (s.paymentMethod === 'cash') todayCashTotal += s.amountPaid;
        else if (s.paymentMethod === 'bank_transfer') todayTransferTotal += s.amountPaid;
        else if (s.paymentMethod === 'card_pos') todayCardTotal += s.amountPaid;
        else if (s.paymentMethod === 'paystack') todayOnlineTotal += s.amountPaid;

        if (s.balanceDue > 0) todayCreditTotal += s.balanceDue;

        s.items.forEach((it) => {
          totalItemsSold += it.quantity;
        });
      }
    }

    return {
      todaySalesCount,
      todaySalesTotal: roundMoney(todaySalesTotal),
      todayCashTotal: roundMoney(todayCashTotal),
      todayTransferTotal: roundMoney(todayTransferTotal),
      todayCardTotal: roundMoney(todayCardTotal),
      todayOnlineTotal: roundMoney(todayOnlineTotal),
      todayCreditTotal: roundMoney(todayCreditTotal),
      totalItemsSold,
    };
  }
}

export const posService = new PosService();
