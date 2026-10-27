/**
 * Inventory & Stock Management Service
 * Module 11 — Inventory & Stock Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Implements business logic for multi-location inventory balances, stock status derivation,
 * atomic stock receipts, issues, transfers, physical count adjustments, and CSV import/export.
 */

import { inventoryRepository } from '../repositories/inventory.repository';
import { stockLocationRepository } from '../repositories/stockLocation.repository';
import { productRepository } from '../repositories/product.repository';
import { auditService } from './audit.service';
import {
  InventoryItem,
  InventoryStats,
  StockMovement,
  StockLocation,
  ReceiveStockDTO,
  IssueStockDTO,
  TransferStockDTO,
  AdjustStockDTO,
  OpeningBalanceDTO,
  UpdateThresholdsDTO,
  StockImportRow,
  StockImportResult,
  StockStatus,
  InventoryFilterParams,
} from '../types/inventory';
import { Product, ProductVariant } from '../types/product';

export class InventoryService {
  /**
   * Retrieves all inventory items mapped across physical stock locations
   */
  public async getInventoryItems(filters?: InventoryFilterParams): Promise<InventoryItem[]> {
    const [products, locations, balances, allMovements] = await Promise.all([
      productRepository.getAllProducts(),
      stockLocationRepository.getAllLocations(),
      inventoryRepository.getAllBalances(),
      inventoryRepository.getAllMovements(),
    ]);

    const locationMap = new Map<string, StockLocation>(locations.map((l) => [l.id, l]));

    // Map latest movement date per (productId, variantId, locationId)
    const latestMovementMap = new Map<string, string>();
    allMovements.forEach((m) => {
      if (m.destinationLocationId) {
        const key = `${m.productId}:${m.variantId || 'base'}:${m.destinationLocationId}`;
        if (!latestMovementMap.has(key)) {
          latestMovementMap.set(key, m.createdAt);
        }
      }
      if (m.sourceLocationId) {
        const key = `${m.productId}:${m.variantId || 'base'}:${m.sourceLocationId}`;
        if (!latestMovementMap.has(key)) {
          latestMovementMap.set(key, m.createdAt);
        }
      }
    });

    // Balance lookup map
    const balanceMap = new Map<string, { onHand: number; reserved: number; updatedAt: string; id: string }>();
    balances.forEach((b) => {
      const key = `${b.productId}:${b.variantId || 'base'}:${b.locationId}`;
      balanceMap.set(key, {
        onHand: b.quantityOnHand,
        reserved: b.quantityReserved,
        updatedAt: b.updatedAt,
        id: b.id,
      });
    });

    const items: InventoryItem[] = [];

    // For every product and active location
    for (const product of products) {
      if (!product.isActive) continue;

      const hasVariants = product.variants && product.variants.length > 0;

      for (const location of locations) {
        // If location filter applies
        if (filters?.locationId && filters.locationId !== 'all' && location.id !== filters.locationId) {
          continue;
        }

        if (hasVariants) {
          for (const variant of product.variants) {
            if (!variant.isActive) continue;

            const key = `${product.id}:${variant.id}:${location.id}`;
            const bal = balanceMap.get(key) || {
              onHand: 0,
              reserved: 0,
              updatedAt: product.updatedAt,
              id: `virtual-${key}`,
            };

            const unitCost = variant.priceOverride ?? product.costPrice ?? 0;
            const available = Math.max(0, bal.onHand - bal.reserved);
            const status = this.calculateStockStatus(bal.onHand, product.reorderLevel);

            items.push({
              id: `${product.id}-${variant.id}-${location.id}`,
              balanceId: bal.id,
              productId: product.id,
              variantId: variant.id,
              productName: product.name,
              variantName: variant.name,
              categoryName: product.categoryName || 'General Building Materials',
              sku: variant.sku || product.sku,
              unit: product.unit,
              locationId: location.id,
              locationName: location.name,
              locationCode: location.code,
              quantityOnHand: bal.onHand,
              quantityReserved: bal.reserved,
              quantityAvailable: available,
              unitCost,
              totalValuation: bal.onHand * unitCost,
              minimumStock: product.minimumStock || 0,
              reorderLevel: product.reorderLevel || 0,
              status,
              lastMovementDate: latestMovementMap.get(key) || null,
              updatedAt: bal.updatedAt,
            });
          }
        } else {
          // No variants: track directly on product
          const key = `${product.id}:base:${location.id}`;
          const bal = balanceMap.get(key) || {
            onHand: 0,
            reserved: 0,
            updatedAt: product.updatedAt,
            id: `virtual-${key}`,
          };

          const unitCost = product.costPrice ?? 0;
          const available = Math.max(0, bal.onHand - bal.reserved);
          const status = this.calculateStockStatus(bal.onHand, product.reorderLevel);

          items.push({
            id: `${product.id}-base-${location.id}`,
            balanceId: bal.id,
            productId: product.id,
            variantId: null,
            productName: product.name,
            variantName: null,
            categoryName: product.categoryName || 'General Building Materials',
            sku: product.sku,
            unit: product.unit,
            locationId: location.id,
            locationName: location.name,
            locationCode: location.code,
            quantityOnHand: bal.onHand,
            quantityReserved: bal.reserved,
            quantityAvailable: available,
            unitCost,
            totalValuation: bal.onHand * unitCost,
            minimumStock: product.minimumStock || 0,
            reorderLevel: product.reorderLevel || 0,
            status,
            lastMovementDate: latestMovementMap.get(key) || null,
            updatedAt: bal.updatedAt,
          });
        }
      }
    }

    // Apply remaining filters
    return items.filter((item) => {
      if (filters?.categoryId && filters.categoryId !== 'all') {
        const prod = products.find((p: Product) => p.id === item.productId);
        if (prod?.categoryId !== filters.categoryId) return false;
      }

      if (filters?.status && filters.status !== 'all' && item.status !== filters.status) {
        return false;
      }

      if (filters?.hasVariantsOnly && !item.variantId) {
        return false;
      }

      if (filters?.searchQuery?.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        const matches =
          item.productName.toLowerCase().includes(q) ||
          (item.variantName && item.variantName.toLowerCase().includes(q)) ||
          item.sku.toLowerCase().includes(q) ||
          item.locationName.toLowerCase().includes(q) ||
          item.locationCode.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }

  /**
   * Helper to derive stock status without false alarms
   */
  public calculateStockStatus(onHand: number, reorderLevel: number = 0): StockStatus {
    if (onHand <= 0) {
      return 'out_of_stock';
    }
    if (reorderLevel > 0 && onHand <= reorderLevel) {
      return 'low_stock';
    }
    return 'in_stock';
  }

  /**
   * Calculates high-level inventory KPI statistics
   */
  public async getInventoryStats(): Promise<InventoryStats> {
    const items = await this.getInventoryItems();

    let totalQuantityOnHand = 0;
    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalValuation = 0;

    items.forEach((item) => {
      totalQuantityOnHand += item.quantityOnHand;
      totalValuation += item.totalValuation;

      if (item.status === 'in_stock') inStockCount++;
      else if (item.status === 'low_stock') lowStockCount++;
      else if (item.status === 'out_of_stock') outOfStockCount++;
    });

    return {
      totalItems: items.length,
      totalQuantityOnHand,
      inStockCount,
      lowStockCount,
      outOfStockCount,
      totalValuation: Math.round(totalValuation),
    };
  }

  /**
   * Resolves display metadata for a product and optional variant
   */
  private async resolveProductContext(
    productId: string,
    variantId?: string | null,
    locationId?: string
  ): Promise<{
    productName: string;
    variantName: string | null;
    sku: string;
    unit: string;
    locationName: string;
  }> {
    const product = await productRepository.getProductById(productId);
    if (!product) {
      throw new Error(`Product with ID '${productId}' not found in catalogue.`);
    }

    let variantName: string | null = null;
    let sku = product.sku;

    if (variantId) {
      const variant = product.variants?.find((v) => v.id === variantId);
      if (variant) {
        variantName = variant.name;
        sku = variant.sku || product.sku;
      }
    }

    let locationName = 'Stock Location';
    if (locationId) {
      const loc = await stockLocationRepository.getLocationById(locationId);
      if (loc) locationName = loc.name;
    }

    return {
      productName: product.name,
      variantName,
      sku,
      unit: product.unit,
      locationName,
    };
  }

  // ============================================================================
  // STOCK OPERATIONS
  // ============================================================================

  /**
   * Receive stock into a designated physical location
   */
  public async receiveStock(dto: ReceiveStockDTO): Promise<StockMovement> {
    const loc = await stockLocationRepository.getLocationById(dto.destinationLocationId);
    if (!loc || !loc.isActive) {
      throw new Error('Destination stock location is inactive or invalid.');
    }

    const context = await this.resolveProductContext(
      dto.productId,
      dto.variantId,
      dto.destinationLocationId
    );

    const { movement } = await inventoryRepository.executeReceive(dto, context);

    await auditService.logEvent({
      action: 'inventory.received',
      entity_type: 'inventory_balance',
      entity_id: `${dto.productId}:${dto.variantId || 'base'}:${dto.destinationLocationId}`,
      new_values: {
        movementNumber: movement.movementNumber,
        product: context.productName,
        variant: context.variantName,
        quantity: dto.quantity,
        location: context.locationName,
        reason: dto.reason,
      },
      reason: `Stock receipt of ${dto.quantity} ${context.unit} recorded.`,
      user_id: dto.performedBy,
    });

    return movement;
  }

  /**
   * Issue stock from a designated physical location
   */
  public async issueStock(dto: IssueStockDTO): Promise<StockMovement> {
    const loc = await stockLocationRepository.getLocationById(dto.sourceLocationId);
    if (!loc || !loc.isActive) {
      throw new Error('Source stock location is inactive or invalid.');
    }

    const context = await this.resolveProductContext(
      dto.productId,
      dto.variantId,
      dto.sourceLocationId
    );

    const { movement } = await inventoryRepository.executeIssue(dto, context);

    await auditService.logEvent({
      action: 'inventory.issued',
      entity_type: 'inventory_balance',
      entity_id: `${dto.productId}:${dto.variantId || 'base'}:${dto.sourceLocationId}`,
      new_values: {
        movementNumber: movement.movementNumber,
        product: context.productName,
        variant: context.variantName,
        quantity: dto.quantity,
        location: context.locationName,
        reason: dto.reason,
      },
      reason: `Stock issue of ${dto.quantity} ${context.unit} recorded.`,
      user_id: dto.performedBy,
    });

    return movement;
  }

  /**
   * Transfer stock between physical locations
   */
  public async transferStock(dto: TransferStockDTO): Promise<StockMovement> {
    const [sourceLoc, destLoc] = await Promise.all([
      stockLocationRepository.getLocationById(dto.sourceLocationId),
      stockLocationRepository.getLocationById(dto.destinationLocationId),
    ]);

    if (!sourceLoc || !sourceLoc.isActive) {
      throw new Error('Source location is inactive or invalid.');
    }
    if (!destLoc || !destLoc.isActive) {
      throw new Error('Destination location is inactive or invalid.');
    }

    const product = await productRepository.getProductById(dto.productId);
    if (!product) throw new Error('Product not found.');

    let variantName: string | null = null;
    let sku = product.sku;
    if (dto.variantId) {
      const v = product.variants?.find((item) => item.id === dto.variantId);
      if (v) {
        variantName = v.name;
        sku = v.sku || product.sku;
      }
    }

    const context = {
      productName: product.name,
      variantName,
      sku,
      unit: product.unit,
      sourceLocationName: sourceLoc.name,
      destinationLocationName: destLoc.name,
    };

    const { movement } = await inventoryRepository.executeTransfer(dto, context);

    await auditService.logEvent({
      action: 'inventory.transferred',
      entity_type: 'inventory_balance',
      entity_id: `${dto.productId}:${dto.variantId || 'base'}`,
      new_values: {
        movementNumber: movement.movementNumber,
        product: context.productName,
        variant: context.variantName,
        quantity: dto.quantity,
        source: sourceLoc.name,
        destination: destLoc.name,
        reason: dto.reason,
      },
      reason: `Inter-location stock transfer of ${dto.quantity} ${context.unit} from ${sourceLoc.name} to ${destLoc.name}.`,
      user_id: dto.performedBy,
    });

    return movement;
  }

  /**
   * Adjust physical inventory count with documented reason
   */
  public async adjustStock(dto: AdjustStockDTO): Promise<StockMovement> {
    const loc = await stockLocationRepository.getLocationById(dto.locationId);
    if (!loc || !loc.isActive) {
      throw new Error('Location is inactive or invalid.');
    }

    const context = await this.resolveProductContext(
      dto.productId,
      dto.variantId,
      dto.locationId
    );

    const { movement } = await inventoryRepository.executeAdjustment(dto, context);

    await auditService.logEvent({
      action: 'inventory.adjusted',
      entity_type: 'inventory_balance',
      entity_id: `${dto.productId}:${dto.variantId || 'base'}:${dto.locationId}`,
      new_values: {
        movementNumber: movement.movementNumber,
        product: context.productName,
        variant: context.variantName,
        newOnHand: dto.newQuantityOnHand,
        location: context.locationName,
        reason: dto.reason,
      },
      reason: `Physical stock count adjustment recorded: ${dto.reason}.`,
      user_id: dto.performedBy,
    });

    // Module 22: Enqueue for server synchronization if offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        const { syncEngine } = await import('./sync/syncEngine');
        await syncEngine.enqueue({
          operationType: 'INVENTORY_ADJUSTMENT',
          entityType: 'inventory_movement',
          localEntityId: movement.id,
          payload: {
            clientMovementId: movement.id,
            movementType: 'adjustment',
            productId: dto.productId,
            productName: context.productName,
            sku: context.sku,
            quantityChange: movement.quantity,
            previousKnownStock: dto.newQuantityOnHand - movement.quantity,
            locationId: dto.locationId,
            locationName: context.locationName,
            reason: dto.reason,
            staffId: dto.performedBy,
            staffName: 'Yard Inventory Controller',
            offlineCreatedAt: movement.createdAt,
          },
          actor: {
            userId: dto.performedBy,
          },
        });
      } catch (queueErr) {
        console.warn('[InventoryService] Offline queueing warning:', queueErr);
      }
    }

    return movement;
  }

  /**
   * Record initial opening balance for product or variant
   */
  public async recordOpeningBalance(dto: OpeningBalanceDTO): Promise<StockMovement> {
    const loc = await stockLocationRepository.getLocationById(dto.locationId);
    if (!loc || !loc.isActive) {
      throw new Error('Location is inactive or invalid.');
    }

    const context = await this.resolveProductContext(
      dto.productId,
      dto.variantId,
      dto.locationId
    );

    const { movement } = await inventoryRepository.executeOpeningBalance(dto, context);

    await auditService.logEvent({
      action: 'inventory.opening_balance',
      entity_type: 'inventory_balance',
      entity_id: `${dto.productId}:${dto.variantId || 'base'}:${dto.locationId}`,
      new_values: {
        movementNumber: movement.movementNumber,
        product: context.productName,
        variant: context.variantName,
        quantity: dto.openingQuantity,
        location: context.locationName,
      },
      reason: `Opening physical balance of ${dto.openingQuantity} ${context.unit} established.`,
      user_id: dto.performedBy,
    });

    return movement;
  }

  /**
   * Update stock threshold levels (minimum stock & reorder point) on product
   */
  public async updateThresholds(dto: UpdateThresholdsDTO): Promise<Product> {
    if (dto.minimumStock < 0 || dto.reorderLevel < 0) {
      throw new Error('Threshold values cannot be negative numbers.');
    }

    const updated = await productRepository.updateProductThresholds(dto.productId, {
      minimumStock: dto.minimumStock,
      reorderLevel: dto.reorderLevel,
    });

    return updated;
  }

  /**
   * Retrieves enriched movement history
   */
  public async getStockMovements(filters?: {
    locationId?: string;
    productId?: string;
    variantId?: string;
    movementType?: any;
    searchQuery?: string;
  }): Promise<StockMovement[]> {
    const [rawMovements, products, locations] = await Promise.all([
      inventoryRepository.getAllMovements(filters),
      productRepository.getAllProducts(),
      stockLocationRepository.getAllLocations(),
    ]);

    const prodMap = new Map<string, Product>(products.map((p: Product) => [p.id, p]));
    const locMap = new Map<string, StockLocation>(locations.map((l) => [l.id, l]));

    let movements = rawMovements.map((m) => {
      const p = prodMap.get(m.productId);
      const v = m.variantId && p ? p.variants?.find((v: ProductVariant) => v.id === m.variantId) : null;
      const srcLoc = m.sourceLocationId ? locMap.get(m.sourceLocationId) : null;
      const dstLoc = m.destinationLocationId ? locMap.get(m.destinationLocationId) : null;

      return {
        ...m,
        productName: m.productName || p?.name || 'Unknown Product',
        variantName: m.variantName || v?.name || null,
        sku: m.sku || v?.sku || p?.sku || '—',
        unit: m.unit || p?.unit || 'units',
        sourceLocationName: m.sourceLocationName || srcLoc?.name || null,
        destinationLocationName: m.destinationLocationName || dstLoc?.name || null,
      };
    });

    if (filters?.searchQuery?.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      movements = movements.filter(
        (m) =>
          m.movementNumber.toLowerCase().includes(q) ||
          m.productName.toLowerCase().includes(q) ||
          (m.variantName && m.variantName.toLowerCase().includes(q)) ||
          m.sku.toLowerCase().includes(q) ||
          (m.reason && m.reason.toLowerCase().includes(q)) ||
          (m.referenceId && m.referenceId.toLowerCase().includes(q))
      );
    }

    return movements;
  }

  /**
   * Generates CSV export of current inventory balances across locations
   */
  public async exportInventoryCsv(): Promise<string> {
    const items = await this.getInventoryItems();

    const headers = [
      'Product Name',
      'Variant',
      'SKU',
      'Location Code',
      'Location Name',
      'On Hand',
      'Reserved',
      'Available',
      'Unit',
      'Unit Cost (NGN)',
      'Total Valuation (NGN)',
      'Status',
      'Reorder Level',
    ];

    const rows = items.map((i) => [
      `"${i.productName.replace(/"/g, '""')}"`,
      `"${(i.variantName || '').replace(/"/g, '""')}"`,
      `"${i.sku}"`,
      `"${i.locationCode}"`,
      `"${i.locationName.replace(/"/g, '""')}"`,
      i.quantityOnHand,
      i.quantityReserved,
      i.quantityAvailable,
      `"${i.unit}"`,
      i.unitCost,
      i.totalValuation,
      `"${i.status.toUpperCase()}"`,
      i.reorderLevel,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * Validates and imports physical stock records from structured CSV data
   */
  public async importStockBatch(
    rows: StockImportRow[],
    performedBy: string,
    performedByName: string
  ): Promise<StockImportResult> {
    const [products, locations] = await Promise.all([
      productRepository.getAllProducts(),
      stockLocationRepository.getAllLocations(),
    ]);

    const locCodeMap = new Map<string, StockLocation>(
      locations.map((l) => [l.code.toUpperCase(), l])
    );

    // Build sku lookup maps
    const skuMap = new Map<string, { product: Product; variant?: ProductVariant }>();
    products.forEach((p: Product) => {
      skuMap.set(p.sku.toUpperCase(), { product: p });
      p.variants?.forEach((v: ProductVariant) => {
        if (v.sku) {
          skuMap.set(v.sku.toUpperCase(), { product: p, variant: v });
        }
      });
    });

    let successful = 0;
    let failed = 0;
    const errors: { row: number; error: string; data?: any }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;

      try {
        const targetSku = (row.variantSku || row.productSku || '').trim().toUpperCase();
        if (!targetSku) {
          throw new Error('Product or Variant SKU is missing.');
        }

        const match = skuMap.get(targetSku);
        if (!match) {
          throw new Error(`SKU '${targetSku}' does not exist in product catalogue.`);
        }

        const locCode = (row.locationCode || '').trim().toUpperCase();
        const loc = locCodeMap.get(locCode);
        if (!loc) {
          throw new Error(`Stock location code '${locCode}' does not exist.`);
        }

        const qty = Number(row.quantity);
        if (isNaN(qty) || qty < 0) {
          throw new Error(`Invalid stock quantity '${row.quantity}'. Must be 0 or greater.`);
        }

        await this.recordOpeningBalance({
          productId: match.product.id,
          variantId: match.variant?.id || null,
          locationId: loc.id,
          openingQuantity: qty,
          unitCost: row.unitCost,
          notes: row.notes || 'CSV batch opening stock import',
          performedBy,
          performedByName,
        });

        successful++;
      } catch (err: any) {
        failed++;
        errors.push({
          row: rowNumber,
          error: err.message || 'Row import failed.',
          data: row,
        });
      }
    }

    return {
      totalRows: rows.length,
      successfulRows: successful,
      failedRows: failed,
      errors,
    };
  }
}

export const inventoryService = new InventoryService();
