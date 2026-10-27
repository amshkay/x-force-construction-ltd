/**
 * Operational Error Logger Service
 * Module 26 — Production Monitoring, Health & Operational Diagnostics
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Captures, sanitizes, and indexes operational failure events for administrative diagnostics.
 *
 * Distinction from Module 21 Audit Logs:
 * - Module 21 Audit Logs record business actions: "Who changed what price or approved what expense?"
 * - Module 26 Operational Logs record failure diagnostics: "Why did a sync fail or a query timeout?"
 *
 * Strict Privacy & Storage Retention:
 * - Passwords, Bearer tokens, and secrets are scrubbed before storage.
 * - Enforces a 100-item FIFO ring buffer so browser local storage never grows unbounded.
 * - Never touches or deletes Module 21 audit logs.
 */

import { localStore } from '../../lib/storage/localStorage';
import { OperationalError, ErrorLogFilters, ErrorSeverity } from '../../types/diagnostics';
import { sanitizeInputString } from '../../utils/securitySanitizer';

const OPERATIONAL_ERRORS_STORAGE_KEY = 'xforce_operational_errors_v1';
const MAX_ERROR_LOG_ITEMS = 100;

export class OperationalErrorLoggerService {
  /**
   * Generates a safe, human-readable error reference code
   * Format: ERR-YYYYMMDD-XXXX
   */
  public generateErrorReference(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `ERR-${year}${month}${day}-${rand}`;
  }

  /**
   * Scrubs potential credentials, passwords, tokens, or connection strings from text
   */
  public scrubSensitiveText(text: string): string {
    if (!text) return '';
    return text
      .replace(/xforcecon/gi, '[REDACTED_PASSWORD]')
      .replace(/bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED_TOKEN]')
      .replace(/key=[A-Za-z0-9_\-]+/gi, 'key=[REDACTED_KEY]')
      .replace(/apiKey[:=][A-Za-z0-9_\-]+/gi, 'apiKey:[REDACTED_KEY]')
      .replace(/password[:=][^\s&]+/gi, 'password=[REDACTED]')
      .replace(/postgres(?:ql)?:\/\/[^:]+:[^@]+@/gi, 'postgres://user:[REDACTED]@');
  }

  /**
   * Converts obscure database / JavaScript error codes into helpful user guidance
   */
  public toUserFriendlyMessage(rawError: any): string {
    if (!rawError) return 'An unexpected system error occurred. Please try again.';

    const message = typeof rawError === 'string' ? rawError : rawError.message || String(rawError);
    const code = rawError.code ? String(rawError.code) : '';

    if (code === 'PGRST116') {
      return 'The requested record could not be found. It may have been updated or moved.';
    }
    if (code === '23505' || message.includes('duplicate key value')) {
      return 'A record with these details already exists in the system. Duplicate entries are blocked.';
    }
    if (code === '42P01' || message.includes('does not exist')) {
      return 'The requested database table is currently offline or pending initialization.';
    }
    if (code === '42501' || message.includes('permission denied') || message.includes('row-level security')) {
      return 'You do not have administrative permission to complete this action on this record.';
    }
    if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('Network request failed')) {
      return 'Unable to reach the server. Your work has been saved locally and will synchronize when your connection is restored.';
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'The server took too long to respond. Please check your network connection and retry.';
    }

    return sanitizeInputString(message);
  }

  /**
   * Captures and records a system operational failure event
   */
  public captureError(params: {
    module: OperationalError['module'];
    operation: string;
    severity?: ErrorSeverity;
    userRole?: string;
    rawError?: any;
    userMessage?: string;
    referenceId?: string;
  }): OperationalError {
    const errorId = this.generateErrorReference();
    const rawError = params.rawError;
    const rawMessage = rawError ? (rawError.message || String(rawError)) : '';
    const technicalSummary = this.scrubSensitiveText(
      rawError?.stack ? `${rawMessage}\n${rawError.stack.split('\n').slice(0, 3).join('\n')}` : rawMessage
    );

    const userMessage = params.userMessage
      ? sanitizeInputString(params.userMessage)
      : this.toUserFriendlyMessage(rawError);

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    const newError: OperationalError = {
      id: errorId,
      timestamp: new Date().toISOString(),
      module: params.module,
      operation: sanitizeInputString(params.operation),
      severity: params.severity || 'ERROR',
      userRole: params.userRole || 'staff',
      userMessage,
      technicalSummary: technicalSummary || undefined,
      referenceId: params.referenceId ? sanitizeInputString(params.referenceId) : undefined,
      isOnline,
      resolved: false,
    };

    // Save to ring buffer
    const existing = this.getAllErrors();
    const updated = [newError, ...existing].slice(0, MAX_ERROR_LOG_ITEMS);
    localStore.set(OPERATIONAL_ERRORS_STORAGE_KEY, updated);

    return newError;
  }

  /**
   * Retrieves all errors with optional filtering
   */
  public getAllErrors(filters?: ErrorLogFilters): OperationalError[] {
    const items = localStore.get<OperationalError[]>(OPERATIONAL_ERRORS_STORAGE_KEY, []);

    if (!filters) return items;

    return items.filter((err) => {
      if (filters.severity && filters.severity !== 'ALL' && err.severity !== filters.severity) {
        return false;
      }
      if (filters.module && filters.module !== 'ALL' && err.module !== filters.module) {
        return false;
      }
      if (filters.unresolvedOnly && err.resolved) {
        return false;
      }
      if (filters.searchQuery?.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        const matches =
          err.id.toLowerCase().includes(q) ||
          err.operation.toLowerCase().includes(q) ||
          err.userMessage.toLowerCase().includes(q) ||
          (err.referenceId && err.referenceId.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }

  /**
   * Marks a specific error as investigated/resolved by an administrator
   */
  public resolveError(id: string, resolvedByName: string = 'Administrator'): boolean {
    const errors = this.getAllErrors();
    const idx = errors.findIndex((e) => e.id === id);
    if (idx === -1) return false;

    errors[idx] = {
      ...errors[idx],
      resolved: true,
      resolvedAt: new Date().toISOString(),
      resolvedByName,
    };

    localStore.set(OPERATIONAL_ERRORS_STORAGE_KEY, errors);
    return true;
  }

  /**
   * Cleans up resolved errors from the ring buffer
   */
  public clearResolvedErrors(): number {
    const errors = this.getAllErrors();
    const remaining = errors.filter((e) => !e.resolved);
    const removedCount = errors.length - remaining.length;
    localStore.set(OPERATIONAL_ERRORS_STORAGE_KEY, remaining);
    return removedCount;
  }

  /**
   * Clears operational error log (does NOT affect Module 21 audit logs)
   */
  public clearAllErrors(): void {
    localStore.set(OPERATIONAL_ERRORS_STORAGE_KEY, []);
  }

  /**
   * Summary counts for quick health overview
   */
  public getErrorStats(): {
    total: number;
    unresolved: number;
    critical: number;
    errors: number;
    warnings: number;
  } {
    const errors = this.getAllErrors();
    let unresolved = 0;
    let critical = 0;
    let errorCount = 0;
    let warnings = 0;

    errors.forEach((e) => {
      if (!e.resolved) {
        unresolved++;
        if (e.severity === 'CRITICAL') critical++;
        else if (e.severity === 'ERROR') errorCount++;
        else if (e.severity === 'WARNING') warnings++;
      }
    });

    return {
      total: errors.length,
      unresolved,
      critical,
      errors: errorCount,
      warnings,
    };
  }
}

export const errorLogger = new OperationalErrorLoggerService();
