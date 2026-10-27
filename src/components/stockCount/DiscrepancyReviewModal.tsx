import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileCheck,
  AlertCircle,
  HelpCircle,
  History,
  ChevronDown,
  ChevronUp,
  Undo2,
} from 'lucide-react';
import { StockCountSession, StockCountItem } from '../../types/stockCount';
import { StockMovement } from '../../types/inventory';
import { stockCountService } from '../../services/stockCount.service';
import { inventoryService } from '../../services/inventory.service';
import { useAuth } from '../../hooks/useAuth';
import { PERMISSION_CODES } from '../../types/auth';
import { formatDate } from '../../utils/formatters';

interface DiscrepancyReviewModalProps {
  isOpen: boolean;
  session: StockCountSession;
  onClose: () => void;
  onSuccess: () => void;
  onRequestRecount: (item: StockCountItem) => void;
  onOpenReconcileModal?: () => void;
}

export const DiscrepancyReviewModal: React.FC<DiscrepancyReviewModalProps> = ({
  isOpen,
  session,
  onClose,
  onSuccess,
  onRequestRecount,
  onOpenReconcileModal,
}) => {
  const { profile, currentUser, hasPermission } = useAuth();
  const canApprove = hasPermission(PERMISSION_CODES.STOCK_COUNTS_APPROVE);
  const canReconcile = hasPermission(PERMISSION_CODES.STOCK_COUNTS_RECONCILE);

  const [reviewNotes, setReviewNotes] = useState<string>(session.reviewNotes || '');
  const [itemApprovals, setItemApprovals] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    session.items.forEach((it) => {
      map[it.id] = it.approvedQuantity !== null ? it.approvedQuantity : it.countedQuantity ?? it.systemQuantitySnapshot;
    });
    return map;
  });

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [expandedMovementsItemId, setExpandedMovementsItemId] = useState<string | null>(null);
  const [isLoadingMovements, setIsLoadingMovements] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadMovements();
    }
  }, [isOpen, session.locationId]);

  const loadMovements = async () => {
    try {
      setIsLoadingMovements(true);
      const allMovements = await inventoryService.getStockMovements();
      // Filter movements related to this location
      const relevant = allMovements.filter(
        (m) => m.sourceLocationId === session.locationId || m.destinationLocationId === session.locationId
      );
      setMovements(relevant);
    } catch {
      // Movement loading is supplementary
    } finally {
      setIsLoadingMovements(false);
    }
  };

  if (!isOpen) return null;

  const discrepancies = session.items.filter(
    (item) => item.variance !== null && item.variance !== 0
  );

  const shortages = discrepancies.filter((d) => (d.variance ?? 0) < 0);
  const surpluses = discrepancies.filter((d) => (d.variance ?? 0) > 0);

  const handleReturnForCorrection = async () => {
    if (!reviewNotes.trim()) {
      setError('Please provide supervisor notes explaining what needs correction before returning.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await stockCountService.returnForCorrection({
        stockCountId: session.id,
        notes: reviewNotes.trim(),
        returnedBy: profile?.id || currentUser?.id || 'supervisor-1',
        returnedByName: profile?.full_name || profile?.email || 'Stock Supervisor',
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to return session for correction.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveSession = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const approvalsPayload = Object.entries(itemApprovals).map(([itemId, approvedQuantity]) => ({
        itemId,
        approvedQuantity,
      }));

      await stockCountService.approveSession({
        stockCountId: session.id,
        approvedBy: profile?.id || currentUser?.id || 'supervisor-1',
        approvedByName: profile?.full_name || profile?.email || 'Stock Supervisor',
        reviewNotes: reviewNotes.trim() || undefined,
        itemApprovals: approvalsPayload,
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to approve count session.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 px-2 py-0.5 rounded">
                {session.countNumber}
              </span>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Discrepancy Review & Verification
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {session.locationName} · {discrepancies.length} discrepancy item(s) found across {session.items.length} total items
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* KPI Discrepancy Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 font-medium">Total Discrepancies</span>
              <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {discrepancies.length} items
              </div>
              <span className="text-[11px] text-slate-400">
                {Math.round((discrepancies.length / (session.items.length || 1)) * 100)}% of counted lines
              </span>
            </div>

            <div className="p-4 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
              <span className="text-xs text-red-600 dark:text-red-400 font-medium">Shortages (Deficits)</span>
              <div className="text-xl font-bold text-red-700 dark:text-red-300 mt-1">
                {shortages.length} items
              </div>
              <span className="text-[11px] text-red-500">Physical stock lower than snapshot</span>
            </div>

            <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30">
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Surpluses (Overages)</span>
              <div className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                {surpluses.length} items
              </div>
              <span className="text-[11px] text-blue-500">Physical stock higher than snapshot</span>
            </div>
          </div>

          {/* Discrepancies Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                Variance Line Items
              </h3>
              <span className="text-xs text-slate-500">
                Showing all non-zero variances
              </span>
            </div>

            {discrepancies.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Zero Discrepancies! Perfect 100% Match.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  All physically counted quantities coincide with the system baseline snapshot.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Product & Variant</th>
                      <th className="p-3 text-right">System Snapshot</th>
                      <th className="p-3 text-right">Counted Qty</th>
                      <th className="p-3 text-right">Variance</th>
                      <th className="p-3">Counter & Notes</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {discrepancies.map((item) => {
                      const v = item.variance ?? 0;
                      const isExpanded = expandedMovementsItemId === item.id;
                      const itemMovements = movements.filter(
                        (m) =>
                          m.productId === item.productId &&
                          (item.variantId ? m.variantId === item.variantId : true)
                      );

                      return (
                        <React.Fragment key={item.id}>
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="p-3">
                              <span className="font-semibold text-slate-900 dark:text-white block">
                                {item.productName}
                              </span>
                              <span className="text-slate-500 text-[11px]">
                                {item.variantName ? `${item.variantName} · ` : ''}SKU: {item.sku}
                              </span>
                              {item.hasMovementDuringCount && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                                  <AlertTriangle className="w-3 h-3" />
                                  Live inventory movement detected during count
                                </span>
                              )}
                            </td>

                            <td className="p-3 text-right font-medium text-slate-700 dark:text-slate-300">
                              {item.systemQuantitySnapshot.toLocaleString()} {item.unit}
                            </td>

                            <td className="p-3 text-right font-semibold text-slate-900 dark:text-white">
                              {item.countedQuantity !== null ? item.countedQuantity.toLocaleString() : '-'} {item.unit}
                            </td>

                            <td className="p-3 text-right">
                              {v < 0 ? (
                                <span className="font-semibold text-red-600 dark:text-red-400">
                                  {v} {item.unit}
                                </span>
                              ) : (
                                <span className="font-semibold text-blue-600 dark:text-blue-400">
                                  +{v} {item.unit}
                                </span>
                              )}
                            </td>

                            <td className="p-3 text-slate-600 dark:text-slate-400 max-w-xs">
                              <span className="block text-slate-800 dark:text-slate-200 font-medium">
                                {item.counterName || 'Counter'}
                              </span>
                              {item.notes && <span className="block text-[11px] italic text-slate-500">{item.notes}</span>}
                              {item.reviewerNotes && (
                                <span className="block text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                                  Recount note: {item.reviewerNotes}
                                </span>
                              )}
                            </td>

                            <td className="p-3 text-center">
                              {item.varianceStatus === 'recount_required' ? (
                                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                                  Recount Requested
                                </span>
                              ) : item.varianceStatus === 'approved' ? (
                                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                                  Approved
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                                  Under Review
                                </span>
                              )}
                            </td>

                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedMovementsItemId((prev) => (prev === item.id ? null : item.id))
                                  }
                                  className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1 font-medium transition-colors"
                                  title="Inspect recent movements"
                                >
                                  <History className="w-3 h-3 text-slate-500" />
                                  <span className="hidden sm:inline">Movements</span>
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onRequestRecount(item)}
                                  className="px-2.5 py-1 text-xs rounded border border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 inline-flex items-center gap-1 font-medium transition-colors"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Recount
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expandable Recent Movements Panel */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="p-3 bg-slate-50 dark:bg-slate-900/60 border-t border-b border-slate-200 dark:border-slate-800">
                                <div className="text-xs">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                      <History className="w-3.5 h-3.5 text-orange-600" />
                                      Recent Stock Movements for {item.productName} ({session.locationName})
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                      {itemMovements.length} recorded movement(s)
                                    </span>
                                  </div>

                                  {isLoadingMovements ? (
                                    <p className="text-slate-400 italic py-2">Loading movement history...</p>
                                  ) : itemMovements.length === 0 ? (
                                    <p className="text-slate-400 italic py-1">No prior movements recorded for this product at this location.</p>
                                  ) : (
                                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                      {itemMovements.slice(0, 5).map((m) => (
                                        <div
                                          key={m.id}
                                          className="flex items-center justify-between p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px]"
                                        >
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono font-medium text-slate-600 dark:text-slate-400">
                                              {m.movementNumber}
                                            </span>
                                            <span className="capitalize px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-medium">
                                              {m.movementType.replace('_', ' ')}
                                            </span>
                                            <span className="text-slate-600 dark:text-slate-300">
                                              {m.reason}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <span className="font-semibold text-slate-900 dark:text-white">
                                              {m.quantity} {m.unit}
                                            </span>
                                            <span className="text-slate-400">
                                              {formatDate(m.createdAt)}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Supervisor Review Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Supervisor Verification & Approval Notes
            </label>
            <textarea
              rows={3}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="e.g. Reviewed all shortage variances. Cement bags breakage was recorded under scrap bin. Approved for final inventory reconciliation."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>

          {/* Workflow Guardrails */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Separation of Duties:</span>{' '}
              Approving this stock count verifies the physical counts without immediately adjusting live balances. Reconciliation is an atomic second step executed with administrator authority.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900">
          <div className="text-xs text-slate-500">
            Current Status:{' '}
            <strong className="text-slate-700 dark:text-slate-300 uppercase">{session.status}</strong>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Close
            </button>

            {['submitted', 'under_review'].includes(session.status) && canApprove && (
              <button
                type="button"
                onClick={handleReturnForCorrection}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                title="Return session to counting staff for correction"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Return for Correction
              </button>
            )}

            {session.status === 'approved' && canReconcile && onOpenReconcileModal && (
              <button
                type="button"
                onClick={onOpenReconcileModal}
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <FileCheck className="w-4 h-4" />
                Proceed to Reconcile Inventory
              </button>
            )}

            {['submitted', 'under_review'].includes(session.status) && canApprove && (
              <button
                type="button"
                onClick={handleApproveSession}
                disabled={isLoading}
                className="px-5 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isLoading ? 'Approving...' : 'Approve Discrepancies'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
