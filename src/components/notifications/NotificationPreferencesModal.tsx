/**
 * Notification Preferences Modal
 * Module 18 — Communication & Notifications
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * User configuration modal for multi-channel notification toggles
 * (In-App, Email, WhatsApp, SMS, Web Push) and event categories.
 */

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  MessageCircle,
  Smartphone,
  Radio,
  Check,
  Save,
  X,
  ShieldAlert,
  ShoppingCart,
  CreditCard,
  Package,
  Wrench,
  FileSpreadsheet,
  MessageSquare,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { notificationService } from '../../services/notification.service';
import { NotificationPreferences } from '../../types/communication';

interface NotificationPreferencesModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
  userId,
  isOpen,
  onClose,
}) => {
  const toast = useToast();
  const [prefs, setPrefs] = useState<NotificationPreferences>(() =>
    notificationService.getPreferences(userId)
  );
  const [isRequestingPush, setIsRequestingPush] = useState(false);

  useEffect(() => {
    setPrefs(notificationService.getPreferences(userId));
  }, [userId]);

  const handleChannelToggle = async (channelKey: keyof NotificationPreferences['channels']) => {
    if (channelKey === 'push' && !prefs.channels.push) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setIsRequestingPush(true);
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            toast.showToast('Browser notifications enabled', 'success');
            setPrefs((prev) => ({
              ...prev,
              channels: { ...prev.channels, push: true },
            }));
          } else {
            toast.showToast(`Browser permission: ${permission}. Please allow in browser settings.`, 'error');
            setPrefs((prev) => ({
              ...prev,
              channels: { ...prev.channels, push: false },
            }));
          }
        } catch {
          toast.showToast('Failed to request notification permission.', 'error');
        } finally {
          setIsRequestingPush(false);
        }
        return;
      }
    }

    setPrefs((prev) => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channelKey]: !prev.channels[channelKey],
      },
    }));
  };

  const handleCategoryToggle = (categoryKey: keyof NotificationPreferences['categories']) => {
    if (categoryKey === 'systemAlerts') {
      toast.showToast('Security and system alerts cannot be disabled.', 'warning');
      return;
    }

    setPrefs((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [categoryKey]: !prev.categories[categoryKey],
      },
    }));
  };

  const handleSave = () => {
    notificationService.savePreferences(prefs);
    toast.showToast('Notification preferences saved successfully', 'success');
    onClose();
  };

  const channelsList: Array<{
    key: keyof NotificationPreferences['channels'];
    label: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      key: 'inApp',
      label: 'In-App Notifications',
      description: 'Instant notification badge and operational feed inside the web app.',
      icon: <Bell className="h-4 w-4 text-amber-500" />,
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp Business',
      description: 'Order updates, payment vouchers, and urgent waybill alerts to your WhatsApp.',
      icon: <MessageCircle className="h-4 w-4 text-emerald-500" />,
    },
    {
      key: 'email',
      label: 'Email Summaries',
      description: 'Official quotation copies, invoices, and manager approval requests.',
      icon: <Mail className="h-4 w-4 text-blue-500" />,
    },
    {
      key: 'sms',
      label: 'SMS Fallback',
      description: 'Direct SMS via Nigerian telecom gateway for urgent delivery notices.',
      icon: <Smartphone className="h-4 w-4 text-purple-500" />,
    },
    {
      key: 'push',
      label: 'Web Push (PWA)',
      description: 'Native device banners even when the tab is running in the background.',
      icon: <Radio className="h-4 w-4 text-cyan-500" />,
    },
  ];

  const categoriesList: Array<{
    key: keyof NotificationPreferences['categories'];
    label: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      key: 'orders',
      label: 'Orders & Commercial Sales',
      description: 'New orders placed, status updates, and fulfillment readiness.',
      icon: <ShoppingCart className="h-4 w-4 text-emerald-500" />,
    },
    {
      key: 'payments',
      label: 'Payments & Collections',
      description: 'Bank transfer verifications, POS counter transactions, and refunds.',
      icon: <CreditCard className="h-4 w-4 text-amber-500" />,
    },
    {
      key: 'warehouse',
      label: 'Warehouse & Yard Logistics',
      description: 'Stock picking, staging assignments, waybill dispatch, and delivery.',
      icon: <Package className="h-4 w-4 text-indigo-500" />,
    },
    {
      key: 'services',
      label: 'Installation & Site Services',
      description: 'Site supervisor allocations, laying progress, and snagging inspections.',
      icon: <Wrench className="h-4 w-4 text-blue-500" />,
    },
    {
      key: 'quotations',
      label: 'Quotations & Inquiries',
      description: 'Quote acceptance, price re-estimations, and customer consultation requests.',
      icon: <FileSpreadsheet className="h-4 w-4 text-purple-500" />,
    },
    {
      key: 'expenses',
      label: 'Operating Expenses',
      description: 'Expenditure claims, diesel vouchers, and managerial signoffs.',
      icon: <CreditCard className="h-4 w-4 text-red-500" />,
    },
    {
      key: 'internalMessages',
      label: 'Internal Team Messages',
      description: 'Direct and group discussion mentions between staff members.',
      icon: <MessageSquare className="h-4 w-4 text-teal-500" />,
    },
    {
      key: 'systemAlerts',
      label: 'System & Security Alerts',
      description: 'Account security, backup logs, and operational threshold events (always active).',
      icon: <ShieldAlert className="h-4 w-4 text-rose-500" />,
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Notification Preferences"
      size="lg"
    >
      <div className="space-y-6 text-left">
        {/* Intro */}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Tailor how and when X-FORCE delivers operational alerts to your profile across digital channels.
        </p>

        {/* Section 1: Delivery Channels */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
            Delivery Channels
          </h4>
          <div className="space-y-2">
            {channelsList.map((ch) => {
              const active = prefs.channels[ch.key];
              return (
                <div
                  key={ch.key}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                      {ch.icon}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">{ch.label}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{ch.description}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isRequestingPush && ch.key === 'push'}
                    onClick={() => handleChannelToggle(ch.key)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      active ? 'bg-amber-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        active ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Event Categories */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
            Operational Event Categories
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {categoriesList.map((cat) => {
              const active = prefs.categories[cat.key];
              const isLocked = cat.key === 'systemAlerts';
              return (
                <div
                  key={cat.key}
                  onClick={() => !isLocked && handleCategoryToggle(cat.key)}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                    active
                      ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/10'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-60'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{cat.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-slate-900 dark:text-white">{cat.label}</p>
                      {active ? (
                        <Check className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      ) : null}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {cat.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1.5" />
            Save Preferences
          </Button>
        </div>
      </div>
    </Modal>
  );
};
