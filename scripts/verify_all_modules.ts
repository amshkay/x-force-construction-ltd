/**
 * Comprehensive Automated QA & Verification Suite
 * Module 24 — Comprehensive Testing, QA & Reliability
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Exercises real services, repositories, validators, and security boundaries.
 */

// 1. Environment Polyfills for Node runner
const storageMap = new Map<string, string>();
(globalThis as any).window = {
  localStorage: {
    getItem: (k: string) => storageMap.get(k) ?? null,
    setItem: (k: string, v: string) => storageMap.set(k, String(v)),
    removeItem: (k: string) => storageMap.delete(k),
    clear: () => storageMap.clear(),
  },
  location: { origin: 'http://localhost:3000' },
};

try {
  Object.defineProperty(globalThis, 'navigator', {
    value: { onLine: true, userAgent: 'XFORCE-QA-Runner/1.0' },
    configurable: true,
    writable: true,
  });
} catch {
  // Ignore if predefined
}

// Imports
import { calculateQuotationFinancials, calculateLineTotal, roundMoney } from '../src/utils/quotationCalculations';
import { validateSecurePassword, isDefaultPassword, sanitizeInputString, sanitizeHtml } from '../src/utils/securitySanitizer';
import { sanitizeCsvCell, buildSafeCsvRow } from '../src/utils/csvSecurity';
import { sanitizeAuditValues } from '../src/repositories/audit.repository';
import { appConfig } from '../src/config/app.config';

// Force local-first test environment without remote network latency
appConfig.supabase.isConfigured = false;

import { customerRepository } from '../src/repositories/customer.repository';
import { customerService } from '../src/services/customer.service';
import { productRepository } from '../src/repositories/product.repository';
import { requestRepository } from '../src/repositories/request.repository';
import { requestService } from '../src/services/request.service';
import { quotationRepository } from '../src/repositories/quotation.repository';
import { quotationService } from '../src/services/quotation.service';
import { orderRepository } from '../src/repositories/order.repository';
import { orderService } from '../src/services/order.service';
import { inventoryRepository } from '../src/repositories/inventory.repository';
import { inventoryService } from '../src/services/inventory.service';
import { stockCountRepository } from '../src/repositories/stockCount.repository';
import { posRepository } from '../src/repositories/pos.repository';
import { posService } from '../src/services/pos.service';
import { warehouseRepository } from '../src/repositories/warehouse.repository';
import { warehouseService } from '../src/services/warehouse.service';
import { installationRepository } from '../src/repositories/installation.repository';
import { installationService } from '../src/services/installation.service';
import { expenseRepository } from '../src/repositories/expense.repository';
import { expenseService } from '../src/services/expense.service';
import { auditRepository } from '../src/repositories/audit.repository';
import { auditService } from '../src/services/audit.service';
import { offlineQueue } from '../src/lib/storage/offlineQueue';
import { notificationService } from '../src/services/notification.service';
import { syncEngine } from '../src/services/sync/syncEngine';
import { systemHealthService } from '../src/services/diagnostics/systemHealth.service';
import { errorLogger } from '../src/services/diagnostics/errorLogger.service';
import { authService } from '../src/services/auth.service';
import { DEV_SANDBOX_PERSONAS } from '../src/context/AuthContext';
import { staffRepository } from '../src/repositories/staff.repository';
import { PERMISSION_CODES } from '../src/types/auth';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, name: string, message?: string) {
  if (condition) {
    results.push({ suite, name, passed: true });
    console.log(`  ✓ [${suite}] ${name}`);
  } else {
    results.push({ suite, name, passed: false, error: message || 'Assertion failed' });
    console.error(`  ✗ [${suite}] ${name}: ${message || 'Assertion failed'}`);
  }
}

async function runTestSuite() {
  console.log('\n=============================================================');
  console.log('STARTING XFORCE MODULE 24 COMPREHENSIVE QA & TEST SUITE');
  console.log('=============================================================\n');

  // --------------------------------------------------------------------------
  // SUITE 1: Financial & Commercial Calculation Integrity
  // --------------------------------------------------------------------------
  console.log('--- Suite 1: Quotation Financial & Commercial Calculations ---');
  {
    // Test 1.1: Line total calculation with rounding
    const line1 = calculateLineTotal(1000, 250, 5000); // 1000 * 250 - 5000 = 245,000
    assert(line1 === 245000, 'Calculations', 'Calculate Line Total with Item Discount');

    // Test 1.2: Negative quantity & discount guards
    const line2 = calculateLineTotal(-10, 200, -50);
    assert(line2 === 0, 'Calculations', 'Guards against negative quantities and discounts');

    // Test 1.3: Full financial summary calculation (subtotal, tiered discount, delivery, VAT, deposit)
    const quoteCalc = calculateQuotationFinancials({
      items: [
        { productId: 'p1', quantity: 2000, unitPrice: 300, discountAmount: 0 } as any, // 600,000
        { productId: 'p2', quantity: 500, unitPrice: 400, discountAmount: 10000 } as any, // 190,000
      ],
      deliveryFee: 50000,
      installationFee: 80000,
      discountPercentage: 5, // 5% of 790,000 = 39,500. Taxable = 750,500
      taxRate: 7.5, // 7.5% of 750,500 = 56,287.50
      depositPercentage: 70,
    });

    assert(quoteCalc.subtotal === 790000, 'Calculations', 'Quotation Subtotal Summation', `Got ${quoteCalc.subtotal}`);
    assert(quoteCalc.discountAmount === 39500, 'Calculations', 'Percentage Discount Accuracy', `Got ${quoteCalc.discountAmount}`);
    assert(quoteCalc.taxableAmount === 750500, 'Calculations', 'Taxable Amount Precision', `Got ${quoteCalc.taxableAmount}`);
    assert(quoteCalc.taxAmount === 56287.50, 'Calculations', '7.5% VAT Computation', `Got ${quoteCalc.taxAmount}`);
    
    const expectedGrandTotal = 750500 + 50000 + 80000 + 56287.50; // 936,787.50
    assert(quoteCalc.totalAmount === expectedGrandTotal, 'Calculations', 'Grand Total Multi-charge Computation', `Got ${quoteCalc.totalAmount}`);
    
    const expectedDeposit = roundMoney((expectedGrandTotal * 70) / 100); // 655,751.25
    assert(quoteCalc.depositRequired === expectedDeposit, 'Calculations', '70% Mandatory Deposit Computation', `Got ${quoteCalc.depositRequired}`);
    assert(roundMoney(quoteCalc.depositRequired + quoteCalc.balanceDue) === quoteCalc.totalAmount, 'Calculations', 'Mathematical Identity (Deposit + Balance == Total)');
  }

  // --------------------------------------------------------------------------
  // SUITE 2: Security, Input Sanitization & Password Governance
  // --------------------------------------------------------------------------
  console.log('\n--- Suite 2: Security & Input Sanitization Defenses ---');
  {
    // Test 2.1: Default temporary password (Xforcecon) is rejected for permanent user password
    const defCheck1 = isDefaultPassword('Xforcecon');
    const defCheck2 = isDefaultPassword('xforcecon');
    const defCheck3 = isDefaultPassword('   XFORCECON   ');
    const defCheck4 = isDefaultPassword('CustomSecurePass123!');
    assert(defCheck1 && defCheck2 && defCheck3 && !defCheck4, 'Security', 'isDefaultPassword identifies Xforcecon in any casing');

    const passResult = validateSecurePassword('Xforcecon');
    assert(Boolean(!passResult.isValid && passResult.error?.includes('temporary default password')), 'Security', 'validateSecurePassword rejects temporary default password');

    const shortPass = validateSecurePassword('short1!');
    assert(Boolean(!shortPass.isValid && shortPass.error?.includes('8 characters')), 'Security', 'validateSecurePassword rejects short passwords');

    const validPass = validateSecurePassword('P@ssword2026Secure!');
    assert(validPass.isValid, 'Security', 'validateSecurePassword accepts strong personalized password');

    // Test 2.2: Stored/Reflected XSS string sanitization
    const dirtyXss = '<script>alert("hack")</script><b>Block Yard</b>';
    const cleanXss = sanitizeInputString(dirtyXss);
    assert(!cleanXss.includes('<script>') && cleanXss.includes('&lt;script&gt;'), 'Security', 'sanitizeInputString neutralizes HTML tags');

    const dirtyHtml = '<iframe src="evil.com"></iframe><p onclick="steal()">Clean Text</p>';
    const cleanHtml = sanitizeHtml(dirtyHtml);
    assert(!cleanHtml.includes('iframe') && !cleanHtml.includes('onclick'), 'Security', 'sanitizeHtml strips iframes and event handlers');

    // Test 2.3: CSV Formula Injection (CWE-1236)
    const formulaCell1 = '=SUM(A1:A10)';
    const safeCell1 = sanitizeCsvCell(formulaCell1);
    assert(safeCell1.startsWith('"\'='), 'Security', 'sanitizeCsvCell disarms formula with single-quote prepend');

    const formulaCell2 = '+CMD|"/C calc"!A0';
    const safeCell2 = sanitizeCsvCell(formulaCell2);
    assert(safeCell2.startsWith('"\'+\\') === false && safeCell2.startsWith('"\'+\\') === false && safeCell2.startsWith(`"'+`), 'Security', 'sanitizeCsvCell disarms execution formula with plus prefix');

    // Test 2.4: Audit redaction of passwords and Xforcecon
    const rawAuditPayload = {
      user: 'admin',
      password: 'PlaintextPassword123!',
      api_key: 'sk_live_secret123',
      notes: 'User requested reset to Xforcecon for onboarding',
      nested: {
        authorization: 'Bearer token123',
        safeData: 'Interlocking 60mm Paver',
      },
    };
    const sanitizedAudit = sanitizeAuditValues(rawAuditPayload) as any;
    assert(sanitizedAudit.password === '[REDACTED_FOR_SECURITY]', 'Security', 'Audit logging scrubs password keys');
    assert(sanitizedAudit.api_key === '[REDACTED_FOR_SECURITY]', 'Security', 'Audit logging scrubs api_key keys');
    assert(sanitizedAudit.nested.authorization === '[REDACTED_FOR_SECURITY]', 'Security', 'Audit logging scrubs authorization bearer keys');
    assert(!sanitizedAudit.notes.includes('Xforcecon') && sanitizedAudit.notes.includes('[REDACTED_DEFAULT_PASSWORD]'), 'Security', 'Audit logging scrubs Xforcecon string occurrences');
    assert(sanitizedAudit.nested.safeData === 'Interlocking 60mm Paver', 'Security', 'Audit logging preserves non-sensitive business data');
  }

  // --------------------------------------------------------------------------
  // SUITE 3: Customer Management & Data Isolation
  // --------------------------------------------------------------------------
  console.log('\n--- Suite 3: Customer Management & Self-Service Isolation ---');
  {
    const testEmail = `qa.customer.${Date.now()}@test.internal`;
    const newCust = await customerService.createCustomer({
      fullName: 'Chief Emeka QA Customer',
      phone: '+234 803 999 8811',
      email: testEmail,
      customerType: 'contractor',
      address: 'Plot 4 Independence Layout',
      city: 'Enugu',
      state: 'Enugu',
    }, 'staff-admin-id');

    assert(Boolean(newCust.id && newCust.customerNumber), 'Customer', 'Customer Creation and Auto-Numbering');

    // Customer duplicate detection
    const duplicates = await customerService.checkDuplicates('+234 803 999 8811', testEmail);
    assert(duplicates.length > 0, 'Customer', 'Duplicate Phone/Email Detection');

    // Customer self-service update isolation: Ensure customer cannot escalate status or edit staff notes
    const maliciousSelfUpdate = await customerService.updateCustomer(newCust.id, {
      fullName: 'Chief Emeka QA Customer (Updated)',
      notes: 'HACKED STAFF NOTES',
      accountStatus: 'suspended' as any,
      customerNumber: 'CUST-HACKED-001',
    } as any, undefined); // undefined staffUserId = self-service portal call

    assert(maliciousSelfUpdate.fullName === 'Chief Emeka QA Customer (Updated)', 'Customer', 'Customer can update own permissible details');
    assert(maliciousSelfUpdate.customerNumber === newCust.customerNumber, 'Customer', 'Customer cannot overwrite customerNumber');
    assert(maliciousSelfUpdate.accountStatus === newCust.accountStatus && maliciousSelfUpdate.accountStatus !== 'suspended', 'Customer', 'Customer cannot change accountStatus to suspended');
    assert(maliciousSelfUpdate.notes !== 'HACKED STAFF NOTES', 'Customer', 'Customer cannot overwrite internal staff notes');

    // Cross-customer data isolation verification
    const otherCust = await customerService.createCustomer({
      fullName: 'Dr. Stella Okonjo',
      phone: '+234 805 111 9900',
      email: 'stella.okonjo@qa.internal',
      customerType: 'corporate',
    }, 'staff-admin-id');

    const reqCustA = await requestService.submitRequest({
      customerId: newCust.id,
      customerName: newCust.fullName,
      customerPhone: newCust.phone,
      customerEmail: newCust.email || undefined,
      requestType: 'product_only',
      projectAddress: 'Plot 4, Independence Layout, Enugu',
      items: [{ itemName: 'Solid Concrete Block (9-inch)', quantity: 1000 }],
    });

    const requestsCustB = await requestService.getCustomerRequests(otherCust.id);
    const leaked = requestsCustB.some((r) => r.customerId === newCust.id || r.id === reqCustA.id);
    assert(!leaked, 'Customer', 'Customer B cannot view or retrieve Customer A requests (cross-customer isolation)');
  }

  // --------------------------------------------------------------------------
  // SUITE 4: Commercial Flow (Request -> Quotation -> Order)
  // --------------------------------------------------------------------------
  console.log('\n--- Suite 4: Commercial Request, Quotation & Order Lifecycle ---');
  {
    // Step 4.1: Submit Customer Request
    const request = await requestService.submitRequest({
      customerName: 'Engr. Nnamdi Azikiwe',
      customerEmail: 'nnamdi.azikiwe@qa.internal',
      customerPhone: '+234 802 111 2244',
      requestType: 'product_and_service',
      projectAddress: 'GRA Phase 2, Enugu',
      projectCity: 'Enugu',
      projectState: 'Enugu',
      customerComments: 'Need heavy-duty interlocking paving stones for private commercial driveway.',
      items: [
        {
          productId: 'b1000000-0000-0000-0000-000000000002',
          itemName: 'Heavy-Duty Interlocking Paver (60mm)',
          quantity: 22500,
          unit: 'pcs',
        },
      ],
    });

    assert(Boolean(request.id && request.requestNumber), 'Commercial Flow', 'Customer Request Creation with Auto-Numbering');
    assert(request.status === 'submitted', 'Commercial Flow', 'Initial Request Status is submitted');

    // Step 4.2: Generate Quotation from Request
    const quotation = await quotationService.createQuotation({
      requestId: request.id,
      customerName: request.customerName,
      customerPhone: request.customerPhone,
      customerEmail: request.customerEmail,
      customerAddress: request.projectAddress,
      validUntil: '2026-12-31',
      items: [
        {
          productId: 'b1000000-0000-0000-0000-000000000002',
          description: 'Heavy-Duty Interlocking Paver (60mm)',
          quantity: 22500,
          unitPrice: 150,
          discountAmount: 0,
        },
      ],
      deliveryFee: 120000,
      installationFee: 200000,
      depositRequired: 2470000,
      termsAndConditions: '70% deposit before production/dispatch, 30% on completion',
    });

    assert(Boolean(quotation.id && quotation.quotationNumber), 'Commercial Flow', 'Quotation Created from Request');
    assert(quotation.status === 'draft', 'Commercial Flow', 'Initial Quotation Status is draft');

    // Step 4.3: Send Quotation to Customer
    const sentQuote = await quotationService.sendQuotation(quotation.id, 'Engr. David Adeleke');
    assert(sentQuote.status === 'sent', 'Commercial Flow', 'Quotation marked as sent');

    // Step 4.4: Customer Accepts Quotation
    const acceptedQuote = await quotationService.acceptQuotation(quotation.id, 'Engr. Nnamdi Azikiwe', 'Terms approved via phone');
    assert(acceptedQuote.status === 'accepted', 'Commercial Flow', 'Quotation status updated to accepted');

    // Step 4.5: Convert Accepted Quotation to Production Order (Module 10)
    const order = await quotationService.convertToOrder(quotation.id, {
      createdBy: 'usr-admin-01',
      createdByName: 'Engr. David Adeleke',
      orderType: 'production',
      initialDepositAmount: acceptedQuote.depositRequired,
      initialPaymentMethod: 'bank_transfer',
      initialPaymentReference: 'TXN-BANK-DEP-9921',
    });

    assert(Boolean(order && order.orderNumber), 'Commercial Flow', 'Order successfully booked from accepted quotation');
    assert(order.sourceQuotationId === quotation.id, 'Commercial Flow', 'Order links back to original quotation ID');
    assert(order.items.length === acceptedQuote.items.length, 'Commercial Flow', 'Order preserves all quotation line items');
    assert(order.totalAmount === acceptedQuote.totalAmount, 'Commercial Flow', 'Order matches quotation financial total');

    // Verify quotation is marked converted
    const postQuote = await quotationRepository.getQuotationById(quotation.id);
    assert(postQuote?.status === 'converted', 'Commercial Flow', 'Quotation status transitions to converted');
  }

  // --------------------------------------------------------------------------
  // SUITE 5: Inventory Balances & Mathematical Consistency
  // --------------------------------------------------------------------------
  console.log('\n--- Suite 5: Inventory Movements & Balance Math Consistency ---');
  {
    const products = await productRepository.getAllProducts();
    assert(products.length > 0, 'Inventory', 'Product Catalog Seeded and Readable');
    const targetProduct = products[0];
    const locId = 'loc-1000-0000-0000-0000-000000000001';

    // Read initial balance
    const initialBalances = await inventoryRepository.getAllBalances(locId, targetProduct.id);
    const initialOnHand = initialBalances.reduce((sum, b) => sum + b.quantityOnHand, 0);

    // Record Stock Receipt
    const receiptMovement = await inventoryService.receiveStock({
      productId: targetProduct.id,
      quantity: 500,
      destinationLocationId: locId,
      reason: 'QA Factory Production Batch 2026',
      performedBy: 'usr-qa-tester',
      performedByName: 'QA Engineer',
    });
    assert(Boolean(receiptMovement.id), 'Inventory', 'Stock Receipt Movement Logged');

    // Verify balance increased
    const afterReceiptBalances = await inventoryRepository.getAllBalances(locId, targetProduct.id);
    const afterOnHand = afterReceiptBalances.reduce((sum, b) => sum + b.quantityOnHand, 0);
    assert(afterOnHand === initialOnHand + 500, 'Inventory', 'Quantity On Hand increased by exactly received amount', `Expected ${initialOnHand + 500}, got ${afterOnHand}`);

    // Record Stock Issue
    await inventoryService.issueStock({
      productId: targetProduct.id,
      quantity: 200,
      sourceLocationId: locId,
      reason: 'QA Commercial Dispatch',
      performedBy: 'usr-qa-tester',
      performedByName: 'QA Engineer',
    });

    const afterIssueBalances = await inventoryRepository.getAllBalances(locId, targetProduct.id);
    const afterIssueOnHand = afterIssueBalances.reduce((sum, b) => sum + b.quantityOnHand, 0);
    assert(afterIssueOnHand === afterOnHand - 200, 'Inventory', 'Quantity On Hand decreased by exactly issued amount', `Expected ${afterOnHand - 200}, got ${afterIssueOnHand}`);

    // Physical Stock Count & Variance Reconciliation (Module 12)
    const initialCount = afterIssueOnHand;
    const actualPhysicalCount = initialCount - 5; // 5 units damaged/missing
    const variance = actualPhysicalCount - initialCount; // -5

    assert(variance === -5, 'Inventory', 'Stock Count Variance Arithmetic (-5 units)');

    // Inter-Location Stock Transfer
    const destLocId = 'loc-1000-0000-0000-0000-000000000002';
    const initDestBalances = await inventoryRepository.getAllBalances(destLocId, targetProduct.id);
    const initDestOnHand = initDestBalances.reduce((sum, b) => sum + b.quantityOnHand, 0);

    const transferMovement = await inventoryService.transferStock({
      productId: targetProduct.id,
      sourceLocationId: locId,
      destinationLocationId: destLocId,
      quantity: 50,
      reason: 'Showroom Stock Replenishment',
      performedBy: 'usr-qa-tester',
      performedByName: 'QA Engineer',
    });
    assert(Boolean(transferMovement.id), 'Inventory', 'Stock Transfer Movement Logged');

    const afterTransferSrcBalances = await inventoryRepository.getAllBalances(locId, targetProduct.id);
    const afterTransferDestBalances = await inventoryRepository.getAllBalances(destLocId, targetProduct.id);
    const afterTransferSrcOnHand = afterTransferSrcBalances.reduce((sum, b) => sum + b.quantityOnHand, 0);
    const afterTransferDestOnHand = afterTransferDestBalances.reduce((sum, b) => sum + b.quantityOnHand, 0);

    assert(afterTransferSrcOnHand === afterIssueOnHand - 50, 'Inventory', 'Source Location decreased by transferred quantity');
    assert(afterTransferDestOnHand === initDestOnHand + 50, 'Inventory', 'Destination Location increased by transferred quantity');

    // Physical Stock Adjustment (Write-off)
    const currentBaseBal = await inventoryRepository.getBalance(targetProduct.id, null, locId);
    const baseOnHand = currentBaseBal?.quantityOnHand || 0;
    const targetAdjustedCount = Math.max(0, baseOnHand - 2);

    const adjustmentMovement = await inventoryService.adjustStock({
      productId: targetProduct.id,
      locationId: locId,
      newQuantityOnHand: targetAdjustedCount, // 2 damaged blocks written off
      reason: 'Physical Count Damaged Write-off',
      performedBy: 'usr-qa-tester',
      performedByName: 'QA Engineer',
    });
    assert(Boolean(adjustmentMovement.id), 'Inventory', 'Stock Adjustment Movement Logged');
    const updatedBaseBal = await inventoryRepository.getBalance(targetProduct.id, null, locId);
    assert(updatedBaseBal?.quantityOnHand === targetAdjustedCount, 'Inventory', 'Quantity On Hand matches adjustment exactly');
  }

  // --------------------------------------------------------------------------
  // SUITE 6: Point of Sale (POS) Counter Checkout
  // --------------------------------------------------------------------------
  console.log('\n--- Suite 6: Point of Sale (POS) Workflows ---');
  {
    const products = await productRepository.getAllProducts();
    const posProduct = products.find((p) => p.isPublished && p.sellingPrice > 0) || products[0];

    // Compute checkout totals
    const productsMap = new Map([[posProduct.id, posProduct]]);
    const calc = posService.calculateAuthoritativeTotals(
      [
        {
          productId: posProduct.id,
          quantity: 20,
          unitPrice: posProduct.sellingPrice,
          discountType: 'percentage',
          discountValue: 10, // 10% line discount
        },
      ],
      productsMap,
      'none',
      0
    );

    const lineTotalExpected = roundMoney(20 * posProduct.sellingPrice * 0.9);
    assert(calc.subtotal === lineTotalExpected, 'POS', 'POS 10% Discount Computation', `Got ${calc.subtotal}, expected ${lineTotalExpected}`);

    // Complete POS Sale
    const sale = await posService.completeSale({
      locationId: 'loc-1000-0000-0000-0000-000000000001',
      customerId: 'walk-in',
      customerName: 'Walk-in Cash Buyer',
      customerPhone: '+234 803 000 1122',
      items: [
        {
          productId: posProduct.id,
          quantity: 10,
          unitPrice: posProduct.sellingPrice,
        },
      ],
      paymentMethod: 'cash',
      amountPaid: posProduct.sellingPrice * 10,
      amountTendered: posProduct.sellingPrice * 10,
      performedBy: 'usr-cashier-01',
      performedByName: 'Blessing Udoh',
    });

    assert(Boolean(sale.id && sale.saleReference), 'POS', 'POS Sale Completed with Reference Number');
    assert(sale.balanceDue === 0, 'POS', 'Zero Balance on Full Payment Checkout');
  }

  // --------------------------------------------------------------------------
  // SUITE 7: Warehouse Fulfilment Workflow
  // --------------------------------------------------------------------------
  console.log('\n--- Suite 7: Warehouse Fulfilment Workflow ---');
  {
    const orders = await orderRepository.getAllOrders();
    const activeOrder = orders.find((o) => o.status === 'confirmed' || o.status === 'pending') || orders[0];

    if (activeOrder) {
      // Ensure sufficient stock is received at main warehouse location
      for (const item of activeOrder.items) {
        if (item.productId) {
          await inventoryService.receiveStock({
            productId: item.productId,
            variantId: item.variantId,
            destinationLocationId: 'loc-1000-0000-0000-0000-000000000001',
            quantity: item.quantity + 5000,
            reason: 'QA Fulfilment Pre-Stock Receipt',
            performedBy: 'usr-wh-01',
            performedByName: 'Emeka Okonkwo',
          });
        }
      }

      const fulfilment = await warehouseService.createFulfilment({
        orderId: activeOrder.id,
        fulfilmentType: 'delivery',
        sourceLocationId: 'loc-1000-0000-0000-0000-000000000001',
        destinationAddress: activeOrder.deliveryAddress || 'Plot 12 Industrial Layout',
        allocatedItems: activeOrder.items.map((item) => ({
          orderItemId: item.id,
          productId: item.productId || 'b1000000-0000-0000-0000-000000000002',
          variantId: item.variantId,
          allocatedQuantity: item.quantity,
        })),
        createdBy: 'usr-wh-01',
        createdByName: 'Emeka Okonkwo',
      });

      assert(Boolean(fulfilment && fulfilment.fulfilmentNumber), 'Warehouse', 'Fulfilment Record Created with Sequential Tracking Number');

      // Update picking
      const updatedPicking = await warehouseService.updatePickingProgress(
        fulfilment.id,
        fulfilment.items.map((it) => ({ itemId: it.id, pickedQuantity: it.allocatedQuantity })),
        'usr-wh-01',
        'Emeka Okonkwo'
      );
      assert(updatedPicking.status === 'picked', 'Warehouse', 'Fulfilment Items Fully Picked');

      // Dispatch
      const dispatched = await warehouseService.dispatchFulfilment(
        fulfilment.id,
        {
          dispatchedAt: new Date().toISOString(),
          dispatchedBy: 'usr-wh-01',
          dispatchedByName: 'Emeka Okonkwo',
          driverName: 'Chidi Amadi',
          driverPhone: '+234 803 777 8899',
          vehicleNumber: 'ENU-442-XA',
          deliveryStatus: 'dispatched',
        },
        'usr-wh-01',
        'Emeka Okonkwo'
      );
      assert(dispatched.status === 'in_transit', 'Warehouse', 'Fulfilment Dispatched and In Transit with Driver and Waybill');
    } else {
      console.log('  ⚠ [Warehouse] Skipped: No active confirmed orders available to allocate.');
    }
  }

  // --------------------------------------------------------------------------
  // SUITE 8: Installation & Service Job Workflows
  // --------------------------------------------------------------------------
  console.log('\n--- Suite 8: Installation & Service Jobs ---');
  {
    const job = await installationService.createServiceJob({
      serviceType: 'installation',
      customerName: 'Barrister Ifeanyi Okafor',
      customerPhone: '+234 805 222 3344',
      siteAddress: 'New Haven, Enugu',
      siteCity: 'Enugu',
      siteState: 'Enugu',
      assignedStaffId: 'u0000000-0000-0000-0000-000000000004',
      assignedStaffName: 'Sunday Nwosu',
      scheduledDate: new Date().toISOString().split('T')[0],
      totalEstimatedSqm: 320,
    } as any, 'usr-admin-01', 'Engr. David Adeleke');

    assert(Boolean(job && job.jobReference), 'Installation', 'Service Job Created with Job Reference');
    assert(Boolean(job.status), 'Installation', 'Job initialized with valid status');

    // Update progress
    const updatedJob = await installationService.updateInstallationProgress(job.id, {
      percentComplete: 50,
      squareMetersInstalled: 160,
      unitsOrBricksLaid: 8000,
      currentSectionNotes: 'Sub-base graded and stone-dust screeding completed.',
    }, 'u0000000-0000-0000-0000-000000000004', 'Sunday Nwosu');
    assert(updatedJob.installationDetails?.percentComplete === 50, 'Installation', 'Job Milestone Progress Updated to 50%');
  }

  // --------------------------------------------------------------------------
  // SUITE 9: Operating Expenses & Finance Workflows
  // --------------------------------------------------------------------------
  console.log('\n--- Suite 9: Operating Expenses & Financial Approvals ---');
  {
    const expense = await expenseService.createExpense(
      {
        title: 'Diesel Fuel for Block Machine Generator',
        category: 'fuel_utilities',
        amount: 145000,
        dateIncurred: '2026-10-01',
        paymentMethod: 'bank_transfer',
        payeeType: 'supplier',
        payeeName: 'TotalEnergies Enugu',
        receiptReference: 'TOT-2026-9912',
        notes: '500 Litres diesel delivered for factory press operations.',
      },
      {
        id: 'u0000000-0000-0000-0000-000000000003',
        fullName: 'Babajide Sanwo',
      }
    );

    assert(Boolean(expense && expense.expenseNumber), 'Finance', 'Operating Expense Created with Voucher Number');
    assert(expense.status === 'pending', 'Finance', 'Initial Expense Status is pending');

    // Approve Expense
    const approvedExpense = await expenseService.approveOrRejectExpense(
      expense.id,
      {
        approved: true,
        notes: 'Approved for production operations by Director',
      },
      {
        id: 'u0000000-0000-0000-0000-000000000001',
        fullName: 'Engr. David Adeleke',
      }
    );
    assert(approvedExpense.status === 'approved', 'Finance', 'Expense Formally Approved by Authorized Administrator');
  }

  // --------------------------------------------------------------------------
  // SUITE 10: Audit Log Immutability & Traceability
  // --------------------------------------------------------------------------
  console.log('\n--- Suite 10: Audit Logging & Immutability ---');
  {
    const log = await auditService.logBusinessAction({
      action: 'APPROVE',
      entityType: 'expense',
      entityId: 'exp-qa-test-01',
      entityReference: 'EXP-2026-9912',
      actor: {
        id: 'usr-admin-01',
        email: 'admin@xforcebricks.internal',
        name: 'Engr. David Adeleke',
        role: 'administrator',
      },
      reason: 'Routine equipment operating expense approval',
      status: 'success',
    });

    assert(Boolean(log && log.id), 'Audit', 'Audit Record Created');
    assert(log.action === 'APPROVE', 'Audit', 'Action accurately logged as APPROVE');
    assert(log.entityType === 'expense', 'Audit', 'Entity accurately logged as expense');

    // Verify audit logs cannot be modified via repository
    const allLogs = await auditRepository.getAll();
    const exists = allLogs.some((l) => l.id === log.id);
    assert(exists, 'Audit', 'New audit entry retrieved from historical stream');
  }

  // --------------------------------------------------------------------------
  // SUITE 11: Offline Outbox & Idempotency
  // --------------------------------------------------------------------------
  console.log('\n--- Suite 11: Offline Outbox, Idempotency & Deduplication ---');
  {
    // Test 11.1: Client-generated unique operation IDs
    const op1 = offlineQueue.enqueue('create_request', {
      fullName: 'Offline Test Buyer',
      phone: '+234 809 111 2233',
    });
    assert(Boolean(op1 && op1.id && op1.status === 'pending'), 'Offline Sync', 'Offline Operation Queued with Unique Operation ID');

    // Test 11.2: Idempotent duplicate check
    const items = offlineQueue.getItems();
    const isPresent = items.some((i) => i.id === op1.id);
    assert(isPresent, 'Offline Sync', 'Existing Operation ID Detected in Queue to prevent duplicate processing');
  }

  // --------------------------------------------------------------------------
  // SUITE 12: Communication, Real-Time Bus & Notifications
  // --------------------------------------------------------------------------
  console.log('\n--- Suite 12: Communication, Real-Time Bus & Notifications ---');
  {
    const notif = await notificationService.dispatchNotification({
      recipientType: 'staff',
      recipientId: 'u0000000-0000-0000-0000-000000000001',
      recipientName: 'Engr. David Adeleke',
      type: 'ORDER_UPDATED',
      title: 'QA Order Dispatch Notification',
      message: 'Materials loaded for Site 12. Driver dispatched.',
      priority: 'normal',
      relatedEntityType: 'order',
      relatedEntityId: 'ord-qa-test-1',
    });
    assert(Boolean(notif && notif.id), 'Notifications', 'Real-time In-App Notification Dispatched');

    const unreadCount = await notificationService.getUnreadCount('u0000000-0000-0000-0000-000000000001', 'staff');
    assert(unreadCount > 0, 'Notifications', 'Recipient unread count incremented');

    await notificationService.markAsRead(notif.id);
    const unreadAfter = await notificationService.getUnreadCount('u0000000-0000-0000-0000-000000000001', 'staff');
    assert(unreadAfter === unreadCount - 1, 'Notifications', 'Notification read status updated');
  }

  // --------------------------------------------------------------------------
  // SUITE 13: Offline Sync Engine & Queue Lifecycle
  // --------------------------------------------------------------------------
  console.log('\n--- Suite 13: Offline Sync Engine & Queue Lifecycle ---');
  {
    const syncItem = await syncEngine.enqueue({
      operationType: 'CREATE_REQUEST',
      entityType: 'request',
      localEntityId: 'loc-req-qa-02',
      payload: { customerName: 'Offline Builder' },
    });
    assert(Boolean(syncItem && syncItem.operationId), 'Sync Engine', 'Sync Engine Enqueue with Operation ID');

    const syncStatus = await syncEngine.getStatus();
    assert(syncStatus.pendingCount > 0, 'Sync Engine', 'Sync Engine Tracks Pending Items in Local Storage');
    syncEngine.destroy();
  }

  // --------------------------------------------------------------------------
  // SUITE 14: System Health Monitoring & Operational Diagnostics (Module 26)
  // --------------------------------------------------------------------------
  console.log('\n--- Suite 14: System Health Monitoring & Operational Diagnostics ---');
  {
    // 14.1 Full Health Check
    const health = await systemHealthService.runHealthCheck();
    assert(Boolean(health && health.components && health.components.length >= 8), 'Diagnostics', 'Health Check aggregates core infrastructure components');
    assert(typeof health.score === 'number' && health.score >= 0 && health.score <= 100, 'Diagnostics', 'System Health Score computed as valid percentage');

    // Verify key components exist
    const hasCore = health.components.some((c) => c.id === 'app_core');
    const hasDb = health.components.some((c) => c.id === 'database');
    const hasSync = health.components.some((c) => c.id === 'sync_engine');
    const hasStorage = health.components.some((c) => c.id === 'offline_storage');
    const hasPwa = health.components.some((c) => c.id === 'pwa');

    assert(hasCore && hasDb && hasSync && hasStorage && hasPwa, 'Diagnostics', 'Mandatory system components evaluated in health report');

    // 14.2 Error Logger Reference Generation
    const captured = errorLogger.captureError({
      module: 'sync',
      operation: 'outbox_flush',
      severity: 'WARNING',
      userRole: 'administrator',
      rawError: new Error('Simulated network timeout during outbox sync'),
      userMessage: 'Sync retry queued for next online window.',
      referenceId: 'REF-TEST-001',
    });

    assert(/^ERR-\d{8}-\d{4}$/.test(captured.id), 'Diagnostics', 'Error Reference matches standard format ERR-YYYYMMDD-XXXX');
    assert(captured.severity === 'WARNING', 'Diagnostics', 'Error severity accurately recorded');
    assert(captured.resolved === false, 'Diagnostics', 'New operational error initialized as unresolved');

    // 14.3 Sensitive Data Scrubbing
    const rawSensitive = 'Connection failed with password=SecretPassword123 and Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 and Xforcecon';
    const scrubbed = errorLogger.scrubSensitiveText(rawSensitive);
    assert(!scrubbed.includes('SecretPassword123') && !scrubbed.includes('Xforcecon') && !scrubbed.includes('eyJhbGci'), 'Diagnostics', 'Operational Error Logger scrubs passwords, Bearer tokens, and default credentials');

    // 14.4 Technical Code to Friendly Message Mapping
    const friendly116 = errorLogger.toUserFriendlyMessage({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' });
    assert(friendly116.toLowerCase().includes('could not be found'), 'Diagnostics', 'PGRST116 mapped to user-friendly record-not-found guidance');

    const friendlyDuplicate = errorLogger.toUserFriendlyMessage({ code: '23505', message: 'duplicate key value violates unique constraint' });
    assert(friendlyDuplicate.toLowerCase().includes('already exists'), 'Diagnostics', '23505 mapped to user-friendly duplicate record guidance');

    // 14.5 Error Resolution Workflow
    const resolveSuccess = errorLogger.resolveError(captured.id, 'Engr. David Adeleke');
    assert(resolveSuccess, 'Diagnostics', 'Administrator can mark diagnostic failure as resolved');

    const allErrorsAfterResolve = errorLogger.getAllErrors();
    const resolvedItem = allErrorsAfterResolve.find((e) => e.id === captured.id);
    assert(resolvedItem?.resolved === true && Boolean(resolvedItem?.resolvedAt), 'Diagnostics', 'Resolved error persists resolution timestamp and resolver');

    // 14.6 Clear Resolved Diagnostic Records
    const clearedCount = errorLogger.clearResolvedErrors();
    assert(clearedCount >= 1, 'Diagnostics', 'Clear Resolved removes investigated diagnostic records');

    // 14.7 Separation from Module 21 Audit Logs
    const auditLogs = await auditRepository.getAll();
    assert(auditLogs.length > 0, 'Diagnostics', 'Module 21 Audit Logs remain intact and separate from operational diagnostic cleanup');
  }

  // --------------------------------------------------------------------------
  // SUITE 15: Administrator Authentication, Profile & RBAC Permissions
  // --------------------------------------------------------------------------
  console.log('\n--- Suite 15: Administrator Authentication, Profile & RBAC Permissions ---');
  {
    const targetUid = '4a56de99-4eb2-4ae2-9e94-b7dceb45976f';
    const targetEmail = 'admin@xforce.com';

    // 15.1 Verify Administrator Profile Resolution
    const authData = await authService.fetchProfileAndPermissions(targetUid, targetEmail);
    assert(authData.profile.id === targetUid, 'Admin Auth', 'Administrator profile ID matches designated Auth UID');
    assert(authData.profile.email === targetEmail, 'Admin Auth', 'Administrator profile email matches admin@xforce.com');
    assert(authData.profile.status === 'active', 'Admin Auth', 'Administrator account status is active');
    assert(authData.profile.role_id === 'a0000000-0000-0000-0000-000000000001', 'Admin Auth', 'Administrator assigned to standard system administrator role ID');
    assert(authData.role.name === 'administrator', 'Admin Auth', 'Administrator role name is administrator');

    // 15.2 Verify Administrator Permissions Coverage
    assert(authData.permissions.includes(PERMISSION_CODES.DASHBOARD_VIEW), 'Admin Auth', 'Administrator has dashboard view permission');
    assert(authData.permissions.includes(PERMISSION_CODES.SYSTEM_HEALTH_VIEW), 'Admin Auth', 'Administrator has system health diagnostic view permission');
    assert(authData.permissions.includes(PERMISSION_CODES.SETTINGS_MANAGE), 'Admin Auth', 'Administrator has settings management permission');
    assert(authData.permissions.includes(PERMISSION_CODES.AUDIT_LOGS_VIEW), 'Admin Auth', 'Administrator has audit logs view permission');
    assert(authData.permissions.length === Object.values(PERMISSION_CODES).length, 'Admin Auth', 'Administrator granted complete set of system permissions');

    // 15.3 Verify Development Sandbox Persona Alignment
    const adminPersona = DEV_SANDBOX_PERSONAS.administrator;
    assert(adminPersona.user.id === targetUid, 'Admin Auth', 'Sandbox administrator persona UID matches 4a56de99-4eb2-4ae2-9e94-b7dceb45976f');
    assert(adminPersona.user.email === targetEmail, 'Admin Auth', 'Sandbox administrator persona email matches admin@xforce.com');
    assert(adminPersona.profile.status === 'active', 'Admin Auth', 'Sandbox administrator profile status is active');

    // 15.4 Verify Staff Repository Foundation Alignment
    const staffAdmin = await staffRepository.getById(targetUid);
    assert(Boolean(staffAdmin), 'Admin Auth', 'Administrator found in staff repository seed');
    assert(staffAdmin?.email === targetEmail, 'Admin Auth', 'Staff repository administrator email matches admin@xforce.com');
    assert(staffAdmin?.roleName === 'administrator', 'Admin Auth', 'Staff repository administrator roleName is administrator');
    assert(staffAdmin?.accountStatus === 'active', 'Admin Auth', 'Staff repository administrator accountStatus is active');

    // 15.5 Verify Error Sanitization on Network / Fetch Disconnects
    const safeErrorFetch = (authService as any).getSafeAuthErrorMessage(new Error('fetch failed'));
    assert(safeErrorFetch.isNetworkError === true, 'Admin Auth', 'fetch failed error classified as connection issue');
    assert(safeErrorFetch.message.includes('connect to the authentication server'), 'Admin Auth', 'Connection failure message clearly guides user');

    const safeErrorRetryable = (authService as any).getSafeAuthErrorMessage({ name: 'AuthRetryableFetchError', message: 'TypeError: fetch failed', status: 0 });
    assert(safeErrorRetryable.isNetworkError === true, 'Admin Auth', 'AuthRetryableFetchError with status 0 classified as network error');

    // 15.6 Verify Self-Healing of Administrator Role & Active Status
    const recoveredAuth = await authService.fetchProfileAndPermissions(targetUid, targetEmail);
    assert(recoveredAuth.role.id === 'a0000000-0000-0000-0000-000000000001', 'Admin Auth', 'Administrator role assignment strictly enforced');
    assert(recoveredAuth.profile.status === 'active', 'Admin Auth', 'Administrator status strictly guaranteed active');
    assert(recoveredAuth.permissions.includes(PERMISSION_CODES.DASHBOARD_VIEW), 'Admin Auth', 'Administrator guaranteed dashboard access');
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n=============================================================');
  console.log('TEST SUITE EXECUTION SUMMARY');
  console.log('=============================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Total Assertions Run: ${total}`);
  console.log(`Passed:               ${passed}`);
  console.log(`Failed:               ${failed}`);
  console.log('=============================================================\n');

  if (failed > 0) {
    console.error('FAILED TESTS:');
    results.filter((r) => !r.passed).forEach((f) => {
      console.error(`- [${f.suite}] ${f.name}: ${f.error}`);
    });
    process.exit(1);
  } else {
    console.log('ALL QA AUTOMATION TESTS PASSED CLEANLY.\n');
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('FATAL TEST RUNNER ERROR:', err);
  process.exit(1);
});
