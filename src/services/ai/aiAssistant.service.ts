/**
 * Admin AI Business Assistant Service
 * Module 19 — Admin AI Business Assistant
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Coordinates conversation workflows, user prompt submission,
 * protected action execution, and conversation history auditing.
 */

import {
  AiConversation,
  AiMessage,
  AiActionConfirmation,
  AiProviderConfig,
} from '../../types/ai';
import { aiConversationRepository } from '../../repositories/aiConversation.repository';
import { aiProviderManager, AiServiceResponse } from './aiProvider';
import { installationService } from '../installation.service';
import { expenseService } from '../expense.service';
import { auditService } from '../audit.service';
import { ToolExecutionContext } from './aiToolRegistry';

class AiAssistantService {
  /**
   * Get provider configuration
   */
  getProviderConfig(): AiProviderConfig {
    return aiProviderManager.getProviderConfig();
  }

  /**
   * List conversations for current user
   */
  async getConversations(userId: string, isSuperAdmin: boolean = false): Promise<AiConversation[]> {
    return aiConversationRepository.getConversationsForUser(userId, isSuperAdmin);
  }

  /**
   * Get messages for conversation
   */
  async getMessages(conversationId: string, userId: string, isSuperAdmin: boolean = false): Promise<AiMessage[]> {
    return aiConversationRepository.getMessages(conversationId, userId, isSuperAdmin);
  }

  /**
   * Create a new chat session
   */
  async createNewConversation(userId: string, title?: string): Promise<AiConversation> {
    return aiConversationRepository.createConversation(userId, title);
  }

  /**
   * Delete a chat session
   */
  async deleteConversation(conversationId: string, userId: string, isSuperAdmin: boolean = false): Promise<boolean> {
    return aiConversationRepository.deleteConversation(conversationId, userId, isSuperAdmin);
  }

  /**
   * Clear all messages in conversation
   */
  async clearConversation(conversationId: string, userId: string): Promise<boolean> {
    return aiConversationRepository.clearMessages(conversationId, userId);
  }

  /**
   * Post message and stream/generate response
   */
  async sendMessage(params: {
    conversationId: string;
    prompt: string;
    context: ToolExecutionContext;
  }): Promise<{ userMessage: AiMessage; assistantMessage: AiMessage }> {
    const { conversationId, prompt, context } = params;

    // 1. Record user message
    const userMessage = await aiConversationRepository.addMessage({
      conversationId,
      role: 'user',
      content: prompt.trim(),
    });

    // 2. Fetch history for context
    const history = await aiConversationRepository.getMessages(conversationId, context.userId);

    // 3. Process with AI Provider
    let serviceResponse: AiServiceResponse;
    try {
      serviceResponse = await aiProviderManager.processUserQuery(prompt, history, context);
    } catch (err: any) {
      serviceResponse = {
        content: `I encountered an unexpected error querying business data: ${err?.message || 'Provider unavailable'}. Please verify your parameters or try again.`,
        providerUsed: 'Error Fallback',
      };
    }

    // 4. If an action was proposed, persist it
    let actionProposal: AiActionConfirmation | undefined = undefined;
    if (serviceResponse.proposedAction) {
      actionProposal = await aiConversationRepository.createActionConfirmation(serviceResponse.proposedAction);
    }

    // 5. Record assistant response message
    const assistantMessage = await aiConversationRepository.addMessage({
      conversationId,
      role: 'assistant',
      content: serviceResponse.content,
      dataSources: serviceResponse.dataSources,
      actionProposal,
    });

    return { userMessage, assistantMessage };
  }

  /**
   * Execute a user-confirmed protected action
   */
  async confirmAction(
    actionId: string,
    userId: string,
    userName: string
  ): Promise<{ success: boolean; message: string }> {
    const resolved = await aiConversationRepository.resolveActionConfirmation(actionId, 'confirmed', userId);
    if (!resolved) {
      throw new Error(`Action confirmation "${actionId}" not found.`);
    }

    try {
      if (resolved.actionType === 'complete_service') {
        const serviceId = resolved.targetEntityId;
        const notes = resolved.payload?.notes || 'Marked completed via AI Assistant confirmation';
        await installationService.updateJobStatus(
          serviceId,
          'completed',
          userId,
          userName,
          notes
        );
        await auditService.logBusinessAction({
          action: 'SERVICE_COMPLETED',
          entityType: 'installation',
          entityId: serviceId,
          actor: { id: userId, name: userName },
          reason: notes,
          source: 'AI Assistant',
          metadata: { actionConfirmationId: actionId, actionType: resolved.actionType },
        });
        return {
          success: true,
          message: `Service Job #${serviceId} successfully marked as Completed.`,
        };
      }

      if (resolved.actionType === 'approve_expense') {
        const expenseId = resolved.targetEntityId;
        const notes = resolved.payload?.notes || 'Approved via AI Assistant confirmation';
        await expenseService.approveOrRejectExpense(
          expenseId,
          { approved: true, rejectionReason: undefined },
          { id: userId, fullName: userName }
        );
        await auditService.logBusinessAction({
          action: 'APPROVE',
          entityType: 'expense',
          entityId: expenseId,
          actor: { id: userId, name: userName },
          reason: notes,
          source: 'AI Assistant',
          metadata: { actionConfirmationId: actionId, actionType: resolved.actionType },
        });
        return {
          success: true,
          message: `Expense #${expenseId} approved and authorized for disbursement.`,
        };
      }

      return { success: true, message: 'Action processed.' };
    } catch (err: any) {
      // Revert status on failure
      await aiConversationRepository.resolveActionConfirmation(actionId, 'rejected', userId);
      throw new Error(`Failed executing action: ${err?.message || 'Service failure'}`);
    }
  }

  /**
   * Cancel/reject a proposed action
   */
  async rejectAction(actionId: string, userId: string): Promise<boolean> {
    const res = await aiConversationRepository.resolveActionConfirmation(actionId, 'rejected', userId);
    return !!res;
  }
}

export const aiAssistantService = new AiAssistantService();
