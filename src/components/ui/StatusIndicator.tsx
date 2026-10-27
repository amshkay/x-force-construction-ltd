import React from 'react';
import { cn } from '../../utils/cn';

export interface StatusIndicatorProps {
  status: 'active' | 'pending' | 'warning' | 'error' | 'inactive' | 'online' | 'offline';
  label?: string;
  pulse?: boolean;
  className?: string;
  id?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  pulse = false,
  className,
  id,
}) => {
  const colors = {
    active: 'bg-emerald-500',
    online: 'bg-emerald-500',
    pending: 'bg-amber-500',
    warning: 'bg-amber-500',
    error: 'bg-rose-500',
    inactive: 'bg-slate-400',
    offline: 'bg-slate-400',
  };

  return (
    <div className={cn('inline-flex items-center gap-1.5 text-xs select-none', className)} id={id}>
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
              colors[status]
            )}
          />
        )}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', colors[status])} />
      </span>
      {label && (
        <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">
          {label}
        </span>
      )}
    </div>
  );
};
