/**
 * Unauthorized / Access Restricted Component
 * XFORCE Construction Management & Customer Platform (Brand: X-FORCE BRICKS)
 * Displayed when user lacks specific module permissions.
 */

import React from 'react';
import { ShieldAlert, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';

interface UnauthorizedPageProps {
  onNavigateToDashboard: () => void;
  requiredModule?: string;
}

export const UnauthorizedPage: React.FC<UnauthorizedPageProps> = ({
  onNavigateToDashboard,
  requiredModule,
}) => {
  const { role, profile } = useAuth();

  return (
    <div
      id="unauthorized-page"
      className="w-full min-h-[70vh] flex flex-col items-center justify-center p-6 text-center"
    >
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Access Restricted
        </h2>

        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
          You do not possess the required permissions to access this management section.
          {requiredModule && (
            <span className="block mt-1 font-medium text-slate-700 dark:text-slate-300">
              Restricted area: {requiredModule}
            </span>
          )}
        </p>

        <div className="my-5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs border border-slate-100 dark:border-slate-800 text-left">
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500 dark:text-slate-400">Current User:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{profile?.full_name}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500 dark:text-slate-400">Assigned Role:</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300">
              {role?.display_name || role?.name || 'Staff'}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            id="btn-unauthorized-to-dashboard"
            variant="primary"
            size="md"
            className="w-full"
            onClick={onNavigateToDashboard}
            leftIcon={<LayoutDashboard className="h-4 w-4" />}
          >
            Return to Authorized Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};
