import React, { useState } from 'react';
import {
  Compass,
  CheckCircle2,
  Share2,
  Package,
  ArrowRight,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Palette,
  Layers,
  Sparkles,
  Play,
} from 'lucide-react';
import { PublicDesignItem } from '../../types/public';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';
import { sharePublicItem } from '../../utils/customerHelpers';
import { useToast } from '../ui/Toast';

export interface DesignDetailModalProps {
  design: PublicDesignItem | null;
  isOpen: boolean;
  onClose: () => void;
  onRequestQuote: (design: PublicDesignItem) => void;
}

export const DesignDetailModal: React.FC<DesignDetailModalProps> = ({
  design,
  isOpen,
  onClose,
  onRequestQuote,
}) => {
  const { publicSettings } = useBusinessSettings();
  const toast = useToast();
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (!design) return null;

  const images = design.images || [];
  const currentImage = images[activeImageIndex] || 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1200&q=80';

  const handleShare = async () => {
    const res = await sharePublicItem({
      title: `${design.title} | ${publicSettings.publicBrandName} Design Inspiration`,
      text: `${design.title} - ${design.category}. Engineered with X-FORCE materials.`,
    });
    if (res === 'copied') {
      toast.success('Design details copied to clipboard.', 'Share Design');
    }
  };

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="lg"
        title={design.title}
      >
        <div className="space-y-6 text-left" id={`design-modal-${design.id}`}>
          {/* Main Visual Stage */}
          <div className="relative h-64 sm:h-80 w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center group">
            <img
              src={currentImage}
              alt={design.title}
              className="h-full w-full object-cover transition-opacity duration-300"
              referrerPolicy="no-referrer"
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

            {/* Badges */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-white/95 backdrop-blur px-2.5 py-1 text-[11px] font-bold text-orange-600 shadow-sm dark:bg-slate-900/95 dark:text-orange-400">
                {design.category}
              </span>
              {design.applicationType && (
                <span className="inline-flex items-center gap-1 rounded-md bg-black/60 backdrop-blur px-2 py-0.5 text-[10px] font-semibold text-white">
                  {design.applicationType}
                </span>
              )}
            </div>

            {/* Lightbox trigger */}
            <button
              type="button"
              onClick={() => setLightboxUrl(currentImage)}
              className="absolute top-3 right-3 rounded-md bg-black/60 hover:bg-black/80 text-white p-1.5 transition opacity-0 group-hover:opacity-100"
              title="View full size"
            >
              <Maximize2 className="h-4 w-4" />
            </button>

            {/* Navigation Arrows if Multiple Images */}
            {images.length > 1 && (
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

            {/* Video Link Indicator if Available */}
            {design.videoUrl && (
              <a
                href={design.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md bg-red-600/90 hover:bg-red-700 text-white px-2.5 py-1 text-xs font-semibold shadow"
              >
                <Play className="h-3.5 w-3.5 fill-current" /> Watch Walkthrough Video
              </a>
            )}
          </div>

          {/* Thumbnails if Multiple Images */}
          {images.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {images.map((img, idx) => (
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
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Overview & Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Architectural Concept & Pattern Style
              </h4>
              {design.patternStyle && (
                <span className="text-xs text-orange-600 dark:text-orange-400 font-semibold">
                  Style: {design.patternStyle}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {design.description}
            </p>
          </div>

          {/* Color Palette Swatches */}
          {design.colorPalette && design.colorPalette.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5 text-orange-600" />
                <span>Featured Factory Pigments & Color Blends</span>
              </h4>
              <div className="flex flex-wrap items-center gap-2">
                {design.colorPalette.map((color, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-black/10 shadow-inner"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {color.name}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase">
                      {color.hex}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suitable Products */}
          {design.suitableProducts && design.suitableProducts.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-orange-600" />
                <span>Compatible X-FORCE Products</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {design.suitableProducts.map((prod, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2 text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                    <span>{prod}</span>
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
              Share Design
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              rightIcon={<ArrowRight className="h-4 w-4" />}
              onClick={() => {
                onClose();
                onRequestQuote(design);
              }}
            >
              Request Quote for this Design
            </Button>
          </div>
        </div>
      </Modal>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="Full size design preview"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </>
  );
};
