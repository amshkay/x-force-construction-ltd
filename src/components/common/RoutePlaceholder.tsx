import React from 'react';
import { Layers, ArrowLeft, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';

export interface RoutePlaceholderProps {
  moduleName: string;
  moduleNumber: string;
  description: string;
  featuresPlanned: string[];
  onBack?: () => void;
}

export const RoutePlaceholder: React.FC<RoutePlaceholderProps> = ({
  moduleName,
  moduleNumber,
  description,
  featuresPlanned,
  onBack,
}) => {
  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto">
      <PageHeader
        title={moduleName}
        description={`Planned for implementation in ${moduleNumber}.`}
        breadcrumbItems={[
          { label: 'Management Console', onClick: onBack },
          { label: moduleName, isCurrent: true },
        ]}
        primaryAction={
          onBack && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={onBack}
            >
              Back to Overview
            </Button>
          )
        }
      />

      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-8 sm:p-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 mb-4">
          <Layers className="h-7 w-7" />
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">
          <Clock className="h-3.5 w-3.5" />
          {moduleNumber} — Foundation Ready
        </span>

        <h3 className="text-lg font-bold text-slate-900 dark:text-white sm:text-xl">
          {moduleName} is Coming Soon
        </h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
          {description}
        </p>

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 max-w-md mx-auto text-left">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            Planned Capabilities for This Module
          </h4>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            {featuresPlanned.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
