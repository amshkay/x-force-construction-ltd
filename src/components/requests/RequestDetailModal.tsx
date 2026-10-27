/**
 * Customer Request Detail Modal
 * Module 09 — Customer Requests & Quotation Management
 * XFORCE Construction Ltd / X-FORCE BRICKS
 */

import React, { useState } from 'react';
import {
  X,
  FileText,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Send,
  MessageSquare,
  Shield,
  Layers,
  Image as ImageIcon,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { useToast } from '../ui/Toast';
import {
  CustomerRequest,
  RequestStatus,
  REQUEST_TYPE_LABELS,
  REQUEST_STATUS_CONFIG,
} from '../../types/request';
import { requestService } from '../../services/request.service';

interface RequestDetailModalProps {
  request: CustomerRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated?: (updated: CustomerRequest) => void;
  onCreateQuotation?: (request: CustomerRequest) => void;
  currentStaffName?: string;
}

export const RequestDetailModal: React.FC<RequestDetailModalProps> = ({
  request,
  isOpen,
  onClose,
  onStatusUpdated,
  onCreateQuotation,
  currentStaffName = 'Staff Engineer',
}) => {
  const toast = useToast();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<RequestStatus>(
    request?.status || 'submitted'
  );
  const [statusNote, setStatusNote] = useState('');
  const [newInternalNote, setNewInternalNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Sync internal state when request changes
  React.useEffect(() => {
    if (request) {
      setSelectedStatus(request.status);
      setStatusNote('');
      setNewInternalNote('');
    }
  }, [request]);

  if (!isOpen || !request) return null;

  const statusConfig = REQUEST_STATUS_CONFIG[request.status];

  const handleUpdateStatus = async () => {
    if (selectedStatus === request.status && !statusNote.trim()) {
      toast.info('No status changes were selected.');
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const updated = await requestService.updateStatus(
        request.id,
        selectedStatus,
        statusNote.trim() || undefined
      );
      toast.success(
        `Request #${request.requestNumber} status updated to ${REQUEST_STATUS_CONFIG[selectedStatus].label}.`,
        'Status Changed'
      );
      setStatusNote('');
      onStatusUpdated?.(updated);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddInternalNote = async () => {
    if (!newInternalNote.trim()) {
      toast.warning('Please enter note text.');
      return;
    }

    setIsAddingNote(true);
    try {
      const updated = await requestService.addInternalNote(
        request.id,
        newInternalNote.trim(),
        currentStaffName
      );
      toast.success('Internal engineering note logged.', 'Note Added');
      setNewInternalNote('');
      onStatusUpdated?.(updated);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add internal note.');
    } finally {
      setIsAddingNote(false);
    }
  };

  const googleMapsUrl =
    request.gpsLatitude && request.gpsLongitude
      ? `https://www.google.com/maps?q=${request.gpsLatitude},${request.gpsLongitude}`
      : request.projectAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${request.projectAddress}, ${request.projectCity || ''} ${request.projectState || ''}`
        )}`
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Request #{request.requestNumber}
              </h2>
              <Badge variant={statusConfig.badgeVariant}>{statusConfig.label}</Badge>
              <Badge variant="default" className="text-xs">
                {REQUEST_TYPE_LABELS[request.requestType]}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              Received on {new Date(request.createdAt).toLocaleString()}
              {request.desiredTimeline && (
                <span>• Desired Timeline: <strong className="text-slate-700 dark:text-slate-300">{request.desiredTimeline}</strong></span>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
          {/* Customer & Location Details (Left 1 col) */}
          <div className="space-y-4 md:col-span-1">
            {/* Customer Box */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <User className="h-4 w-4 text-orange-600" />
                Customer Contact
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {request.customerName}
                </p>
                {request.companyName && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {request.companyName}
                  </p>
                )}
              </div>
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <a
                    href={`tel:${request.customerPhone}`}
                    className="hover:text-orange-600 font-mono"
                  >
                    {request.customerPhone}
                  </a>
                </div>
                {request.customerEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <a
                      href={`mailto:${request.customerEmail}`}
                      className="hover:text-orange-600 break-all"
                    >
                      {request.customerEmail}
                    </a>
                  </div>
                )}
                <div className="text-[11px] text-slate-500 mt-2">
                  Preferred Contact: <strong className="uppercase">{request.preferredContactMethod || 'phone'}</strong>
                </div>
              </div>
            </div>

            {/* Project Site Location */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <MapPin className="h-4 w-4 text-orange-600" />
                Project Site Location
              </div>
              <p className="text-xs text-slate-800 dark:text-slate-200">
                {request.projectAddress || 'Site address not provided'}
              </p>
              {(request.projectCity || request.projectState) && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {request.projectCity}, {request.projectState}
                </p>
              )}
              {googleMapsUrl && (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View on Google Maps
                </a>
              )}
            </div>

            {/* Quotation Status banner if prepared */}
            {request.quotationNumber && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/40 p-4 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                  <FileSpreadsheet className="h-4 w-4" />
                  Quotation #{request.quotationNumber}
                </div>
                <p className="text-emerald-700 dark:text-emerald-400">
                  Official quotation prepared for this request.
                </p>
              </div>
            )}
          </div>

          {/* Requested Items & Media Attachments (Right 2 cols) */}
          <div className="space-y-4 md:col-span-2">
            {/* Customer Comments */}
            {request.customerComments && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-amber-50/40 dark:bg-amber-950/20">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 block mb-1">
                  Customer Comments & Site Remarks
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {request.customerComments}
                </p>
              </div>
            )}

            {/* Items Table */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="bg-slate-100 dark:bg-slate-800/80 px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-orange-600" />
                  Requested Materials & Bill of Quantities ({request.items.length})
                </span>
              </div>

              {request.items.length === 0 ? (
                <div className="p-4 text-xs text-slate-500 text-center">
                  No discrete product items listed. General project inquiry.
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {request.items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {item.itemName}
                        </p>
                        {item.itemCategory && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Category: {item.itemCategory}
                          </span>
                        )}
                        {item.customerNotes && (
                          <p className="text-[11px] text-slate-500 italic mt-0.5">
                            Note: {item.customerNotes}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="inline-block rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-1 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {item.quantity.toLocaleString()} {item.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Attachments / Site Photos */}
            {request.attachments && request.attachments.length > 0 && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-orange-600" />
                  Uploaded Site Drawings / Architectural Photos ({request.attachments.length})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {request.attachments.map((att, i) => (
                    <a
                      key={att.id || i}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative block aspect-video overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:ring-2 hover:ring-orange-500"
                    >
                      <img
                        src={att.url}
                        alt={att.name || 'Site photo'}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition text-xs font-medium">
                        View
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Internal Staff Notes Log */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-slate-50/30 dark:bg-slate-800/20">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-slate-600" />
                Staff Internal Engineering Notes (Private)
              </span>

              {request.internalNotes ? (
                <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-line max-h-40 overflow-y-auto">
                  {request.internalNotes}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No internal staff notes recorded yet.</p>
              )}

              {/* Add Note Input */}
              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Add private engineering note..."
                  value={newInternalNote}
                  onChange={(e) => setNewInternalNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddInternalNote();
                    }
                  }}
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddInternalNote}
                  disabled={isAddingNote || !newInternalNote.trim()}
                >
                  Save Note
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions: Status Transition & Prepare Quotation */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 dark:border-slate-800 pt-4">
          {/* Status Updater */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Update Status:
            </span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as RequestStatus)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="awaiting_customer_info">Awaiting Customer Info</option>
              <option value="quotation_prepared">Quotation Prepared</option>
              <option value="quotation_sent">Quotation Sent</option>
              <option value="customer_reviewing">Customer Reviewing</option>
              <option value="accepted">Customer Accepted</option>
              <option value="declined">Declined</option>
              <option value="closed">Closed / Archived</option>
            </select>
            <Button
              size="sm"
              variant="outline"
              onClick={handleUpdateStatus}
              disabled={isUpdatingStatus || selectedStatus === request.status}
            >
              {isUpdatingStatus ? 'Saving...' : 'Apply Status'}
            </Button>
          </div>

          {/* Prepare Quotation Button */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => onCreateQuotation?.(request)}
              className="flex items-center gap-1.5"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Prepare Quotation</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
