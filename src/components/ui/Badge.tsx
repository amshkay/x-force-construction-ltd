import React from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'md',
  children,
  id,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center font-medium rounded-full whitespace-nowrap select-none transition-colors';

  const variants = {
    default:
      'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700',
    primary:
      'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border border-orange-200 dark:border-orange-800',
    success:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
    warning:
      'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    danger:
      'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
    info:
      'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800',
    outline:
      'bg-transparent text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 gap-1 leading-normal',
    md: 'text-xs px-2.5 py-0.5 gap-1.5 leading-normal',
  };

  return (
    <span
      id={id}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </span>
  );
};
