import React, { useState } from 'react';
import {
  X,
  Package,
  Truck,
  CheckCircle2,
  Calendar,
  User,
  Phone,
  FileText,
  ShieldCheck,
  Building,
  Store,
} from 'lucide-react';
import {
  FulfilmentRecord,
  PackageDetails,
  DispatchDetails,
} from '../../types/warehouse';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { warehouseService } from '../../services/warehouse.service';
import { useAuth } from '../../hooks/useAuth';

interface PackingDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  fulfilment: FulfilmentRecord | null;
  mode: 'pack' | 'dispatch';
  onFulfilmentUpdated: (updated: FulfilmentRecord) => void;
}

export const PackingDispatchModal: React.FC<PackingDispatchModalProps> = ({
  isOpen,
  onClose,
  fulfilment,
  mode,
  onFulfilmentUpdated,
}) => {
  const toast = useToast();
  const { profile } = useAuth();

  // Packing state
  const [packageType, setPackageType] = useState<PackageDetails['packageType']>('pallets');
  const [packageCount, setPackageCount] = useState<number>(4);
  const [grossWeightKg, setGrossWeightKg] = useState<number>(3200);
  const [loadingBay, setLoadingBay] = useState('BAY-STAGING-01');
  const [palletsBanded, setPalletsBanded] = useState(true);
  const [tarpaulinCovered, setTarpaulinCovered] = useState(true);
  const [fragileCushioned, setFragileCushioned] = useState(true);
  const [strapsChecked, setStrapsChecked] = useState(true);
  const [packingNotes, setPackingNotes] = useState('');

  // Dispatch state
  const [driverName, setDriverName] = useState('Ibrahim Danjuma');
  const [driverPhone, setDriverPhone] = useState('+234 803 999 4433');
  const [vehicleNumber, setVehicleNumber] = useState('KJA-482-XA (15-Ton Crane Truck)');
  const [transporterName, setTransporterName] = useState('XFORCE Fleet Logistics');
  const [collectorName, setCollectorName] = useState(fulfilment?.customerName || '');
  const [collectorPhone, setCollectorPhone] = useState(fulfilment?.customerPhone || '');
  const [collectorVehicle, setCollectorVehicle] = useState('EN-881-ENU (Tipper)');
  const [collectorIdNumber, setCollectorIdNumber] = useState('NIN-8492048192');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (fulfilment) {
      if (fulfilment.packageDetails) {
        setPackageType(fulfilment.packageDetails.packageType);
        setPackageCount(fulfilment.packageDetails.packageCount);
        setGrossWeightKg(fulfilment.packageDetails.grossWeightKg || 3200);
        setLoadingBay(fulfilment.packageDetails.loadingBay || 'BAY-STAGING-01');
        setPalletsBanded(fulfilment.packageDetails.loadingChecklist.palletsBanded);
        setTarpaulinCovered(fulfilment.packageDetails.loadingChecklist.tarpaulinCovered);
        setFragileCushioned(fulfilment.packageDetails.loadingChecklist.fragileCushioned);
        setStrapsChecked(fulfilment.packageDetails.loadingChecklist.strapsChecked);
      }
      setCollectorName(fulfilment.customerName);
      setCollectorPhone(fulfilment.customerPhone);
    }
  }, [fulfilment]);

  if (!isOpen || !fulfilment) return null;

  const handlePackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (packageCount <= 0) {
      toast.error('Package count must be at least 1.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: PackageDetails = {
        packageType,
        packageCount,
        grossWeightKg,
        loadingBay,
        loadingChecklist: {
          palletsBanded,
          tarpaulinCovered,
          fragileCushioned,
          strapsChecked,
        },
        packingNotes: packingNotes.trim() || undefined,
      };

      const updated = await warehouseService.packFulfilment(
        fulfilment.id,
        payload,
        profile?.id || 'usr-warehouse',
        profile?.full_name || 'Yard Supervisor'
      );

      toast.success(
        `Fulfilment #${fulfilment.fulfilmentNumber} packed and staged at ${loadingBay}.`,
        'Packed & Ready'
      );
      onFulfilmentUpdated(updated);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record packaging.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const dispatchPayload: DispatchDetails = {
        dispatchedAt: new Date().toISOString(),
        dispatchedBy: profile?.id || 'usr-dispatcher',
        dispatchedByName: profile?.full_name || 'Warehouse Dispatcher',
        deliveryStatus: fulfilment.fulfilmentType === 'pickup' ? 'delivered' : 'in_transit',
        driverName: fulfilment.fulfilmentType === 'delivery' ? driverName : undefined,
        driverPhone: fulfilment.fulfilmentType === 'delivery' ? driverPhone : undefined,
        vehicleNumber: fulfilment.fulfilmentType === 'delivery' ? vehicleNumber : undefined,
        transporterName: fulfilment.fulfilmentType === 'delivery' ? transporterName : undefined,
        collectorName: fulfilment.fulfilmentType === 'pickup' ? collectorName : undefined,
        collectorPhone: fulfilment.fulfilmentType === 'pickup' ? collectorPhone : undefined,
        collectorVehicle: fulfilment.fulfilmentType === 'pickup' ? collectorVehicle : undefined,
        collectorIdNumber: fulfilment.fulfilmentType === 'pickup' ? collectorIdNumber : undefined,
        dispatchNotes: dispatchNotes.trim() || undefined,
      };

      const updated = await warehouseService.dispatchFulfilment(
        fulfilment.id,
        dispatchPayload,
        profile?.id || 'usr-dispatcher',
        profile?.full_name || 'Warehouse Dispatcher'
      );

      toast.success(
        `Shipment dispatched for Fulfilment #${fulfilment.fulfilmentNumber}. Physical stock deducted.`,
        'Shipment Dispatched'
      );
      onFulfilmentUpdated(updated);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to dispatch shipment.');
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
            {mode === 'pack' ? (
              <Package className="h-5 w-5 text-indigo-600" />
            ) : (
              <Truck className="h-5 w-5 text-orange-600" />
            )}
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                {mode === 'pack'
                  ? `Package Staging: #${fulfilment.fulfilmentNumber}`
                  : `Authorize Dispatch: #${fulfilment.fulfilmentNumber}`}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Order #{fulfilment.orderNumber} • Consignee: {fulfilment.customerName}
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
        {mode === 'pack' ? (
          <form onSubmit={handlePackSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Packaging Container Type
                </label>
                <select
                  value={packageType}
                  onChange={(e) => setPackageType(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="pallets">Heavy Duty Wooden Pallets</option>
                  <option value="crates">Steel Reinforced Crates</option>
                  <option value="bundles">Strapped Block Bundles</option>
                  <option value="boxes">Cardboard Boxes / Tools</option>
                  <option value="loose">Loose Yard Staging</option>
                  <option value="mixed">Mixed Pallets & Bags</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Total Package / Pallet Count *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={packageCount}
                  onChange={(e) => setPackageCount(parseInt(e.target.value, 10) || 1)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Estimated Gross Weight (kg)
                </label>
                <input
                  type="number"
                  min="0"
                  value={grossWeightKg}
                  onChange={(e) => setGrossWeightKg(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Loading Bay / Staging Zone
                </label>
                <input
                  type="text"
                  value={loadingBay}
                  onChange={(e) => setLoadingBay(e.target.value)}
                  placeholder="e.g. DOCK-01, BAY-C2"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Checklist */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block mb-2">
                Pre-Dispatch Safety & Packaging Checklist
              </span>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={palletsBanded}
                    onChange={(e) => setPalletsBanded(e.target.checked)}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    Pallets securely banded with plastic/steel strap
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tarpaulinCovered}
                    onChange={(e) => setTarpaulinCovered(e.target.checked)}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    Heavy tarpaulin cover ready for transit
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fragileCushioned}
                    onChange={(e) => setFragileCushioned(e.target.checked)}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    Facing bricks & coping edges cushioned
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={strapsChecked}
                    onChange={(e) => setStrapsChecked(e.target.checked)}
                    className="rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    Crane truck tie-down ratchet straps inspected
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Packaging Notes / Loader Remarks
              </label>
              <textarea
                rows={2}
                value={packingNotes}
                onChange={(e) => setPackingNotes(e.target.value)}
                placeholder="e.g. Standard 500-brick pallets; shrink-wrapped and staged at Dock 2."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                Mark Staged for Dispatch
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleDispatchSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
            {/* Dispatch Mode Form */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg text-amber-900 dark:text-amber-200">
              <p className="font-semibold mb-0.5">⚠️ Final Authorization & Physical Inventory Deduction</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                Authorizing dispatch will permanently deduct physical stock from {fulfilment.sourceLocationName}, release allocated reservations, issue official Waybill #{fulfilment.packageDetails?.waybillNumber || 'WAY-NEW'}, and update Order #{fulfilment.orderNumber}.
              </p>
            </div>

            {fulfilment.fulfilmentType === 'delivery' ? (
              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                  Transport & Driver Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Assigned Driver Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Driver Contact Phone *
                    </label>
                    <input
                      type="text"
                      required
                      value={driverPhone}
                      onChange={(e) => setDriverPhone(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Vehicle / Crane Truck Plate *
                    </label>
                    <input
                      type="text"
                      required
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Fleet / Haulier Company
                    </label>
                    <input
                      type="text"
                      value={transporterName}
                      onChange={(e) => setTransporterName(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                  Customer Pickup / Collector Verification
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Collector Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={collectorName}
                      onChange={(e) => setCollectorName(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Collector Phone *
                    </label>
                    <input
                      type="text"
                      required
                      value={collectorPhone}
                      onChange={(e) => setCollectorPhone(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Collector Vehicle Plate
                    </label>
                    <input
                      type="text"
                      value={collectorVehicle}
                      onChange={(e) => setCollectorVehicle(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      ID / NIN / Driver License Ref
                    </label>
                    <input
                      type="text"
                      value={collectorIdNumber}
                      onChange={(e) => setCollectorIdNumber(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Dispatch Remarks / Gate Pass Security Note
              </label>
              <textarea
                rows={2}
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                placeholder="e.g. Cleared security gate pass #GP-883. Fastened tarpaulin."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isSubmitting}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
              >
                Confirm Dispatch & Release Inventory
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
