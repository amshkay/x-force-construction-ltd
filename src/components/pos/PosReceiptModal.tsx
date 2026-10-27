import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Printer, Copy, Check, FileText, Share2, ArrowRight } from 'lucide-react';
import { posService } from '../../services/pos.service';
import { PosReceiptData } from '../../types/pos';

interface PosReceiptModalProps {
  isOpen: boolean;
  saleId: string | null;
  onClose: () => void;
  onNewSale?: () => void;
}

export const PosReceiptModal: React.FC<PosReceiptModalProps> = ({
  isOpen,
  saleId,
  onClose,
  onNewSale,
}) => {
  const [receipt, setReceipt] = useState<PosReceiptData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [viewFormat, setViewFormat] = useState<'thermal' | 'standard'>('thermal');

  useEffect(() => {
    if (isOpen && saleId) {
      setLoading(true);
      posService
        .generateReceiptData(saleId)
        .then((data) => {
          setReceipt(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error('[PosReceiptModal] Failed to load receipt:', err);
          setLoading(false);
        });
    }
  }, [isOpen, saleId]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    if (!receipt) return;
    const text = `
*${receipt.company.brand}*
${receipt.company.name}
${receipt.company.address}
Phone: ${receipt.company.phone} | TIN: ${receipt.company.tin || 'N/A'}
------------------------------------
RECEIPT REF: ${receipt.saleReference}
Date: ${new Date(receipt.date).toLocaleString()}
Cashier: ${receipt.cashierName}
Location: ${receipt.locationName}
Customer: ${receipt.customer.name} ${receipt.customer.phone ? `(${receipt.customer.phone})` : ''}
------------------------------------
ITEMS:
${receipt.items.map((i) => `${i.quantity}x ${i.productName}${i.variantName ? ` (${i.variantName})` : ''} @ ₦${i.unitPrice.toLocaleString()} = ₦${i.lineTotal.toLocaleString()}`).join('\n')}
------------------------------------
Subtotal: ₦${receipt.subtotal.toLocaleString()}
${receipt.totalDiscountAmount > 0 ? `Total Discount: -₦${receipt.totalDiscountAmount.toLocaleString()}\n` : ''}${receipt.additionalChargesFee > 0 ? `Additional Charges: +₦${receipt.additionalChargesFee.toLocaleString()}\n` : ''}GRAND TOTAL: ₦${receipt.totalAmount.toLocaleString()}
Payment Method: ${receipt.paymentMethod.replace(/_/g, ' ').toUpperCase()}
Amount Paid: ₦${receipt.amountPaid.toLocaleString()}
${receipt.changeGiven != null && receipt.changeGiven > 0 ? `Change Given: ₦${receipt.changeGiven.toLocaleString()}\n` : ''}${receipt.balanceDue > 0 ? `Outstanding Balance: ₦${receipt.balanceDue.toLocaleString()}\n` : ''}Status: ${receipt.paymentStatus.toUpperCase()}
------------------------------------
${receipt.company.footerText || 'Thank you for your business!'}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sale Receipt & Payment Acknowledgement"
      size="lg"
    >
      <div className="space-y-4">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800 print:hidden">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setViewFormat('thermal')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                viewFormat === 'thermal'
                  ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              80mm Thermal Slip
            </button>
            <button
              type="button"
              onClick={() => setViewFormat('standard')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                viewFormat === 'standard'
                  ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Standard A4 Receipt
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopySummary}
              className="text-xs flex items-center gap-1.5"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Digital Receipt'}</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handlePrint}
              className="bg-orange-600 hover:bg-orange-700 text-white text-xs flex items-center gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Receipt</span>
            </Button>
          </div>
        </div>

        {/* Receipt Container */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Generating receipt document...</div>
        ) : !receipt ? (
          <div className="py-8 text-center text-xs text-red-500">Could not retrieve receipt data.</div>
        ) : (
          <div className="flex justify-center bg-slate-100 dark:bg-slate-950/60 p-4 rounded-xl overflow-y-auto max-h-[60vh] print:p-0 print:bg-white print:max-h-none">
            {/* Printable Receipt Paper */}
            <div
              id="printable-pos-receipt"
              className={`bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 shadow-sm border border-slate-200 dark:border-slate-800 font-mono text-xs ${
                viewFormat === 'thermal' ? 'w-full max-w-[340px]' : 'w-full max-w-[620px]'
              }`}
            >
              {/* Header */}
              <div className="text-center pb-4 border-b border-dashed border-slate-300 dark:border-slate-700">
                {receipt.company.logoUrl && (
                  <img
                    src={receipt.company.logoUrl}
                    alt={receipt.company.brand}
                    className="mx-auto h-10 w-auto mb-2 object-contain"
                  />
                )}
                <h2 className="font-bold text-sm tracking-wide uppercase">{receipt.company.brand}</h2>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">{receipt.company.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{receipt.company.address}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Tel: {receipt.company.phone}</p>
                {receipt.company.tin && (
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">TIN: {receipt.company.tin}</p>
                )}
              </div>

              {/* Reference & Metadata */}
              <div className="py-3 border-b border-dashed border-slate-300 dark:border-slate-700 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt Ref:</span>
                  <span className="font-bold text-orange-600 dark:text-orange-400">{receipt.saleReference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date/Time:</span>
                  <span>{new Date(receipt.date).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Location:</span>
                  <span>{receipt.locationName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cashier:</span>
                  <span>{receipt.cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-medium">{receipt.customer.name}</span>
                </div>
                {receipt.customer.phone && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone:</span>
                    <span>{receipt.customer.phone}</span>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="py-3 border-b border-dashed border-slate-300 dark:border-slate-700">
                <div className="flex justify-between font-bold text-[10px] uppercase text-slate-500 pb-1.5 border-b border-slate-200 dark:border-slate-800">
                  <span>Item / Description</span>
                  <span className="text-right">Total (₦)</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-[11px]">
                  {receipt.items.map((item, idx) => (
                    <div key={idx} className="py-1.5">
                      <div className="flex justify-between items-start">
                        <div className="font-medium pr-2">
                          {item.productName}
                          {item.variantName && (
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">
                              Variant: {item.variantName}
                            </span>
                          )}
                        </div>
                        <div className="font-semibold text-right whitespace-nowrap">
                          ₦{item.lineTotal.toLocaleString()}
                        </div>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                        <span>
                          {item.quantity} {item.unit} × ₦{item.unitPrice.toLocaleString()}
                        </span>
                        {item.discountAmount > 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            -₦{item.discountAmount.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Totals */}
              <div className="py-3 border-b border-dashed border-slate-300 dark:border-slate-700 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal:</span>
                  <span>₦{receipt.subtotal.toLocaleString()}</span>
                </div>

                {receipt.totalDiscountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Total Discount:</span>
                    <span>-₦{receipt.totalDiscountAmount.toLocaleString()}</span>
                  </div>
                )}

                {receipt.additionalChargesFee > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Additional Fee:</span>
                    <span>+₦{receipt.additionalChargesFee.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-bold pt-1 border-t border-slate-200 dark:border-slate-800">
                  <span>GRAND TOTAL:</span>
                  <span className="text-orange-600 dark:text-orange-400">₦{receipt.totalAmount.toLocaleString()}</span>
                </div>

                <div className="flex justify-between pt-1">
                  <span className="text-slate-500">Payment Method:</span>
                  <span className="font-semibold">{receipt.paymentMethod.replace(/_/g, ' ').toUpperCase()}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Amount Paid:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    ₦{receipt.amountPaid.toLocaleString()}
                  </span>
                </div>

                {receipt.changeGiven != null && receipt.changeGiven > 0 && (
                  <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                    <span>Change Given:</span>
                    <span>₦{receipt.changeGiven.toLocaleString()}</span>
                  </div>
                )}

                {receipt.balanceDue > 0 && (
                  <div className="flex justify-between font-bold text-red-600 dark:text-red-400">
                    <span>Balance Due (Credit):</span>
                    <span>₦{receipt.balanceDue.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Payment Status:</span>
                  <span className="uppercase font-semibold text-slate-700 dark:text-slate-300">
                    {receipt.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 text-center text-[10px] text-slate-500 dark:text-slate-400 space-y-1">
                <p className="font-medium">{receipt.company.footerText}</p>
                <p>Goods sold in good condition are not returnable without authorization.</p>
                <p className="font-mono text-[9px] text-slate-400">Thank you for choosing XFORCE!</p>
              </div>
            </div>
          </div>
        )}

        {/* Modal Bottom Action Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 print:hidden">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close Receipt
          </Button>
          {onNewSale && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                onNewSale();
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-1.5"
            >
              <span>Start Next Sale</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
