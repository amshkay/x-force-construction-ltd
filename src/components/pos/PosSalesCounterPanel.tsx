import React, { useState, useEffect } from 'react';
import {
  Receipt,
  ShoppingCart,
  History,
  TrendingUp,
  Banknote,
  Building2,
  AlertCircle,
  CreditCard,
  CheckCircle2,
  RefreshCw,
  Store,
} from 'lucide-react';
import { Product, ProductCategory } from '../../types/product';
import { StockLocation, InventoryBalance } from '../../types/inventory';
import { Customer } from '../../types/customer';
import { PosSale, PosSummaryStats, PosDiscountType, PosCartItem } from '../../types/pos';
import { PaymentMethod } from '../../types/payment';
import { productRepository } from '../../repositories/product.repository';
import { stockLocationRepository } from '../../repositories/stockLocation.repository';
import { inventoryRepository } from '../../repositories/inventory.repository';
import { customerRepository } from '../../repositories/customer.repository';
import { posService } from '../../services/pos.service';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { PosRegisterView } from './PosRegisterView';
import { PosSalesHistoryView } from './PosSalesHistoryView';
import { PosCheckoutModal } from './PosCheckoutModal';
import { PosReceiptModal } from './PosReceiptModal';
import { PosSaleDetailModal } from './PosSaleDetailModal';

export const PosSalesCounterPanel: React.FC = () => {
  const { profile } = useAuth();

  // Top view tab: 'register' | 'history'
  const [activeTab, setActiveTab] = useState<'register' | 'history'>('register');

  // Master domain data
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<StockLocation | null>(null);
  const [balances, setBalances] = useState<InventoryBalance[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<PosSummaryStats>({
    todaySalesCount: 0,
    todaySalesTotal: 0,
    todayCashTotal: 0,
    todayTransferTotal: 0,
    todayCardTotal: 0,
    todayOnlineTotal: 0,
    todayCreditTotal: 0,
    totalItemsSold: 0,
  });
  const [loading, setLoading] = useState(true);

  // Modal states
  const [checkoutPayload, setCheckoutPayload] = useState<{
    cartItems: PosCartItem[];
    subtotal: number;
    cartDiscountType: PosDiscountType;
    cartDiscountValue: number;
    cartDiscountAmount: number;
    additionalChargesFee: number;
    additionalChargesNote: string;
    totalDiscountAmount: number;
    totalAmount: number;
    selectedCustomer: Customer | null;
  } | null>(null);

  const [activeReceiptSaleId, setActiveReceiptSaleId] = useState<string | null>(null);
  const [activeDetailSale, setActiveDetailSale] = useState<PosSale | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allProducts, allCategories, allLocations, allBalances, allCustomers, summary] =
        await Promise.all([
          productRepository.getAllProducts(),
          productRepository.getAllCategories(),
          stockLocationRepository.getAllLocations(),
          inventoryRepository.getAllBalances(),
          customerRepository.getAllCustomers(),
          posService.getSummaryStats(),
        ]);

      setProducts(allProducts);
      setCategories(allCategories);
      setLocations(allLocations);
      setBalances(allBalances);
      setCustomers(allCustomers);
      setStats(summary);

      // Default to first active or default location
      if (!selectedLocation && allLocations.length > 0) {
        const defaultLoc = allLocations.find((l) => l.isDefault && l.isActive) || allLocations.find((l) => l.isActive) || allLocations[0];
        setSelectedLocation(defaultLoc);
      }
    } catch (err) {
      console.error('[PosSalesCounterPanel] Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Confirmed Checkout Execution
  const handleConfirmCheckout = async (paymentData: {
    paymentMethod: PaymentMethod;
    amountPaid: number;
    amountTendered?: number;
    referenceNumber?: string;
    bankName?: string;
    notes?: string;
  }) => {
    if (!checkoutPayload || !selectedLocation) return;

    const completedSale = await posService.completeSale({
      locationId: selectedLocation.id,
      customerId: checkoutPayload.selectedCustomer ? checkoutPayload.selectedCustomer.id : null,
      customerName: checkoutPayload.selectedCustomer ? checkoutPayload.selectedCustomer.fullName : 'Walk-in Customer',
      customerPhone: checkoutPayload.selectedCustomer?.phone || undefined,
      customerEmail: checkoutPayload.selectedCustomer?.email || undefined,
      customerAddress: checkoutPayload.selectedCustomer?.address || undefined,
      isGuestCustomer: !checkoutPayload.selectedCustomer,
      items: checkoutPayload.cartItems.map((ci) => ({
        productId: ci.productId,
        variantId: ci.variantId,
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        originalUnitPrice: ci.standardPrice,
        isPriceOverridden: ci.isPriceOverridden,
        overrideReason: ci.overrideReason,
        discountType: ci.discountType,
        discountValue: ci.discountValue,
      })),
      cartDiscountType: checkoutPayload.cartDiscountType,
      cartDiscountValue: checkoutPayload.cartDiscountValue,
      additionalChargesFee: checkoutPayload.additionalChargesFee,
      additionalChargesNote: checkoutPayload.additionalChargesNote,
      paymentMethod: paymentData.paymentMethod,
      amountPaid: paymentData.amountPaid,
      amountTendered: paymentData.amountTendered,
      referenceNumber: paymentData.referenceNumber,
      bankName: paymentData.bankName,
      notes: paymentData.notes,
      performedBy: profile?.id,
      performedByName: profile?.full_name || 'POS Cashier',
    });

    // Close checkout payload
    setCheckoutPayload(null);

    // Refresh balances and stats
    await loadData();

    // Immediately pop up receipt modal for printing or sharing
    setActiveReceiptSaleId(completedSale.id);
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Metrics Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400">
                <Store className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  POS / Sales Counter Terminal
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Direct physical counter sales, rapid stock deduction, cash change, and instant customer receipts.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadData}
              className="text-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Live KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1 text-xs">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/50">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-orange-600" /> Today's Sales
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
              ₦{stats.todaySalesTotal.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400">{stats.todaySalesCount} completed sales</span>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/50">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block flex items-center gap-1">
              <Banknote className="h-3 w-3 text-emerald-600" /> Cash Tendered
            </span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              ₦{stats.todayCashTotal.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400">Physical drawer cash</span>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/50">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block flex items-center gap-1">
              <CreditCard className="h-3 w-3 text-blue-600" /> Card & POS Terminal
            </span>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5 block">
              ₦{stats.todayCardTotal.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400">Terminal settlements</span>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/50">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block flex items-center gap-1">
              <Building2 className="h-3 w-3 text-indigo-600" /> Bank Transfers
            </span>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 block">
              ₦{stats.todayTransferTotal.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400">Verified bank transfers</span>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/50 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-amber-600" /> Outstanding Credit
            </span>
            <span className={`text-sm font-bold mt-0.5 block ${stats.todayCreditTotal > 0 ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
              ₦{stats.todayCreditTotal.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400">Partial payment balances</span>
          </div>
        </div>

        {/* Tab Navigation Switcher */}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('register')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              activeTab === 'register'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Sales Counter (Register)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              activeTab === 'history'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <History className="h-4 w-4" />
            <span>Sales History & Receipts</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'register' ? (
        <PosRegisterView
          products={products}
          categories={categories}
          locations={locations}
          selectedLocation={selectedLocation}
          onSelectLocation={(loc) => setSelectedLocation(loc)}
          balances={balances}
          customers={customers}
          onOpenCheckout={(payload) => setCheckoutPayload(payload)}
        />
      ) : (
        <PosSalesHistoryView
          locations={locations}
          onViewSale={(sale) => setActiveDetailSale(sale)}
          onReprintReceipt={(saleId) => setActiveReceiptSaleId(saleId)}
        />
      )}

      {/* Checkout Modal */}
      {checkoutPayload && (
        <PosCheckoutModal
          isOpen={Boolean(checkoutPayload)}
          onClose={() => setCheckoutPayload(null)}
          items={checkoutPayload.cartItems}
          subtotal={checkoutPayload.subtotal}
          cartDiscountAmount={checkoutPayload.cartDiscountAmount}
          totalDiscountAmount={checkoutPayload.totalDiscountAmount}
          additionalChargesFee={checkoutPayload.additionalChargesFee}
          totalAmount={checkoutPayload.totalAmount}
          selectedCustomer={checkoutPayload.selectedCustomer}
          locationName={selectedLocation?.name || 'Main Yard'}
          onConfirmCheckout={handleConfirmCheckout}
        />
      )}

      {/* Printable Receipt Modal */}
      <PosReceiptModal
        isOpen={Boolean(activeReceiptSaleId)}
        saleId={activeReceiptSaleId}
        onClose={() => setActiveReceiptSaleId(null)}
        onNewSale={() => {
          setActiveReceiptSaleId(null);
          setActiveTab('register');
        }}
      />

      {/* Sale Detail / History Snapshot Modal */}
      <PosSaleDetailModal
        isOpen={Boolean(activeDetailSale)}
        sale={activeDetailSale}
        onClose={() => setActiveDetailSale(null)}
        onReprintReceipt={(saleId) => {
          setActiveDetailSale(null);
          setActiveReceiptSaleId(saleId);
        }}
        onSaleUpdated={loadData}
      />
    </div>
  );
};
