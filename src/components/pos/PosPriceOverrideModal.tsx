import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Tag } from 'lucide-react';
import { PosCartItem } from '../../types/pos';
import { useAuth } from '../../hooks/useAuth';
import { PERMISSION_CODES } from '../../types/auth';

interface PosPriceOverrideModalProps {
  isOpen: boolean;
  item: PosCartItem | null;
  onClose: () => void;
  onApplyOverride: (itemId: string, newPrice: number, reason: string) => void;
  onResetPrice: (itemId: string) => void;
}

export const PosPriceOverrideModal: React.FC<PosPriceOverrideModalProps> = ({
  isOpen,
  item,
  onClose,
  onApplyOverride,
  onResetPrice,
}) => {
  const { hasPermission, isAdministrator } = useAuth();
  const canOverride = isAdministrator() || hasPermission(PERMISSION_CODES.POS_PRICE_OVERRIDE);

  const [priceInput, setPriceInput] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string>('');

  React.useEffect(() => {
    if (item) {
      setPriceInput(item.unitPrice.toString());
      setReason(item.overrideReason || '');
      setError('');
    }
  }, [item]);

  if (!item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canOverride) {
      setError('You lack permission to override prices. Authorization from a manager or administrator is required.');
      return;
    }

    const num = parseFloat(priceInput);
    if (isNaN(num) || num < 0) {
      setError('Please enter a valid price (greater than or equal to 0).');
      return;
    }

    if (!reason.trim()) {
      setError('A brief justification/reason is required for price overrides.');
      return;
    }

    onApplyOverride(item.id, num, reason.trim());
    onClose();
  };

  const handleReset = () => {
    onResetPrice(item.id);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Authorized Price Override"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!canOverride && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            <strong>Restricted Action:</strong> Price overrides require manager authorization (<code>pos.price_override</code>). Ordinary cashier accounts cannot modify catalog selling prices.
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-orange-600" />
            <span className="font-semibold text-slate-800 dark:text-slate-100">{item.productName}</span>
          </div>
          {item.variantName && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Variant: {item.variantName}</p>
          )}
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Standard Catalog Price:</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              ₦{item.standardPrice.toLocaleString()} / {item.unit}
            </span>
          </div>
          {item.isPriceOverridden && (
            <div className="mt-1 flex items-center justify-between text-xs font-medium text-amber-600 dark:text-amber-400">
              <span>Current Overridden Price:</span>
              <span>₦{item.unitPrice.toLocaleString()} / {item.unit}</span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            New Unit Price (₦) <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            min="0"
            step="any"
            value={priceInput}
            onChange={(e) => {
              setPriceInput(e.target.value);
              setError('');
            }}
            disabled={!canOverride}
            placeholder="e.g. 850"
            className="w-full"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Override Reason & Authorization Note <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError('');
            }}
            disabled={!canOverride}
            placeholder="e.g. Bulk contractor negotiated deal approved by Sales Mgr"
            className="w-full"
          />
        </div>

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
          <div>
            {item.isPriceOverridden && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="text-xs text-slate-600 dark:text-slate-400"
              >
                Reset to Standard Price
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!canOverride}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Apply Override
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
