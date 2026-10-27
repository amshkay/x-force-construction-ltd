import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'white' | 'slate';
  label?: string;
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  variant = 'primary',
  label = 'Loading...',
  className,
}) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  const variants = {
    primary: 'text-orange-600',
    white: 'text-white',
    slate: 'text-slate-400 dark:text-slate-500',
  };

  return (
    <div
      role="status"
      className={cn('inline-flex items-center justify-center gap-2', className)}
    >
      <Loader2 className={cn('animate-spin', sizes[size], variants[variant])} />
      <span className="sr-only">{label}</span>
    </div>
  );
};
