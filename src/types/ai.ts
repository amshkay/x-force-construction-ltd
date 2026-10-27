/**
 * Admin AI Business Assistant Types
 * Module 19 — Admin AI Business Assistant
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Controlled domain schemas for business intelligence queries, tool calling parameters,
 * confirmation-based action proposals, and conversation persistence.
 */

export type AiMessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface AiDataSourceTransparency {
  name: string;
  count?: number;
  period?: string;
  sourceModule?: string;
}

export interface AiToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface AiToolResult {
  toolCallId: string;
  name: string;
  result: any;
  error?: string;
}

export interface AiActionConfirmation {
  id: string;
  actionType: 'complete_service' | 'approve_expense' | 'acknowledge_alert';
  title: string;
  description: string;
  targetEntityId: string;
  targetEntityType: 'installation' | 'expense' | 'system';
  payload?: Record<string, any>;
  status: 'pending' | 'confirmed' | 'rejected';
  requestedAt: string;
  resolvedAt?: string;
  resolvedByUserId?: string;
}

export interface AiMessage {
  id: string;
  conversationId: string;
  role: AiMessageRole;
  content: string;
  toolCalls?: AiToolCall[];
  toolResults?: AiToolResult[];
  actionProposal?: AiActionConfirmation;
  dataSources?: AiDataSourceTransparency[];
  createdAt: string;
}

export interface AiConversation {
  id: string;
  userId: string;
  title: string;
  lastMessageSnippet?: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AiProviderConfig {
  providerName: 'gemini' | 'simulated';
  modelName: string;
  isConfigured: boolean;
  isApiKeyPresent: boolean;
  statusMessage: string;
  supportedToolsCount: number;
}

export interface AiSuggestedPrompt {
  category: 'Operations' | 'Finance' | 'Inventory' | 'Sales' | 'Management';
  prompt: string;
  badge?: string;
}

export const AI_SUGGESTED_PROMPTS: AiSuggestedPrompt[] = [
  {
    category: 'Management',
    prompt: 'What requires immediate management attention today?',
    badge: 'Urgent',
  },
  {
    category: 'Operations',
    prompt: 'Give me a summary of recent business activity across all departments.',
    badge: 'Overview',
  },
  {
    category: 'Inventory',
    prompt: 'Which interlocking brick variants and raw materials are low in stock?',
    badge: 'Yard Stock',
  },
  {
    category: 'Sales',
    prompt: 'Show me pending customer orders awaiting picking or dispatch.',
    badge: 'Fulfillment',
  },
  {
    category: 'Finance',
    prompt: 'What operating expenses were recorded this month and are any pending approval?',
    badge: 'Cash Flow',
  },
  {
    category: 'Operations',
    prompt: 'Which site installation paving jobs are currently incomplete or scheduled?',
    badge: 'Field Sites',
  },
  {
    category: 'Sales',
    prompt: 'Which customer requests are still awaiting quotation creation?',
    badge: 'Estimations',
  },
];
