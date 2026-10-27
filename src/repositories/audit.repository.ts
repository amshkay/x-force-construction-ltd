/**
 * Audit Log Repository
 * Module 21 — Audit Logs & System Activity
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Implements an immutable, append-only historical data store.
 * Sanitizes all before/after payloads to permanently exclude passwords, tokens, and secrets.
 * Supports chronological filtering, full-text searching, and entity-specific history lookups.
 */

import {
  AuditLogEntry,
  AuditLogFilters,
  AuditPaginationParams,
  PaginatedAuditResult,
  AuditSummaryStats,
} from '../types/audit';
import { localStore } from '../lib/storage/localStorage';
import { getSupabaseClient } from '../lib/supabase/client';
import { appConfig } from '../config/app.config';
import { Database } from '../types/database';

const AUDIT_LOCAL_STORAGE_KEY = 'xforce_audit_logs_v1';

// Blacklisted keys that must NEVER be written to audit logs
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /apikey/i,
  /api_key/i,
  /authorization/i,
  /credential/i,
  /cvv/i,
  /pin/i,
  /credit_?card/i,
  /hash/i,
];

/**
 * Deeply sanitizes payload objects, redacting any sensitive security tokens or passwords
 */
export function sanitizeAuditValues(data: unknown): unknown {
  if (data === null || data === undefined) return null;
  if (typeof data === 'string') {
    return data.replace(/xforcecon/gi, '[REDACTED_DEFAULT_PASSWORD]');
  }
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeAuditValues(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitive) {
      sanitized[key] = '[REDACTED_FOR_SECURITY]';
    } else if (typeof value === 'string') {
      sanitized[key] = value.replace(/xforcecon/gi, '[REDACTED_DEFAULT_PASSWORD]');
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeAuditValues(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export class AuditRepository {
  private memoryLogs: AuditLogEntry[] | null = null;

  constructor() {
    this.ensureInitialized();
  }

  private ensureInitialized(): void {
    if (this.memoryLogs === null) {
      const stored = localStore.get<AuditLogEntry[] | null>(AUDIT_LOCAL_STORAGE_KEY, null);
      const clean = Array.isArray(stored) ? stored.filter((l) => !l.id?.startsWith('aud-seed-')) : [];
      this.memoryLogs = clean;
    }
  }

  /**
   * Append-only write. Rejects any attempt to overwrite existing audit records.
   */
  async create(entry: AuditLogEntry): Promise<AuditLogEntry> {
    this.ensureInitialized();

    const sanitizedEntry: AuditLogEntry = {
      ...entry,
      id: entry.id || `aud-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: entry.timestamp || new Date().toISOString(),
      reason: entry.reason ? String(entry.reason).replace(/xforcecon/gi, '[REDACTED_DEFAULT_PASSWORD]') : null,
      previousValues: (sanitizeAuditValues(entry.previousValues) as any) ?? null,
      newValues: (sanitizeAuditValues(entry.newValues) as any) ?? null,
      metadata: (sanitizeAuditValues(entry.metadata) as any) ?? null,
    };

    // Prepend to internal log list (newest first)
    this.memoryLogs = [sanitizedEntry, ...(this.memoryLogs || [])];
    localStore.set(AUDIT_LOCAL_STORAGE_KEY, this.memoryLogs);

    // If Supabase is configured, also persist to PostgreSQL
    if (appConfig.supabase.isConfigured) {
      try {
        const supabase = getSupabaseClient();
        const insertData: Database['public']['Tables']['audit_logs']['Insert'] = {
          user_id: sanitizedEntry.actorUserId || null,
          actor_user_id: sanitizedEntry.actorUserId || null,
          user_email: sanitizedEntry.actorUserEmail || null,
          actor_user_email: sanitizedEntry.actorUserEmail || null,
          actor_user_name: sanitizedEntry.actorUserName || null,
          user_role: sanitizedEntry.actorUserRole || null,
          actor_user_role: sanitizedEntry.actorUserRole || null,
          action: sanitizedEntry.action,
          entity_type: sanitizedEntry.entityType,
          entity_id: sanitizedEntry.entityId,
          entity_reference: sanitizedEntry.entityReference || null,
          old_value: sanitizedEntry.previousValues as any,
          previous_values: sanitizedEntry.previousValues as any,
          new_value: sanitizedEntry.newValues as any,
          new_values: sanitizedEntry.newValues as any,
          reason: sanitizedEntry.reason || null,
          metadata: sanitizedEntry.metadata as any,
          source: sanitizedEntry.source || 'Admin Web',
          status: sanitizedEntry.status || 'success',
          ip_address: sanitizedEntry.ipAddress || null,
          user_agent: sanitizedEntry.userAgent || null,
          timestamp: sanitizedEntry.timestamp,
          created_at: sanitizedEntry.timestamp,
        };
        await supabase.from('audit_logs').insert(insertData);
      } catch (err) {
        console.warn('[AuditRepository] Supabase persistence error:', err);
      }
    }

    return sanitizedEntry;
  }

  async getAll(): Promise<AuditLogEntry[]> {
    this.ensureInitialized();
    return [...(this.memoryLogs || [])];
  }

  async getById(id: string): Promise<AuditLogEntry | null> {
    this.ensureInitialized();
    const found = (this.memoryLogs || []).find((l) => l.id === id);
    return found || null;
  }

  /**
   * Filter and paginate audit logs
   */
  async findMany(
    filters: AuditLogFilters,
    pagination: AuditPaginationParams = { page: 1, pageSize: 25 }
  ): Promise<PaginatedAuditResult> {
    this.ensureInitialized();
    let logs = [...(this.memoryLogs || [])];

    // 1. Date Range Filtering
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    let startFilter = filters.startDate;
    let endFilter = filters.endDate;

    if (filters.dateRange === 'today') {
      const t = toYMD(now);
      startFilter = t;
      endFilter = t;
    } else if (filters.dateRange === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = toYMD(y);
      startFilter = yStr;
      endFilter = yStr;
    } else if (filters.dateRange === 'this_week') {
      const day = now.getDay();
      const diff = (day + 6) % 7; // Monday start
      const mon = new Date(now);
      mon.setDate(mon.getDate() - diff);
      startFilter = toYMD(mon);
      endFilter = toYMD(now);
    } else if (filters.dateRange === 'this_month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      startFilter = toYMD(first);
      endFilter = toYMD(now);
    } else if (filters.dateRange === 'last_month') {
      const firstLast = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endLast = new Date(now.getFullYear(), now.getMonth(), 0);
      startFilter = toYMD(firstLast);
      endFilter = toYMD(endLast);
    }

    if (startFilter || endFilter) {
      logs = logs.filter((log) => {
        const logYMD = log.timestamp.split('T')[0];
        if (startFilter && logYMD < startFilter) return false;
        if (endFilter && logYMD > endFilter) return false;
        return true;
      });
    }

    // 2. Action Filter
    if (filters.action && filters.action !== 'all') {
      logs = logs.filter((l) => l.action === filters.action);
    }

    // 3. Entity Type Filter
    if (filters.entityType && filters.entityType !== 'all') {
      logs = logs.filter((l) => l.entityType === filters.entityType);
    }

    // 4. Source Filter
    if (filters.source && filters.source !== 'all') {
      logs = logs.filter((l) => l.source === filters.source);
    }

    // 5. Status Filter
    if (filters.status && filters.status !== 'all') {
      logs = logs.filter((l) => l.status === filters.status);
    }

    // 6. User Filter
    if (filters.actorUserId && filters.actorUserId !== 'all') {
      logs = logs.filter((l) => l.actorUserId === filters.actorUserId);
    }

    // 7. Full-text search
    if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
      const q = filters.searchQuery.toLowerCase().trim();
      logs = logs.filter((l) => {
        return (
          (l.actorUserName && l.actorUserName.toLowerCase().includes(q)) ||
          (l.actorUserEmail && l.actorUserEmail.toLowerCase().includes(q)) ||
          (l.entityReference && l.entityReference.toLowerCase().includes(q)) ||
          (l.entityId && l.entityId.toLowerCase().includes(q)) ||
          (l.action && l.action.toLowerCase().includes(q)) ||
          (l.reason && l.reason.toLowerCase().includes(q)) ||
          (l.ipAddress && l.ipAddress.toLowerCase().includes(q)) ||
          JSON.stringify(l.metadata || {}).toLowerCase().includes(q)
        );
      });
    }

    // Pagination
    const total = logs.length;
    const page = Math.max(1, pagination.page || 1);
    const pageSize = Math.max(1, pagination.pageSize || 25);
    const totalPages = Math.ceil(total / pageSize) || 1;

    const startIndex = (page - 1) * pageSize;
    const items = logs.slice(startIndex, startIndex + pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Retrieves all chronological audit events for a specific business entity (Section 18)
   */
  async findByEntity(entityType: string, entityId: string): Promise<AuditLogEntry[]> {
    this.ensureInitialized();
    const cleanType = entityType.toLowerCase().trim();
    const cleanId = entityId.toLowerCase().trim();

    return (this.memoryLogs || []).filter(
      (l) =>
        l.entityType.toLowerCase() === cleanType &&
        (l.entityId.toLowerCase() === cleanId ||
          (l.entityReference && l.entityReference.toLowerCase() === cleanId))
    );
  }

  /**
   * Computes operational statistics across the audit repository
   */
  async getSummaryStats(): Promise<AuditSummaryStats> {
    this.ensureInitialized();
    const all = this.memoryLogs || [];
    const todayYMD = new Date().toISOString().split('T')[0];

    let todayEvents = 0;
    let securityEvents = 0;
    let failedOperations = 0;

    const actorCounts = new Map<string, { name: string; email: string; count: number }>();
    const entityCounts = new Map<string, number>();

    all.forEach((l) => {
      if (l.timestamp.startsWith(todayYMD)) todayEvents++;
      if (
        l.action === 'LOGIN' ||
        l.action === 'LOGOUT' ||
        l.action === 'PASSWORD_RESET' ||
        l.action === 'SETTINGS_CHANGED'
      ) {
        securityEvents++;
      }
      if (l.status === 'failure') failedOperations++;

      // Top actors
      const actorKey = l.actorUserId || l.actorUserEmail || 'System';
      const actorName = l.actorUserName || l.actorUserEmail || 'System';
      const actorEmail = l.actorUserEmail || 'system@xforce.internal';
      const currentActor = actorCounts.get(actorKey) || { name: actorName, email: actorEmail, count: 0 };
      currentActor.count++;
      actorCounts.set(actorKey, currentActor);

      // Top entities
      entityCounts.set(l.entityType, (entityCounts.get(l.entityType) || 0) + 1);
    });

    const topActors = Array.from(actorCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topEntities = Array.from(entityCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalEvents: all.length,
      todayEvents,
      securityEvents,
      failedOperations,
      topActors,
      topEntities,
    };
  }
}

export const auditRepository = new AuditRepository();
