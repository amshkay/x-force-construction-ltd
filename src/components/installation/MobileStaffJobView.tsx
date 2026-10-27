import React, { useState } from 'react';
import {
  Wrench,
  MapPin,
  Phone,
  Clock,
  Calendar,
  CheckCircle2,
  Camera,
  Layers,
  ShieldCheck,
  Star,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { ServiceJobRecord, ServiceJobStatus } from '../../types/installation';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import { installationService } from '../../services/installation.service';
import { useAuth } from '../../hooks/useAuth';

interface MobileStaffJobViewProps {
  jobs: ServiceJobRecord[];
  onOpenDetailModal: (job: ServiceJobRecord) => void;
  onJobUpdated: (updated: ServiceJobRecord) => void;
}

export const MobileStaffJobView: React.FC<MobileStaffJobViewProps> = ({
  jobs,
  onOpenDetailModal,
  onJobUpdated,
}) => {
  const toast = useToast();
  const { profile } = useAuth();
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);

  const handleQuickAdvance = async (job: ServiceJobRecord, nextStatus: ServiceJobStatus, label: string) => {
    setUpdatingJobId(job.id);
    try {
      const updated = await installationService.updateJobStatus(
        job.id,
        nextStatus,
        profile?.id || 'dev-inst-uid-0004',
        profile?.full_name || 'Sunday Nwosu',
        `Field action: ${label}`
      );
      onJobUpdated(updated);
      toast.success(`Job ${job.jobReference} updated: ${label}`, 'Status Advanced');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status.', 'Error');
    } finally {
      setUpdatingJobId(null);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Mobile Header Banner */}
      <div className="rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 p-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
              <Wrench className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">My Field Service Tasks</h2>
              <p className="text-xs text-orange-100">
                {profile?.full_name || 'Sunday Nwosu'} • Installation Lead Mason
              </p>
            </div>
          </div>
          <Badge variant="default" size="md" className="bg-white/20 text-white font-bold border-0">
            {jobs.length} Active {jobs.length === 1 ? 'Job' : 'Jobs'}
          </Badge>
        </div>
      </div>

      {/* Task List */}
      {jobs.length > 0 ? (
        <div className="space-y-3">
          {jobs.map((job) => {
            const completedCount = job.checklists.filter((c) => c.isCompleted).length;
            const isUpdating = updatingJobId === job.id;

            return (
              <div
                key={job.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3"
              >
                {/* Title & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-extrabold text-slate-900 dark:text-white">
                        {job.jobReference}
                      </span>
                      <Badge
                        variant={
                          job.status === 'completed'
                            ? 'success'
                            : job.status === 'installation' || job.status === 'on_site'
                            ? 'warning'
                            : 'info'
                        }
                        size="sm"
                      >
                        {job.status.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">
                      {job.serviceTypeLabel}
                    </div>
                  </div>

                  {job.priority === 'urgent' && (
                    <Badge variant="danger" size="sm">
                      URGENT
                    </Badge>
                  )}
                </div>

                {/* Customer & Location */}
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {job.customerName} {job.companyName ? `(${job.companyName})` : ''}
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <a
                      href={`tel:${job.customerPhone}`}
                      className="text-orange-600 dark:text-orange-400 font-semibold hover:underline"
                    >
                      {job.customerPhone} (Call Client)
                    </a>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      {job.siteAddress}, {job.siteCity || 'Enugu'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      {job.scheduledDate || 'Today'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      {job.scheduledTime || '08:30 AM'}
                    </span>
                  </div>
                </div>

                {/* Progress summary bar */}
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 space-y-1 text-xs">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Checklist Items:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {completedCount} of {job.checklists.length} Done
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 dark:bg-slate-700">
                    <div
                      className="bg-orange-600 h-1.5 rounded-full"
                      style={{
                        width: `${job.checklists.length ? (completedCount / job.checklists.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  {job.installationDetails?.squareMetersInstalled ? (
                    <div className="text-[11px] text-emerald-600 font-medium pt-0.5">
                      Progress: {job.installationDetails.squareMetersInstalled} m² laid ({job.installationDetails.percentComplete}%)
                    </div>
                  ) : null}
                </div>

                {/* Quick Touch Actions for Field Staff */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-2">
                  {job.status === 'scheduled' || job.status === 'assigned' ? (
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      isLoading={isUpdating}
                      onClick={() => handleQuickAdvance(job, 'on_site', 'Arrived On Site')}
                      leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    >
                      Arrived On Site
                    </Button>
                  ) : job.status === 'on_site' ? (
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      isLoading={isUpdating}
                      onClick={() => handleQuickAdvance(job, 'preparation', 'Commence Preparation')}
                      leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    >
                      Start Preparation
                    </Button>
                  ) : job.status === 'preparation' ? (
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      isLoading={isUpdating}
                      onClick={() => handleQuickAdvance(job, 'installation', 'Commence Installation')}
                      leftIcon={<Wrench className="h-4 w-4" />}
                    >
                      Start Laying Bricks
                    </Button>
                  ) : job.status === 'installation' ? (
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      isLoading={isUpdating}
                      onClick={() => handleQuickAdvance(job, 'quality_check', 'Proceed to Quality Check')}
                      leftIcon={<ShieldCheck className="h-4 w-4" />}
                    >
                      Quality Check
                    </Button>
                  ) : job.status === 'quality_check' ? (
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      isLoading={isUpdating}
                      onClick={() => handleQuickAdvance(job, 'final_cleaning', 'Proceed to Cleaning')}
                      leftIcon={<Sparkles className="h-4 w-4" />}
                    >
                      Final Cleaning
                    </Button>
                  ) : job.status === 'final_cleaning' ? (
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      isLoading={isUpdating}
                      onClick={() => handleQuickAdvance(job, 'customer_confirmation', 'Awaiting Sign-Off')}
                      leftIcon={<Star className="h-4 w-4" />}
                    >
                      Client Sign-Off
                    </Button>
                  ) : null}

                  {job.gpsLatitude && job.gpsLongitude && (
                    <a
                      href={`https://www.google.com/maps?q=${job.gpsLatitude},${job.gpsLongitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                      Map
                    </a>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenDetailModal(job)}
                  >
                    Open Details
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500 dark:border-slate-800">
          No service jobs currently assigned to your team. Contact the supervisor or check upcoming schedules.
        </div>
      )}
    </div>
  );
};
