/**
 * Supplier Management Repository
 * Module 17 — Staff, Suppliers, Expenses & Basic Finance
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Dedicated to raw material, packaging, equipment, consumables, and fuel vendors.
 * Strictly separate from external service providers (Module 16).
 */

import {
  Supplier,
  SupplierFilters,
  CreateSupplierDTO,
  UpdateSupplierDTO,
  SupplierStatus,
  SupplierCategoryDefinition,
} from '../types/supplier';
import { businessSettingsService } from '../services/settings.service';
import { localStore } from '../lib/storage/localStorage';

const SUPPLIERS_LOCAL_STORAGE_KEY = 'xforce_suppliers_v1';

export const DEFAULT_SUPPLIER_CATEGORIES: SupplierCategoryDefinition[] = [
  {
    code: 'raw_materials',
    label: 'Brick & Raw Materials',
    description: 'Bulk cement, stone dust, river sand, laterite, gravel, and color pigment.',
  },
  {
    code: 'fuel_utilities',
    label: 'Generator Fuel & Utilities',
    description: 'Industrial diesel (AGO), plant engine oil, and industrial water tankers.',
  },
  {
    code: 'equipment',
    label: 'Heavy Machinery & Plant',
    description: 'Hydraulic brick press machinery, diesel generators, pan mixers, and mold tooling.',
  },
  {
    code: 'tools',
    label: 'Masons Tools & Site Hardware',
    description: 'Laser levels, rubber mallets, steel trowels, wheelbarrows, and chalk lines.',
  },
  {
    code: 'packaging',
    label: 'Palletizing & Packaging',
    description: 'Wooden yard pallets, polypropylene strapping rolls, and heavy stretch film.',
  },
  {
    code: 'consumables',
    label: 'Consumables & Site PPE',
    description: 'High-visibility safety vests, steel-toe boots, heavy-duty gloves, and masks.',
  },
  {
    code: 'maintenance',
    label: 'Plant Repairs & Spares',
    description: 'Hydraulic ram seals, pressure hoses, electric motors, and welder spares.',
  },
  {
    code: 'other',
    label: 'General Vendor Supplies',
    description: 'Auxiliary office, janitorial, and logistical consumables.',
  },
];

const INITIAL_SUPPLIERS_SEED: Supplier[] = [];

export class SupplierRepository {
  private memorySuppliers: Supplier[] | null = null;

  constructor() {
    const stored = localStore.get<Supplier[] | null>(SUPPLIERS_LOCAL_STORAGE_KEY, null);
    if (stored && Array.isArray(stored) && stored.length > 0) {
      this.memorySuppliers = stored;
    } else {
      this.memorySuppliers = [...INITIAL_SUPPLIERS_SEED];
      localStore.set(SUPPLIERS_LOCAL_STORAGE_KEY, this.memorySuppliers);
    }
  }

  private save(suppliers: Supplier[]): void {
    this.memorySuppliers = suppliers;
    localStore.set(SUPPLIERS_LOCAL_STORAGE_KEY, suppliers);
  }

  /**
   * Generates a configurable sequence supplier number e.g. SUP-2026-0001
   */
  async generateSupplierNumber(): Promise<string> {
    const settings = await businessSettingsService.getBusinessSettings();
    const prefix = settings?.numbering?.defaultSupplierPrefix || 'SUP';
    const year = new Date().getFullYear();

    const all = await this.getAll();
    const currentYearPrefix = `${prefix}-${year}-`;

    const matching = all
      .filter((s) => s.supplierNumber.startsWith(currentYearPrefix))
      .map((s) => {
        const numPart = s.supplierNumber.replace(currentYearPrefix, '');
        const val = parseInt(numPart, 10);
        return isNaN(val) ? 0 : val;
      });

    const nextSeq = matching.length > 0 ? Math.max(...matching) + 1 : all.length + 1;
    return `${currentYearPrefix}${String(nextSeq).padStart(4, '0')}`;
  }

  async getAll(): Promise<Supplier[]> {
    if (!this.memorySuppliers) {
      const stored = localStore.get<Supplier[] | null>(SUPPLIERS_LOCAL_STORAGE_KEY, null);
      this.memorySuppliers = stored && Array.isArray(stored) ? stored : [...INITIAL_SUPPLIERS_SEED];
    }
    return [...this.memorySuppliers];
  }

  async getActiveSuppliers(): Promise<Supplier[]> {
    const all = await this.getAll();
    return all.filter((s) => s.status === 'active');
  }

  async getById(id: string): Promise<Supplier | null> {
    const all = await this.getAll();
    return all.find((s) => s.id === id) || null;
  }

  async getBySupplierNumber(number: string): Promise<Supplier | null> {
    const all = await this.getAll();
    return all.find((s) => s.supplierNumber.toLowerCase() === number.toLowerCase().trim()) || null;
  }

  async filter(filters: SupplierFilters): Promise<Supplier[]> {
    let list = await this.getAll();

    if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
      const q = filters.searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.supplierNumber.toLowerCase().includes(q) ||
          s.contactPerson.toLowerCase().includes(q) ||
          s.phone.toLowerCase().includes(q) ||
          (s.email && s.email.toLowerCase().includes(q)) ||
          s.city.toLowerCase().includes(q) ||
          s.state.toLowerCase().includes(q) ||
          s.suppliedItems.some((item) => item.toLowerCase().includes(q))
      );
    }

    if (filters.category && filters.category !== 'all') {
      list = list.filter((s) => s.category === filters.category);
    }

    if (filters.status && filters.status !== 'all') {
      list = list.filter((s) => s.status === filters.status);
    }

    if (filters.state && filters.state !== 'all') {
      list = list.filter((s) => s.state.toLowerCase().includes(filters.state!.toLowerCase()));
    }

    const sortKey = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';

    list.sort((a, b) => {
      let valA: string | number = a[sortKey as keyof Supplier] as string;
      let valB: string | number = b[sortKey as keyof Supplier] as string;

      if (!valA) valA = '';
      if (!valB) valB = '';

      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB as string);
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      return sortOrder === 'asc'
        ? Number(valA) - Number(valB)
        : Number(valB) - Number(valA);
    });

    return list;
  }

  async create(dto: CreateSupplierDTO): Promise<Supplier> {
    const all = await this.getAll();

    const supplierNumber = await this.generateSupplierNumber();
    const now = new Date().toISOString();
    const newId = `sup-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

    const newSupplier: Supplier = {
      id: newId,
      supplierNumber,
      name: dto.name.trim(),
      contactPerson: dto.contactPerson.trim(),
      phone: dto.phone.trim(),
      whatsapp: dto.whatsapp?.trim() || dto.phone.trim(),
      email: dto.email?.trim() || undefined,
      address: dto.address.trim(),
      city: dto.city.trim(),
      state: dto.state.trim(),
      country: dto.country?.trim() || 'Nigeria',
      category: dto.category,
      suppliedItems: dto.suppliedItems || [],
      status: 'active',
      paymentTerms: dto.paymentTerms?.trim(),
      leadTimeDays: dto.leadTimeDays,
      tinNumber: dto.tinNumber?.trim(),
      bankDetails: dto.bankDetails,
      notes: dto.notes?.trim(),
      createdAt: now,
      updatedAt: now,
    };

    all.unshift(newSupplier);
    this.save(all);
    return newSupplier;
  }

  async update(id: string, dto: UpdateSupplierDTO): Promise<Supplier> {
    const all = await this.getAll();
    const index = all.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new Error(`Supplier with ID "${id}" not found.`);
    }

    const current = all[index];
    const updated: Supplier = {
      ...current,
      name: dto.name !== undefined ? dto.name.trim() : current.name,
      contactPerson: dto.contactPerson !== undefined ? dto.contactPerson.trim() : current.contactPerson,
      phone: dto.phone !== undefined ? dto.phone.trim() : current.phone,
      whatsapp: dto.whatsapp !== undefined ? dto.whatsapp.trim() : current.whatsapp,
      email: dto.email !== undefined ? dto.email.trim() : current.email,
      address: dto.address !== undefined ? dto.address.trim() : current.address,
      city: dto.city !== undefined ? dto.city.trim() : current.city,
      state: dto.state !== undefined ? dto.state.trim() : current.state,
      country: dto.country !== undefined ? dto.country.trim() : current.country,
      category: dto.category !== undefined ? dto.category : current.category,
      suppliedItems: dto.suppliedItems !== undefined ? dto.suppliedItems : current.suppliedItems,
      status: dto.status !== undefined ? dto.status : current.status,
      paymentTerms: dto.paymentTerms !== undefined ? dto.paymentTerms.trim() : current.paymentTerms,
      leadTimeDays: dto.leadTimeDays !== undefined ? dto.leadTimeDays : current.leadTimeDays,
      tinNumber: dto.tinNumber !== undefined ? dto.tinNumber.trim() : current.tinNumber,
      bankDetails: dto.bankDetails !== undefined ? dto.bankDetails : current.bankDetails,
      notes: dto.notes !== undefined ? dto.notes.trim() : current.notes,
      updatedAt: new Date().toISOString(),
    };

    all[index] = updated;
    this.save(all);
    return updated;
  }

  async setStatus(id: string, status: SupplierStatus): Promise<Supplier> {
    return this.update(id, { status });
  }
}

export const supplierRepository = new SupplierRepository();
