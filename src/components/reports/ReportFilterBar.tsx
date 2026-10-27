/**
 * Report Filter & Date Range Bar
 * Module 20 — Reporting, Analytics & Management Dashboard
 * XFORCE Construction Ltd / X-FORCE BRICKS
 */

import React, { useState } from 'react';
import { Calendar, RefreshCw, FileDown, Printer, Filter } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ReportDateFilter, ReportDateRangeType } from '../../types/report';
import { reportService } from '../../services/report.service';

interface ReportFilterBarProps {
  currentFilter: ReportDateFilter;
  onFilterChange: (filter: ReportDateFilter) => void;
  onRefresh: () => void;
  onExportCsv: () => void;
  onPrint: () => void;
  isLoading?: boolean;
}

export const ReportFilterBar: React.FC<ReportFilterBarProps> = ({
  currentFilter,
  onFilterChange,
  onRefresh,
  onExportCsv,
  onPrint,
  isLoading = false,
}) => {
  const [selectedType, setSelectedType] = useState<ReportDateRangeType>(currentFilter.type);
  const [customStart, setCustomStart] = useState<string>(currentFilter.startDate);
  const [customEnd, setCustomEnd] = useState<string>(currentFilter.endDate);
  const [showCustom, setShowCustom] = useState<boolean>(currentFilter.type === 'custom');

  const handleSelectType = (type: ReportDateRangeType) => {
    setSelectedType(type);
    if (type === 'custom') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      const newFilter = reportService.getDateRange(type);
      onFilterChange(newFilter);
    }
  };

  const handleApplyCustom = () => {
    if (!customStart || !customEnd) return;
    const newFilter = reportService.getDateRange('custom', customStart, customEnd);
    onFilterChange(newFilter);
  };

  return (
    <div className="space-y-3 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        {/* Date Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs max-w-full">
          {(
            [
              ['today', 'Today'],
              ['yesterday', 'Yesterday'],
              ['this_week', 'This Week'],
              ['this_month', 'This Month'],
              ['last_month', 'Last Month'],
              ['this_year', 'This Year'],
              ['custom', 'Custom'],
            ] as const
          ).map(([type, label]) => (
            <button
              key={type}
              type="button"
              onClick={() => handleSelectType(type)}
              className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer whitespace-nowrap ${
                selectedType === type
                  ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="text-xs"
            title="Refresh Data"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onExportCsv}
            disabled={isLoading}
            className="text-xs"
            title="Export CSV"
          >
            <FileDown className="h-3.5 w-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onPrint}
            className="text-xs"
            title="Print View"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
            Print
          </Button>
        </div>
      </div>

      {/* Custom Date Picker Drawer */}
      {showCustom && (
        <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Custom Date Span:</span>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">From:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
          </div>
          <Button variant="primary" size="sm" onClick={handleApplyCustom} className="text-xs">
            Apply Custom Window
          </Button>
        </div>
      )}

      {/* Scope Details Footnote */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-amber-500" />
          Reporting Scope: <strong>{currentFilter.label}</strong> ({currentFilter.startDate} to {currentFilter.endDate})
        </span>
        <span>Enugu HQ Timezone: Africa/Lagos (WAT)</span>
      </div>
    </div>
  );
};
