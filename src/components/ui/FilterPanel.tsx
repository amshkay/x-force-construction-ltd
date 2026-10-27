import React, { useState } from 'react';
import { Filter, X, RotateCcw } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from './Button';

export interface FilterChip {
  id: string;
  label: string;
  value: string;
}

export interface FilterPanelProps {
  activeFilters?: FilterChip[];
  onRemoveFilter?: (id: string) => void;
  onClearAllFilters?: () => void;
  children?: React.ReactNode;
  filterCount?: number;
  className?: string;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  activeFilters = [],
  onRemoveFilter,
  onClearAllFilters,
  children,
  filterCount,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const count = filterCount ?? activeFilters.length;

  return (
    <div className={cn('w-full space-y-3 text-left', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          size="sm"
          variant={isOpen ? 'primary' : 'outline'}
          leftIcon={<Filter className="h-3.5 w-3.5" />}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span>Filters</span>
          {count > 0 && (
            <span className="ml-1.5 rounded-full bg-orange-100 dark:bg-orange-950 px-1.5 py-0.2 text-[10px] font-bold text-orange-600 dark:text-orange-400">
              {count}
            </span>
          )}
        </Button>

        {activeFilters.length > 0 && onClearAllFilters && (
          <button
            type="button"
            onClick={onClearAllFilters}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Clear all</span>
          </button>
        )}
      </div>

      {/* Expandable Filter Controls Drawer / Container */}
      {isOpen && children && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60 animate-in fade-in duration-150">
          {children}
        </div>
      )}

      {/* Active Filter Chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-medium text-slate-400 mr-1">Active:</span>
          {activeFilters.map((chip) => (
            <span
              key={chip.id}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <span className="text-slate-400 font-medium">{chip.label}:</span>
              <span className="font-semibold">{chip.value}</span>
              {onRemoveFilter && (
                <button
                  type="button"
                  onClick={() => onRemoveFilter(chip.id)}
                  className="rounded hover:bg-slate-100 dark:hover:bg-slate-700 p-0.5"
                  aria-label={`Remove filter ${chip.label}`}
                >
                  <X className="h-3 w-3 text-slate-400" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
