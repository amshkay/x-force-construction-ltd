/**
 * Receive Stock Modal
 * Module 11 — Inventory & Stock Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Records incoming physical stock into a designated stock location
 * (newly pressed batches, supplier raw materials, or approved returns).
 */

import React, { useState, useEffect } from 'react';
import { PackagePlus, AlertCircle, ArrowDownRight } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { inventoryService } from '../../services/inventory.service';
import { stockLocationRepository } from '../../repositories/stockLocation.repository';
import { productRepository } from '../../repositories/product.repository';
import { useAuth } from '../../context/AuthContext';
import { Product } from '../../types/product';
import { StockLocation, InventoryItem } from '../../types/inventory';

interface ReceiveStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialItem?: InventoryItem | null;
}

export const ReceiveStockModal: React.FC<ReceiveStockModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialItem,
}) => {
  const { profile, currentUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [destinationLocationId, setDestinationLocationId] = useState<string>('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unitCost, setUnitCost] = useState<number | ''>('');
  const [referenceType, setReferenceType] = useState<string>('production_batch');
  const [referenceId, setReferenceId] = useState<string>('');
  const [reason, setReason] = useState<string>('Production batch hydration completion');
  const [notes, setNotes] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDependencies();
    }
  }, [isOpen]);

  const loadDependencies = async () => {
    try {
      const [prodsRes, locs] = await Promise.all([
        productRepository.getAllProducts(),
        stockLocationRepository.getActiveLocations(),
      ]);

      const prods = prodsRes || [];
      setProducts(prods);
      setLocations(locs);

      if (initialItem) {
        setSelectedProductId(initialItem.productId);
        setSelectedVariantId(initialItem.variantId || '');
        setDestinationLocationId(initialItem.locationId);
        setUnitCost(initialItem.unitCost || '');
      } else {
        if (prods.length > 0) {
          setSelectedProductId(prods[0].id);
          if (prods[0].variants && prods[0].variants.length > 0) {
            setSelectedVariantId(prods[0].variants[0].id);
          } else {
            setSelectedVariantId('');
          }
        }
        if (locs.length > 0) {
          const defaultLoc = locs.find((l) => l.isDefault) || locs[0];
          setDestinationLocationId(defaultLoc.id);
        }
      }
      setQuantity('');
      setReferenceId('');
      setNotes('');
      setError(null);
    } catch (err: any) {
      setError('Failed to load products or locations.');
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const variants = selectedProduct?.variants || [];

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod?.variants && prod.variants.length > 0) {
      setSelectedVariantId(prod.variants[0].id);
      setUnitCost(prod.variants[0].costPriceOverride ?? prod.costPrice ?? '');
    } else {
      setSelectedVariantId('');
      setUnitCost(prod?.costPrice ?? '');
    }
  };

  const handleVariantChange = (varId: string) => {
    setSelectedVariantId(varId);
    if (selectedProduct) {
      const variant = selectedProduct.variants?.find((v) => v.id === varId);
      setUnitCost(variant?.costPriceOverride ?? selectedProduct.costPrice ?? '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setError('Please select a product.');
      return;
    }
    if (!destinationLocationId) {
      setError('Please select a destination stock location.');
      return;
    }
    const numQty = Number(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      setError('Received quantity must be a positive number greater than 0.');
      return;
    }
    if (!reason.trim()) {
      setError('Please specify a receipt reason.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await inventoryService.receiveStock({
        productId: selectedProductId,
        variantId: selectedVariantId || null,
        destinationLocationId,
        quantity: numQty,
        unitCost: unitCost !== '' ? Number(unitCost) : undefined,
        referenceType,
        referenceId: referenceId.trim() || undefined,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
        performedBy: profile?.id || currentUser?.id || 'system-user',
        performedByName: profile?.full_name || profile?.email || 'Authorized Officer',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record stock receipt.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
            <PackagePlus className="h-5 w-5" />
          </div>
          <span>Receive Physical Stock</span>
        </div>
      }
      description="Record incoming goods into warehouse or curing yards with full movement traceability."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Product */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Catalogue Product *
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => handleProductChange(e.target.value)}
              disabled={isLoading || Boolean(initialItem)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          {/* Variant */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Variant {variants.length > 0 && '*'}
            </label>
            {variants.length > 0 ? (
              <select
                value={selectedVariantId}
                onChange={(e) => handleVariantChange(e.target.value)}
                disabled={isLoading || Boolean(initialItem)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
              >
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.sku})
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-500 italic">
                Standard single item (no variants)
              </div>
            )}
          </div>

          {/* Destination Location */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Destination Stock Location *
            </label>
            <select
              value={destinationLocationId}
              onChange={(e) => setDestinationLocationId(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} [{loc.code}] {loc.isDefault ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Quantity Received * ({selectedProduct?.unit || 'units'})
            </label>
            <input
              type="number"
              min="0.01"
              step="any"
              placeholder="e.g. 500"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
              disabled={isLoading}
              required
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
            />
          </div>

          {/* Unit Cost */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Unit Production / Acquisition Cost (NGN)
            </label>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="e.g. 280"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value === '' ? '' : Number(e.target.value))}
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
            />
          </div>

          {/* Reference Type */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Source Reference Type
            </label>
            <select
              value={referenceType}
              onChange={(e) => setReferenceType(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
            >
              <option value="production_batch">Hydraulic Production Batch</option>
              <option value="supplier_delivery">Raw Material / Supplier Delivery</option>
              <option value="customer_return">Customer Job Return</option>
              <option value="site_recovery">Site Demobilization Recovery</option>
              <option value="inter_facility">Factory Transfer Inbound</option>
              <option value="other">Other Documented Intake</option>
            </select>
          </div>

          {/* Reference ID / Batch # */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Reference / Batch #
            </label>
            <input
              type="text"
              placeholder="e.g. BATCH-2026-042 or INV-9182"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
            />
          </div>

          {/* Reason */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Operational Reason *
            </label>
            <input
              type="text"
              placeholder="e.g. Completed hydraulic pressing and 28-day curing inspection passed"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isLoading}
              required
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
            />
          </div>

          {/* Notes */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Additional Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Any quality inspection observations, pallet stack IDs, or operator notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isLoading}
            leftIcon={<ArrowDownRight className="h-4 w-4" />}
          >
            Confirm Stock Receipt
          </Button>
        </div>
      </form>
    </Modal>
  );
};
