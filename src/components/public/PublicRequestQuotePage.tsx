import React, { useState } from 'react';
import {
  FileText,
  Send,
  Sparkles,
  CheckCircle2,
  Copy,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  Building,
  Package,
  Wrench,
  Ruler,
} from 'lucide-react';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { CustomerMediaUploader } from './CustomerMediaUploader';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';
import { publicDataService } from '../../services/publicData.service';
import { requestService } from '../../services/request.service';
import { localStore } from '../../lib/storage/localStorage';
import { CustomerQuoteRequest } from '../../types/public';
import { RequestType } from '../../types/request';
import { buildWhatsAppInquiryUrl } from '../../utils/customerHelpers';
import { openWhatsAppChat } from '../../utils/whatsapp';
import { useToast } from '../ui/Toast';

export interface PublicRequestQuotePageProps {
  onBackHome?: () => void;
  onNavigateToTrack?: (reference: string) => void;
  onViewTrack?: () => void;
  preselectedProduct?: string;
  preselectedCategory?: string;
}

export const PublicRequestQuotePage: React.FC<PublicRequestQuotePageProps> = ({
  onBackHome,
  onNavigateToTrack,
  onViewTrack,
  preselectedProduct = '',
  preselectedCategory = '',
}) => {
  const { publicSettings } = useBusinessSettings();
  const toast = useToast();

  const [requestType, setRequestType] = useState<'material_only' | 'installation_only' | 'turnkey' | 'site_assessment'>(
    'material_only'
  );
  const [materialCategory, setMaterialCategory] = useState(preselectedCategory || 'Interlocking Facing Bricks');
  const [selectedProduct, setSelectedProduct] = useState(preselectedProduct);
  const [estimatedQuantity, setEstimatedQuantity] = useState('');
  const [projectAddress, setProjectAddress] = useState('');
  const [projectCity, setProjectCity] = useState('Lagos');
  const [projectState, setProjectState] = useState('Lagos State');
  const [desiredTimeline, setDesiredTimeline] = useState('Within 2 weeks');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [siteNotes, setSiteNotes] = useState('');
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState<CustomerQuoteRequest | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() || !customerPhone.trim()) {
      toast.warning('Please provide your name and phone/WhatsApp number.', 'Contact Required');
      return;
    }

    if (!projectAddress.trim()) {
      toast.warning('Please enter the project or delivery site address.', 'Location Required');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Map request type to authoritative request service format
      let mappedType: RequestType = 'product_only';
      if (requestType === 'installation_only') mappedType = 'service_only';
      else if (requestType === 'turnkey') mappedType = 'product_and_service';
      else if (requestType === 'site_assessment') mappedType = 'site_inspection';

      // 2. Check if customer has active portal session
      const session = localStore.get<any>('xforce_customer_session', null);
      const customerId = session?.customerId || session?.id || undefined;

      // 3. Prepare items
      const requestedItems = [];
      if (selectedProduct || materialCategory) {
        const qty = parseInt(estimatedQuantity.replace(/\D/g, ''), 10) || 1000;
        requestedItems.push({
          itemName: selectedProduct || materialCategory,
          itemCategory: materialCategory,
          quantity: qty,
          unit: 'piece',
          customerNotes: siteNotes || undefined,
        });
      }

      // 4. Save into authoritative requestService
      const domainRequest = await requestService.submitRequest({
        customerId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        companyName: companyName.trim() || undefined,
        projectAddress: projectAddress.trim(),
        projectCity: projectCity.trim(),
        projectState: projectState.trim(),
        desiredTimeline,
        requestType: mappedType,
        customerComments: siteNotes.trim() || undefined,
        items: requestedItems,
        attachments: attachmentUrls.map((url, i) => ({
          id: crypto.randomUUID(),
          name: `Site Attachment ${i + 1}`,
          url,
          fileType: 'image/jpeg',
          sizeBytes: 0,
        })),
      });

      // 5. Also keep in public tracking queue with identical reference number
      const created = await publicDataService.submitQuoteRequest(
        {
          requestType,
          materialCategory,
          selectedProduct: selectedProduct || undefined,
          estimatedQuantity: estimatedQuantity || undefined,
          projectAddress,
          projectCity,
          projectState,
          desiredTimeline,
          customerName,
          customerPhone,
          customerEmail: customerEmail || undefined,
          companyName: companyName || undefined,
          siteNotes: siteNotes || undefined,
          attachmentUrls,
        },
        'XFR'
      );

      // Align reference number with authoritative generated requestNumber
      created.referenceNumber = domainRequest.requestNumber;
      setSubmittedRequest(created);

      toast.success(
        `Quotation request #${domainRequest.requestNumber} logged successfully.`,
        'Request Captured'
      );
    } catch (err: any) {
      toast.error('Failed to submit request. Please verify connection.', 'Submission Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyReference = () => {
    if (!submittedRequest) return;
    navigator.clipboard?.writeText(submittedRequest.referenceNumber);
    toast.success('Reference code copied to clipboard.', 'Copied');
  };

  const handleWhatsAppDirect = () => {
    if (!submittedRequest) return;
    const msg = `Hello ${publicSettings.publicBrandName}, I just submitted a quotation request #${submittedRequest.referenceNumber} for ${submittedRequest.materialCategory || 'building materials'} at ${submittedRequest.projectAddress}, ${submittedRequest.projectCity}. Please confirm receipt.`;
    openWhatsAppChat(publicSettings.whatsappNumber, msg);
  };

  // Success Confirmation Screen
  if (submittedRequest) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 text-left space-y-8" id="quote-request-success">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 sm:p-8 dark:border-emerald-900/60 dark:bg-emerald-950/20 text-center space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/80 dark:text-emerald-300 mx-auto">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Request Received Successfully
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              Thank You, {submittedRequest.customerName}!
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto mt-2">
              Your inquiry has been registered with {publicSettings.publicBrandName}. Our sales engineering team will evaluate your material quantities and site logistics.
            </p>
          </div>

          {/* Reference Badge */}
          <div className="inline-flex items-center gap-3 rounded-xl bg-white dark:bg-slate-900 p-3 border border-emerald-300 dark:border-emerald-800 shadow-sm">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Tracking Reference</p>
              <p className="text-lg sm:text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {submittedRequest.referenceNumber}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyReference}
              className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 transition"
              title="Copy Reference Code"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Save this reference number to check real-time status under <strong>Track Request</strong> or quote it in communications.
          </p>

          {/* Action CTAs */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="primary"
              leftIcon={<MessageSquare className="h-4 w-4 text-emerald-100" />}
              onClick={handleWhatsAppDirect}
            >
              Fast-Track via WhatsApp
            </Button>
            {(onNavigateToTrack || onViewTrack) && (
              <Button
                variant="outline"
                onClick={() => {
                  if (onNavigateToTrack) {
                    onNavigateToTrack(submittedRequest.referenceNumber);
                  } else if (onViewTrack) {
                    onViewTrack();
                  }
                }}
              >
                Track Live Status
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                setSubmittedRequest(null);
                onBackHome && onBackHome();
              }}
            >
              Back to Home
            </Button>
          </div>
        </div>

        {/* Technical Notice regarding Next Modules */}
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40 text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            Enterprise Architecture Notice:
          </p>
          <p>
            Your request data is securely archived. Full automated quote generation, price breaks, and instant proforma invoice generation will connect to our central quotation management engine in Module 09.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 text-left space-y-8" id="quote-request-page">
      <PageHeader
        title="Request a Technical Quotation"
        description="Provide your project dimensions, delivery location, and material requirements for a custom factory quotation."
        breadcrumbItems={[
          { label: 'Home', onClick: onBackHome },
          { label: 'Request Quotation', isCurrent: true },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Request Type */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-xs font-bold text-white">
              1
            </span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Select Service Scope
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                type: 'material_only',
                label: 'Material Supply Only',
                desc: 'Factory manufacturing & truck haulage to site',
                icon: <Package className="h-5 w-5" />,
              },
              {
                type: 'installation_only',
                label: 'Installation Service Only',
                desc: 'Master masons laying pre-purchased blocks',
                icon: <Wrench className="h-5 w-5" />,
              },
              {
                type: 'turnkey',
                label: 'Turnkey Supply + Laying',
                desc: 'Complete end-to-end materials and skilled laying',
                icon: <Building className="h-5 w-5" />,
              },
              {
                type: 'site_assessment',
                label: 'Site Assessment First',
                desc: 'Topography measurement & soil inspection',
                icon: <Ruler className="h-5 w-5" />,
              },
            ].map((opt) => (
              <div
                key={opt.type}
                onClick={() => setRequestType(opt.type as any)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  requestType === opt.type
                    ? 'border-orange-600 bg-orange-50/70 text-orange-950 dark:border-orange-500 dark:bg-orange-950/40 dark:text-orange-200 ring-1 ring-orange-500'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg mb-2 ${
                    requestType === opt.type
                      ? 'bg-orange-600 text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {opt.icon}
                </div>
                <h4 className="text-xs font-bold">{opt.label}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                  {opt.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Step 2: Material & Project Specifications */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-xs font-bold text-white">
              2
            </span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Material & Location Details
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Material Category
              </label>
              <select
                value={materialCategory}
                onChange={(e) => setMaterialCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-orange-500"
              >
                {publicSettings.supportedMaterialCategories && publicSettings.supportedMaterialCategories.length > 0 ? (
                  publicSettings.supportedMaterialCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))
                ) : (
                  <>
                    <option value="Interlocking Facing Bricks">Interlocking Facing Bricks</option>
                    <option value="Interlocking Paving Stones">Interlocking Paving Stones</option>
                    <option value="Hollow & Solid Sandcrete Blocks">Hollow & Solid Sandcrete Blocks</option>
                    <option value="Kerb Stones & Drainage Channels">Kerb Stones & Drainage Channels</option>
                    <option value="Architectural Wall Coping">Architectural Wall Coping</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Estimated Quantity or Area (e.g. 500 sqm, 15,000 bricks)
              </label>
              <Input
                value={estimatedQuantity}
                onChange={(e) => setEstimatedQuantity(e.target.value)}
                placeholder="e.g. 2,500 units or 350 m²"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Project Site Address <span className="text-red-500">*</span>
              </label>
              <Input
                value={projectAddress}
                onChange={(e) => setProjectAddress(e.target.value)}
                placeholder="Street address, junction or landmark where materials will be delivered"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                City / Town
              </label>
              <Input
                value={projectCity}
                onChange={(e) => setProjectCity(e.target.value)}
                placeholder="e.g. Lekki, Ikeja, Epe, Ibadan"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Target Project Timeline
              </label>
              <select
                value={desiredTimeline}
                onChange={(e) => setDesiredTimeline(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-orange-500"
              >
                <option value="Immediate (This week)">Immediate (This week)</option>
                <option value="Within 2 weeks">Within 2 weeks</option>
                <option value="Within 1 month">Within 1 month</option>
                <option value="Planning / Pre-construction">Planning / Pre-construction</option>
              </select>
            </div>
          </div>

          {/* Optional Attachments */}
          <div className="pt-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Site Drawings or Ground Photos (Optional)
            </label>
            <CustomerMediaUploader
              onUploadsChanged={setAttachmentUrls}
              maxFiles={3}
            />
          </div>
        </div>

        {/* Step 3: Customer Contact Information */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-xs font-bold text-white">
              3
            </span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Your Contact Information
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Full Name / Contact Person <span className="text-red-500">*</span>
              </label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Arc. Babatunde Adeyemi"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Phone or WhatsApp Number <span className="text-red-500">*</span>
              </label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="e.g. +234 803 123 4567"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Email Address (Optional)
              </label>
              <Input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="e.g. client@example.com"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Company / Firm Name (Optional)
              </label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Apex Builders Ltd"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Additional Site Access Notes or Special Requests
              </label>
              <Textarea
                value={siteNotes}
                onChange={(e) => setSiteNotes(e.target.value)}
                placeholder="Mention any truck height limits, sand dust requirements, or specific color blend requests..."
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="h-4 w-4 text-orange-600 shrink-0" />
            <span>Direct factory quotes issued by certified technical masons.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {onBackHome && (
              <Button
                type="button"
                variant="ghost"
                onClick={onBackHome}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              leftIcon={<Send className="h-4 w-4" />}
              className="w-full sm:w-auto"
            >
              Submit Quotation Request
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
