/**
 * Progressive Web Application & Offline Types
 */

export interface SyncQueueItem {
  id: string;
  action: string;
  payload: unknown;
  timestamp: number;
  retries: number;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
}

export interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  install: () => Promise<boolean>;
}

export interface ConnectivityState {
  isOnline: boolean;
  lastOnlineAt: number | null;
  pendingSyncCount: number;
}
