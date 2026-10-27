import React, { useState } from 'react';
import { X, RotateCcw, AlertCircle, History } from 'lucide-react';
import { StockCountItem } from '../../types/stockCount';
import { stockCountService } from '../../services/stockCount.service';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../utils/formatters';

interface RecountItemModalProps {
  isOpen: boolean;
  item: StockCountItem | null;
  stockCountId: string;
  countNumber: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const RecountItemModal: React.FC<RecountItemModalProps> = ({
  isOpen,
  item,
  stockCountId,
  countNumber,
  onClose,
  onSuccess,
}) => {
  const { profile, currentUser } = useAuth();
  const [recountedQuantity, setRecountedQuantity] = useState<number | ''>('');
  const [reason, setReason] = useState<string>('Physical recount requested by yard supervisor');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recountedQuantity === '' || Number(recountedQuantity) < 0) {
      setError('Please provide a valid, non-negative recount quantity.');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a verification reason for this recount.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await stockCountService.performRecount({
        stockCountId,
        itemId: item.id,
        recountedQuantity: Number(recountedQuantity),
        reason: reason.trim(),
        performedBy: profile?.id || currentUser?.id || 'counter-1',
        performedByName: profile?.full_name || profile?.email || 'Authorized Officer',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record physical recount.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Physical Recount Verification
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">{countNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Product context card */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg">
            <div className="font-semibold text-sm text-slate-900 dark:text-white">{item.productName}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              Variant: {item.variantName || 'Standard'} · SKU: {item.sku} · Unit: {item.unit}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs">
              <div>
                <span className="text-slate-500">System Baseline:</span>
                <span className="ml-1.5 font-semibold text-slate-800 dark:text-slate-200">
                  {item.systemQuantitySnapshot.toLocaleString()} {item.unit}
                </span>
              </div>
              <div>
                <span className="text-slate-500">First Count:</span>
                <span className="ml-1.5 font-semibold text-orange-600 dark:text-orange-400">
                  {item.countedQuantity !== null ? item.countedQuantity.toLocaleString() : 'Uncounted'} {item.unit}
                </span>
              </div>
            </div>
          </div>

          {/* Previous Recount History (if any) */}
          {item.recounts && item.recounts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <History className="w-3.5 h-3.5" />
                Previous Recount Ledger (Preserved)
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1.5 text-xs">
                {item.recounts.map((r, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px]"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Attempt #{r.recountNumber}: {r.recountedQuantity.toLocaleString()} {item.unit}
                      </span>
                      <span className="text-slate-500 block">"{r.reason}"</span>
                    </div>
                    <span className="text-slate-400">{formatDate(r.timestamp, 'short')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Recount Value */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Verified Physical Count ({item.unit}) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              required
              value={recountedQuantity}
              onChange={(e) => setRecountedQuantity(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g. 98"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          {/* Recount Justification */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Recount Reason / Verification Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Broken pallet recount verified in curing bay by supervisor"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 rounded-lg text-xs text-purple-800 dark:text-purple-300">
            <strong>Immutability Notice:</strong> The original count of {item.countedQuantity ?? 0} {item.unit} will not be deleted; it is preserved in the audit log alongside this new recount value.
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
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
              className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {isLoading ? 'Saving Recount...' : 'Record Recount'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
