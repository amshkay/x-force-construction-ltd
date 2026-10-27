import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  isCurrent?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showHomeIcon?: boolean;
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  showHomeIcon = true,
  className,
}) => {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center text-xs text-slate-500 dark:text-slate-400', className)}
    >
      <ol className="flex items-center space-x-1.5 overflow-hidden">
        {showHomeIcon && (
          <li className="flex items-center">
            <span className="text-slate-400 dark:text-slate-500">
              <Home className="h-3.5 w-3.5" />
            </span>
            <span className="mx-1 text-slate-300 dark:text-slate-700">/</span>
          </li>
        )}

        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li
              key={index}
              className={cn(
                'flex items-center truncate',
                index === 0 && items.length > 2 ? 'hidden sm:flex' : 'flex'
              )}
            >
              {item.onClick || item.href ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="truncate hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:underline"
                >
                  {item.label}
                </button>
              ) : (
                <span
                  className={cn(
                    'truncate',
                    isLast ? 'font-semibold text-slate-900 dark:text-white' : ''
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}

              {!isLast && (
                <ChevronRight className="h-3 w-3 mx-1 shrink-0 text-slate-300 dark:text-slate-700" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
