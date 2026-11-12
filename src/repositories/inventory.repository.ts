/**
 * Inventory Repository
 * Module 11 — Inventory & Stock Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Manages inventory balances and immutable stock movement ledgers.
 * Multi-tier persistence: Supabase remote tables (`inventory_balances`, `stock_movements`)
 * with synchronized offline-resilient local storage caching.
 */

import {
  createSupabaseAuthHeaders,
  getSupabaseClient,
  isNetworkOrFetchError,
  isTableMissingError,
} from '../lib/supabase/client';
import { appConfig } from '../config/app.config';
import { localStore } from '../lib/storage/localStorage';
import {
  InventoryBalance,
  StockMovement,
  StockMovementType,
  ReceiveStockDTO,
  IssueStockDTO,
  TransferStockDTO,
  AdjustStockDTO,
  OpeningBalanceDTO,
} from '../types/inventory';
import { DbInventoryBalance, DbStockMovement } from '../types/database';

const INVENTORY_BALANCES_STORAGE_KEY = 'xforce_inventory_balances_v1';
const STOCK_MOVEMENTS_STORAGE_KEY = 'xforce_stock_movements_v1';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value?: string | null): value is string {
  return Boolean(value && UUID_REGEX.test(value));
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isPermissionOrAuthError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '').toLowerCase();
  return (
    code === '42501' ||
    code === 'PGRST301' ||
    error.status === 401 ||
    error.status === 403 ||
    msg.includes('row-level security') ||
    msg.includes('permission denied') ||
    msg.includes('jwt') ||
    msg.includes('not authenticated')
  );
}

export const INITIAL_FOUNDATIONAL_BALANCES: InventoryBalance[] = [];

export class InventoryRepository {
  private isRemoteTableAvailable: boolean = true;
  private warnedAboutMissingTable: boolean = false;
  private memoryBalances: InventoryBalance[] | null = null;
  private memoryMovements: StockMovement[] | null = null;

  constructor() {
    this.initCache();
  }

  private initCache(): void {
    const storedBalances = localStore.get<InventoryBalance[] | null>(
      INVENTORY_BALANCES_STORAGE_KEY,
      null
    );
    if (storedBalances && storedBalances.length > 0) {
      this.memoryBalances = storedBalances;
    } else {
      this.memoryBalances = INITIAL_FOUNDATIONAL_BALANCES;
      localStore.set(INVENTORY_BALANCES_STORAGE_KEY, INITIAL_FOUNDATIONAL_BALANCES);
    }

    const storedMovements = localStore.get<StockMovement[] | null>(
      STOCK_MOVEMENTS_STORAGE_KEY,
      null
    );
    this.memoryMovements = storedMovements || [];
  }

  private saveBalances(balances: InventoryBalance[]): void {
    this.memoryBalances = balances;
    localStore.set(INVENTORY_BALANCES_STORAGE_KEY, balances);
  }

  private saveMovements(movements: StockMovement[]): void {
    this.memoryMovements = movements;
    localStore.set(STOCK_MOVEMENTS_STORAGE_KEY, movements);
  }

  private generateMovementNumber(): string {
    const year = new Date().getFullYear();
    const existing = this.memoryMovements || [];
    const count = existing.length + 1;
    const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `SM-${year}-${String(count).padStart(5, '0')}-${rand}`;
  }

  private mapDbBalance(r: DbInventoryBalance): InventoryBalance {
    return {
      id: r.id,
      productId: r.product_id,
      variantId: r.variant_id,
      locationId: r.location_id,
      quantityOnHand: Number(r.quantity_on_hand) || 0,
      quantityReserved: Number(r.quantity_reserved) || 0,
      updatedAt: r.updated_at,
    };
  }

  private mapDbMovement(r: any): StockMovement {
    return {
      id: r.id,
      movementNumber: r.movement_number || `SM-${String(r.id).substring(0, 8)}`,
      movementType: r.movement_type,
      productId: r.product_id,
      variantId: r.variant_id,
      productName: '', // enriched in service
      variantName: null,
      sku: '',
      unit: '',
      sourceLocationId: r.source_location_id,
      sourceLocationName: null,
      destinationLocationId: r.destination_location_id,
      destinationLocationName: null,
      quantity: Number(r.quantity) || 0,
      unitCost: r.unit_cost !== null ? Number(r.unit_cost) : null,
      totalCost: r.unit_cost !== null ? Number(r.unit_cost) * Number(r.quantity) : null,
      referenceType: r.reference_type,
      referenceId: r.reference_id,
      reason: r.notes || 'Inventory transaction',
      notes: r.notes,
      performedBy: r.created_by || 'staff',
      performedByName: 'Staff Officer',
      createdAt: r.created_at,
    };
  }

  // ============================================================================
  // INVENTORY BALANCES
  // ============================================================================

  public async getAllBalances(locationId?: string, productId?: string): Promise<InventoryBalance[]> {
    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const client = getSupabaseClient();
        const { data: sessionData } = await client.auth.getSession();
        let remoteRows: DbInventoryBalance[] | null = null;

        if (sessionData?.session) {
          let query = client.from('inventory_balances').select('*');
          if (locationId && locationId !== 'all') {
            query = query.eq('location_id', locationId);
          }
          if (productId) {
            query = query.eq('product_id', productId);
          }

          const { data, error } = await query;
          if (error) {
            if (isTableMissingError(error, 'inventory_balances')) {
              if (!this.warnedAboutMissingTable) {
                console.info('[InventoryRepository] Supabase inventory_balances table not available, using offline cache.');
                this.warnedAboutMissingTable = true;
              }
              this.isRemoteTableAvailable = false;
            } else if (!isPermissionOrAuthError(error)) {
              throw error;
            }
          } else if (data) {
            remoteRows = data;
          }
        }

        // Fall back to server API bridge if no active Supabase session (e.g. Sandbox Persona) or RLS blocked
        if (sessionData?.session && remoteRows === null && typeof fetch !== 'undefined') {
          const params = new URLSearchParams();
          if (locationId && locationId !== 'all') params.set('locationId', locationId);
          if (productId) params.set('productId', productId);
          const qs = params.toString() ? `?${params.toString()}` : '';
          const res = await fetch(`/api/inventory/balances${qs}`, {
            headers: createSupabaseAuthHeaders(sessionData.session.access_token),
          });
          if (res.ok) {
            const json = await res.json();
            if (json?.success && Array.isArray(json.data)) {
              remoteRows = json.data;
            }
          }
        }

        if (remoteRows !== null) {
          const mapped = remoteRows.map((r) => this.mapDbBalance(r));
          if ((!locationId || locationId === 'all') && !productId) {
            this.saveBalances(mapped);
          } else {
            const current = this.memoryBalances || [];
            const mergedMap = new Map<string, InventoryBalance>();
            current.forEach((b) => mergedMap.set(`${b.productId}:${b.variantId || 'base'}:${b.locationId}`, b));
            mapped.forEach((b) => mergedMap.set(`${b.productId}:${b.variantId || 'base'}:${b.locationId}`, b));
            this.saveBalances(Array.from(mergedMap.values()));
          }
          return mapped;
        }
      } catch (err) {
        console.warn('[InventoryRepository] Remote balances query failed, falling back to local cache:', err);
      }
    }

    let result = this.memoryBalances || [];
    if (locationId && locationId !== 'all') {
      result = result.filter((b) => b.locationId === locationId);
    }
    if (productId) {
      result = result.filter((b) => b.productId === productId);
    }
    return result;
  }

  public async getBalance(
    productId: string,
    variantId: string | null = null,
    locationId: string
  ): Promise<InventoryBalance | null> {
    const balances = await this.getAllBalances(locationId, productId);
    return (
      balances.find(
        (b) =>
          b.productId === productId &&
          (b.variantId || null) === (variantId || null) &&
          b.locationId === locationId
      ) || null
    );
  }

  private async saveBalanceToRemote(params: {
    id: string;
    productId: string;
    variantId: string | null;
    locationId: string;
    quantityOnHandDelta?: number;
    absoluteQuantityOnHand?: number;
    deltaReserved?: number;
    fallbackOnHand: number;
    fallbackReserved: number;
  }): Promise<InventoryBalance | null> {
    const client = getSupabaseClient();
    const { data: sessionData } = await client.auth.getSession();
    const now = new Date().toISOString();
    const cleanVariantId = params.variantId || null;

    if (sessionData?.session) {
      // Look up existing row manually because Postgres uses COALESCE expression unique index
      let findQuery = client
        .from('inventory_balances')
        .select('*')
        .eq('product_id', params.productId)
        .eq('location_id', params.locationId);

      if (cleanVariantId) {
        findQuery = findQuery.eq('variant_id', cleanVariantId);
      } else {
        findQuery = findQuery.is('variant_id', null);
      }

      const { data: existingRows, error: findErr } = await findQuery.limit(1);

      if (!findErr) {
        const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;
        if (existing) {
          const curOnHand = Number(existing.quantity_on_hand) || 0;
          const curReserved = Number(existing.quantity_reserved) || 0;
          const nextOnHand =
            params.absoluteQuantityOnHand !== undefined
              ? Math.max(0, params.absoluteQuantityOnHand)
              : params.quantityOnHandDelta !== undefined
              ? Math.max(0, curOnHand + params.quantityOnHandDelta)
              : curOnHand;
          const nextReserved =
            params.deltaReserved !== undefined
              ? Math.max(0, curReserved + params.deltaReserved)
              : curReserved;

          const { data: updatedRow, error: updErr } = await client
            .from('inventory_balances')
            .update({
              quantity_on_hand: nextOnHand,
              quantity_reserved: nextReserved,
              updated_at: now,
            })
            .eq('id', existing.id)
            .select()
            .single();

          if (!updErr && updatedRow) {
            return this.mapDbBalance(updatedRow);
          }
          if (updErr && !isPermissionOrAuthError(updErr)) {
            throw new Error(updErr.message || 'Failed to update inventory balance in database.');
          }
        } else {
          const { data: insertedRow, error: insErr } = await client
            .from('inventory_balances')
            .insert({
              id: isValidUuid(params.id) ? params.id : generateUuid(),
              product_id: params.productId,
              variant_id: cleanVariantId,
              location_id: params.locationId,
              quantity_on_hand: params.fallbackOnHand,
              quantity_reserved: params.fallbackReserved,
              updated_at: now,
            } as any)
            .select()
            .single();

          if (!insErr && insertedRow) {
            return this.mapDbBalance(insertedRow);
          }
          // Handle concurrent insert race on unique index
          if (insErr?.code === '23505') {
            let retryQuery = client
              .from('inventory_balances')
              .select('*')
              .eq('product_id', params.productId)
              .eq('location_id', params.locationId);
            retryQuery = cleanVariantId
              ? retryQuery.eq('variant_id', cleanVariantId)
              : retryQuery.is('variant_id', null);
            const { data: retryRows } = await retryQuery.limit(1);
            if (retryRows && retryRows[0]) {
              const ex = retryRows[0];
              const nextOnHand =
                params.absoluteQuantityOnHand !== undefined
                  ? Math.max(0, params.absoluteQuantityOnHand)
                  : params.quantityOnHandDelta !== undefined
                  ? Math.max(0, Number(ex.quantity_on_hand) + params.quantityOnHandDelta)
                  : Number(ex.quantity_on_hand);
              const nextReserved =
                params.deltaReserved !== undefined
                  ? Math.max(0, Number(ex.quantity_reserved) + params.deltaReserved)
                  : Number(ex.quantity_reserved);
              const { data: updAfterRace, error: updRaceErr } = await client
                .from('inventory_balances')
                .update({ quantity_on_hand: nextOnHand, quantity_reserved: nextReserved, updated_at: now })
                .eq('id', ex.id)
                .select()
                .single();
              if (!updRaceErr && updAfterRace) {
                return this.mapDbBalance(updAfterRace);
              }
            }
          }
          if (insErr && !isPermissionOrAuthError(insErr)) {
            if (isTableMissingError(insErr, 'inventory_balances')) {
              this.isRemoteTableAvailable = false;
              return null;
            }
            throw new Error(insErr.message || 'Failed to insert inventory balance in database.');
          }
        }
      } else if (!isPermissionOrAuthError(findErr)) {
        if (isTableMissingError(findErr, 'inventory_balances')) {
          this.isRemoteTableAvailable = false;
          return null;
        }
        throw new Error(findErr.message || 'Failed to query inventory balance.');
      }
    }

    // Use the server bridge only for authenticated sessions rejected by direct RLS.
    if (!sessionData?.session) return null;
    if (typeof fetch !== 'undefined') {
      const res = await fetch('/api/inventory/balance', {
        method: 'POST',
        headers: createSupabaseAuthHeaders(sessionData.session.access_token, true),
        body: JSON.stringify({
          id: isValidUuid(params.id) ? params.id : generateUuid(),
          productId: params.productId,
          variantId: cleanVariantId,
          locationId: params.locationId,
          quantityOnHandDelta: params.quantityOnHandDelta,
          absoluteQuantityOnHand: params.absoluteQuantityOnHand,
          deltaReserved: params.deltaReserved,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `Server error updating inventory balance (HTTP ${res.status}).`);
      }
      if (json.data) {
        return this.mapDbBalance(json.data);
      }
    }

    return null;
  }

  private async upsertBalanceInStore(
    productId: string,
    variantId: string | null = null,
    locationId: string,
    quantityOnHandDelta: number,
    absoluteQuantityOnHand?: number
  ): Promise<InventoryBalance> {
    const balances = [...(this.memoryBalances || [])];
    const index = balances.findIndex(
      (b) =>
        b.productId === productId &&
        (b.variantId || null) === (variantId || null) &&
        b.locationId === locationId
    );

    let updated: InventoryBalance;
    const now = new Date().toISOString();

    if (index >= 0) {
      const current = balances[index];
      const newOnHand =
        absoluteQuantityOnHand !== undefined
          ? absoluteQuantityOnHand
          : Math.max(0, current.quantityOnHand + quantityOnHandDelta);

      updated = {
        ...current,
        id: isValidUuid(current.id) ? current.id : generateUuid(),
        quantityOnHand: newOnHand,
        updatedAt: now,
      };
    } else {
      const initialOnHand =
        absoluteQuantityOnHand !== undefined
          ? absoluteQuantityOnHand
          : Math.max(0, quantityOnHandDelta);

      updated = {
        id: generateUuid(),
        productId,
        variantId: variantId || null,
        locationId,
        quantityOnHand: initialOnHand,
        quantityReserved: 0,
        updatedAt: now,
      };
    }

    // Sync to Supabase (or server bridge) BEFORE committing optimistic cache on online errors
    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const remoteResult = await this.saveBalanceToRemote({
          id: updated.id,
          productId,
          variantId: variantId || null,
          locationId,
          quantityOnHandDelta: absoluteQuantityOnHand === undefined ? quantityOnHandDelta : undefined,
          absoluteQuantityOnHand,
          fallbackOnHand: updated.quantityOnHand,
          fallbackReserved: updated.quantityReserved,
        });
        if (remoteResult) {
          updated = remoteResult;
        }
      } catch (err: any) {
        const offline =
          (typeof navigator !== 'undefined' && !navigator.onLine) || isNetworkOrFetchError(err);
        if (!offline && this.isRemoteTableAvailable) {
          throw err;
        }
        console.warn('[InventoryRepository] Offline/unreachable remote balance save, cached locally:', err);
      }
    }

    if (index >= 0) {
      balances[index] = updated;
    } else {
      balances.push(updated);
    }
    this.saveBalances(balances);

    return updated;
  }

  // ============================================================================
  // STOCK MOVEMENTS
  // ============================================================================

  public async getAllMovements(filters?: {
    locationId?: string;
    productId?: string;
    variantId?: string;
    movementType?: StockMovementType;
  }): Promise<StockMovement[]> {
    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const client = getSupabaseClient();
        const { data: sessionData } = await client.auth.getSession();
        let remoteRows: any[] | null = null;

        if (sessionData?.session) {
          let query = client.from('stock_movements').select('*').order('created_at', { ascending: false });

          if (filters?.locationId && filters.locationId !== 'all') {
            query = query.or(`source_location_id.eq.${filters.locationId},destination_location_id.eq.${filters.locationId}`);
          }
          if (filters?.productId) {
            query = query.eq('product_id', filters.productId);
          }
          if (filters?.variantId) {
            query = query.eq('variant_id', filters.variantId);
          }
          if (filters?.movementType) {
            query = query.eq('movement_type', filters.movementType);
          }

          const { data, error } = await query;
          if (!error && data) {
            remoteRows = data;
          } else if (error && isTableMissingError(error, 'stock_movements')) {
            this.isRemoteTableAvailable = false;
          }
        }

        if (sessionData?.session && remoteRows === null && typeof fetch !== 'undefined') {
          const params = new URLSearchParams();
          if (filters?.locationId && filters.locationId !== 'all') params.set('locationId', filters.locationId);
          if (filters?.productId) params.set('productId', filters.productId);
          if (filters?.variantId) params.set('variantId', filters.variantId);
          if (filters?.movementType) params.set('movementType', filters.movementType);
          const qs = params.toString() ? `?${params.toString()}` : '';
          const res = await fetch(`/api/inventory/movements${qs}`, {
            headers: createSupabaseAuthHeaders(sessionData.session.access_token),
          });
          if (res.ok) {
            const json = await res.json();
            if (json?.success && Array.isArray(json.data)) {
              remoteRows = json.data;
            }
          }
        }

        if (remoteRows !== null) {
          const mapped: StockMovement[] = remoteRows.map((r: any) => this.mapDbMovement(r));

          const current = this.memoryMovements || [];
          const mappedById = new Map<string, StockMovement>();
          mapped.forEach((m) => {
            const cachedMatch = current.find((c) => c.id === m.id);
            mappedById.set(m.id, {
              ...m,
              reason: cachedMatch?.reason || m.reason,
              performedByName: cachedMatch?.performedByName || m.performedByName,
            });
          });
          const enrichedMapped = Array.from(mappedById.values());

          if (!filters?.locationId && !filters?.productId && !filters?.variantId && !filters?.movementType) {
            this.saveMovements(enrichedMapped);
          }
          return enrichedMapped;
        }
      } catch (err) {
        console.warn('[InventoryRepository] Remote movements query failed, using local store:', err);
      }
    }

    let movements = this.memoryMovements || [];
    if (filters?.locationId && filters.locationId !== 'all') {
      movements = movements.filter(
        (m) => m.sourceLocationId === filters.locationId || m.destinationLocationId === filters.locationId
      );
    }
    if (filters?.productId) {
      movements = movements.filter((m) => m.productId === filters.productId);
    }
    if (filters?.variantId) {
      movements = movements.filter((m) => m.variantId === filters.variantId);
    }
    if (filters?.movementType) {
      movements = movements.filter((m) => m.movementType === filters.movementType);
    }
    return movements;
  }

  private async recordMovement(movement: StockMovement): Promise<void> {
    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable && movement.quantity > 0) {
      try {
        const client = getSupabaseClient();
        const { data: sessionData } = await client.auth.getSession();

        const allowedTypes = new Set([
          'opening_balance',
          'received',
          'issued',
          'transfer',
          'adjustment',
          'wastage',
          'return',
          'damaged',
        ]);
        let dbMovementType: string = movement.movementType;
        if (!allowedTypes.has(dbMovementType)) {
          if (dbMovementType === 'stock_count_reconciliation') dbMovementType = 'adjustment';
          else if (dbMovementType === 'pos_sale') dbMovementType = 'issued';
          else dbMovementType = 'adjustment';
        }

        let safeCreatedBy: string | null = isValidUuid(movement.performedBy) ? movement.performedBy : null;
        let movementNumber = movement.movementNumber;
        const safeId = isValidUuid(movement.id) ? movement.id : generateUuid();
        movement.id = safeId;

        const buildPayload = () => ({
          id: safeId,
          movement_number: movementNumber,
          movement_type: dbMovementType,
          product_id: movement.productId,
          variant_id: isValidUuid(movement.variantId) ? movement.variantId : null,
          source_location_id: isValidUuid(movement.sourceLocationId) ? movement.sourceLocationId : null,
          destination_location_id: isValidUuid(movement.destinationLocationId) ? movement.destinationLocationId : null,
          quantity: movement.quantity,
          unit_cost: movement.unitCost,
          reference_type: movement.referenceType,
          reference_id: movement.referenceId,
          notes: movement.notes || movement.reason,
          created_by: safeCreatedBy,
          created_at: movement.createdAt,
        });

        let savedRemotely = false;
        let needsServerFallback = false;

        if (sessionData?.session) {
          let { error } = await client.from('stock_movements').insert(buildPayload() as any);

          // Retry if created_by violates auth.users FK
          if (error && error.code === '23503' && safeCreatedBy !== null) {
            safeCreatedBy = null;
            const retry = await client.from('stock_movements').insert(buildPayload() as any);
            error = retry.error;
          }

          // Retry if movement_number collides
          if (error && error.code === '23505') {
            movementNumber = `${movementNumber}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            movement.movementNumber = movementNumber;
            const retry = await client.from('stock_movements').insert(buildPayload() as any);
            error = retry.error;
          }

          if (!error) {
            savedRemotely = true;
          } else if (isTableMissingError(error, 'stock_movements')) {
            this.isRemoteTableAvailable = false;
          } else if (isPermissionOrAuthError(error)) {
            needsServerFallback = true;
          } else {
            throw new Error(error.message || 'Failed to record stock movement in database.');
          }
        }

        if (!savedRemotely && needsServerFallback && sessionData?.session && typeof fetch !== 'undefined') {
          const res = await fetch('/api/inventory/movement', {
            method: 'POST',
            headers: createSupabaseAuthHeaders(sessionData.session.access_token, true),
            body: JSON.stringify(movement),
          });
          const json = await res.json().catch(() => null);
          if (!res.ok || !json?.success) {
            throw new Error(json?.error || `Server error recording stock movement (HTTP ${res.status}).`);
          }
        }
      } catch (err: any) {
        const offline =
          (typeof navigator !== 'undefined' && !navigator.onLine) || isNetworkOrFetchError(err);
        if (!offline && this.isRemoteTableAvailable) {
          throw err;
        }
        console.warn('[InventoryRepository] Offline/unreachable remote movement insert, cached locally:', err);
      }
    }

    const list = [movement, ...(this.memoryMovements || [])];
    this.saveMovements(list);
  }

  // ============================================================================
  // ATOMIC STOCK TRANSACTIONS
  // ============================================================================

  /**
   * Stock Receipt: increases quantityOnHand at destination location
   */
  public async executeReceive(
    dto: ReceiveStockDTO,
    context: { productName: string; variantName: string | null; sku: string; unit: string; locationName: string }
  ): Promise<{ balance: InventoryBalance; movement: StockMovement }> {
    if (dto.quantity <= 0) {
      throw new Error('Received quantity must be greater than zero.');
    }

    const movement: StockMovement = {
      id: generateUuid(),
      movementNumber: this.generateMovementNumber(),
      movementType: 'received',
      productId: dto.productId,
      variantId: dto.variantId || null,
      productName: context.productName,
      variantName: context.variantName,
      sku: context.sku,
      unit: context.unit,
      sourceLocationId: null,
      sourceLocationName: null,
      destinationLocationId: dto.destinationLocationId,
      destinationLocationName: context.locationName,
      quantity: dto.quantity,
      unitCost: dto.unitCost || null,
      totalCost: dto.unitCost ? dto.unitCost * dto.quantity : null,
      referenceType: dto.referenceType || 'purchase_or_production',
      referenceId: dto.referenceId || null,
      reason: dto.reason,
      notes: dto.notes || null,
      performedBy: dto.performedBy,
      performedByName: dto.performedByName,
      createdAt: new Date().toISOString(),
    };

    const balance = await this.upsertBalanceInStore(
      dto.productId,
      dto.variantId || null,
      dto.destinationLocationId,
      dto.quantity
    );

    await this.recordMovement(movement);
    return { balance, movement };
  }

  /**
   * Stock Issue: decreases quantityOnHand at source location (validates available stock)
   */
  public async executeIssue(
    dto: IssueStockDTO,
    context: { productName: string; variantName: string | null; sku: string; unit: string; locationName: string }
  ): Promise<{ balance: InventoryBalance; movement: StockMovement }> {
    if (dto.quantity <= 0) {
      throw new Error('Issued quantity must be greater than zero.');
    }

    const currentBalance = await this.getBalance(
      dto.productId,
      dto.variantId || null,
      dto.sourceLocationId
    );

    const onHand = currentBalance?.quantityOnHand || 0;
    const reserved = currentBalance?.quantityReserved || 0;
    const available = Math.max(0, onHand - reserved);

    if (dto.quantity > available) {
      throw new Error(
        `Insufficient stock at ${context.locationName}. Available: ${available} ${context.unit}, requested: ${dto.quantity} ${context.unit}.`
      );
    }

    const movement: StockMovement = {
      id: generateUuid(),
      movementNumber: this.generateMovementNumber(),
      movementType: 'issued',
      productId: dto.productId,
      variantId: dto.variantId || null,
      productName: context.productName,
      variantName: context.variantName,
      sku: context.sku,
      unit: context.unit,
      sourceLocationId: dto.sourceLocationId,
      sourceLocationName: context.locationName,
      destinationLocationId: null,
      destinationLocationName: null,
      quantity: dto.quantity,
      unitCost: null,
      totalCost: null,
      referenceType: 'operational_issue',
      referenceId: null,
      reason: dto.reason,
      notes: dto.notes || null,
      performedBy: dto.performedBy,
      performedByName: dto.performedByName,
      createdAt: new Date().toISOString(),
    };

    const balance = await this.upsertBalanceInStore(
      dto.productId,
      dto.variantId || null,
      dto.sourceLocationId,
      -dto.quantity
    );

    await this.recordMovement(movement);
    return { balance, movement };
  }

  /**
   * Stock Transfer: atomically decreases source location and increases destination location
   */
  public async executeTransfer(
    dto: TransferStockDTO,
    context: {
      productName: string;
      variantName: string | null;
      sku: string;
      unit: string;
      sourceLocationName: string;
      destinationLocationName: string;
    }
  ): Promise<{ sourceBalance: InventoryBalance; destinationBalance: InventoryBalance; movement: StockMovement }> {
    if (dto.sourceLocationId === dto.destinationLocationId) {
      throw new Error('Source location and destination location cannot be the same.');
    }
    if (dto.quantity <= 0) {
      throw new Error('Transfer quantity must be greater than zero.');
    }

    const currentSource = await this.getBalance(
      dto.productId,
      dto.variantId || null,
      dto.sourceLocationId
    );

    const onHand = currentSource?.quantityOnHand || 0;
    const reserved = currentSource?.quantityReserved || 0;
    const available = Math.max(0, onHand - reserved);

    if (dto.quantity > available) {
      throw new Error(
        `Insufficient available stock at ${context.sourceLocationName} (${available} ${context.unit}) for transfer of ${dto.quantity} ${context.unit}.`
      );
    }

    const movement: StockMovement = {
      id: generateUuid(),
      movementNumber: this.generateMovementNumber(),
      movementType: 'transfer',
      productId: dto.productId,
      variantId: dto.variantId || null,
      productName: context.productName,
      variantName: context.variantName,
      sku: context.sku,
      unit: context.unit,
      sourceLocationId: dto.sourceLocationId,
      sourceLocationName: context.sourceLocationName,
      destinationLocationId: dto.destinationLocationId,
      destinationLocationName: context.destinationLocationName,
      quantity: dto.quantity,
      unitCost: null,
      totalCost: null,
      referenceType: 'inter_location_transfer',
      referenceId: null,
      reason: dto.reason,
      notes: dto.notes || null,
      performedBy: dto.performedBy,
      performedByName: dto.performedByName,
      createdAt: new Date().toISOString(),
    };

    // Atomic execution
    const sourceBalance = await this.upsertBalanceInStore(
      dto.productId,
      dto.variantId || null,
      dto.sourceLocationId,
      -dto.quantity
    );

    const destinationBalance = await this.upsertBalanceInStore(
      dto.productId,
      dto.variantId || null,
      dto.destinationLocationId,
      dto.quantity
    );

    await this.recordMovement(movement);
    return { sourceBalance, destinationBalance, movement };
  }

  /**
   * Inventory Adjustment: sets new actual quantity on hand with discrepancy notes
   */
  public async executeAdjustment(
    dto: AdjustStockDTO,
    context: { productName: string; variantName: string | null; sku: string; unit: string; locationName: string }
  ): Promise<{ balance: InventoryBalance; movement: StockMovement }> {
    if (dto.newQuantityOnHand < 0) {
      throw new Error('Stock on hand cannot be adjusted to a negative value.');
    }

    const currentBalance = await this.getBalance(
      dto.productId,
      dto.variantId || null,
      dto.locationId
    );

    const currentOnHand = currentBalance?.quantityOnHand || 0;
    const delta = dto.newQuantityOnHand - currentOnHand;

    if (delta === 0) {
      throw new Error('New physical count is identical to existing recorded quantity. No adjustment needed.');
    }

    const movement: StockMovement = {
      id: generateUuid(),
      movementNumber: this.generateMovementNumber(),
      movementType: 'adjustment',
      productId: dto.productId,
      variantId: dto.variantId || null,
      productName: context.productName,
      variantName: context.variantName,
      sku: context.sku,
      unit: context.unit,
      sourceLocationId: delta < 0 ? dto.locationId : null,
      sourceLocationName: delta < 0 ? context.locationName : null,
      destinationLocationId: delta > 0 ? dto.locationId : null,
      destinationLocationName: delta > 0 ? context.locationName : null,
      quantity: Math.abs(delta),
      unitCost: null,
      totalCost: null,
      referenceType: 'physical_inventory_count_adjustment',
      referenceId: null,
      reason: `${dto.reason} (Count adjusted from ${currentOnHand} to ${dto.newQuantityOnHand} ${context.unit})`,
      notes: dto.notes || null,
      performedBy: dto.performedBy,
      performedByName: dto.performedByName,
      createdAt: new Date().toISOString(),
    };

    const balance = await this.upsertBalanceInStore(
      dto.productId,
      dto.variantId || null,
      dto.locationId,
      0,
      dto.newQuantityOnHand
    );

    await this.recordMovement(movement);
    return { balance, movement };
  }

  /**
   * Opening Balance Entry: records initial physical stock setup
   */
  public async executeOpeningBalance(
    dto: OpeningBalanceDTO,
    context: { productName: string; variantName: string | null; sku: string; unit: string; locationName: string }
  ): Promise<{ balance: InventoryBalance; movement: StockMovement }> {
    if (dto.openingQuantity < 0) {
      throw new Error('Opening balance quantity cannot be negative.');
    }

    const movement: StockMovement = {
      id: generateUuid(),
      movementNumber: this.generateMovementNumber(),
      movementType: 'opening_balance',
      productId: dto.productId,
      variantId: dto.variantId || null,
      productName: context.productName,
      variantName: context.variantName,
      sku: context.sku,
      unit: context.unit,
      sourceLocationId: null,
      sourceLocationName: null,
      destinationLocationId: dto.locationId,
      destinationLocationName: context.locationName,
      quantity: dto.openingQuantity,
      unitCost: dto.unitCost || null,
      totalCost: dto.unitCost ? dto.unitCost * dto.openingQuantity : null,
      referenceType: 'initial_stock_setup',
      referenceId: null,
      reason: 'Initial Opening Balance Entry',
      notes: dto.notes || null,
      performedBy: dto.performedBy,
      performedByName: dto.performedByName,
      createdAt: new Date().toISOString(),
    };

    const balance = await this.upsertBalanceInStore(
      dto.productId,
      dto.variantId || null,
      dto.locationId,
      0,
      dto.openingQuantity
    );

    await this.recordMovement(movement);
    return { balance, movement };
  }

  /**
   * Stock Count Reconciliation: adjusts inventory to approved physical count with full auditability
   */
  public async executeReconciliationMovement(params: {
    productId: string;
    variantId?: string | null;
    locationId: string;
    approvedQuantity: number;
    countNumber: string;
    countSessionId: string;
    reason?: string;
    notes?: string;
    performedBy: string;
    performedByName: string;
    context: {
      productName: string;
      variantName: string | null;
      sku: string;
      unit: string;
      locationName: string;
    };
  }): Promise<{ balance: InventoryBalance; movement: StockMovement }> {
    if (params.approvedQuantity < 0) {
      throw new Error('Approved physical count cannot be negative.');
    }

    const currentBalance = await this.getBalance(
      params.productId,
      params.variantId || null,
      params.locationId
    );

    const currentOnHand = currentBalance?.quantityOnHand || 0;
    const delta = params.approvedQuantity - currentOnHand;

    const movement: StockMovement = {
      id: generateUuid(),
      movementNumber: this.generateMovementNumber(),
      movementType: 'stock_count_reconciliation',
      productId: params.productId,
      variantId: params.variantId || null,
      productName: params.context.productName,
      variantName: params.context.variantName,
      sku: params.context.sku,
      unit: params.context.unit,
      sourceLocationId: delta < 0 ? params.locationId : null,
      sourceLocationName: delta < 0 ? params.context.locationName : null,
      destinationLocationId: delta > 0 ? params.locationId : null,
      destinationLocationName: delta > 0 ? params.context.locationName : null,
      quantity: Math.abs(delta),
      unitCost: null,
      totalCost: null,
      referenceType: 'stock_count_session',
      referenceId: params.countNumber,
      reason:
        params.reason ||
        `Stock Count Reconciliation (${params.countNumber}): adjusted from ${currentOnHand} to ${params.approvedQuantity} ${params.context.unit}`,
      notes: params.notes || null,
      performedBy: params.performedBy,
      performedByName: params.performedByName,
      createdAt: new Date().toISOString(),
    };

    const balance = await this.upsertBalanceInStore(
      params.productId,
      params.variantId || null,
      params.locationId,
      0,
      params.approvedQuantity
    );

    await this.recordMovement(movement);
    return { balance, movement };
  }

  /**
   * Atomic POS sale inventory deduction across all sale items
   * Validates available stock for all items before decrementing balances and recording movements.
   */
  public async executePosSaleDeduction(params: {
    saleId: string;
    saleReference: string;
    locationId: string;
    locationName: string;
    items: Array<{
      productId: string;
      variantId: string | null;
      productName: string;
      variantName: string | null;
      sku: string;
      unit: string;
      quantity: number;
    }>;
    performedBy?: string;
    performedByName?: string;
  }): Promise<StockMovement[]> {
    const { saleId, saleReference, locationId, locationName, items, performedBy, performedByName } = params;

    // 1. Validation pass: ensure all items have sufficient available stock
    for (const item of items) {
      if (item.quantity <= 0) {
        throw new Error(`Item ${item.productName} has an invalid quantity (${item.quantity}).`);
      }
      const currentBalance = await this.getBalance(item.productId, item.variantId, locationId);
      const onHand = currentBalance?.quantityOnHand || 0;
      const reserved = currentBalance?.quantityReserved || 0;
      const available = Math.max(0, onHand - reserved);

      if (item.quantity > available) {
        const itemLabel = item.variantName ? `${item.productName} (${item.variantName})` : item.productName;
        throw new Error(
          `Insufficient stock at ${locationName} for "${itemLabel}". Available: ${available} ${item.unit}, requested: ${item.quantity} ${item.unit}.`
        );
      }
    }

    // 2. Execution pass: deduct balances and record movements
    const movements: StockMovement[] = [];
    const now = new Date().toISOString();

    for (const item of items) {
      const movement: StockMovement = {
        id: generateUuid(),
        movementNumber: this.generateMovementNumber(),
        movementType: 'pos_sale',
        productId: item.productId,
        variantId: item.variantId || null,
        productName: item.productName,
        variantName: item.variantName || null,
        sku: item.sku,
        unit: item.unit,
        sourceLocationId: locationId,
        sourceLocationName: locationName,
        destinationLocationId: null,
        destinationLocationName: null,
        quantity: item.quantity,
        unitCost: null,
        totalCost: null,
        referenceType: 'pos_sale',
        referenceId: saleId,
        reason: `POS Counter Sale (${saleReference})`,
        notes: `Sold via counter checkout by ${performedByName || 'Cashier'}`,
        performedBy: performedBy || 'usr-cashier',
        performedByName: performedByName || 'POS Cashier',
        createdAt: now,
      };

      await this.upsertBalanceInStore(
        item.productId,
        item.variantId || null,
        locationId,
        -item.quantity
      );

      await this.recordMovement(movement);
      movements.push(movement);
    }

    return movements;
  }

  /**
   * Restores inventory when a POS sale is cancelled or refunded
   */
  public async executePosSaleRestoration(params: {
    saleId: string;
    saleReference: string;
    locationId: string;
    locationName: string;
    items: Array<{
      productId: string;
      variantId: string | null;
      productName: string;
      variantName: string | null;
      sku: string;
      unit: string;
      quantity: number;
    }>;
    reason?: string;
    performedBy?: string;
    performedByName?: string;
  }): Promise<StockMovement[]> {
    const { saleId, saleReference, locationId, locationName, items, reason, performedBy, performedByName } = params;
    const movements: StockMovement[] = [];
    const now = new Date().toISOString();

    for (const item of items) {
      const movement: StockMovement = {
        id: generateUuid(),
        movementNumber: this.generateMovementNumber(),
        movementType: 'return',
        productId: item.productId,
        variantId: item.variantId || null,
        productName: item.productName,
        variantName: item.variantName || null,
        sku: item.sku,
        unit: item.unit,
        sourceLocationId: null,
        sourceLocationName: null,
        destinationLocationId: locationId,
        destinationLocationName: locationName,
        quantity: item.quantity,
        unitCost: null,
        totalCost: null,
        referenceType: 'pos_sale_void',
        referenceId: saleId,
        reason: reason || `POS Sale Void / Cancelled (${saleReference})`,
        notes: `Inventory restored from cancelled POS sale #${saleReference}`,
        performedBy: performedBy || 'usr-system',
        performedByName: performedByName || 'System',
        createdAt: now,
      };

      await this.upsertBalanceInStore(
        item.productId,
        item.variantId || null,
        locationId,
        item.quantity
      );

      await this.recordMovement(movement);
      movements.push(movement);
    }

    return movements;
  }

  /**
   * Adjusts the reserved quantity for a product/variant at a location.
   * Positive delta reserves stock; negative delta releases reserved stock.
   */
  public async adjustReservedStock(
    productId: string,
    variantId: string | null = null,
    locationId: string,
    deltaReserved: number
  ): Promise<InventoryBalance> {
    const balances = [...(this.memoryBalances || [])];
    const index = balances.findIndex(
      (b) =>
        b.productId === productId &&
        (b.variantId || null) === (variantId || null) &&
        b.locationId === locationId
    );

    let updated: InventoryBalance;
    const now = new Date().toISOString();

    if (index >= 0) {
      const current = balances[index];
      const newReserved = Math.max(0, current.quantityReserved + deltaReserved);
      updated = {
        ...current,
        id: isValidUuid(current.id) ? current.id : generateUuid(),
        quantityReserved: newReserved,
        updatedAt: now,
      };
    } else {
      updated = {
        id: generateUuid(),
        productId,
        variantId: variantId || null,
        locationId,
        quantityOnHand: 0,
        quantityReserved: Math.max(0, deltaReserved),
        updatedAt: now,
      };
    }

    // Sync to Supabase (or server bridge) BEFORE committing optimistic cache on online errors
    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const remoteResult = await this.saveBalanceToRemote({
          id: updated.id,
          productId,
          variantId: variantId || null,
          locationId,
          deltaReserved,
          fallbackOnHand: updated.quantityOnHand,
          fallbackReserved: updated.quantityReserved,
        });
        if (remoteResult) {
          updated = remoteResult;
        }
      } catch (err: any) {
        const offline =
          (typeof navigator !== 'undefined' && !navigator.onLine) || isNetworkOrFetchError(err);
        if (!offline && this.isRemoteTableAvailable) {
          throw err;
        }
        console.warn('[InventoryRepository] Remote reserved stock update failed (offline cache):', err);
      }
    }

    if (index >= 0) {
      balances[index] = updated;
    } else {
      balances.push(updated);
    }
    this.saveBalances(balances);

    return updated;
  }

  /**
   * Executes inventory deduction and reservation release when a warehouse fulfilment is dispatched.
   * Atomically decreases quantityOnHand by the dispatched quantity, decreases quantityReserved by the allocated quantity,
   * and records an 'issue' / 'dispatch' StockMovement.
   */
  public async executeFulfilmentDispatch(params: {
    fulfilmentId: string;
    fulfilmentNumber: string;
    orderId: string;
    orderNumber: string;
    locationId: string;
    locationName: string;
    items: Array<{
      productId: string;
      variantId: string | null;
      productName: string;
      variantName: string | null;
      sku: string;
      unit: string;
      quantity: number;
    }>;
    performedBy?: string;
    performedByName?: string;
  }): Promise<StockMovement[]> {
    const { fulfilmentId, fulfilmentNumber, orderId, orderNumber, locationId, locationName, items, performedBy, performedByName } = params;
    const movements: StockMovement[] = [];
    const now = new Date().toISOString();

    for (const item of items) {
      if (item.quantity <= 0) continue;

      // 1. Record stock movement
      const movement: StockMovement = {
        id: generateUuid(),
        movementNumber: this.generateMovementNumber(),
        movementType: 'issued',
        productId: item.productId,
        variantId: item.variantId || null,
        productName: item.productName,
        variantName: item.variantName || null,
        sku: item.sku,
        unit: item.unit,
        sourceLocationId: locationId,
        sourceLocationName: locationName,
        destinationLocationId: null,
        destinationLocationName: null,
        quantity: item.quantity,
        unitCost: null,
        totalCost: null,
        referenceType: 'order_fulfilment',
        referenceId: fulfilmentId,
        reason: `Dispatched for Order #${orderNumber} (Fulfilment #${fulfilmentNumber})`,
        notes: `Physical yard release for site delivery/customer pickup. Waybill assigned.`,
        performedBy: performedBy || 'usr-warehouse',
        performedByName: performedByName || 'Warehouse Dispatcher',
        createdAt: now,
      };

      // 2. Atomically adjust balance: onHand decreased by item.quantity, reserved decreased by item.quantity
      const balances = [...(this.memoryBalances || [])];
      const index = balances.findIndex(
        (b) =>
          b.productId === item.productId &&
          (b.variantId || null) === (item.variantId || null) &&
          b.locationId === locationId
      );

      if (index >= 0) {
        const cur = balances[index];
        const newOnHand = Math.max(0, cur.quantityOnHand - item.quantity);
        const newReserved = Math.max(0, cur.quantityReserved - item.quantity);
        let updatedBal: InventoryBalance = {
          ...cur,
          id: isValidUuid(cur.id) ? cur.id : generateUuid(),
          quantityOnHand: newOnHand,
          quantityReserved: newReserved,
          updatedAt: now,
        };

        if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
          try {
            const remoteResult = await this.saveBalanceToRemote({
              id: updatedBal.id,
              productId: item.productId,
              variantId: item.variantId || null,
              locationId,
              quantityOnHandDelta: -item.quantity,
              deltaReserved: -item.quantity,
              fallbackOnHand: newOnHand,
              fallbackReserved: newReserved,
            });
            if (remoteResult) {
              updatedBal = remoteResult;
            }
          } catch (err: any) {
            const offline =
              (typeof navigator !== 'undefined' && !navigator.onLine) || isNetworkOrFetchError(err);
            if (!offline && this.isRemoteTableAvailable) {
              throw err;
            }
            console.warn('[InventoryRepository] Remote dispatch balance update failed (offline cache):', err);
          }
        }

        balances[index] = updatedBal;
        this.saveBalances(balances);
      } else {
        await this.upsertBalanceInStore(item.productId, item.variantId || null, locationId, -item.quantity);
      }

      await this.recordMovement(movement);
      movements.push(movement);
    }

    return movements;
  }

  /**
   * Releases allocated stock reservations when a fulfilment is cancelled
   */
  public async executeFulfilmentRelease(params: {
    fulfilmentId: string;
    fulfilmentNumber: string;
    locationId: string;
    items: Array<{
      productId: string;
      variantId: string | null;
      quantity: number;
    }>;
  }): Promise<void> {
    for (const item of params.items) {
      if (item.quantity > 0) {
        await this.adjustReservedStock(item.productId, item.variantId, params.locationId, -item.quantity);
      }
    }
  }
}

export const inventoryRepository = new InventoryRepository();
