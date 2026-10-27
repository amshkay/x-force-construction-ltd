import React from 'react';
import { Breadcrumb, BreadcrumbItem } from './Breadcrumb';
import { cn } from '../../utils/cn';

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbItems?: BreadcrumbItem[];
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  className?: string;
  id?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumbItems,
  primaryAction,
  secondaryActions,
  className,
  id,
}) => {
  return (
    <header id={id} className={cn('mb-6 space-y-2 text-left', className)}>
      {breadcrumbItems && breadcrumbItems.length > 0 && (
        <div className="mb-2">
          <Breadcrumb items={breadcrumbItems} />
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {(primaryAction || secondaryActions) && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {secondaryActions}
            {primaryAction}
          </div>
        )}
      </div>
    </header>
  );
};
