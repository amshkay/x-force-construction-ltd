/**
 * Executive AI Business Assistant Panel
 * Module 19 — Admin AI Business Assistant
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Dedicated business intelligence chat workspace with real-time operational grounding,
 * data source transparency, protected action proposal cards, and diagnostic controls.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  Cpu,
  RefreshCw,
  Database,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { PERMISSION_CODES } from '../../types/auth';
import {
  AiMessage,
  AiConversation,
  AiProviderConfig,
  AI_SUGGESTED_PROMPTS,
} from '../../types/ai';
import { aiAssistantService } from '../../services/ai/aiAssistant.service';
import { ActionConfirmationCard } from './ActionConfirmationCard';
import { AiProviderDiagnosticsModal } from './AiProviderDiagnosticsModal';

interface AiAssistantPanelProps {
  onNavigateToModule?: (moduleId: string) => void;
}

export const AiAssistantPanel: React.FC<AiAssistantPanelProps> = ({
  onNavigateToModule,
}) => {
  const toast = useToast();
  const { profile, role, hasPermission, isAdministrator } = useAuth();

  const currentUserId = profile?.id || 'u0000000-0000-0000-0000-000000000001';
  const currentUserName = profile?.full_name || 'Administrator';
  const canUseAssistant = isAdministrator() || hasPermission(PERMISSION_CODES.AI_ASSISTANT_USE);

  const [providerConfig, setProviderConfig] = useState<AiProviderConfig>(
    aiAssistantService.getProviderConfig()
  );
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<AiConversation | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize conversations
  useEffect(() => {
    loadConversations();
    setProviderConfig(aiAssistantService.getProviderConfig());
  }, [currentUserId]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const loadConversations = async () => {
    try {
      const list = await aiAssistantService.getConversations(currentUserId, isAdministrator());
      setConversations(list);
      if (list.length > 0) {
        selectConversation(list[0]);
      } else {
        await handleNewConversation();
      }
    } catch (err: any) {
      console.error('Failed to load AI conversations:', err);
    }
  };

  const selectConversation = async (conv: AiConversation) => {
    setActiveConversation(conv);
    try {
      const msgs = await aiAssistantService.getMessages(conv.id, currentUserId, isAdministrator());
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to fetch messages for conversation:', err);
    }
  };

  const handleNewConversation = async () => {
    try {
      const newConv = await aiAssistantService.createNewConversation(
        currentUserId,
        `Executive Session ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      );
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversation(newConv);
      setMessages([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err: any) {
      toast.showToast('Could not start new conversation.', 'error');
    }
  };

  const handleClearMessages = async () => {
    if (!activeConversation) return;
    try {
      await aiAssistantService.clearConversation(activeConversation.id, currentUserId);
      setMessages([]);
      toast.showToast('Conversation cleared.', 'info');
    } catch (err: any) {
      toast.showToast('Failed to clear conversation.', 'error');
    }
  };

  const handleSendMessage = async (promptToSend?: string) => {
    const text = (promptToSend || inputText).trim();
    if (!text || isProcessing) return;

    if (!activeConversation) {
      await handleNewConversation();
    }
    const convId = activeConversation?.id;
    if (!convId) return;

    setInputText('');
    setIsProcessing(true);

    try {
      const result = await aiAssistantService.sendMessage({
        conversationId: convId,
        prompt: text,
        context: {
          userId: currentUserId,
          userRole: role?.name || 'administrator',
          hasPermission: (p) => isAdministrator() || hasPermission(p as any),
        },
      });

      setMessages((prev) => [...prev, result.userMessage, result.assistantMessage]);
      setProviderConfig(aiAssistantService.getProviderConfig());
    } catch (err: any) {
      toast.showToast(err?.message || 'Error processing inquiry', 'error');
    } finally {
      setIsProcessing(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const toggleSources = (msgId: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  if (!canUseAssistant) {
    return (
      <div className="p-8 text-center max-w-xl mx-auto space-y-4">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Administrator Access Required
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          The Executive AI Business Assistant requires explicit management clearance (<code>ai_assistant.use</code>)
          to inspect business records, yard stock, and financial transactions.
        </p>
        <Button onClick={() => onNavigateToModule?.('dashboard')}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4.5rem)] flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Header */}
      <div className="px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                Executive AI Business Assistant
              </h1>
              <Badge
                variant={providerConfig.isApiKeyPresent ? 'success' : 'warning'}
                size="sm"
                className="cursor-pointer"
                onClick={() => setIsDiagnosticsOpen(true)}
              >
                <Cpu className="h-3 w-3 mr-1" />
                {providerConfig.modelName}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Grounding operational queries across orders, yard inventory, cash flow & field installations.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDiagnosticsOpen(true)}
            className="text-xs text-slate-600 dark:text-slate-300"
          >
            <Cpu className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
            Diagnostics & Tools
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleClearMessages}
            disabled={messages.length === 0}
            className="text-xs"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1 text-slate-400" />
            Clear
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleNewConversation}
            className="text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            New Session
          </Button>
        </div>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-6 py-2.5 bg-slate-100/70 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 shrink-0 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
            Suggested Queries:
          </span>
          {AI_SUGGESTED_PROMPTS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isProcessing}
              onClick={() => handleSendMessage(item.prompt)}
              className="px-2.5 py-1 text-xs rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-amber-400 dark:hover:border-amber-500 hover:text-amber-700 dark:hover:text-amber-400 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                [{item.category}]
              </span>
              <span>{item.prompt}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Messages Stream */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Sparkles className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                How can I assist XFORCE management today?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Ask about pending client orders, low interlocking brick stock, supplier statuses,
                cash flow inflows, or field paving installation milestones.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 text-left">
              {AI_SUGGESTED_PROMPTS.slice(0, 4).map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSendMessage(p.prompt)}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-400 dark:hover:border-amber-500 transition-all text-xs text-slate-700 dark:text-slate-300 shadow-2xs group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-[10px] uppercase text-amber-600 dark:text-amber-400">
                      {p.category}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-amber-500 transition" />
                  </div>
                  <span>{p.prompt}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-4xl mx-auto ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {/* Assistant Avatar */}
              {!isUser && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 to-amber-600 text-white shadow-xs">
                  <Sparkles className="h-4 w-4" />
                </div>
              )}

              {/* Message Bubble Container */}
              <div
                className={`flex flex-col space-y-1.5 max-w-[85%] ${
                  isUser ? 'items-end' : 'items-start'
                }`}
              >
                <div className="flex items-center gap-2 text-[10px] text-slate-400 px-1">
                  <span className="font-semibold">
                    {isUser ? currentUserName : 'XFORCE AI Assistant'}
                  </span>
                  <span>•</span>
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed shadow-xs ${
                    isUser
                      ? 'bg-amber-600 text-white rounded-tr-xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-xs'
                  }`}
                >
                  {/* Message Content */}
                  <div className="space-y-2 whitespace-pre-wrap font-sans">
                    {msg.content}
                  </div>

                  {/* Action Confirmation Card (Protected actions proposed by model) */}
                  {msg.actionProposal && (
                    <div className="pt-2">
                      <ActionConfirmationCard
                        action={msg.actionProposal}
                        onActionResolved={() => {
                          loadConversations();
                        }}
                      />
                    </div>
                  )}

                  {/* Data Source Transparency Footnote */}
                  {msg.dataSources && msg.dataSources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                      <button
                        type="button"
                        onClick={() => toggleSources(msg.id)}
                        className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 font-mono text-[10px] uppercase cursor-pointer"
                      >
                        <Database className="h-3 w-3" />
                        <span>
                          Consulted {msg.dataSources.length} Business Record Source(s)
                        </span>
                        {expandedSources[msg.id] ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>

                      {expandedSources[msg.id] && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {msg.dataSources.map((src, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-mono border border-slate-200 dark:border-slate-700"
                            >
                              {src.name} {src.count !== undefined ? `(${src.count} records)` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Assistant message utility bar */}
                {!isUser && (
                  <div className="flex items-center gap-2 px-1 text-[11px] text-slate-400">
                    <button
                      type="button"
                      onClick={() => handleCopyText(msg.id, msg.content)}
                      className="hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedMessageId === msg.id ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-500" />
                          <span className="text-[10px] text-emerald-500">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span className="text-[10px]">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* User Avatar */}
              {isUser && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs">
                  {currentUserName.charAt(0)}
                </div>
              )}
            </div>
          );
        })}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex gap-3 max-w-4xl mx-auto justify-start">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-500 to-amber-600 text-white animate-pulse">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 rounded-tl-xs flex items-center gap-2 shadow-xs">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-500" />
              <span>Analyzing business databases & synthesizing operational report...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <div className="max-w-4xl mx-auto space-y-2">
          <div className="relative flex items-end gap-2 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus-within:border-amber-500 dark:focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
              placeholder="Ask an operational question (e.g. 'What stock is currently low?', 'Show pending orders', 'What requires management attention?')..."
              rows={2}
              className="flex-1 max-h-32 resize-none bg-transparent p-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
            />

            <Button
              variant="primary"
              size="sm"
              disabled={!inputText.trim() || isProcessing}
              onClick={() => handleSendMessage()}
              className="shrink-0 h-9 w-9 p-0 rounded-xl"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>Strict Read-Only Mode • Prompt Injection Guard Active</span>
            </div>
            <span>Press Enter to send, Shift+Enter for new line</span>
          </div>
        </div>
      </div>

      {/* Diagnostics Modal */}
      <AiProviderDiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        config={providerConfig}
      />
    </div>
  );
};
