/**
 * Quotation Financial Calculations Utility
 * Module 09 — Customer Requests & Quotation Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Provides decimal-safe commercial arithmetic for line totals,
 * subtotals, multi-tiered discounts, logistical charges, and taxes.
 */

import { CreateQuotationItemDTO, QuotationItem } from '../types/quotation';

/**
 * Rounds a monetary amount to 2 decimal places safely avoiding floating point artifacts
 */
export function roundMoney(amount: number): number {
  if (isNaN(amount) || !isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Computes single line item total: (quantity * unitPrice) - discountAmount
 */
export function calculateLineTotal(
  quantity: number,
  unitPrice: number,
  discountAmount: number = 0
): number {
  const safeQty = Math.max(0, quantity);
  const safePrice = Math.max(0, unitPrice);
  const safeDiscount = Math.max(0, discountAmount);
  const rawTotal = safeQty * safePrice - safeDiscount;
  return Math.max(0, roundMoney(rawTotal));
}

export interface QuotationCalculationParams {
  items: Array<CreateQuotationItemDTO | QuotationItem>;
  discountAmount?: number;
  discountPercentage?: number;
  deliveryFee?: number;
  installationFee?: number;
  otherChargesFee?: number;
  taxRate?: number; // e.g. 7.5 for 7.5%
  depositPercentage?: number; // e.g. 70 for 70%
  explicitDepositRequired?: number;
}

export interface QuotationCalculationSummary {
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  installationFee: number;
  otherChargesFee: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  depositRequired: number;
  balanceDue: number;
  itemCount: number;
  totalQuantity: number;
}

/**
 * Calculates complete quotation commercial financials
 */
export function calculateQuotationFinancials(
  params: QuotationCalculationParams
): QuotationCalculationSummary {
  const {
    items = [],
    deliveryFee = 0,
    installationFee = 0,
    otherChargesFee = 0,
    taxRate = 0,
    depositPercentage = 70,
    explicitDepositRequired,
  } = params;

  // 1. Calculate sum of line totals
  let subtotal = 0;
  let totalQuantity = 0;

  for (const item of items) {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const price = Math.max(0, Number(item.unitPrice) || 0);
    const itemDisc = Math.max(0, Number(item.discountAmount) || 0);
    const lineTot = calculateLineTotal(qty, price, itemDisc);

    subtotal += lineTot;
    totalQuantity += qty;
  }

  subtotal = roundMoney(subtotal);

  // 2. Global Discount
  let finalDiscount = 0;
  if (params.discountPercentage && params.discountPercentage > 0) {
    const pct = Math.min(100, Math.max(0, params.discountPercentage));
    finalDiscount = roundMoney((subtotal * pct) / 100);
  } else if (params.discountAmount && params.discountAmount > 0) {
    finalDiscount = roundMoney(Math.min(subtotal, params.discountAmount));
  }

  const taxableAmount = Math.max(0, roundMoney(subtotal - finalDiscount));

  // 3. Additional charges
  const safeDelivery = Math.max(0, roundMoney(Number(deliveryFee) || 0));
  const safeInstallation = Math.max(0, roundMoney(Number(installationFee) || 0));
  const safeOther = Math.max(0, roundMoney(Number(otherChargesFee) || 0));

  // 4. Tax (VAT)
  let taxAmount = 0;
  const safeTaxRate = Math.max(0, Number(taxRate) || 0);
  if (safeTaxRate > 0) {
    taxAmount = roundMoney((taxableAmount * safeTaxRate) / 100);
  }

  // 5. Grand Total
  const totalAmount = roundMoney(
    taxableAmount + safeDelivery + safeInstallation + safeOther + taxAmount
  );

  // 6. Deposit Required & Balance Due
  let depositRequired = 0;
  if (explicitDepositRequired !== undefined && explicitDepositRequired !== null && explicitDepositRequired >= 0) {
    depositRequired = roundMoney(Math.min(totalAmount, explicitDepositRequired));
  } else if (depositPercentage > 0 && totalAmount > 0) {
    depositRequired = roundMoney((totalAmount * Math.min(100, depositPercentage)) / 100);
  }

  const balanceDue = Math.max(0, roundMoney(totalAmount - depositRequired));

  return {
    subtotal,
    discountAmount: finalDiscount,
    deliveryFee: safeDelivery,
    installationFee: safeInstallation,
    otherChargesFee: safeOther,
    taxableAmount,
    taxRate: safeTaxRate,
    taxAmount,
    totalAmount,
    depositRequired,
    balanceDue,
    itemCount: items.length,
    totalQuantity: roundMoney(totalQuantity),
  };
}
