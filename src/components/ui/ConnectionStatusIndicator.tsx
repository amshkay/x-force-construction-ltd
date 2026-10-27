/**
 * Connection & Synchronization Status Indicator
 * Module 22 — Offline-First PWA & Synchronization
 * XFORCE Construction Ltd / X-FORCE BRICKS
 */

import React from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useSyncEngine } from '../../hooks/useSyncEngine';

export type SyncState =
  | 'online'
  | 'offline'
  | 'synchronizing'
  | 'pending_sync'
  | 'conflict'
  | 'sync_complete'
  | 'sync_failed';

export interface ConnectionStatusIndicatorProps {
  syncStateOverride?: SyncState;
  showText?: boolean;
  className?: string;
  id?: string;
  onClick?: () => void;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  syncStateOverride,
  showText = false,
  className,
  id = 'connection-status-indicator',
  onClick,
}) => {
  const { status, syncNow } = useSyncEngine();

  let resolvedState: SyncState = 'online';

  if (syncStateOverride) {
    resolvedState = syncStateOverride;
  } else if (status.isSyncing) {
    resolvedState = 'synchronizing';
  } else if (!status.isOnline) {
    resolvedState = 'offline';
  } else if (status.conflictCount > 0) {
    resolvedState = 'conflict';
  } else if (status.failedCount > 0) {
    resolvedState = 'sync_failed';
  } else if (status.pendingCount > 0) {
    resolvedState = 'pending_sync';
  } else {
    resolvedState = 'online';
  }

  const configs: Record<
    SyncState,
    { label: string; icon: React.ReactNode; badgeClass: string; dotClass: string }
  > = {
    online: {
      label: 'Online',
      icon: <Wifi className="h-3.5 w-3.5" />,
      badgeClass:
        'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800',
      dotClass: 'bg-emerald-500',
    },
    offline: {
      label: status.pendingCount > 0 ? `Offline (${status.pendingCount} queued)` : 'Offline',
      icon: <WifiOff className="h-3.5 w-3.5" />,
      badgeClass:
        'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800',
      dotClass: 'bg-amber-500',
    },
    synchronizing: {
      label: 'Syncing...',
      icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" />,
      badgeClass:
        'text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-300 dark:bg-sky-950/40 dark:border-sky-800',
      dotClass: 'bg-sky-500',
    },
    pending_sync: {
      label: `${status.pendingCount} Pending Sync`,
      icon: <RefreshCw className="h-3.5 w-3.5 text-amber-500" />,
      badgeClass:
        'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800',
      dotClass: 'bg-amber-500 animate-pulse',
    },
    conflict: {
      label: `${status.conflictCount} Conflict${status.conflictCount > 1 ? 's' : ''}`,
      icon: <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />,
      badgeClass:
        'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-800',
      dotClass: 'bg-rose-500 animate-bounce',
    },
    sync_complete: {
      label: 'Synced',
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      badgeClass:
        'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800',
      dotClass: 'bg-emerald-500',
    },
    sync_failed: {
      label: `${status.failedCount} Failed`,
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      badgeClass:
        'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-800',
      dotClass: 'bg-rose-500',
    },
  };

  const current = configs[resolvedState];

  return (
    <button
      type="button"
      id={id}
      onClick={onClick || (() => status.isOnline && syncNow())}
      title={`Network Status: ${current.label} • Click to open Sync Center or synchronize`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all select-none cursor-pointer hover:shadow-xs active:scale-95',
        current.badgeClass,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', current.dotClass)} />
      {current.icon}
      {showText && <span>{current.label}</span>}
      {!showText && status.pendingCount > 0 && (
        <span className="font-mono text-[10px] ml-0.5 bg-amber-500/20 px-1 rounded-full">
          {status.pendingCount}
        </span>
      )}
    </button>
  );
};
