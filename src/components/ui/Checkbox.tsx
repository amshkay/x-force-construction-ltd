import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: string;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, error, id, checked, ...props }, ref) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).slice(2, 7)}`;

    return (
      <div className="flex items-start gap-2.5 text-left">
        <div className="relative flex items-center pt-0.5">
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox"
            checked={checked}
            className="peer sr-only"
            {...props}
          />
          <label
            htmlFor={checkboxId}
            className={cn(
              'flex h-4 w-4 cursor-pointer items-center justify-center rounded border border-slate-300 bg-white transition-colors',
              'peer-checked:bg-orange-600 peer-checked:border-orange-600 peer-checked:text-white',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-orange-500 peer-focus-visible:ring-offset-2',
              'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
              'dark:border-slate-700 dark:bg-slate-900',
              error && 'border-rose-500',
              className
            )}
          >
            <Check className="h-3 w-3 stroke-[3] opacity-0 peer-checked:opacity-100 transition-opacity" />
          </label>
        </div>
        {(label || description) && (
          <div className="space-y-0.5 select-none">
            {label && (
              <label
                htmlFor={checkboxId}
                className="cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-200"
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{description}</p>
            )}
            {error && <p className="text-xs text-rose-500">{error}</p>}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
