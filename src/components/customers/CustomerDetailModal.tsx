/**
 * Customer Detailed Profile Modal
 * Module 08: Customer Management
 * XFORCE Construction Management & Customer Platform (Brand: X-FORCE BRICKS)
 */

import React, { useState } from 'react';
import {
  X,
  User,
  Building,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Shield,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  Compass,
  Link as LinkIcon,
  Unlink,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { customerService } from '../../services/customer.service';
import { buildWhatsAppInquiryUrl } from '../../utils/customerHelpers';
import {
  Customer,
  CUSTOMER_TYPE_LABELS,
  CUSTOMER_STATUS_CONFIG,
  ACCOUNT_STATUS_CONFIG,
} from '../../types/customer';

interface CustomerDetailModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onEdit: (customer: Customer) => void;
  onCustomerUpdated: (customer: Customer) => void;
  onCustomerDeleted?: (customerId: string) => void;
  currentStaffUserId?: string;
  canEdit?: boolean;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  isOpen,
  customer,
  onClose,
  onEdit,
  onCustomerUpdated,
  onCustomerDeleted,
  currentStaffUserId,
  canEdit = true,
}) => {
  const toast = useToast();
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Link Auth state
  const [isLinkingAuth, setIsLinkingAuth] = useState(false);
  const [newAuthUserId, setNewAuthUserId] = useState('');

  if (!isOpen || !customer) return null;

  const statusConfig = CUSTOMER_STATUS_CONFIG[customer.status];
  const accountConfig = ACCOUNT_STATUS_CONFIG[customer.accountStatus];

  const handleToggleStatus = async () => {
    setIsTogglingStatus(true);
    try {
      let updated: Customer;
      if (customer.status === 'active') {
        updated = await customerService.deactivateCustomer(
          customer.id,
          currentStaffUserId,
          'Deactivated by staff from customer details panel'
        );
        toast.info(`Customer ${customer.customerNumber} has been deactivated.`, 'Status Changed');
      } else {
        updated = await customerService.activateCustomer(customer.id, currentStaffUserId);
        toast.success(`Customer ${customer.customerNumber} has been activated.`, 'Status Changed');
      }
      onCustomerUpdated(updated);
    } catch (err: any) {
      toast.error(err.message || 'Could not update customer status.', 'Error');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const success = await customerService.deleteCustomer(
        customer.id,
        currentStaffUserId,
        'Permanent deletion authorized by staff'
      );
      if (success) {
        toast.success(`Customer ${customer.customerNumber} removed.`, 'Deleted');
        if (onCustomerDeleted) onCustomerDeleted(customer.id);
        onClose();
      } else {
        toast.error('Failed to delete customer record.', 'Deletion Failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Could not delete record.', 'Delete Error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLinkAuth = async () => {
    if (!newAuthUserId.trim()) {
      toast.warning('Please enter a valid Supabase Auth User ID.', 'Missing ID');
      return;
    }
    try {
      const updated = await customerService.linkAuthAccount(
        customer.id,
        newAuthUserId.trim(),
        currentStaffUserId
      );
      onCustomerUpdated(updated);
      setIsLinkingAuth(false);
      setNewAuthUserId('');
      toast.success('Auth user account successfully linked.', 'Linked');
    } catch (err: any) {
      toast.error(err.message || 'Failed to link auth account.', 'Linking Failed');
    }
  };

  const handleUnlinkAuth = async () => {
    if (!confirm('Are you sure you want to unlink the auth account from this customer record?')) {
      return;
    }
    try {
      const updated = await customerService.unlinkAuthAccount(customer.id, currentStaffUserId);
      onCustomerUpdated(updated);
      toast.info('Customer unlinked from login account.', 'Unlinked');
    } catch (err: any) {
      toast.error(err.message || 'Failed to unlink auth account.', 'Error');
    }
  };

  const whatsAppUrl = customer.whatsappNumber || customer.phone
    ? buildWhatsAppInquiryUrl(
        customer.whatsappNumber || customer.phone,
        `Hello ${customer.fullName}, contacting you from XFORCE CONSTRUCTION LTD.`
      )
    : '#';

  const mapsUrl = customer.gpsLatitude && customer.gpsLongitude
    ? `https://www.google.com/maps/search/?api=1&query=${customer.gpsLatitude},${customer.gpsLongitude}`
    : customer.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${customer.address}, ${customer.city || ''}, Nigeria`
      )}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto text-left space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-600 font-bold text-white text-lg shadow-md shadow-orange-600/20">
              {customer.fullName ? customer.fullName.charAt(0).toUpperCase() : 'C'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {customer.fullName}
                </h2>
                <span className="rounded-md bg-orange-100 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 px-2 py-0.5 text-xs font-mono font-semibold text-orange-700 dark:text-orange-300">
                  {customer.customerNumber}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {CUSTOMER_TYPE_LABELS[customer.customerType] || 'Client'}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusConfig?.badgeClass}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${statusConfig?.dotClass}`} />
                  {statusConfig?.label}
                </span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${accountConfig?.badgeClass}`}>
                  {accountConfig?.label}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Company info if present */}
        {customer.companyName && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3 flex items-center gap-2 text-xs">
            <Building className="h-4 w-4 text-orange-600" />
            <span className="text-slate-500">Company / Organization:</span>
            <strong className="text-slate-900 dark:text-white font-semibold">
              {customer.companyName}
            </strong>
          </div>
        )}

        {/* Contact Information Card */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-900">
          <h3 className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" />
            <span>Contact Channels</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 block text-[11px]">Primary Phone</span>
              <a
                href={`tel:${customer.phone}`}
                className="font-medium text-slate-800 dark:text-slate-100 hover:text-orange-600 dark:hover:text-orange-400 flex items-center gap-1"
              >
                {customer.phone}
              </a>
            </div>

            {customer.altPhone && (
              <div className="space-y-1">
                <span className="text-slate-400 block text-[11px]">Alternative Phone</span>
                <a
                  href={`tel:${customer.altPhone}`}
                  className="font-medium text-slate-800 dark:text-slate-100 hover:text-orange-600"
                >
                  {customer.altPhone}
                </a>
              </div>
            )}

            <div className="space-y-1">
              <span className="text-slate-400 block text-[11px]">Email Address</span>
              {customer.email ? (
                <a
                  href={`mailto:${customer.email}`}
                  className="font-medium text-slate-800 dark:text-slate-100 hover:text-orange-600 flex items-center gap-1"
                >
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  {customer.email}
                </a>
              ) : (
                <span className="text-slate-400 italic">No email provided</span>
              )}
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 block text-[11px]">WhatsApp</span>
              {customer.whatsappNumber || customer.phone ? (
                <a
                  href={whatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>Chat on WhatsApp</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-slate-400 italic">Not set</span>
              )}
            </div>
          </div>
        </div>

        {/* Delivery & Site Address Card */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              <span>Site Location & Address</span>
            </h3>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
              >
                <span>View on Map</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <div className="text-xs space-y-2">
            <p className="text-slate-700 dark:text-slate-300 font-medium">
              {customer.address || <span className="italic text-slate-400">No street address specified</span>}
            </p>
            <div className="flex items-center gap-3 text-slate-500 text-[11px] flex-wrap">
              <span>City: <strong>{customer.city || 'Not set'}</strong></span>
              <span>•</span>
              <span>State: <strong>{customer.state || 'Not set'}</strong></span>
              <span>•</span>
              <span>Country: <strong>{customer.country || 'Nigeria'}</strong></span>
            </div>

            {(customer.gpsLatitude !== null || customer.gpsLongitude !== null) && (
              <div className="rounded-md bg-slate-50 dark:bg-slate-800/40 p-2 text-[11px] font-mono text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <Compass className="h-3.5 w-3.5 text-orange-600" />
                <span>GPS: Lat {customer.gpsLatitude ?? '—'}, Lng {customer.gpsLongitude ?? '—'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Portal Account Link Status */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              <span>Customer Portal Account</span>
            </h3>
            {customer.userId ? (
              <button
                type="button"
                onClick={handleUnlinkAuth}
                className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1"
              >
                <Unlink className="h-3 w-3" />
                <span>Unlink Auth Account</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsLinkingAuth(!isLinkingAuth)}
                className="text-[11px] text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1"
              >
                <LinkIcon className="h-3 w-3" />
                <span>Link Auth ID</span>
              </button>
            )}
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
            {customer.userId ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-sky-500" />
                <span>Bound to Supabase Auth User ID:</span>
                <code className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                  {customer.userId}
                </code>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-500">
                <AlertCircle className="h-4 w-4 text-slate-400" />
                <span>Record only — customer has not registered for self-service portal access.</span>
              </div>
            )}

            {isLinkingAuth && (
              <div className="pt-2 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Paste Supabase Auth User UUID..."
                  value={newAuthUserId}
                  onChange={(e) => setNewAuthUserId(e.target.value)}
                  className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs"
                />
                <Button size="sm" variant="primary" onClick={handleLinkAuth}>
                  Save Link
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Staff-Only Internal Notes Card */}
        {customer.notes && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 p-4 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              <span>Internal Staff Notes (Confidential)</span>
            </h3>
            <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
              {customer.notes}
            </p>
          </div>
        )}

        {/* Audit Metadata */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span>Registered via: <strong className="capitalize">{customer.registrationSource}</strong></span>
          </div>
          <div>
            Created: {new Date(customer.createdAt).toLocaleDateString()} • Updated: {new Date(customer.updatedAt).toLocaleDateString()}
          </div>
        </div>

        {/* Delete Confirmation Warning */}
        {showDeleteConfirm && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40 p-4 space-y-2">
            <div className="text-xs font-bold text-rose-800 dark:text-rose-300">
              Confirm Permanent Deletion
            </div>
            <p className="text-xs text-rose-700 dark:text-rose-400">
              Are you sure you want to permanently delete customer {customer.customerNumber}?
              Prefer deactivating the record to preserve audit integrity if quotes or orders are linked.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="outline"
                isLoading={isDeleting}
                onClick={handleDelete}
                className="border-rose-300 bg-rose-600 text-white hover:bg-rose-700"
              >
                Yes, Delete Record
              </Button>
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800 flex-wrap gap-2">
          <div>
            {canEdit && !showDeleteConfirm && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Record</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  isLoading={isTogglingStatus}
                  onClick={handleToggleStatus}
                  className="text-xs"
                >
                  {customer.status === 'active' ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  leftIcon={<Edit2 className="h-3.5 w-3.5" />}
                  onClick={() => {
                    onClose();
                    onEdit(customer);
                  }}
                  className="text-xs"
                >
                  Edit Profile
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost" onClick={onClose} className="text-xs">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
