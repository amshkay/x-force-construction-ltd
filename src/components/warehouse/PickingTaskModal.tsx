import React, { useState } from 'react';
import { X, CheckCircle2, QrCode, AlertCircle, Package, ArrowRight, ShieldAlert, Check } from 'lucide-react';
import { FulfilmentRecord } from '../../types/warehouse';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import { warehouseService } from '../../services/warehouse.service';
import { useAuth } from '../../hooks/useAuth';

interface PickingTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  fulfilment: FulfilmentRecord | null;
  onFulfilmentUpdated: (updated: FulfilmentRecord) => void;
}

export const PickingTaskModal: React.FC<PickingTaskModalProps> = ({
  isOpen,
  onClose,
  fulfilment,
  onFulfilmentUpdated,
}) => {
  const toast = useToast();
  const { profile } = useAuth();

  const [pickedState, setPickedState] = useState<
    Record<string, { pickedQty: number; discrepancy: string }>
  >({});
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize pickedState from fulfilment items
  React.useEffect(() => {
    if (fulfilment) {
      const initial: Record<string, { pickedQty: number; discrepancy: string }> = {};
      fulfilment.items.forEach((item) => {
        initial[item.id] = {
          pickedQty: item.pickedQuantity || 0,
          discrepancy: item.discrepancyNote || '',
        };
      });
      setPickedState(initial);
      setBarcodeInput('');
    }
  }, [fulfilment]);

  if (!isOpen || !fulfilment) return null;

  const handlePickAll = () => {
    const updated: Record<string, { pickedQty: number; discrepancy: string }> = {};
    fulfilment.items.forEach((item) => {
      updated[item.id] = {
        pickedQty: item.allocatedQuantity,
        discrepancy: pickedState[item.id]?.discrepancy || '',
      };
    });
    setPickedState(updated);
    toast.success('All items set to allocated quantities.');
  };

  const handleBarcodeScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const term = barcodeInput.trim().toUpperCase();
    const matchedItem = fulfilment.items.find(
      (it) => it.sku.toUpperCase() === term || it.productName.toUpperCase().includes(term)
    );

    if (matchedItem) {
      setPickedState((prev) => ({
        ...prev,
        [matchedItem.id]: {
          pickedQty: matchedItem.allocatedQuantity,
          discrepancy: prev[matchedItem.id]?.discrepancy || '',
        },
      }));
      toast.success(`Matched SKU ${matchedItem.sku} (${matchedItem.productName})! Quantity marked full.`);
      setBarcodeInput('');
    } else {
      toast.error(`No item in this fulfilment matched barcode/SKU: ${term}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = fulfilment.items.map((item) => ({
        itemId: item.id,
        pickedQuantity: pickedState[item.id]?.pickedQty ?? item.allocatedQuantity,
        discrepancyNote: pickedState[item.id]?.discrepancy || undefined,
      }));

      const updated = await warehouseService.updatePickingProgress(
        fulfilment.id,
        payload,
        profile?.id || 'usr-warehouse',
        profile?.full_name || 'Warehouse Staff'
      );

      toast.success(
        `Picking progress updated for Fulfilment #${fulfilment.fulfilmentNumber}.`,
        'Picking Updated'
      );
      onFulfilmentUpdated(updated);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update picking progress.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAllocated = fulfilment.items.reduce((s, it) => s + it.allocatedQuantity, 0);
  const totalPickedSoFar = fulfilment.items.reduce(
    (s, it) => s + (pickedState[it.id]?.pickedQty ?? 0),
    0
  );
  const isComplete = totalPickedSoFar >= totalAllocated;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <Package className="h-5 w-5 text-orange-600" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white">
                  Yard Picking Sheet: #{fulfilment.fulfilmentNumber}
                </h3>
                <Badge variant={isComplete ? 'success' : 'warning'} size="sm">
                  {isComplete ? 'All Picked' : 'Picking in Progress'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Location: {fulfilment.sourceLocationName} • Order #{fulfilment.orderNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Barcode Quick Scanner & Pick All Toolbar */}
          <div className="flex items-center justify-between gap-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex-wrap">
            <form onSubmit={handleBarcodeScan} className="flex items-center gap-2 flex-1 min-w-[280px]">
              <div className="relative flex-1">
                <QrCode className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan or enter item SKU / Code (e.g. XF-BRK-STD-01-RED)..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <Button type="submit" size="sm" variant="outline">
                Match SKU
              </Button>
            </form>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handlePickAll}
                className="text-orange-600 border-orange-200 dark:border-orange-900 hover:bg-orange-50 dark:hover:bg-orange-950 font-semibold"
              >
                ✓ Pick All Allocated
              </Button>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900">
            <div className="flex justify-between items-center text-xs mb-1.5 font-semibold">
              <span className="text-slate-600 dark:text-slate-300">Picking Progress</span>
              <span className="text-slate-900 dark:text-white font-mono">
                {totalPickedSoFar.toLocaleString()} / {totalAllocated.toLocaleString()} units (
                {totalAllocated > 0 ? Math.round((totalPickedSoFar / totalAllocated) * 100) : 0}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  isComplete ? 'bg-emerald-500' : 'bg-orange-500'
                }`}
                style={{
                  width: `${totalAllocated > 0 ? Math.min(100, (totalPickedSoFar / totalAllocated) * 100) : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Items Checklist Table */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <th className="p-3 w-28">Yard Bay</th>
                  <th className="p-3">Product Details</th>
                  <th className="p-3 w-28 text-center">Allocated</th>
                  <th className="p-3 w-40 text-center">Qty Picked</th>
                  <th className="p-3">Discrepancy / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {fulfilment.items.map((item) => {
                  const state = pickedState[item.id] || {
                    pickedQty: item.pickedQuantity || 0,
                    discrepancy: '',
                  };
                  const isItemPicked = state.pickedQty >= item.allocatedQuantity;

                  return (
                    <tr
                      key={item.id}
                      className={
                        isItemPicked
                          ? 'bg-emerald-50/30 dark:bg-emerald-950/10'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }
                    >
                      <td className="p-3">
                        <span className="font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-800 dark:text-slate-200">
                          {item.bayCode || 'UNASSIGNED'}
                        </span>
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.productName}
                        </div>
                        {item.variantName && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {item.variantName}
                          </div>
                        )}
                        <div className="text-[10px] font-mono text-slate-400">
                          SKU: {item.sku} • Unit: {item.unit}
                        </div>
                      </td>

                      <td className="p-3 text-center font-bold text-slate-800 dark:text-slate-200">
                        {item.allocatedQuantity.toLocaleString()}
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-1.5 justify-center">
                          <input
                            type="number"
                            min="0"
                            max={item.allocatedQuantity * 2}
                            value={state.pickedQty}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10) || 0;
                              setPickedState((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  pickedQty: val,
                                },
                              }));
                            }}
                            className={`w-20 rounded border py-1 px-2 text-center text-xs font-mono font-bold ${
                              isItemPicked
                                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200'
                                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setPickedState((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  pickedQty: item.allocatedQuantity,
                                },
                              }));
                            }}
                            title="Mark Full Quantity Picked"
                            className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-orange-100 hover:text-orange-700 transition"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>

                      <td className="p-3">
                        <input
                          type="text"
                          value={state.discrepancy}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPickedState((prev) => ({
                              ...prev,
                              [item.id]: {
                                ...prev[item.id],
                                discrepancy: val,
                              },
                            }));
                          }}
                          placeholder="e.g. 5 hairline fractured blocks replaced from Bay A3"
                          className="w-full rounded border border-slate-200 dark:border-slate-700 bg-transparent py-1 px-2 text-[11px] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-800/60">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {isComplete ? (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Ready for verification & packing staging
              </span>
            ) : (
              <span>Confirm picked quantities from physical yard bays.</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              isLoading={isSubmitting}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
            >
              Save Picking Progress
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
