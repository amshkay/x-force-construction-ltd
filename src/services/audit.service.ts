/**
 * Audit Logging & System Activity Service
 * Module 21 — Audit Logs & System Activity
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Authoritative business action logger and activity record engine.
 * Ensures strict append-only immutability, excludes passwords/secrets,
 * records before/after state diffs, and provides entity-level audit trails.
 */

import {
  AuditLogEntry,
  AuditAction,
  AuditEntityType,
  AuditSource,
  AuditStatus,
  AuditLogFilters,
  AuditPaginationParams,
  PaginatedAuditResult,
  AuditSummaryStats,
} from '../types/audit';
import { auditRepository } from '../repositories/audit.repository';

export interface LogBusinessActionParams {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityReference?: string | null;
  actor?: {
    id?: string | null;
    email?: string | null;
    name?: string | null;
    role?: string | null;
  };
  previousValues?: unknown;
  newValues?: unknown;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
  source?: AuditSource;
  status?: AuditStatus;
  ipAddress?: string | null;
  userAgent?: string | null;
}

function normalizeAction(actionStr: string): AuditAction {
  const upper = String(actionStr || '').toUpperCase();
  const validActions = [
    'CREATE',
    'UPDATE',
    'DELETE',
    'ACTIVATE',
    'DEACTIVATE',
    'APPROVE',
    'REJECT',
    'CANCEL',
    'COMPLETE',
    'ASSIGN',
    'UNASSIGN',
    'LOGIN',
    'LOGOUT',
    'PASSWORD_RESET',
    'PAYMENT_RECORDED',
    'INVENTORY_ADJUSTED',
    'STOCK_COUNT_APPROVED',
    'SERVICE_COMPLETED',
    'EXPORT',
    'SETTINGS_CHANGED',
  ];
  if (validActions.includes(upper)) return upper as AuditAction;

  const low = String(actionStr || '').toLowerCase();
  if (low.includes('create')) return 'CREATE';
  if (low.includes('approved') || low.includes('approve')) return 'APPROVE';
  if (low.includes('rejected') || low.includes('reject')) return 'REJECT';
  if (low.includes('cancel') || low.includes('void')) return 'CANCEL';
  if (low.includes('complete') || low.includes('paid')) return 'COMPLETE';
  if (low.includes('unassign')) return 'UNASSIGN';
  if (low.includes('assign')) return 'ASSIGN';
  if (low.includes('login') || low.includes('sign_in') || low.includes('signed_in')) return 'LOGIN';
  if (low.includes('logout') || low.includes('sign_out') || low.includes('signed_out')) return 'LOGOUT';
  if (low.includes('password')) return 'PASSWORD_RESET';
  if (low.includes('payment')) return 'PAYMENT_RECORDED';
  if (low.includes('adjust') || low.includes('stock') || low.includes('inventory')) return 'INVENTORY_ADJUSTED';
  if (low.includes('export')) return 'EXPORT';
  if (low.includes('setting') || low.includes('config')) return 'SETTINGS_CHANGED';
  if (low.includes('deactivate')) return 'DEACTIVATE';
  if (low.includes('activate')) return 'ACTIVATE';
  if (low.includes('delete') || low.includes('remove')) return 'DELETE';
  return 'UPDATE';
}

function normalizeEntityType(str: string): AuditEntityType {
  const low = String(str || '').toLowerCase();
  if (low.includes('order')) return 'order';
  if (low.includes('inventory') || low.includes('stock_item')) return 'inventory';
  if (low.includes('stock_count') || low.includes('count')) return 'stock_count';
  if (low.includes('expense')) return 'expense';
  if (low.includes('payment')) return 'payment';
  if (low.includes('installation') || low.includes('service_job')) return 'installation';
  if (low.includes('service_provider') || low.includes('provider')) return 'service_provider';
  if (low.includes('request')) return 'request';
  if (low.includes('quotation')) return 'quotation';
  if (low.includes('customer')) return 'customer';
  if (low.includes('product')) return 'product';
  if (low.includes('warehouse') || low.includes('fulfilment')) return 'warehouse';
  if (low.includes('staff')) return 'staff';
  if (low.includes('supplier')) return 'supplier';
  if (low.includes('setting')) return 'settings';
  if (low.includes('auth') || low.includes('user')) return 'auth';
  if (low.includes('ai') || low.includes('assistant')) return 'ai_assistant';
  if (low.includes('report')) return 'report';
  return 'system';
}

function extractEntityReference(params: any): string | null {
  if (params.entity_reference) return params.entity_reference;
  if (params.new_values) {
    const nv = params.new_values;
    if (nv.orderNumber) return nv.orderNumber;
    if (nv.expenseNumber) return nv.expenseNumber;
    if (nv.jobReference) return nv.jobReference;
    if (nv.requestNumber) return nv.requestNumber;
    if (nv.quotationNumber) return nv.quotationNumber;
    if (nv.sku) return nv.sku;
    if (nv.staffNumber) return nv.staffNumber;
    if (nv.supplierNumber) return nv.supplierNumber;
    if (nv.countNumber) return nv.countNumber;
  }
  if (params.old_values) {
    const ov = params.old_values;
    if (ov.orderNumber) return ov.orderNumber;
    if (ov.expenseNumber) return ov.expenseNumber;
    if (ov.jobReference) return ov.jobReference;
    if (ov.requestNumber) return ov.requestNumber;
    if (ov.quotationNumber) return ov.quotationNumber;
    if (ov.sku) return ov.sku;
  }
  if (params.reason) {
    const match = params.reason.match(/\b([A-Z]{2,4}-\d{4}-\d{3,5}|PRD-[A-Z0-9]+)\b/i);
    if (match) return match[1].toUpperCase();
  }
  return null;
}

export class AuditService {
  /**
   * Primary entrypoint for logging business actions with before/after state diffs
   */
  async logBusinessAction(params: LogBusinessActionParams): Promise<AuditLogEntry> {
    const entry: AuditLogEntry = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
      actorUserId: params.actor?.id || null,
      actorUserEmail: params.actor?.email || null,
      actorUserName: params.actor?.name || null,
      actorUserRole: params.actor?.role || null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      entityReference: params.entityReference || null,
      previousValues: (params.previousValues as any) ?? null,
      newValues: (params.newValues as any) ?? null,
      reason: params.reason || null,
      metadata: params.metadata || null,
      source: params.source || 'Admin Web',
      status: params.status || 'success',
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : null),
    };

    return auditRepository.create(entry);
  }

  /**
   * Security & Authentication Event Logger (Section 11)
   */
  async logAuthEvent(
    action: 'LOGIN' | 'LOGOUT' | 'PASSWORD_RESET' | 'ACTIVATE' | 'DEACTIVATE',
    user: { id?: string | null; email?: string | null; name?: string | null; role?: string | null },
    metadata?: Record<string, unknown>,
    status: AuditStatus = 'success'
  ): Promise<AuditLogEntry> {
    return this.logBusinessAction({
      action,
      entityType: 'auth',
      entityId: user.id || 'auth-session',
      entityReference: user.email || user.name || 'User Session',
      actor: user,
      metadata,
      source: 'Admin Web',
      status,
    });
  }

  /**
   * Backward-compatible logEvent helper used in earlier modules
   */
  async logEvent(params: {
    action: string;
    entity_type?: string;
    entity_id?: string;
    entity_reference?: string;
    user_id?: string | null;
    user_email?: string | null;
    user_role?: string | null;
    reason?: string | null;
    old_values?: any;
    new_values?: any;
    metadata?: any;
    source?: AuditSource;
  }): Promise<boolean> {
    try {
      const normalizedAction = normalizeAction(params.action);
      const normalizedEntityType = normalizeEntityType(params.entity_type || '');
      const ref = extractEntityReference(params);

      await this.logBusinessAction({
        action: normalizedAction,
        entityType: normalizedEntityType,
        entityId: params.entity_id || 'general',
        entityReference: ref,
        actor: {
          id: params.user_id,
          email: params.user_email,
          role: params.user_role,
        },
        previousValues: params.old_values,
        newValues: params.new_values,
        reason: params.reason,
        metadata: params.metadata,
        source: params.source || 'Admin Web',
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Backward-compatible logAction helper
   */
  async logAction(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    newValues?: any,
    oldValues?: any,
    reason?: string
  ): Promise<boolean> {
    try {
      const normalizedAction = normalizeAction(action);
      const normalizedEntityType = normalizeEntityType(entityType);
      const ref = extractEntityReference({ new_values: newValues, old_values: oldValues, reason });

      await this.logBusinessAction({
        action: normalizedAction,
        entityType: normalizedEntityType,
        entityId,
        entityReference: ref,
        actor: { id: userId },
        previousValues: oldValues,
        newValues,
        reason,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Universal log helper supporting flexible parameter signatures
   */
  async log(params: {
    action: string;
    entityType?: string;
    entityId?: string;
    entityReference?: string;
    oldValue?: any;
    newValue?: any;
    previousValues?: any;
    newValues?: any;
    reason?: string;
    actor?: { id?: string | null; email?: string | null; name?: string | null; role?: string | null };
    metadata?: any;
    source?: AuditSource;
    status?: AuditStatus;
    userId?: string;
    userEmail?: string;
    userRole?: string;
  }): Promise<boolean> {
    try {
      const normalizedAction = normalizeAction(params.action);
      const normalizedEntityType = normalizeEntityType(params.entityType || '');
      const ref = extractEntityReference({
        new_values: params.newValue ?? params.newValues,
        old_values: params.oldValue ?? params.previousValues,
        entity_reference: params.entityReference,
        reason: params.reason,
      });

      await this.logBusinessAction({
        action: normalizedAction,
        entityType: normalizedEntityType,
        entityId: params.entityId || 'general',
        entityReference: ref,
        actor: params.actor || {
          id: params.userId,
          email: params.userEmail,
          role: params.userRole,
        },
        previousValues: params.oldValue ?? params.previousValues,
        newValues: params.newValue ?? params.newValues,
        reason: params.reason,
        metadata: params.metadata,
        source: params.source || 'Admin Web',
        status: params.status || 'success',
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Backward-compatible record helper
   */
  async record<TOld = unknown, TNew = unknown>(
    entry: Omit<AuditLogEntry<TOld, TNew>, 'timestamp' | 'id'> & { timestamp?: string; id?: string }
  ): Promise<boolean> {
    try {
      await auditRepository.create({
        id: entry.id || `aud-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        timestamp: entry.timestamp || new Date().toISOString(),
        actorUserId: entry.actorUserId || null,
        actorUserEmail: entry.actorUserEmail || null,
        actorUserName: entry.actorUserName || null,
        actorUserRole: entry.actorUserRole || null,
        action: entry.action || 'UPDATE',
        entityType: entry.entityType || 'system',
        entityId: entry.entityId || 'general',
        entityReference: entry.entityReference || null,
        previousValues: entry.previousValues ?? null,
        newValues: entry.newValues ?? null,
        reason: entry.reason || null,
        metadata: entry.metadata || null,
        source: entry.source || 'Admin Web',
        status: entry.status || 'success',
        ipAddress: entry.ipAddress || null,
        userAgent: entry.userAgent || null,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Retrieve filtered and paginated audit records (Section 17)
   */
  async getAuditLogs(
    filters: AuditLogFilters,
    pagination: AuditPaginationParams
  ): Promise<PaginatedAuditResult> {
    return auditRepository.findMany(filters, pagination);
  }

  /**
   * Retrieve chronological activity trail for a single business entity (Section 18)
   */
  async getEntityAuditHistory(entityType: string, entityId: string): Promise<AuditLogEntry[]> {
    return auditRepository.findByEntity(entityType, entityId);
  }

  /**
   * Compute operational and security statistics across logs
   */
  async getSummaryStats(): Promise<AuditSummaryStats> {
    return auditRepository.getSummaryStats();
  }

  /**
   * Formats a human-readable activity narrative statement for the timeline stream (Section 28)
   */
  generateTimelineNarrative(log: AuditLogEntry): string {
    const actor = log.actorUserName || log.actorUserEmail || 'System';
    const ref = log.entityReference ? ` (${log.entityReference})` : '';

    switch (log.action) {
      case 'CREATE':
        return `${actor} created ${log.entityType}${ref}.`;
      case 'UPDATE':
        return `${actor} updated ${log.entityType}${ref}.`;
      case 'DELETE':
        return `${actor} deleted ${log.entityType}${ref}.`;
      case 'APPROVE':
        return `${actor} approved ${log.entityType}${ref}.`;
      case 'REJECT':
        return `${actor} rejected ${log.entityType}${ref}.`;
      case 'CANCEL':
        return `${actor} cancelled ${log.entityType}${ref}.`;
      case 'COMPLETE':
        return `${actor} completed ${log.entityType}${ref}.`;
      case 'ASSIGN':
        return `${actor} assigned ${log.entityType}${ref}.`;
      case 'UNASSIGN':
        return `${actor} unassigned ${log.entityType}${ref}.`;
      case 'LOGIN':
        return `${actor} logged into the system session.`;
      case 'LOGOUT':
        return `${actor} logged out of the application.`;
      case 'PASSWORD_RESET':
        return `${actor} reset account credentials.`;
      case 'PAYMENT_RECORDED':
        return `${actor} recorded verified payment receipt${ref}.`;
      case 'INVENTORY_ADJUSTED':
        return `${actor} adjusted yard stock level for ${log.entityType}${ref}.`;
      case 'STOCK_COUNT_APPROVED':
        return `${actor} approved physical stock count audit${ref}.`;
      case 'SERVICE_COMPLETED':
        return `${actor} confirmed final handover for service job${ref}.`;
      case 'EXPORT':
        return `${actor} exported report data${ref}.`;
      case 'SETTINGS_CHANGED':
        return `${actor} modified system configuration parameters.`;
      case 'ACTIVATE':
        return `${actor} activated ${log.entityType}${ref} account.`;
      case 'DEACTIVATE':
        return `${actor} deactivated ${log.entityType}${ref} account.`;
      default:
        return `${actor} performed ${String(log.action).toLowerCase()} on ${log.entityType}${ref}.`;
    }
  }

  /**
   * Export audit log records to CSV with UTF-8 BOM (Section 15)
   */
  exportToCsv(logs: AuditLogEntry[], filenamePrefix: string = 'XFORCE_Audit_Logs'): void {
    const headers = [
      'Event ID',
      'Timestamp (UTC)',
      'Actor Name',
      'Actor Email',
      'Actor Role',
      'Action',
      'Entity Type',
      'Entity Reference',
      'Entity ID',
      'Source Channel',
      'Execution Status',
      'Reason / Note',
      'IP Address',
    ];

    const rows = logs.map((l) => [
      l.id,
      l.timestamp,
      l.actorUserName || 'System',
      l.actorUserEmail || 'N/A',
      l.actorUserRole || 'System',
      l.action,
      l.entityType,
      l.entityReference || l.entityId,
      l.entityId,
      l.source,
      l.status.toUpperCase(),
      l.reason || '',
      l.ipAddress || '',
    ]);

    const csvContent = [
      headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','),
      ...rows.map((row) =>
        row
          .map((val) => {
            const str = String(val ?? '');
            return `"${str.replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ].join('\r\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filenamePrefix}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const auditService = new AuditService();
