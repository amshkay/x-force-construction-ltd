import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
  id?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  isLoading = false,
  id = 'confirm-dialog',
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" id={id}>
      <div className="flex flex-col items-center text-center p-2">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full mb-3 ${
            variant === 'danger'
              ? 'bg-rose-100 dark:bg-rose-950 text-rose-600'
              : 'bg-amber-100 dark:bg-amber-950 text-amber-600'
          }`}
        >
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h4 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h4>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{message}</p>

        <div className="mt-6 flex w-full gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-1/2"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            className="w-1/2"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
