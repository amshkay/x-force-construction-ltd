import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  PackagePlus,
  Truck,
  Store,
  Building2,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Calendar,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { StockLocation, InventoryBalance } from '../../types/inventory';
import { Order } from '../../types/order';
import { FulfilmentRecord, FulfilmentType, WarehousePriority } from '../../types/warehouse';
import { stockLocationRepository } from '../../repositories/stockLocation.repository';
import { inventoryRepository } from '../../repositories/inventory.repository';
import { warehouseService, EligibleOrderSummary } from '../../services/warehouse.service';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../hooks/useAuth';

interface CreateFulfilmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderId?: string | null;
  onFulfilmentCreated: (created: FulfilmentRecord) => void;
}

export const CreateFulfilmentModal: React.FC<CreateFulfilmentModalProps> = ({
  isOpen,
  onClose,
  initialOrderId,
  onFulfilmentCreated,
}) => {
  const toast = useToast();
  const { profile } = useAuth();

  const [eligibleOrders, setEligibleOrders] = useState<EligibleOrderSummary[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [balances, setBalances] = useState<InventoryBalance[]>([]);
  const [loading, setLoading] = useState(true);

  // Form selections
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [fulfilmentType, setFulfilmentType] = useState<FulfilmentType>('delivery');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [destinationAddress, setDestinationAddress] = useState<string>('');
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');
  const [priority, setPriority] = useState<WarehousePriority>('normal');
  const [assignedStaffName, setAssignedStaffName] = useState<string>('Babajide Sanwo (Yard Supervisor)');
  const [notes, setNotes] = useState<string>('');

  // Item allocation map: orderItemId -> { allocatedQty: number; bayCode: string }
  const [allocationMap, setAllocationMap] = useState<
    Record<string, { allocatedQty: number; bayCode: string }>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eligible, locs, bals] = await Promise.all([
        warehouseService.getEligibleOrdersForFulfilment(),
        stockLocationRepository.getAllLocations(),
        inventoryRepository.getAllBalances(),
      ]);
      setEligibleOrders(eligible);
      setLocations(locs.filter((l) => l.isActive));
      setBalances(bals);

      const defaultLoc = locs.find((l) => l.isDefault) || locs[0];
      if (defaultLoc) {
        setSelectedLocationId(defaultLoc.id);
      }

      if (initialOrderId) {
        setSelectedOrderId(initialOrderId);
      } else if (eligible.length > 0) {
        setSelectedOrderId(eligible[0].order.id);
      }
    } catch (err: any) {
      toast.error('Failed to load eligible orders and inventory data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Selected order object
  const currentEligible = useMemo(() => {
    return eligibleOrders.find((e) => e.order.id === selectedOrderId);
  }, [eligibleOrders, selectedOrderId]);

  // When selected order changes, auto-populate destination and items
  useEffect(() => {
    if (currentEligible) {
      const ord = currentEligible.order;
      setDestinationAddress(ord.deliveryAddress || ord.customerAddress || '');
      setDeliveryNotes(ord.deliveryNotes || '');
      setFulfilmentType(ord.deliveryAddress ? 'delivery' : 'pickup');

      // Auto-allocate full remaining physical quantities
      const initialAlloc: Record<string, { allocatedQty: number; bayCode: string }> = {};
      ord.items.forEach((item, idx) => {
        if (item.itemType === 'product') {
          initialAlloc[item.id] = {
            allocatedQty: item.quantity,
            bayCode: idx === 0 ? 'BAY-A3' : 'BAY-B1',
          };
        }
      });
      setAllocationMap(initialAlloc);
    }
  }, [currentEligible]);

  if (!isOpen) return null;

  // Helper to check available stock for a product variant at selected location
  const getAvailableStock = (productId: string, variantId?: string | null): number => {
    const bal = balances.find(
      (b) =>
        b.productId === productId &&
        (b.variantId || null) === (variantId || null) &&
        b.locationId === selectedLocationId
    );
    if (!bal) return 0;
    return Math.max(0, bal.quantityOnHand - bal.quantityReserved);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) {
      toast.error('Please select an eligible order.');
      return;
    }
    if (!selectedLocationId) {
      toast.error('Please select a source stock location.');
      return;
    }

    const order = currentEligible?.order;
    if (!order) return;

    // Build allocated items payload
    const allocatedItems = order.items
      .filter((it) => it.itemType === 'product' && (allocationMap[it.id]?.allocatedQty || 0) > 0)
      .map((it) => ({
        orderItemId: it.id,
        productId: it.productId || 'p1000000-0000-0000-0000-000000000001',
        variantId: it.variantId || null,
        allocatedQuantity: allocationMap[it.id].allocatedQty,
        bayCode: allocationMap[it.id].bayCode || undefined,
      }));

    if (allocatedItems.length === 0) {
      toast.error('You must allocate at least 1 unit to prepare a fulfilment.');
      return;
    }

    // Shortage validation
    for (const alloc of allocatedItems) {
      const avail = getAvailableStock(alloc.productId, alloc.variantId);
      if (alloc.allocatedQuantity > avail) {
        toast.error(
          `Insufficient stock at chosen yard! Allocated ${alloc.allocatedQuantity}, but only ${avail} available.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const newFulfilment = await warehouseService.createFulfilment({
        orderId: order.id,
        fulfilmentType,
        sourceLocationId: selectedLocationId,
        destinationAddress: fulfilmentType === 'delivery' ? destinationAddress : null,
        deliveryNotes: deliveryNotes.trim() || undefined,
        assignedStaffName,
        priority,
        notes: notes.trim() || undefined,
        allocatedItems,
        createdBy: profile?.id || 'usr-system',
        createdByName: profile?.full_name || 'Staff Member',
      });

      toast.success(
        `Fulfilment #${newFulfilment.fulfilmentNumber} prepared and picking task spawned.`,
        'Fulfilment Created'
      );
      onFulfilmentCreated(newFulfilment);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create fulfilment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <PackagePlus className="h-5 w-5 text-orange-600" />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                Initiate Warehouse Fulfilment
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Allocate inventory, assign picking bays, and schedule yard loading
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

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Step 1: Select Eligible Order */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Confirmed Order to Fulfil *
            </label>
            {eligibleOrders.length === 0 ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>No eligible confirmed orders with physical products found.</span>
              </div>
            ) : (
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {eligibleOrders.map(({ order, totalRemainingQuantity }) => (
                  <option key={order.id} value={order.id}>
                    Order #{order.orderNumber} — {order.customerName} ({order.status.toUpperCase()} •{' '}
                    {totalRemainingQuantity.toLocaleString()} units remaining)
                  </option>
                ))}
              </select>
            )}
          </div>

          {currentEligible && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3.5 flex justify-between items-center flex-wrap gap-2 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Customer / Phone:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {currentEligible.order.customerName} ({currentEligible.order.customerPhone})
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Payment State:</span>
                <span className="font-bold uppercase text-emerald-600 dark:text-emerald-400">
                  {currentEligible.order.paymentStatus}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Physical Items:</span>
                <span className="font-bold text-orange-600 dark:text-orange-400">
                  {currentEligible.totalPhysicalItems} product line(s)
                </span>
              </div>
            </div>
          )}

          {/* Step 2: Fulfilment Type & Source Yard Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fulfilment Method *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFulfilmentType('delivery')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border font-semibold transition ${
                    fulfilmentType === 'delivery'
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <Truck className="h-4 w-4" />
                  Site Delivery
                </button>
                <button
                  type="button"
                  onClick={() => setFulfilmentType('pickup')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border font-semibold transition ${
                    fulfilmentType === 'pickup'
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <Store className="h-4 w-4" />
                  Customer Pickup
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Source Yard / Stock Location *
              </label>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Delivery Site Destination Details */}
          {fulfilmentType === 'delivery' && (
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Site Delivery Destination Address *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  placeholder="e.g. Plot 45 Independence Layout, Enugu State"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          )}

          {/* Step 3: Material Allocation Table */}
          {currentEligible && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="font-semibold text-slate-800 dark:text-slate-200">
                  Stock Allocation & Bay Assignment
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Live availability verified from source yard
                </span>
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <th className="p-2.5">Ordered Product</th>
                      <th className="p-2.5 text-center">Required</th>
                      <th className="p-2.5 text-center">Avail in Yard</th>
                      <th className="p-2.5 w-28 text-center">Allocate Qty</th>
                      <th className="p-2.5 w-28">Yard Bay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {currentEligible.order.items
                      .filter((it) => it.itemType === 'product')
                      .map((item) => {
                        const avail = getAvailableStock(item.productId || '', item.variantId);
                        const state = allocationMap[item.id] || { allocatedQty: 0, bayCode: 'BAY-A1' };
                        const hasShortage = state.allocatedQty > avail;

                        return (
                          <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="p-2.5">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {item.productName}
                              </div>
                              {item.variantDescription && (
                                <div className="text-[11px] text-slate-500">
                                  {item.variantDescription}
                                </div>
                              )}
                              <div className="font-mono text-[10px] text-slate-400">
                                SKU: {item.sku} • Unit: {item.unit}
                              </div>
                            </td>

                            <td className="p-2.5 text-center font-bold text-slate-800 dark:text-slate-200">
                              {item.quantity.toLocaleString()}
                            </td>

                            <td className="p-2.5 text-center">
                              <span
                                className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                                  avail >= item.quantity
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                }`}
                              >
                                {avail.toLocaleString()}
                              </span>
                            </td>

                            <td className="p-2.5">
                              <input
                                type="number"
                                min="0"
                                max={item.quantity}
                                value={state.allocatedQty}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10) || 0;
                                  setAllocationMap((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      allocatedQty: val,
                                    },
                                  }));
                                }}
                                className={`w-full rounded border py-1 px-2 text-center font-mono font-bold ${
                                  hasShortage
                                    ? 'border-rose-500 bg-rose-50 text-rose-800'
                                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                                }`}
                              />
                            </td>

                            <td className="p-2.5">
                              <input
                                type="text"
                                value={state.bayCode}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAllocationMap((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      ...prev[item.id],
                                      bayCode: val,
                                    },
                                  }));
                                }}
                                placeholder="BAY-A1"
                                className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 px-2 text-center font-mono uppercase text-[11px]"
                              />
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Priority, Staff Assignment & Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fulfilment Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="normal">Normal Dispatch Queue</option>
                <option value="high">High Priority (Contractor On-Site)</option>
                <option value="urgent">Urgent / Emergency Same-Day</option>
                <option value="low">Low Priority (Advance Holding)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Assigned Warehouse Loader / Supervisor
              </label>
              <input
                type="text"
                value={assignedStaffName}
                onChange={(e) => setAssignedStaffName(e.target.value)}
                placeholder="e.g. Babajide Sanwo"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Internal Yard Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Forklift operator to stage on Dock 2 after 10 AM."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isSubmitting}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
            >
              Allocate Stock & Create Picking Task
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
