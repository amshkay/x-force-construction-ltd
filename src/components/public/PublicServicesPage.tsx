import React, { useState } from 'react';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import {
  Wrench,
  CheckCircle2,
  ShieldCheck,
  Ruler,
  Sparkles,
  ArrowRight,
  HardHat,
  Clock,
} from 'lucide-react';
import { publicDataService } from '../../services/publicData.service';
import { PublicServiceItem } from '../../types/public';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';
import { Modal } from '../ui/Modal';

export interface PublicServicesPageProps {
  onBackHome?: () => void;
  onRequestQuote?: (serviceName?: string) => void;
}

export const PublicServicesPage: React.FC<PublicServicesPageProps> = ({
  onBackHome,
  onRequestQuote,
}) => {
  const { publicSettings } = useBusinessSettings();
  const services: PublicServiceItem[] = publicDataService.getServices();
  const installationsEnabled = publicSettings.features?.installationsEnabled ?? true;

  const [activeModalService, setActiveModalService] = useState<PublicServiceItem | null>(null);

  const getServiceIcon = (iconName: string) => {
    switch (iconName) {
      case 'Ruler':
        return <Ruler className="h-5 w-5" />;
      case 'ShieldCheck':
        return <ShieldCheck className="h-5 w-5" />;
      case 'Sparkles':
        return <Sparkles className="h-5 w-5" />;
      default:
        return <Wrench className="h-5 w-5" />;
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 text-left space-y-8" id="public-services-page">
      <PageHeader
        title="Field Engineering & Turnkey Installation Services"
        description="Certified master masons, laser-guided pavement laying, and comprehensive pre-construction site surveys."
        breadcrumbItems={[
          { label: 'Home', onClick: onBackHome },
          { label: 'Services', isCurrent: true },
        ]}
        primaryAction={
          <Button
            variant="primary"
            size="sm"
            onClick={() => onRequestQuote && onRequestQuote('Turnkey Installation')}
            rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
          >
            Book Site Assessment
          </Button>
        }
      />

      {/* Feature Flag Notice if installations are disabled */}
      {!installationsEnabled && (
        <Alert variant="warning">
          <span>
            Field installation services are currently in reserved contractor allocation mode. Direct material manufacturing & site deliveries remain 100% active.
          </span>
        </Alert>
      )}

      {/* Trust & Engineering Quality Guarantee Banner */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-orange-50 via-white to-orange-50/50 p-6 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-600 text-white">
            <HardHat className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Certified Technicians</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Trained extensively in mortarless interlocking and laser slope grading.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-600 text-white">
            <Ruler className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Laser Alignment</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Precision drainage falls to guarantee zero rain water ponding.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-600 text-white">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Rapid Turnaround</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Up to 40% faster wall erection compared to conventional wet plaster masonry.
            </p>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {services.map((srv) => (
          <div
            key={srv.id}
            className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 text-left"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
                  {getServiceIcon(srv.iconName)}
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Turnkey Scope
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {srv.title}
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {srv.shortDescription}
                </p>
              </div>

              {/* Key Features Bullet List */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                {srv.keyFeatures.slice(0, 3).map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveModalService(srv)}
                className="px-0 hover:bg-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-xs"
              >
                View Full Scope →
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => onRequestQuote && onRequestQuote(srv.title)}
                disabled={!installationsEnabled}
              >
                Request Quote
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Service Detail Modal */}
      {activeModalService && (
        <Modal
          isOpen={Boolean(activeModalService)}
          onClose={() => setActiveModalService(null)}
          title={activeModalService.title}
          size="md"
        >
          <div className="space-y-5 text-left">
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {activeModalService.fullDescription}
            </p>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Core Engineering Highlights:
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                {activeModalService.keyFeatures.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-orange-600 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Included Deliverables:
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                {activeModalService.deliverables.map((d, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveModalService(null)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const s = activeModalService;
                  setActiveModalService(null);
                  onRequestQuote && onRequestQuote(s.title);
                }}
              >
                Request Quote for this Service
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
