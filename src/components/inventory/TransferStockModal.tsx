/**
 * Transfer Stock Modal
 * Module 11 — Inventory & Stock Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Atomic inter-location inventory transfers (e.g. Factory Curing Bay -> Main Yard -> Showroom).
 * Both location updates and transfer movements succeed or fail together.
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, AlertCircle, ArrowRight } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { inventoryService } from '../../services/inventory.service';
import { stockLocationRepository } from '../../repositories/stockLocation.repository';
import { productRepository } from '../../repositories/product.repository';
import { inventoryRepository } from '../../repositories/inventory.repository';
import { useAuth } from '../../context/AuthContext';
import { Product } from '../../types/product';
import { StockLocation, InventoryItem } from '../../types/inventory';

interface TransferStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialItem?: InventoryItem | null;
}

export const TransferStockModal: React.FC<TransferStockModalProps> = ({
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
  const [sourceLocationId, setSourceLocationId] = useState<string>('');
  const [destinationLocationId, setDestinationLocationId] = useState<string>('');

  const [availableStock, setAvailableStock] = useState<number>(0);
  const [quantity, setQuantity] = useState<number | ''>('');
  const [reason, setReason] = useState<string>('Stock relocation for showroom customer display');
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

      let targetProdId = prods[0]?.id || '';
      let targetVarId = prods[0]?.variants?.[0]?.id || '';
      let targetSourceLocId = locs[0]?.id || '';
      let targetDestLocId = locs[1]?.id || locs[0]?.id || '';

      if (initialItem) {
        targetProdId = initialItem.productId;
        targetVarId = initialItem.variantId || '';
        targetSourceLocId = initialItem.locationId;
        const otherLoc = locs.find((l) => l.id !== initialItem.locationId);
        targetDestLocId = otherLoc ? otherLoc.id : targetSourceLocId;
      }

      setSelectedProductId(targetProdId);
      setSelectedVariantId(targetVarId);
      setSourceLocationId(targetSourceLocId);
      setDestinationLocationId(targetDestLocId);
      setQuantity('');
      setNotes('');
      setError(null);

      await updateBalanceCheck(targetProdId, targetVarId || null, targetSourceLocId);
    } catch {
      setError('Failed to load transfer dependencies.');
    }
  };

  const updateBalanceCheck = async (prodId: string, varId: string | null, locId: string) => {
    if (!prodId || !locId) return;
    try {
      const bal = await inventoryRepository.getBalance(prodId, varId, locId);
      const onHand = bal?.quantityOnHand || 0;
      const reserved = bal?.quantityReserved || 0;
      setAvailableStock(Math.max(0, onHand - reserved));
    } catch {
      setAvailableStock(0);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const variants = selectedProduct?.variants || [];

  const handleProductChange = async (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    const newVarId = prod?.variants && prod.variants.length > 0 ? prod.variants[0].id : '';
    setSelectedVariantId(newVarId);
    await updateBalanceCheck(prodId, newVarId || null, sourceLocationId);
  };

  const handleVariantChange = async (varId: string) => {
    setSelectedVariantId(varId);
    await updateBalanceCheck(selectedProductId, varId || null, sourceLocationId);
  };

  const handleSourceLocationChange = async (locId: string) => {
    setSourceLocationId(locId);
    await updateBalanceCheck(selectedProductId, selectedVariantId || null, locId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setError('Please select a product.');
      return;
    }
    if (!sourceLocationId || !destinationLocationId) {
      setError('Both source and destination locations must be selected.');
      return;
    }
    if (sourceLocationId === destinationLocationId) {
      setError('Source location and destination location must be different.');
      return;
    }
    const numQty = Number(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      setError('Transfer quantity must be greater than zero.');
      return;
    }
    if (numQty > availableStock) {
      setError(`Cannot transfer more than the available stock (${availableStock} ${selectedProduct?.unit || 'units'}).`);
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a transfer reason.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await inventoryService.transferStock({
        productId: selectedProductId,
        variantId: selectedVariantId || null,
        sourceLocationId,
        destinationLocationId,
        quantity: numQty,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
        performedBy: profile?.id || currentUser?.id || 'system-user',
        performedByName: profile?.full_name || profile?.email || 'Authorized Officer',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Transfer failed.');
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
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <span>Internal Stock Transfer</span>
        </div>
      }
      description="Transfer materials safely between warehouses, curing sheds, and display showrooms."
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

          {/* Source Location */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Source Location (From) *
            </label>
            <select
              value={sourceLocationId}
              onChange={(e) => handleSourceLocationChange(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} [{loc.code}]
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">
              Available at source:{' '}
              <strong className={availableStock > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {availableStock} {selectedProduct?.unit || 'units'}
              </strong>
            </p>
          </div>

          {/* Destination Location */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Destination Location (To) *
            </label>
            <select
              value={destinationLocationId}
              onChange={(e) => setDestinationLocationId(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id} disabled={loc.id === sourceLocationId}>
                  {loc.name} [{loc.code}] {loc.id === sourceLocationId ? '(Current Source)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Transfer Quantity * ({selectedProduct?.unit || 'units'})
            </label>
            <input
              type="number"
              min="0.01"
              max={availableStock}
              step="any"
              placeholder={`Max: ${availableStock}`}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
              disabled={isLoading || availableStock <= 0}
              required
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Transfer Purpose *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
            >
              <option value="Stock relocation for showroom customer display">
                Stock relocation for showroom customer display
              </option>
              <option value="Transfer from curing sheds to dispatch staging area">
                Transfer from curing sheds to dispatch staging area
              </option>
              <option value="Replenish retail depot stock">Replenish retail depot stock</option>
              <option value="Yard space reorganization & stacking optimization">
                Yard space reorganization & stacking optimization
              </option>
            </select>
          </div>

          {/* Notes */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Transfer Waybill / Forklift Operator Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Truck registration number, forklift driver name, or pallet stack ID..."
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
            disabled={availableStock <= 0}
            leftIcon={<ArrowRight className="h-4 w-4" />}
          >
            Execute Transfer
          </Button>
        </div>
      </form>
    </Modal>
  );
};
