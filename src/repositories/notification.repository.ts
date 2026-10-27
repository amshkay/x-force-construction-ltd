/**
 * In-App Notifications Repository
 * Module 18 — Communication & Notifications
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Provides persistent storage for operational event notifications,
 * multi-channel delivery states, deduplication guards, and preferences.
 */

import {
  InAppNotification,
  NotificationFilters,
  NotificationPreferences,
  ChannelDeliveryLog,
  NotificationRecipientType,
} from '../types/communication';
import { localStore } from '../lib/storage/localStorage';

const NOTIFICATIONS_LOCAL_STORAGE_KEY = 'xforce_notifications_v1';
const PREFERENCES_LOCAL_STORAGE_KEY = 'xforce_notif_preferences_v1';

const INITIAL_NOTIFICATIONS_SEED: InAppNotification[] = [];

export const DEFAULT_PREFERENCES = (userId: string): NotificationPreferences => ({
  userId,
  channels: {
    inApp: true,
    email: true,
    whatsapp: true,
    sms: false,
    push: true,
  },
  categories: {
    orders: true,
    payments: true,
    services: true,
    warehouse: true,
    quotations: true,
    expenses: true,
    internalMessages: true,
    systemAlerts: true,
  },
  updatedAt: new Date().toISOString(),
});

export class NotificationRepository {
  private memoryNotifications: InAppNotification[] | null = null;
  private memoryPreferences: Map<string, NotificationPreferences> = new Map();

  constructor() {
    const stored = localStore.get<InAppNotification[] | null>(NOTIFICATIONS_LOCAL_STORAGE_KEY, null);
    if (stored && Array.isArray(stored) && stored.length > 0) {
      this.memoryNotifications = stored;
    } else {
      this.memoryNotifications = [...INITIAL_NOTIFICATIONS_SEED];
      localStore.set(NOTIFICATIONS_LOCAL_STORAGE_KEY, this.memoryNotifications);
    }

    const storedPrefs = localStore.get<Record<string, NotificationPreferences> | null>(
      PREFERENCES_LOCAL_STORAGE_KEY,
      null
    );
    if (storedPrefs && typeof storedPrefs === 'object') {
      Object.entries(storedPrefs).forEach(([uid, pref]) => {
        this.memoryPreferences.set(uid, pref);
      });
    }
  }

  private save(notifications: InAppNotification[]): void {
    this.memoryNotifications = notifications;
    localStore.set(NOTIFICATIONS_LOCAL_STORAGE_KEY, notifications);
  }

  private savePreferences(): void {
    const obj: Record<string, NotificationPreferences> = {};
    this.memoryPreferences.forEach((pref, uid) => {
      obj[uid] = pref;
    });
    localStore.set(PREFERENCES_LOCAL_STORAGE_KEY, obj);
  }

  async getAll(filters?: NotificationFilters): Promise<InAppNotification[]> {
    if (!this.memoryNotifications) {
      const stored = localStore.get<InAppNotification[] | null>(NOTIFICATIONS_LOCAL_STORAGE_KEY, null);
      this.memoryNotifications = stored && Array.isArray(stored) ? stored : [...INITIAL_NOTIFICATIONS_SEED];
    }
    let list = [...this.memoryNotifications];
    if (filters) {
      if (filters.recipientId) {
        list = list.filter((n) => n.recipientId === filters.recipientId || n.recipientId === 'all_staff');
      }
      if (filters.recipientType) {
        list = list.filter((n) => n.recipientType === filters.recipientType);
      }
      if (filters.isRead !== undefined) {
        list = list.filter((n) => n.isRead === filters.isRead);
      }
      if (filters.priority && filters.priority !== 'all') {
        list = list.filter((n) => n.priority === filters.priority);
      }
      if (filters.type && filters.type !== 'all') {
        list = list.filter((n) => n.type === filters.type);
      }
    }
    return list;
  }

  /**
   * Retrieves notifications intended for a specific user (staff or customer)
   * Strictly isolating staff and customer records.
   */
  async getForRecipient(
    recipientId: string,
    recipientType: NotificationRecipientType,
    filters?: NotificationFilters
  ): Promise<InAppNotification[]> {
    const all = await this.getAll();

    let list = all.filter((n) => {
      // Must match recipient type
      if (n.recipientType !== recipientType) return false;

      // Staff can receive individual notices or 'all_staff' broadcasts
      if (recipientType === 'staff') {
        return n.recipientId === recipientId || n.recipientId === 'all_staff';
      }

      // Customer only receives notices specifically directed to their customerId
      return n.recipientId === recipientId;
    });

    if (filters) {
      if (filters.isRead !== undefined) {
        list = list.filter((n) => n.isRead === filters.isRead);
      }
      if (filters.priority && filters.priority !== 'all') {
        list = list.filter((n) => n.priority === filters.priority);
      }
      if (filters.type && filters.type !== 'all') {
        list = list.filter((n) => n.type === filters.type);
      }
      if (filters.relatedEntityType && filters.relatedEntityType !== 'all') {
        list = list.filter((n) => n.relatedEntityType === filters.relatedEntityType);
      }
      if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
        const q = filters.searchQuery.toLowerCase().trim();
        list = list.filter(
          (n) =>
            n.title.toLowerCase().includes(q) ||
            n.message.toLowerCase().includes(q) ||
            n.relatedEntityId.toLowerCase().includes(q)
        );
      }
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }

  async getUnreadCount(
    recipientId: string,
    recipientType: NotificationRecipientType
  ): Promise<number> {
    const unread = await this.getForRecipient(recipientId, recipientType, { isRead: false });
    return unread.length;
  }

  async create(notification: Omit<InAppNotification, 'id' | 'createdAt' | 'isRead'>): Promise<InAppNotification> {
    const all = await this.getAll();

    // Idempotency check: prevent duplicate notifications within 5 minutes for the same event and entity
    if (notification.idempotencyKey) {
      const existing = all.find((n) => n.idempotencyKey === notification.idempotencyKey);
      if (existing) {
        return existing;
      }
    } else {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const recentDup = all.find(
        (n) =>
          n.type === notification.type &&
          n.relatedEntityId === notification.relatedEntityId &&
          n.recipientId === notification.recipientId &&
          new Date(n.createdAt).getTime() > fiveMinutesAgo
      );
      if (recentDup) {
        return recentDup;
      }
    }

    const now = new Date().toISOString();
    const newId = `notif-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

    const newNotification: InAppNotification = {
      ...notification,
      id: newId,
      isRead: false,
      createdAt: now,
    };

    all.unshift(newNotification);
    this.save(all);
    return newNotification;
  }

  async createNotification(notification: Omit<InAppNotification, 'id' | 'createdAt' | 'isRead'>): Promise<InAppNotification> {
    return this.create(notification);
  }

  async markAsRead(notificationId: string): Promise<boolean> {
    const all = await this.getAll();
    const index = all.findIndex((n) => n.id === notificationId);
    if (index === -1) return false;

    all[index] = {
      ...all[index],
      isRead: true,
      readAt: new Date().toISOString(),
    };

    this.save(all);
    return true;
  }

  async markAllAsRead(recipientId: string, recipientType: NotificationRecipientType): Promise<number> {
    const all = await this.getAll();
    let updatedCount = 0;
    const now = new Date().toISOString();

    const updated = all.map((n) => {
      const isTarget =
        n.recipientType === recipientType &&
        (n.recipientId === recipientId || (recipientType === 'staff' && n.recipientId === 'all_staff'));

      if (isTarget && !n.isRead) {
        updatedCount++;
        return {
          ...n,
          isRead: true,
          readAt: now,
        };
      }
      return n;
    });

    if (updatedCount > 0) {
      this.save(updated);
    }
    return updatedCount;
  }

  async clearNotification(notificationId: string): Promise<boolean> {
    const all = await this.getAll();
    const filtered = all.filter((n) => n.id !== notificationId);
    if (filtered.length === all.length) return false;
    this.save(filtered);
    return true;
  }

  // Preferences
  getPreferences(userId: string): NotificationPreferences {
    const existing = this.memoryPreferences.get(userId);
    if (existing) return existing;
    const def = DEFAULT_PREFERENCES(userId);
    this.memoryPreferences.set(userId, def);
    this.savePreferences();
    return def;
  }

  saveUserPreferences(preferences: NotificationPreferences): NotificationPreferences {
    preferences.updatedAt = new Date().toISOString();
    this.memoryPreferences.set(preferences.userId, preferences);
    this.savePreferences();
    return preferences;
  }
}

export const notificationRepository = new NotificationRepository();
