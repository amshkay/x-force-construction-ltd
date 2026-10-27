/**
 * Internal Messaging Service
 * Module 18 — Communication & Notifications
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Dedicated business logic layer for internal team communication,
 * contextual chat threads, attachments, and real-time subscription.
 * Strictly inaccessible to external customers.
 */

import {
  InternalConversation,
  InternalMessage,
  CreateConversationDTO,
  SendMessageDTO,
  RelatedEntityType,
} from '../types/communication';
import { messageRepository } from '../repositories/message.repository';
import { notificationService } from './notification.service';

type MessageListener = () => void;

class MessageService {
  private listeners: Set<MessageListener> = new Set();

  subscribe(listener: MessageListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in message listener:', err);
      }
    });
  }

  /**
   * Get all conversations accessible to the user
   */
  async getConversationsForUser(userId: string, isSuperAdmin: boolean = false): Promise<InternalConversation[]> {
    return messageRepository.getConversationsForUser(userId, isSuperAdmin);
  }

  /**
   * Get single conversation by ID
   */
  async getConversationById(conversationId: string, userId: string = '', isSuperAdmin: boolean = true): Promise<InternalConversation | null> {
    return messageRepository.getConversationById(conversationId, userId, isSuperAdmin);
  }

  /**
   * Get all messages for a specific conversation
   */
  async getMessages(conversationId: string, userId: string = '', isSuperAdmin: boolean = true): Promise<InternalMessage[]> {
    return messageRepository.getMessages(conversationId, userId, isSuperAdmin);
  }

  /**
   * Create a new conversation
   */
  async createConversation(
    dto: CreateConversationDTO,
    creator: { id: string; name: string; role: string; email?: string }
  ): Promise<InternalConversation> {
    const conv = await messageRepository.createConversation(dto, {
      id: creator.id,
      fullName: creator.name,
      roleName: creator.role,
      email: creator.email || '',
    });
    this.notify();

    // Notify other participants of the new conversation
    const otherParticipants = conv.participantIds.filter((id) => id !== creator.id);
    for (const participantId of otherParticipants) {
      await notificationService.dispatchNotification({
        recipientType: 'staff',
        recipientId: participantId,
        type: 'INTERNAL_MESSAGE',
        title: `New Message from ${creator.name}`,
        message: conv.title ? `${conv.title}: ${dto.initialMessage || 'Started a conversation'}` : (dto.initialMessage || 'Started a conversation'),
        priority: 'normal',
        relatedEntityType: 'conversation',
        relatedEntityId: conv.id,
        routeModule: 'communication',
      });
    }

    return conv;
  }

  /**
   * Send a message in an existing conversation
   */
  async sendMessage(
    dto: SendMessageDTO,
    sender: { id: string; name: string; role: string }
  ): Promise<InternalMessage> {
    const msg = await messageRepository.sendMessage(dto, {
      id: sender.id,
      fullName: sender.name,
      roleName: sender.role,
    });
    this.notify();

    // Notify other participants
    const conv = await messageRepository.getConversationById(dto.conversationId, sender.id, true);
    if (conv) {
      const otherParticipants = conv.participantIds.filter((id) => id !== sender.id);
      for (const participantId of otherParticipants) {
        await notificationService.dispatchNotification({
          recipientType: 'staff',
          recipientId: participantId,
          type: 'INTERNAL_MESSAGE',
          title: `Message from ${sender.name}`,
          message: conv.title ? `[${conv.title}] ${msg.content}` : msg.content,
          priority: 'normal',
          relatedEntityType: 'conversation',
          relatedEntityId: conv.id,
          routeModule: 'communication',
        });
      }
    }

    return msg;
  }

  /**
   * Mark all messages in a conversation as read by the user
   */
  async markConversationAsRead(conversationId: string, userId: string): Promise<boolean> {
    const success = await messageRepository.markConversationAsRead(conversationId, userId);
    if (success) {
      this.notify();
    }
    return success;
  }

  /**
   * Get unread message count for a user across all conversations
   */
  async getTotalUnreadCount(userId: string): Promise<number> {
    return messageRepository.getTotalUnreadCount(userId);
  }

  /**
   * Find or create a contextual conversation linked to an order, service job, warehouse task, etc.
   */
  async findOrCreateContextualConversation(params: {
    contextType: RelatedEntityType;
    contextId: string;
    contextSummary: string;
    creator: { id: string; name: string; role: string; email?: string };
    participantIds: string[];
    initialMessage?: string;
  }): Promise<InternalConversation> {
    const existing = await messageRepository.findContextualConversation(params.contextType, params.contextId);
    if (existing) {
      // Ensure current user is in participants
      if (!existing.participantIds.includes(params.creator.id)) {
        existing.participantIds.push(params.creator.id);
        const conv = await messageRepository.saveConversation(existing);
        this.notify();
        return conv;
      }
      return existing;
    }

    // Create new
    return this.createConversation(
      {
        title: `${params.contextType.toUpperCase()}: ${params.contextSummary}`,
        type: params.participantIds.length > 2 ? 'group' : 'direct',
        participantIds: Array.from(new Set([...params.participantIds, params.creator.id])),
        contextType: params.contextType,
        contextId: params.contextId,
        contextSummary: params.contextSummary,
        initialMessage: params.initialMessage,
      },
      params.creator
    );
  }
}

export const messageService = new MessageService();
