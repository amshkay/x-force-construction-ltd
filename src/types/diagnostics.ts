/**
 * System Health & Operational Diagnostics Types
 * Module 26 — Production Monitoring, Health & Operational Diagnostics
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Lightweight operational telemetry types for non-technical administrators.
 * Focuses on service availability, sync integrity, and actionable operational failure records.
 */

export type HealthStatus =
  | 'healthy'
  | 'warning'
  | 'offline'
  | 'error'
  | 'not_configured'
  | 'not_tested';

export type ErrorSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface SystemComponentHealth {
  id: string;
  name: string;
  category: 'core' | 'database' | 'storage' | 'sync' | 'integration' | 'pwa';
  status: HealthStatus;
  statusLabel: string;
  summary: string;
  latencyMs?: number | null;
  checkedAt: string;
  meta?: Record<string, string | number | boolean | null>;
}

export interface OverallSystemHealth {
  status: 'healthy' | 'warning' | 'error' | 'offline';
  label: string;
  score: number; // 0 - 100
  components: SystemComponentHealth[];
  lastChecked: string;
  isOnline: boolean;
  activeAlertsCount: number;
}

export interface OperationalError {
  id: string; // e.g. ERR-20261004-9842
  timestamp: string;
  module:
    | 'auth'
    | 'database'
    | 'inventory'
    | 'pos'
    | 'quotation'
    | 'order'
    | 'warehouse'
    | 'installation'
    | 'sync'
    | 'storage'
    | 'payments'
    | 'network'
    | 'system';
  operation: string;
  severity: ErrorSeverity;
  userRole?: string;
  userMessage: string;
  technicalSummary?: string;
  referenceId?: string; // Entity ID (e.g. order number, reference code)
  isOnline: boolean;
  resolved: boolean;
  resolvedAt?: string;
  resolvedByName?: string;
}

export interface ErrorLogFilters {
  severity?: ErrorSeverity | 'ALL';
  module?: string | 'ALL';
  searchQuery?: string;
  unresolvedOnly?: boolean;
}
