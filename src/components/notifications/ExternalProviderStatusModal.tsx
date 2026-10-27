/**
 * External Notification Providers Diagnostics Modal
 * Module 18 — Communication & Notifications
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Real-time diagnostic interface for multi-channel messaging infrastructure
 * (WhatsApp Cloud API, Termii SMS, Resend Email, PWA Web Push, In-App Bus).
 */

import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Radio,
  Send,
  Loader2,
  MessageCircle,
  Mail,
  Smartphone,
  Bell,
  RefreshCw,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import { notificationService } from '../../services/notification.service';
import { NotificationChannel, ExternalProviderStatus } from '../../types/communication';

interface ExternalProviderStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExternalProviderStatusModal: React.FC<ExternalProviderStatusModalProps> = ({
  isOpen,
  onClose,
}) => {
  const toast = useToast();
  const [providers, setProviders] = useState<ExternalProviderStatus[]>(() =>
    notificationService.getExternalProviders()
  );
  const [testingChannel, setTestingChannel] = useState<NotificationChannel | null>(null);
  const [testResult, setTestResult] = useState<{ channel: string; message: string; success: boolean } | null>(null);

  const handleTestChannel = async (channel: NotificationChannel) => {
    setTestingChannel(channel);
    setTestResult(null);
    try {
      const result = await notificationService.testProviderDelivery(channel);
      setTestResult({
        channel,
        message: result.message,
        success: result.success,
      });
      if (result.success) {
        toast.showToast(`Ping succeeded for ${channel.toUpperCase()}`, 'success');
      } else {
        toast.showToast(`Test failed: ${result.message}`, 'error');
      }
    } catch {
      toast.showToast('Test execution encountered an error', 'error');
    } finally {
      setTestingChannel(null);
      setProviders(notificationService.getExternalProviders());
    }
  };

  const getChannelIcon = (ch: NotificationChannel) => {
    switch (ch) {
      case 'in_app':
        return <Bell className="h-4 w-4 text-amber-500" />;
      case 'whatsapp':
        return <MessageCircle className="h-4 w-4 text-emerald-500" />;
      case 'email':
        return <Mail className="h-4 w-4 text-blue-500" />;
      case 'sms':
        return <Smartphone className="h-4 w-4 text-purple-500" />;
      case 'push':
        return <Radio className="h-4 w-4 text-cyan-500" />;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Notification Channels & External Gateways"
      size="xl"
    >
      <div className="space-y-5 text-left">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time delivery bridge health, telecom routing gateways, and automated webhook dispatch status.
          </p>
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            All Gateways Online
          </span>
        </div>

        {/* Test Result Callout if active */}
        {testResult && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 transition ${
              testResult.success
                ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-200'
                : 'border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-200'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold uppercase tracking-wider text-[10px]">
                {testResult.channel} Gateway Diagnostics Result
              </p>
              <p className="mt-0.5">{testResult.message}</p>
            </div>
          </div>
        )}

        {/* Provider Cards */}
        <div className="space-y-3">
          {providers.map((p) => {
            const isTesting = testingChannel === p.channel;
            return (
              <div
                key={p.channel}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                      {getChannelIcon(p.channel)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">{p.name}</h4>
                        <Badge variant={p.isLive ? 'success' : 'warning'} size="sm">
                          {p.isLive ? 'Operational' : 'Idle / Standby'}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{p.description}</p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isTesting}
                    onClick={() => handleTestChannel(p.channel)}
                    className="shrink-0 text-xs"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Pinging...
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                        Test Ping
                      </>
                    )}
                  </Button>
                </div>

                {/* Features & Telemetry */}
                <div className="pt-3 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mr-1">
                    Features:
                  </span>
                  {p.supportedFeatures.map((feat, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
