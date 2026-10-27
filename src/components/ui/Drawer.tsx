import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  position?: 'left' | 'right';
  id?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
  id = 'app-drawer',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
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

  return (
    <div
      id={id}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          'relative flex flex-col h-full w-full max-w-md bg-white p-6 shadow-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-900 overflow-y-auto transition-transform',
          position === 'left' ? 'mr-auto border-r' : 'ml-auto border-l'
        )}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
          {title && (
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
          )}
          <button
            id={`${id}-close-btn`}
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition"
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 text-sm">{children}</div>
      </div>
    </div>
  );
};
