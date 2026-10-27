import React from 'react';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useSyncEngine } from '../hooks/useSyncEngine';

export const OfflineIndicator: React.FC = () => {
  const { isOnline, status, isSyncing } = useSyncEngine();

  // If online and nothing pending/conflicted, hidden
  if (isOnline && status.pendingCount === 0 && status.conflictCount === 0 && !isSyncing) {
    return null;
  }

  // If syncing while online
  if (isOnline && isSyncing) {
    return (
      <div
        id="offline-indicator-banner"
        role="status"
        aria-live="polite"
        className="fixed bottom-4 left-4 z-50 flex items-center gap-3 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-medium text-white shadow-xl backdrop-blur-md"
      >
        <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-white" />
        <div>
          <p className="font-semibold">Synchronizing with Server...</p>
          <p className="text-sky-100 text-[11px]">
            {status.pendingCount} outbox operation{status.pendingCount === 1 ? '' : 's'} being processed.
          </p>
        </div>
      </div>
    );
  }

  // If online with conflicts
  if (isOnline && status.conflictCount > 0) {
    return (
      <div
        id="offline-indicator-banner"
        role="status"
        aria-live="polite"
        className="fixed bottom-4 left-4 z-50 flex items-center gap-3 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-medium text-white shadow-xl backdrop-blur-md"
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-white animate-bounce" />
        <div>
          <p className="font-semibold">Sync Conflicts Detected ({status.conflictCount})</p>
          <p className="text-rose-100 text-[11px]">
            Managerial review required in PWA Sync Center.
          </p>
        </div>
      </div>
    );
  }

  // If device is offline
  if (!isOnline) {
    return (
      <div
        id="offline-indicator-banner"
        role="status"
        aria-live="polite"
        className="fixed bottom-4 left-4 z-50 flex items-center gap-3 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-medium text-white shadow-xl backdrop-blur-md"
      >
        <WifiOff className="h-4 w-4 shrink-0 text-white" />
        <div>
          <p className="font-semibold">Offline Mode Active</p>
          <p className="text-amber-100 text-[11px]">
            Operating from local cache{status.pendingCount > 0 ? ` (${status.pendingCount} queued in outbox)` : ''}.
          </p>
        </div>
      </div>
    );
  }

  return null;
};
