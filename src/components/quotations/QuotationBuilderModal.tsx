/**
 * Quotation Builder Modal
 * Module 09 — Customer Requests & Quotation Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  Plus,
  Trash2,
  Package,
  Wrench,
  Percent,
  Truck,
  ShieldCheck,
  Calculator,
  User,
  MapPin,
  Calendar,
  AlertCircle,
  Save,
  Send,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { useToast } from '../ui/Toast';
import {
  Quotation,
  CreateQuotationDTO,
  CreateQuotationItemDTO,
  QuotationItemType,
} from '../../types/quotation';
import { Customer } from '../../types/customer';
import { Product, ProductVariant } from '../../types/product';
import { customerRepository } from '../../repositories/customer.repository';
import { productRepository } from '../../repositories/product.repository';
import { quotationService } from '../../services/quotation.service';
import { requestRepository } from '../../repositories/request.repository';
import { businessSettingsService } from '../../services/settings.service';
import { calculateQuotationFinancials, roundMoney } from '../../utils/quotationCalculations';

interface QuotationBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuotationCreated?: (quotation: Quotation) => void;
  initialRequestId?: string | null;
  existingQuotation?: Quotation | null;
}

export const QuotationBuilderModal: React.FC<QuotationBuilderModalProps> = ({
  isOpen,
  onClose,
  onQuotationCreated,
  initialRequestId,
  existingQuotation,
}) => {
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Available data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Customer selection
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Request link
  const [linkedRequestId, setLinkedRequestId] = useState<string | null>(initialRequestId || null);
  const [linkedRequestNumber, setLinkedRequestNumber] = useState<string | null>(null);

  // Quotation Dates
  const todayStr = new Date().toISOString().split('T')[0];
  const defaultValidUntil = () => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  };

  const [quotationDate, setQuotationDate] = useState(todayStr);
  const [validUntil, setValidUntil] = useState(defaultValidUntil());

  // Line items
  const [items, setItems] = useState<CreateQuotationItemDTO[]>([
    {
      itemType: 'product',
      description: 'Compressed Earth Interlocking Facing Bricks (Standard Terracotta)',
      unit: 'piece',
      quantity: 3000,
      unitPrice: 280,
      discountAmount: 0,
    },
  ]);

  // Adjustments & Charges
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [installationFee, setInstallationFee] = useState<number>(0);
  const [otherChargesFee, setOtherChargesFee] = useState<number>(0);
  const [otherChargesDescription, setOtherChargesDescription] = useState<string>('');
  const [taxRate, setTaxRate] = useState<number>(0);
  const [depositPercentage, setDepositPercentage] = useState<number>(70);

  // Terms and Notes
  const [notes, setNotes] = useState(
    'Standard factory production queue. High compressive hydraulic curing.'
  );
  const [termsAndConditions, setTermsAndConditions] = useState(
    '1. Validity: 30 days from quotation issue date.\n' +
      '2. Payment Terms: 70% advance mobilization deposit upon order booking, 30% balance payable prior to final factory dispatch.\n' +
      '3. Site Delivery: Direct offloading site must be free of low overhead electrical cables and allow 30-ton flatbed truck access.'
  );
  const [internalNotes, setInternalNotes] = useState('');

  // Load customers, products, and initial request data
  useEffect(() => {
    const initData = async () => {
      try {
        const [allCusts, allProds] = await Promise.all([
          customerRepository.getAllCustomers(),
          productRepository.getAllProducts(),
        ]);
        setCustomers(allCusts);
        setProducts(allProds);

        // If initialRequestId is provided, load request details
        if (initialRequestId) {
          const req = await requestRepository.getRequestById(initialRequestId);
          if (req) {
            setLinkedRequestId(req.id);
            setLinkedRequestNumber(req.requestNumber);
            setCustomerName(req.customerName);
            setCustomerPhone(req.customerPhone);
            setCustomerEmail(req.customerEmail || '');
            setCustomerAddress(
              req.projectAddress
                ? `${req.projectAddress}, ${req.projectCity || ''}`.trim()
                : ''
            );

            if (req.customerId) {
              setSelectedCustomerId(req.customerId);
            }

            // Map request items if available
            if (req.items && req.items.length > 0) {
              const mapped = req.items.map((it) => {
                let unitPrice = 0;
                let sku = '';
                const matchProd = allProds.find((p: any) => p.id === it.productId);
                if (matchProd) {
                  unitPrice = matchProd.sellingPrice;
                  sku = matchProd.sku;
                  if (it.variantId && matchProd.variants) {
                    const matchVar = matchProd.variants.find((v: any) => v.id === it.variantId);
                    if (matchVar && matchVar.priceOverride !== null && matchVar.priceOverride !== undefined) {
                      unitPrice = matchVar.priceOverride;
                    }
                  }
                }

                return {
                  itemType: 'product' as QuotationItemType,
                  productId: it.productId,
                  variantId: it.variantId,
                  sku,
                  description: it.itemName,
                  unit: it.unit || 'piece',
                  quantity: it.quantity,
                  unitPrice,
                  discountAmount: 0,
                };
              });
              setItems(mapped);
            }
          }
        } else if (existingQuotation) {
          // Editing existing quotation
          setCustomerName(existingQuotation.customerName);
          setCustomerPhone(existingQuotation.customerPhone);
          setCustomerEmail(existingQuotation.customerEmail || '');
          setCustomerAddress(existingQuotation.customerAddress || '');
          setSelectedCustomerId(existingQuotation.customerId || '');
          setQuotationDate(existingQuotation.quotationDate);
          setValidUntil(existingQuotation.validUntil);
          setDeliveryFee(existingQuotation.deliveryFee);
          setInstallationFee(existingQuotation.installationFee);
          setOtherChargesFee(existingQuotation.otherChargesFee);
          setOtherChargesDescription(existingQuotation.otherChargesDescription || '');
          setTaxRate(existingQuotation.taxRate);
          setNotes(existingQuotation.notes || '');
          setTermsAndConditions(existingQuotation.termsAndConditions || '');
          setInternalNotes(existingQuotation.internalNotes || '');
          setItems(
            existingQuotation.items.map((it) => ({
              itemType: it.itemType,
              productId: it.productId,
              variantId: it.variantId,
              sku: it.sku,
              description: it.description,
              unit: it.unit,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              discountAmount: it.discountAmount,
            }))
          );
        }
      } catch (err) {
        console.warn('[QuotationBuilderModal] Error loading reference data:', err);
      }
    };

    if (isOpen) {
      initData();
    }
  }, [isOpen, initialRequestId, existingQuotation]);

  // Handle customer picker change
  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    if (!customerId) return;

    const cust = customers.find((c) => c.id === customerId);
    if (cust) {
      setCustomerName(cust.fullName);
      setCustomerPhone(cust.phone);
      setCustomerEmail(cust.email || '');
      setCustomerAddress(
        cust.address ? `${cust.address}, ${cust.city || ''} ${cust.state || ''}`.trim() : ''
      );
    }
  };

  // Quick validity buttons
  const setValidityDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setValidUntil(d.toISOString().split('T')[0]);
  };

  // Add Product item from Catalogue
  const handleAddProduct = (product: Product, variant?: ProductVariant) => {
    const price = variant && variant.priceOverride !== null && variant.priceOverride !== undefined
      ? variant.priceOverride
      : product.sellingPrice;

    const desc = variant ? `${product.name} (${variant.name})` : product.name;
    const sku = variant?.sku || product.sku;

    setItems((prev) => [
      ...prev,
      {
        itemType: 'product',
        productId: product.id,
        variantId: variant?.id,
        sku,
        description: desc,
        unit: product.unit || 'piece',
        quantity: 1000,
        unitPrice: price,
        discountAmount: 0,
      },
    ]);
  };

  // Add standard service item
  const handleAddService = (title: string, defaultPrice: number, unit = 'service') => {
    setItems((prev) => [
      ...prev,
      {
        itemType: 'service',
        description: title,
        unit,
        quantity: 1,
        unitPrice: defaultPrice,
        discountAmount: 0,
      },
    ]);
  };

  // Add blank custom row
  const handleAddBlankRow = () => {
    setItems((prev) => [
      ...prev,
      {
        itemType: 'custom',
        description: '',
        unit: 'piece',
        quantity: 1,
        unitPrice: 0,
        discountAmount: 0,
      },
    ]);
  };

  // Update item field
  const handleUpdateItem = (
    index: number,
    field: keyof CreateQuotationItemDTO,
    value: any
  ) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return next;
    });
  };

  // Remove item row
  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Live Financial Calculation
  const financials = calculateQuotationFinancials({
    items,
    discountAmount,
    discountPercentage,
    deliveryFee,
    installationFee,
    otherChargesFee,
    taxRate,
    depositPercentage,
  });

  // Submit & Save
  const handleSave = async (markSent: boolean = false) => {
    if (!customerName.trim()) {
      toast.warning('Please enter customer full name.', 'Validation');
      return;
    }
    if (!customerPhone.trim()) {
      toast.warning('Please enter customer contact phone.', 'Validation');
      return;
    }
    if (items.length === 0) {
      toast.warning('At least one line item is required.', 'Empty Items');
      return;
    }

    setIsSaving(true);
    try {
      const status = markSent ? 'sent' : 'draft';
      const created = await quotationService.createQuotation({
        customerId: selectedCustomerId || null,
        requestId: linkedRequestId || null,
        requestNumber: linkedRequestNumber || null,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || null,
        customerAddress: customerAddress.trim() || null,
        quotationDate,
        validUntil,
        status,
        discountAmount: financials.discountAmount,
        discountPercentage,
        deliveryFee,
        installationFee,
        otherChargesFee,
        otherChargesDescription: otherChargesDescription.trim() || null,
        taxRate,
        depositRequired: financials.depositRequired,
        notes: notes.trim() || null,
        termsAndConditions: termsAndConditions.trim() || null,
        internalNotes: internalNotes.trim() || null,
        items,
      });

      toast.success(
        `Quotation #${created.quotationNumber} compiled successfully (${status.toUpperCase()}).`,
        'Quotation Saved'
      );

      onQuotationCreated?.(created);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save quotation.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl max-h-[95vh] overflow-y-auto rounded-2xl bg-white p-4 sm:p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {existingQuotation ? `Edit Quotation #${existingQuotation.quotationNumber}` : 'Compile New Quotation'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Authoritative commercial pricing, bill of quantities, and delivery haulage.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-6 my-6 text-xs">
          {/* Customer & Dates Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/40">
            {/* Customer Information */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-orange-600" />
                  Client & Billing Recipient
                </span>
                {linkedRequestNumber && (
                  <span className="font-mono text-[11px] font-bold text-orange-600">
                    Linked to Request #{linkedRequestNumber}
                  </span>
                )}
              </div>

              {customers.length > 0 && (
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                    Select Existing Customer (Optional):
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">-- Choose from Customer Directory or Enter Manually --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} ({c.phone}) {c.companyName ? `- ${c.companyName}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Full Client Name"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                    Phone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+234..."
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                    Project Site / Billing Address
                  </label>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Delivery site address..."
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Dates & Validity */}
            <div className="space-y-3">
              <span className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-orange-600" />
                Issue Date & Validity Window
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                    Quotation Date
                  </label>
                  <input
                    type="date"
                    value={quotationDate}
                    onChange={(e) => setQuotationDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                    Valid Until Date *
                  </label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Quick Validity Shortcuts */}
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">Quick Validity Period:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setValidityDays(14)}
                    className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] hover:border-orange-500"
                  >
                    14 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setValidityDays(30)}
                    className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] hover:border-orange-500 font-semibold text-orange-600"
                  >
                    30 Days (Standard)
                  </button>
                  <button
                    type="button"
                    onClick={() => setValidityDays(60)}
                    className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] hover:border-orange-500"
                  >
                    60 Days
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Catalogue & Service Adders */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 bg-orange-50/20 dark:bg-orange-950/10">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Package className="h-4 w-4 text-orange-600" />
                Quick Catalog Inserter (Authoritative Prices)
              </span>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() =>
                    handleAddService('Artisan Interlocking Brick Laying & Alignment', 85, 'piece')
                  }
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1"
                >
                  <Wrench className="h-3 w-3 text-orange-600" />
                  + Add Laying Service (₦85/pc)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleAddService('Flatbed Truck Logistics Haulage & Site Offloading', 150000, 'trip')
                  }
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1"
                >
                  <Truck className="h-3 w-3 text-orange-600" />
                  + Add Haulage Trip
                </button>
                <button
                  type="button"
                  onClick={handleAddBlankRow}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1"
                >
                  <Plus className="h-3 w-3 text-orange-600" />
                  + Custom Line Item
                </button>
              </div>
            </div>

            {/* Product Buttons */}
            {products.length > 0 && (
              <div className="flex gap-2 overflow-x-auto py-1 scrollbar-thin">
                {products.slice(0, 6).map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleAddProduct(prod)}
                    className="flex-shrink-0 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-[11px] text-left hover:border-orange-500 transition"
                  >
                    <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[140px]">
                      {prod.name}
                    </div>
                    <div className="text-[10px] text-orange-600 dark:text-orange-400 font-mono">
                      ₦{prod.sellingPrice.toLocaleString()} / {prod.unit}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Line Items Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="bg-slate-100 dark:bg-slate-800/90 px-4 py-2.5 flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Quotation Line Items ({items.length})
              </span>
              <button
                type="button"
                onClick={handleAddBlankRow}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Line
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
                  <tr>
                    <th className="py-2.5 pl-4 pr-2 w-10">#</th>
                    <th className="px-2 py-2.5 min-w-[200px]">Item Description</th>
                    <th className="px-2 py-2.5 w-20">Unit</th>
                    <th className="px-2 py-2.5 w-24">Quantity</th>
                    <th className="px-2 py-2.5 w-28">Rate (₦)</th>
                    <th className="px-2 py-2.5 w-24">Discount (₦)</th>
                    <th className="px-2 py-2.5 w-28 text-right">Line Total (₦)</th>
                    <th className="py-2.5 pl-2 pr-4 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {items.map((it, idx) => {
                    const qty = Math.max(0, Number(it.quantity) || 0);
                    const rate = Math.max(0, Number(it.unitPrice) || 0);
                    const disc = Math.max(0, Number(it.discountAmount) || 0);
                    const lineTot = Math.max(0, qty * rate - disc);

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2 pl-4 pr-2 text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={it.description}
                            onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                            placeholder="Product or service description..."
                            className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-slate-900 dark:text-white"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={it.unit || 'piece'}
                            onChange={(e) => handleUpdateItem(idx, 'unit', e.target.value)}
                            className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-slate-900 dark:text-white text-center font-mono"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min="1"
                            step="any"
                            value={it.quantity}
                            onChange={(e) =>
                              handleUpdateItem(idx, 'quantity', parseFloat(e.target.value) || 0)
                            }
                            className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-slate-900 dark:text-white text-right font-mono"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={it.unitPrice}
                            onChange={(e) =>
                              handleUpdateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)
                            }
                            className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-slate-900 dark:text-white text-right font-mono"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={it.discountAmount || 0}
                            onChange={(e) =>
                              handleUpdateItem(idx, 'discountAmount', parseFloat(e.target.value) || 0)
                            }
                            className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-slate-900 dark:text-white text-right font-mono"
                          />
                        </td>
                        <td className="px-2 py-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                          ₦{roundMoney(lineTot).toLocaleString()}
                        </td>
                        <td className="py-2 pl-2 pr-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-400 hover:text-red-500 p-1"
                            title="Remove row"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Calculation & Additional Charges Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Additional Charges & Adjustments */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-slate-50/50 dark:bg-slate-800/40">
              <span className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calculator className="h-4 w-4 text-orange-600" />
                Additional Logistics & Commercial Charges
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                    Delivery / Haulage Fee (₦)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white text-right font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                    Installation Fee (₦)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={installationFee}
                    onChange={(e) => setInstallationFee(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white text-right font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                    Other Fee (₦)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={otherChargesFee}
                    onChange={(e) => setOtherChargesFee(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white text-right font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                    Fee Description
                  </label>
                  <input
                    type="text"
                    value={otherChargesDescription}
                    onChange={(e) => setOtherChargesDescription(e.target.value)}
                    placeholder="e.g. Site technical soil survey"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                    Global Discount (%):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                    Deposit Policy (%):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={depositPercentage}
                    onChange={(e) => setDepositPercentage(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Live Financial Summary */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800/80 space-y-2.5">
              <span className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block border-b border-slate-200 dark:border-slate-700 pb-2">
                Quotation Financial Summary
              </span>

              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal ({financials.itemCount} items):</span>
                <span className="font-mono font-medium">₦{financials.subtotal.toLocaleString()}</span>
              </div>

              {financials.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Discount ({discountPercentage}%):</span>
                  <span className="font-mono font-medium">
                    -₦{financials.discountAmount.toLocaleString()}
                  </span>
                </div>
              )}

              {financials.deliveryFee > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Delivery & Haulage:</span>
                  <span className="font-mono font-medium">
                    +₦{financials.deliveryFee.toLocaleString()}
                  </span>
                </div>
              )}

              {financials.installationFee > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Artisan Installation:</span>
                  <span className="font-mono font-medium">
                    +₦{financials.installationFee.toLocaleString()}
                  </span>
                </div>
              )}

              {financials.otherChargesFee > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>{otherChargesDescription || 'Other Charges'}:</span>
                  <span className="font-mono font-medium">
                    +₦{financials.otherChargesFee.toLocaleString()}
                  </span>
                </div>
              )}

              {financials.taxAmount > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>VAT ({taxRate}%):</span>
                  <span className="font-mono font-medium">
                    +₦{financials.taxAmount.toLocaleString()}
                  </span>
                </div>
              )}

              <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between text-sm font-bold text-slate-900 dark:text-white">
                <span>Grand Total:</span>
                <span className="font-mono text-orange-600 dark:text-orange-400">
                  ₦{financials.totalAmount.toLocaleString()}
                </span>
              </div>

              <div className="rounded-lg bg-white dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-800 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span>Required Mobilization Deposit ({depositPercentage}%):</span>
                  <span className="font-mono font-bold">
                    ₦{financials.depositRequired.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Balance Payable Prior to Dispatch:</span>
                  <span className="font-mono font-medium">
                    ₦{financials.balanceDue.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Terms & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-1">
                Commercial Notes for Client
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-1">
                Terms & Conditions
              </label>
              <textarea
                rows={3}
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-xs text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>

          <div className="flex flex-wrap items-center gap-2 justify-end w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="flex items-center gap-1.5"
            >
              <Save className="h-4 w-4" />
              <span>Save as Draft</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="flex items-center gap-1.5"
            >
              <Send className="h-4 w-4" />
              <span>Save & Mark Sent</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
