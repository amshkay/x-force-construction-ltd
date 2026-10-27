import React from 'react';
import { X, Printer } from 'lucide-react';
import { StockCountSession } from '../../types/stockCount';
import { defaultBusinessConfig } from '../../config/business.config';
import { formatDate } from '../../utils/formatters';

interface PrintCountSheetModalProps {
  isOpen: boolean;
  session: StockCountSession;
  onClose: () => void;
}

export const PrintCountSheetModal: React.FC<PrintCountSheetModalProps> = ({
  isOpen,
  session,
  onClose,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white">
      <div className="bg-white dark:bg-slate-900 print:dark:bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 print:border-none print:shadow-none overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:overflow-visible">
        {/* Modal Controls (Hidden in print) */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between print:hidden bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 px-2 py-0.5 rounded">
              {session.countNumber}
            </span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Printable Physical Stock Count Sheet
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Sheet
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Count Sheet Content */}
        <div className="flex-1 overflow-y-auto p-8 print:p-0 text-slate-900 print:text-black bg-white">
          {/* Company & Document Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold tracking-tight uppercase">
                  {defaultBusinessConfig.companyName}
                </h1>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                  {defaultBusinessConfig.publicBrandName} · Operational Yard Warehouse Document
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Official Physical Stocktaking Worksheet
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-bold border-2 border-slate-900 px-3 py-1 uppercase tracking-wider block">
                  {session.countNumber}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Date: {session.countDate}
                </span>
              </div>
            </div>

            {/* Session Metadata Grid */}
            <div className="grid grid-cols-4 gap-4 mt-4 pt-3 border-t border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Stock Location</span>
                <span className="font-bold text-slate-900">
                  {session.locationName} ({session.locationCode})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Scope</span>
                <span className="font-semibold text-slate-900 uppercase">
                  {session.scope.replace('_', ' ')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Counting Mode</span>
                <span className="font-semibold text-slate-900">
                  {session.isBlindCount ? 'Blind Count (Unbiased)' : 'Standard Verification'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Initiated By</span>
                <span className="font-semibold text-slate-900">
                  {session.initiatedByName}
                </span>
              </div>
            </div>
          </div>

          {/* Worksheet Items Table */}
          <table className="w-full text-left text-xs border border-slate-300">
            <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
              <tr>
                <th className="p-2 border-r border-slate-300 w-10 text-center">#</th>
                <th className="p-2 border-r border-slate-300">Product Specification</th>
                <th className="p-2 border-r border-slate-300">Variant / Color</th>
                <th className="p-2 border-r border-slate-300">SKU</th>
                <th className="p-2 border-r border-slate-300 text-center w-16">Unit</th>
                {!session.isBlindCount && (
                  <th className="p-2 border-r border-slate-300 text-right w-24">System Qty</th>
                )}
                <th className="p-2 border-r border-slate-300 text-center w-28 bg-amber-50/50">
                  Physical Count
                </th>
                <th className="p-2">Condition / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {session.items.map((item, index) => (
                <tr key={item.id} className="h-10">
                  <td className="p-2 border-r border-slate-300 text-center font-mono text-[11px] text-slate-500">
                    {index + 1}
                  </td>
                  <td className="p-2 border-r border-slate-300 font-semibold text-slate-900">
                    {item.productName}
                  </td>
                  <td className="p-2 border-r border-slate-300 text-slate-700">
                    {item.variantName || '-'}
                  </td>
                  <td className="p-2 border-r border-slate-300 font-mono text-[11px] text-slate-600">
                    {item.sku}
                  </td>
                  <td className="p-2 border-r border-slate-300 text-center text-slate-700">
                    {item.unit}
                  </td>
                  {!session.isBlindCount && (
                    <td className="p-2 border-r border-slate-300 text-right font-medium text-slate-700">
                      {item.systemQuantitySnapshot.toLocaleString()}
                    </td>
                  )}
                  <td className="p-2 border-r border-slate-300 text-center font-bold text-slate-900 bg-amber-50/30">
                    {/* Blank line for writing or printed count if already completed */}
                    {item.countedQuantity !== null ? item.countedQuantity : ''}
                  </td>
                  <td className="p-2 text-slate-500 text-[11px]">
                    {item.notes || ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Instructions and Signatures Block */}
          <div className="mt-8 pt-4 border-t-2 border-slate-900 space-y-6">
            <div className="text-[11px] text-slate-600 leading-relaxed">
              <strong className="text-slate-900">Physical Stock Count Instructions:</strong> Counters must physically tally all palletized bricks, stacked pavers, and bagged materials within the specified stock location zone. Enter exact counts without estimation. Report damaged or cracked units in the line notes. Do not overwrite entries; use recount verification protocol for corrections.
            </div>

            <div className="grid grid-cols-2 gap-12 pt-6 text-xs">
              <div>
                <div className="border-b border-slate-400 pb-1 mb-1 font-semibold text-slate-900">
                  Counter Sign-Off
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Name: _______________________</span>
                  <span>Signature: _______________</span>
                  <span>Date: _________</span>
                </div>
              </div>

              <div>
                <div className="border-b border-slate-400 pb-1 mb-1 font-semibold text-slate-900">
                  Yard Supervisor / Reviewer Sign-Off
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Name: _______________________</span>
                  <span>Signature: _______________</span>
                  <span>Date: _________</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
