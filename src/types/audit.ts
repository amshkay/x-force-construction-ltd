/**
 * Audit Log & System Activity Types
 * Module 21 — Audit Logs & System Activity
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Implements strict, immutable, append-only historical tracking for
 * business transactions, user activity, security events, and before/after diffs.
 */

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'ACTIVATE'
  | 'DEACTIVATE'
  | 'APPROVE'
  | 'REJECT'
  | 'CANCEL'
  | 'COMPLETE'
  | 'ASSIGN'
  | 'UNASSIGN'
  | 'LOGIN'
  | 'LOGOUT'
  | 'PASSWORD_RESET'
  | 'PAYMENT_RECORDED'
  | 'INVENTORY_ADJUSTED'
  | 'STOCK_COUNT_APPROVED'
  | 'SERVICE_COMPLETED'
  | 'EXPORT'
  | 'SETTINGS_CHANGED';

export type AuditEntityType =
  | 'order'
  | 'inventory'
  | 'stock_count'
  | 'expense'
  | 'payment'
  | 'installation'
  | 'service_provider'
  | 'request'
  | 'quotation'
  | 'customer'
  | 'product'
  | 'warehouse'
  | 'staff'
  | 'supplier'
  | 'settings'
  | 'auth'
  | 'ai_assistant'
  | 'report'
  | 'system';

export type AuditSource =
  | 'Admin Web'
  | 'Customer Portal'
  | 'POS'
  | 'Warehouse'
  | 'Service'
  | 'AI Assistant'
  | 'System'
  | 'API';

export type AuditStatus = 'success' | 'failure';

export interface AuditLogEntry<TOld = unknown, TNew = unknown> {
  id: string;
  timestamp: string; // ISO 8601 (Africa/Lagos UTC+1 business reference)
  actorUserId?: string | null;
  actorUserEmail?: string | null;
  actorUserName?: string | null;
  actorUserRole?: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityReference?: string | null; // e.g. "XFO-2026-0001", "EXP-2026-0012", "SRV-2026-0005"
  previousValues?: TOld | null; // Sanitized, no secrets or passwords
  newValues?: TNew | null; // Sanitized, no secrets or passwords
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
  source: AuditSource;
  status: AuditStatus;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export type AuditDateRangePreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'all'
  | 'custom';

export interface AuditLogFilters {
  dateRange: AuditDateRangePreset;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  action?: AuditAction | 'all';
  entityType?: AuditEntityType | 'all';
  actorUserId?: string | 'all';
  source?: AuditSource | 'all';
  status?: 'all' | 'success' | 'failure';
  searchQuery?: string;
}

export interface AuditPaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedAuditResult {
  items: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AuditSummaryStats {
  totalEvents: number;
  todayEvents: number;
  securityEvents: number;
  failedOperations: number;
  topActors: Array<{ name: string; email: string; count: number }>;
  topEntities: Array<{ type: string; count: number }>;
}
