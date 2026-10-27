import React, { useState } from 'react';
import {
  X,
  Truck,
  Package,
  CheckCircle2,
  Clock,
  Printer,
  FileCheck,
  AlertTriangle,
  MapPin,
  Calendar,
  Building,
  User,
  Phone,
  Layers,
  ArrowRight,
  ShieldCheck,
  Ban,
  ClipboardCheck,
} from 'lucide-react';
import {
  FulfilmentRecord,
  FULFILMENT_STATUS_CONFIG,
} from '../../types/warehouse';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import { warehouseService } from '../../services/warehouse.service';
import { useAuth } from '../../hooks/useAuth';

interface FulfilmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  fulfilment: FulfilmentRecord | null;
  onOpenPicking: (fulfilment: FulfilmentRecord) => void;
  onOpenVerify: (fulfilment: FulfilmentRecord) => void;
  onOpenPack: (fulfilment: FulfilmentRecord) => void;
  onOpenDispatch: (fulfilment: FulfilmentRecord) => void;
  onOpenPOD: (fulfilment: FulfilmentRecord) => void;
  onOpenPrintWaybill: (fulfilment: FulfilmentRecord) => void;
  onFulfilmentUpdated: (updated: FulfilmentRecord) => void;
}

export const FulfilmentDetailModal: React.FC<FulfilmentDetailModalProps> = ({
  isOpen,
  onClose,
  fulfilment,
  onOpenPicking,
  onOpenVerify,
  onOpenPack,
  onOpenDispatch,
  onOpenPOD,
  onOpenPrintWaybill,
  onFulfilmentUpdated,
}) => {
  const toast = useToast();
  const { profile } = useAuth();
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);

  if (!isOpen || !fulfilment) return null;

  const statusConfig = FULFILMENT_STATUS_CONFIG[fulfilment.status];
  const pkg = fulfilment.packageDetails;
  const dispatch = fulfilment.dispatchDetails;
  const pod = fulfilment.proofOfDelivery;

  const handleCancelSubmit = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please specify a cancellation reason.');
      return;
    }

    setIsCancelling(true);
    try {
      const updated = await warehouseService.cancelFulfilment(
        fulfilment.id,
        cancelReason.trim(),
        profile?.id || 'usr-system',
        profile?.full_name || 'Staff Member'
      );
      toast.success(
        `Fulfilment #${fulfilment.fulfilmentNumber} cancelled. Reserved stock released.`,
        'Fulfilment Cancelled'
      );
      setShowCancelPrompt(false);
      onFulfilmentUpdated(updated);
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel fulfilment.');
    } finally {
      setIsCancelling(false);
    }
  };

  const steps = [
    { key: 'allocated', label: 'Allocated', icon: Layers },
    { key: 'picking', label: 'Picking', icon: Package },
    { key: 'picked', label: 'Picked', icon: CheckCircle2 },
    { key: 'verified', label: 'Verified', icon: ClipboardCheck },
    { key: 'ready_for_dispatch', label: 'Staged', icon: FileCheck },
    { key: 'dispatched', label: 'Dispatched', icon: Truck },
    { key: 'delivered', label: 'Delivered', icon: ShieldCheck },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white font-mono text-base">
                  {fulfilment.fulfilmentNumber}
                </h3>
                <Badge variant={statusConfig.badgeVariant} size="sm">
                  {statusConfig.label}
                </Badge>
                <Badge variant="outline" size="sm" className="capitalize">
                  {fulfilment.fulfilmentType}
                </Badge>
                {fulfilment.priority !== 'normal' && (
                  <Badge variant="warning" size="sm" className="uppercase font-bold text-[10px]">
                    {fulfilment.priority}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Linked to Order #{fulfilment.orderNumber} • Source: {fulfilment.sourceLocationName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenPrintWaybill(fulfilment)}
              className="flex items-center gap-1.5"
            >
              <Printer className="h-4 w-4" />
              <span>Waybill</span>
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Workflow Progress Steps */}
          {fulfilment.status !== 'cancelled' ? (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-7 gap-1 text-center">
                {steps.map((st, i) => {
                  const isCurrent = fulfilment.status === st.key;
                  const isPassed =
                    (statusConfig.stepIndex > 1 &&
                      i + 1 < (fulfilment.status === 'dispatched' || fulfilment.status === 'in_transit' ? 6 : statusConfig.stepIndex)) ||
                    fulfilment.status === 'delivered';

                  return (
                    <div key={st.key} className="flex flex-col items-center">
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-[11px] mb-1 transition ${
                          isCurrent
                            ? 'bg-orange-600 text-white shadow-md'
                            : isPassed
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                        }`}
                      >
                        {isPassed ? '✓' : i + 1}
                      </div>
                      <span
                        className={`text-[10px] font-semibold tracking-tight ${
                          isCurrent
                            ? 'text-orange-600 dark:text-orange-400'
                            : isPassed
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-slate-400'
                        }`}
                      >
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg text-rose-800 dark:text-rose-200 flex items-center gap-2">
              <Ban className="h-4 w-4 shrink-0 text-rose-600" />
              <span>This fulfilment has been voided. Allocated reservations have been released.</span>
            </div>
          )}

          {/* Quick Action Navigation Bar */}
          {fulfilment.status !== 'cancelled' && (
            <div className="flex items-center gap-2 flex-wrap p-3 bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 rounded-xl">
              <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] mr-2">
                Operational Workflows:
              </span>

              {fulfilment.status === 'allocated' || fulfilment.status === 'picking' ? (
                <Button
                  size="sm"
                  onClick={() => onOpenPicking(fulfilment)}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
                >
                  <Package className="h-3.5 w-3.5 mr-1" />
                  {fulfilment.status === 'picking' ? 'Continue Picking' : 'Open Picking Sheet'}
                </Button>
              ) : null}

              {fulfilment.status === 'picked' ? (
                <Button
                  size="sm"
                  onClick={() => onOpenVerify(fulfilment)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  <ClipboardCheck className="h-3.5 w-3.5 mr-1" />
                  Supervisor Quantity Verification
                </Button>
              ) : null}

              {fulfilment.status === 'verified' ? (
                <Button
                  size="sm"
                  onClick={() => onOpenPack(fulfilment)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  <FileCheck className="h-3.5 w-3.5 mr-1" />
                  Package & Palletize Staging
                </Button>
              ) : null}

              {fulfilment.status === 'ready_for_dispatch' ? (
                <Button
                  size="sm"
                  onClick={() => onOpenDispatch(fulfilment)}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
                >
                  <Truck className="h-3.5 w-3.5 mr-1" />
                  Authorize Yard Dispatch & Gate Pass
                </Button>
              ) : null}

              {fulfilment.status === 'dispatched' || fulfilment.status === 'in_transit' ? (
                <Button
                  size="sm"
                  onClick={() => onOpenPOD(fulfilment)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Confirm Site Delivery & Sign POD
                </Button>
              ) : null}

              {fulfilment.status !== 'delivered' && (
                <button
                  type="button"
                  onClick={() => setShowCancelPrompt(true)}
                  className="ml-auto text-xs text-rose-600 hover:text-rose-700 hover:underline font-semibold"
                >
                  Void Fulfilment
                </button>
              )}
            </div>
          )}

          {/* Cancellation Prompt */}
          {showCancelPrompt && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl space-y-2">
              <span className="font-bold text-rose-900 dark:text-rose-200 block">
                Confirm Voiding Fulfilment #{fulfilment.fulfilmentNumber}
              </span>
              <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                This will release all allocated items back to available inventory. Specify cancellation reason:
              </p>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Customer requested date postponement or truck unavailable"
                className="w-full rounded border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-900 p-2 text-xs"
              />
              <div className="flex justify-end gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => setShowCancelPrompt(false)}>
                  Back
                </Button>
                <Button
                  size="sm"
                  onClick={handleCancelSubmit}
                  isLoading={isCancelling}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  Confirm Void
                </Button>
              </div>
            </div>
          )}

          {/* Meta Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px] uppercase tracking-wide">
                Consignee & Site Information
              </span>
              <div className="space-y-1">
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  {fulfilment.customerName}
                </p>
                <p className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {fulfilment.customerPhone}
                </p>
                <p className="text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    {fulfilment.fulfilmentType === 'pickup'
                      ? `[Customer Pickup Depot: ${fulfilment.sourceLocationName}]`
                      : fulfilment.destinationAddress || 'Site Address on File'}
                  </span>
                </p>
                {fulfilment.deliveryNotes && (
                  <p className="text-slate-500 italic mt-1 text-[11px]">
                    Note: {fulfilment.deliveryNotes}
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px] uppercase tracking-wide">
                Warehouse Assignment
              </span>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Origin Depot:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {fulfilment.sourceLocationName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Yard Officer:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {fulfilment.assignedStaffName || 'Babajide Sanwo'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Waybill Reference:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {pkg?.waybillNumber || 'PENDING DISPATCH'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Created:</span>
                  <span>{new Date(fulfilment.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Items Breakdown Table */}
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-200 block mb-2 text-xs uppercase tracking-wide">
              Allocated Order Items
            </span>
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <th className="p-2.5">Yard Bay</th>
                    <th className="p-2.5">Product & SKU</th>
                    <th className="p-2.5 text-center">Unit</th>
                    <th className="p-2.5 text-center">Required</th>
                    <th className="p-2.5 text-center">Allocated</th>
                    <th className="p-2.5 text-center">Picked</th>
                    <th className="p-2.5 text-center">Verified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {fulfilment.items.map((it) => (
                    <tr key={it.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {it.bayCode || '—'}
                      </td>
                      <td className="p-2.5">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {it.productName}
                        </div>
                        {it.variantName && (
                          <div className="text-[11px] text-slate-500">{it.variantName}</div>
                        )}
                        <div className="font-mono text-[10px] text-slate-400">SKU: {it.sku}</div>
                      </td>
                      <td className="p-2.5 text-center capitalize">{it.unit}</td>
                      <td className="p-2.5 text-center text-slate-600 dark:text-slate-400">
                        {it.requiredQuantity.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-center font-bold text-slate-800 dark:text-slate-200">
                        {it.allocatedQuantity.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-orange-600 dark:text-orange-400">
                        {it.pickedQuantity.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {it.verifiedQuantity.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Staging / Packaging & Dispatch Snapshots */}
          {(pkg || dispatch || pod) && (
            <div className="grid grid-cols-2 gap-4">
              {pkg && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px] uppercase tracking-wide">
                    Packaging & Staging Record
                  </span>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Container Type:</span>
                    <span className="capitalize font-semibold text-slate-800 dark:text-slate-200">
                      {pkg.packageType}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Package Count:</span>
                    <span className="font-bold text-orange-600">{pkg.packageCount} units</span>
                  </div>
                  {pkg.grossWeightKg && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Gross Weight:</span>
                      <span>{pkg.grossWeightKg.toLocaleString()} kg</span>
                    </div>
                  )}
                  {pkg.loadingBay && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Loading Bay:</span>
                      <span className="font-mono">{pkg.loadingBay}</span>
                    </div>
                  )}
                </div>
              )}

              {dispatch && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px] uppercase tracking-wide">
                    Dispatch & Haulage Record
                  </span>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Dispatched At:</span>
                    <span>{new Date(dispatch.dispatchedAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Driver / Vehicle:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {dispatch.driverName || dispatch.collectorName} ({dispatch.vehicleNumber || dispatch.collectorVehicle || 'Vehicle on file'})
                    </span>
                  </div>
                  {dispatch.transporterName && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Carrier:</span>
                      <span>{dispatch.transporterName}</span>
                    </div>
                  )}
                </div>
              )}

              {pod && (
                <div className="col-span-2 p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900/40 space-y-1.5">
                  <span className="font-bold text-emerald-900 dark:text-emerald-200 block text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Verified Proof of Delivery (POD)
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Received By:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {pod.recipientName} ({pod.recipientPhone})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Delivered Timestamp:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {new Date(pod.deliveredAt).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Arrival Condition:</span>
                      <span className="font-bold uppercase text-emerald-700 dark:text-emerald-300">
                        {pod.conditionOnArrival}
                      </span>
                    </div>
                  </div>
                  {pod.signOffNotes && (
                    <p className="text-slate-600 dark:text-slate-400 italic text-[11px] pt-1">
                      Receiver Comments: {pod.signOffNotes}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Audit Trail History */}
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-200 block mb-2 text-xs uppercase tracking-wide">
              Status Progression History
            </span>
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50 dark:bg-slate-800/20">
              {fulfilment.statusHistory.map((h) => (
                <div key={h.id} className="p-3 flex items-start justify-between text-[11px]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold uppercase text-slate-800 dark:text-slate-200">
                        {h.newStatus}
                      </span>
                      <span className="text-slate-400">• By {h.changedByName || 'Staff Member'}</span>
                    </div>
                    {h.note && <p className="text-slate-600 dark:text-slate-400 mt-0.5">{h.note}</p>}
                  </div>
                  <span className="text-slate-400 font-mono text-[10px]">
                    {new Date(h.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
