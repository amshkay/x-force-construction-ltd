import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
  id?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  id = 'app-modal',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    '2xl': 'max-w-4xl',
    '3xl': 'max-w-5xl',
    full: 'max-w-6xl',
  };

  return (
    <div
      id={id}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? `${id}-title` : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          'w-full max-h-[92vh] overflow-y-auto rounded-xl bg-white p-4 sm:p-6 shadow-2xl transition-all border border-slate-200 dark:border-slate-800 dark:bg-slate-900',
          sizeClasses[size]
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <div>
              {title && (
                <h3
                  id={`${id}-title`}
                  className="text-base font-semibold text-slate-900 dark:text-white"
                >
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>
              )}
            </div>
            <button
              id={`${id}-close-btn`}
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
};
