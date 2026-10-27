/**
 * Warehouse & Fulfilment Operations Domain Types
 * Module 14 — Warehouse & Delivery Operations
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Covers physical order fulfilment from stock allocation, picking, verification,
 * packing/loading staging, dispatch, transit tracking, and proof of delivery (POD).
 */

export type FulfilmentType = 'delivery' | 'pickup';

export type FulfilmentStatus =
  | 'draft'
  | 'allocated'
  | 'picking'
  | 'picked'
  | 'verified'
  | 'packed'
  | 'ready_for_dispatch'
  | 'dispatched'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export type WarehouseTaskType = 'picking' | 'packing' | 'loading' | 'verification';

export type WarehouseTaskStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type WarehousePriority = 'low' | 'normal' | 'high' | 'urgent';

export type DeliveryArrivalCondition = 'good' | 'minor_damage' | 'partial_received' | 'rejected';

export interface FulfilmentItem {
  id: string;
  fulfilmentId: string;
  orderItemId: string;
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  sku: string;
  unit: string;
  requiredQuantity: number;
  allocatedQuantity: number;
  pickedQuantity: number;
  verifiedQuantity: number;
  locationId: string;
  locationName: string;
  bayCode?: string | null;
  discrepancyNote?: string | null;
}

export interface PackageDetails {
  packageType: 'pallets' | 'crates' | 'bundles' | 'boxes' | 'loose' | 'mixed';
  packageCount: number;
  grossWeightKg?: number | null;
  loadingBay?: string | null;
  waybillNumber?: string | null;
  loadingChecklist: {
    palletsBanded: boolean;
    tarpaulinCovered: boolean;
    fragileCushioned: boolean;
    strapsChecked: boolean;
  };
  packingNotes?: string | null;
  packedBy?: string | null;
  packedByName?: string | null;
  packedAt?: string | null;
}

export interface DispatchDetails {
  dispatchedAt: string;
  dispatchedBy: string;
  dispatchedByName: string;
  driverName?: string | null;
  driverPhone?: string | null;
  vehicleNumber?: string | null;
  transporterName?: string | null;
  estimatedDeliveryAt?: string | null;
  deliveryStatus: 'scheduled' | 'dispatched' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed';
  collectorName?: string | null;
  collectorPhone?: string | null;
  collectorVehicle?: string | null;
  collectorIdNumber?: string | null;
  dispatchNotes?: string | null;
}

export interface ProofOfDelivery {
  recipientName: string;
  recipientPhone: string;
  deliveredAt: string;
  conditionOnArrival: DeliveryArrivalCondition;
  signOffNotes?: string | null;
  signatureDataUrl?: string | null;
  podPhotoUrl?: string | null;
  recordedBy?: string | null;
  recordedByName?: string | null;
}

export interface FulfilmentStatusHistory {
  id: string;
  fulfilmentId: string;
  previousStatus: FulfilmentStatus | null;
  newStatus: FulfilmentStatus;
  changedBy: string;
  changedByName?: string;
  timestamp: string;
  note?: string | null;
}

export interface FulfilmentRecord {
  id: string;
  fulfilmentNumber: string; // e.g. FUL-2026-0001
  orderId: string;
  orderNumber: string;
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  customerAddress?: string | null;
  fulfilmentType: FulfilmentType;
  sourceLocationId: string;
  sourceLocationName: string;
  destinationAddress?: string | null;
  destinationCity?: string | null;
  destinationState?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  deliveryNotes?: string | null;
  assignedStaffId?: string | null;
  assignedStaffName?: string | null;
  priority: WarehousePriority;
  status: FulfilmentStatus;
  items: FulfilmentItem[];
  packageDetails?: PackageDetails | null;
  dispatchDetails?: DispatchDetails | null;
  proofOfDelivery?: ProofOfDelivery | null;
  notes?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
  statusHistory: FulfilmentStatusHistory[];
}

export interface WarehouseTask {
  id: string;
  taskNumber: string; // e.g. TSK-2026-0001
  fulfilmentId: string;
  fulfilmentNumber: string;
  orderId: string;
  orderNumber: string;
  stockLocationId: string;
  stockLocationName: string;
  taskType: WarehouseTaskType;
  assignedStaffId?: string | null;
  assignedStaffName?: string | null;
  priority: WarehousePriority;
  status: WarehouseTaskStatus;
  notes?: string | null;
  itemCount: number;
  totalUnits: number;
  createdTime: string;
  startedTime?: string | null;
  completedTime?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FulfilmentFilters {
  searchTerm?: string;
  status?: FulfilmentStatus | 'all';
  fulfilmentType?: FulfilmentType | 'all';
  locationId?: string | 'all';
  priority?: WarehousePriority | 'all';
  orderId?: string;
}

export interface WarehouseStats {
  totalFulfilments: number;
  pendingAllocation: number;
  inPicking: number;
  readyForDispatch: number;
  inTransit: number;
  delivered: number;
  totalTasks: number;
  openTasks: number;
}

export interface CreateFulfilmentDTO {
  orderId: string;
  fulfilmentType: FulfilmentType;
  sourceLocationId: string;
  destinationAddress?: string | null;
  destinationCity?: string | null;
  destinationState?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  deliveryNotes?: string | null;
  assignedStaffId?: string | null;
  assignedStaffName?: string | null;
  priority?: WarehousePriority;
  notes?: string | null;
  allocatedItems: Array<{
    orderItemId: string;
    productId: string;
    variantId?: string | null;
    allocatedQuantity: number;
    bayCode?: string | null;
  }>;
  createdBy?: string;
  createdByName?: string;
}

export const FULFILMENT_STATUS_CONFIG: Record<
  FulfilmentStatus,
  {
    label: string;
    badgeVariant: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
    description: string;
    stepIndex: number;
  }
> = {
  draft: {
    label: 'Draft / Unallocated',
    badgeVariant: 'outline',
    description: 'Fulfilment initialized, waiting for yard stock allocation.',
    stepIndex: 1,
  },
  allocated: {
    label: 'Stock Allocated',
    badgeVariant: 'info',
    description: 'Inventory reserved at warehouse bay, ready for picking.',
    stepIndex: 2,
  },
  picking: {
    label: 'Picking in Progress',
    badgeVariant: 'warning',
    description: 'Yard loaders retrieving items from designated bays.',
    stepIndex: 3,
  },
  picked: {
    label: 'Picked',
    badgeVariant: 'primary',
    description: 'All items picked from bay, awaiting verification check.',
    stepIndex: 4,
  },
  verified: {
    label: 'Quantity Verified',
    badgeVariant: 'info',
    description: 'Picked stock verified against manifest, ready for packing.',
    stepIndex: 5,
  },
  packed: {
    label: 'Packed & Palletized',
    badgeVariant: 'primary',
    description: 'Banded, shrink-wrapped or crated, staging at loading dock.',
    stepIndex: 6,
  },
  ready_for_dispatch: {
    label: 'Ready for Dispatch',
    badgeVariant: 'warning',
    description: 'Waybill generated, waiting for truck departure or collector.',
    stepIndex: 7,
  },
  dispatched: {
    label: 'Dispatched',
    badgeVariant: 'info',
    description: 'Truck departed factory yard or handed over to customer.',
    stepIndex: 8,
  },
  in_transit: {
    label: 'In Transit',
    badgeVariant: 'primary',
    description: 'Vehicle en route to customer destination site.',
    stepIndex: 9,
  },
  delivered: {
    label: 'Delivered / Completed',
    badgeVariant: 'success',
    description: 'Received on site and confirmed with Proof of Delivery.',
    stepIndex: 10,
  },
  cancelled: {
    label: 'Cancelled',
    badgeVariant: 'danger',
    description: 'Fulfilment cancelled; reserved stock returned to inventory.',
    stepIndex: 0,
  },
};
