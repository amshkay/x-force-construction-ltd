import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string, duration = 4000) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastMessage = { id, message, type, title, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  const success = useCallback(
    (message: string, title?: string) => showToast(message, 'success', title),
    [showToast]
  );
  const error = useCallback(
    (message: string, title?: string) => showToast(message, 'error', title, 6000),
    [showToast]
  );
  const warning = useCallback(
    (message: string, title?: string) => showToast(message, 'warning', title, 5000),
    [showToast]
  );
  const info = useCallback(
    (message: string, title?: string) => showToast(message, 'info', title),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info, dismissToast }}>
      {children}
      <div
        id="toast-container"
        className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
        aria-live="assertive"
      >
        {toasts.map((toast) => {
          let bgClass = 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900';
          let icon = <Info className="h-4 w-4 shrink-0 text-sky-400 dark:text-sky-600" />;

          if (toast.type === 'success') {
            bgClass = 'bg-emerald-900 border border-emerald-700 text-emerald-50 dark:bg-emerald-50 dark:border-emerald-200 dark:text-emerald-950';
            icon = <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 dark:text-emerald-600" />;
          } else if (toast.type === 'error') {
            bgClass = 'bg-rose-900 border border-rose-700 text-rose-50 dark:bg-rose-50 dark:border-rose-200 dark:text-rose-950';
            icon = <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 dark:text-rose-600" />;
          } else if (toast.type === 'warning') {
            bgClass = 'bg-amber-900 border border-amber-700 text-amber-50 dark:bg-amber-50 dark:border-amber-200 dark:text-amber-950';
            icon = <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 dark:text-amber-600" />;
          }

          return (
            <div
              key={toast.id}
              id={`toast-${toast.id}`}
              role="alert"
              className={`pointer-events-auto flex items-start gap-3 rounded-lg p-3.5 shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${bgClass}`}
            >
              {icon}
              <div className="flex-1 text-xs">
                {toast.title && <p className="font-semibold text-sm mb-0.5">{toast.title}</p>}
                <p className="opacity-90">{toast.message}</p>
              </div>
              <button
                id={`btn-dismiss-toast-${toast.id}`}
                onClick={() => dismissToast(toast.id)}
                className="opacity-60 hover:opacity-100 transition p-0.5"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
