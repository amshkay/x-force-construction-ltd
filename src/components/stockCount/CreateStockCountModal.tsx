import React, { useState, useEffect } from 'react';
import { X, ClipboardCheck, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { stockCountService } from '../../services/stockCount.service';
import { stockLocationRepository } from '../../repositories/stockLocation.repository';
import { productRepository } from '../../repositories/product.repository';
import { StockLocation } from '../../types/inventory';
import { Product, ProductCategory } from '../../types/product';
import { StockCountScope } from '../../types/stockCount';
import { useAuth } from '../../hooks/useAuth';

interface CreateStockCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (countNumber: string) => void;
}

export const CreateStockCountModal: React.FC<CreateStockCountModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { profile, currentUser } = useAuth();
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [locationId, setLocationId] = useState<string>('');
  const [scope, setScope] = useState<StockCountScope>('full_location');
  const [categoryId, setCategoryId] = useState<string>('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [countDate, setCountDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isBlindCount, setIsBlindCount] = useState<boolean>(true);
  const [enableThreshold, setEnableThreshold] = useState<boolean>(false);
  const [thresholdPercentage, setThresholdPercentage] = useState<number | ''>(5);
  const [thresholdQuantity, setThresholdQuantity] = useState<number | ''>(10);
  const [assignedCounterName, setAssignedCounterName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [locs, prods, cats] = await Promise.all([
        stockLocationRepository.getActiveLocations(),
        productRepository.getAllProducts(),
        productRepository.getAllCategories(),
      ]);

      setLocations(locs);
      setProducts(prods || []);
      setCategories(cats || []);

      if (locs.length > 0 && !locationId) {
        setLocationId(locs[0].id);
      }
      if (cats.length > 0 && !categoryId) {
        setCategoryId(cats[0].id);
      }
    } catch (err: any) {
      setError('Failed to load locations and products.');
    }
  };

  const handleProductToggle = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleSelectAllProducts = () => {
    if (selectedProductIds.length === products.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(products.map((p) => p.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationId) {
      setError('Please select a stock location for physical counting.');
      return;
    }

    if (scope === 'category' && !categoryId) {
      setError('Please select a product category.');
      return;
    }

    if (scope === 'selected_items' && selectedProductIds.length === 0) {
      setError('Please select at least one product for counting.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const session = await stockCountService.createSession({
        locationId,
        scope,
        categoryId: scope === 'category' ? categoryId : null,
        selectedProductIds: scope === 'selected_items' ? selectedProductIds : undefined,
        countDate,
        isBlindCount,
        significantVarianceThreshold: enableThreshold
          ? {
              type: 'both',
              percentage: thresholdPercentage !== '' ? Number(thresholdPercentage) : undefined,
              quantity: thresholdQuantity !== '' ? Number(thresholdQuantity) : undefined,
            }
          : null,
        assignedCounters: assignedCounterName.trim()
          ? [
              {
                userId: profile?.id || currentUser?.id || 'counter-1',
                name: assignedCounterName.trim(),
              },
            ]
          : undefined,
        notes: notes.trim() || undefined,
        initiatedBy: profile?.id || currentUser?.id || 'system-user',
        initiatedByName: profile?.full_name || profile?.email || 'Authorized Officer',
      });

      onSuccess(session.countNumber);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to initiate physical stock count session.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Initiate Physical Stock Count
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Freeze current system quantity snapshot and generate formal count sheet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Location & Count Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Stock Location <span className="text-red-500">*</span>
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Count Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={countDate}
                onChange={(e) => setCountDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
              </input>
            </div>
          </div>

          {/* Scope Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Counting Scope <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setScope('full_location')}
                className={`py-2.5 px-3 rounded-lg border text-xs font-medium transition-colors text-center ${
                  scope === 'full_location'
                    ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 font-semibold'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                }`}
              >
                Full Location
              </button>
              <button
                type="button"
                onClick={() => setScope('category')}
                className={`py-2.5 px-3 rounded-lg border text-xs font-medium transition-colors text-center ${
                  scope === 'category'
                    ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 font-semibold'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                }`}
              >
                By Category
              </button>
              <button
                type="button"
                onClick={() => setScope('selected_items')}
                className={`py-2.5 px-3 rounded-lg border text-xs font-medium transition-colors text-center ${
                  scope === 'selected_items'
                    ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 font-semibold'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                }`}
              >
                Selected Items
              </button>
            </div>
          </div>

          {/* Conditional Scope inputs */}
          {scope === 'category' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Select Product Category <span className="text-red-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {scope === 'selected_items' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Select Products to Count ({selectedProductIds.length} selected)
                </label>
                <button
                  type="button"
                  onClick={handleSelectAllProducts}
                  className="text-xs text-orange-600 dark:text-orange-400 hover:underline font-medium"
                >
                  {selectedProductIds.length === products.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 p-2">
                {products.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(p.id)}
                        onChange={() => handleProductToggle(p.id)}
                        className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="font-medium text-slate-800 dark:text-slate-200">{p.name}</span>
                    </div>
                    <span className="text-slate-500 font-mono text-[11px]">{p.sku}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Blind Count Mode Toggle */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  {isBlindCount ? <EyeOff className="w-4 h-4 text-orange-500" /> : <Eye className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Blind Counting Mode
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Hides system quantity on warehouse counters' sheets to ensure unguided counting
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBlindCount}
                  onChange={(e) => setIsBlindCount(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-orange-500"></div>
              </label>
            </div>
          </div>

          {/* Optional Significant Discrepancy Threshold */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Significant Variance Flagging Threshold
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableThreshold}
                  onChange={(e) => setEnableThreshold(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-slate-600 peer-checked:bg-orange-500"></div>
              </label>
            </div>

            {enableThreshold && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="block text-[11px] text-slate-500 mb-1">Percentage Difference (%)</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={thresholdPercentage}
                    onChange={(e) => setThresholdPercentage(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 5%"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <span className="block text-[11px] text-slate-500 mb-1">Absolute Quantity Difference</span>
                  <input
                    type="number"
                    min="1"
                    value={thresholdQuantity}
                    onChange={(e) => setThresholdQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 10 units"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Assigned Counter & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Assigned Counter / Team
              </label>
              <input
                type="text"
                value={assignedCounterName}
                onChange={(e) => setAssignedCounterName(e.target.value)}
                placeholder="e.g. Yard Team Alpha, Emeka"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Session Purpose / Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. End-of-month audit, factory yard check"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Snapshot Notice */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-lg text-xs text-amber-800 dark:text-amber-300">
            <span className="font-semibold">Snapshot Freeze:</span> System quantities for all items in scope will be captured immediately upon creation. Any subsequent yard transfers or orders will be tracked without corrupting this count's baseline.
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 active:bg-orange-700 rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <ClipboardCheck className="w-4 h-4" />
              {isLoading ? 'Freezing Snapshot...' : 'Create & Open Count Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
