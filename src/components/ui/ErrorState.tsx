import React, { useState } from 'react';
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  technicalDetails?: string;
  onRetry?: () => void;
  className?: string;
  id?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'We could not complete your request. Please try again or contact support if the issue persists.',
  technicalDetails,
  onRetry,
  className,
  id = 'error-state',
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      id={id}
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 mb-3">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h4 className="text-sm font-semibold text-rose-950 dark:text-rose-200">{title}</h4>
      <p className="mt-1 max-w-sm text-xs text-rose-700/80 dark:text-rose-300/80">{message}</p>

      {onRetry && (
        <div className="mt-4">
          <Button size="sm" variant="outline" onClick={onRetry} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
            Retry Request
          </Button>
        </div>
      )}

      {technicalDetails && (
        <div className="mt-4 w-full max-w-md text-left">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:underline mx-auto"
          >
            {showDetails ? 'Hide technical diagnosis' : 'View technical diagnosis'}
            {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showDetails && (
            <pre className="mt-2 rounded bg-slate-900 p-2.5 text-[10px] text-slate-300 overflow-x-auto whitespace-pre-wrap font-mono">
              {technicalDetails}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
