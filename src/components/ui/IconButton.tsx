import React from 'react';
import { cn } from '../../utils/cn';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon: React.ReactNode;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, label, variant = 'ghost', size = 'md', icon, disabled, id, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-95 select-none shrink-0';

    const variants = {
      primary: 'bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700',
      secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
      outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
      ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
      danger: 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-950/70',
    };

    const sizes = {
      sm: 'h-7 w-7 text-xs',
      md: 'h-9 w-9 text-sm',
      lg: 'h-11 w-11 text-base',
    };

    return (
      <button
        ref={ref}
        id={id}
        aria-label={label}
        title={label}
        disabled={disabled}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
