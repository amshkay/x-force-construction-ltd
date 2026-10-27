import React from 'react';
import { X, Printer, Truck, CheckCircle2, ShieldCheck, MapPin, Phone, Building2 } from 'lucide-react';
import { FulfilmentRecord } from '../../types/warehouse';
import { Button } from '../ui/Button';

interface WaybillPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  fulfilment: FulfilmentRecord | null;
}

export const WaybillPrintModal: React.FC<WaybillPrintModalProps> = ({
  isOpen,
  onClose,
  fulfilment,
}) => {
  if (!isOpen || !fulfilment) return null;

  const handlePrint = () => {
    window.print();
  };

  const dispatch = fulfilment.dispatchDetails;
  const pkg = fulfilment.packageDetails;
  const pod = fulfilment.proofOfDelivery;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:rounded-none">
        {/* Modal Toolbar (hidden on print) */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-800/60 print:hidden">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-orange-600" />
            <h3 className="font-bold text-slate-900 dark:text-white">
              Official Waybill & Delivery Note Preview
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex items-center gap-1.5"
            >
              <Printer className="h-4 w-4" />
              <span>Print Waybill</span>
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div className="overflow-y-auto p-8 print:p-0 bg-white text-slate-900">
          <div className="border border-slate-300 p-8 rounded-lg shadow-sm print:border-none print:p-0 print:shadow-none font-sans">
            {/* Corporate Header */}
            <div className="flex justify-between items-start border-b-2 border-orange-600 pb-6 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="bg-orange-600 text-white font-extrabold px-2.5 py-1 rounded text-lg tracking-wider">
                    XFORCE
                  </div>
                  <span className="text-sm font-semibold tracking-wide text-slate-700">
                    CONSTRUCTION LTD
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 max-w-sm">
                  Hydraulic Interlocking Bricks • Precision Pavers • Turnkey Civil Masonry
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Factory Yard: Plot 12, Industrial Layout, Emene, Enugu State, Nigeria
                </p>
                <p className="text-[11px] text-slate-500">
                  Tel: +234 803 111 2233 / +234 802 334 5566 • Email: dispatch@xforce.internal
                </p>
              </div>

              <div className="text-right">
                <span className="inline-block bg-slate-100 border border-slate-300 text-slate-800 font-bold px-3 py-1 rounded text-xs uppercase tracking-wider mb-2">
                  Official Goods Dispatch Note
                </span>
                <div className="text-xs text-slate-600 space-y-0.5">
                  <div>
                    <span className="font-semibold">Waybill #:</span>{' '}
                    <span className="font-mono font-bold text-slate-900">
                      {pkg?.waybillNumber || `WAY-${fulfilment.fulfilmentNumber}`}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold">Fulfilment Ref:</span>{' '}
                    <span className="font-mono">{fulfilment.fulfilmentNumber}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Order Ref:</span>{' '}
                    <span className="font-mono">#{fulfilment.orderNumber}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Date:</span>{' '}
                    {dispatch?.dispatchedAt
                      ? new Date(dispatch.dispatchedAt).toLocaleDateString()
                      : new Date(fulfilment.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Consignee & Transport Grid */}
            <div className="grid grid-cols-2 gap-6 mb-6 text-xs bg-slate-50 border border-slate-200 rounded p-4">
              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-orange-600" />
                  Consignee / Destination
                </h4>
                <div className="space-y-1">
                  <p className="font-bold text-slate-900 text-sm">{fulfilment.customerName}</p>
                  <p className="text-slate-600 flex items-center gap-1">
                    <Phone className="h-3 w-3 text-slate-400" />
                    {fulfilment.customerPhone}
                  </p>
                  <p className="text-slate-700 flex items-start gap-1">
                    <MapPin className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      {fulfilment.fulfilmentType === 'pickup'
                        ? `[CUSTOMER COUNTER PICKUP] Collection from ${fulfilment.sourceLocationName}`
                        : fulfilment.destinationAddress || 'Site Address on File'}
                    </span>
                  </p>
                  {fulfilment.deliveryNotes && (
                    <p className="text-slate-500 italic mt-1 text-[11px]">
                      Special Site Instructions: {fulfilment.deliveryNotes}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-orange-600" />
                  Transport & Haulage Manifest
                </h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fulfilment Type:</span>
                    <span className="font-semibold uppercase text-slate-800">
                      {fulfilment.fulfilmentType === 'pickup' ? 'Customer Self-Pickup' : 'Direct Site Delivery'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Origin Depot:</span>
                    <span className="font-semibold text-slate-800">{fulfilment.sourceLocationName}</span>
                  </div>
                  {fulfilment.fulfilmentType === 'delivery' ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Driver Name:</span>
                        <span className="font-semibold text-slate-800">{dispatch?.driverName || 'Designated Driver'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Driver Phone:</span>
                        <span className="font-semibold text-slate-800">{dispatch?.driverPhone || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Vehicle / Truck No:</span>
                        <span className="font-mono font-bold text-slate-900">{dispatch?.vehicleNumber || 'XF-TRUCK-01'}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Collector Name:</span>
                        <span className="font-semibold text-slate-800">{dispatch?.collectorName || 'Customer Agent'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Collector Phone:</span>
                        <span className="font-semibold text-slate-800">{dispatch?.collectorPhone || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Collector Vehicle:</span>
                        <span className="font-mono font-bold text-slate-900">{dispatch?.collectorVehicle || 'Pickup Tipper'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Packaging Details Ribbon */}
            {pkg && (
              <div className="mb-6 bg-orange-50/60 border border-orange-200 rounded p-3 text-xs flex justify-between items-center flex-wrap gap-2">
                <div>
                  <span className="font-semibold text-slate-700">Packaging Type:</span>{' '}
                  <span className="capitalize font-bold text-orange-900">{pkg.packageType}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Package / Pallet Count:</span>{' '}
                  <span className="font-bold text-orange-900">{pkg.packageCount} Units</span>
                </div>
                {pkg.grossWeightKg && (
                  <div>
                    <span className="font-semibold text-slate-700">Est. Weight:</span>{' '}
                    <span className="font-bold text-orange-900">{pkg.grossWeightKg.toLocaleString()} kg</span>
                  </div>
                )}
                {pkg.loadingBay && (
                  <div>
                    <span className="font-semibold text-slate-700">Loading Bay:</span>{' '}
                    <span className="font-mono font-bold text-slate-900">{pkg.loadingBay}</span>
                  </div>
                )}
              </div>
            )}

            {/* Materials Table */}
            <div className="mb-6">
              <table className="w-full text-xs border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-left">
                    <th className="p-2.5 w-12 text-center">#</th>
                    <th className="p-2.5">SKU / Code</th>
                    <th className="p-2.5">Item Description & Specifications</th>
                    <th className="p-2.5 text-center">Yard Bay</th>
                    <th className="p-2.5 text-center">Unit</th>
                    <th className="p-2.5 text-right">Qty Ordered</th>
                    <th className="p-2.5 text-right font-bold text-slate-900">Qty Dispatched</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {fulfilment.items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="p-2.5 text-center text-slate-400 font-mono">{index + 1}</td>
                      <td className="p-2.5 font-mono text-[11px] text-slate-600">{item.sku}</td>
                      <td className="p-2.5">
                        <div className="font-bold text-slate-800">{item.productName}</div>
                        {item.variantName && (
                          <div className="text-[11px] text-slate-500">Variant: {item.variantName}</div>
                        )}
                        {item.discrepancyNote && (
                          <div className="text-[10px] text-amber-600 italic">
                            Note: {item.discrepancyNote}
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-600">{item.bayCode || '—'}</td>
                      <td className="p-2.5 text-center capitalize">{item.unit}</td>
                      <td className="p-2.5 text-right text-slate-600">{item.requiredQuantity.toLocaleString()}</td>
                      <td className="p-2.5 text-right font-bold text-slate-900 text-sm">
                        {item.allocatedQuantity.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t border-slate-300 text-slate-800">
                    <td colSpan={5} className="p-2.5 text-right uppercase text-[11px]">
                      Total Materials Dispatched:
                    </td>
                    <td className="p-2.5 text-right">
                      {fulfilment.items.reduce((s, it) => s + it.requiredQuantity, 0).toLocaleString()}
                    </td>
                    <td className="p-2.5 text-right text-orange-600 text-sm">
                      {fulfilment.items.reduce((s, it) => s + it.allocatedQuantity, 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Loading Checklist Verification */}
            {pkg?.loadingChecklist && (
              <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded text-[11px]">
                <span className="font-bold text-slate-700 block mb-1">
                  Yard Pre-Departure Safety Checklist:
                </span>
                <div className="grid grid-cols-4 gap-2 text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className={`h-3.5 w-3.5 ${pkg.loadingChecklist.palletsBanded ? 'text-green-600' : 'text-slate-300'}`} />
                    <span>Pallets Banded</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className={`h-3.5 w-3.5 ${pkg.loadingChecklist.tarpaulinCovered ? 'text-green-600' : 'text-slate-300'}`} />
                    <span>Weather Tarpaulin Fitted</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className={`h-3.5 w-3.5 ${pkg.loadingChecklist.fragileCushioned ? 'text-green-600' : 'text-slate-300'}`} />
                    <span>Fragile Blocks Cushioned</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className={`h-3.5 w-3.5 ${pkg.loadingChecklist.strapsChecked ? 'text-green-600' : 'text-slate-300'}`} />
                    <span>Tie-Down Straps Inspected</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tripartite Sign-off Blocks */}
            <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-300 text-xs">
              <div className="border border-slate-200 rounded p-3 flex flex-col justify-between h-36">
                <div>
                  <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wide">
                    1. Yard Loading Supervisor
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Materials inspected, counted, and loaded into truck.
                  </p>
                </div>
                <div className="border-t border-dashed border-slate-300 pt-2 text-[10px] text-slate-600">
                  <div className="font-semibold">{fulfilment.assignedStaffName || 'Babajide Sanwo'}</div>
                  <div>Signature & Date: ___________________</div>
                </div>
              </div>

              <div className="border border-slate-200 rounded p-3 flex flex-col justify-between h-36">
                <div>
                  <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wide">
                    2. Driver / Transporter
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Received above materials in sound, uncracked condition.
                  </p>
                </div>
                <div className="border-t border-dashed border-slate-300 pt-2 text-[10px] text-slate-600">
                  <div className="font-semibold">{dispatch?.driverName || dispatch?.collectorName || 'Driver / Collector'}</div>
                  <div>Signature & Date: ___________________</div>
                </div>
              </div>

              <div className="border border-slate-200 rounded p-3 flex flex-col justify-between h-36">
                <div>
                  <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wide">
                    3. Customer Site Receiver (POD)
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Goods received, verified, and offloaded on site.
                  </p>
                </div>
                <div className="border-t border-dashed border-slate-300 pt-2 text-[10px] text-slate-600">
                  <div className="font-semibold">
                    {pod?.recipientName || 'Site Engineer / Client Rep'}
                  </div>
                  <div>Signature / Stamp: _________________</div>
                </div>
              </div>
            </div>

            {/* Gate Pass & Legal Notice */}
            <div className="mt-6 pt-4 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-700">FACTORY GATE CONTROL PASS:</span> Verified clear for departure.
              </div>
              <div className="text-right">
                All claims regarding transit breakage must be reported within 24 hours of offload.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
