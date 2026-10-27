import React, { useState, useEffect } from 'react';
import { PageHeader } from '../ui/PageHeader';
import { SearchInput } from '../ui/SearchInput';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import {
  Search,
  FileQuestion,
  CheckCircle2,
  Clock,
  MessageSquare,
  ShieldCheck,
  Building,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '../ui/Toast';
import { publicDataService } from '../../services/publicData.service';
import { RequestTrackingResult } from '../../types/public';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';
import { openWhatsAppChat } from '../../utils/whatsapp';

export interface PublicTrackRequestPageProps {
  initialReference?: string;
  onBackHome?: () => void;
  onRequestQuote?: () => void;
}

export const PublicTrackRequestPage: React.FC<PublicTrackRequestPageProps> = ({
  initialReference = '',
  onBackHome,
  onRequestQuote,
}) => {
  const { publicSettings } = useBusinessSettings();
  const toast = useToast();

  const [reference, setReference] = useState(initialReference);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [trackingResult, setTrackingResult] = useState<RequestTrackingResult | null>(null);

  const performLookup = async (queryRef: string) => {
    if (!queryRef.trim()) {
      toast.warning('Please enter a request, quotation or order reference number.', 'Search Notice');
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      const result = await publicDataService.trackReference(queryRef);
      setTrackingResult(result);
      if (!result) {
        toast.info(
          `No active record matching "${queryRef}". If you submitted recently, please verify the spelling or check with our sales desk.`,
          'Status Lookup'
        );
      }
    } catch (err) {
      toast.error('Unable to verify reference. Please check connection.', 'Lookup Error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performLookup(reference);
  };

  useEffect(() => {
    if (initialReference) {
      setReference(initialReference);
      performLookup(initialReference);
    }
  }, [initialReference]);

  const handleWhatsAppHelp = () => {
    const msg = `Hello ${publicSettings.publicBrandName}, I am tracking status for reference code ${reference || '[Reference Number]'}. Could you please advise on progress?`;
    openWhatsAppChat(publicSettings.whatsappNumber, msg);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 text-left space-y-6" id="public-track-page">
      <PageHeader
        title="Track Request, Quotation & Order"
        description="Enter your unique reference number (e.g. XFR-2026-8192, QTE-2026-001, ORD-1002) to inspect real-time manufacturing and delivery status."
        breadcrumbItems={[
          { label: 'Home', onClick: onBackHome },
          { label: 'Track Status', isCurrent: true },
        ]}
      />

      {/* Reference Input Bar */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-xl">
        <div className="flex-1">
          <SearchInput
            value={reference}
            onChange={setReference}
            placeholder="Enter reference code (e.g. XFR-2026-1042)..."
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          isLoading={isSearching}
          leftIcon={<Search className="h-4 w-4" />}
        >
          Track Status
        </Button>
      </form>

      {/* Results or States */}
      {trackingResult ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
          {/* Tracking Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  {trackingResult.type.toUpperCase()} STATUS
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Logged on {trackingResult.dateCreated ? trackingResult.dateCreated.split('T')[0] : 'Today'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {trackingResult.referenceNumber}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Client Profile: {trackingResult.customerNameMasked}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                onClick={() => performLookup(reference)}
              >
                Refresh
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<MessageSquare className="h-3.5 w-3.5 text-emerald-200" />}
                onClick={handleWhatsAppHelp}
              >
                Inquire on WhatsApp
              </Button>
            </div>
          </div>

          {/* Summary Card */}
          <div className="rounded-xl bg-orange-50/60 p-4 border border-orange-200/60 dark:bg-orange-950/20 dark:border-orange-900/40 text-xs text-slate-700 dark:text-slate-300">
            <strong className="text-orange-950 dark:text-orange-200 block mb-1">
              Current Technical Status:
            </strong>
            <p>{trackingResult.summary}</p>
            {trackingResult.estimatedCompletion && (
              <p className="mt-1.5 text-slate-500 dark:text-slate-400">
                Estimated Review Turnaround: <strong>{trackingResult.estimatedCompletion}</strong>
              </p>
            )}
          </div>

          {/* Timeline Milestones */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Lifecycle Progress Timeline
            </h4>

            <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {trackingResult.steps.map((step, idx) => (
                <div key={idx} className="relative flex items-start gap-4 text-xs">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full z-10 ${
                      step.completed
                        ? 'bg-emerald-600 text-white'
                        : step.current
                        ? 'bg-orange-600 text-white ring-4 ring-orange-100 dark:ring-orange-950'
                        : 'bg-slate-100 text-slate-400 border border-slate-300 dark:bg-slate-800 dark:border-slate-700'
                    }`}
                  >
                    {step.completed ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Clock className="h-3.5 w-3.5" />
                    )}
                  </div>

                  <div className="space-y-0.5 pt-0.5">
                    <div className="flex items-center gap-2">
                      <h5
                        className={`font-bold ${
                          step.completed
                            ? 'text-slate-900 dark:text-white'
                            : step.current
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {step.title}
                      </h5>
                      {step.current && (
                        <span className="rounded-full bg-orange-100 px-2 py-0.2 text-[10px] font-bold text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                          Active Stage
                        </span>
                      )}
                      {step.date && (
                        <span className="text-[10px] text-slate-400">({step.date})</span>
                      )}
                    </div>
                    <p className="text-slate-500 dark:text-slate-400">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : hasSearched ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900 text-center space-y-4">
          <EmptyState
            icon={<FileQuestion className="h-10 w-10 text-slate-400" />}
            title={`No Record Found for "${reference}"`}
            description="Please check for typos in your reference code. Offline inquiries and customer quotation requests submitted through this website are saved locally on this device, while production orders are checked against the factory database."
            actionLabel="Submit a New Quotation Request"
            onAction={onRequestQuote}
          />
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<MessageSquare className="h-4 w-4 text-emerald-600" />}
              onClick={handleWhatsAppHelp}
            >
              Ask Support on WhatsApp
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900 text-center">
          <EmptyState
            icon={<Search className="h-10 w-10 text-slate-300 dark:text-slate-600" />}
            title="Enter a Reference Code to Track"
            description="Your tracking reference code was displayed upon submitting a request (e.g. XFR-2026-XXXX) or provided on your formal quotation document."
          />
        </div>
      )}
    </div>
  );
};
