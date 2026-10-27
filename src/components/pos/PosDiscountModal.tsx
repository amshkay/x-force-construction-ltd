import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Percent, DollarSign } from 'lucide-react';
import { PosDiscountType, PosCartItem } from '../../types/pos';
import { useAuth } from '../../hooks/useAuth';
import { PERMISSION_CODES } from '../../types/auth';

interface PosDiscountModalProps {
  isOpen: boolean;
  mode: 'line' | 'cart';
  lineItem?: PosCartItem | null;
  subtotal?: number;
  currentType: PosDiscountType;
  currentValue: number;
  onClose: () => void;
  onApplyDiscount: (type: PosDiscountType, value: number) => void;
  onRemoveDiscount: () => void;
}

export const PosDiscountModal: React.FC<PosDiscountModalProps> = ({
  isOpen,
  mode,
  lineItem,
  subtotal = 0,
  currentType,
  currentValue,
  onClose,
  onApplyDiscount,
  onRemoveDiscount,
}) => {
  const { hasPermission, isAdministrator } = useAuth();
  const canDiscount = isAdministrator() || hasPermission(PERMISSION_CODES.POS_DISCOUNT);

  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(
    currentType === 'fixed' ? 'fixed' : 'percentage'
  );
  const [valInput, setValInput] = useState<string>('');
  const [error, setError] = useState<string>('');

  const targetAmount = mode === 'line' && lineItem
    ? lineItem.quantity * lineItem.unitPrice
    : subtotal;

  useEffect(() => {
    if (isOpen) {
      setDiscountType(currentType === 'fixed' ? 'fixed' : 'percentage');
      setValInput(currentValue > 0 ? currentValue.toString() : '');
      setError('');
    }
  }, [isOpen, currentType, currentValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canDiscount) {
      setError('You do not have permission to apply discounts. Manager authorization required.');
      return;
    }

    const num = parseFloat(valInput);
    if (isNaN(num) || num <= 0) {
      setError('Please enter a valid positive discount amount.');
      return;
    }

    if (discountType === 'percentage') {
      if (num > 100) {
        setError('Percentage discount cannot exceed 100%.');
        return;
      }
    } else {
      if (num > targetAmount) {
        setError(`Fixed discount (₦${num.toLocaleString()}) cannot exceed the amount due (₦${targetAmount.toLocaleString()}).`);
        return;
      }
    }

    onApplyDiscount(discountType, num);
    onClose();
  };

  const handleClear = () => {
    onRemoveDiscount();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'line' ? `Line Discount — ${lineItem?.productName || 'Item'}` : 'Cart / Order Discount'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!canDiscount && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
            <strong>Restricted Action:</strong> Discount permissions (<code>pos.discount</code>) are controlled. Only authorized sales staff or managers may issue discounts.
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              {mode === 'line' ? 'Item Gross Line Total:' : 'Current Cart Subtotal:'}
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              ₦{targetAmount.toLocaleString()}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Discount Structure
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!canDiscount}
              onClick={() => {
                setDiscountType('percentage');
                setError('');
              }}
              className={`flex items-center justify-center gap-2 rounded-lg border py-2 text-xs font-semibold transition ${
                discountType === 'percentage'
                  ? 'border-orange-600 bg-orange-50 text-orange-600 dark:border-orange-500 dark:bg-orange-950/40 dark:text-orange-400'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <Percent className="h-3.5 w-3.5" />
              Percentage (%)
            </button>
            <button
              type="button"
              disabled={!canDiscount}
              onClick={() => {
                setDiscountType('fixed');
                setError('');
              }}
              className={`flex items-center justify-center gap-2 rounded-lg border py-2 text-xs font-semibold transition ${
                discountType === 'fixed'
                  ? 'border-orange-600 bg-orange-50 text-orange-600 dark:border-orange-500 dark:bg-orange-950/40 dark:text-orange-400'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <DollarSign className="h-3.5 w-3.5" />
              Fixed Amount (₦)
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            {discountType === 'percentage' ? 'Discount Percentage (%)' : 'Discount Amount (₦)'} <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            min="0"
            max={discountType === 'percentage' ? '100' : targetAmount.toString()}
            step="any"
            value={valInput}
            onChange={(e) => {
              setValInput(e.target.value);
              setError('');
            }}
            disabled={!canDiscount}
            placeholder={discountType === 'percentage' ? 'e.g. 5' : 'e.g. 2000'}
            className="w-full"
            autoFocus
          />
        </div>

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
          <div>
            {currentValue > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                Remove Discount
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
              disabled={!canDiscount}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Apply Discount
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
