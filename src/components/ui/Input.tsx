import React from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helperText, error, leftIcon, rightIcon, id, type = 'text', ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2, 7)}`;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            {label}
            {props.required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            className={cn(
              'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors',
              'focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500',
              'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500',
              'disabled:cursor-not-allowed disabled:opacity-50',
              leftIcon ? 'pl-9' : '',
              rightIcon ? 'pr-9' : '',
              error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500 dark:border-rose-500' : '',
              className
            )}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-hint` : undefined}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-slate-400 flex items-center">{rightIcon}</div>
          )}
        </div>
        {error ? (
          <p id={`${inputId}-error`} className="text-xs text-rose-500">
            {error}
          </p>
        ) : helperText ? (
          <p id={`${inputId}-hint`} className="text-xs text-slate-500 dark:text-slate-400">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
