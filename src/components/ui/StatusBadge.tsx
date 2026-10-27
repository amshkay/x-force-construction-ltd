import React from 'react';
import { cn } from '../../utils/cn';
import { SystemStatus, STATUS_CONFIG_MAP } from '../../config/theme.tokens';

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: SystemStatus;
  label?: string;
  showDot?: boolean;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  showDot = true,
  size = 'md',
  className,
  id,
  ...props
}) => {
  const config = STATUS_CONFIG_MAP[status] || STATUS_CONFIG_MAP.inactive;
  const displayLabel = label || config.label;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-0.5 gap-1.5',
  };

  const dotSizeClasses = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
  };

  return (
    <span
      id={id}
      className={cn(
        'inline-flex items-center font-medium rounded-full border whitespace-nowrap select-none transition-colors',
        config.colorClasses,
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {showDot && (
        <span className={cn('rounded-full shrink-0', config.dotColor, dotSizeClasses[size])} />
      )}
      <span>{displayLabel}</span>
    </span>
  );
};
