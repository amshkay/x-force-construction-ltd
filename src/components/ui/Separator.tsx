import React from 'react';
import { cn } from '../../utils/cn';

export interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const Separator: React.FC<SeparatorProps> = ({
  orientation = 'horizontal',
  className,
}) => {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        'bg-slate-200 dark:bg-slate-800 shrink-0',
        orientation === 'horizontal' ? 'h-px w-full my-4' : 'h-full w-px mx-2',
        className
      )}
    />
  );
};
