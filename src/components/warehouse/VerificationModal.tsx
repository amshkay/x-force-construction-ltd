import React, { useState } from 'react';
import { X, ClipboardCheck, CheckCircle2, AlertTriangle, Check } from 'lucide-react';
import { FulfilmentRecord } from '../../types/warehouse';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { warehouseService } from '../../services/warehouse.service';
import { useAuth } from '../../hooks/useAuth';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  fulfilment: FulfilmentRecord | null;
  onFulfilmentUpdated: (updated: FulfilmentRecord) => void;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({
  isOpen,
  onClose,
  fulfilment,
  onFulfilmentUpdated,
}) => {
  const toast = useToast();
  const { profile } = useAuth();

  const [verifiedMap, setVerifiedMap] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (fulfilment) {
      const initial: Record<string, number> = {};
      fulfilment.items.forEach((item) => {
        initial[item.id] = item.verifiedQuantity || item.pickedQuantity || item.allocatedQuantity;
      });
      setVerifiedMap(initial);
    }
  }, [fulfilment]);

  if (!isOpen || !fulfilment) return null;

  const handleVerifyAll = () => {
    const next: Record<string, number> = {};
    fulfilment.items.forEach((item) => {
      next[item.id] = item.pickedQuantity || item.allocatedQuantity;
    });
    setVerifiedMap(next);
    toast.success('All picked items marked verified.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = fulfilment.items.map((item) => ({
        itemId: item.id,
        verifiedQuantity: verifiedMap[item.id] ?? item.pickedQuantity,
      }));

      const updated = await warehouseService.verifyFulfilment(
        fulfilment.id,
        payload,
        profile?.id || 'usr-supervisor',
        profile?.full_name || 'Yard Supervisor'
      );

      toast.success(
        `Quantity verification complete for Fulfilment #${fulfilment.fulfilmentNumber}.`,
        'Verified'
      );
      onFulfilmentUpdated(updated);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Verification update failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <ClipboardCheck className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                Supervisor Quantity Verification
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Fulfilment #{fulfilment.fulfilmentNumber} • Order #{fulfilment.orderNumber}
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
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          <div className="flex justify-between items-center p-3 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 rounded-lg">
            <p className="text-indigo-900 dark:text-indigo-200">
              Verify that physical brick quantities and paver bundles in staging match the order manifest before palletizing and loading.
            </p>
            <Button size="sm" variant="outline" onClick={handleVerifyAll} className="shrink-0 text-indigo-700">
              ✓ Verify All Picked
            </Button>
          </div>

          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <th className="p-3">Product / Variant</th>
                  <th className="p-3 text-center">Allocated</th>
                  <th className="p-3 text-center">Picked</th>
                  <th className="p-3 text-center">Verified Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {fulfilment.items.map((item) => {
                  const verifiedVal = verifiedMap[item.id] ?? item.pickedQuantity;
                  const isMatch = verifiedVal === item.allocatedQuantity;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {item.productName}
                        </div>
                        {item.variantName && (
                          <div className="text-[11px] text-slate-500">{item.variantName}</div>
                        )}
                        <div className="font-mono text-[10px] text-slate-400">SKU: {item.sku}</div>
                      </td>
                      <td className="p-3 text-center font-mono text-slate-600">
                        {item.allocatedQuantity.toLocaleString()}
                      </td>
                      <td className="p-3 text-center font-mono text-slate-800 font-semibold">
                        {item.pickedQuantity.toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min="0"
                          value={verifiedVal}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setVerifiedMap((prev) => ({
                              ...prev,
                              [item.id]: val,
                            }));
                          }}
                          className={`w-24 rounded border py-1 px-2 text-center font-mono font-bold ${
                            isMatch
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                              : 'border-amber-400 bg-amber-50 text-amber-900'
                          }`}
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
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-800/60">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            Clear for Packing & Palletizing
          </Button>
        </div>
      </div>
    </div>
  );
};
