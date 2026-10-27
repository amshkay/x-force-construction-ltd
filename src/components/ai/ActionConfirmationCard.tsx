/**
 * Action Confirmation Card
 * Module 19 — Admin AI Business Assistant
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Interactive confirmation card embedded in AI assistant chat responses
 * for protected operational transitions (e.g. Service completion, Expense approval).
 */

import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Wrench,
  CreditCard,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import { AiActionConfirmation } from '../../types/ai';
import { aiAssistantService } from '../../services/ai/aiAssistant.service';
import { useAuth } from '../../context/AuthContext';

interface ActionConfirmationCardProps {
  action: AiActionConfirmation;
  onActionResolved?: () => void;
}

export const ActionConfirmationCard: React.FC<ActionConfirmationCardProps> = ({
  action,
  onActionResolved,
}) => {
  const toast = useToast();
  const { profile } = useAuth();
  const currentUserId = profile?.id || 'u0000000-0000-0000-0000-000000000001';
  const currentUserName = profile?.full_name || 'Administrator';

  const [status, setStatus] = useState<'pending' | 'confirmed' | 'rejected'>(action.status);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      const res = await aiAssistantService.confirmAction(
        action.id,
        currentUserId,
        currentUserName
      );
      setStatus('confirmed');
      toast.showToast(res.message, 'success');
      onActionResolved?.();
    } catch (err: any) {
      toast.showToast(err?.message || 'Failed to execute proposed action', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await aiAssistantService.rejectAction(action.id, currentUserId);
      setStatus('rejected');
      toast.showToast('Proposed action was cancelled.', 'info');
      onActionResolved?.();
    } catch (err: any) {
      toast.showToast('Failed to cancel action.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const getIcon = () => {
    if (action.targetEntityType === 'installation') {
      return <Wrench className="h-4 w-4 text-blue-500" />;
    }
    if (action.targetEntityType === 'expense') {
      return <CreditCard className="h-4 w-4 text-amber-500" />;
    }
    return <ShieldAlert className="h-4 w-4 text-purple-500" />;
  };

  return (
    <div className="mt-3 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 text-xs text-left shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
            {getIcon()}
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-white block">
              {action.title}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Target Ref: #{action.targetEntityId}
            </span>
          </div>
        </div>

        <Badge
          variant={
            status === 'confirmed'
              ? 'success'
              : status === 'rejected'
              ? 'danger'
              : 'warning'
          }
          size="sm"
        >
          {status.toUpperCase()}
        </Badge>
      </div>

      <p className="mt-2 text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
        {action.description}
      </p>

      {status === 'pending' ? (
        <div className="mt-3 pt-2.5 border-t border-amber-200/60 dark:border-amber-900/40 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={isProcessing}
            onClick={handleReject}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={isProcessing}
            onClick={handleConfirm}
            className="text-xs bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Confirm & Apply
              </>
            )}
          </Button>
        </div>
      ) : status === 'confirmed' ? (
        <div className="mt-2.5 pt-2 border-t border-emerald-200 dark:border-emerald-900/40 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Action executed and synchronized with operational registry.</span>
        </div>
      ) : (
        <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
          <XCircle className="h-3.5 w-3.5" />
          <span>Action proposal was declined. No changes were made.</span>
        </div>
      )}
    </div>
  );
};
