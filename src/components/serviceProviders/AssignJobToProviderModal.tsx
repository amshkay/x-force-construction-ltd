import React, { useState, useEffect } from 'react';
import { X, Briefcase, Calendar, MapPin, User, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { serviceProviderService } from '../../services/serviceProvider.service';
import { installationRepository } from '../../repositories/installation.repository';
import { ServiceProvider } from '../../types/serviceProvider';
import { ServiceJobRecord } from '../../types/installation';

interface AssignJobToProviderModalProps {
  isOpen: boolean;
  provider: ServiceProvider | null;
  onClose: () => void;
  onJobAssigned: () => void;
}

export const AssignJobToProviderModal: React.FC<AssignJobToProviderModalProps> = ({
  isOpen,
  provider,
  onClose,
  onJobAssigned,
}) => {
  const { profile } = useAuth();
  const toast = useToast();

  const [availableJobs, setAvailableJobs] = useState<ServiceJobRecord[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [assignmentNote, setAssignmentNote] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !provider) return;

    const loadJobs = async () => {
      setLoading(true);
      try {
        const allJobs = await installationRepository.getAll();
        // Eligible jobs: not completed and not cancelled
        const eligible = allJobs.filter(
          (j) => j.status !== 'completed' && j.status !== 'cancelled'
        );
        setAvailableJobs(eligible);

        // Pre-select first unassigned job if any
        const unassigned = eligible.find((j) => !j.serviceProviderId);
        if (unassigned) {
          setSelectedJobId(unassigned.id);
        } else if (eligible.length > 0) {
          setSelectedJobId(eligible[0].id);
        }
      } catch (err) {
        console.error('Failed to load eligible jobs for provider assignment:', err);
      } finally {
        setLoading(false);
      }
    };

    loadJobs();
  }, [isOpen, provider]);

  if (!isOpen || !provider) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId) {
      toast.error('Please select a service job to assign.', 'No Job Selected');
      return;
    }

    setIsSubmitting(true);
    try {
      await serviceProviderService.assignProviderToJob(
        selectedJobId,
        provider.id,
        profile?.id || 'dev-admin-uid-0001',
        profile?.full_name || 'Administrator',
        assignmentNote.trim() || undefined
      );

      const targetJob = availableJobs.find((j) => j.id === selectedJobId);
      toast.success(
        `Assigned ${provider.name} to ${targetJob?.jobReference || 'Service Job'}.`,
        'Provider Assigned'
      );
      onJobAssigned();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign provider to job.', 'Assignment Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedJob = availableJobs.find((j) => j.id === selectedJobId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Assign Service Job to Contractor
            </h3>
            <p className="text-xs text-slate-500">
              {provider.name} ({provider.providerNumber})
            </p>
          </div>
        </div>

        {provider.status !== 'active' ? (
          <div className="rounded-lg bg-rose-50 p-4 text-xs text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 mb-4">
            <p className="font-bold">Provider is {provider.status.toUpperCase()}</p>
            <p className="mt-1">
              Only active service providers can be assigned to service jobs. Please activate this
              provider first before creating new assignments.
            </p>
          </div>
        ) : loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Loading active service jobs...</div>
        ) : availableJobs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No active open service jobs found to assign.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Open Service Job *
              </label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                required
              >
                {availableJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.jobReference} — {j.customerName} ({j.serviceTypeLabel})
                    {j.serviceProviderName ? ` [Already has: ${j.serviceProviderName}]` : ' [Unassigned]'}
                  </option>
                ))}
              </select>
            </div>

            {selectedJob && (
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40 text-xs space-y-2">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-slate-900 dark:text-white flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-orange-600" />
                    {selectedJob.customerName}
                  </span>
                  <Badge variant="info" size="sm">
                    {selectedJob.status.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                </div>
                <div className="text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <span>
                    {selectedJob.siteAddress}
                    {selectedJob.siteCity ? `, ${selectedJob.siteCity}` : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Date: {selectedJob.scheduledDate || 'Flexible'}
                  </span>
                  <span>
                    Internal Staff: {selectedJob.assignedStaffName || 'None assigned'}
                  </span>
                </div>
                {selectedJob.serviceProviderName && (
                  <div className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded font-medium">
                    Note: This job is currently assigned to {selectedJob.serviceProviderName}. Assigning
                    will reassign external contractor responsibility.
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Assignment Note / Specific Scope (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Assigned for perimeter foundation leveling and primary course dry stacking..."
                value={assignmentNote}
                onChange={(e) => setAssignmentNote(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
                isLoading={isSubmitting}
              >
                Assign Contractor
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
