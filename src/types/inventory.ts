/**
 * Inventory & Stock Management Domain Types
 * Module 11 — Inventory & Stock Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Single-Business Generic Building Materials Architecture.
 * Tracks physical stock at the Product and Product Variant level across physical stock locations.
 */

import { StockMovementType } from './database';

export type { StockMovementType };

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface StockLocation {
  id: string;
  name: string;
  code: string;
  description: string | null;
  address: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockLocationFormData {
  name: string;
  code: string;
  description?: string;
  address?: string;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface InventoryBalance {
  id: string;
  productId: string;
  variantId: string | null;
  locationId: string;
  quantityOnHand: number;
  quantityReserved: number;
  updatedAt: string;
}

export interface InventoryItem {
  id: string; // Composite or balanceId
  balanceId: string;
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  categoryName: string;
  sku: string;
  unit: string;
  locationId: string;
  locationName: string;
  locationCode: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number; // derived: max(0, onHand - reserved)
  unitCost: number;
  totalValuation: number; // derived: onHand * unitCost
  minimumStock: number;
  reorderLevel: number;
  status: StockStatus;
  lastMovementDate: string | null;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  movementNumber: string;
  movementType: StockMovementType;
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  sku: string;
  unit: string;
  sourceLocationId: string | null;
  sourceLocationName: string | null;
  destinationLocationId: string | null;
  destinationLocationName: string | null;
  quantity: number;
  unitCost: number | null;
  totalCost: number | null;
  referenceType: string | null;
  referenceId: string | null;
  reason: string;
  notes: string | null;
  performedBy: string;
  performedByName: string;
  createdAt: string;
}

export interface InventoryStats {
  totalItems: number;
  totalQuantityOnHand: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalValuation: number;
}

export interface InventoryFilterParams {
  searchQuery?: string;
  locationId?: string | 'all';
  categoryId?: string | 'all';
  status?: StockStatus | 'all';
  hasVariantsOnly?: boolean;
}

export interface ReceiveStockDTO {
  productId: string;
  variantId?: string | null;
  destinationLocationId: string;
  quantity: number;
  unitCost?: number | null;
  referenceType?: string;
  referenceId?: string;
  reason: string;
  notes?: string;
  performedBy: string;
  performedByName: string;
}

export interface IssueStockDTO {
  productId: string;
  variantId?: string | null;
  sourceLocationId: string;
  quantity: number;
  reason: string;
  notes?: string;
  performedBy: string;
  performedByName: string;
}

export interface TransferStockDTO {
  productId: string;
  variantId?: string | null;
  sourceLocationId: string;
  destinationLocationId: string;
  quantity: number;
  reason: string;
  notes?: string;
  performedBy: string;
  performedByName: string;
}

export interface AdjustStockDTO {
  productId: string;
  variantId?: string | null;
  locationId: string;
  newQuantityOnHand: number;
  reason: string;
  notes?: string;
  performedBy: string;
  performedByName: string;
}

export interface OpeningBalanceDTO {
  productId: string;
  variantId?: string | null;
  locationId: string;
  openingQuantity: number;
  unitCost?: number | null;
  notes?: string;
  performedBy: string;
  performedByName: string;
}

export interface UpdateThresholdsDTO {
  productId: string;
  minimumStock: number;
  reorderLevel: number;
}

export interface StockImportRow {
  productSku: string;
  variantSku?: string;
  locationCode: string;
  quantity: number;
  unitCost?: number;
  minimumStock?: number;
  reorderLevel?: number;
  notes?: string;
}

export interface StockImportResult {
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  errors: { row: number; error: string; data?: any }[];
}

export const MOVEMENT_TYPE_CONFIG: Record<
  StockMovementType,
  { label: string; badgeVariant: 'default' | 'success' | 'warning' | 'danger' | 'info'; isIncrease: boolean | null }
> = {
  opening_balance: {
    label: 'Opening Balance',
    badgeVariant: 'info',
    isIncrease: true,
  },
  received: {
    label: 'Stock Receipt',
    badgeVariant: 'success',
    isIncrease: true,
  },
  issued: {
    label: 'Stock Issue',
    badgeVariant: 'danger',
    isIncrease: false,
  },
  transfer: {
    label: 'Internal Transfer',
    badgeVariant: 'warning',
    isIncrease: null, // neutral: decreases source, increases destination
  },
  adjustment: {
    label: 'Inventory Adjustment',
    badgeVariant: 'info',
    isIncrease: null,
  },
  stock_count_reconciliation: {
    label: 'Stock Count Reconciliation',
    badgeVariant: 'info',
    isIncrease: null,
  },
  wastage: {
    label: 'Waste / Scrap',
    badgeVariant: 'danger',
    isIncrease: false,
  },
  return: {
    label: 'Customer Return',
    badgeVariant: 'success',
    isIncrease: true,
  },
  damaged: {
    label: 'Damaged Stock',
    badgeVariant: 'danger',
    isIncrease: false,
  },
  pos_sale: {
    label: 'POS Counter Sale',
    badgeVariant: 'danger',
    isIncrease: false,
  },
};

export const STOCK_STATUS_CONFIG: Record<
  StockStatus,
  { label: string; badgeVariant: 'success' | 'warning' | 'danger' }
> = {
  in_stock: {
    label: 'In Stock',
    badgeVariant: 'success',
  },
  low_stock: {
    label: 'Low Stock Alert',
    badgeVariant: 'warning',
  },
  out_of_stock: {
    label: 'Out of Stock',
    badgeVariant: 'danger',
  },
};
