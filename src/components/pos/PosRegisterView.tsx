import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Tag,
  Percent,
  User,
  UserPlus,
  Building,
  AlertCircle,
  Package,
  Layers,
  ChevronDown,
  X,
  CreditCard,
  DollarSign,
  ArrowRight,
  Boxes,
} from 'lucide-react';
import { Product, ProductCategory, ProductVariant } from '../../types/product';
import { StockLocation, InventoryBalance } from '../../types/inventory';
import { Customer } from '../../types/customer';
import { PosCartItem, PosDiscountType } from '../../types/pos';
import { roundMoney } from '../../utils/quotationCalculations';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';
import { PosPriceOverrideModal } from './PosPriceOverrideModal';
import { PosDiscountModal } from './PosDiscountModal';
import { PosCustomerQuickModal } from './PosCustomerQuickModal';

interface PosRegisterViewProps {
  products: Product[];
  categories: ProductCategory[];
  locations: StockLocation[];
  selectedLocation: StockLocation | null;
  onSelectLocation: (loc: StockLocation) => void;
  balances: InventoryBalance[];
  customers: Customer[];
  onOpenCheckout: (checkoutData: {
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
  }) => void;
}

export const PosRegisterView: React.FC<PosRegisterViewProps> = ({
  products,
  categories,
  locations,
  selectedLocation,
  onSelectLocation,
  balances,
  customers,
  onOpenCheckout,
}) => {
  // Cart state
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const toast = useToast();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);

  // Cart-level discounts & charges
  const [cartDiscountType, setCartDiscountType] = useState<PosDiscountType>('none');
  const [cartDiscountValue, setCartDiscountValue] = useState<number>(0);
  const [additionalChargesFee, setAdditionalChargesFee] = useState<number>(0);
  const [additionalChargesNote, setAdditionalChargesNote] = useState<string>('');
  const [showAdditionalChargesInput, setShowAdditionalChargesInput] = useState(false);

  // Product catalogue filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Modals for item actions
  const [overrideModalItem, setOverrideModalItem] = useState<PosCartItem | null>(null);
  const [discountModalMode, setDiscountModalMode] = useState<'line' | 'cart' | null>(null);
  const [discountModalLineItem, setDiscountModalLineItem] = useState<PosCartItem | null>(null);

  // Selected variant state per product in catalog: Record<productId, variantId>
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  // Helper map for balances by (productId:variantId:locationId)
  const balanceMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!selectedLocation) return map;
    balances.forEach((b) => {
      if (b.locationId === selectedLocation.id) {
        const key = `${b.productId}:${b.variantId || 'base'}`;
        const available = Math.max(0, b.quantityOnHand - b.quantityReserved);
        map.set(key, available);
      }
    });
    return map;
  }, [balances, selectedLocation]);

  // Keyboard shortcut to focus search: '/' or 'F2'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2' || (e.key === '/' && document.activeElement?.tagName !== 'INPUT')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter products
  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => p.isActive);

    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.categoryId === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.categoryName && p.categoryName.toLowerCase().includes(q)) ||
          p.variants?.some((v) => v.name.toLowerCase().includes(q) || v.sku.toLowerCase().includes(q))
      );
    }

    return list;
  }, [products, selectedCategory, searchQuery]);

  // Filter customers for dropdown
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 10);
    const q = customerSearch.toLowerCase().trim();
    return customers
      .filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q))
      )
      .slice(0, 10);
  }, [customers, customerSearch]);

  // Get stock available for a product and chosen variant
  const getProductStock = (product: Product, variantId?: string | null) => {
    const key = `${product.id}:${variantId || 'base'}`;
    return balanceMap.get(key) || 0;
  };

  // Add product to cart
  const handleAddToCart = (product: Product, chosenVariantId?: string | null) => {
    if (!selectedLocation) return;

    let variant: ProductVariant | null = null;
    let standardPrice = product.sellingPrice || 0;
    let sku = product.sku;

    if (chosenVariantId) {
      variant = product.variants?.find((v) => v.id === chosenVariantId) || null;
      if (variant) {
        sku = variant.sku || product.sku;
        if (variant.priceOverride != null && variant.priceOverride > 0) {
          standardPrice = variant.priceOverride;
        }
      }
    } else if (product.variants && product.variants.length > 0) {
      // Default to first active variant if none chosen
      const defaultVariantId = selectedVariants[product.id] || product.variants[0].id;
      variant = product.variants.find((v) => v.id === defaultVariantId) || product.variants[0];
      sku = variant.sku || product.sku;
      if (variant.priceOverride != null && variant.priceOverride > 0) {
        standardPrice = variant.priceOverride;
      }
    }

    const variantId = variant ? variant.id : null;
    const cartItemId = `${product.id}-${variantId || 'base'}`;
    const availableStock = getProductStock(product, variantId);

    if (availableStock <= 0) {
      toast.warning(`Cannot add: "${product.name}${variant ? ` (${variant.name})` : ''}" is out of stock at ${selectedLocation.name}.`, 'Out of Stock');
      return;
    }

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.id === cartItemId);
      if (existingIndex > -1) {
        const existingItem = prevCart[existingIndex];
        const newQty = existingItem.quantity + 1;

        if (newQty > availableStock) {
          toast.warning(`Cannot add more: Only ${availableStock} ${product.unit} available at ${selectedLocation.name}.`, 'Stock Limit');
          return prevCart;
        }

        const rawLine = roundMoney(newQty * existingItem.unitPrice);
        let discAmount = 0;
        if (existingItem.discountType === 'percentage') {
          discAmount = roundMoney(rawLine * (existingItem.discountValue / 100));
        } else if (existingItem.discountType === 'fixed') {
          discAmount = roundMoney(Math.min(rawLine, existingItem.discountValue));
        }
        const lineTotal = roundMoney(Math.max(0, rawLine - discAmount));

        const updated = [...prevCart];
        updated[existingIndex] = {
          ...existingItem,
          quantity: newQty,
          availableStock,
          discountAmount: discAmount,
          lineTotal,
        };
        return updated;
      } else {
        const rawLine = roundMoney(1 * standardPrice);
        const newItem: PosCartItem = {
          id: cartItemId,
          productId: product.id,
          variantId,
          productName: product.name,
          variantName: variant?.name || null,
          categoryName: product.categoryName || 'General',
          sku,
          unit: product.unit,
          imageUrl: product.images?.[0] || null,
          standardPrice,
          unitPrice: standardPrice,
          isPriceOverridden: false,
          quantity: 1,
          availableStock,
          discountType: 'none',
          discountValue: 0,
          discountAmount: 0,
          lineTotal: rawLine,
        };
        return [newItem, ...prevCart];
      }
    });
  };

  // Update item quantity in cart
  const handleUpdateQuantity = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(itemId);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          if (newQty > item.availableStock) {
            toast.warning(`Stock limit reached: Only ${item.availableStock} ${item.unit} available at ${selectedLocation?.name}.`, 'Stock Limit');
            return item;
          }
          const rawLine = roundMoney(newQty * item.unitPrice);
          let discAmount = 0;
          if (item.discountType === 'percentage') {
            discAmount = roundMoney(rawLine * (item.discountValue / 100));
          } else if (item.discountType === 'fixed') {
            discAmount = roundMoney(Math.min(rawLine, item.discountValue));
          }
          const lineTotal = roundMoney(Math.max(0, rawLine - discAmount));
          return {
            ...item,
            quantity: newQty,
            discountAmount: discAmount,
            lineTotal,
          };
        }
        return item;
      })
    );
  };

  // Remove item from cart
  const handleRemoveItem = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.id !== itemId));
  };

  // Clear entire cart
  const handleClearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    setCartDiscountType('none');
    setCartDiscountValue(0);
    setAdditionalChargesFee(0);
    setAdditionalChargesNote('');
  };

  // Apply Price Override to a line item
  const handleApplyPriceOverride = (itemId: string, newPrice: number, reason: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const rawLine = roundMoney(item.quantity * newPrice);
          let discAmount = 0;
          if (item.discountType === 'percentage') {
            discAmount = roundMoney(rawLine * (item.discountValue / 100));
          } else if (item.discountType === 'fixed') {
            discAmount = roundMoney(Math.min(rawLine, item.discountValue));
          }
          const lineTotal = roundMoney(Math.max(0, rawLine - discAmount));
          return {
            ...item,
            unitPrice: newPrice,
            isPriceOverridden: true,
            overrideReason: reason,
            discountAmount: discAmount,
            lineTotal,
          };
        }
        return item;
      })
    );
  };

  // Reset Price Override to standard price
  const handleResetPrice = (itemId: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const rawLine = roundMoney(item.quantity * item.standardPrice);
          let discAmount = 0;
          if (item.discountType === 'percentage') {
            discAmount = roundMoney(rawLine * (item.discountValue / 100));
          } else if (item.discountType === 'fixed') {
            discAmount = roundMoney(Math.min(rawLine, item.discountValue));
          }
          const lineTotal = roundMoney(Math.max(0, rawLine - discAmount));
          return {
            ...item,
            unitPrice: item.standardPrice,
            isPriceOverridden: false,
            overrideReason: undefined,
            discountAmount: discAmount,
            lineTotal,
          };
        }
        return item;
      })
    );
  };

  // Apply Discount (Line or Cart)
  const handleApplyDiscount = (type: PosDiscountType, value: number) => {
    if (discountModalMode === 'line' && discountModalLineItem) {
      setCart((prev) =>
        prev.map((item) => {
          if (item.id === discountModalLineItem.id) {
            const rawLine = roundMoney(item.quantity * item.unitPrice);
            let discAmount = 0;
            if (type === 'percentage') {
              discAmount = roundMoney(rawLine * (value / 100));
            } else if (type === 'fixed') {
              discAmount = roundMoney(Math.min(rawLine, value));
            }
            const lineTotal = roundMoney(Math.max(0, rawLine - discAmount));
            return {
              ...item,
              discountType: type,
              discountValue: value,
              discountAmount: discAmount,
              lineTotal,
            };
          }
          return item;
        })
      );
    } else if (discountModalMode === 'cart') {
      setCartDiscountType(type);
      setCartDiscountValue(value);
    }
  };

  const handleRemoveDiscount = () => {
    if (discountModalMode === 'line' && discountModalLineItem) {
      setCart((prev) =>
        prev.map((item) => {
          if (item.id === discountModalLineItem.id) {
            const rawLine = roundMoney(item.quantity * item.unitPrice);
            return {
              ...item,
              discountType: 'none',
              discountValue: 0,
              discountAmount: 0,
              lineTotal: rawLine,
            };
          }
          return item;
        })
      );
    } else if (discountModalMode === 'cart') {
      setCartDiscountType('none');
      setCartDiscountValue(0);
    }
  };

  // Calculate Authoritative Financial Totals
  const subtotal = useMemo(() => {
    return roundMoney(cart.reduce((sum, item) => sum + item.lineTotal, 0));
  }, [cart]);

  const totalLineDiscount = useMemo(() => {
    return roundMoney(cart.reduce((sum, item) => sum + item.discountAmount, 0));
  }, [cart]);

  const cartDiscountAmount = useMemo(() => {
    if (cartDiscountType === 'percentage') {
      return roundMoney(subtotal * (Math.min(100, cartDiscountValue) / 100));
    } else if (cartDiscountType === 'fixed') {
      return roundMoney(Math.min(subtotal, cartDiscountValue));
    }
    return 0;
  }, [subtotal, cartDiscountType, cartDiscountValue]);

  const totalDiscountAmount = roundMoney(totalLineDiscount + cartDiscountAmount);
  const grandTotal = roundMoney(Math.max(0, subtotal - cartDiscountAmount + (additionalChargesFee || 0)));

  // Proceed to Checkout
  const handleProceedToCheckout = () => {
    if (cart.length === 0) return;
    onOpenCheckout({
      cartItems: cart,
      subtotal,
      cartDiscountType,
      cartDiscountValue,
      cartDiscountAmount,
      additionalChargesFee,
      additionalChargesNote,
      totalDiscountAmount,
      totalAmount: grandTotal,
      selectedCustomer,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
      {/* LEFT: Product Catalogue Area (7 Cols on desktop) */}
      <div className="lg:col-span-7 space-y-3.5">
        {/* Top Location & Search Bar */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 shadow-sm space-y-3">
          {/* Location Selector Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                <Building className="h-3.5 w-3.5 text-orange-600" />
                Active Sales Counter Location:
              </span>
              <select
                id="pos-location-select"
                value={selectedLocation?.id || ''}
                onChange={(e) => {
                  const loc = locations.find((l) => l.id === e.target.value);
                  if (loc) onSelectLocation(loc);
                }}
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-none focus:border-orange-500"
              >
                {locations.filter((l) => l.isActive).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="text-[11px] text-slate-400">
              Shortcut: press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-mono">F2</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-mono">/</kbd> to search
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by name, SKU (e.g. BRK-001), variant, or category..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-orange-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition ${
                selectedCategory === 'all'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              All Materials ({products.filter((p) => p.isActive).length})
            </button>
            {categories.filter((c) => c.isActive).map((cat) => {
              const count = products.filter((p) => p.isActive && p.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition ${
                    selectedCategory === cat.id
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full py-16 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 space-y-2">
              <Boxes className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">No active products match your filter</p>
              <p>Clear the search box or choose another category to view catalogue items.</p>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const hasVariants = product.variants && product.variants.length > 0;
              const activeVariants = product.variants?.filter((v) => v.isActive) || [];

              const currentVariantId = selectedVariants[product.id] || (activeVariants[0]?.id ?? null);
              const currentVariant = activeVariants.find((v) => v.id === currentVariantId) || null;

              const activeSku = currentVariant?.sku || product.sku;
              const activePrice = currentVariant?.priceOverride != null && currentVariant.priceOverride > 0
                ? currentVariant.priceOverride
                : product.sellingPrice;

              const stockAvailable = getProductStock(product, currentVariantId);
              const isOutOfStock = stockAvailable <= 0;

              return (
                <div
                  key={product.id}
                  className={`flex flex-col justify-between rounded-xl border bg-white p-3 dark:bg-slate-900 transition shadow-xs hover:border-orange-300 dark:hover:border-orange-900 ${
                    isOutOfStock
                      ? 'border-slate-200 opacity-75 dark:border-slate-800'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div>
                    {/* Image / Icon Header */}
                    <div className="relative mb-2.5 h-24 w-full rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
                      {product.images && product.images[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Boxes className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                      )}

                      {/* Stock Badge Overlay */}
                      <span
                        className={`absolute top-1.5 right-1.5 rounded px-2 py-0.5 text-[10px] font-bold ${
                          isOutOfStock
                            ? 'bg-red-500 text-white'
                            : stockAvailable <= (product.reorderLevel || 10)
                            ? 'bg-amber-500 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {isOutOfStock ? '0 in stock' : `${stockAvailable} ${product.unit}`}
                      </span>
                    </div>

                    {/* Product Name & SKU */}
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-white line-clamp-1" title={product.name}>
                      {product.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      SKU: {activeSku}
                    </p>

                    {/* Variant Selector if present */}
                    {hasVariants && activeVariants.length > 0 && (
                      <div className="mt-2">
                        <select
                          value={currentVariantId || ''}
                          onChange={(e) => {
                            setSelectedVariants((prev) => ({
                              ...prev,
                              [product.id]: e.target.value,
                            }));
                          }}
                          className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-none"
                        >
                          {activeVariants.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name} {v.priceOverride ? `(₦${v.priceOverride.toLocaleString()})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Price & Add Button */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Unit Price:</span>
                      <span className="font-bold text-sm text-orange-600 dark:text-orange-400">
                        ₦{activePrice.toLocaleString()}
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={isOutOfStock}
                      onClick={() => handleAddToCart(product, currentVariantId)}
                      className={`h-7 px-2.5 text-xs flex items-center gap-1 ${
                        isOutOfStock
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
                          : 'bg-orange-600 hover:bg-orange-700 text-white'
                      }`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{isOutOfStock ? 'Sold Out' : 'Add'}</span>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT: Active Counter Cart Area (5 Cols on desktop) */}
      <div id="pos-cart-container" className="lg:col-span-5 space-y-3.5 lg:sticky lg:top-4">
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {/* Cart Header & Customer Selector */}
          <div className="p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-orange-600" />
                <h3 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wide">
                  Counter Sales Cart
                </h3>
              </div>
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                {cart.length} {cart.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {/* Customer Pill / Picker */}
            <div className="relative">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-800/60 text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <div className="truncate">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                      {selectedCustomer ? selectedCustomer.fullName : 'Walk-in / Guest Customer'}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {selectedCustomer ? `${selectedCustomer.phone} · ${selectedCustomer.customerType}` : 'No account required'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {selectedCustomer ? (
                    <button
                      type="button"
                      onClick={() => setSelectedCustomer(null)}
                      className="p-1 text-slate-400 hover:text-red-500"
                      title="Clear customer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                        className="rounded px-2 py-1 text-[11px] font-medium bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-50"
                      >
                        Select
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsNewCustomerModalOpen(true)}
                        className="rounded p-1 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40"
                        title="Quick register new customer"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Customer Search Dropdown */}
              {isCustomerDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-30 mt-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search customer name or phone..."
                    className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 mb-2 focus:outline-none"
                    autoFocus
                  />
                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {filteredCustomers.length === 0 ? (
                      <p className="p-2 text-center text-[11px] text-slate-400">No customers found</p>
                    ) : (
                      filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(c);
                            setIsCustomerDropdownOpen(false);
                            setCustomerSearch('');
                          }}
                          className="w-full text-left p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded flex justify-between items-center"
                        >
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">{c.fullName}</span>
                            <span className="text-[10px] text-slate-400">{c.phone}</span>
                          </div>
                          <span className="text-[10px] uppercase font-mono text-slate-400">{c.customerType}</span>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomerDropdownOpen(false);
                        setIsNewCustomerModalOpen(true);
                      }}
                      className="text-[11px] text-orange-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Plus className="h-3 w-3" /> New Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCustomerDropdownOpen(false)}
                      className="text-[11px] text-slate-400 hover:text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cart Items List */}
          <div className="p-3.5 overflow-y-auto max-h-[380px] divide-y divide-slate-100 dark:divide-slate-800">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                <ShoppingCart className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">Cart is empty</p>
                <p>Click "+ Add" on any material from the left catalogue to begin the sale.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h5 className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate">
                        {item.productName}
                      </h5>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        {item.variantName && <span className="font-medium text-orange-600 dark:text-orange-400">Var: {item.variantName}</span>}
                        <span>SKU: {item.sku}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        ₦{item.lineTotal.toLocaleString()}
                      </span>
                      {item.discountAmount > 0 && (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                          -₦{item.discountAmount.toLocaleString()} ({item.discountType === 'percentage' ? `${item.discountValue}%` : 'fixed'})
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quantity, Unit Price & Quick Line Actions */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    {/* Quantity Spinner */}
                    <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        className="px-2 py-1 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
                        title="Decrease"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={item.availableStock}
                        value={item.quantity}
                        onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value, 10) || 0)}
                        className="w-12 text-center bg-transparent font-bold text-xs focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        className="px-2 py-1 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
                        title="Increase"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Unit price snapshot */}
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      @ ₦{item.unitPrice.toLocaleString()} / {item.unit}
                      {item.isPriceOverridden && (
                        <span className="ml-1 text-[10px] text-amber-600 font-bold">(Overridden)</span>
                      )}
                    </div>

                    {/* Line Action Buttons */}
                    <div className="flex items-center gap-1">
                      {/* Line Discount */}
                      <button
                        type="button"
                        onClick={() => {
                          setDiscountModalMode('line');
                          setDiscountModalLineItem(item);
                        }}
                        className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 ${
                          item.discountAmount > 0 ? 'text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-600'
                        }`}
                        title="Apply Line Discount"
                      >
                        <Percent className="h-3.5 w-3.5" />
                      </button>

                      {/* Price Override */}
                      <button
                        type="button"
                        onClick={() => setOverrideModalItem(item)}
                        className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 ${
                          item.isPriceOverridden ? 'text-amber-600 font-bold' : 'text-slate-400 hover:text-slate-600'
                        }`}
                        title="Authorized Price Override"
                      >
                        <Tag className="h-3.5 w-3.5" />
                      </button>

                      {/* Remove Line */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                        title="Remove Item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Summary & Checkout Trigger */}
          <div className="p-3.5 space-y-2.5 bg-slate-50 dark:bg-slate-900/60">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Items Subtotal:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  ₦{subtotal.toLocaleString()}
                </span>
              </div>

              {/* Cart Discount row */}
              <div className="flex justify-between items-center text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setDiscountModalMode('cart');
                    setDiscountModalLineItem(null);
                  }}
                  className="text-orange-600 hover:underline flex items-center gap-1 font-medium"
                >
                  <Percent className="h-3 w-3" />
                  <span>
                    {cartDiscountAmount > 0
                      ? `Cart Discount (${cartDiscountType === 'percentage' ? `${cartDiscountValue}%` : 'Fixed'}):`
                      : '+ Add Cart Discount'}
                  </span>
                </button>
                {cartDiscountAmount > 0 && (
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    -₦{cartDiscountAmount.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Additional Logistics / Loading Fee */}
              <div className="flex justify-between items-center text-xs">
                <button
                  type="button"
                  onClick={() => setShowAdditionalChargesInput(!showAdditionalChargesInput)}
                  className="text-slate-500 hover:text-slate-700 dark:text-slate-400 flex items-center gap-1"
                >
                  <span>{additionalChargesFee > 0 ? 'Additional Fee:' : '+ Add Loading / Delivery Fee'}</span>
                </button>
                {additionalChargesFee > 0 && (
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    +₦{additionalChargesFee.toLocaleString()}
                  </span>
                )}
              </div>

              {showAdditionalChargesInput && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={additionalChargesFee || ''}
                    onChange={(e) => setAdditionalChargesFee(parseFloat(e.target.value) || 0)}
                    placeholder="Fee (₦)"
                    className="w-full text-xs"
                  />
                  <Input
                    type="text"
                    value={additionalChargesNote}
                    onChange={(e) => setAdditionalChargesNote(e.target.value)}
                    placeholder="e.g. Loading pallet fee"
                    className="w-full text-xs"
                  />
                </div>
              )}

              {/* Total Discount summary pill if any */}
              {totalDiscountAmount > 0 && (
                <div className="flex justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-1">
                  <span>Total Savings Applied:</span>
                  <span>-₦{totalDiscountAmount.toLocaleString()}</span>
                </div>
              )}

              {/* Grand Total */}
              <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  GRAND TOTAL:
                </span>
                <span className="text-xl font-black text-orange-600 dark:text-orange-400">
                  ₦{grandTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Bottom Cart Action Buttons */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearCart}
                disabled={cart.length === 0}
                className="col-span-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border-slate-200 dark:border-slate-700"
              >
                Clear Cart
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={cart.length === 0}
                onClick={handleProceedToCheckout}
                className="col-span-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Checkout (₦{grandTotal.toLocaleString()})</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Floating Checkout Bar (< lg screens) */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40 bg-slate-900/95 backdrop-blur text-white rounded-2xl p-3 shadow-2xl flex items-center justify-between border border-slate-700/80 animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-600 flex items-center justify-center font-bold text-xs text-white shrink-0">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold leading-tight">₦{grandTotal.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400 truncate">{cart.length} line item{cart.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                const cartElem = document.getElementById('pos-cart-container');
                cartElem?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 transition"
            >
              View Cart
            </button>
            <button
              type="button"
              onClick={handleProceedToCheckout}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1 shadow-sm"
            >
              <span>Pay</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Price Override Modal */}
      <PosPriceOverrideModal
        isOpen={Boolean(overrideModalItem)}
        item={overrideModalItem}
        onClose={() => setOverrideModalItem(null)}
        onApplyOverride={handleApplyPriceOverride}
        onResetPrice={handleResetPrice}
      />

      {/* Discount Modal (Line or Cart) */}
      <PosDiscountModal
        isOpen={Boolean(discountModalMode)}
        mode={discountModalMode || 'cart'}
        lineItem={discountModalLineItem}
        subtotal={subtotal}
        currentType={
          discountModalMode === 'line'
            ? discountModalLineItem?.discountType || 'none'
            : cartDiscountType
        }
        currentValue={
          discountModalMode === 'line'
            ? discountModalLineItem?.discountValue || 0
            : cartDiscountValue
        }
        onClose={() => {
          setDiscountModalMode(null);
          setDiscountModalLineItem(null);
        }}
        onApplyDiscount={handleApplyDiscount}
        onRemoveDiscount={handleRemoveDiscount}
      />

      {/* Quick Customer Registration Modal */}
      <PosCustomerQuickModal
        isOpen={isNewCustomerModalOpen}
        onClose={() => setIsNewCustomerModalOpen(false)}
        onCustomerCreated={(newCust) => {
          setSelectedCustomer(newCust);
        }}
      />
    </div>
  );
};
