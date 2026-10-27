/**
 * Internal Web Messaging Panel
 * Module 18 — Communication & Notifications
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Real-time staff-to-staff messaging hub with conversation threads,
 * contextual business record linking, attachments, and unread badges.
 * Strictly inaccessible to external customers.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  MessageSquare,
  Users,
  User,
  Plus,
  Search,
  Send,
  Paperclip,
  Check,
  CheckCheck,
  ArrowLeft,
  ExternalLink,
  Link,
  ShoppingCart,
  Wrench,
  Package,
  CreditCard,
  FileSpreadsheet,
  FileQuestion,
  FileText,
  Clock,
  MoreVertical,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { messageService } from '../../services/message.service';
import {
  InternalConversation,
  InternalMessage,
  MessageAttachment,
  RelatedEntityType,
} from '../../types/communication';
import { NewConversationModal } from './NewConversationModal';

interface InternalMessagingPanelProps {
  onNavigateToModule?: (module: string) => void;
  initialConversationId?: string | null;
}

export const InternalMessagingPanel: React.FC<InternalMessagingPanelProps> = ({
  onNavigateToModule,
  initialConversationId,
}) => {
  const toast = useToast();
  const { profile, role, isAdministrator } = useAuth();
  const currentUserId = profile?.id || 'u0000000-0000-0000-0000-000000000001';

  const [conversations, setConversations] = useState<InternalConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(initialConversationId || null);
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'contextual'>('all');
  const [isNewConvModalOpen, setIsNewConvModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<MessageAttachment[]>([]);

  // Mobile navigation state
  const [showMobileChat, setShowMobileChat] = useState<boolean>(!!initialConversationId);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const selectedConvIdRef = useRef<string | null>(selectedConvId);
  useEffect(() => {
    selectedConvIdRef.current = selectedConvId;
  }, [selectedConvId]);

  const loadConversations = useCallback(async (selectFirstIfNone = false) => {
    try {
      const data = await messageService.getConversationsForUser(currentUserId, isAdministrator());
      setConversations(data);
      if (selectFirstIfNone) {
        setSelectedConvId((prev) => {
          if (!prev && data.length > 0) {
            return data[0].id;
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, [currentUserId, isAdministrator]);

  const loadMessages = useCallback(
    async (convId: string, markRead = true) => {
      if (!convId) return;
      try {
        const msgs = await messageService.getMessages(convId, currentUserId, isAdministrator());
        setMessages(msgs);
        if (markRead) {
          await messageService.markConversationAsRead(convId, currentUserId);
        }
      } catch (err) {
        console.error('Failed to load messages for conversation:', err);
      }
    },
    [currentUserId, isAdministrator]
  );

  // Sync initial conversation from props if provided or changed
  useEffect(() => {
    if (initialConversationId) {
      setSelectedConvId(initialConversationId);
      setShowMobileChat(true);
    }
  }, [initialConversationId]);

  // Initial load of conversations
  useEffect(() => {
    loadConversations(true);
  }, [loadConversations]);

  // Subscription for real-time message changes
  useEffect(() => {
    const unsubscribe = messageService.subscribe(() => {
      // Refresh conversation list (e.g. for updated previews, badges)
      loadConversations(false);

      // Refresh current conversation thread without triggering markRead or re-notification loop
      const currentSelected = selectedConvIdRef.current;
      if (currentSelected) {
        messageService.getMessages(currentSelected, currentUserId, isAdministrator())
          .then((msgs) => setMessages(msgs))
          .catch((err) => console.error('Failed to refresh messages on push:', err));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadConversations, currentUserId, isAdministrator]);

  // When selected conversation changes, load messages and mark as read
  useEffect(() => {
    if (selectedConvId) {
      loadMessages(selectedConvId, true);
    } else {
      setMessages([]);
    }
  }, [selectedConvId, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedConvId) || null;
  }, [conversations, selectedConvId]);

  const handleSelectConversation = (convId: string) => {
    setSelectedConvId(convId);
    setShowMobileChat(true);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && attachedFiles.length === 0) || !selectedConvId || isSending) return;

    setIsSending(true);
    try {
      await messageService.sendMessage(
        {
          conversationId: selectedConvId,
          content: inputText.trim(),
          attachments: attachedFiles.length > 0 ? attachedFiles : undefined,
        },
        {
          id: currentUserId,
          name: profile?.full_name || 'Staff Member',
          role: role?.name || 'staff',
        }
      );

      setInputText('');
      setAttachedFiles([]);
      await loadMessages(selectedConvId);
      await loadConversations();
    } catch (err: any) {
      toast.showToast(err?.message || 'Failed to send message', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleAddSampleAttachment = () => {
    const sampleAttachment: MessageAttachment = {
      id: `att-${Date.now().toString(36)}`,
      name: `Site_Inspection_Checklist_${Math.floor(100 + Math.random() * 900)}.pdf`,
      url: '#',
      fileType: 'application/pdf',
      fileSize: 248000,
    };
    setAttachedFiles((prev) => [...prev, sampleAttachment]);
    toast.showToast('Attached Site_Inspection_Checklist.pdf', 'info');
  };

  const formatMessageTime = (isoString: string): string => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatRelativeTime = (isoString: string): string => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d`;
  };

  const getContextIcon = (type?: RelatedEntityType) => {
    switch (type) {
      case 'order':
        return <ShoppingCart className="h-3 w-3 text-emerald-500" />;
      case 'installation':
        return <Wrench className="h-3 w-3 text-blue-500" />;
      case 'warehouse_task':
        return <Package className="h-3 w-3 text-indigo-500" />;
      case 'expense':
        return <CreditCard className="h-3 w-3 text-amber-500" />;
      case 'quotation':
        return <FileSpreadsheet className="h-3 w-3 text-purple-500" />;
      case 'request':
        return <FileQuestion className="h-3 w-3 text-cyan-500" />;
      default:
        return <Link className="h-3 w-3 text-slate-400" />;
    }
  };

  // Filtered conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = c.title?.toLowerCase().includes(q);
        const matchesSummary = c.contextSummary?.toLowerCase().includes(q);
        const matchesParticipant = c.participants?.some((p) => p.fullName.toLowerCase().includes(q));
        const matchesLast = c.lastMessage?.content.toLowerCase().includes(q);
        if (!matchesTitle && !matchesSummary && !matchesParticipant && !matchesLast) {
          return false;
        }
      }

      if (filterType === 'unread') {
        return (c.unreadCounts[currentUserId] || 0) > 0;
      }
      if (filterType === 'contextual') {
        return !!c.contextType && !!c.contextId;
      }

      return true;
    });
  }, [conversations, searchQuery, filterType, currentUserId]);

  const totalUnreadAll = conversations.reduce(
    (total, conv) => total + (conv.unreadCounts[currentUserId] || 0),
    0
  );

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-7xl mx-auto p-2 sm:p-4 text-left">
      {/* Top Banner / Heading */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              Internal Team Messaging
            </h1>
            <Badge variant="default" size="sm">
              Module 18
            </Badge>
            {totalUnreadAll > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
                {totalUnreadAll} unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Encrypted staff-to-staff coordination threads, shift handovers, and linked operational records.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsNewConvModalOpen(true)}
          className="text-xs shrink-0"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          New Chat
        </Button>
      </div>

      {/* Main Two-Column Box */}
      <div className="flex-1 flex overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        {/* Left Column: Conversation Directory */}
        <div
          className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 ${
            showMobileChat ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search & Filter Bar */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff, orders, or chats..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'unread', label: `Unread (${totalUnreadAll})` },
                { id: 'contextual', label: 'Linked Records' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterType(f.id as any)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                    filterType === f.id
                      ? 'bg-amber-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                <MessageSquare className="h-6 w-6 mx-auto mb-2 opacity-30" />
                <p>No conversations found</p>
                <button
                  type="button"
                  onClick={() => setIsNewConvModalOpen(true)}
                  className="mt-2 text-amber-600 hover:underline font-semibold"
                >
                  Start a new discussion
                </button>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = c.id === selectedConvId;
                const unread = c.unreadCounts[currentUserId] || 0;
                const otherParticipants = c.participants?.filter((p) => p.userId !== currentUserId);
                const displayTitle =
                  c.title || otherParticipants?.map((p) => p.fullName).join(', ') || 'Internal Chat';

                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectConversation(c.id)}
                    className={`flex items-start gap-3 p-3 cursor-pointer transition ${
                      isSelected
                        ? 'bg-amber-50/70 dark:bg-amber-950/40 border-l-4 border-amber-600'
                        : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0 mt-0.5">
                      {c.type === 'group' ? (
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                          <Users className="h-4 w-4" />
                        </div>
                      ) : (
                        <Avatar
                          name={otherParticipants?.[0]?.fullName || 'Staff'}
                          size="md"
                        />
                      )}
                    </div>

                    {/* Meta & Preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs truncate ${unread > 0 ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-800 dark:text-slate-200'}`}>
                          {displayTitle}
                        </p>
                        {c.lastMessage && (
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {formatRelativeTime(c.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>

                      {/* Context badge if linked */}
                      {c.contextType && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate">
                          {getContextIcon(c.contextType)}
                          <span className="truncate">{c.contextSummary || c.contextId}</span>
                        </div>
                      )}

                      {/* Last message preview */}
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {c.lastMessage
                          ? `${c.lastMessage.senderId === currentUserId ? 'You: ' : ''}${c.lastMessage.content}`
                          : 'No messages yet'}
                      </p>
                    </div>

                    {/* Unread badge */}
                    {unread > 0 && (
                      <span className="flex h-4 min-w-[1rem] px-1 items-center justify-center rounded-full bg-amber-600 text-[9px] font-bold text-white shrink-0 mt-1">
                        {unread}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Feed & Composer */}
        <div
          className={`flex-1 flex flex-col bg-white dark:bg-slate-900 ${
            showMobileChat ? 'flex' : 'hidden md:flex'
          }`}
        >
          {activeConversation ? (
            <>
              {/* Active Conversation Top Bar */}
              <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => setShowMobileChat(false)}
                    className="p-1 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 md:hidden"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {activeConversation.title ||
                          activeConversation.participants
                            ?.filter((p) => p.userId !== currentUserId)
                            .map((p) => p.fullName)
                            .join(', ') ||
                          'Internal Discussion'}
                      </h3>
                      {activeConversation.type === 'group' && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {activeConversation.participants?.length} Staff
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate">
                      {activeConversation.participants
                        ?.map((p) => `${p.fullName} (${p.roleDisplayName})`)
                        .join(', ')}
                    </p>
                  </div>
                </div>

                {/* Context link shortcut */}
                {activeConversation.contextType && activeConversation.contextId && (
                  <div className="shrink-0 flex items-center gap-1.5">
                    <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-[10px] font-semibold text-amber-800 dark:text-amber-200">
                      {getContextIcon(activeConversation.contextType)}
                      <span>{activeConversation.contextSummary || activeConversation.contextId}</span>
                    </div>

                    {onNavigateToModule && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const mod =
                            activeConversation.contextType === 'order'
                              ? 'orders'
                              : activeConversation.contextType === 'installation'
                              ? 'installations'
                              : activeConversation.contextType === 'warehouse_task'
                              ? 'warehouse'
                              : activeConversation.contextType === 'expense'
                              ? 'expenses'
                              : 'dashboard';
                          onNavigateToModule(mod);
                        }}
                        className="text-[11px] py-1 px-2"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        <span>View Record</span>
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/20 dark:bg-slate-900/40">
                {/* Context Banner */}
                {activeConversation.contextType && (
                  <div className="p-2.5 rounded-lg border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getContextIcon(activeConversation.contextType)}
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Operational Reference: {activeConversation.contextSummary || activeConversation.contextId}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono uppercase text-slate-400">
                      {activeConversation.contextType}
                    </span>
                  </div>
                )}

                {messages.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No messages yet in this conversation.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Send a message below to start coordinating.</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isCurrentUser = m.senderId === currentUserId;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}
                      >
                        {/* Sender info if group */}
                        {!isCurrentUser && (
                          <div className="flex items-center gap-1.5 mb-1 px-1">
                            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                              {m.senderName}
                            </span>
                            <span className="text-[9px] uppercase px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold font-mono">
                              {m.senderRole}
                            </span>
                          </div>
                        )}

                        {/* Bubble */}
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 shadow-sm text-xs leading-relaxed ${
                            isCurrentUser
                              ? 'bg-amber-600 text-white rounded-tr-none'
                              : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 rounded-tl-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.content}</p>

                          {/* Attachments */}
                          {m.attachments && m.attachments.length > 0 && (
                            <div className="mt-2 space-y-1 pt-2 border-t border-white/20 dark:border-slate-700">
                              {m.attachments.map((att) => (
                                <div
                                  key={att.id}
                                  className={`flex items-center gap-2 p-1.5 rounded text-[11px] font-medium ${
                                    isCurrentUser ? 'bg-amber-700/60 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white'
                                  }`}
                                >
                                  <FileText className="h-3.5 w-3.5 shrink-0 opacity-80" />
                                  <span className="truncate flex-1">{att.name}</span>
                                  <span className="text-[9px] opacity-75 shrink-0">
                                    {Math.round(att.fileSize / 1024)} KB
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div
                            className={`flex items-center justify-end gap-1 mt-1 text-[9px] ${
                              isCurrentUser ? 'text-amber-100' : 'text-slate-400'
                            }`}
                          >
                            <span>{formatMessageTime(m.createdAt)}</span>
                            {isCurrentUser && (
                              <CheckCheck className="h-3 w-3 stroke-[2.5]" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Attached Files Staging */}
              {attachedFiles.length > 0 && (
                <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center gap-2 flex-wrap">
                  {attachedFiles.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 px-2 py-1 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[11px]"
                    >
                      <FileText className="h-3.5 w-3.5 text-amber-500" />
                      <span className="truncate max-w-[12rem]">{att.name}</span>
                      <button
                        type="button"
                        onClick={() => setAttachedFiles((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-500 ml-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Message Composer */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0"
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddSampleAttachment}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="Attach specification, voucher, or document"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type an internal message (Press Enter to send)..."
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />

                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    disabled={(!inputText.trim() && attachedFiles.length === 0) || isSending}
                    className="shrink-0"
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    <span>Send</span>
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <MessageSquare className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Select a conversation
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Choose a conversation thread from the left sidebar or start a new team discussion.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsNewConvModalOpen(true)}
                className="mt-4 text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Start New Thread
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      {isNewConvModalOpen && (
        <NewConversationModal
          isOpen={isNewConvModalOpen}
          onClose={() => setIsNewConvModalOpen(false)}
          onConversationCreated={(id) => {
            setSelectedConvId(id);
            setShowMobileChat(true);
            loadConversations();
          }}
        />
      )}
    </div>
  );
};
