import React, { useState } from 'react';
import {
  MapPin,
  Calendar,
  Building2,
  CheckCircle2,
  Share2,
  Package,
  ArrowRight,
  ExternalLink,
  Layers,
  Sparkles,
  Camera,
  Maximize2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { PublicProject } from '../../types/public';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';
import { sharePublicItem } from '../../utils/customerHelpers';
import { useToast } from '../ui/Toast';

export interface ProjectDetailModalProps {
  project: PublicProject | null;
  isOpen: boolean;
  onClose: () => void;
  onRequestQuote: (project: PublicProject) => void;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  project,
  isOpen,
  onClose,
  onRequestQuote,
}) => {
  const { publicSettings } = useBusinessSettings();
  const toast = useToast();

  const [activePhase, setActivePhase] = useState<'all' | 'before' | 'during' | 'after'>('all');
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (!project) return null;

  const galleryImages = project.galleryImages || [];
  const filteredGallery = galleryImages.filter((item) => {
    if (activePhase === 'all') return true;
    if (activePhase === 'after') return item.phase === 'after' || item.phase === 'finished';
    return item.phase === activePhase;
  });

  const displayImages = filteredGallery.length > 0 ? filteredGallery : galleryImages;
  const currentPhoto = displayImages[activeImageIndex] || {
    url: project.coverImageUrl || '',
    caption: project.title,
    phase: 'after',
  };

  const handleShare = async () => {
    const res = await sharePublicItem({
      title: `${project.title} | ${publicSettings.publicBrandName} Projects`,
      text: `${project.title} located at ${project.location}. Completed with X-FORCE materials.`,
    });
    if (res === 'copied') {
      toast.success('Project details copied to clipboard.', 'Share Project');
    }
  };

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : displayImages.length - 1));
  };

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev < displayImages.length - 1 ? prev + 1 : 0));
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="lg"
        title={project.title}
      >
        <div className="space-y-6 text-left" id={`project-modal-${project.id}`}>
          {/* Main Visual Stage / Carousel with Phase Tag */}
          <div className="relative h-64 sm:h-80 w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center group">
            {currentPhoto.url ? (
              <img
                src={currentPhoto.url}
                alt={currentPhoto.caption || project.title}
                className="h-full w-full object-cover transition-opacity duration-300"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <Building2 className="h-14 w-14 stroke-1 mb-2 text-slate-500" />
                <span className="text-xs font-semibold text-slate-400">
                  {project.category} Showcase
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  Constructed with {publicSettings.publicBrandName} engineered materials
                </span>
              </div>
            )}

            {/* Gradient Overlay for Caption */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

            {/* Top Bar Badges */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-white/95 backdrop-blur px-2.5 py-1 text-[11px] font-bold text-orange-600 shadow-sm dark:bg-slate-900/95 dark:text-orange-400">
                {project.category}
              </span>

              {currentPhoto.phase && (
                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                  currentPhoto.phase === 'before'
                    ? 'bg-amber-500 text-white'
                    : currentPhoto.phase === 'during'
                    ? 'bg-blue-600 text-white'
                    : 'bg-emerald-600 text-white'
                }`}>
                  {currentPhoto.phase === 'before' ? 'Before Site Work' : currentPhoto.phase === 'during' ? 'During Construction' : 'Completed Result'}
                </span>
              )}
            </div>

            {/* Lightbox Trigger */}
            {currentPhoto.url && (
              <button
                type="button"
                onClick={() => setLightboxUrl(currentPhoto.url)}
                className="absolute top-3 right-3 rounded-md bg-black/60 hover:bg-black/80 text-white p-1.5 transition opacity-0 group-hover:opacity-100"
                title="View Full Size Image"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            )}

            {/* Navigation Arrows if Multiple Images */}
            {displayImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 hover:bg-black/80 text-white p-1.5 transition opacity-75 hover:opacity-100"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 hover:bg-black/80 text-white p-1.5 transition opacity-75 hover:opacity-100"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}

            {/* Bottom Caption */}
            {currentPhoto.caption && (
              <div className="absolute bottom-3 left-3 right-3 text-white text-xs bg-black/40 backdrop-blur-sm p-2 rounded-md border border-white/10">
                <span className="line-clamp-2">{currentPhoto.caption}</span>
              </div>
            )}
          </div>

          {/* Progression Phase Tabs (Before / During / After) */}
          {galleryImages.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-orange-600" />
                  Site Progression Photos ({galleryImages.length})
                </span>
                <div className="flex items-center gap-1">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'before', label: 'Before' },
                    { id: 'during', label: 'During' },
                    { id: 'after', label: 'After' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActivePhase(tab.id as any);
                        setActiveImageIndex(0);
                      }}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                        activePhase === tab.id
                          ? 'bg-orange-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thumbnails Row */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {displayImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative h-14 w-20 shrink-0 rounded-lg overflow-hidden border-2 transition ${
                      activeImageIndex === idx
                        ? 'border-orange-600 ring-2 ring-orange-500/30'
                        : 'border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={img.caption || `Photo ${idx + 1}`}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {img.phase && (
                      <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-white text-center py-0.5 uppercase font-semibold">
                        {img.phase}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Project Meta Info Bar */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-orange-600 shrink-0" />
              <span className="font-semibold text-slate-900 dark:text-white">{project.location}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
              <span>{project.completionDate}</span>
            </div>
            {project.clientType && (
              <div className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                {project.clientType} Project
              </div>
            )}
            <div className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              {project.status === 'completed' ? 'Verified Completion' : 'Active Site in Progress'}
            </div>
          </div>

          {/* Narrative Description & Scope */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Project Overview & Execution
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {project.description}
            </p>
            {project.scopeSummary && (
              <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                <strong className="text-slate-700 dark:text-slate-200">Scope Delivered:</strong>{' '}
                {project.scopeSummary}
              </p>
            )}
          </div>

          {/* Materials Specified */}
          {project.materialsUsed && project.materialsUsed.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-orange-600" />
                <span>X-FORCE Materials Specified</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {project.materialsUsed.map((mat, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2 text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                    <span>{mat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Controls */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              leftIcon={<Share2 className="h-4 w-4" />}
              onClick={handleShare}
            >
              Share Project
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              rightIcon={<ArrowRight className="h-4 w-4" />}
              onClick={() => {
                onClose();
                onRequestQuote(project);
              }}
            >
              Request Quote for Similar Project
            </Button>
          </div>
        </div>
      </Modal>

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="Full size site showcase"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </>
  );
};
