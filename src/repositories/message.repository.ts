/**
 * Internal Web Messaging Repository
 * Module 18 — Communication & Notifications
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Provides persistent storage for staff-to-staff internal communications,
 * conversation threads, contextual business record linking, and message attachments.
 * Strictly inaccessible to external customers.
 */

import {
  InternalConversation,
  InternalMessage,
  CreateConversationDTO,
  SendMessageDTO,
  ConversationParticipant,
} from '../types/communication';
import { localStore } from '../lib/storage/localStorage';
import { staffRepository } from './staff.repository';

const CONVERSATIONS_LOCAL_STORAGE_KEY = 'xforce_conversations_v1';
const MESSAGES_LOCAL_STORAGE_KEY = 'xforce_internal_messages_v1';

const INITIAL_CONVERSATIONS_SEED: InternalConversation[] = [];

const INITIAL_MESSAGES_SEED: InternalMessage[] = [];

export class MessageRepository {
  private memoryConversations: InternalConversation[] | null = null;
  private memoryMessages: InternalMessage[] | null = null;

  constructor() {
    const storedConvs = localStore.get<InternalConversation[] | null>(CONVERSATIONS_LOCAL_STORAGE_KEY, null);
    if (storedConvs && Array.isArray(storedConvs) && storedConvs.length > 0) {
      this.memoryConversations = storedConvs;
    } else {
      this.memoryConversations = [...INITIAL_CONVERSATIONS_SEED];
      localStore.set(CONVERSATIONS_LOCAL_STORAGE_KEY, this.memoryConversations);
    }

    const storedMsgs = localStore.get<InternalMessage[] | null>(MESSAGES_LOCAL_STORAGE_KEY, null);
    if (storedMsgs && Array.isArray(storedMsgs) && storedMsgs.length > 0) {
      this.memoryMessages = storedMsgs;
    } else {
      this.memoryMessages = [...INITIAL_MESSAGES_SEED];
      localStore.set(MESSAGES_LOCAL_STORAGE_KEY, this.memoryMessages);
    }
  }

  private saveConversations(convs: InternalConversation[]): void {
    this.memoryConversations = convs;
    localStore.set(CONVERSATIONS_LOCAL_STORAGE_KEY, convs);
  }

  private saveMessages(msgs: InternalMessage[]): void {
    this.memoryMessages = msgs;
    localStore.set(MESSAGES_LOCAL_STORAGE_KEY, msgs);
  }

  async getAllConversations(): Promise<InternalConversation[]> {
    if (!this.memoryConversations) {
      const stored = localStore.get<InternalConversation[] | null>(CONVERSATIONS_LOCAL_STORAGE_KEY, null);
      this.memoryConversations = stored && Array.isArray(stored) ? stored : [...INITIAL_CONVERSATIONS_SEED];
    }
    return [...this.memoryConversations];
  }

  /**
   * Retrieves conversations where the staff user is an authorized participant
   * (or if administrator, supervisory visibility).
   */
  async getConversationsForUser(userId: string, isSuperAdmin: boolean = false): Promise<InternalConversation[]> {
    const all = await this.getAllConversations();
    return all.filter((c) => isSuperAdmin || c.participantIds.includes(userId));
  }

  async getConversationById(id: string, userId: string, isSuperAdmin: boolean = false): Promise<InternalConversation | null> {
    const all = await this.getAllConversations();
    const conv = all.find((c) => c.id === id);
    if (!conv) return null;

    if (!isSuperAdmin && !conv.participantIds.includes(userId)) {
      throw new Error('Access denied: You are not an authorized participant in this conversation.');
    }
    return conv;
  }

  async getMessages(conversationId: string, userId: string, isSuperAdmin: boolean = false): Promise<InternalMessage[]> {
    // Check conversation participation authorization first
    await this.getConversationById(conversationId, userId, isSuperAdmin);

    if (!this.memoryMessages) {
      const stored = localStore.get<InternalMessage[] | null>(MESSAGES_LOCAL_STORAGE_KEY, null);
      this.memoryMessages = stored && Array.isArray(stored) ? stored : [...INITIAL_MESSAGES_SEED];
    }

    const msgs = this.memoryMessages.filter((m) => m.conversationId === conversationId);
    // Sort oldest first for thread display
    msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return msgs;
  }

  async createConversation(
    dto: CreateConversationDTO,
    creator: { id: string; fullName: string; roleName: string; email: string }
  ): Promise<InternalConversation> {
    const all = await this.getAllConversations();

    // Ensure creator is in participantIds
    const participantIds = Array.from(new Set([creator.id, ...dto.participantIds]));

    // Resolve participant metadata from staff repository
    const allStaff = await staffRepository.getAll();
    const participants: ConversationParticipant[] = participantIds.map((pid) => {
      const s = allStaff.find((st) => st.id === pid);
      if (s) {
        return {
          userId: s.id,
          fullName: s.fullName,
          email: s.email,
          roleName: s.roleName,
          roleDisplayName: s.roleDisplayName,
          jobTitle: s.jobTitle,
          avatarUrl: s.avatarUrl,
        };
      }
      return {
        userId: pid,
        fullName: pid === creator.id ? creator.fullName : 'Staff Member',
        email: pid === creator.id ? creator.email : '',
        roleName: pid === creator.id ? creator.roleName : 'staff',
        roleDisplayName: 'Staff',
      };
    });

    const now = new Date().toISOString();
    const newId = `conv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

    const title =
      dto.title ||
      participants
        .filter((p) => p.userId !== creator.id)
        .map((p) => p.fullName)
        .join(', ') ||
      'Internal Discussion';

    const unreadCounts: Record<string, number> = {};
    participantIds.forEach((pid) => {
      unreadCounts[pid] = pid === creator.id ? 0 : dto.initialMessage ? 1 : 0;
    });

    const newConv: InternalConversation = {
      id: newId,
      title,
      type: dto.type,
      participantIds,
      participants,
      contextType: dto.contextType,
      contextId: dto.contextId,
      contextSummary: dto.contextSummary,
      unreadCounts,
      createdAt: now,
      updatedAt: now,
    };

    all.unshift(newConv);
    this.saveConversations(all);

    // If initial message provided, save it
    if (dto.initialMessage?.trim()) {
      await this.sendMessage(
        {
          conversationId: newId,
          content: dto.initialMessage.trim(),
        },
        creator
      );
    }

    return newConv;
  }

  async sendMessage(
    dto: SendMessageDTO,
    sender: { id: string; fullName: string; roleName: string }
  ): Promise<InternalMessage> {
    const conv = await this.getConversationById(dto.conversationId, sender.id, false);
    if (!conv) {
      throw new Error(`Conversation ${dto.conversationId} not found or access denied.`);
    }

    const now = new Date().toISOString();
    const newId = `msg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

    const newMessage: InternalMessage = {
      id: newId,
      conversationId: dto.conversationId,
      senderId: sender.id,
      senderName: sender.fullName,
      senderRole: sender.roleName,
      content: dto.content.trim(),
      attachments: dto.attachments,
      isRead: false,
      readBy: [{ userId: sender.id, readAt: now }],
      createdAt: now,
    };

    // Save message
    const allMessages = [...(this.memoryMessages || [])];
    allMessages.push(newMessage);
    this.saveMessages(allMessages);

    // Update conversation metadata and unread counts for other participants
    const allConvs = await this.getAllConversations();
    const index = allConvs.findIndex((c) => c.id === dto.conversationId);
    if (index !== -1) {
      const updatedCounts = { ...allConvs[index].unreadCounts };
      allConvs[index].participantIds.forEach((pid) => {
        if (pid !== sender.id) {
          updatedCounts[pid] = (updatedCounts[pid] || 0) + 1;
        }
      });

      allConvs[index] = {
        ...allConvs[index],
        lastMessage: {
          content: dto.content.trim(),
          senderId: sender.id,
          senderName: sender.fullName,
          createdAt: now,
        },
        unreadCounts: updatedCounts,
        updatedAt: now,
      };

      // Move updated conversation to top
      const target = allConvs.splice(index, 1)[0];
      allConvs.unshift(target);
      this.saveConversations(allConvs);
    }

    return newMessage;
  }

  async markConversationRead(conversationId: string, userId: string): Promise<boolean> {
    const allConvs = await this.getAllConversations();
    const index = allConvs.findIndex((c) => c.id === conversationId);
    if (index !== -1) {
      const currentUnread = allConvs[index].unreadCounts?.[userId] || 0;
      if (currentUnread > 0) {
        const updatedCounts = { ...allConvs[index].unreadCounts };
        updatedCounts[userId] = 0;
        allConvs[index].unreadCounts = updatedCounts;
        this.saveConversations(allConvs);
        return true;
      }
    }
    return false;
  }

  async markConversationAsRead(conversationId: string, userId: string): Promise<boolean> {
    return this.markConversationRead(conversationId, userId);
  }

  async getTotalUnreadCount(userId: string): Promise<number> {
    const userConvs = await this.getConversationsForUser(userId);
    return userConvs.reduce((total, conv) => total + (conv.unreadCounts[userId] || 0), 0);
  }

  async findContextualConversation(contextType: string, contextId: string): Promise<InternalConversation | null> {
    const all = await this.getAllConversations();
    return all.find((c) => c.contextType === contextType && c.contextId === contextId) || null;
  }

  async saveConversation(conv: InternalConversation): Promise<InternalConversation> {
    const all = await this.getAllConversations();
    const index = all.findIndex((c) => c.id === conv.id);
    if (index !== -1) {
      all[index] = conv;
    } else {
      all.unshift(conv);
    }
    this.saveConversations(all);
    return conv;
  }

  async searchMessages(query: string, userId: string, isSuperAdmin: boolean = false): Promise<InternalMessage[]> {
    if (!query.trim()) return [];
    const authorizedConvs = await this.getConversationsForUser(userId, isSuperAdmin);
    const authorizedConvIds = new Set(authorizedConvs.map((c) => c.id));

    const q = query.toLowerCase().trim();
    const msgs = (this.memoryMessages || []).filter(
      (m) => authorizedConvIds.has(m.conversationId) && m.content.toLowerCase().includes(q)
    );

    return msgs;
  }
}

export const messageRepository = new MessageRepository();
