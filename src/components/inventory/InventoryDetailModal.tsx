/**
 * Inventory Detail Modal
 * Module 11 — Inventory & Stock Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Comprehensive view of stock balances, derivation of available quantities,
 * configurable thresholds, and recent movement audit trail for a specific product/variant at a location.
 */

import React, { useState, useEffect } from 'react';
import {
  Package,
  Layers,
  MapPin,
  TrendingUp,
  AlertTriangle,
  History,
  CheckCircle,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
  Settings,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { inventoryService } from '../../services/inventory.service';
import {
  InventoryItem,
  StockMovement,
  MOVEMENT_TYPE_CONFIG,
  STOCK_STATUS_CONFIG,
} from '../../types/inventory';
import { formatDate } from '../../utils/formatters';

interface InventoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onReceive: (item: InventoryItem) => void;
  onIssue: (item: InventoryItem) => void;
  onTransfer: (item: InventoryItem) => void;
  onAdjust: (item: InventoryItem) => void;
  onUpdated: () => void;
}

export const InventoryDetailModal: React.FC<InventoryDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  onReceive,
  onIssue,
  onTransfer,
  onAdjust,
  onUpdated,
}) => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoadingMovements, setIsLoadingMovements] = useState<boolean>(false);

  // Threshold edit state
  const [isEditingThresholds, setIsEditingThresholds] = useState<boolean>(false);
  const [minimumStock, setMinimumStock] = useState<number>(0);
  const [reorderLevel, setReorderLevel] = useState<number>(0);
  const [isSavingThresholds, setIsSavingThresholds] = useState<boolean>(false);
  const [thresholdSuccessMsg, setThresholdSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      loadHistory();
      setMinimumStock(item.minimumStock);
      setReorderLevel(item.reorderLevel);
      setIsEditingThresholds(false);
      setThresholdSuccessMsg(null);
    }
  }, [isOpen, item]);

  const loadHistory = async () => {
    if (!item) return;
    try {
      setIsLoadingMovements(true);
      const history = await inventoryService.getStockMovements({
        productId: item.productId,
        variantId: item.variantId || undefined,
        locationId: item.locationId,
      });
      setMovements(history);
    } catch (err) {
      console.error('Failed to load item movement history:', err);
    } finally {
      setIsLoadingMovements(false);
    }
  };

  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    try {
      setIsSavingThresholds(true);
      await inventoryService.updateThresholds({
        productId: item.productId,
        minimumStock: Number(minimumStock),
        reorderLevel: Number(reorderLevel),
      });
      setThresholdSuccessMsg('Thresholds updated successfully.');
      setIsEditingThresholds(false);
      onUpdated();
      setTimeout(() => setThresholdSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Failed to update thresholds:', err);
    } finally {
      setIsSavingThresholds(false);
    }
  };

  if (!item) return null;

  const statusConfig = STOCK_STATUS_CONFIG[item.status];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
          <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950 text-orange-600">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
              {item.productName}
            </h3>
            {item.variantName && (
              <span className="text-xs text-orange-600 font-medium">
                Variant: {item.variantName}
              </span>
            )}
          </div>
        </div>
      }
      description={`Location: ${item.locationName} [${item.locationCode}] • SKU: ${item.sku}`}
      size="xl"
    >
      <div className="space-y-6 text-left">
        {/* Top KPI Cards: Stock Quantities & Valuation */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              On-Hand Stock
            </span>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              {item.quantityOnHand.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-500">{item.unit}</span>
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Reserved Stock
            </span>
            <p className="text-xl font-extrabold text-amber-600 mt-1">
              {item.quantityReserved.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-500">{item.unit}</span>
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Available to Use
            </span>
            <p
              className={`text-xl font-extrabold mt-1 ${
                item.quantityAvailable > 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {item.quantityAvailable.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-500">{item.unit}</span>
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              Stock Valuation
            </span>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
              ₦{item.totalValuation.toLocaleString()}
            </p>
            <span className="text-[10px] text-slate-500">
              @ ₦{item.unitCost.toLocaleString()} / {item.unit}
            </span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/40">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mr-2">
            Stock Actions:
          </span>
          <Button
            size="sm"
            variant="outline"
            className="text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border-emerald-300"
            leftIcon={<ArrowDownRight className="h-4 w-4" />}
            onClick={() => {
              onClose();
              onReceive(item);
            }}
          >
            Receive Stock
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 border-rose-300"
            leftIcon={<ArrowUpRight className="h-4 w-4" />}
            onClick={() => {
              onClose();
              onIssue(item);
            }}
          >
            Issue Stock
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/50 border-amber-300"
            leftIcon={<ArrowLeftRight className="h-4 w-4" />}
            onClick={() => {
              onClose();
              onTransfer(item);
            }}
          >
            Transfer Stock
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/50 border-sky-300"
            leftIcon={<SlidersHorizontal className="h-4 w-4" />}
            onClick={() => {
              onClose();
              onAdjust(item);
            }}
          >
            Adjust Count
          </Button>
        </div>

        {/* Threshold Settings Section */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Stock Replenishment Thresholds
              </span>
              <Badge variant={statusConfig.badgeVariant} size="sm">
                {statusConfig.label}
              </Badge>
            </div>
            {!isEditingThresholds && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Settings className="h-3.5 w-3.5" />}
                onClick={() => setIsEditingThresholds(true)}
              >
                Configure Thresholds
              </Button>
            )}
          </div>

          {thresholdSuccessMsg && (
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-xs text-emerald-600 flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4" />
              <span>{thresholdSuccessMsg}</span>
            </div>
          )}

          {isEditingThresholds ? (
            <form onSubmit={handleSaveThresholds} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Reorder Level ({item.unit})
                </label>
                <input
                  type="number"
                  min="0"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(Number(e.target.value))}
                  disabled={isSavingThresholds}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Safety Minimum Stock ({item.unit})
                </label>
                <input
                  type="number"
                  min="0"
                  value={minimumStock}
                  onChange={(e) => setMinimumStock(Number(e.target.value))}
                  disabled={isSavingThresholds}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSavingThresholds}
                >
                  Save
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingThresholds(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs text-slate-600 dark:text-slate-400">
              <div>
                <span className="block text-[10px] text-slate-500 uppercase">Reorder Level</span>
                <strong className="text-slate-900 dark:text-white text-sm">
                  {item.reorderLevel > 0 ? `${item.reorderLevel.toLocaleString()} ${item.unit}` : 'Not Configured'}
                </strong>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase">Safety Minimum Stock</span>
                <strong className="text-slate-900 dark:text-white text-sm">
                  {item.minimumStock > 0 ? `${item.minimumStock.toLocaleString()} ${item.unit}` : 'Not Configured'}
                </strong>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase">Derivation Rule</span>
                <span className="text-[11px] text-slate-500">
                  Available = On-Hand ({item.quantityOnHand}) − Reserved ({item.quantityReserved})
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Movement History Ledger for this item */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <History className="h-4 w-4 text-orange-600" />
              <span>Stock Movement Audit Trail</span>
            </h4>
            <span className="text-[11px] text-slate-500">
              {movements.length} logged transaction{movements.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
            {isLoadingMovements ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Loading movement audit history...
              </div>
            ) : movements.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No recorded stock movements yet for this item at {item.locationName}.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Ref #</th>
                      <th className="p-3">Type</th>
                      <th className="p-3 text-right">Quantity</th>
                      <th className="p-3">Reason / Details</th>
                      <th className="p-3">Officer</th>
                      <th className="p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {movements.map((m) => {
                      const cfg = MOVEMENT_TYPE_CONFIG[m.movementType] || {
                        label: m.movementType,
                        badgeVariant: 'default',
                        isIncrease: null,
                      };

                      return (
                        <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="p-3 font-mono font-semibold text-slate-900 dark:text-white text-[11px]">
                            {m.movementNumber}
                          </td>
                          <td className="p-3">
                            <Badge variant={cfg.badgeVariant} size="sm">
                              {cfg.label}
                            </Badge>
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                            {cfg.isIncrease === true && <span className="text-emerald-600">+</span>}
                            {cfg.isIncrease === false && <span className="text-rose-600">-</span>}
                            {m.quantity.toLocaleString()} {m.unit}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                            {m.reason}
                            {m.notes && <span className="block text-[10px] text-slate-500 italic">{m.notes}</span>}
                          </td>
                          <td className="p-3 text-slate-500">{m.performedByName}</td>
                          <td className="p-3 text-slate-500 whitespace-nowrap">
                            {formatDate(m.createdAt, 'medium')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
