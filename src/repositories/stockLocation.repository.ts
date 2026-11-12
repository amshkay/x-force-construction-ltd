/**
 * Stock Location Repository
 * Module 11 — Inventory & Stock Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Manages physical stock storage locations (Warehouses, Curing Bays, Showrooms).
 * Multi-tier persistence: Supabase remote table with resilient local storage fallback.
 */

import {
  createSupabaseAuthHeaders,
  getSupabaseClient,
  isNetworkOrFetchError,
  isTableMissingError,
} from '../lib/supabase/client';
import { appConfig } from '../config/app.config';
import { localStore } from '../lib/storage/localStorage';
import { StockLocation, StockLocationFormData } from '../types/inventory';
import { DbStockLocation } from '../types/database';

const STOCK_LOCATIONS_STORAGE_KEY = 'xforce_stock_locations_v1';
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

export const INITIAL_FOUNDATIONAL_LOCATIONS: StockLocation[] = [
  {
    id: 'loc-1000-0000-0000-0000-000000000001',
    name: 'Main Manufacturing Yard & Warehouse',
    code: 'WH-MAIN',
    description: 'Primary industrial manufacturing yard, hydraulic press bays, and bulk cured stock depot.',
    address: 'Plot 12, Industrial Layout, Emene, Enugu State, Nigeria',
    isActive: true,
    isDefault: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'loc-1000-0000-0000-0000-000000000002',
    name: 'Display Center & Showroom Depot',
    code: 'SHOWROOM',
    description: 'Commercial showroom, sample racks, and walk-in customer exhibition floor.',
    address: '14 Ogui Road, Commercial District, Enugu State, Nigeria',
    isActive: true,
    isDefault: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'loc-1000-0000-0000-0000-000000000003',
    name: 'Hydraulic Curing Bay & Staging Zone',
    code: 'BAY-CURING',
    description: 'Moisture-controlled curing sheds for 14-day and 28-day hydration strength attainment.',
    address: 'Factory Yard Sector B, Emene Industrial Layout, Enugu State',
    isActive: true,
    isDefault: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

export class StockLocationRepository {
  private isRemoteTableAvailable: boolean = true;
  private warnedAboutMissingTable: boolean = false;
  private memoryLocations: StockLocation[] | null = null;

  constructor() {
    this.initCache();
  }

  private initCache(): void {
    const stored = localStore.get<StockLocation[] | null>(STOCK_LOCATIONS_STORAGE_KEY, null);
    if (!stored || stored.length === 0) {
      this.memoryLocations = appConfig.supabase.isConfigured ? [] : INITIAL_FOUNDATIONAL_LOCATIONS;
      if (!appConfig.supabase.isConfigured) {
        localStore.set(STOCK_LOCATIONS_STORAGE_KEY, INITIAL_FOUNDATIONAL_LOCATIONS);
      }
    } else {
      // Strip legacy placeholder non-UUID locations when Supabase is configured
      const validStored = appConfig.supabase.isConfigured
        ? stored.filter((l) => isValidUuid(l.id))
        : stored;
      this.memoryLocations = validStored;
      if (validStored.length !== stored.length) {
        localStore.set(STOCK_LOCATIONS_STORAGE_KEY, validStored);
      }
    }
  }

  private saveToLocalStorage(locations: StockLocation[]): void {
    this.memoryLocations = locations;
    localStore.set(STOCK_LOCATIONS_STORAGE_KEY, locations);
  }

  private mapDbRowToLocation(row: DbStockLocation): StockLocation {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      description: null,
      address: row.address,
      isActive: row.is_active,
      isDefault: row.is_default,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  public async getAllLocations(): Promise<StockLocation[]> {
    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const client = getSupabaseClient();
        const { data: sessionData } = await client.auth.getSession();
        let remoteRows: any[] | null = null;

        if (sessionData?.session) {
          const { data, error } = await client
            .from('stock_locations')
            .select('*')
            .order('name', { ascending: true });

          if (!error && data) {
            remoteRows = data;
          } else if (error && isTableMissingError(error, 'stock_locations')) {
            if (!this.warnedAboutMissingTable) {
              console.info('[StockLocationRepository] Supabase stock_locations table not available, using offline cache.');
              this.warnedAboutMissingTable = true;
            }
            this.isRemoteTableAvailable = false;
          }
        }

        // Fallback to server-side admin endpoint for Sandbox Personas or unauthenticated staff previews
        if (sessionData?.session && remoteRows === null && typeof fetch !== 'undefined') {
          const res = await fetch('/api/inventory/locations', {
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
          const mapped = remoteRows.map((r: any) => this.mapDbRowToLocation(r));
          this.saveToLocalStorage(mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('[StockLocationRepository] Remote query failed, falling back to local cache:', err);
      }
    }

    if (this.memoryLocations && this.memoryLocations.length > 0) {
      return this.memoryLocations;
    }
    return appConfig.supabase.isConfigured ? [] : INITIAL_FOUNDATIONAL_LOCATIONS;
  }

  public async getActiveLocations(): Promise<StockLocation[]> {
    const all = await this.getAllLocations();
    return all.filter((l) => l.isActive);
  }

  public async getLocationById(id: string): Promise<StockLocation | null> {
    const all = await this.getAllLocations();
    return all.find((l) => l.id === id) || null;
  }

  public async getLocationByCode(code: string): Promise<StockLocation | null> {
    const all = await this.getAllLocations();
    return all.find((l) => l.code.toUpperCase() === code.toUpperCase()) || null;
  }

  public async createLocation(data: StockLocationFormData): Promise<StockLocation> {
    const existing = await this.getAllLocations();
    if (existing.some((l) => l.code.toUpperCase() === data.code.trim().toUpperCase())) {
      throw new Error(`A stock location with code '${data.code.trim().toUpperCase()}' already exists.`);
    }

    let newLocation: StockLocation = {
      id: generateUuid(),
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      description: data.description?.trim() || null,
      address: data.address?.trim() || null,
      isActive: data.isActive ?? true,
      isDefault: data.isDefault ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const client = getSupabaseClient();
        const { data: sessionData } = await client.auth.getSession();
        let savedRemotely = false;
        let needsServerFallback = false;

        if (sessionData?.session) {
          if (newLocation.isDefault) {
            await client
              .from('stock_locations')
              .update({ is_default: false, updated_at: newLocation.updatedAt } as any)
              .neq('id', newLocation.id);
          }

          const { data: insertedRow, error } = await client
            .from('stock_locations')
            .insert({
              id: newLocation.id,
              name: newLocation.name,
              code: newLocation.code,
              address: newLocation.address,
              is_active: newLocation.isActive,
              is_default: newLocation.isDefault,
              created_at: newLocation.createdAt,
              updated_at: newLocation.updatedAt,
            } as any)
            .select()
            .single();

          if (!error && insertedRow) {
            newLocation = {
              ...this.mapDbRowToLocation(insertedRow),
              description: newLocation.description,
            };
            savedRemotely = true;
          } else if (error && isTableMissingError(error, 'stock_locations')) {
            this.isRemoteTableAvailable = false;
          } else if (error && isPermissionOrAuthError(error)) {
            needsServerFallback = true;
          } else if (error) {
            throw new Error(error.message || 'Failed to create stock location in database.');
          }
        }

        if (!savedRemotely && needsServerFallback && sessionData?.session && typeof fetch !== 'undefined') {
          const res = await fetch('/api/inventory/locations', {
            method: 'POST',
            headers: createSupabaseAuthHeaders(sessionData.session.access_token, true),
            body: JSON.stringify({
              id: newLocation.id,
              name: newLocation.name,
              code: newLocation.code,
              address: newLocation.address,
              isActive: newLocation.isActive,
              isDefault: newLocation.isDefault,
              isUpdate: false,
            }),
          });
          const json = await res.json().catch(() => null);
          if (!res.ok || !json?.success) {
            throw new Error(json?.error || `Server error creating location (HTTP ${res.status}).`);
          }
          if (json.data) {
            newLocation = {
              ...this.mapDbRowToLocation(json.data),
              description: newLocation.description,
            };
          }
        }
      } catch (err: any) {
        const offline =
          (typeof navigator !== 'undefined' && !navigator.onLine) || isNetworkOrFetchError(err);
        if (!offline && this.isRemoteTableAvailable) {
          throw err;
        }
        console.warn('[StockLocationRepository] Offline/unreachable remote insert, cached locally:', err);
      }
    }

    if (newLocation.isDefault) {
      existing.forEach((l) => (l.isDefault = false));
    }
    const updatedList = [newLocation, ...existing];
    this.saveToLocalStorage(updatedList);

    return newLocation;
  }

  public async updateLocation(id: string, data: Partial<StockLocationFormData>): Promise<StockLocation> {
    const existing = await this.getAllLocations();
    const index = existing.findIndex((l) => l.id === id);
    if (index === -1) {
      throw new Error(`Stock location with ID '${id}' not found.`);
    }

    if (data.code) {
      const codeDuplicate = existing.find(
        (l) => l.id !== id && l.code.toUpperCase() === data.code!.trim().toUpperCase()
      );
      if (codeDuplicate) {
        throw new Error(`Another stock location already has the code '${data.code.trim().toUpperCase()}'.`);
      }
    }

    const current = existing[index];
    let updated: StockLocation = {
      ...current,
      name: data.name !== undefined ? data.name.trim() : current.name,
      code: data.code !== undefined ? data.code.trim().toUpperCase() : current.code,
      description: data.description !== undefined ? data.description.trim() || null : current.description,
      address: data.address !== undefined ? data.address.trim() || null : current.address,
      isActive: data.isActive !== undefined ? data.isActive : current.isActive,
      isDefault: data.isDefault !== undefined ? data.isDefault : current.isDefault,
      updatedAt: new Date().toISOString(),
    };

    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const client = getSupabaseClient();
        const { data: sessionData } = await client.auth.getSession();
        let savedRemotely = false;
        let needsServerFallback = false;

        if (sessionData?.session) {
          if (data.isDefault) {
            await client
              .from('stock_locations')
              .update({ is_default: false, updated_at: updated.updatedAt } as any)
              .neq('id', id);
          }

          const { data: updatedRow, error } = await client
            .from('stock_locations')
            .update({
              name: updated.name,
              code: updated.code,
              address: updated.address,
              is_active: updated.isActive,
              is_default: updated.isDefault,
              updated_at: updated.updatedAt,
            } as any)
            .eq('id', id)
            .select()
            .single();

          if (!error && updatedRow) {
            updated = {
              ...this.mapDbRowToLocation(updatedRow),
              description: updated.description,
            };
            savedRemotely = true;
          } else if (error && isTableMissingError(error, 'stock_locations')) {
            this.isRemoteTableAvailable = false;
          } else if (error && isPermissionOrAuthError(error)) {
            needsServerFallback = true;
          } else if (error) {
            throw new Error(error.message || 'Failed to update stock location in database.');
          }
        }

        if (!savedRemotely && needsServerFallback && sessionData?.session && typeof fetch !== 'undefined') {
          const res = await fetch('/api/inventory/locations', {
            method: 'POST',
            headers: createSupabaseAuthHeaders(sessionData.session.access_token, true),
            body: JSON.stringify({
              id: updated.id,
              name: updated.name,
              code: updated.code,
              address: updated.address,
              isActive: updated.isActive,
              isDefault: updated.isDefault,
              isUpdate: true,
            }),
          });
          const json = await res.json().catch(() => null);
          if (!res.ok || !json?.success) {
            throw new Error(json?.error || `Server error updating location (HTTP ${res.status}).`);
          }
          if (json.data) {
            updated = {
              ...this.mapDbRowToLocation(json.data),
              description: updated.description,
            };
          }
        }
      } catch (err: any) {
        const offline =
          (typeof navigator !== 'undefined' && !navigator.onLine) || isNetworkOrFetchError(err);
        if (!offline && this.isRemoteTableAvailable) {
          throw err;
        }
        console.warn('[StockLocationRepository] Offline/unreachable remote update, cached locally:', err);
      }
    }

    if (data.isDefault) {
      existing.forEach((l) => (l.isDefault = false));
    }
    existing[index] = updated;
    this.saveToLocalStorage(existing);

    return updated;
  }

  public async toggleActive(id: string): Promise<StockLocation> {
    const loc = await this.getLocationById(id);
    if (!loc) throw new Error('Location not found');
    return this.updateLocation(id, { isActive: !loc.isActive });
  }

  public async setDefault(id: string): Promise<StockLocation> {
    return this.updateLocation(id, { isDefault: true });
  }
}

export const stockLocationRepository = new StockLocationRepository();
