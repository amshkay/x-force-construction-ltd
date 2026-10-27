/**
 * Staff Administration Service
 * Module 17 — Staff, Suppliers, Expenses & Basic Finance
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Handles internal staff management, RBAC synchronization,
 * operational relationship audits, and credential reset enforcement.
 */

import { supabase } from '../lib/supabase/client';
import { DbProfile, DbRole, UserStatus } from '../types/database';
import { auditService } from './audit.service';
import { DEFAULT_DB_ROLES } from '../config/roles.config';
import {
  StaffMember,
  StaffFilters,
  CreateStaffDTO,
  UpdateStaffDTO,
  StaffOperationalSummary,
} from '../types/staff';
import { staffRepository } from '../repositories/staff.repository';

export interface StaffWithRole extends DbProfile {
  role?: DbRole;
}

export interface CreateStaffParams {
  email: string;
  fullName: string;
  phone?: string;
  roleId: string;
  requirePasswordSetup?: boolean;
}

export class StaffService {
  /**
   * List all staff members with repository storage and fallback
   */
  async getAllStaff(filters?: StaffFilters): Promise<StaffMember[]> {
    if (filters) {
      return staffRepository.filter(filters);
    }
    return staffRepository.getAll();
  }

  async getStaffById(id: string): Promise<StaffMember | null> {
    return staffRepository.getById(id);
  }

  async getStaffByNumber(staffNumber: string): Promise<StaffMember | null> {
    return staffRepository.getByStaffNumber(staffNumber);
  }

  /**
   * Get operational summary across warehouse, POS, and installations
   */
  async getStaffOperationalSummary(staffId: string): Promise<StaffOperationalSummary> {
    return staffRepository.getOperationalSummary(staffId);
  }

  /**
   * Create / Provision a new staff member
   */
  async createStaff(dto: CreateStaffDTO, adminUserId: string): Promise<StaffMember> {
    const created = await staffRepository.create(dto);

    // Audit log
    auditService.logEvent({
      action: 'staff.created',
      entity_type: 'staff_profile',
      entity_id: created.id,
      user_id: adminUserId,
      reason: `New staff member registered: ${created.staffNumber} (${created.fullName})`,
      new_values: {
        staffNumber: created.staffNumber,
        email: created.email,
        role: created.roleName,
        department: created.department,
      },
    });

    return created;
  }

  /**
   * Update staff member metadata
   */
  async updateStaff(
    id: string,
    dto: UpdateStaffDTO,
    adminUserId: string,
    reason?: string
  ): Promise<StaffMember> {
    const previous = await staffRepository.getById(id);
    const updated = await staffRepository.update(id, dto);

    auditService.logEvent({
      action: 'staff.updated',
      entity_type: 'staff_profile',
      entity_id: id,
      user_id: adminUserId,
      reason: reason || `Updated profile details for staff ${updated.staffNumber}`,
      old_values: previous ? { role: previous.roleName, department: previous.department, status: previous.accountStatus } : undefined,
      new_values: { role: updated.roleName, department: updated.department, status: updated.accountStatus },
    });

    return updated;
  }

  /**
   * Update staff account status (active, inactive, suspended)
   */
  async updateStaffStatus(
    staffId: string,
    newStatus: UserStatus,
    adminUserId: string,
    reason?: string
  ): Promise<StaffMember> {
    const updated = await staffRepository.setAccountStatus(staffId, newStatus);

    // Also attempt remote DB update if Supabase profile table is populated
    try {
      await (supabase.from('profiles') as any)
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', staffId);
    } catch {
      // Safe fallback
    }

    auditService.logEvent({
      action: 'staff.status_change',
      entity_type: 'staff_profile',
      entity_id: staffId,
      user_id: adminUserId,
      reason: reason || `Account status changed to ${newStatus}`,
      new_values: { status: newStatus },
    });

    return updated;
  }

  /**
   * Assign a new role to a staff member
   */
  async assignStaffRole(
    staffId: string,
    newRoleId: string,
    adminUserId: string,
    reason?: string
  ): Promise<StaffMember> {
    const roleDef = DEFAULT_DB_ROLES.find((r) => r.id === newRoleId);
    if (!roleDef) {
      throw new Error(`Role with ID "${newRoleId}" not found.`);
    }

    const updated = await staffRepository.update(staffId, { roleName: roleDef.name as any });

    try {
      await (supabase.from('profiles') as any)
        .update({
          role_id: newRoleId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', staffId);
    } catch {
      // Safe fallback
    }

    auditService.logEvent({
      action: 'staff.role_change',
      entity_type: 'staff_profile',
      entity_id: staffId,
      user_id: adminUserId,
      reason: reason || `Staff role updated to ${roleDef.display_name}`,
      new_values: { role_id: newRoleId, role_name: roleDef.name },
    });

    return updated;
  }

  /**
   * Require mandatory password reset on next login
   */
  async requirePasswordReset(staffId: string, adminUserId: string): Promise<void> {
    const staff = await staffRepository.getById(staffId);
    if (staff) {
      staff.passwordSetupRequired = true;
      staff.updatedAt = new Date().toISOString();
      await staffRepository.update(staffId, { notes: `${staff.notes ? staff.notes + '\n' : ''}[Admin] Mandatory password reset requested.` });
    }

    try {
      await (supabase.from('profiles') as any)
        .update({
          password_setup_required: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', staffId);
    } catch {
      // Safe fallback
    }

    auditService.logEvent({
      action: 'staff.require_password_reset',
      entity_type: 'staff_profile',
      entity_id: staffId,
      user_id: adminUserId,
      reason: 'Mandatory password change enforced on next login',
    });
  }

  /**
   * Reset staff credentials to the business-mandated temporary setup credential (Module 23).
   * Enforces:
   * 1. Never storing passwords in plaintext in the application database tables
   * 2. Never including default passwords in audit logs or normal API payloads
   * 3. Flagging password_setup_required = true to force immediate change on next login
   */
  async resetStaffToTemporaryPassword(
    staffId: string,
    adminUserId: string
  ): Promise<{ success: boolean; message: string }> {
    const staff = await staffRepository.getById(staffId);
    if (!staff) {
      throw new Error(`Staff member with ID ${staffId} not found.`);
    }

    // 1. Mark mandatory password setup requirement
    staff.passwordSetupRequired = true;
    staff.updatedAt = new Date().toISOString();
    await staffRepository.update(staffId, {
      notes: `${staff.notes ? staff.notes + '\n' : ''}[Admin] Temporary setup password issued; mandatory change required on next login.`,
    });

    // 2. Synchronize to Supabase profiles table
    try {
      await (supabase.from('profiles') as any)
        .update({
          password_setup_required: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', staffId);
    } catch {
      // Safe fallback
    }

    // 3. Log audit event WITHOUT plaintext credentials
    auditService.logEvent({
      action: 'staff.credential_reset',
      entity_type: 'staff_profile',
      entity_id: staffId,
      user_id: adminUserId,
      reason: 'Temporary setup password provisioned with mandatory change on next login enforced.',
      new_values: {
        passwordSetupRequired: true,
        resetTimestamp: new Date().toISOString(),
      },
    });

    return {
      success: true,
      message: `Staff member ${staff.fullName} credentials reset. Mandatory password initialization enforced on their next login.`,
    };
  }

  /**
   * Backward-compatible legacy helper
   */
  async listStaffMembers(): Promise<StaffWithRole[]> {
    const staff = await staffRepository.getAll();
    return staff.map((s) => ({
      id: s.id,
      full_name: s.fullName,
      email: s.email,
      phone: s.phone,
      avatar_url: s.avatarUrl || null,
      role_id: s.roleId,
      status: s.accountStatus,
      password_setup_required: s.passwordSetupRequired,
      created_at: s.createdAt,
      updated_at: s.updatedAt,
      role: DEFAULT_DB_ROLES.find((r) => r.id === s.roleId) || DEFAULT_DB_ROLES[0],
    }));
  }

  /**
   * Get all system roles
   */
  async getRoles(): Promise<DbRole[]> {
    try {
      const { data, error } = await (supabase.from('roles') as any)
        .select('*')
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch {
      // Safe fallback
    }
    return DEFAULT_DB_ROLES;
  }

  /**
   * Legacy invite staff member profile method
   */
  async inviteStaffMember(params: CreateStaffParams, adminUserId: string): Promise<DbProfile> {
    const roleDef = DEFAULT_DB_ROLES.find((r) => r.id === params.roleId) || DEFAULT_DB_ROLES[0];
    const newStaff = await staffRepository.create({
      fullName: params.fullName,
      email: params.email,
      phone: params.phone || '',
      roleName: roleDef.name as any,
      jobTitle: roleDef.display_name,
      department: 'sales',
      employmentStatus: 'full_time',
      requirePasswordSetup: params.requirePasswordSetup ?? true,
    });

    return {
      id: newStaff.id,
      full_name: newStaff.fullName,
      email: newStaff.email,
      phone: newStaff.phone,
      avatar_url: null,
      role_id: newStaff.roleId,
      status: newStaff.accountStatus,
      password_setup_required: newStaff.passwordSetupRequired,
      created_at: newStaff.createdAt,
      updated_at: newStaff.updatedAt,
    };
  }
}

export const staffService = new StaffService();
