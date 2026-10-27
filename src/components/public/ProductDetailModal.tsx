import React from 'react';
import {
  Package,
  Wrench,
  CheckCircle2,
  Share2,
  MessageSquare,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { PublicProduct, PublicProductVariant } from '../../types/public';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';
import { buildWhatsAppInquiryUrl, formatPublicPrice, sharePublicItem } from '../../utils/customerHelpers';
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
  const [selectedVariant, setSelectedVariant] = React.useState<PublicProductVariant | null>(null);

  React.useEffect(() => {
    if (product && product.variants && product.variants.length > 0) {
      setSelectedVariant(product.variants[0]);
    } else {
      setSelectedVariant(null);
    }
  }, [product]);

  if (!product) return null;

  const activePrice = selectedVariant?.priceOverride ?? product.sellingPrice;
  const activeImage = selectedVariant?.imageUrl || product.imageUrl;

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={product.name}
    >
      <div className="space-y-6 text-left">
        {/* Top Media & Specs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
          {/* Media Container */}
          <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-800">
            {activeImage ? (
              <img
                src={activeImage}
                alt={product.name}
                className="h-full w-full object-cover"
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
            <div className="absolute top-3 left-3">
              <span className="inline-flex items-center gap-1 rounded-md bg-white/90 backdrop-blur px-2.5 py-1 text-[11px] font-bold text-orange-600 shadow-sm dark:bg-slate-900/90 dark:text-orange-400">
                <Sparkles className="h-3 w-3" />
                {product.categoryName || 'Material Spec'}
              </span>
            </div>
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
            <div className="rounded-lg bg-orange-50/80 dark:bg-orange-950/30 p-3 border border-orange-200/60 dark:border-orange-900/50">
              <span className="text-[11px] font-semibold text-orange-700 dark:text-orange-300">
                Direct Factory Rate
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
                Wholesale contractor & site logistics pricing available upon quotation.
              </p>
            </div>

            {/* Dynamic Attributes Grid if present */}
            {product.attributes && Object.keys(product.attributes).length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Key Specifications:
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {Object.entries(product.attributes).map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded bg-slate-50 dark:bg-slate-800/80 px-2 py-1 border border-slate-100 dark:border-slate-800 flex justify-between"
                    >
                      <span className="text-slate-500 capitalize">{key}:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Variants Selector if present */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5 text-orange-600" />
                  <span>Color & Finish Selection:</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-all ${
                        selectedVariant?.id === v.id
                          ? 'border-orange-600 bg-orange-600 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                      }`}
                    >
                      {v.name}
                      {v.finish ? ` (${v.finish})` : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Installation Indicator */}
            {product.requiresInstallation && (
              <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2.5 border border-slate-200 dark:border-slate-800">
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
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
  );
};
