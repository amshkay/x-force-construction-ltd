/**
 * Communication & Notifications Types
 * Module 18 — Communication & Notifications
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Core domain types for in-app notification events, multi-channel delivery status,
 * internal staff-to-staff messaging, and notification preferences.
 */

export type NotificationType =
  | 'REQUEST_CREATED'
  | 'REQUEST_UPDATED'
  | 'QUOTATION_SENT'
  | 'QUOTATION_UPDATED'
  | 'QUOTATION_ACCEPTED'
  | 'QUOTATION_DECLINED'
  | 'ORDER_CREATED'
  | 'ORDER_UPDATED'
  | 'PAYMENT_RECEIVED'
  | 'FULFILMENT_UPDATED'
  | 'WAREHOUSE_TASK_ASSIGNED'
  | 'SERVICE_ASSIGNED'
  | 'SERVICE_STATUS_UPDATED'
  | 'SERVICE_COMPLETED'
  | 'EXPENSE_SUBMITTED'
  | 'EXPENSE_APPROVED'
  | 'EXPENSE_REJECTED'
  | 'INTERNAL_MESSAGE'
  | 'SYSTEM_NOTIFICATION';

export type NotificationPriority = 'normal' | 'important' | 'urgent';

export type NotificationRecipientType = 'staff' | 'customer';

export type NotificationChannel = 'in_app' | 'email' | 'whatsapp' | 'sms' | 'push';

export type DeliveryStatus = 'pending' | 'queued' | 'sent' | 'delivered' | 'failed';

export type RelatedEntityType =
  | 'request'
  | 'quotation'
  | 'order'
  | 'payment'
  | 'fulfilment'
  | 'warehouse_task'
  | 'installation'
  | 'expense'
  | 'supplier'
  | 'service_provider'
  | 'conversation'
  | 'system';

export interface ChannelDeliveryLog {
  channel: NotificationChannel;
  status: DeliveryStatus;
  providerName: string;
  sentAt?: string;
  deliveredAt?: string;
  failureReason?: string;
  recipientAddress?: string; // email address, phone, or push endpoint
}

export interface InAppNotification {
  id: string; // e.g. notif-uuid
  recipientType: NotificationRecipientType;
  recipientId: string; // staff user UUID or customer UUID, or 'all_staff'
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  relatedEntityType: RelatedEntityType;
  relatedEntityId: string; // e.g. XFO-2026-0001, EXP-2026-0001
  routeModule?: string; // e.g. 'orders', 'quotations', 'installations', 'expenses'
  routeParams?: Record<string, string>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  expiresAt?: string;
  idempotencyKey?: string; // Prevents duplicate generation on event re-triggers
  channelDeliveries: ChannelDeliveryLog[];
}

export interface NotificationFilters {
  recipientId?: string;
  recipientType?: NotificationRecipientType;
  type?: NotificationType | 'all';
  priority?: NotificationPriority | 'all';
  isRead?: boolean;
  relatedEntityType?: RelatedEntityType | 'all';
  searchQuery?: string;
}

export interface NotificationPreferences {
  userId: string;
  channels: {
    inApp: boolean;
    email: boolean;
    whatsapp: boolean;
    sms: boolean;
    push: boolean;
  };
  categories: {
    orders: boolean;
    payments: boolean;
    services: boolean;
    warehouse: boolean;
    quotations: boolean;
    expenses: boolean;
    internalMessages: boolean;
    systemAlerts: boolean; // Security & account alerts always true
  };
  updatedAt: string;
}

export interface MessageAttachment {
  id: string;
  name: string;
  url: string;
  fileType: string;
  fileSize: number;
}

export interface ConversationParticipant {
  userId: string;
  fullName: string;
  email: string;
  roleName: string;
  roleDisplayName: string;
  jobTitle?: string;
  avatarUrl?: string | null;
}

export interface InternalMessage {
  id: string; // msg-uuid
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  attachments?: MessageAttachment[];
  isRead: boolean;
  readBy: Array<{ userId: string; readAt: string }>;
  createdAt: string;
}

export interface InternalConversation {
  id: string; // conv-uuid
  title?: string;
  type: 'direct' | 'group';
  participantIds: string[];
  participants: ConversationParticipant[];
  contextType?: RelatedEntityType;
  contextId?: string; // e.g. Order number XFO-2026-0001, Service Job SRV-2026-0001
  contextSummary?: string; // e.g. "Order #XFO-2026-0001 (Chief Okonkwo)"
  lastMessage?: {
    content: string;
    senderId: string;
    senderName: string;
    createdAt: string;
  };
  unreadCounts: Record<string, number>; // userId -> unread count
  createdAt: string;
  updatedAt: string;
}

export interface CreateConversationDTO {
  title?: string;
  type: 'direct' | 'group';
  participantIds: string[];
  initialMessage?: string;
  contextType?: RelatedEntityType;
  contextId?: string;
  contextSummary?: string;
}

export interface SendMessageDTO {
  conversationId: string;
  content: string;
  attachments?: MessageAttachment[];
}

export interface ExternalProviderStatus {
  channel: NotificationChannel;
  name: string;
  isConfigured: boolean;
  isLive: boolean;
  description: string;
  supportedFeatures: string[];
}
