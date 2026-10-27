import React from 'react';
import { cn } from '../../utils/cn';

export interface RadioOption {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value: string;
  onChange: (val: string) => void;
  label?: string;
  error?: string;
  className?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  options,
  value,
  onChange,
  label,
  error,
  className,
}) => {
  return (
    <fieldset className={cn('space-y-2 text-left', className)}>
      {label && (
        <legend className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
          {label}
        </legend>
      )}
      <div className="space-y-2">
        {options.map((opt) => {
          const id = `radio-${name}-${opt.value}`;
          const isChecked = value === opt.value;

          return (
            <div key={opt.value} className="flex items-start gap-2.5">
              <input
                type="radio"
                id={id}
                name={name}
                value={opt.value}
                checked={isChecked}
                disabled={opt.disabled}
                onChange={() => onChange(opt.value)}
                className="peer sr-only"
              />
              <label
                htmlFor={id}
                className={cn(
                  'mt-0.5 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-white transition-colors',
                  'peer-checked:border-orange-600 peer-focus-visible:ring-2 peer-focus-visible:ring-orange-500 peer-focus-visible:ring-offset-2',
                  'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
                  'dark:border-slate-700 dark:bg-slate-900'
                )}
              >
                <span
                  className={cn(
                    'h-2 w-2 rounded-full bg-orange-600 transition-transform scale-0',
                    isChecked && 'scale-100'
                  )}
                />
              </label>
              <div className="space-y-0.5 select-none">
                <label
                  htmlFor={id}
                  className="cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-200"
                >
                  {opt.label}
                </label>
                {opt.description && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{opt.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </fieldset>
  );
};
