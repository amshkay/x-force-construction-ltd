import React from 'react';
import { User } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  status?: 'online' | 'offline' | 'busy' | 'away';
  className?: string;
  id?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  status,
  className,
  id,
}) => {
  const getInitials = (n?: string): string => {
    if (!n) return '';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const sizes = {
    sm: 'h-7 w-7 text-[10px]',
    md: 'h-9 w-9 text-xs',
    lg: 'h-11 w-11 text-sm',
  };

  const statusSizes = {
    sm: 'h-2 w-2 ring-1',
    md: 'h-2.5 w-2.5 ring-2',
    lg: 'h-3 w-3 ring-2',
  };

  const statusColors = {
    online: 'bg-emerald-500',
    offline: 'bg-slate-400',
    busy: 'bg-rose-500',
    away: 'bg-amber-500',
  };

  return (
    <div className={cn('relative inline-flex shrink-0 select-none', className)} id={id}>
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 font-semibold text-slate-700 dark:text-slate-200 overflow-hidden',
          sizes[size]
        )}
      >
        {src ? (
          <img
            src={src}
            alt={name || 'User avatar'}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : name ? (
          getInitials(name)
        ) : (
          <User className="h-4 w-4 text-slate-400" />
        )}
      </div>
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-white dark:ring-slate-900',
            statusSizes[size],
            statusColors[status]
          )}
        />
      )}
    </div>
  );
};
