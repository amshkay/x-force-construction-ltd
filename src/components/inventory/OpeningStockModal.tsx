/**
 * Opening Stock Modal
 * Module 11 — Inventory & Stock Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Sets up initial physical stock balances for catalogue items.
 * Generates traceable opening_balance movements.
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, AlertCircle, Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { inventoryService } from '../../services/inventory.service';
import { stockLocationRepository } from '../../repositories/stockLocation.repository';
import { productRepository } from '../../repositories/product.repository';
import { useAuth } from '../../context/AuthContext';
import { Product } from '../../types/product';
import { StockLocation, InventoryItem } from '../../types/inventory';

interface OpeningStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialItem?: InventoryItem | null;
}

export const OpeningStockModal: React.FC<OpeningStockModalProps> = ({
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
  const [openingQuantity, setOpeningQuantity] = useState<number | ''>('');
  const [unitCost, setUnitCost] = useState<number | ''>('');
  const [notes, setNotes] = useState<string>('Initial physical stock onboarding');

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
        setLocationId(initialItem.locationId);
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
          setLocationId(locs[0].id);
        }
      }
      setOpeningQuantity('');
      setError(null);
    } catch {
      setError('Failed to load opening stock dependencies.');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !locationId) {
      setError('Please select product and location.');
      return;
    }
    const numQty = Number(openingQuantity);
    if (isNaN(numQty) || numQty < 0) {
      setError('Opening quantity must be 0 or a positive number.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await inventoryService.recordOpeningBalance({
        productId: selectedProductId,
        variantId: selectedVariantId || null,
        locationId,
        openingQuantity: numQty,
        unitCost: unitCost !== '' ? Number(unitCost) : undefined,
        notes: notes.trim() || undefined,
        performedBy: profile?.id || currentUser?.id || 'system-user',
        performedByName: profile?.full_name || profile?.email || 'Authorized Officer',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record opening balance.');
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
          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <span>Establish Opening Stock Balance</span>
        </div>
      }
      description="Record initial physical stock counts for XFORCE building materials onboarding."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3">
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

          {variants.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Product Variant *
              </label>
              <select
                value={selectedVariantId}
                onChange={(e) => setSelectedVariantId(e.target.value)}
                disabled={isLoading || Boolean(initialItem)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
              >
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.sku})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Stock Location *
            </label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Opening Quantity * ({selectedProduct?.unit || 'units'})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 2500"
                value={openingQuantity}
                onChange={(e) => setOpeningQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                disabled={isLoading}
                required
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Unit Cost (NGN)
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
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Onboarding Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Verified during Q1 physical warehouse audit"
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
            leftIcon={<Check className="h-4 w-4" />}
          >
            Save Opening Balance
          </Button>
        </div>
      </form>
    </Modal>
  );
};
