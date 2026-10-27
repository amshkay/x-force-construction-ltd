import React from 'react';
import { PackageOpen } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  id?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  id = 'empty-state',
}) => {
  return (
    <div
      id={id}
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mb-3">
        {icon || <PackageOpen className="h-6 w-6" />}
      </div>
      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h4>
      <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button size="sm" variant="secondary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
