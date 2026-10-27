import React from 'react';
import { cn } from '../../utils/cn';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
  id?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className,
  id = 'app-tabs',
}) => {
  return (
    <div
      id={id}
      role="tablist"
      className={cn(
        'flex border-b border-slate-200 dark:border-slate-800 space-x-6 overflow-x-auto no-scrollbar',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex items-center gap-2 pb-3 pt-2 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px',
              isActive
                ? 'border-orange-600 text-orange-600 dark:text-orange-400 dark:border-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
              tab.disabled && 'opacity-40 cursor-not-allowed'
            )}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.2 text-[10px] font-bold',
                  isActive
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
