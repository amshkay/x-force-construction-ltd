/**
 * Adjust Stock Modal
 * Module 11 — Inventory & Stock Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Physical stock count adjustment with mandatory audit explanation.
 * Generates an immutable adjustment movement rather than rewriting historical records.
 */

import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { inventoryService } from '../../services/inventory.service';
import { stockLocationRepository } from '../../repositories/stockLocation.repository';
import { productRepository } from '../../repositories/product.repository';
import { inventoryRepository } from '../../repositories/inventory.repository';
import { useAuth } from '../../context/AuthContext';
import { Product } from '../../types/product';
import { StockLocation, InventoryItem } from '../../types/inventory';

interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialItem?: InventoryItem | null;
}

export const AdjustStockModal: React.FC<AdjustStockModalProps> = ({
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
  const [locationId, setLocationId] = useState<string>('');

  const [currentOnHand, setCurrentOnHand] = useState<number>(0);
  const [newCount, setNewCount] = useState<number | ''>('');
  const [reason, setReason] = useState<string>('Physical yard count audit discrepancy');
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
      let targetLocId = locs[0]?.id || '';

      if (initialItem) {
        targetProdId = initialItem.productId;
        targetVarId = initialItem.variantId || '';
        targetLocId = initialItem.locationId;
        setCurrentOnHand(initialItem.quantityOnHand);
        setNewCount(initialItem.quantityOnHand);
      } else {
        await updateBalanceCheck(targetProdId, targetVarId || null, targetLocId);
      }

      setSelectedProductId(targetProdId);
      setSelectedVariantId(targetVarId);
      setLocationId(targetLocId);
      setNotes('');
      setError(null);
    } catch {
      setError('Failed to load adjustment dependencies.');
    }
  };

  const updateBalanceCheck = async (prodId: string, varId: string | null, locId: string) => {
    if (!prodId || !locId) return;
    try {
      const bal = await inventoryRepository.getBalance(prodId, varId, locId);
      const onHand = bal?.quantityOnHand || 0;
      setCurrentOnHand(onHand);
      setNewCount(onHand);
    } catch {
      setCurrentOnHand(0);
      setNewCount(0);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const variants = selectedProduct?.variants || [];

  const handleProductChange = async (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    const newVarId = prod?.variants && prod.variants.length > 0 ? prod.variants[0].id : '';
    setSelectedVariantId(newVarId);
    await updateBalanceCheck(prodId, newVarId || null, locationId);
  };

  const handleVariantChange = async (varId: string) => {
    setSelectedVariantId(varId);
    await updateBalanceCheck(selectedProductId, varId || null, locationId);
  };

  const handleLocationChange = async (locId: string) => {
    setLocationId(locId);
    await updateBalanceCheck(selectedProductId, selectedVariantId || null, locId);
  };

  const delta = newCount !== '' ? Number(newCount) - currentOnHand : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !locationId) {
      setError('Please select product and location.');
      return;
    }
    const numNewCount = Number(newCount);
    if (isNaN(numNewCount) || numNewCount < 0) {
      setError('New stock count cannot be negative.');
      return;
    }
    if (numNewCount === currentOnHand) {
      setError('New count is identical to existing quantity. No adjustment is required.');
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a mandatory audit explanation for the adjustment.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await inventoryService.adjustStock({
        productId: selectedProductId,
        variantId: selectedVariantId || null,
        locationId,
        newQuantityOnHand: numNewCount,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
        performedBy: profile?.id || currentUser?.id || 'system-user',
        performedByName: profile?.full_name || profile?.email || 'Authorized Officer',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to apply adjustment.');
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
          <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <span>Adjust Physical Inventory Count</span>
        </div>
      }
      description="Reconcile recorded software inventory against physical on-site count."
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

          {/* Location */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Storage Location *
            </label>
            <select
              value={locationId}
              onChange={(e) => handleLocationChange(e.target.value)}
              disabled={isLoading || Boolean(initialItem)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} [{loc.code}]
                </option>
              ))}
            </select>
          </div>

          {/* Current vs New Count Panel */}
          <div className="sm:col-span-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-3 text-center">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Current Recorded</span>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {currentOnHand} <span className="text-xs font-normal text-slate-500">{selectedProduct?.unit}</span>
              </p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Adjustment Delta</span>
              <p
                className={`text-lg font-bold mt-0.5 ${
                  delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-rose-600' : 'text-slate-500'
                }`}
              >
                {delta > 0 ? `+${delta}` : delta}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Resulting Stock</span>
              <p className="text-lg font-bold text-sky-600 mt-0.5">
                {newCount === '' ? '—' : newCount}{' '}
                <span className="text-xs font-normal text-slate-500">{selectedProduct?.unit}</span>
              </p>
            </div>
          </div>

          {/* New Physical Count Input */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              New Physical Count * ({selectedProduct?.unit || 'units'})
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={newCount}
              onChange={(e) => setNewCount(e.target.value === '' ? '' : Number(e.target.value))}
              disabled={isLoading}
              required
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Adjustment Reason *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
            >
              <option value="Physical yard count audit discrepancy">Physical yard count audit discrepancy</option>
              <option value="Handling breakage / damaged pallets uncovered">
                Handling breakage / damaged pallets uncovered
              </option>
              <option value="Calibration / unit conversion discrepancy">Calibration / unit conversion discrepancy</option>
              <option value="Production batch count correction">Production batch count correction</option>
              <option value="Data entry correction">Data entry correction</option>
            </select>
          </div>

          {/* Notes */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Supervisor Notes & Audit Rationale (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Explain physical stock verification details, counter initials, or recount findings..."
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
            disabled={delta === 0}
            leftIcon={<CheckCircle2 className="h-4 w-4" />}
          >
            Apply Adjustment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
