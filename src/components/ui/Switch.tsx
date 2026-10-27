import React from 'react';
import { cn } from '../../utils/cn';

export interface SwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  id,
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className,
}) => {
  const switchId = id || `switch-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <div className={cn('flex items-center justify-between gap-4 text-left select-none', className)}>
      {(label || description) && (
        <div className="space-y-0.5">
          {label && (
            <label
              htmlFor={switchId}
              className="cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-100"
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{description}</p>
          )}
        </div>
      )}
      <button
        type="button"
        role="switch"
        id={switchId}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-orange-600' : 'bg-slate-300 dark:bg-slate-700'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
            checked ? 'translate-x-4' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
};
