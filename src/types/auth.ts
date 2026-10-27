/**
 * Authentication & Authorization Types
 * XFORCE Construction Management & Customer Platform (Brand: X-FORCE BRICKS)
 * Single-business RBAC Foundation
 */

import { User } from '@supabase/supabase-js';
import { DbProfile, DbRole, UserStatus } from './database';

export type StaffRoleName =
  | 'administrator'
  | 'sales_manager'
  | 'warehouse_staff'
  | 'installation_staff'
  | 'pos_staff';

export type UserRole = StaffRoleName | 'customer';

/**
 * Granular Permission Codes
 * Directly mapped to database permissions table from Module 02
 */
export const PERMISSION_CODES = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',

  // Catalog & Products
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_UPDATE: 'products.update',
  PRODUCTS_DELETE: 'products.delete',

  // Inventory & Warehouse
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_RECEIVE: 'inventory.receive',
  INVENTORY_ISSUE: 'inventory.issue',
  INVENTORY_TRANSFER: 'inventory.transfer',
  INVENTORY_ADJUST: 'inventory.adjust',
  INVENTORY_MANAGE_LOCATIONS: 'inventory.manage_locations',
  INVENTORY_MANAGE_THRESHOLDS: 'inventory.manage_thresholds',
  WAREHOUSE_VIEW: 'warehouse.view',
  WAREHOUSE_UPDATE: 'warehouse.update',
  WAREHOUSE_ALLOCATE: 'warehouse.allocate',
  WAREHOUSE_PICK: 'warehouse.pick',
  WAREHOUSE_PACK: 'warehouse.pack',
  WAREHOUSE_DISPATCH: 'warehouse.dispatch',
  WAREHOUSE_DELIVER: 'warehouse.deliver',

  // Physical Stock Counting & Reconciliation (Module 12)
  STOCK_COUNTS_VIEW: 'stock_counts.view',
  STOCK_COUNTS_CREATE: 'stock_counts.create',
  STOCK_COUNTS_COUNT: 'stock_counts.count',
  STOCK_COUNTS_REVIEW: 'stock_counts.review',
  STOCK_COUNTS_RECOUNT: 'stock_counts.recount',
  STOCK_COUNTS_APPROVE: 'stock_counts.approve',
  STOCK_COUNTS_RECONCILE: 'stock_counts.reconcile',
  STOCK_COUNTS_CANCEL: 'stock_counts.cancel',

  // Customers & CRM
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_CREATE: 'customers.create',
  CUSTOMERS_UPDATE: 'customers.update',

  // Customer Requests (Module 09)
  REQUESTS_VIEW: 'requests.view',
  REQUESTS_CREATE: 'requests.create',
  REQUESTS_UPDATE: 'requests.update',
  REQUESTS_ASSIGN: 'requests.assign',
  REQUESTS_CLOSE: 'requests.close',

  // Quotations (Module 09)
  QUOTATIONS_VIEW: 'quotations.view',
  QUOTATIONS_CREATE: 'quotations.create',
  QUOTATIONS_UPDATE: 'quotations.update',
  QUOTATIONS_APPROVE: 'quotations.approve',
  QUOTATIONS_SEND: 'quotations.send',
  QUOTATIONS_CANCEL: 'quotations.cancel',

  // Orders
  ORDERS_VIEW: 'orders.view',
  ORDERS_CREATE: 'orders.create',
  ORDERS_UPDATE: 'orders.update',
  ORDERS_CANCEL: 'orders.cancel',

  // Payments
  PAYMENTS_VIEW: 'payments.view',
  PAYMENTS_CREATE: 'payments.create',
  PAYMENTS_RECORD: 'payments.record',
  PAYMENTS_VERIFY: 'payments.verify',

  // Point of Sale (Module 13)
  POS_ACCESS: 'pos.access',
  POS_SELL: 'pos.sell',
  POS_DISCOUNT: 'pos.discount',
  POS_PRICE_OVERRIDE: 'pos.price_override',
  POS_PARTIAL_PAYMENT: 'pos.partial_payment',
  POS_CANCEL_SALE: 'pos.cancel_sale',
  POS_VIEW_SALES: 'pos.view_sales',

  // Installations
  INSTALLATIONS_VIEW: 'installations.view',
  INSTALLATIONS_CREATE: 'installations.create',
  INSTALLATIONS_UPDATE: 'installations.update',
  INSTALLATIONS_ASSIGN: 'installations.assign',
  INSTALLATIONS_QUALITY_CHECK: 'installations.quality_check',
  INSTALLATIONS_COMPLETE: 'installations.complete',

  // Service Providers (Module 16)
  SERVICE_PROVIDERS_VIEW: 'service_providers.view',
  SERVICE_PROVIDERS_CREATE: 'service_providers.create',
  SERVICE_PROVIDERS_EDIT: 'service_providers.edit',
  SERVICE_PROVIDERS_ASSIGN: 'service_providers.assign',
  SERVICE_PROVIDERS_DEACTIVATE: 'service_providers.deactivate',

  // Staff & Administration (Module 17)
  STAFF_VIEW: 'staff.view',
  STAFF_MANAGE: 'staff.manage',
  STAFF_CREATE: 'staff.create',
  STAFF_EDIT: 'staff.edit',
  STAFF_MANAGE_STATUS: 'staff.manage_status',

  // Suppliers Management (Module 17)
  SUPPLIERS_VIEW: 'suppliers.view',
  SUPPLIERS_MANAGE: 'suppliers.manage',
  SUPPLIERS_CREATE: 'suppliers.create',
  SUPPLIERS_EDIT: 'suppliers.edit',
  SUPPLIERS_DEACTIVATE: 'suppliers.deactivate',

  // Business Expenses & Finance (Module 17)
  EXPENSES_VIEW: 'expenses.view',
  EXPENSES_MANAGE: 'expenses.manage',
  EXPENSES_CREATE: 'expenses.create',
  EXPENSES_APPROVE: 'expenses.approve',
  EXPENSES_DELETE: 'expenses.delete',

  // Reporting, Analytics & Management Dashboard (Module 20)
  REPORTS_VIEW: 'reports.view',
  REPORTS_SALES: 'reports.sales',
  REPORTS_INVENTORY: 'reports.inventory',
  REPORTS_OPERATIONS: 'reports.operations',
  REPORTS_FINANCE: 'reports.finance',
  REPORTS_EXPORT: 'reports.export',
  // Communication & Notifications (Module 18)
  COMMUNICATION_VIEW: 'communication.view',
  COMMUNICATION_MANAGE: 'communication.manage',
  NOTIFICATIONS_VIEW: 'notifications.view',
  NOTIFICATIONS_MANAGE: 'notifications.manage',
  MESSAGES_VIEW: 'messages.view',
  MESSAGES_SEND: 'messages.send',
  MESSAGES_MANAGE: 'messages.manage',

  // AI Business Assistant (Module 19)
  AI_ASSISTANT_USE: 'ai_assistant.use',
  AI_ASSISTANT_ACTIONS: 'ai_assistant.actions',

  SETTINGS_VIEW: 'settings.view',
  SETTINGS_MANAGE: 'settings.manage',
  AUDIT_LOGS_VIEW: 'audit_logs.view',
  AUDIT_LOGS_EXPORT: 'audit_logs.export',

  // Offline-First PWA & Synchronization (Module 22)
  SYNC_VIEW: 'sync.view',
  SYNC_MANAGE: 'sync.manage',

  // System Health & Operational Diagnostics (Module 26)
  SYSTEM_HEALTH_VIEW: 'system_health.view',
  SYSTEM_HEALTH_MANAGE: 'system_health.manage',

  // Media, Designs & Project Gallery (Module 07)
  MEDIA_VIEW: 'media.view',
  MEDIA_CREATE: 'media.create',
  MEDIA_UPDATE: 'media.update',
  MEDIA_DELETE: 'media.delete',
  DESIGNS_VIEW: 'designs.view',
  DESIGNS_CREATE: 'designs.create',
  DESIGNS_UPDATE: 'designs.update',
  DESIGNS_DELETE: 'designs.delete',
  PROJECTS_VIEW: 'projects.view',
  PROJECTS_CREATE: 'projects.create',
  PROJECTS_UPDATE: 'projects.update',
  PROJECTS_DELETE: 'projects.delete',
} as const;

export type PermissionCode = (typeof PERMISSION_CODES)[keyof typeof PERMISSION_CODES];

export interface UserPermission {
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
  subject:
    | 'products'
    | 'media'
    | 'designs'
    | 'projects'
    | 'requests'
    | 'inventory'
    | 'orders'
    | 'quotations'
    | 'payments'
    | 'pos'
    | 'warehouse'
    | 'installations'
    | 'service_providers'
    | 'staff'
    | 'suppliers'
    | 'expenses'
    | 'communication'
    | 'messages'
    | 'notifications'
    | 'ai_assistant'
    | 'reports'
    | 'settings'
    | 'all';
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  status: UserStatus;
  passwordSetupRequired: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthContextType {
  currentUser: User | null;
  profile: DbProfile | null;
  role: DbRole | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  accountStatus: UserStatus;
  isAccountActive: boolean;
  needsPasswordSetup: boolean;
  isDevSandboxActive: boolean;
  activeSandboxPersona: StaffRoleName | 'inactive' | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message: string }>;
  updatePassword: (newPassword: string) => Promise<void>;
  completeFirstTimeSetup: (newPassword: string) => Promise<void>;
  updateProfile: (data: { fullName?: string; phone?: string; avatarUrl?: string }) => Promise<void>;
  refreshProfile: () => Promise<void>;

  // Dev sandbox role switcher (available when Supabase is not yet configured or for testing)
  switchSandboxPersona: (persona: StaffRoleName | 'inactive' | null) => void;

  // Authorization Helpers
  hasRole: (roleName: UserRole | string) => boolean;
  hasPermission: (permissionCode: string) => boolean;
  can: (permissionCode: string) => boolean;
  isAdministrator: () => boolean;
  isStaff: () => boolean;
}

export interface LoginErrorState {
  isError: boolean;
  message: string;
  isNetworkError: boolean;
  fieldErrors?: {
    email?: string;
    password?: string;
  };
}

