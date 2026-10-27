/**
 * New Conversation Modal
 * Module 18 — Communication & Notifications
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Modal to initiate direct or group internal discussions between staff members
 * with optional operational context linking (Orders, Service Jobs, Warehouse, Expenses).
 */

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Users,
  User,
  Link,
  Send,
  Check,
  Search,
  ShoppingCart,
  Wrench,
  Package,
  CreditCard,
  FileSpreadsheet,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { messageService } from '../../services/message.service';
import { staffRepository } from '../../repositories/staff.repository';
import { StaffMember } from '../../types/staff';
import { RelatedEntityType } from '../../types/communication';

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated: (conversationId: string) => void;
  defaultContextType?: RelatedEntityType;
  defaultContextId?: string;
  defaultContextSummary?: string;
}

export const NewConversationModal: React.FC<NewConversationModalProps> = ({
  isOpen,
  onClose,
  onConversationCreated,
  defaultContextType,
  defaultContextId,
  defaultContextSummary,
}) => {
  const toast = useToast();
  const { profile, role } = useAuth();
  const currentUserId = profile?.id || 'u0000000-0000-0000-0000-000000000001';

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [conversationTitle, setConversationTitle] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Operational Context
  const [hasContext, setHasContext] = useState<boolean>(!!defaultContextType);
  const [contextType, setContextType] = useState<RelatedEntityType>(defaultContextType || 'order');
  const [contextId, setContextId] = useState<string>(defaultContextId || '');
  const [contextSummary, setContextSummary] = useState<string>(defaultContextSummary || '');

  useEffect(() => {
    const loadStaff = async () => {
      try {
        const all = await staffRepository.getAll();
        // Filter out current user from selection list
        setStaffList(all.filter((s) => s.id !== currentUserId && s.accountStatus === 'active'));
      } catch (err) {
        console.error('Failed to load staff list:', err);
      }
    };
    loadStaff();
  }, [currentUserId]);

  const toggleStaffSelection = (staffId: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId]
    );
  };

  const filteredStaff = staffList.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.roleDisplayName.toLowerCase().includes(q) ||
      s.department.toLowerCase().includes(q)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStaffIds.length === 0) {
      toast.showToast('Please select at least one staff member.', 'warning');
      return;
    }
    if (!initialMessage.trim()) {
      toast.showToast('Please write an opening message.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const type = selectedStaffIds.length > 1 ? 'group' : 'direct';
      const conv = await messageService.createConversation(
        {
          title: conversationTitle.trim() || undefined,
          type,
          participantIds: selectedStaffIds,
          initialMessage: initialMessage.trim(),
          contextType: hasContext ? contextType : undefined,
          contextId: hasContext && contextId ? contextId : undefined,
          contextSummary: hasContext && contextSummary ? contextSummary : undefined,
        },
        {
          id: currentUserId,
          name: profile?.full_name || 'Staff Member',
          role: role?.name || 'staff',
          email: profile?.email || '',
        }
      );

      toast.showToast('Internal conversation started', 'success');
      onConversationCreated(conv.id);
      onClose();
    } catch (err: any) {
      toast.showToast(err?.message || 'Failed to start conversation', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Start Internal Team Conversation"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Direct, encrypted internal communication between authorized X-FORCE employees. Inaccessible to clients.
        </p>

        {/* Participant Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Select Participants ({selectedStaffIds.length} selected)
          </label>

          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff by name, department, role..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
            {filteredStaff.length === 0 ? (
              <p className="p-3 text-center text-xs text-slate-400">No staff members found.</p>
            ) : (
              filteredStaff.map((staff) => {
                const isSelected = selectedStaffIds.includes(staff.id);
                return (
                  <div
                    key={staff.id}
                    onClick={() => toggleStaffSelection(staff.id)}
                    className={`flex items-center justify-between p-2.5 cursor-pointer transition ${
                      isSelected
                        ? 'bg-amber-50/70 dark:bg-amber-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar name={staff.fullName} size="sm" />
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-white">
                          {staff.fullName}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {staff.jobTitle || staff.roleDisplayName} • {staff.department}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`h-4 w-4 rounded border flex items-center justify-center transition ${
                        isSelected
                          ? 'border-amber-600 bg-amber-600 text-white'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Group Title (Optional if >1 participant) */}
        {selectedStaffIds.length > 1 && (
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Group Conversation Subject
            </label>
            <Input
              value={conversationTitle}
              onChange={(e) => setConversationTitle(e.target.value)}
              placeholder="e.g. Lekki Phase 1 Project Alignment, Friday Dispatch Meeting"
            />
          </div>
        )}

        {/* Operational Context Linker */}
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                Link to Business Record
              </span>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={hasContext}
                onChange={(e) => setHasContext(e.target.checked)}
                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <span>Enable Linking</span>
            </label>
          </div>

          {hasContext && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/60">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Entity Category
                </label>
                <select
                  value={contextType}
                  onChange={(e) => setContextType(e.target.value as RelatedEntityType)}
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 text-slate-800 dark:text-white"
                >
                  <option value="order">Commercial Order</option>
                  <option value="installation">Installation Site Job</option>
                  <option value="warehouse_task">Warehouse Dispatch Task</option>
                  <option value="expense">Operating Expense</option>
                  <option value="quotation">Quotation / Estimations</option>
                  <option value="request">Customer Request</option>
                  <option value="supplier">Material Supplier</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Reference ID or Number
                </label>
                <input
                  type="text"
                  value={contextId}
                  onChange={(e) => setContextId(e.target.value)}
                  placeholder="e.g. XFO-2026-0001, EXP-2026-0008"
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 text-slate-800 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                  Context Summary / Description
                </label>
                <input
                  type="text"
                  value={contextSummary}
                  onChange={(e) => setContextSummary(e.target.value)}
                  placeholder="e.g. Chief Okonkwo 5,000 Terracotta Pavers"
                  className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 text-slate-800 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Initial Opening Message */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Opening Message
          </label>
          <textarea
            required
            rows={3}
            value={initialMessage}
            onChange={(e) => setInitialMessage(e.target.value)}
            placeholder="Type your message to start the thread..."
            className="w-full p-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {isSubmitting ? 'Starting...' : 'Send & Start Chat'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
