/**
 * Staff & Internal Team Types
 * Module 17 — Staff, Suppliers, Expenses & Basic Finance
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Dedicated to internal company staff management foundation,
 * separate from external contractors (Module 16) and suppliers.
 */

import { UserStatus } from './database';
import { StaffRoleName } from './auth';

export type StaffDepartment =
  | 'administration'
  | 'sales'
  | 'warehouse'
  | 'pos'
  | 'installation'
  | 'management'
  | 'finance'
  | 'other';

export type StaffEmploymentStatus =
  | 'full_time'
  | 'part_time'
  | 'contract'
  | 'probation';

export interface StaffDepartmentDefinition {
  code: StaffDepartment;
  label: string;
  description: string;
}

export interface StaffMember {
  id: string; // Corresponds to auth profile user UUID
  staffNumber: string; // e.g. STF-2026-0001
  fullName: string;
  email: string;
  phone: string;
  roleId: string;
  roleName: StaffRoleName;
  roleDisplayName: string;
  jobTitle: string; // e.g. 'Lead Production Engineer', 'Cashier', 'Yard Supervisor'
  department: StaffDepartment;
  accountStatus: UserStatus; // active, inactive, suspended
  employmentStatus: StaffEmploymentStatus;
  dateOfJoining?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
  passwordSetupRequired: boolean;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffOperationalSummary {
  staffId: string;
  assignedWarehouseTasksCount: number;
  completedWarehouseTasksCount: number;
  assignedInstallationJobsCount: number;
  completedInstallationJobsCount: number;
  posSalesCount: number;
  totalPosSalesVolume: number;
  ordersProcessedCount: number;
  expensesRecordedCount: number;
}

export interface StaffFilters {
  searchQuery?: string;
  department?: StaffDepartment | 'all';
  roleName?: StaffRoleName | 'all';
  accountStatus?: UserStatus | 'all';
  employmentStatus?: StaffEmploymentStatus | 'all';
  sortBy?: 'staffNumber' | 'fullName' | 'department' | 'role' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateStaffDTO {
  fullName: string;
  email: string;
  phone: string;
  roleName: StaffRoleName;
  jobTitle: string;
  department: StaffDepartment;
  employmentStatus: StaffEmploymentStatus;
  dateOfJoining?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
  requirePasswordSetup?: boolean;
}

export interface UpdateStaffDTO {
  fullName?: string;
  phone?: string;
  roleName?: StaffRoleName;
  jobTitle?: string;
  department?: StaffDepartment;
  employmentStatus?: StaffEmploymentStatus;
  accountStatus?: UserStatus;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
}
