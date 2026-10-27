import React from 'react';
import { cn } from '../../utils/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, helperText, error, id, rows = 3, ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).slice(2, 7)}`;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
          >
            {label}
            {props.required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={cn(
            'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors',
            'focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500',
            'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-rose-500 focus:border-rose-500 focus:ring-rose-500 dark:border-rose-500',
            className
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-hint` : undefined}
          {...props}
        />
        {error ? (
          <p id={`${textareaId}-error`} className="text-xs text-rose-500">
            {error}
          </p>
        ) : helperText ? (
          <p id={`${textareaId}-hint`} className="text-xs text-slate-500 dark:text-slate-400">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
