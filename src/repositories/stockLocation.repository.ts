/**
 * Stock Location Repository
 * Module 11 — Inventory & Stock Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Manages physical stock storage locations (Warehouses, Curing Bays, Showrooms).
 * Multi-tier persistence: Supabase remote table with resilient local storage fallback.
 */

import { getSupabaseClient } from '../lib/supabase/client';
import { appConfig } from '../config/app.config';
import { localStore } from '../lib/storage/localStorage';
import { StockLocation, StockLocationFormData } from '../types/inventory';
import { DbStockLocation } from '../types/database';

const STOCK_LOCATIONS_STORAGE_KEY = 'xforce_stock_locations_v1';

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
      this.memoryLocations = INITIAL_FOUNDATIONAL_LOCATIONS;
      localStore.set(STOCK_LOCATIONS_STORAGE_KEY, INITIAL_FOUNDATIONAL_LOCATIONS);
    } else {
      this.memoryLocations = stored;
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
      description: null, // DbStockLocation doesn't have description column, fallback to null
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
        const { data, error } = await client
          .from('stock_locations')
          .select('*')
          .order('name', { ascending: true });

        if (error) {
          if (error.code === 'PGRST205' || error.code === '42P01') {
            if (!this.warnedAboutMissingTable) {
              console.info('[StockLocationRepository] Supabase stock_locations table not available, using offline cache.');
              this.warnedAboutMissingTable = true;
            }
            this.isRemoteTableAvailable = false;
          }
        } else if (data && data.length > 0) {
          const mapped = data.map((r: any) => this.mapDbRowToLocation(r));
          this.saveToLocalStorage(mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('[StockLocationRepository] Remote query failed, falling back to local cache:', err);
      }
    }

    return this.memoryLocations || INITIAL_FOUNDATIONAL_LOCATIONS;
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

    const newLocation: StockLocation = {
      id: `loc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      description: data.description?.trim() || null,
      address: data.address?.trim() || null,
      isActive: data.isActive ?? true,
      isDefault: data.isDefault ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (newLocation.isDefault) {
      existing.forEach((l) => (l.isDefault = false));
    }

    const updatedList = [newLocation, ...existing];
    this.saveToLocalStorage(updatedList);

    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const client = getSupabaseClient();
        await client.from('stock_locations').insert({
          id: newLocation.id,
          name: newLocation.name,
          code: newLocation.code,
          address: newLocation.address,
          is_active: newLocation.isActive,
          is_default: newLocation.isDefault,
          created_at: newLocation.createdAt,
          updated_at: newLocation.updatedAt,
        } as any);
      } catch (err) {
        console.warn('[StockLocationRepository] Remote insert failed:', err);
      }
    }

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

    if (data.isDefault) {
      existing.forEach((l) => (l.isDefault = false));
    }

    const current = existing[index];
    const updated: StockLocation = {
      ...current,
      name: data.name !== undefined ? data.name.trim() : current.name,
      code: data.code !== undefined ? data.code.trim().toUpperCase() : current.code,
      description: data.description !== undefined ? data.description.trim() || null : current.description,
      address: data.address !== undefined ? data.address.trim() || null : current.address,
      isActive: data.isActive !== undefined ? data.isActive : current.isActive,
      isDefault: data.isDefault !== undefined ? data.isDefault : current.isDefault,
      updatedAt: new Date().toISOString(),
    };

    existing[index] = updated;
    this.saveToLocalStorage(existing);

    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const client = getSupabaseClient();
        await client
          .from('stock_locations')
          .update({
            name: updated.name,
            code: updated.code,
            address: updated.address,
            is_active: updated.isActive,
            is_default: updated.isDefault,
            updated_at: updated.updatedAt,
          } as any)
          .eq('id', id);
      } catch (err) {
        console.warn('[StockLocationRepository] Remote update failed:', err);
      }
    }

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
