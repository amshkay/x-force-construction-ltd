import React, { useState } from 'react';
import { AlertTriangle, X, ShieldAlert, Archive } from 'lucide-react';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { serviceProviderService } from '../../services/serviceProvider.service';
import { ServiceProvider, ProviderStatus } from '../../types/serviceProvider';

interface DeactivateProviderModalProps {
  isOpen: boolean;
  provider: ServiceProvider | null;
  targetAction: 'deactivate' | 'suspend' | 'activate';
  onClose: () => void;
  onStatusChanged: (updated: ServiceProvider) => void;
}

export const DeactivateProviderModal: React.FC<DeactivateProviderModalProps> = ({
  isOpen,
  provider,
  targetAction,
  onClose,
  onStatusChanged,
}) => {
  const { profile } = useAuth();
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !provider) return null;

  const targetStatus: ProviderStatus =
    targetAction === 'activate' ? 'active' : targetAction === 'suspend' ? 'suspended' : 'inactive';

  const isDestructive = targetAction !== 'activate';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const updated = await serviceProviderService.setProviderStatus(
        provider.id,
        targetStatus,
        reason.trim() || undefined,
        profile?.id || 'dev-admin-uid-0001',
        profile?.full_name || 'Administrator'
      );

      toast.success(
        `Provider status changed to ${targetStatus.toUpperCase()} for ${updated.name}.`,
        'Status Changed'
      );
      onStatusChanged(updated);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update provider status.', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl ${
              targetAction === 'activate'
                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                : targetAction === 'suspend'
                ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                : 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
            }`}
          >
            {targetAction === 'activate' ? (
              <ShieldAlert className="h-6 w-6" />
            ) : targetAction === 'suspend' ? (
              <AlertTriangle className="h-6 w-6" />
            ) : (
              <Archive className="h-6 w-6" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white capitalize">
              {targetAction === 'activate'
                ? 'Re-activate Provider'
                : targetAction === 'suspend'
                ? 'Suspend Provider'
                : 'Deactivate Provider'}
            </h3>
            <p className="text-xs font-mono text-slate-500">{provider.providerNumber}</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
          Are you sure you want to change the status of{' '}
          <strong className="text-slate-900 dark:text-white">{provider.name}</strong> to{' '}
          <span className="uppercase font-bold text-orange-600">{targetStatus}</span>?
        </p>

        {isDestructive && (
          <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 mb-4">
            <p className="font-semibold mb-1">Historical Integrity Note:</p>
            <p className="text-[11px] leading-relaxed">
              Deactivating or suspending will remove this contractor from selectable options for new
              service job assignments. All past service jobs, progress photos, and audit logs remain
              permanently intact.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Administrative Reason / Audit Note {isDestructive && '*'}
            </label>
            <textarea
              rows={2}
              required={isDestructive}
              placeholder={
                targetAction === 'activate'
                  ? 'e.g. Completed audit, renewed annual partnership agreement...'
                  : 'e.g. Geographically relocated crew, quality assurance review pending...'
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant={isDestructive ? 'danger' : 'primary'}
              type="submit"
              isLoading={isSubmitting}
            >
              Confirm {targetStatus.toUpperCase()}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
