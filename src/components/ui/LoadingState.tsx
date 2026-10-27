import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface LoadingStateProps {
  message?: string;
  subMessage?: string;
  className?: string;
  id?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading information...',
  subMessage,
  className,
  id = 'loading-state',
}) => {
  return (
    <div
      id={id}
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center p-12 text-center',
        className
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin text-orange-600 mb-3" />
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{message}</p>
      {subMessage && (
        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{subMessage}</p>
      )}
    </div>
  );
};
