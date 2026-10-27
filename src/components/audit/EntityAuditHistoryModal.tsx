/**
 * Entity Audit History Modal
 * Module 21 — Audit Logs & System Activity
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Dedicated modal drawer providing chronological audit history for a specific business entity.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  ShieldAlert,
  Clock,
  User,
  ArrowRight,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { AuditLogEntry } from '../../types/audit';
import { auditService } from '../../services/audit.service';
import { AuditLogDetailModal } from './AuditLogDetailModal';

interface EntityAuditHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: string;
  entityId: string;
  entityReference?: string;
  title?: string;
}

export const EntityAuditHistoryModal: React.FC<EntityAuditHistoryModalProps> = ({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityReference,
  title,
}) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  useEffect(() => {
    if (isOpen && entityType && entityId) {
      loadHistory();
    }
  }, [isOpen, entityType, entityId]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const results = await auditService.getEntityAuditHistory(entityType, entityId);
      // Sort newest first
      setLogs(
        results.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
      );
    } catch (err) {
      console.error('Failed to load entity audit history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <div className="relative w-full max-w-2xl my-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <History className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {title || `Activity Audit Trail: ${entityReference || entityId}`}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" size="sm">
                    {entityType.toUpperCase()}
                  </Badge>
                  <span className="text-xs text-slate-500">
                    {logs.length} logged business action(s)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadHistory}
                disabled={isLoading}
                className="h-8 w-8 p-0 rounded-full"
                title="Refresh history"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Timeline List */}
          <div className="p-5 overflow-y-auto space-y-4 text-xs text-left">
            {isLoading ? (
              <div className="flex items-center justify-center p-12 text-slate-400">
                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                <span>Loading entity audit events...</span>
              </div>
            ) : logs.length > 0 ? (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {logs.map((log) => (
                  <div key={log.id} className="relative group">
                    {/* Timeline bullet */}
                    <div className="absolute -left-[27px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-amber-500 shadow-2xs group-hover:scale-125 transition-transform" />

                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-amber-400 transition space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" size="sm">
                            {log.action}
                          </Badge>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {log.actorUserName || log.actorUserEmail || 'System'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            ({log.actorUserRole || 'system'})
                          </span>
                        </div>

                        <span className="text-[11px] font-mono text-slate-400">
                          {new Date(log.timestamp).toLocaleString('en-NG', {
                            timeZone: 'Africa/Lagos',
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>

                      <p className="text-slate-700 dark:text-slate-300">
                        {auditService.generateTimelineNarrative(log)}
                      </p>

                      {log.reason && (
                        <p className="text-[11px] text-slate-500 italic bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                          Note: {log.reason}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-400">
                          Source: {log.source} • Status: {log.status.toUpperCase()}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                          className="h-6 text-[11px] text-amber-600 dark:text-amber-400 font-medium px-1.5"
                        >
                          <span>Inspect Changes</span>
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<History className="h-6 w-6" />}
                title="No Prior Audit Logs"
                description={`No recorded modifications or audit actions found for ${entityReference || entityId}.`}
              />
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-end">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Close History
            </Button>
          </div>
        </div>
      </div>

      {/* Sub-modal for detailed diff */}
      <AuditLogDetailModal
        isOpen={!!selectedLog}
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </>
  );
};
