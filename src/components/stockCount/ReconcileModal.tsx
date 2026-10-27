import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, FileCheck } from 'lucide-react';
import { StockCountSession } from '../../types/stockCount';
import { stockCountService } from '../../services/stockCount.service';
import { useAuth } from '../../hooks/useAuth';

interface ReconcileModalProps {
  isOpen: boolean;
  session: StockCountSession;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReconcileModal: React.FC<ReconcileModalProps> = ({
  isOpen,
  session,
  onClose,
  onSuccess,
}) => {
  const { profile, currentUser } = useAuth();
  const [notes, setNotes] = useState<string>('');
  const [hasConfirmed, setHasConfirmed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter items with discrepancies that require inventory adjustment movements
  const adjustments = session.items.filter(
    (item) => item.approvedQuantity !== null && item.approvedQuantity !== item.systemQuantitySnapshot
  );

  const handleExecuteReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasConfirmed) {
      setError('Please check the confirmation box to authorize inventory ledger adjustment.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await stockCountService.reconcileSession({
        stockCountId: session.id,
        reconciledBy: profile?.id || currentUser?.id || 'admin-user',
        reconciledByName: profile?.full_name || profile?.email || 'Authorized Administrator',
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to reconcile inventory stock.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Authorize Stock Count Reconciliation
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Apply approved physical counts to live inventory balances
              </p>
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
        <form onSubmit={handleExecuteReconciliation} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Warning / Audit Notice */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <span className="font-semibold block text-amber-900 dark:text-amber-200">
                Irreversible Inventory Ledger Update
              </span>
              <p>
                Executing reconciliation will create immutable <strong>Stock Count Reconciliation</strong> movements
                in the stock ledger for <strong>{adjustments.length}</strong> items. The live stock on hand at{' '}
                <strong>{session.locationName}</strong> will immediately equal the approved physical count.
              </p>
            </div>
          </div>

          {/* Adjustments Preview */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <span>Adjustment Movements to Post ({adjustments.length})</span>
              <span className="font-mono text-slate-500">Ref: {session.countNumber}</span>
            </div>

            {adjustments.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500 mb-1" />
                No quantity delta required. All items match baseline snapshot.
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {adjustments.map((item) => {
                  const delta = (item.approvedQuantity ?? 0) - item.systemQuantitySnapshot;
                  return (
                    <div key={item.id} className="p-3 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white block">
                          {item.productName}
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          {item.variantName ? `${item.variantName} · ` : ''}SKU: {item.sku}
                        </span>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-slate-400 line-through">
                            {item.systemQuantitySnapshot}
                          </span>
                          <span className="text-slate-400">→</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {item.approvedQuantity} {item.unit}
                          </span>
                        </div>
                        <span
                          className={`text-[11px] font-semibold ${
                            delta < 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          Adjustment: {delta > 0 ? `+${delta}` : delta} {item.unit}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reconciliation Audit Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Reconciliation Execution Note (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Month-end audited physical reconciliation authorized by General Manager"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Mandatory Checkbox Confirmation */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={hasConfirmed}
                onChange={(e) => setHasConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                I confirm that physical counts for session <strong>{session.countNumber}</strong> have been
                appropriately reviewed and approved. I authorize writing these adjustments into the physical inventory
                ledger.
              </span>
            </label>
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
              disabled={isLoading || !hasConfirmed}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <FileCheck className="w-4 h-4" />
              {isLoading ? 'Reconciling Ledger...' : 'Execute Stock Reconciliation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
