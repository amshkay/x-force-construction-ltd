/**
 * Compact System Health Status Badge / Widget
 * Module 26 — Production Monitoring, Health & Operational Diagnostics
 * XFORCE Construction Ltd / X-FORCE BRICKS
 */

import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle2, AlertTriangle, ShieldAlert, WifiOff } from 'lucide-react';
import { systemHealthService } from '../../services/diagnostics/systemHealth.service';
import { OverallSystemHealth } from '../../types/diagnostics';

interface HealthStatusBadgeProps {
  onClick?: () => void;
  className?: string;
}

export const HealthStatusBadge: React.FC<HealthStatusBadgeProps> = ({ onClick, className = '' }) => {
  const [health, setHealth] = useState<OverallSystemHealth | null>(null);

  useEffect(() => {
    systemHealthService.getSystemHealth().then(setHealth).catch(() => {});
  }, []);

  if (!health) {
    return null;
  }

  const isHealthy = health.status === 'healthy';
  const isOffline = health.status === 'offline';
  const isWarning = health.status === 'warning';
  const isError = health.status === 'error';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer border ${
        isHealthy
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
          : isOffline
          ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
          : isWarning
          ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
          : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
      } ${className}`}
      title="Click to view full operational diagnostics"
    >
      {isHealthy ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
      ) : isOffline ? (
        <WifiOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
      ) : isWarning ? (
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
      ) : (
        <ShieldAlert className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
      )}
      <span>
        System Health: {isHealthy ? 'Healthy' : isOffline ? 'Offline PWA' : `${health.activeAlertsCount} Attention Items`}
      </span>
    </button>
  );
};
