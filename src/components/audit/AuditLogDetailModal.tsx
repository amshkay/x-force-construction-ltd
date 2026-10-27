/**
 * Audit Log Detail & Before/After Diff Inspector Modal
 * Module 21 — Audit Logs & System Activity
 * XFORCE Construction Ltd / X-FORCE BRICKS
 */

import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  Clock,
  User,
  Globe,
  Monitor,
  FileText,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Code,
  Copy,
  Check,
  History,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AuditLogEntry } from '../../types/audit';

interface AuditLogDetailModalProps {
  log: AuditLogEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onViewEntityHistory?: (entityType: string, entityId: string, entityReference?: string) => void;
}

export const AuditLogDetailModal: React.FC<AuditLogDetailModalProps> = ({
  log,
  isOpen,
  onClose,
  onViewEntityHistory,
}) => {
  const [activeDiffTab, setActiveDiffTab] = useState<'diff' | 'raw'>('diff');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !log) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'CREATE':
      case 'STOCK_COUNT_APPROVED':
      case 'SERVICE_COMPLETED':
        return 'success';
      case 'APPROVE':
      case 'PAYMENT_RECORDED':
      case 'ACTIVATE':
        return 'success';
      case 'REJECT':
      case 'CANCEL':
      case 'DELETE':
      case 'DEACTIVATE':
        return 'danger';
      case 'LOGIN':
      case 'LOGOUT':
      case 'PASSWORD_RESET':
      case 'SETTINGS_CHANGED':
        return 'warning';
      case 'ASSIGN':
      case 'UNASSIGN':
      case 'INVENTORY_ADJUSTED':
        return 'info';
      default:
        return 'outline';
    }
  };

  // Compare previousValues and newValues to show modified keys
  const prevObj = (log.previousValues || {}) as Record<string, any>;
  const newObj = (log.newValues || {}) as Record<string, any>;
  const allKeys = Array.from(new Set([...Object.keys(prevObj), ...Object.keys(newObj)]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant={getActionBadgeVariant(log.action)} size="sm">
                  {log.action}
                </Badge>
                <span className="font-mono text-xs text-slate-400">ID: {log.id}</span>
                <Badge
                  variant={log.status === 'success' ? 'success' : 'danger'}
                  size="sm"
                >
                  {log.status.toUpperCase()}
                </Badge>
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                {log.entityType.toUpperCase()}: {log.entityReference || log.entityId}
              </h2>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-6 text-xs text-left">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
            {/* Actor Context */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-500" />
                Actor Profile
              </span>
              <div className="text-slate-900 dark:text-white font-medium">
                {log.actorUserName || 'System / Automated'}
              </div>
              <div className="text-slate-500 font-mono text-[11px]">
                {log.actorUserEmail || 'N/A'} • Role:{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {log.actorUserRole || 'system'}
                </span>
              </div>
              {log.actorUserId && (
                <div className="text-slate-400 font-mono text-[10px]">
                  User ID: {log.actorUserId}
                </div>
              )}
            </div>

            {/* Event & Device Context */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                Execution Context
              </span>
              <div className="text-slate-900 dark:text-white font-mono">
                {new Date(log.timestamp).toLocaleString('en-NG', {
                  timeZone: 'Africa/Lagos',
                  dateStyle: 'medium',
                  timeStyle: 'medium',
                })}{' '}
                (WAT UTC+1)
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                <span>Source: <strong className="text-slate-700 dark:text-slate-300">{log.source}</strong></span>
                {log.ipAddress && (
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {log.ipAddress}
                  </span>
                )}
              </div>
              {log.userAgent && (
                <div className="text-slate-400 truncate max-w-xs text-[10px]" title={log.userAgent}>
                  <Monitor className="h-3 w-3 inline mr-1" />
                  {log.userAgent}
                </div>
              )}
            </div>
          </div>

          {/* Reason / Justification if provided */}
          {log.reason && (
            <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20">
              <span className="font-bold text-amber-900 dark:text-amber-300 text-[11px] uppercase tracking-wider block mb-1">
                Recorded Operational Reason / Notes
              </span>
              <p className="text-slate-800 dark:text-slate-200 italic">{log.reason}</p>
            </div>
          )}

          {/* Before / After Diff Inspector (Section 7) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  State Changes & Modified Properties
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveDiffTab('diff')}
                    className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                      activeDiffTab === 'diff'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Visual Diff
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDiffTab('raw')}
                    className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                      activeDiffTab === 'raw'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Raw JSON
                  </button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyJson}
                  className="text-xs h-7 px-2"
                  title="Copy full JSON record"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 mr-1 text-emerald-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            {activeDiffTab === 'diff' ? (
              allKeys.length > 0 ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="grid grid-cols-12 bg-slate-100/70 dark:bg-slate-800/60 p-2.5 font-semibold text-slate-600 dark:text-slate-300">
                    <div className="col-span-4">Property</div>
                    <div className="col-span-4">Previous State (Before)</div>
                    <div className="col-span-4">New State (After)</div>
                  </div>

                  {allKeys.map((key) => {
                    const beforeVal = prevObj[key];
                    const afterVal = newObj[key];
                    const isChanged = JSON.stringify(beforeVal) !== JSON.stringify(afterVal);

                    return (
                      <div
                        key={key}
                        className={`grid grid-cols-12 p-2.5 font-mono text-[11px] items-center transition ${
                          isChanged
                            ? 'bg-amber-50/40 dark:bg-amber-950/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                        }`}
                      >
                        <div className="col-span-4 font-semibold text-slate-700 dark:text-slate-300 truncate pr-2">
                          {key}
                        </div>
                        <div className="col-span-4 text-rose-600 dark:text-rose-400 break-words pr-2">
                          {beforeVal !== undefined ? String(JSON.stringify(beforeVal)) : '—'}
                        </div>
                        <div className="col-span-4 text-emerald-600 dark:text-emerald-400 break-words font-semibold">
                          {afterVal !== undefined ? String(JSON.stringify(afterVal)) : '—'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400">
                  No property state diff recorded for this event.
                </div>
              )
            ) : (
              <div className="rounded-xl bg-slate-900 p-4 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-60 border border-slate-800">
                <pre>{JSON.stringify(log, null, 2)}</pre>
              </div>
            )}
          </div>

          {/* Contextual Metadata JSON if present */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div className="space-y-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 text-xs block">
                Additional Context Metadata
              </span>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 font-mono text-[11px] space-y-1">
                {Object.entries(log.metadata).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="text-slate-500 font-semibold">{k}:</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs">
          <span className="text-slate-400 text-[11px]">
            Immutable record • Modification/deletion prohibited by system policy.
          </span>
          <div className="flex items-center gap-2">
            {onViewEntityHistory && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onViewEntityHistory(log.entityType, log.entityId, log.entityReference || undefined);
                }}
                className="text-xs"
              >
                <History className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                View Full Entity History
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Close Inspector
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
