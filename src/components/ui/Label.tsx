import React from 'react';
import { cn } from '../../utils/cn';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'block text-xs font-semibold text-slate-700 dark:text-slate-200 select-none text-left',
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="ml-1 text-rose-500 font-bold">*</span>}
    </label>
  )
);

Label.displayName = 'Label';
