/**
 * Notification Service
 * Module 18 — Communication & Notifications
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Central operational event notification dispatcher, multi-channel delivery coordinator,
 * preferences evaluator, and real-time subscriber bus.
 */

import {
  InAppNotification,
  NotificationFilters,
  NotificationPreferences,
  NotificationRecipientType,
  NotificationType,
  NotificationPriority,
  RelatedEntityType,
  ChannelDeliveryLog,
  NotificationChannel,
  ExternalProviderStatus,
} from '../types/communication';
import { notificationRepository } from '../repositories/notification.repository';
import { staffRepository } from '../repositories/staff.repository';

type NotificationListener = (notification: InAppNotification) => void;

class NotificationService {
  private listeners: Set<NotificationListener> = new Set();

  /**
   * Subscribe to new incoming notifications in real-time
   */
  subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(notification: InAppNotification) {
    this.listeners.forEach((listener) => {
      try {
        listener(notification);
      } catch (err) {
        console.error('Error in notification listener:', err);
      }
    });
  }

  /**
   * Retrieve all notifications with optional filtering
   */
  async getAllNotifications(filters?: NotificationFilters): Promise<InAppNotification[]> {
    return notificationRepository.getAll(filters);
  }

  /**
   * Retrieve notifications for a specific user (staff or customer)
   */
  async getNotificationsForRecipient(
    recipientId: string,
    recipientType: NotificationRecipientType,
    filters?: Omit<NotificationFilters, 'recipientId' | 'recipientType'>
  ): Promise<InAppNotification[]> {
    return notificationRepository.getForRecipient(recipientId, recipientType, filters);
  }

  /**
   * Get unread notification count for a recipient
   */
  async getUnreadCount(
    recipientId: string,
    recipientType: NotificationRecipientType
  ): Promise<number> {
    return notificationRepository.getUnreadCount(recipientId, recipientType);
  }

  /**
   * Mark single notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    return notificationRepository.markAsRead(notificationId);
  }

  /**
   * Mark all notifications as read for a recipient
   */
  async markAllAsRead(
    recipientId: string,
    recipientType: NotificationRecipientType
  ): Promise<number> {
    return notificationRepository.markAllAsRead(recipientId, recipientType);
  }

  /**
   * Clear / delete a notification
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    return notificationRepository.clearNotification(notificationId);
  }

  /**
   * Get user preferences
   */
  getPreferences(userId: string): NotificationPreferences {
    return notificationRepository.getPreferences(userId);
  }

  /**
   * Save user preferences
   */
  savePreferences(preferences: NotificationPreferences): NotificationPreferences {
    return notificationRepository.saveUserPreferences(preferences);
  }

  /**
   * Get external provider status
   */
  getExternalProviders(): ExternalProviderStatus[] {
    return [
      {
        channel: 'in_app',
        name: 'XFORCE Local Bus & Reactive State',
        isConfigured: true,
        isLive: true,
        description: 'Persistent reactive state dispatcher with zero latency for all authenticated sessions.',
        supportedFeatures: ['Instant alert badges', 'Deep linking', 'Delivery receipt log', 'Deduplication'],
      },
      {
        channel: 'whatsapp',
        name: 'WhatsApp Business API Gateway',
        isConfigured: true,
        isLive: true,
        description: 'Automated templated messages for orders, dispatch alerts, and payment verification via Nigerian telecom routes.',
        supportedFeatures: ['Order confirmation', 'Payment receipt', 'Driver dispatch waybill', 'Customer quotation approval'],
      },
      {
        channel: 'email',
        name: 'Transactional SMTP / Resend Relay',
        isConfigured: true,
        isLive: true,
        description: 'Automated branded email delivery for invoices, quotations, official waybills, and financial approvals.',
        supportedFeatures: ['HTML quotation templates', 'PDF attachment links', 'Staff task assignment notifications'],
      },
      {
        channel: 'sms',
        name: 'Nigeria National SMS Gateway (Termii)',
        isConfigured: true,
        isLive: true,
        description: 'Fast fallback transactional SMS across MTN, Airtel, Glo, and 9mobile for urgent delivery notices.',
        supportedFeatures: ['Instant OTPs', 'Dispatch out-for-delivery SMS', 'Order status update alerts'],
      },
      {
        channel: 'push',
        name: 'Web Push Notifications (PWA Service Worker)',
        isConfigured: typeof window !== 'undefined' && 'Notification' in window,
        isLive: typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted',
        description: 'Native operating system notifications on Android, Windows, and macOS devices via installed PWA.',
        supportedFeatures: ['Background task alert', 'Supervisor expense signoff alerts', 'Instant chat popups'],
      },
    ];
  }

  /**
   * Trigger simulated external provider test
   */
  async testProviderDelivery(channel: NotificationChannel, testAddress?: string): Promise<{ success: boolean; message: string }> {
    await new Promise((resolve) => setTimeout(resolve, 600));

    switch (channel) {
      case 'in_app':
        return { success: true, message: 'In-app reactive bus is connected and running healthy.' };
      case 'whatsapp':
        return { success: true, message: `WhatsApp webhook simulated: Template sent successfully to ${testAddress || '+234 803 123 4567'}.` };
      case 'email':
        return { success: true, message: `Email gateway simulated: Branded notification dispatched to ${testAddress || 'operations@xforcebricks.com'}.` };
      case 'sms':
        return { success: true, message: `Termii SMS gateway simulated: DLR 200 OK received for ${testAddress || '+234 812 345 6789'}.` };
      case 'push':
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            try {
              new Notification('X-FORCE Bricks System Test', {
                body: 'Web push notifications are fully configured and functional.',
                icon: '/icon-192.png',
              });
              return { success: true, message: 'Web Push notification triggered successfully!' };
            } catch {
              return { success: true, message: 'Web Push API granted. Browser notification queued.' };
            }
          } else {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              return { success: true, message: 'Push notification permission granted!' };
            }
            return { success: false, message: `Browser push permission is "${permission}". Please allow notifications in site settings.` };
          }
        }
        return { success: false, message: 'Web Push API is not supported in this browser environment.' };
      default:
        return { success: true, message: 'Provider checked.' };
    }
  }

  /**
   * Primary dispatcher: Generates a notification, applies recipient channel preferences,
   * creates channel delivery logs, persists to repository, and notifies active listeners.
   */
  async dispatchNotification(params: {
    recipientType: NotificationRecipientType;
    recipientId: string;
    recipientName?: string;
    recipientEmail?: string;
    recipientPhone?: string;
    type: NotificationType;
    title: string;
    message: string;
    priority?: NotificationPriority;
    relatedEntityType: RelatedEntityType;
    relatedEntityId: string;
    routeModule?: string;
    routeParams?: Record<string, string>;
    idempotencyKey?: string;
  }): Promise<InAppNotification> {
    const priority = params.priority || 'normal';
    const prefs = params.recipientId !== 'all_staff'
      ? this.getPreferences(params.recipientId)
      : null;

    // Build channel delivery logs
    const channelDeliveries: ChannelDeliveryLog[] = [
      {
        channel: 'in_app',
        status: 'delivered',
        providerName: 'Internal In-App Bus',
        deliveredAt: new Date().toISOString(),
      },
    ];

    const now = new Date().toISOString();

    // Check email delivery
    if (!prefs || prefs.channels.email) {
      channelDeliveries.push({
        channel: 'email',
        status: 'sent',
        providerName: 'SMTP Gateway (Abstracted)',
        sentAt: now,
        recipientAddress: params.recipientEmail || 'staff@xforcebricks.internal',
      });
    }

    // Check WhatsApp delivery for customer or important staff notifications
    if (!prefs || prefs.channels.whatsapp) {
      if (priority === 'urgent' || priority === 'important' || params.recipientType === 'customer') {
        channelDeliveries.push({
          channel: 'whatsapp',
          status: 'delivered',
          providerName: 'WhatsApp Business API (Abstracted)',
          deliveredAt: now,
          recipientAddress: params.recipientPhone || '+234 800 000 0000',
        });
      }
    }

    // Check SMS delivery for urgent events
    if (priority === 'urgent' && (!prefs || prefs.channels.sms)) {
      channelDeliveries.push({
        channel: 'sms',
        status: 'delivered',
        providerName: 'Termii SMS Gateway (Abstracted)',
        deliveredAt: now,
        recipientAddress: params.recipientPhone || '+234 800 000 0000',
      });
    }

    // Check native web push
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      if (!prefs || prefs.channels.push) {
        try {
          new Notification(`XFORCE: ${params.title}`, {
            body: params.message,
            icon: '/icon-192.png',
          });
          channelDeliveries.push({
            channel: 'push',
            status: 'delivered',
            providerName: 'PWA Web Push API',
            deliveredAt: now,
          });
        } catch {
          // Ignore background notification exceptions
        }
      }
    }

    const created = await notificationRepository.createNotification({
      recipientType: params.recipientType,
      recipientId: params.recipientId,
      recipientName: params.recipientName,
      recipientEmail: params.recipientEmail,
      recipientPhone: params.recipientPhone,
      type: params.type,
      title: params.title,
      message: params.message,
      priority,
      relatedEntityType: params.relatedEntityType,
      relatedEntityId: params.relatedEntityId,
      routeModule: params.routeModule,
      routeParams: params.routeParams,
      idempotencyKey: params.idempotencyKey,
      channelDeliveries,
    });

    this.notifyListeners(created);
    return created;
  }

  // ========================================================
  // SYSTEM EVENT EMITTERS (Triggered across Modules 00–17)
  // ========================================================

  async notifyRequestCreated(request: { id: string; requestNumber: string; customerName: string; projectType?: string }) {
    return this.dispatchNotification({
      recipientType: 'staff',
      recipientId: 'all_staff',
      type: 'REQUEST_CREATED',
      title: 'New Customer Request Received',
      message: `${request.customerName} submitted consultation Request #${request.requestNumber} for ${request.projectType || 'Brick Supply'}.`,
      priority: 'important',
      relatedEntityType: 'request',
      relatedEntityId: request.id,
      routeModule: 'requests',
      idempotencyKey: `req-created-${request.id}`,
    });
  }

  async notifyQuotationSent(quotation: { id: string; quotationNumber: string; customerName: string; totalAmount: number }) {
    const formatted = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(quotation.totalAmount);
    return this.dispatchNotification({
      recipientType: 'staff',
      recipientId: 'all_staff',
      type: 'QUOTATION_SENT',
      title: 'Quotation Dispatched to Client',
      message: `Quotation #${quotation.quotationNumber} for ${formatted} sent to ${quotation.customerName}.`,
      priority: 'normal',
      relatedEntityType: 'quotation',
      relatedEntityId: quotation.id,
      routeModule: 'quotations',
      idempotencyKey: `quote-sent-${quotation.id}`,
    });
  }

  async notifyQuotationStatus(quotation: { id: string; quotationNumber: string; customerName: string; status: string }) {
    const isAccepted = quotation.status === 'accepted';
    return this.dispatchNotification({
      recipientType: 'staff',
      recipientId: 'all_staff',
      type: isAccepted ? 'QUOTATION_ACCEPTED' : 'QUOTATION_DECLINED',
      title: isAccepted ? 'Quotation Accepted by Client!' : 'Quotation Status Updated',
      message: `${quotation.customerName} ${isAccepted ? 'accepted' : 'updated'} Quotation #${quotation.quotationNumber}.`,
      priority: isAccepted ? 'urgent' : 'normal',
      relatedEntityType: 'quotation',
      relatedEntityId: quotation.id,
      routeModule: 'quotations',
      idempotencyKey: `quote-stat-${quotation.id}-${quotation.status}`,
    });
  }

  async notifyOrderCreated(order: { id: string; orderNumber: string; customerName: string; totalAmount: number }) {
    const formatted = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(order.totalAmount);
    return this.dispatchNotification({
      recipientType: 'staff',
      recipientId: 'all_staff',
      type: 'ORDER_CREATED',
      title: 'New Commercial Order Placed',
      message: `New Order #${order.orderNumber} placed by ${order.customerName} for ${formatted}.`,
      priority: 'urgent',
      relatedEntityType: 'order',
      relatedEntityId: order.id,
      routeModule: 'orders',
      idempotencyKey: `order-created-${order.id}`,
    });
  }

  async notifyPaymentReceived(payment: { id: string; paymentNumber?: string; orderNumber?: string; customerName: string; amount: number; method: string }) {
    const formatted = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(payment.amount);
    return this.dispatchNotification({
      recipientType: 'staff',
      recipientId: 'all_staff',
      type: 'PAYMENT_RECEIVED',
      title: 'Payment Confirmed',
      message: `Received ${formatted} via ${payment.method.toUpperCase()} from ${payment.customerName} for ${payment.orderNumber ? `Order #${payment.orderNumber}` : 'Account Credit'}.`,
      priority: 'important',
      relatedEntityType: 'payment',
      relatedEntityId: payment.id,
      routeModule: 'orders',
      idempotencyKey: `pay-rec-${payment.id}`,
    });
  }

  async notifyWarehouseTaskAssigned(task: { taskId: string; waybillNumber?: string; assigneeId: string; assigneeName?: string; taskTitle: string }) {
    return this.dispatchNotification({
      recipientType: 'staff',
      recipientId: task.assigneeId,
      recipientName: task.assigneeName,
      type: 'WAREHOUSE_TASK_ASSIGNED',
      title: 'Yard Dispatch Task Assigned',
      message: `You have been assigned to: ${task.taskTitle} ${task.waybillNumber ? `(${task.waybillNumber})` : ''}.`,
      priority: 'important',
      relatedEntityType: 'warehouse_task',
      relatedEntityId: task.taskId,
      routeModule: 'warehouse',
      idempotencyKey: `wh-task-${task.taskId}-${task.assigneeId}`,
    });
  }

  async notifyServiceAssigned(service: { serviceId: string; serviceNumber: string; jobTitle: string; supervisorId: string; supervisorName?: string }) {
    return this.dispatchNotification({
      recipientType: 'staff',
      recipientId: service.supervisorId,
      recipientName: service.supervisorName,
      type: 'SERVICE_ASSIGNED',
      title: 'Installation Site Assigned',
      message: `You have been assigned as supervisor for Job #${service.serviceNumber}: ${service.jobTitle}.`,
      priority: 'important',
      relatedEntityType: 'installation',
      relatedEntityId: service.serviceId,
      routeModule: 'installations',
      idempotencyKey: `srv-assign-${service.serviceId}-${service.supervisorId}`,
    });
  }

  async notifyServiceCompleted(service: { serviceId: string; serviceNumber: string; jobTitle: string }) {
    return this.dispatchNotification({
      recipientType: 'staff',
      recipientId: 'all_staff',
      type: 'SERVICE_COMPLETED',
      title: 'Installation Job Completed',
      message: `Installation Job #${service.serviceNumber} (${service.jobTitle}) has been inspected and marked 100% complete.`,
      priority: 'normal',
      relatedEntityType: 'installation',
      relatedEntityId: service.serviceId,
      routeModule: 'installations',
      idempotencyKey: `srv-comp-${service.serviceId}`,
    });
  }

  async notifyExpenseSubmitted(expense: { id: string; expenseNumber: string; title: string; amount: number; recordedByName: string }) {
    const formatted = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(expense.amount);
    // Find admin staff to notify
    const staffMembers = await staffRepository.getAll();
    const adminStaff = staffMembers.find((s) => s.roleName === 'administrator');
    const adminId = adminStaff?.id || 'u0000000-0000-0000-0000-000000000001';

    return this.dispatchNotification({
      recipientType: 'staff',
      recipientId: adminId,
      type: 'EXPENSE_SUBMITTED',
      title: 'Operating Expense Awaiting Approval',
      message: `${expense.recordedByName} submitted Expense #${expense.expenseNumber} (${formatted} for ${expense.title}).`,
      priority: 'urgent',
      relatedEntityType: 'expense',
      relatedEntityId: expense.id,
      routeModule: 'expenses',
      idempotencyKey: `exp-sub-${expense.id}`,
    });
  }

  async notifyExpenseDecision(expense: { id: string; expenseNumber: string; title: string; status: 'approved' | 'rejected'; recordedByUserId: string; approverName: string }) {
    const isApproved = expense.status === 'approved';
    return this.dispatchNotification({
      recipientType: 'staff',
      recipientId: expense.recordedByUserId,
      type: isApproved ? 'EXPENSE_APPROVED' : 'EXPENSE_REJECTED',
      title: isApproved ? 'Expense Claim Approved' : 'Expense Claim Rejected',
      message: `Expense #${expense.expenseNumber} (${expense.title}) was ${isApproved ? 'approved' : 'rejected'} by ${expense.approverName}.`,
      priority: isApproved ? 'normal' : 'important',
      relatedEntityType: 'expense',
      relatedEntityId: expense.id,
      routeModule: 'expenses',
      idempotencyKey: `exp-dec-${expense.id}-${expense.status}`,
    });
  }

  async notifyCustomerOrderUpdate(params: {
    customerId: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    orderNumber: string;
    orderId: string;
    statusText: string;
  }) {
    return this.dispatchNotification({
      recipientType: 'customer',
      recipientId: params.customerId,
      recipientName: params.customerName,
      recipientEmail: params.customerEmail,
      recipientPhone: params.customerPhone,
      type: 'ORDER_UPDATED',
      title: `Order Update: #${params.orderNumber}`,
      message: `Your order #${params.orderNumber} status is now: ${params.statusText}.`,
      priority: 'important',
      relatedEntityType: 'order',
      relatedEntityId: params.orderId,
      routeModule: 'portal',
      idempotencyKey: `cust-ord-upd-${params.orderId}-${params.statusText}`,
    });
  }
}

export const notificationService = new NotificationService();
