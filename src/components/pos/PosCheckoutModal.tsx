import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  Banknote,
  CreditCard,
  Building2,
  Smartphone,
  Globe,
  Coins,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { PaymentMethod } from '../../types/payment';
import { PosCartItem } from '../../types/pos';
import { Customer } from '../../types/customer';
import { roundMoney } from '../../utils/quotationCalculations';
import { paystackService } from '../../services/paystack.service';
import { useAuth } from '../../hooks/useAuth';
import { PERMISSION_CODES } from '../../types/auth';

interface PosCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: PosCartItem[];
  subtotal: number;
  cartDiscountAmount: number;
  totalDiscountAmount: number;
  additionalChargesFee: number;
  totalAmount: number;
  selectedCustomer: Customer | null;
  locationName: string;
  onConfirmCheckout: (paymentData: {
    paymentMethod: PaymentMethod;
    amountPaid: number;
    amountTendered?: number;
    referenceNumber?: string;
    bankName?: string;
    notes?: string;
  }) => Promise<void>;
}

export const PosCheckoutModal: React.FC<PosCheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  subtotal,
  cartDiscountAmount,
  totalDiscountAmount,
  additionalChargesFee,
  totalAmount,
  selectedCustomer,
  locationName,
  onConfirmCheckout,
}) => {
  const { hasPermission, isAdministrator, profile } = useAuth();
  const canPartialPay = isAdministrator() || hasPermission(PERMISSION_CODES.POS_PARTIAL_PAYMENT);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [tenderedInput, setTenderedInput] = useState<string>('');
  const [amountPaidInput, setAmountPaidInput] = useState<string>('');
  const [allowPartial, setAllowPartial] = useState<boolean>(false);
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [paystackConfigured, setPaystackConfigured] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setPaymentMethod('cash');
      setTenderedInput(totalAmount.toString());
      setAmountPaidInput(totalAmount.toString());
      setAllowPartial(false);
      setReferenceNumber('');
      setBankName('');
      setNotes('');
      setError('');
      setIsProcessing(false);
      setPaystackConfigured(paystackService.isConfigured());
    }
  }, [isOpen, totalAmount]);

  const tenderedAmount = parseFloat(tenderedInput) || 0;
  const changeDue = Math.max(0, roundMoney(tenderedAmount - totalAmount));

  const activeAmountPaid = allowPartial ? (parseFloat(amountPaidInput) || 0) : totalAmount;
  const remainingBalance = Math.max(0, roundMoney(totalAmount - activeAmountPaid));

  const handleQuickCash = (amount: number) => {
    setTenderedInput(amount.toString());
    if (!allowPartial) {
      setAmountPaidInput(totalAmount.toString());
    }
  };

  const handleAddQuickCash = (increment: number) => {
    const current = parseFloat(tenderedInput) || totalAmount;
    setTenderedInput((current + increment).toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return;
    setError('');

    if (items.length === 0) {
      setError('Cannot checkout: Cart is empty.');
      return;
    }

    if (allowPartial && !canPartialPay) {
      setError('You lack authorization to issue credit or process partial counter payments.');
      return;
    }

    if (allowPartial && activeAmountPaid < 0) {
      setError('Amount paid cannot be negative.');
      return;
    }

    if (paymentMethod === 'cash') {
      if (tenderedAmount < activeAmountPaid) {
        setError(`Cash tendered (₦${tenderedAmount.toLocaleString()}) cannot be less than the amount being paid (₦${activeAmountPaid.toLocaleString()}).`);
        return;
      }
    }

    if (paymentMethod === 'bank_transfer' && !referenceNumber.trim()) {
      setError('Please provide a bank transfer reference number, transaction code, or teller number.');
      return;
    }

    if (paymentMethod === 'card_pos' && !referenceNumber.trim()) {
      setError('Please provide the POS terminal transaction reference or RRN code.');
      return;
    }

    try {
      setIsProcessing(true);
      await onConfirmCheckout({
        paymentMethod,
        amountPaid: activeAmountPaid,
        amountTendered: paymentMethod === 'cash' ? tenderedAmount : undefined,
        referenceNumber: referenceNumber.trim() || undefined,
        bankName: bankName.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Payment processing failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Online Paystack Flow
  const handlePaystackCheckout = async () => {
    if (isProcessing) return;
    if (!paystackConfigured) {
      setError('Paystack public key is not configured in environment (VITE_PAYSTACK_PUBLIC_KEY). Please choose Cash, Card POS, or Bank Transfer.');
      return;
    }

    try {
      setIsProcessing(true);
      setError('');
      const email = selectedCustomer?.email || 'counter-sale@xforce.internal';
      const ref = `POS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      await paystackService.startInlinePayment(
        {
          amount: activeAmountPaid,
          email,
          reference: ref,
          orderNumber: 'POS-SALE',
          customerName: selectedCustomer?.fullName || 'Walk-in Customer',
        },
        {
          onSuccess: async (res) => {
            setReferenceNumber(res.reference);
            await onConfirmCheckout({
              paymentMethod: 'paystack',
              amountPaid: activeAmountPaid,
              referenceNumber: res.reference,
              notes: `Paid online via Paystack (Ref: ${res.reference})`,
            });
            onClose();
          },
          onClose: () => {
            setIsProcessing(false);
          },
          onError: (err) => {
            setError(err?.message || 'Paystack online checkout failed.');
            setIsProcessing(false);
          },
        }
      );
    } catch (err: any) {
      setError(err.message || 'Online payment was not completed.');
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete Counter Sale & Payment"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Sale Summary Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900/60 text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400 block">Dispatch Location:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{locationName}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block">Customer:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {selectedCustomer ? selectedCustomer.fullName : 'Guest / Walk-in Customer'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400 block">Total Due:</span>
            <span className="text-base font-bold text-orange-600 dark:text-orange-400">
              ₦{totalAmount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Select Payment Method
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { id: 'cash', label: 'Cash', icon: Banknote },
              { id: 'card_pos', label: 'Card POS', icon: CreditCard },
              { id: 'bank_transfer', label: 'Transfer', icon: Building2 },
              { id: 'paystack', label: 'Paystack', icon: Globe },
              { id: 'ussd', label: 'USSD', icon: Smartphone },
              { id: 'other', label: 'Other', icon: Coins },
            ].map((m) => {
              const Icon = m.icon;
              const isSelected = paymentMethod === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(m.id as PaymentMethod);
                    setError('');
                  }}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition ${
                    isSelected
                      ? 'border-orange-600 bg-orange-50 text-orange-700 dark:border-orange-500 dark:bg-orange-950/40 dark:text-orange-300 ring-2 ring-orange-500/20 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mb-1" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cash Tendered & Quick Presets */}
        {paymentMethod === 'cash' && (
          <div className="space-y-3 rounded-lg border border-orange-200 bg-orange-50/50 p-3.5 dark:border-orange-900/40 dark:bg-orange-950/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-orange-950 dark:text-orange-200">
                Cash Tendered & Change Calculator
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Auto-calculated change
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Amount Customer Gave (₦) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={tenderedInput}
                  onChange={(e) => setTenderedInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-base font-bold text-slate-900 dark:text-white"
                  autoFocus
                />
              </div>

              <div className="rounded-lg bg-white dark:bg-slate-900 p-2.5 border border-slate-200 dark:border-slate-700 flex flex-col justify-center">
                <span className="text-xs text-slate-500 dark:text-slate-400">Change Due to Customer:</span>
                <span className={`text-lg font-black ${tenderedAmount >= totalAmount ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  ₦{changeDue.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Quick Cash Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block">
                Quick Tender Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickCash(totalAmount)}
                  className="rounded bg-white px-2 py-1 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 shadow-xs"
                >
                  Exact (₦{totalAmount.toLocaleString()})
                </button>
                {[1000, 5000, 10000, 20000, 50000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleQuickCash(preset)}
                    className="rounded bg-white px-2 py-1 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 shadow-xs"
                  >
                    ₦{preset.toLocaleString()}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleAddQuickCash(1000)}
                  className="rounded bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-800 hover:bg-orange-200 dark:bg-orange-950 dark:text-orange-200"
                >
                  +₦1,000
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuickCash(5000)}
                  className="rounded bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-800 hover:bg-orange-200 dark:bg-orange-950 dark:text-orange-200"
                >
                  +₦5,000
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bank Transfer / Card POS Terminal Specifics */}
        {(paymentMethod === 'bank_transfer' || paymentMethod === 'card_pos') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {paymentMethod === 'card_pos' ? 'POS Terminal RRN / Approval Code' : 'Bank Reference / Teller Number'} <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                required
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder={paymentMethod === 'card_pos' ? 'e.g. POS-AUTH-9821' : 'e.g. GTB-TRF-091823'}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {paymentMethod === 'card_pos' ? 'POS Terminal Brand / Provider' : 'Bank Name'}
              </label>
              <Input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder={paymentMethod === 'card_pos' ? 'e.g. Moniepoint, OPay' : 'e.g. Zenith Bank, GTBank'}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* Paystack Online Gateway */}
        {paymentMethod === 'paystack' && (
          <div className="p-3.5 rounded-lg border border-sky-200 bg-sky-50 dark:border-sky-900/50 dark:bg-sky-950/30 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-sky-600" />
                Paystack Online Terminal
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${paystackConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {paystackConfigured ? 'Gateway Ready' : 'Key Missing'}
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-3">
              {paystackConfigured
                ? 'Launch official Paystack popup to accept online debit card, USSD, or direct bank transfer from the customer.'
                : 'VITE_PAYSTACK_PUBLIC_KEY is not defined in environment. For offline counter operations, use Cash, Card POS, or Direct Bank Transfer.'}
            </p>
            {paystackConfigured && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handlePaystackCheckout}
                disabled={isProcessing}
                className="bg-sky-600 hover:bg-sky-700 text-white w-full"
              >
                {isProcessing ? 'Waiting for Paystack...' : `Pay ₦${activeAmountPaid.toLocaleString()} via Paystack Online`}
              </Button>
            )}
          </div>
        )}

        {/* Partial Payment / Counter Credit Option */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="toggle-partial-payment"
                checked={allowPartial}
                onChange={(e) => {
                  setAllowPartial(e.target.checked);
                  if (!e.target.checked) {
                    setAmountPaidInput(totalAmount.toString());
                  }
                }}
                className="h-4 w-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300 dark:border-slate-700"
              />
              <label htmlFor="toggle-partial-payment" className="text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                Partial Payment / Customer Credit (Installment)
              </label>
            </div>
            {!canPartialPay && (
              <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                <ShieldAlert className="h-3 w-3" />
                Manager Permission Required
              </span>
            )}
          </div>

          {allowPartial && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Amount Customer is Paying Now (₦) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  max={totalAmount.toString()}
                  step="any"
                  value={amountPaidInput}
                  onChange={(e) => setAmountPaidInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-sm font-semibold"
                  disabled={!canPartialPay}
                />
              </div>

              <div className="rounded-md bg-white dark:bg-slate-900 p-2 border border-slate-200 dark:border-slate-700 flex flex-col justify-center">
                <span className="text-xs text-slate-500 dark:text-slate-400">Remaining Balance Due (Credit):</span>
                <span className="text-sm font-bold text-red-600 dark:text-red-400">
                  ₦{remainingBalance.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Counter Sale Notes */}
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Sale Remarks / Notes (Optional)
          </label>
          <Input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Packed in 5 pallets, driver loading at Bay 2"
            className="w-full"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Cashier: <strong className="text-slate-700 dark:text-slate-300">{profile?.full_name || 'Cashier Desk'}</strong>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isProcessing}>
              Back to Cart
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isProcessing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isProcessing ? 'Processing Transaction...' : `Confirm & Issue Receipt (₦${activeAmountPaid.toLocaleString()})`}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
