import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface QuickActionItem {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  badgeText?: string;
}

export interface QuickActionsProps {
  actions: QuickActionItem[];
  title?: string;
  className?: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  actions,
  title = 'Quick Actions',
  className,
}) => {
  return (
    <div className={cn('w-full text-left', className)}>
      {title && (
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </h3>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              id={`quick-action-${action.id}`}
              onClick={action.onClick}
              disabled={action.disabled}
              className={cn(
                'group relative flex flex-col items-center justify-center p-3.5 text-center rounded-xl border border-slate-200 bg-white transition-all shadow-sm',
                'hover:border-orange-500/40 hover:bg-orange-50/20 hover:shadow-md active:scale-95',
                'dark:border-slate-800 dark:bg-slate-900 dark:hover:border-orange-500/30 dark:hover:bg-orange-950/20',
                'disabled:opacity-50 disabled:pointer-events-none'
              )}
            >
              {action.badgeText && (
                <span className="absolute top-2 right-2 rounded-full bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 text-[9px] font-semibold text-slate-500">
                  {action.badgeText}
                </span>
              )}

              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-orange-600 transition-colors group-hover:bg-orange-600 group-hover:text-white dark:bg-orange-950/60 dark:text-orange-400">
                <Icon className="h-4 w-4" />
              </div>

              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                {action.label}
              </span>
              {action.description && (
                <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                  {action.description}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
