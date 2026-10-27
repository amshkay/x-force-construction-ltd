/**
 * Contextual Chat Button
 * Module 18 — Communication & Notifications
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Reusable action button to open or initialize a linked internal discussion
 * thread directly from an Order, Service Job, Expense, or Warehouse Task.
 */

import React, { useState } from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { messageService } from '../../services/message.service';
import { RelatedEntityType } from '../../types/communication';

interface ContextualChatButtonProps {
  contextType: RelatedEntityType;
  contextId: string;
  contextSummary: string;
  participantIds?: string[];
  initialMessage?: string;
  onOpenChat: (conversationId: string) => void;
  className?: string;
  variant?: 'outline' | 'primary' | 'secondary';
  size?: 'sm' | 'md';
}

export const ContextualChatButton: React.FC<ContextualChatButtonProps> = ({
  contextType,
  contextId,
  contextSummary,
  participantIds = [],
  initialMessage,
  onOpenChat,
  className = '',
  variant = 'outline',
  size = 'sm',
}) => {
  const { profile, role } = useAuth();
  const currentUserId = profile?.id || 'u0000000-0000-0000-0000-000000000001';
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const conv = await messageService.findOrCreateContextualConversation({
        contextType,
        contextId,
        contextSummary,
        creator: {
          id: currentUserId,
          name: profile?.full_name || 'Staff Member',
          role: role?.name || 'staff',
          email: profile?.email || '',
        },
        participantIds,
        initialMessage,
      });

      onOpenChat(conv.id);
    } catch (err) {
      console.error('Failed to open contextual chat:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={loading}
      className={`text-xs ${className}`}
      title="Discuss this record with internal team"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
      ) : (
        <MessageSquare className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
      )}
      <span>Internal Chat</span>
    </Button>
  );
};
