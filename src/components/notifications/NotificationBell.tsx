/**
 * Notification Bell & Quick Dropdown
 * Module 18 — Communication & Notifications
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Real-time notification badge, audible/visual unread counter,
 * and quick-access operational feed popover.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  ExternalLink,
  SlidersHorizontal,
  Activity,
  ShoppingCart,
  CreditCard,
  Package,
  Wrench,
  FileSpreadsheet,
  FileQuestion,
  MessageSquare,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Popover } from '../ui/Popover';
import { Badge } from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notification.service';
import { InAppNotification, NotificationType } from '../../types/communication';
import { NotificationPreferencesModal } from './NotificationPreferencesModal';
import { ExternalProviderStatusModal } from './ExternalProviderStatusModal';

interface NotificationBellProps {
  onNavigateToModule?: (module: string) => void;
  onOpenNotificationCenter?: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  onNavigateToModule,
  onOpenNotificationCenter,
}) => {
  const { profile } = useAuth();
  const currentUserId = profile?.id || 'u0000000-0000-0000-0000-000000000001';

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [recentNotifications, setRecentNotifications] = useState<InAppNotification[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState<boolean>(false);
  const [isProvidersOpen, setIsProvidersOpen] = useState<boolean>(false);

  const loadNotifications = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount(currentUserId, 'staff');
      setUnreadCount(count);

      const all = await notificationService.getNotificationsForRecipient(currentUserId, 'staff');
      setRecentNotifications(all.slice(0, 5));
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadNotifications();

    // Subscribe to live notifications bus
    const unsubscribe = notificationService.subscribe(() => {
      loadNotifications();
    });

    return () => {
      unsubscribe();
    };
  }, [loadNotifications]);

  const handleMarkAsRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await notificationService.markAsRead(id);
    await loadNotifications();
  };

  const handleMarkAllAsRead = async () => {
    await notificationService.markAllAsRead(currentUserId, 'staff');
    await loadNotifications();
  };

  const handleItemClick = async (notif: InAppNotification) => {
    if (!notif.isRead) {
      await notificationService.markAsRead(notif.id);
      await loadNotifications();
    }
    setIsOpen(false);
    if (notif.routeModule && onNavigateToModule) {
      onNavigateToModule(notif.routeModule);
    } else if (onOpenNotificationCenter) {
      onOpenNotificationCenter();
    }
  };

  const formatRelativeTime = (isoString: string): string => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'ORDER_CREATED':
      case 'ORDER_UPDATED':
      case 'PAYMENT_RECEIVED':
        return <ShoppingCart className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />;
      case 'EXPENSE_SUBMITTED':
      case 'EXPENSE_APPROVED':
      case 'EXPENSE_REJECTED':
        return <CreditCard className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />;
      case 'WAREHOUSE_TASK_ASSIGNED':
      case 'FULFILMENT_UPDATED':
        return <Package className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />;
      case 'SERVICE_ASSIGNED':
      case 'SERVICE_STATUS_UPDATED':
      case 'SERVICE_COMPLETED':
        return <Wrench className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />;
      case 'QUOTATION_SENT':
      case 'QUOTATION_UPDATED':
      case 'QUOTATION_ACCEPTED':
      case 'QUOTATION_DECLINED':
        return <FileSpreadsheet className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />;
      case 'REQUEST_CREATED':
      case 'REQUEST_UPDATED':
        return <FileQuestion className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />;
      case 'INTERNAL_MESSAGE':
        return <MessageSquare className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />;
      default:
        return <Info className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />;
    }
  };

  return (
    <>
      <Popover
        id="admin-notifications-popover"
        align="right"
        className="w-80 sm:w-96 p-0 overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 rounded-xl"
        trigger={
          <button
            id="btn-notification-bell"
            type="button"
            className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] px-1 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900 animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        }
      >
        <div className="flex flex-col max-h-[28rem] bg-white dark:bg-slate-900 text-left">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Live Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3 w-3" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsPreferencesOpen(true);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition"
                title="Notification Preferences"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 max-h-72">
            {recentNotifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                <Bell className="h-7 w-7 mx-auto mb-2 opacity-30 text-slate-400" />
                <p className="font-medium text-slate-600 dark:text-slate-300">No notifications yet</p>
                <p className="text-[11px] mt-0.5 text-slate-400">Events from orders, dispatch, and finance will show here.</p>
              </div>
            ) : (
              recentNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`group relative flex items-start gap-3 p-3 cursor-pointer transition ${
                    n.isRead
                      ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 opacity-80'
                      : 'bg-amber-50/40 dark:bg-amber-950/10 hover:bg-amber-50/70 dark:hover:bg-amber-950/20'
                  }`}
                >
                  {/* Priority and Category Icon */}
                  <div className="relative mt-0.5 shrink-0">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                      {getTypeIcon(n.type)}
                    </div>
                    {n.priority === 'urgent' && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
                    )}
                  </div>

                  {/* Text content */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs truncate ${n.isRead ? 'font-medium text-slate-700 dark:text-slate-200' : 'font-bold text-slate-900 dark:text-white'}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                      {n.message}
                    </p>

                    {/* Delivery channels pill */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {n.priority !== 'normal' && (
                        <span
                          className={`text-[9px] font-bold px-1 rounded uppercase tracking-wider ${
                            n.priority === 'urgent'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          }`}
                        >
                          {n.priority}
                        </span>
                      )}
                      {n.channelDeliveries?.map((cd, idx) => (
                        <span key={idx} className="text-[9px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded font-mono">
                          {cd.channel}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Read / Unread Indicator & Mark Read Button */}
                  {!n.isRead && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkAsRead(e, n.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                      title="Mark as read"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer Bar */}
          <div className="flex items-center justify-between p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsProvidersOpen(true);
              }}
              className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition"
            >
              <Activity className="h-3 w-3 text-emerald-500" />
              <span>Channels Status</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (onOpenNotificationCenter) {
                  onOpenNotificationCenter();
                } else if (onNavigateToModule) {
                  onNavigateToModule('notifications');
                }
              }}
              className="flex items-center gap-1 font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition text-[11px]"
            >
              <span>Notification Center</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </Popover>

      {/* Preferences Modal */}
      {isPreferencesOpen && (
        <NotificationPreferencesModal
          userId={currentUserId}
          isOpen={isPreferencesOpen}
          onClose={() => setIsPreferencesOpen(false)}
        />
      )}

      {/* External Providers Diagnostics Modal */}
      {isProvidersOpen && (
        <ExternalProviderStatusModal
          isOpen={isProvidersOpen}
          onClose={() => setIsProvidersOpen(false)}
        />
      )}
    </>
  );
};
