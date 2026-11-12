import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package,
  Wrench,
  CheckCircle2,
  Share2,
  MessageSquare,
  Sparkles,
  Layers,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
} from 'lucide-react';
import { PublicProduct, PublicProductVariant } from '../../types/public';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';
import { formatPublicPrice, sharePublicItem } from '../../utils/customerHelpers';
import { openWhatsAppChat } from '../../utils/whatsapp';
import { useToast } from '../ui/Toast';

export interface ProductDetailModalProps {
  product: PublicProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onRequestQuote: (product: PublicProduct) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onRequestQuote,
}) => {
  const { publicSettings } = useBusinessSettings();
  const toast = useToast();

  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [selectedVariant, setSelectedVariant] = useState<PublicProductVariant | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);

  // Compute the comprehensive list of genuine images for this product
  const displayImages = useMemo(() => {
    if (!product) return [];
    const list: string[] = [];

    const addImage = (url?: string | null) => {
      if (!url || typeof url !== 'string') return;
      const clean = url.trim();
      if (!clean) return;
      if (clean.includes('unsplash.com') || clean.includes('/assets/services/')) return;
      if (!list.includes(clean)) {
        list.push(clean);
      }
    };

    // 1. All images from the product's image array
    if (Array.isArray(product.images)) {
      product.images.forEach((img) => addImage(img));
    }

    // 2. Primary imageUrl
    if (product.imageUrl) {
      if (!list.includes(product.imageUrl.trim())) {
        list.unshift(product.imageUrl.trim());
      }
    }

    // 3. Variant images
    if (Array.isArray(product.variants)) {
      product.variants.forEach((v) => addImage(v.imageUrl));
    }

    // 4. If list is still empty, populate authentic fallback photos based on product name/category
    if (list.length === 0) {
      const text = `${product.categoryName || ''} ${product.name}`.toLowerCase();
      if (text.includes('barrier kerb') || text.includes('kerb')) {
        list.push(
          '/assets/products/kerb-1.jpg',
          '/assets/products/kerb-2.jpg',
          '/assets/products/kerb-3.jpg',
          '/assets/products/kerb-4.jpg',
          '/assets/products/kerb-5.jpg'
        );
      } else if (text.includes('coping') || text.includes('saddleback')) {
        list.push(
          '/assets/products/coping-1.jpg',
          '/assets/products/coping-2.jpg',
          '/assets/products/coping-3.jpg'
        );
      } else if (text.includes('conduit') || text.includes('cored')) {
        list.push(
          '/assets/products/conduit-1.jpg',
          '/assets/products/conduit-2.jpg',
          '/assets/products/conduit-3.jpg',
          '/assets/products/conduit-4.jpg',
          '/assets/products/conduit-5.jpg',
          '/assets/products/conduit-6.jpg'
        );
      } else if (text.includes('60mm')) {
        list.push(
          '/assets/products/paver-60mm-1.jpg',
          '/assets/products/paver-60mm-2.jpg',
          '/assets/products/paver-60mm-3.jpg',
          '/assets/products/paver-60mm-4.jpg'
        );
      } else if (text.includes('80mm') || text.includes('heavy-duty')) {
        list.push(
          '/assets/products/paver-80mm-charcoal.jpg',
          '/assets/products/paver-80mm-terracotta.jpg',
          '/assets/products/paver-80mm-granite-grey.jpg'
        );
      } else if (text.includes('hydraform') || text.includes('earth block') || text.includes('brick')) {
        list.push(
          '/assets/products/hydraform-ochre.jpg',
          '/assets/products/hydraform-terracotta.jpg'
        );
      } else {
        list.push('/assets/products/paver-80mm-charcoal.jpg');
      }
    }

    return list;
  }, [product]);

  // Reset image index and variant on product change or modal open
  useEffect(() => {
    setActiveImageIndex(0);
    setFailedImages(new Set());
    setIsLightboxOpen(false);

    if (product && Array.isArray(product.variants) && product.variants.length > 0) {
      const initialVariant = product.variants[0];
      setSelectedVariant(initialVariant);

      // If initial variant has an image in displayImages, select it
      if (initialVariant?.imageUrl) {
        const foundIdx = displayImages.indexOf(initialVariant.imageUrl);
        if (foundIdx !== -1) {
          setActiveImageIndex(foundIdx);
        }
      }
    } else {
      setSelectedVariant(null);
    }
  }, [product, displayImages]);

  // Keyboard navigation for image gallery
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextImage();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevImage();
      } else if (e.key === 'Escape' && isLightboxOpen) {
        e.preventDefault();
        setIsLightboxOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, displayImages.length, isLightboxOpen]);

  const handleNextImage = useCallback(() => {
    if (displayImages.length <= 1) return;
    setActiveImageIndex((prev) => (prev + 1) % displayImages.length);
  }, [displayImages.length]);

  const handlePrevImage = useCallback(() => {
    if (displayImages.length <= 1) return;
    setActiveImageIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
  }, [displayImages.length]);

  if (!product) return null;

  const getColorHex = (name: string, color?: string | null): string => {
    const text = `${name} ${color || ''}`.toLowerCase();
    if (text.includes('terracotta') || text.includes('red') || text.includes('laterite')) return '#c2410c';
    if (text.includes('charcoal') || text.includes('black') || text.includes('carbon')) return '#1e293b';
    if (text.includes('granite') || text.includes('grey') || text.includes('gray')) return '#64748b';
    if (text.includes('ochre') || text.includes('clay') || text.includes('yellow')) return '#d97706';
    if (text.includes('sand') || text.includes('beige') || text.includes('white')) return '#e2e8f0';
    return '#ea580c';
  };

  const getEmergencyFallback = (url: string): string => {
    const text = `${product.name} ${url}`.toLowerCase();
    if (text.includes('kerb') || text.includes('barrier') || text.includes('125x250')) {
      return '/assets/products/kerb-1.jpg';
    }
    if (text.includes('coping') || text.includes('saddleback')) {
      return '/assets/products/coping-1.jpg';
    }
    if (text.includes('conduit') || text.includes('cored')) {
      return '/assets/products/conduit-1.jpg';
    }
    if (text.includes('60mm')) {
      return '/assets/products/paver-60mm-1.jpg';
    }
    if (text.includes('hydraform') || text.includes('brick')) {
      return '/assets/products/hydraform-ochre.jpg';
    }
    return '/assets/products/paver-80mm-charcoal.jpg';
  };

  const currentRawUrl = displayImages[activeImageIndex] || displayImages[0] || '';
  const isCurrentFailed = failedImages.has(currentRawUrl);
  const activeImage = isCurrentFailed ? getEmergencyFallback(currentRawUrl) : currentRawUrl;

  const activePrice = selectedVariant?.priceOverride ?? product.sellingPrice;

  const handleSelectThumbnail = (idx: number) => {
    setActiveImageIndex(idx);
    const selectedUrl = displayImages[idx];
    if (selectedUrl && product.variants) {
      const match = product.variants.find((v) => v.imageUrl === selectedUrl);
      if (match) setSelectedVariant(match);
    }
  };

  const handleSelectVariant = (v: PublicProductVariant) => {
    setSelectedVariant(v);
    if (v.imageUrl) {
      const idx = displayImages.indexOf(v.imageUrl);
      if (idx !== -1) {
        setActiveImageIndex(idx);
        return;
      }
    }
    // Match by color name in displayImages
    const col = `${v.name} ${v.color || ''}`.toLowerCase();
    const idx = displayImages.findIndex((url) => {
      const u = url.toLowerCase();
      if ((col.includes('terracotta') || col.includes('red')) && u.includes('terracotta')) return true;
      if ((col.includes('charcoal') || col.includes('black')) && u.includes('charcoal')) return true;
      if ((col.includes('granite') || col.includes('grey')) && (u.includes('grey') || u.includes('granite'))) return true;
      if ((col.includes('ochre') || col.includes('clay')) && u.includes('ochre')) return true;
      return false;
    });
    if (idx !== -1) {
      setActiveImageIndex(idx);
    }
  };

  const handleWhatsApp = () => {
    const message = `Hello ${publicSettings.publicBrandName}, I am inquiring about the ${product.name} (SKU: ${selectedVariant?.sku || product.sku}). Could you please advise on pricing and delivery schedule?`;
    openWhatsAppChat(publicSettings.whatsappNumber, message);
  };

  const handleShare = async () => {
    const res = await sharePublicItem({
      title: `${product.name} | ${publicSettings.publicBrandName}`,
      text: `${product.name} - ${product.description || 'Engineered building materials'}`,
    });
    if (res === 'copied') {
      toast.success('Product link copied to clipboard.', 'Share Material');
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="lg"
        title={product.name}
      >
        <div className="space-y-6 text-left">
          {/* Top Media & Specs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
            {/* Media Gallery Viewer Container */}
            <div className="space-y-3">
              {/* Main Image Frame */}
              <div className="group relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-900/10 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-inner">
                {activeImage ? (
                  <img
                    key={activeImage}
                    src={activeImage}
                    alt={selectedVariant ? `${product.name} - ${selectedVariant.name}` : `${product.name} - View ${activeImageIndex + 1}`}
                    onError={() => {
                      setFailedImages((prev) => new Set(prev).add(currentRawUrl));
                    }}
                    className="h-full w-full object-cover transition-all duration-300 select-none cursor-pointer"
                    onClick={() => setIsLightboxOpen(true)}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                    <Package className="h-16 w-16 stroke-1 text-slate-400 mb-2" />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {publicSettings.publicBrandName} Certified Masonry
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">
                      High-pressure hydraulic pressed
                    </span>
                  </div>
                )}

                {/* Category Badge */}
                <div className="absolute top-3 left-3 z-10">
                  <span className="inline-flex items-center gap-1 rounded-md bg-white/95 backdrop-blur px-2.5 py-1 text-[11px] font-bold text-orange-600 shadow-sm dark:bg-slate-900/95 dark:text-orange-400">
                    <Sparkles className="h-3 w-3" />
                    {product.categoryName || 'Material Spec'}
                  </span>
                </div>

                {/* Photo Counter & Lightbox Zoom Button */}
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                  {displayImages.length > 1 && (
                    <span className="rounded-md bg-black/60 backdrop-blur px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                      {activeImageIndex + 1} / {displayImages.length}
                    </span>
                  )}
                  {activeImage && (
                    <button
                      type="button"
                      onClick={() => setIsLightboxOpen(true)}
                      className="p-1 rounded-md bg-black/60 hover:bg-black/80 backdrop-blur text-white transition-colors"
                      title="Enlarge photo view"
                      aria-label="Enlarge photo"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Arrow Navigation (Previous / Next) */}
                {displayImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrevImage();
                      }}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur hover:bg-black/80 transition-all opacity-85 hover:opacity-100 hover:scale-105 active:scale-95 shadow-md"
                      title="Previous photo (Left arrow)"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNextImage();
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur hover:bg-black/80 transition-all opacity-85 hover:opacity-100 hover:scale-105 active:scale-95 shadow-md"
                      title="Next photo (Right arrow)"
                      aria-label="Next photo"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}

                {/* Active Variant Label Overlay */}
                {selectedVariant && (
                  <div className="absolute bottom-3 left-3 right-3 z-10">
                    <div className="rounded-lg bg-black/65 backdrop-blur-md px-3 py-1.5 text-white flex items-center justify-between text-xs">
                      <span className="font-semibold truncate">{selectedVariant.name}</span>
                      <span className="text-[11px] text-slate-300 font-mono">{selectedVariant.sku}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Gallery Thumbnails Strip */}
              {displayImages.length > 1 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <span>Available Gallery Views ({displayImages.length})</span>
                    <span className="text-[10px] text-slate-400">Click thumbnail to view</span>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                    {displayImages.map((imgUrl, idx) => {
                      const isCurrent = activeImageIndex === idx;
                      const isFailed = failedImages.has(imgUrl);
                      const thumbSrc = isFailed ? getEmergencyFallback(imgUrl) : imgUrl;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectThumbnail(idx)}
                          className={`relative h-14 w-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                            isCurrent
                              ? 'border-orange-600 ring-2 ring-orange-500/40 scale-105 shadow-md'
                              : 'border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100 hover:border-slate-400'
                          }`}
                          title={`View Image ${idx + 1}`}
                          aria-label={`View photo ${idx + 1}`}
                        >
                          <img
                            src={thumbSrc}
                            alt={`Thumbnail ${idx + 1}`}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[9px] font-bold text-white leading-tight">
                            {idx + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Pricing & Key Technical Specs */}
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  SKU: {selectedVariant?.sku || product.sku}
                </p>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {product.name}
                </h3>
              </div>

              {/* Price Display */}
              <div className="rounded-xl bg-orange-50/80 dark:bg-orange-950/30 p-3.5 border border-orange-200/60 dark:border-orange-900/50">
                <span className="text-[11px] font-semibold text-orange-700 dark:text-orange-300">
                  Direct Factory Wholesale Rate
                </span>
                {product.priceOnRequest || activePrice <= 0 ? (
                  <p className="text-2xl font-extrabold text-orange-600 dark:text-orange-400">
                    Price on Request
                  </p>
                ) : (
                  <p className="text-2xl font-extrabold text-orange-600 dark:text-orange-400">
                    {formatPublicPrice(
                      activePrice,
                      publicSettings.currency.symbol,
                      product.unit
                    )}
                  </p>
                )}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Bulk order pricing, contractor volume schedules, and site logistics included on formal BOQ quotes.
                </p>
              </div>

              {/* Dynamic Attributes Grid if present */}
              {product.attributes && Object.keys(product.attributes).length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Key Technical Specifications:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {Object.entries(product.attributes).map(([key, value]) => (
                      <div
                        key={key}
                        className="rounded-lg bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 border border-slate-100 dark:border-slate-800 flex justify-between gap-2"
                      >
                        <span className="text-slate-500 capitalize">{key}:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-right truncate">
                          {String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Variants Selector with Color Dots & Instant Swatch Preview */}
              {product.variants && product.variants.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5 text-orange-600" />
                      <span>Color & Finish Selection:</span>
                    </span>
                    {selectedVariant && (
                      <span className="text-[11px] text-orange-600 dark:text-orange-400 font-medium">
                        {selectedVariant.name}
                      </span>
                    )}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {product.variants.map((v) => {
                      const isSelected = selectedVariant?.id === v.id;
                      const hex = getColorHex(v.name, v.color);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => handleSelectVariant(v)}
                          className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-orange-600 bg-orange-50/80 dark:bg-orange-950/40 text-orange-900 dark:text-orange-200 shadow-sm ring-1 ring-orange-500'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                          }`}
                        >
                          <span
                            className="h-4 w-4 rounded-full border border-black/15 shadow-2xs shrink-0"
                            style={{ backgroundColor: hex }}
                            title={v.color || v.name}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">{v.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {v.finish || v.color || 'Standard Finish'}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Installation Indicator */}
              {product.requiresInstallation && (
                <div className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-800">
                  <Wrench className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-900 dark:text-white">Turnkey Laying Available:</strong> Our certified masons provide laser-leveled installation and site sub-base preparation.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Description & Engineering Highlights */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Engineering & Product Details
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {product.description ||
                'Manufactured with strict quality controls to ensure uniform compressive strength, minimal water absorption, and high dimensional accuracy across large volume production consignments.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Dimensional Accuracy (±1mm)</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Hydraulic Cured Durability</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Tropical Weather Resistant</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              leftIcon={<Share2 className="h-4 w-4" />}
              onClick={handleShare}
            >
              Share Material
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<MessageSquare className="h-4 w-4 text-emerald-600" />}
                onClick={handleWhatsApp}
                className="flex-1 sm:flex-initial"
              >
                WhatsApp Sales
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                rightIcon={<ArrowRight className="h-4 w-4" />}
                onClick={() => {
                  onClose();
                  onRequestQuote(product);
                }}
                className="flex-1 sm:flex-initial"
              >
                Request Quotation
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Enlarged Photo Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Close enlarged view"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Photo Counter */}
            {displayImages.length > 1 && (
              <div className="absolute -top-10 left-0 text-xs font-semibold text-white/80">
                Photo {activeImageIndex + 1} of {displayImages.length}
              </div>
            )}

            {/* Main Lightbox Image */}
            <div className="relative w-full max-h-[80vh] flex items-center justify-center overflow-hidden rounded-2xl bg-black">
              <img
                src={activeImage}
                alt={`${product.name} - View ${activeImageIndex + 1}`}
                className="max-h-[80vh] w-auto max-w-full object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />

              {displayImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevImage();
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/85 text-white transition-all shadow-lg"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextImage();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/85 text-white transition-all shadow-lg"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
            </div>

            {/* Lightbox Caption / Product SKU */}
            <div className="mt-3 text-center text-xs text-white/70">
              <span className="font-semibold text-white">{product.name}</span>
              {selectedVariant && ` — ${selectedVariant.name}`}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
