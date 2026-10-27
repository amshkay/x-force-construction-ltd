/**
 * Issue Stock Modal
 * Module 11 — Inventory & Stock Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Controlled stock issuing from a designated storage location.
 * Validates available quantities and prevents negative stock.
 */

import React, { useState, useEffect } from 'react';
import { PackageMinus, AlertCircle, ArrowUpRight } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { inventoryService } from '../../services/inventory.service';
import { stockLocationRepository } from '../../repositories/stockLocation.repository';
import { productRepository } from '../../repositories/product.repository';
import { inventoryRepository } from '../../repositories/inventory.repository';
import { useAuth } from '../../context/AuthContext';
import { Product } from '../../types/product';
import { StockLocation, InventoryItem } from '../../types/inventory';

interface IssueStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialItem?: InventoryItem | null;
}

export const IssueStockModal: React.FC<IssueStockModalProps> = ({
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
  const [availableStock, setAvailableStock] = useState<number>(0);
  const [onHandStock, setOnHandStock] = useState<number>(0);

  const [quantity, setQuantity] = useState<number | ''>('');
  const [reason, setReason] = useState<string>('Damaged in yard handling / transport');
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
      }

      setSelectedProductId(targetProdId);
      setSelectedVariantId(targetVarId);
      setSourceLocationId(targetLocId);
      setQuantity('');
      setNotes('');
      setError(null);

      await updateBalanceCheck(targetProdId, targetVarId || null, targetLocId);
    } catch (err: any) {
      setError('Failed to load initial stock dependencies.');
    }
  };

  const updateBalanceCheck = async (prodId: string, varId: string | null, locId: string) => {
    if (!prodId || !locId) return;
    try {
      const bal = await inventoryRepository.getBalance(prodId, varId, locId);
      const onHand = bal?.quantityOnHand || 0;
      const reserved = bal?.quantityReserved || 0;
      setOnHandStock(onHand);
      setAvailableStock(Math.max(0, onHand - reserved));
    } catch {
      setAvailableStock(0);
      setOnHandStock(0);
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

  const handleLocationChange = async (locId: string) => {
    setSourceLocationId(locId);
    await updateBalanceCheck(selectedProductId, selectedVariantId || null, locId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !sourceLocationId) {
      setError('Please select both product and source location.');
      return;
    }
    const numQty = Number(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      setError('Issued quantity must be greater than zero.');
      return;
    }
    if (numQty > availableStock) {
      setError(
        `Requested quantity (${numQty}) exceeds available stock (${availableStock} ${selectedProduct?.unit || 'units'}). Negative stock is strictly prevented.`
      );
      return;
    }
    if (!reason.trim()) {
      setError('Please provide an operational reason for issuing stock.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await inventoryService.issueStock({
        productId: selectedProductId,
        variantId: selectedVariantId || null,
        sourceLocationId,
        quantity: numQty,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
        performedBy: profile?.id || currentUser?.id || 'system-user',
        performedByName: profile?.full_name || profile?.email || 'Authorized Officer',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to issue stock.');
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
          <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600">
            <PackageMinus className="h-5 w-5" />
          </div>
          <span>Issue Physical Stock</span>
        </div>
      }
      description="Deduct physical inventory from storage for operational use, quality tests, or damage write-offs."
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
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Source Stock Location *
            </label>
            <select
              value={sourceLocationId}
              onChange={(e) => handleLocationChange(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} [{loc.code}]
                </option>
              ))}
            </select>

            {/* Current Stock Banner */}
            <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500">Stock at selected location:</span>
              <div className="flex items-center gap-3">
                <span className="text-slate-600 dark:text-slate-400">
                  On Hand: <strong className="text-slate-900 dark:text-white">{onHandStock}</strong>
                </span>
                <span className="text-slate-600 dark:text-slate-400">
                  Available to Issue:{' '}
                  <strong className={availableStock > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {availableStock} {selectedProduct?.unit || 'units'}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Quantity to Issue * ({selectedProduct?.unit || 'units'})
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
              Issuing Reason *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
            >
              <option value="Damaged in yard handling / transport">Damaged in yard handling / transport</option>
              <option value="Destructive QA strength test (hydraulic crushing)">
                Destructive QA strength test (hydraulic crushing)
              </option>
              <option value="Exhibition / Showroom demonstration sample">
                Exhibition / Showroom demonstration sample
              </option>
              <option value="Internal facility maintenance / yard construction">
                Internal facility maintenance / yard construction
              </option>
              <option value="Authorized manual operational write-off">
                Authorized manual operational write-off
              </option>
            </select>
          </div>

          {/* Notes */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Supervisor Notes / Reference (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Incident details, crusher machine ID, or authorizing manager name..."
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
            variant="danger"
            size="sm"
            isLoading={isLoading}
            disabled={availableStock <= 0}
            leftIcon={<ArrowUpRight className="h-4 w-4" />}
          >
            Confirm Stock Issue
          </Button>
        </div>
      </form>
    </Modal>
  );
};
