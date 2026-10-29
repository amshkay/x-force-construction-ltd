/**
 * Development & Verification Personas Configuration
 * XFORCE Construction Management & Customer Platform (Brand: X-FORCE BRICKS)
 * Synchronized with Module 03 RBAC specifications
 */

import { DbProfile, DbRole } from '../types/database';
import { StaffRoleName } from '../types/auth';
import { SYSTEM_ROLE_DEFINITIONS } from './roles.config';

export interface DevPersona {
  user: {
    id: string;
    email: string;
    user_metadata: { full_name: string };
  };
  profile: DbProfile;
  role: DbRole;
  permissions: string[];
  password: string;
}

export const DEV_SANDBOX_PERSONAS: Record<StaffRoleName | 'inactive', DevPersona> = {
  administrator: {
    password: 'XforceAdmin2026!',
    user: {
      id: '4a56de99-4eb2-4ae2-9e94-b7dceb45976f',
      email: 'admin@xforce.com',
      user_metadata: { full_name: 'Engr. David Adeleke (Super Admin)' },
    },
    profile: {
      id: '4a56de99-4eb2-4ae2-9e94-b7dceb45976f',
      full_name: 'Engr. David Adeleke',
      email: 'admin@xforce.com',
      phone: '+234 802 111 2233',
      avatar_url: null,
      role_id: SYSTEM_ROLE_DEFINITIONS.administrator.id,
      status: 'active',
      password_setup_required: false,
      created_at: new Date('2025-01-01T08:00:00Z').toISOString(),
      updated_at: new Date().toISOString(),
    },
    role: {
      id: SYSTEM_ROLE_DEFINITIONS.administrator.id,
      name: 'administrator',
      display_name: 'Administrator',
      description: SYSTEM_ROLE_DEFINITIONS.administrator.description,
      is_system: true,
      created_at: new Date('2025-01-01T08:00:00Z').toISOString(),
      updated_at: new Date().toISOString(),
    },
    permissions: SYSTEM_ROLE_DEFINITIONS.administrator.permissions,
  },
  sales_manager: {
    password: 'XforceSales2026!',
    user: {
      id: 'dev-sales-uid-0002',
      email: 'sales.manager@xforce.internal',
      user_metadata: { full_name: 'Chidinma Okafor (Sales Manager)' },
    },
    profile: {
      id: 'dev-sales-uid-0002',
      full_name: 'Chidinma Okafor',
      email: 'sales.manager@xforce.internal',
      phone: '+234 802 334 5566',
      avatar_url: null,
      role_id: SYSTEM_ROLE_DEFINITIONS.sales_manager.id,
      status: 'active',
      password_setup_required: false,
      created_at: new Date('2025-01-01T08:00:00Z').toISOString(),
      updated_at: new Date().toISOString(),
    },
    role: {
      id: SYSTEM_ROLE_DEFINITIONS.sales_manager.id,
      name: 'sales_manager',
      display_name: 'Sales Manager',
      description: SYSTEM_ROLE_DEFINITIONS.sales_manager.description,
      is_system: true,
      created_at: new Date('2025-01-01T08:00:00Z').toISOString(),
      updated_at: new Date().toISOString(),
    },
    permissions: SYSTEM_ROLE_DEFINITIONS.sales_manager.permissions,
  },
  warehouse_staff: {
    password: 'XforceYard2026!',
    user: {
      id: 'dev-wh-uid-0003',
      email: 'yard.supervisor@xforce.internal',
      user_metadata: { full_name: 'Babajide Sanwo (Yard Supervisor)' },
    },
    profile: {
      id: 'dev-wh-uid-0003',
      full_name: 'Babajide Sanwo',
      email: 'yard.supervisor@xforce.internal',
      phone: '+234 809 445 6677',
      avatar_url: null,
      role_id: SYSTEM_ROLE_DEFINITIONS.warehouse_staff.id,
      status: 'active',
      password_setup_required: false,
      created_at: new Date('2025-01-01T08:00:00Z').toISOString(),
      updated_at: new Date().toISOString(),
    },
    role: {
      id: SYSTEM_ROLE_DEFINITIONS.warehouse_staff.id,
      name: 'warehouse_staff',
      display_name: 'Warehouse Staff',
      description: SYSTEM_ROLE_DEFINITIONS.warehouse_staff.description,
      is_system: true,
      created_at: new Date('2025-01-01T08:00:00Z').toISOString(),
      updated_at: new Date().toISOString(),
    },
    permissions: SYSTEM_ROLE_DEFINITIONS.warehouse_staff.permissions,
  },
  installation_staff: {
    password: 'XforceSite2026!',
    user: {
      id: 'dev-inst-uid-0004',
      email: 'mason.lead@xforce.internal',
      user_metadata: { full_name: 'Sunday Nwosu (Installation Lead)' },
    },
    profile: {
      id: 'dev-inst-uid-0004',
      full_name: 'Sunday Nwosu',
      email: 'mason.lead@xforce.internal',
      phone: '+234 814 556 7788',
      avatar_url: null,
      role_id: SYSTEM_ROLE_DEFINITIONS.installation_staff.id,
      status: 'active',
      password_setup_required: false,
      created_at: new Date('2025-01-01T08:00:00Z').toISOString(),
      updated_at: new Date().toISOString(),
    },
    role: {
      id: SYSTEM_ROLE_DEFINITIONS.installation_staff.id,
      name: 'installation_staff',
      display_name: 'Installation Staff',
      description: SYSTEM_ROLE_DEFINITIONS.installation_staff.description,
      is_system: true,
      created_at: new Date('2025-01-01T08:00:00Z').toISOString(),
      updated_at: new Date().toISOString(),
    },
    permissions: SYSTEM_ROLE_DEFINITIONS.installation_staff.permissions,
  },
  pos_staff: {
    password: 'XforcePos2026!',
    user: {
      id: 'dev-pos-uid-0005',
      email: 'cashier@xforce.internal',
      user_metadata: { full_name: 'Blessing Udoh (POS Cashier)' },
    },
    profile: {
      id: 'dev-pos-uid-0005',
      full_name: 'Blessing Udoh',
      email: 'cashier@xforce.internal',
      phone: '+234 812 667 8899',
      avatar_url: null,
      role_id: SYSTEM_ROLE_DEFINITIONS.pos_staff.id,
      status: 'active',
      password_setup_required: false,
      created_at: new Date('2025-01-01T08:00:00Z').toISOString(),
      updated_at: new Date().toISOString(),
    },
    role: {
      id: SYSTEM_ROLE_DEFINITIONS.pos_staff.id,
      name: 'pos_staff',
      display_name: 'POS / Cashier Staff',
      description: SYSTEM_ROLE_DEFINITIONS.pos_staff.description,
      is_system: true,
      created_at: new Date('2025-01-01T08:00:00Z').toISOString(),
      updated_at: new Date().toISOString(),
    },
    permissions: SYSTEM_ROLE_DEFINITIONS.pos_staff.permissions,
  },
  inactive: {
    password: 'XforceStaff2026!',
    user: {
      id: 'dev-inactive-uid-0006',
      email: 'former.staff@xforce.internal',
      user_metadata: { full_name: 'Former Staff (Deactivated Account)' },
    },
    profile: {
      id: 'dev-inactive-uid-0006',
      full_name: 'Former Staff Member',
      email: 'former.staff@xforce.internal',
      phone: '+234 800 000 0000',
      avatar_url: null,
      role_id: SYSTEM_ROLE_DEFINITIONS.pos_staff.id,
      status: 'inactive',
      password_setup_required: false,
      created_at: new Date('2025-01-01T08:00:00Z').toISOString(),
      updated_at: new Date().toISOString(),
    },
    role: {
      id: SYSTEM_ROLE_DEFINITIONS.pos_staff.id,
      name: 'pos_staff',
      display_name: 'POS / Cashier Staff',
      description: SYSTEM_ROLE_DEFINITIONS.pos_staff.description,
      is_system: true,
      created_at: new Date('2025-01-01T08:00:00Z').toISOString(),
      updated_at: new Date().toISOString(),
    },
    permissions: SYSTEM_ROLE_DEFINITIONS.pos_staff.permissions,
  },
};
