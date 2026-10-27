import React from 'react';
import { cn } from '../../utils/cn';

export interface ProgressProps {
  value: number; // 0 to 100
  max?: number;
  label?: string;
  showValueText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  label,
  showValueText = false,
  size = 'md',
  variant = 'primary',
  className,
}) => {
  const percentage = Math.min(Math.max(Math.round((value / max) * 100), 0), 100);

  const sizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const variants = {
    primary: 'bg-orange-600',
    success: 'bg-emerald-600',
    warning: 'bg-amber-500',
    danger: 'bg-rose-600',
  };

  return (
    <div className={cn('w-full space-y-1.5 text-left', className)}>
      {(label || showValueText) && (
        <div className="flex items-center justify-between text-xs">
          {label && (
            <span className="font-semibold text-slate-700 dark:text-slate-200">{label}</span>
          )}
          {showValueText && (
            <span className="text-slate-500 dark:text-slate-400 font-mono">{percentage}%</span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={cn(
          'w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800',
          sizes[size]
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-out',
            variants[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
