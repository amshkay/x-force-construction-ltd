/**
 * Staff Repository
 * Module 17 — Staff, Suppliers, Expenses & Basic Finance
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Provides persistent storage, sequential staff numbering,
 * department categorization, and operational relationship summaries.
 */

import {
  StaffMember,
  StaffFilters,
  CreateStaffDTO,
  UpdateStaffDTO,
  StaffOperationalSummary,
  StaffDepartmentDefinition,
} from '../types/staff';
import { UserStatus } from '../types/database';
import { businessSettingsService } from '../services/settings.service';
import { localStore } from '../lib/storage/localStorage';
import { DEFAULT_DB_ROLES } from '../config/roles.config';
import { warehouseRepository } from './warehouse.repository';
import { posRepository } from './pos.repository';
import { installationRepository } from './installation.repository';

const STAFF_LOCAL_STORAGE_KEY = 'xforce_staff_members_v1';

export const DEFAULT_STAFF_DEPARTMENTS: StaffDepartmentDefinition[] = [
  {
    code: 'administration',
    label: 'Administration & Executive',
    description: 'Corporate executive oversight, legal, and operational strategy.',
  },
  {
    code: 'sales',
    label: 'Commercial Sales & Estimations',
    description: 'Quotation drafting, client consultations, and business development.',
  },
  {
    code: 'warehouse',
    label: 'Warehouse & Yard Logistics',
    description: 'Yard stock management, forklift picking, staging, and dispatch.',
  },
  {
    code: 'pos',
    label: 'POS & Counter Sales',
    description: 'Direct walk-in counter sales, cashier registers, and cash balancing.',
  },
  {
    code: 'installation',
    label: 'Installation & Field Site',
    description: 'On-site brick laying, leveling inspections, and project supervision.',
  },
  {
    code: 'management',
    label: 'Operations Management',
    description: 'Production scheduling, quality assurance, and crew coordination.',
  },
  {
    code: 'finance',
    label: 'Finance & Accounts',
    description: 'Operating expense vouchers, vendor disbursement, and financial reporting.',
  },
  {
    code: 'other',
    label: 'Auxiliary Support',
    description: 'General support, safety compliance, and site logistics.',
  },
];

const INITIAL_STAFF_SEED: StaffMember[] = [
  {
    id: '4a56de99-4eb2-4ae2-9e94-b7dceb45976f',
    staffNumber: 'STF-2026-0001',
    fullName: 'Engr. David Adeleke',
    email: 'admin@xforce.com',
    phone: '+234 802 111 2233',
    roleId: 'a0000000-0000-0000-0000-000000000001',
    roleName: 'administrator',
    roleDisplayName: 'Administrator',
    jobTitle: 'Lead Production & Operations Director',
    department: 'management',
    accountStatus: 'active',
    employmentStatus: 'full_time',
    dateOfJoining: '2023-01-15',
    emergencyContactName: 'Folake Adeleke',
    emergencyContactPhone: '+234 803 999 1122',
    notes: 'Primary executive administrator for factory operations and engineering approvals.',
    passwordSetupRequired: false,
    avatarUrl: null,
    createdAt: '2023-01-15T08:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
];

export class StaffRepository {
  private memoryStaff: StaffMember[] | null = null;

  constructor() {
    const stored = localStore.get<StaffMember[] | null>(STAFF_LOCAL_STORAGE_KEY, null);
    if (stored && Array.isArray(stored) && stored.length > 0) {
      this.memoryStaff = stored;
    } else {
      this.memoryStaff = [...INITIAL_STAFF_SEED];
      localStore.set(STAFF_LOCAL_STORAGE_KEY, this.memoryStaff);
    }
  }

  private save(staff: StaffMember[]): void {
    this.memoryStaff = staff;
    localStore.set(STAFF_LOCAL_STORAGE_KEY, staff);
  }

  /**
   * Generates a configurable sequence staff number e.g. STF-2026-0001
   */
  async generateStaffNumber(): Promise<string> {
    const settings = await businessSettingsService.getBusinessSettings();
    const prefix = settings?.numbering?.defaultStaffPrefix || 'STF';
    const year = new Date().getFullYear();

    const all = await this.getAll();
    const currentYearPrefix = `${prefix}-${year}-`;

    const matching = all
      .filter((s) => s.staffNumber.startsWith(currentYearPrefix))
      .map((s) => {
        const numPart = s.staffNumber.replace(currentYearPrefix, '');
        const val = parseInt(numPart, 10);
        return isNaN(val) ? 0 : val;
      });

    const nextSeq = matching.length > 0 ? Math.max(...matching) + 1 : all.length + 1;
    return `${currentYearPrefix}${String(nextSeq).padStart(4, '0')}`;
  }

  async getAll(): Promise<StaffMember[]> {
    if (!this.memoryStaff) {
      const stored = localStore.get<StaffMember[] | null>(STAFF_LOCAL_STORAGE_KEY, null);
      this.memoryStaff = stored && Array.isArray(stored) ? stored : [...INITIAL_STAFF_SEED];
    }
    return [...this.memoryStaff];
  }

  async getById(id: string): Promise<StaffMember | null> {
    const all = await this.getAll();
    return all.find((s) => s.id === id) || null;
  }

  async getByStaffNumber(number: string): Promise<StaffMember | null> {
    const all = await this.getAll();
    return all.find((s) => s.staffNumber.toLowerCase() === number.toLowerCase().trim()) || null;
  }

  async getByEmail(email: string): Promise<StaffMember | null> {
    const all = await this.getAll();
    return all.find((s) => s.email.toLowerCase() === email.toLowerCase().trim()) || null;
  }

  async filter(filters: StaffFilters): Promise<StaffMember[]> {
    let list = await this.getAll();

    if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
      const q = filters.searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.staffNumber.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.phone.toLowerCase().includes(q) ||
          s.jobTitle.toLowerCase().includes(q)
      );
    }

    if (filters.department && filters.department !== 'all') {
      list = list.filter((s) => s.department === filters.department);
    }

    if (filters.roleName && filters.roleName !== 'all') {
      list = list.filter((s) => s.roleName === filters.roleName);
    }

    if (filters.accountStatus && filters.accountStatus !== 'all') {
      list = list.filter((s) => s.accountStatus === filters.accountStatus);
    }

    if (filters.employmentStatus && filters.employmentStatus !== 'all') {
      list = list.filter((s) => s.employmentStatus === filters.employmentStatus);
    }

    const sortKey = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';

    list.sort((a, b) => {
      let valA: string | number = a[sortKey as keyof StaffMember] as string;
      let valB: string | number = b[sortKey as keyof StaffMember] as string;

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

  async create(dto: CreateStaffDTO): Promise<StaffMember> {
    const all = await this.getAll();

    // Check duplicate email
    const existing = all.find((s) => s.email.toLowerCase() === dto.email.toLowerCase().trim());
    if (existing) {
      throw new Error(`A staff member with email "${dto.email}" already exists.`);
    }

    const roleDef = DEFAULT_DB_ROLES.find((r) => r.name === dto.roleName) || DEFAULT_DB_ROLES[0];
    const staffNumber = await this.generateStaffNumber();
    const now = new Date().toISOString();
    const newId = crypto.randomUUID();

    const newStaff: StaffMember = {
      id: newId,
      staffNumber,
      fullName: dto.fullName.trim(),
      email: dto.email.toLowerCase().trim(),
      phone: dto.phone.trim(),
      roleId: roleDef.id,
      roleName: dto.roleName,
      roleDisplayName: roleDef.display_name || roleDef.name,
      jobTitle: dto.jobTitle.trim(),
      department: dto.department,
      accountStatus: 'active',
      employmentStatus: dto.employmentStatus,
      dateOfJoining: dto.dateOfJoining || now.split('T')[0],
      emergencyContactName: dto.emergencyContactName?.trim(),
      emergencyContactPhone: dto.emergencyContactPhone?.trim(),
      notes: dto.notes?.trim(),
      passwordSetupRequired: dto.requirePasswordSetup ?? true,
      avatarUrl: null,
      createdAt: now,
      updatedAt: now,
    };

    all.unshift(newStaff);
    this.save(all);
    return newStaff;
  }

  async update(id: string, dto: UpdateStaffDTO): Promise<StaffMember> {
    const all = await this.getAll();
    const index = all.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new Error(`Staff member with ID "${id}" not found.`);
    }

    const current = all[index];
    let roleId = current.roleId;
    let roleDisplayName = current.roleDisplayName;
    let roleName = current.roleName;

    if (dto.roleName && dto.roleName !== current.roleName) {
      const roleDef = DEFAULT_DB_ROLES.find((r) => r.name === dto.roleName);
      if (roleDef) {
        roleId = roleDef.id;
        roleDisplayName = roleDef.display_name || roleDef.name;
        roleName = dto.roleName;
      }
    }

    const updated: StaffMember = {
      ...current,
      fullName: dto.fullName !== undefined ? dto.fullName.trim() : current.fullName,
      phone: dto.phone !== undefined ? dto.phone.trim() : current.phone,
      roleId,
      roleName,
      roleDisplayName,
      jobTitle: dto.jobTitle !== undefined ? dto.jobTitle.trim() : current.jobTitle,
      department: dto.department !== undefined ? dto.department : current.department,
      employmentStatus: dto.employmentStatus !== undefined ? dto.employmentStatus : current.employmentStatus,
      accountStatus: dto.accountStatus !== undefined ? dto.accountStatus : current.accountStatus,
      emergencyContactName: dto.emergencyContactName !== undefined ? dto.emergencyContactName.trim() : current.emergencyContactName,
      emergencyContactPhone: dto.emergencyContactPhone !== undefined ? dto.emergencyContactPhone.trim() : current.emergencyContactPhone,
      notes: dto.notes !== undefined ? dto.notes.trim() : current.notes,
      updatedAt: new Date().toISOString(),
    };

    all[index] = updated;
    this.save(all);
    return updated;
  }

  async setAccountStatus(id: string, status: UserStatus): Promise<StaffMember> {
    return this.update(id, { accountStatus: status });
  }

  /**
   * Retrieves related cross-module operational activities for a staff member
   */
  async getOperationalSummary(staffId: string): Promise<StaffOperationalSummary> {
    const staff = await this.getById(staffId);
    const staffName = staff?.fullName.toLowerCase() || '';

    // 1. Warehouse tasks
    let warehouseAssigned = 0;
    let warehouseCompleted = 0;
    try {
      const warehouseTasks = await warehouseRepository.getAllTasks();
      warehouseTasks.forEach((t: any) => {
        if (
          t.assignedStaffId === staffId ||
          (t.assignedStaffName && t.assignedStaffName.toLowerCase() === staffName)
        ) {
          warehouseAssigned++;
          if (t.status === 'completed') warehouseCompleted++;
        }
      });
    } catch {
      // Safe fallback
    }

    // 2. POS sales
    let posCount = 0;
    let posVolume = 0;
    try {
      const posSales = await posRepository.getAllSales();
      posSales.forEach((s) => {
        if (s.cashierId === staffId || (s.cashierName && s.cashierName.toLowerCase() === staffName)) {
          posCount++;
          posVolume += s.totalAmount || 0;
        }
      });
    } catch {
      // Safe fallback
    }

    // 3. Installation jobs
    let installAssigned = 0;
    let installCompleted = 0;
    try {
      const jobs = await installationRepository.getAll();
      jobs.forEach((j) => {
        if (j.assignedStaffId === staffId || (j.assignedStaffName && j.assignedStaffName.toLowerCase() === staffName)) {
          installAssigned++;
          if (j.status === 'completed' || j.status === 'customer_confirmation') installCompleted++;
        }
      });
    } catch {
      // Safe fallback
    }

    return {
      staffId,
      assignedWarehouseTasksCount: warehouseAssigned,
      completedWarehouseTasksCount: warehouseCompleted,
      assignedInstallationJobsCount: installAssigned,
      completedInstallationJobsCount: installCompleted,
      posSalesCount: posCount,
      totalPosSalesVolume: posVolume,
      ordersProcessedCount: posCount,
      expensesRecordedCount: 0,
    };
  }
}

export const staffRepository = new StaffRepository();
