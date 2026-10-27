/**
 * AI Conversation & Action Confirmation Repository
 * Module 19 — Admin AI Business Assistant
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Provides persistent storage for administrator AI conversations,
 * message threads, user-scoped RLS, and confirmation-based protected actions.
 */

import {
  AiConversation,
  AiMessage,
  AiActionConfirmation,
} from '../types/ai';
import { localStore } from '../lib/storage/localStorage';

const AI_CONVERSATIONS_STORAGE_KEY = 'xforce_ai_conversations_v1';
const AI_MESSAGES_STORAGE_KEY = 'xforce_ai_messages_v1';
const AI_ACTIONS_STORAGE_KEY = 'xforce_ai_actions_v1';

const INITIAL_CONVERSATION_SEED: AiConversation[] = [];

const INITIAL_MESSAGES_SEED: AiMessage[] = [];

export class AiConversationRepository {
  private memoryConversations: AiConversation[] | null = null;
  private memoryMessages: AiMessage[] | null = null;
  private memoryActions: AiActionConfirmation[] | null = null;

  constructor() {
    this.init();
  }

  private init() {
    const storedConvs = localStore.get<AiConversation[] | null>(AI_CONVERSATIONS_STORAGE_KEY, null);
    if (storedConvs && Array.isArray(storedConvs) && storedConvs.length > 0) {
      this.memoryConversations = storedConvs;
    } else {
      this.memoryConversations = [...INITIAL_CONVERSATION_SEED];
      localStore.set(AI_CONVERSATIONS_STORAGE_KEY, this.memoryConversations);
    }

    const storedMsgs = localStore.get<AiMessage[] | null>(AI_MESSAGES_STORAGE_KEY, null);
    if (storedMsgs && Array.isArray(storedMsgs) && storedMsgs.length > 0) {
      this.memoryMessages = storedMsgs;
    } else {
      this.memoryMessages = [...INITIAL_MESSAGES_SEED];
      localStore.set(AI_MESSAGES_STORAGE_KEY, this.memoryMessages);
    }

    const storedActions = localStore.get<AiActionConfirmation[] | null>(AI_ACTIONS_STORAGE_KEY, null);
    this.memoryActions = storedActions && Array.isArray(storedActions) ? storedActions : [];
  }

  private saveConversations(convs: AiConversation[]) {
    this.memoryConversations = convs;
    localStore.set(AI_CONVERSATIONS_STORAGE_KEY, convs);
  }

  private saveMessages(msgs: AiMessage[]) {
    this.memoryMessages = msgs;
    localStore.set(AI_MESSAGES_STORAGE_KEY, msgs);
  }

  private saveActions(actions: AiActionConfirmation[]) {
    this.memoryActions = actions;
    localStore.set(AI_ACTIONS_STORAGE_KEY, actions);
  }

  /**
   * User-scoped conversation retrieval
   */
  async getConversationsForUser(userId: string, isSuperAdmin: boolean = false): Promise<AiConversation[]> {
    if (!this.memoryConversations) this.init();
    const convs = this.memoryConversations || [];
    // User isolation RLS
    const filtered = convs.filter((c) => isSuperAdmin || c.userId === userId);
    return filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async getConversationById(id: string, userId: string, isSuperAdmin: boolean = false): Promise<AiConversation | null> {
    const convs = await this.getConversationsForUser(userId, isSuperAdmin);
    return convs.find((c) => c.id === id) || null;
  }

  async createConversation(userId: string, title?: string): Promise<AiConversation> {
    if (!this.memoryConversations) this.init();
    const now = new Date().toISOString();
    const newId = `ai-conv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const newConv: AiConversation = {
      id: newId,
      userId,
      title: title?.trim() || 'New Business Inquiry',
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    const updated = [newConv, ...(this.memoryConversations || [])];
    this.saveConversations(updated);
    return newConv;
  }

  async updateConversationTitle(id: string, title: string, userId: string): Promise<boolean> {
    if (!this.memoryConversations) this.init();
    const convs = [...(this.memoryConversations || [])];
    const index = convs.findIndex((c) => c.id === id && c.userId === userId);
    if (index === -1) return false;

    convs[index] = {
      ...convs[index],
      title: title.trim(),
      updatedAt: new Date().toISOString(),
    };
    this.saveConversations(convs);
    return true;
  }

  async deleteConversation(id: string, userId: string, isSuperAdmin: boolean = false): Promise<boolean> {
    if (!this.memoryConversations) this.init();
    const convs = [...(this.memoryConversations || [])];
    const target = convs.find((c) => c.id === id);
    if (!target) return false;
    if (!isSuperAdmin && target.userId !== userId) return false;

    const filtered = convs.filter((c) => c.id !== id);
    this.saveConversations(filtered);

    // Also remove associated messages
    const msgs = (this.memoryMessages || []).filter((m) => m.conversationId !== id);
    this.saveMessages(msgs);
    return true;
  }

  /**
   * Messages retrieval
   */
  async getMessages(conversationId: string, userId: string, isSuperAdmin: boolean = false): Promise<AiMessage[]> {
    // Validate permission to conversation first
    const conv = await this.getConversationById(conversationId, userId, isSuperAdmin);
    if (!conv) {
      return [];
    }

    if (!this.memoryMessages) this.init();
    const msgs = (this.memoryMessages || []).filter((m) => m.conversationId === conversationId);
    return msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async addMessage(msg: Omit<AiMessage, 'id' | 'createdAt'>): Promise<AiMessage> {
    if (!this.memoryMessages) this.init();
    const now = new Date().toISOString();
    const newId = `ai-msg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const newMsg: AiMessage = {
      ...msg,
      id: newId,
      createdAt: now,
    };

    const msgs = [...(this.memoryMessages || []), newMsg];
    this.saveMessages(msgs);

    // Update conversation metadata
    if (this.memoryConversations) {
      const convs = [...this.memoryConversations];
      const index = convs.findIndex((c) => c.id === msg.conversationId);
      if (index !== -1) {
        convs[index] = {
          ...convs[index],
          lastMessageSnippet: msg.content.substring(0, 100),
          messageCount: (convs[index].messageCount || 0) + 1,
          updatedAt: now,
        };
        // Auto-update title if it's the first user message and title was default
        if (convs[index].title === 'New Business Inquiry' && msg.role === 'user') {
          convs[index].title = msg.content.slice(0, 40) + (msg.content.length > 40 ? '...' : '');
        }
        this.saveConversations(convs);
      }
    }

    return newMsg;
  }

  async clearMessages(conversationId: string, userId: string): Promise<boolean> {
    const conv = await this.getConversationById(conversationId, userId);
    if (!conv) return false;

    const msgs = (this.memoryMessages || []).filter((m) => m.conversationId !== conversationId);
    this.saveMessages(msgs);

    if (this.memoryConversations) {
      const convs = [...this.memoryConversations];
      const index = convs.findIndex((c) => c.id === conversationId);
      if (index !== -1) {
        convs[index] = {
          ...convs[index],
          lastMessageSnippet: '',
          messageCount: 0,
          updatedAt: new Date().toISOString(),
        };
        this.saveConversations(convs);
      }
    }
    return true;
  }

  /**
   * Action confirmations
   */
  async createActionConfirmation(action: Omit<AiActionConfirmation, 'id' | 'requestedAt' | 'status'>): Promise<AiActionConfirmation> {
    if (!this.memoryActions) this.init();
    const now = new Date().toISOString();
    const newId = `ai-act-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const newAction: AiActionConfirmation = {
      ...action,
      id: newId,
      status: 'pending',
      requestedAt: now,
    };

    const actions = [...(this.memoryActions || []), newAction];
    this.saveActions(actions);
    return newAction;
  }

  async resolveActionConfirmation(id: string, status: 'confirmed' | 'rejected', userId: string): Promise<AiActionConfirmation | null> {
    if (!this.memoryActions) this.init();
    const actions = [...(this.memoryActions || [])];
    const index = actions.findIndex((a) => a.id === id);
    if (index === -1) return null;

    actions[index] = {
      ...actions[index],
      status,
      resolvedAt: new Date().toISOString(),
      resolvedByUserId: userId,
    };

    this.saveActions(actions);
    return actions[index];
  }
}

export const aiConversationRepository = new AiConversationRepository();
