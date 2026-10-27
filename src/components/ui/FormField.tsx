import React from 'react';
import { cn } from '../../utils/cn';
import { Label } from './Label';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  helperText?: string;
  error?: string;
  successMessage?: string;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  required,
  helperText,
  error,
  successMessage,
  disabled,
  className,
  children,
}) => {
  return (
    <div className={cn('w-full space-y-1.5 text-left', disabled && 'opacity-60', className)}>
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}

      <div>{children}</div>

      {error ? (
        <p className="flex items-center gap-1 text-xs text-rose-500 mt-1 animate-in fade-in duration-200">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : successMessage ? (
        <p className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 mt-1 animate-in fade-in duration-200">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>{successMessage}</span>
        </p>
      ) : helperText ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
};
