import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Save,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Eye,
  EyeOff,
  Plus,
  Minus,
  Check,
  Send,
} from 'lucide-react';
import { StockCountSession, StockCountItem } from '../../types/stockCount';
import { stockCountService } from '../../services/stockCount.service';
import { useAuth } from '../../hooks/useAuth';
import { PERMISSION_CODES } from '../../types/auth';

interface CountingSheetModalProps {
  isOpen: boolean;
  session: StockCountSession;
  onClose: () => void;
  onSuccess: () => void;
  onRequestRecount?: (item: StockCountItem) => void;
}

export const CountingSheetModal: React.FC<CountingSheetModalProps> = ({
  isOpen,
  session,
  onClose,
  onSuccess,
  onRequestRecount,
}) => {
  const { profile, currentUser, hasPermission } = useAuth();
  const canReview = hasPermission(PERMISSION_CODES.STOCK_COUNTS_REVIEW);

  // Local draft counts keyed by itemId: { countedQuantity: number | '', notes: string }
  const [draftCounts, setDraftCounts] = useState<Record<string, { countedQuantity: number | ''; notes: string }>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTab, setFilterTab] = useState<'all' | 'uncounted' | 'counted' | 'discrepancy'>('all');
  const [showSystemQuantityOverride, setShowSystemQuantityOverride] = useState<boolean>(false);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Initialize draft counts from session items
  useEffect(() => {
    if (session && session.items) {
      const initial: Record<string, { countedQuantity: number | ''; notes: string }> = {};
      session.items.forEach((item) => {
        initial[item.id] = {
          countedQuantity: item.countedQuantity !== null ? item.countedQuantity : '',
          notes: item.notes || '',
        };
      });
      setDraftCounts(initial);
      setHasUnsavedChanges(false);
    }
  }, [session]);

  const handleQuantityChange = (itemId: string, val: string) => {
    const num = val === '' ? '' : Math.max(0, parseInt(val, 10) || 0);
    setDraftCounts((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        countedQuantity: num,
      },
    }));
    setHasUnsavedChanges(true);
    setSaveSuccessNotice(null);
  };

  const handleStepQuantity = (itemId: string, delta: number) => {
    const current = draftCounts[itemId]?.countedQuantity;
    const currentNum = current === '' || current === undefined ? 0 : Number(current);
    const nextVal = Math.max(0, currentNum + delta);
    setDraftCounts((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        countedQuantity: nextVal,
      },
    }));
    setHasUnsavedChanges(true);
    setSaveSuccessNotice(null);
  };

  const handleSetZero = (itemId: string) => {
    setDraftCounts((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        countedQuantity: 0,
      },
    }));
    setHasUnsavedChanges(true);
    setSaveSuccessNotice(null);
  };

  const handleNotesChange = (itemId: string, notes: string) => {
    setDraftCounts((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        notes,
      },
    }));
    setHasUnsavedChanges(true);
    setSaveSuccessNotice(null);
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    return session.items.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.productName.toLowerCase().includes(q) ||
        (item.variantName && item.variantName.toLowerCase().includes(q)) ||
        item.sku.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const draft = draftCounts[item.id];
      const isCounted = draft && draft.countedQuantity !== '';

      if (filterTab === 'uncounted') {
        return !isCounted;
      }
      if (filterTab === 'counted') {
        return isCounted;
      }
      if (filterTab === 'discrepancy') {
        if (!isCounted) return false;
        return Number(draft.countedQuantity) !== item.systemQuantitySnapshot;
      }

      return true;
    });
  }, [session.items, searchQuery, filterTab, draftCounts]);

  // Counting Progress Metrics
  const countedCount = useMemo(() => {
    return Object.values(draftCounts).filter((c) => c.countedQuantity !== '').length;
  }, [draftCounts]);

  const totalCount = session.items.length;
  const progressPercent = totalCount > 0 ? Math.round((countedCount / totalCount) * 100) : 0;

  // Save Draft Progress
  const handleSaveDraft = async () => {
    try {
      setIsSaving(true);
      setErrorMessage(null);

      const countsToSave = Object.entries(draftCounts)
        .filter(([_, data]) => data.countedQuantity !== '')
        .map(([itemId, data]) => ({
          itemId,
          countedQuantity: Number(data.countedQuantity),
          notes: data.notes,
        }));

      if (countsToSave.length === 0) {
        setErrorMessage('No counts entered yet to save.');
        setIsSaving(false);
        return;
      }

      await stockCountService.batchRecordCounts({
        stockCountId: session.id,
        counts: countsToSave,
        counterId: profile?.id || currentUser?.id || 'counter-1',
        counterName: profile?.full_name || profile?.email || 'Authorized Counter',
        isDraftSave: true,
      });

      setHasUnsavedChanges(false);
      setSaveSuccessNotice('Progress draft saved successfully.');
      setTimeout(() => setSaveSuccessNotice(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save draft counts.');
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Count Session
  const handleSubmitSession = async () => {
    // Check if any items are uncounted
    const uncountedCount = session.items.filter((item) => {
      const d = draftCounts[item.id];
      return !d || d.countedQuantity === '';
    }).length;

    if (uncountedCount > 0) {
      setErrorMessage(
        `${uncountedCount} item(s) remain uncounted. Please enter exact counts or 0 for empty stock before submission.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      // Save all counts first
      const countsToSave = Object.entries(draftCounts).map(([itemId, data]) => ({
        itemId,
        countedQuantity: Number(data.countedQuantity),
        notes: data.notes,
      }));

      await stockCountService.batchRecordCounts({
        stockCountId: session.id,
        counts: countsToSave,
        counterId: profile?.id || currentUser?.id || 'counter-1',
        counterName: profile?.full_name || profile?.email || 'Authorized Counter',
      });

      // Submit for review
      await stockCountService.submitSession({
        stockCountId: session.id,
        submittedBy: profile?.id || currentUser?.id || 'counter-1',
        submittedByName: profile?.full_name || profile?.email || 'Authorized Counter',
      });

      setHasUnsavedChanges(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit count session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isBlind = session.isBlindCount && !showSystemQuantityOverride;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-5xl h-[95vh] border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 px-2 py-0.5 rounded">
                {session.countNumber}
              </span>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Physical Stock Count Sheet
              </h2>
              <span className="text-xs text-slate-500">
                · {session.locationName} ({session.locationCode})
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Count Date: {session.countDate} · Scope:{' '}
              {session.scope === 'full_location'
                ? 'Full Location'
                : session.scope === 'category'
                ? `Category: ${session.categoryName}`
                : 'Selected Products'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {canReview && session.isBlindCount && (
              <button
                type="button"
                onClick={() => setShowSystemQuantityOverride(!showSystemQuantityOverride)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
                title="Supervisor Override: Reveal System Snapshot"
              >
                {showSystemQuantityOverride ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-orange-500" />
                    <span>Hide Baseline</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>Supervisor Reveal</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress & Alert Bar */}
        <div className="px-6 py-2.5 bg-slate-100/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4 flex-1">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Progress: <strong className="text-slate-900 dark:text-white">{countedCount}</strong> of{' '}
              {totalCount} counted ({progressPercent}%)
            </span>
            <div className="w-48 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>

            {hasUnsavedChanges && (
              <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                Unsaved edits
              </span>
            )}

            {saveSuccessNotice && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                {saveSuccessNotice}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isBlind && (
              <span className="text-slate-500 text-[11px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">
                Blind Mode Active
              </span>
            )}
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search product, variant, or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterTab === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              All Items ({totalCount})
            </button>
            <button
              onClick={() => setFilterTab('uncounted')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterTab === 'uncounted'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Uncounted ({totalCount - countedCount})
            </button>
            <button
              onClick={() => setFilterTab('counted')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterTab === 'counted'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Counted ({countedCount})
            </button>
            <button
              onClick={() => setFilterTab('discrepancy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterTab === 'discrepancy'
                  ? 'bg-orange-600 text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Variances Only
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:underline text-[11px]">
              Dismiss
            </button>
          </div>
        )}

        {/* Items Counting Table / List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 divide-y divide-slate-100 dark:divide-slate-800">
          {filteredItems.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <CheckCircle className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm">No items matching current view or filters.</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const draft = draftCounts[item.id] || { countedQuantity: '', notes: '' };
              const currentVal = draft.countedQuantity;
              const hasCount = currentVal !== '';
              const variance = hasCount ? Number(currentVal) - item.systemQuantitySnapshot : null;

              return (
                <div
                  key={item.id}
                  className={`py-3.5 px-3 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                    hasCount
                      ? 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                      : 'bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50/40'
                  }`}
                >
                  {/* Left: Product & Specs */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                        {item.productName}
                      </span>
                      {item.variantName && (
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                          · {item.variantName}
                        </span>
                      )}
                      {item.isRecounted && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-mono">
                          Recounted ({item.recounts.length})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="font-mono text-[11px]">{item.sku}</span>
                      <span>·</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">Unit: {item.unit}</span>

                      {!isBlind && (
                        <>
                          <span>·</span>
                          <span className="text-slate-500">
                            System Baseline:{' '}
                            <strong className="text-slate-800 dark:text-slate-200">
                              {item.systemQuantitySnapshot.toLocaleString()}
                            </strong>
                          </span>
                        </>
                      )}

                      {item.hasMovementDuringCount && (
                        <>
                          <span>·</span>
                          <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Activity during count
                          </span>
                        </>
                      )}
                    </div>

                    {item.reviewerNotes && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded inline-block">
                        Recount note: {item.reviewerNotes}
                      </p>
                    )}
                  </div>

                  {/* Right: Touch Counter Controls & Notes */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Notes input */}
                    <input
                      type="text"
                      placeholder="Line notes..."
                      value={draft.notes}
                      onChange={(e) => handleNotesChange(item.id, e.target.value)}
                      className="w-32 sm:w-44 px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />

                    {/* Stepper & Input */}
                    <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
                      <button
                        type="button"
                        onClick={() => handleStepQuantity(item.id, -1)}
                        className="px-2.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                        title="Decrement"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <input
                        type="number"
                        min="0"
                        placeholder="Qty"
                        value={currentVal}
                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                        className="w-20 text-center py-1.5 text-sm font-semibold text-slate-900 dark:text-white bg-transparent focus:outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => handleStepQuantity(item.id, 1)}
                        className="px-2.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                        title="Increment"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Zero shortcut */}
                    <button
                      type="button"
                      onClick={() => handleSetZero(item.id)}
                      className="px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                      title="Set Count to Zero"
                    >
                      0
                    </button>

                    {/* Variance Display if not blind */}
                    {!isBlind && (
                      <div className="w-24 text-right">
                        {variance !== null ? (
                          variance === 0 ? (
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              Matched
                            </span>
                          ) : variance > 0 ? (
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                              +{variance} Surplus
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                              {variance} Shortage
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-slate-400 italic">Uncounted</span>
                        )}
                      </div>
                    )}

                    {/* Recount Trigger for Supervisor */}
                    {canReview && onRequestRecount && (
                      <button
                        type="button"
                        onClick={() => onRequestRecount(item)}
                        className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40"
                        title="Request Recount on this item"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Sticky Action Bar */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              {countedCount} of {totalCount} items counted.
            </span>
            {countedCount === totalCount && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-4 h-4" />
                All items recorded
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving || isSubmitting}
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Saving...' : 'Save Draft Progress'}
            </button>

            <button
              type="button"
              onClick={handleSubmitSession}
              disabled={isSaving || isSubmitting || countedCount < totalCount}
              className="flex-1 sm:flex-none px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? 'Submitting...' : 'Submit Count for Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
