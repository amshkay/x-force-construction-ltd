/**
 * Notification Center Panel
 * Module 18 — Communication & Notifications
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Full-scale operational notification center supporting multi-channel audit logs,
 * categorized event feeds, priority filtering, and live broadcast simulations.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  Search,
  SlidersHorizontal,
  Activity,
  AlertTriangle,
  Info,
  ShoppingCart,
  CreditCard,
  Package,
  Wrench,
  FileSpreadsheet,
  FileQuestion,
  MessageSquare,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Radio,
  Send,
  Sparkles,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notification.service';
import { InAppNotification, NotificationPriority, NotificationType } from '../../types/communication';
import { NotificationPreferencesModal } from './NotificationPreferencesModal';
import { ExternalProviderStatusModal } from './ExternalProviderStatusModal';

interface NotificationCenterPanelProps {
  onNavigateToModule?: (module: string) => void;
}

export const NotificationCenterPanel: React.FC<NotificationCenterPanelProps> = ({
  onNavigateToModule,
}) => {
  const toast = useToast();
  const { profile } = useAuth();
  const currentUserId = profile?.id || 'u0000000-0000-0000-0000-000000000001';

  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread' | 'urgent' | 'orders' | 'warehouse' | 'services' | 'expenses'>('all');
  const [expandedDeliveryId, setExpandedDeliveryId] = useState<string | null>(null);

  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isProvidersOpen, setIsProvidersOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await notificationService.getNotificationsForRecipient(currentUserId, 'staff');
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadNotifications();

    const unsubscribe = notificationService.subscribe(() => {
      loadNotifications();
    });

    return () => {
      unsubscribe();
    };
  }, [loadNotifications]);

  const handleMarkAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
    await loadNotifications();
    toast.showToast('Notification marked as read', 'success');
  };

  const handleMarkAllAsRead = async () => {
    const count = await notificationService.markAllAsRead(currentUserId, 'staff');
    await loadNotifications();
    toast.showToast(`Marked ${count} notifications as read`, 'success');
  };

  const handleDelete = async (id: string) => {
    await notificationService.deleteNotification(id);
    await loadNotifications();
    toast.showToast('Notification dismissed', 'info');
  };

  const handleSimulateSampleEvent = async () => {
    const randomSeed = Math.floor(Math.random() * 4);
    if (randomSeed === 0) {
      await notificationService.notifyOrderCreated({
        id: `ord-${Date.now().toString(36)}`,
        orderNumber: `XFO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        customerName: 'Dangote Granite & Concrete Works',
        totalAmount: 1850000,
      });
      toast.showToast('Simulated commercial order event dispatched!', 'success');
    } else if (randomSeed === 1) {
      await notificationService.notifyPaymentReceived({
        id: `pay-${Date.now().toString(36)}`,
        customerName: 'Engr. Obi Nwosu (Golden Estate)',
        amount: 450000,
        method: 'transfer',
        orderNumber: 'XFO-2026-0002',
      });
      toast.showToast('Simulated verified bank payment event dispatched!', 'success');
    } else if (randomSeed === 2) {
      await notificationService.notifyWarehouseTaskAssigned({
        taskId: `wh-${Date.now().toString(36)}`,
        taskTitle: 'Staging 2,400 Anthracite Pavers for Flatbed Truck',
        waybillNumber: 'WAY-2026-0045',
        assigneeId: currentUserId,
      });
      toast.showToast('Simulated warehouse staging assignment dispatched!', 'success');
    } else {
      await notificationService.notifyExpenseSubmitted({
        id: `exp-${Date.now().toString(36)}`,
        expenseNumber: `EXP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        title: 'Lister Generator Diesel Refill (500L)',
        amount: 650000,
        recordedByName: profile?.full_name || 'Yard Supervisor',
      });
      toast.showToast('Simulated operating expense approval dispatched!', 'success');
    }
  };

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q) ||
          n.relatedEntityId.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Tab filter
      switch (selectedFilter) {
        case 'unread':
          return !n.isRead;
        case 'urgent':
          return n.priority === 'urgent' || n.priority === 'important';
        case 'orders':
          return n.relatedEntityType === 'order' || n.relatedEntityType === 'payment' || n.relatedEntityType === 'quotation';
        case 'warehouse':
          return n.relatedEntityType === 'warehouse_task' || n.relatedEntityType === 'fulfilment';
        case 'services':
          return n.relatedEntityType === 'installation';
        case 'expenses':
          return n.relatedEntityType === 'expense' || n.relatedEntityType === 'supplier';
        default:
          return true;
      }
    });
  }, [notifications, searchQuery, selectedFilter]);

  // Counts
  const totalCount = notifications.length;
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const urgentCount = notifications.filter((n) => (n.priority === 'urgent' || n.priority === 'important') && !n.isRead).length;

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'ORDER_CREATED':
      case 'ORDER_UPDATED':
      case 'PAYMENT_RECEIVED':
        return <ShoppingCart className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'EXPENSE_SUBMITTED':
      case 'EXPENSE_APPROVED':
      case 'EXPENSE_REJECTED':
        return <CreditCard className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case 'WAREHOUSE_TASK_ASSIGNED':
      case 'FULFILMENT_UPDATED':
        return <Package className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
      case 'SERVICE_ASSIGNED':
      case 'SERVICE_STATUS_UPDATED':
      case 'SERVICE_COMPLETED':
        return <Wrench className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'QUOTATION_SENT':
      case 'QUOTATION_UPDATED':
      case 'QUOTATION_ACCEPTED':
      case 'QUOTATION_DECLINED':
        return <FileSpreadsheet className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case 'REQUEST_CREATED':
      case 'REQUEST_UPDATED':
        return <FileQuestion className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />;
      case 'INTERNAL_MESSAGE':
        return <MessageSquare className="h-4 w-4 text-teal-600 dark:text-teal-400" />;
      default:
        return <Info className="h-4 w-4 text-slate-600 dark:text-slate-400" />;
    }
  };

  const formatExactTime = (isoString: string): string => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 text-left p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Notification Center
            </h1>
            <Badge variant="default" size="sm">
              Module 18
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Operational event feeds, automated multi-channel delivery logs, and staff notification triggers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSimulateSampleEvent}
            className="text-xs"
            title="Simulate realistic operational events for verification"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
            Simulate Event
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsProvidersOpen(true)}
            className="text-xs"
          >
            <Activity className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
            Channel Status
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreferencesOpen(true)}
            className="text-xs"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
            Preferences
          </Button>

          {unreadCount > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Feed Events</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalCount}</p>
          <span className="text-[10px] text-slate-400">Operational history</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Unread Alerts</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{unreadCount}</p>
          <span className="text-[10px] text-amber-500">Awaiting acknowledgment</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Urgent & Important</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{urgentCount}</p>
          <span className="text-[10px] text-red-400">High priority operational triggers</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Gateways</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">5 / 5</p>
          <span className="text-[10px] text-emerald-500">In-App, WhatsApp, Email, SMS, Push</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        {/* Category Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'All Alerts' },
            { id: 'unread', label: `Unread (${unreadCount})` },
            { id: 'urgent', label: 'Urgent' },
            { id: 'orders', label: 'Orders & Sales' },
            { id: 'warehouse', label: 'Warehouse' },
            { id: 'services', label: 'Services' },
            { id: 'expenses', label: 'Expenses' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedFilter(f.id as any)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                selectedFilter === f.id
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notifications..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading notifications feed...</div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <Bell className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No matching notifications</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              There are no notifications matching your current filters. Try changing filters or clicking "Simulate Event".
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => {
            const isDeliveryExpanded = expandedDeliveryId === n.id;
            return (
              <div
                key={n.id}
                className={`p-4 rounded-xl border transition shadow-sm ${
                  n.isRead
                    ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                    : 'border-amber-200 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 mt-0.5">
                      {getTypeIcon(n.type)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className={`text-sm ${n.isRead ? 'font-semibold text-slate-800 dark:text-slate-200' : 'font-bold text-slate-900 dark:text-white'}`}>
                          {n.title}
                        </h4>
                        <Badge
                          variant={
                            n.priority === 'urgent'
                              ? 'danger'
                              : n.priority === 'important'
                              ? 'warning'
                              : 'default'
                          }
                          size="sm"
                        >
                          {n.priority.toUpperCase()}
                        </Badge>
                        {!n.isRead && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500 text-white">
                            NEW
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                        {n.message}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-slate-400">
                        <span>{formatExactTime(n.createdAt)}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-500">Ref: {n.relatedEntityId}</span>

                        {n.routeModule && onNavigateToModule && (
                          <button
                            type="button"
                            onClick={() => onNavigateToModule(n.routeModule!)}
                            className="inline-flex items-center gap-1 font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 hover:underline"
                          >
                            <span>Open {n.routeModule.toUpperCase()} Record</span>
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Right */}
                  <div className="flex items-center gap-1 sm:self-start shrink-0">
                    <button
                      type="button"
                      onClick={() => setExpandedDeliveryId(isDeliveryExpanded ? null : n.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                      title="View delivery channels log"
                    >
                      <span className="text-[10px] font-medium font-mono">
                        {n.channelDeliveries?.length || 1} Channels
                      </span>
                      {isDeliveryExpanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>

                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(n.id)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(n.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Dismiss notification"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Delivery Channel Audit */}
                {isDeliveryExpanded && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Multi-Channel Delivery Audit Trail
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                      {n.channelDeliveries?.map((cd, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[10px] uppercase font-mono text-slate-700 dark:text-slate-300">
                              {cd.channel}
                            </span>
                            <Badge
                              variant={
                                cd.status === 'delivered'
                                  ? 'success'
                                  : cd.status === 'sent' || cd.status === 'queued'
                                  ? 'warning'
                                  : 'danger'
                              }
                              size="sm"
                            >
                              {cd.status}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 truncate">
                            {cd.providerName}
                          </p>
                          {cd.recipientAddress && (
                            <p className="text-[9px] font-mono text-slate-400 truncate mt-0.5">
                              {cd.recipientAddress}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

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
    </div>
  );
};
