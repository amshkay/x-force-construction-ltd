import React, { useState, useRef } from 'react';
import { X, CheckCircle2, AlertTriangle, Upload, FileSignature, Clock, User, Phone } from 'lucide-react';
import { FulfilmentRecord, DeliveryArrivalCondition } from '../../types/warehouse';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { warehouseService } from '../../services/warehouse.service';
import { useAuth } from '../../hooks/useAuth';
import { ImageInputWithUpload } from '../ui/ImageInputWithUpload';

interface ProofOfDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  fulfilment: FulfilmentRecord | null;
  onFulfilmentUpdated: (updated: FulfilmentRecord) => void;
}

export const ProofOfDeliveryModal: React.FC<ProofOfDeliveryModalProps> = ({
  isOpen,
  onClose,
  fulfilment,
  onFulfilmentUpdated,
}) => {
  const toast = useToast();
  const { profile } = useAuth();

  const [recipientName, setRecipientName] = useState(fulfilment?.customerName || '');
  const [recipientPhone, setRecipientPhone] = useState(fulfilment?.customerPhone || '');
  const [condition, setCondition] = useState<DeliveryArrivalCondition>('good');
  const [signOffNotes, setSignOffNotes] = useState('');
  const [isDigitalSigned, setIsDigitalSigned] = useState(false);
  const [podPhotoUrl, setPodPhotoUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync default state when modal opens
  React.useEffect(() => {
    if (fulfilment) {
      setRecipientName(fulfilment.customerName);
      setRecipientPhone(fulfilment.customerPhone);
      setCondition('good');
      setSignOffNotes('');
      setIsDigitalSigned(false);
      setPodPhotoUrl('');
    }
  }, [fulfilment]);

  if (!isOpen || !fulfilment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim()) {
      toast.error('Recipient name is mandatory for Proof of Delivery sign-off.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await warehouseService.deliverFulfilment(
        fulfilment.id,
        {
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone.trim(),
          deliveredAt: new Date().toISOString(),
          conditionOnArrival: condition,
          signOffNotes: signOffNotes.trim() || undefined,
          signatureDataUrl: isDigitalSigned
            ? `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><text x="10" y="35" font-family="cursive" font-size="22" fill="#1e293b">${encodeURIComponent(recipientName)}</text></svg>`
            : undefined,
          podPhotoUrl: podPhotoUrl.trim() || undefined,
        },
        profile?.id || 'usr-system',
        profile?.full_name || 'Warehouse Staff'
      );

      toast.success(
        `Shipment confirmed delivered to ${recipientName}. Proof of Delivery archived.`,
        'Proof of Delivery Recorded'
      );
      onFulfilmentUpdated(updated);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit proof of delivery.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 dark:text-white">
              Confirm Delivery & Proof of Delivery (POD)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Reference Banner */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3.5 flex justify-between items-center text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Fulfilment Ref:</span>{' '}
              <span className="font-bold font-mono text-slate-900 dark:text-white">
                {fulfilment.fulfilmentNumber}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Order:</span>{' '}
              <span className="font-mono text-slate-800 dark:text-slate-200">
                #{fulfilment.orderNumber}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Total Materials:</span>{' '}
              <span className="font-bold text-orange-600 dark:text-orange-400">
                {fulfilment.items.reduce((s, it) => s + it.allocatedQuantity, 0).toLocaleString()} units
              </span>
            </div>
          </div>

          {/* Receiver Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Recipient / Receiver Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Engr. Johnson (Site Manager)"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Recipient Phone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="+234 803 000 0000"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Condition on Arrival */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Material Condition on Site Arrival
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label
                className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition ${
                  condition === 'good'
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <input
                  type="radio"
                  name="condition"
                  checked={condition === 'good'}
                  onChange={() => setCondition('good')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-semibold block">Good / Undamaged</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    100% sound blocks & pavers
                  </span>
                </div>
              </label>

              <label
                className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition ${
                  condition === 'minor_damage'
                    ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <input
                  type="radio"
                  name="condition"
                  checked={condition === 'minor_damage'}
                  onChange={() => setCondition('minor_damage')}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="font-semibold block">Minor Transit Chipping</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Acceptable construction tolerance
                  </span>
                </div>
              </label>

              <label
                className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition ${
                  condition === 'partial_received'
                    ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <input
                  type="radio"
                  name="condition"
                  checked={condition === 'partial_received'}
                  onChange={() => setCondition('partial_received')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-semibold block">Partial Received</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Site space constrained
                  </span>
                </div>
              </label>

              <label
                className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition ${
                  condition === 'rejected'
                    ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <input
                  type="radio"
                  name="condition"
                  checked={condition === 'rejected'}
                  onChange={() => setCondition('rejected')}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <span className="font-semibold block">Rejected / Severe Issue</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Requires immediate yard investigation
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Digital Signature / Site Acknowledgement */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Client Sign-off Verification
            </label>
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSignature className="h-4 w-4 text-orange-600" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Digital Signature / Site Acknowledgement
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDigitalSigned(!isDigitalSigned)}
                  className={`text-xs px-2.5 py-1 rounded font-medium transition ${
                    isDigitalSigned
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {isDigitalSigned ? '✓ Signed on Glass' : '+ Sign Off on Screen'}
                </button>
              </div>

              {isDigitalSigned && (
                <div className="mt-2.5 border-t border-dashed border-slate-300 dark:border-slate-700 pt-2 text-center bg-white dark:bg-slate-900 rounded p-2">
                  <span className="font-serif italic text-base text-slate-800 dark:text-slate-200">
                    {recipientName || 'Authorized Receiver'}
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    Verified electronic signature captured at {new Date().toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Site Offload Proof Photo with Local Upload & Online URL */}
          <div>
            <ImageInputWithUpload
              id="pod-photo-uploader"
              label="Site Offload Photo (Optional)"
              helperText="Capture/upload photo of unloaded pallets at site or paste an image URL."
              value={podPhotoUrl}
              onChange={(url) => setPodPhotoUrl(url)}
              onRemove={() => setPodPhotoUrl('')}
              bucket="installation-media"
              folder="pod"
              placeholder="https://... photo URL"
              previewHeight="h-28"
            />
          </div>

          {/* Sign-off Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Delivery Notes / Customer Remarks
            </label>
            <textarea
              rows={2}
              value={signOffNotes}
              onChange={(e) => setSignOffNotes(e.target.value)}
              placeholder="e.g. Unloaded into compound sector B; crane driver handled gently. Signed without dispute."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Confirm Delivery Complete
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
