/**
 * Product Detail Drawer
 * Module 06 — Product Catalogue & Product Variants
 *
 * XFORCE Construction Ltd / X-FORCE BRICKS
 * Slide-over drawer providing immediate detailed inspection of
 * engineering specs, pricing margins, and variant matrices.
 */

import React from 'react';
import {
  X,
  Package,
  Layers,
  Edit2,
  DollarSign,
  TrendingUp,
  Globe,
  Sparkles,
  Wrench,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { Product } from '../../types/product';
import { formatCurrency } from '../../utils/formatters';
import { Button } from '../ui/Button';

export interface ProductDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  categoryName?: string;
  onEdit: (product: Product) => void;
  onManageVariants: (product: Product) => void;
  onTogglePublish: (product: Product) => void;
}

export const ProductDetailDrawer: React.FC<ProductDetailDrawerProps> = ({
  isOpen,
  onClose,
  product,
  categoryName,
  onEdit,
  onManageVariants,
  onTogglePublish,
}) => {
  if (!isOpen || !product) return null;

  const cost = product.costPrice || 0;
  const price = product.sellingPrice || 0;
  const marginAmount = price - cost;
  const marginPercentage = price > 0 && cost > 0 ? ((marginAmount / price) * 100).toFixed(1) : null;

  const primaryImage =
    (product.images && product.images.length > 0 ? product.images[0] : null) ||
    product.variants?.find((v) => v.imageUrl)?.imageUrl ||
    null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden text-left">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                {categoryName || product.categoryName || 'Material Specification'}
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                {product.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Image Preview */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-800">
              {primaryImage ? (
                <img
                  src={primaryImage}
                  alt={product.name}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400">
                  <Package className="h-10 w-10 stroke-1 mb-1" />
                  <span className="text-xs">No media attached</span>
                </div>
              )}

              <div className="absolute top-2 right-2 flex gap-1">
                {product.isPublished && (
                  <span className="rounded bg-emerald-600/90 text-white px-2 py-0.5 text-[10px] font-bold backdrop-blur">
                    Live on Web
                  </span>
                )}
                {product.isFeatured && (
                  <span className="rounded bg-orange-600/90 text-white px-2 py-0.5 text-[10px] font-bold backdrop-blur">
                    Featured
                  </span>
                )}
              </div>
            </div>

            {/* Quick Identifier Badges */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 font-mono font-semibold text-slate-700 dark:text-slate-300">
                SKU: {product.sku}
              </span>
              <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-slate-700 dark:text-slate-300">
                Unit: {product.unit}
              </span>
              {product.requiresInstallation && (
                <span className="rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 px-2.5 py-1 font-medium flex items-center gap-1">
                  <Wrench className="h-3 w-3" />
                  Laying Service
                </span>
              )}
            </div>

            {/* Pricing & Commercial Margin Card */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-3 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Commercial Matrix
              </span>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-[11px] text-slate-400">Selling Price</span>
                  <p className="text-base font-extrabold text-slate-900 dark:text-white">
                    {product.priceOnRequest ? (
                      <span className="text-orange-600 text-xs font-bold">Upon Request</span>
                    ) : (
                      formatCurrency(price)
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400">Direct Cost</span>
                  <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                    {cost > 0 ? formatCurrency(cost) : '—'}
                  </p>
                </div>
              </div>

              {marginPercentage && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    Gross Margin
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(marginAmount)} ({marginPercentage}%)
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Engineering Description
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {product.description ||
                  product.shortDescription ||
                  'No detailed specifications recorded for this catalogue item.'}
              </p>
            </div>

            {/* Dynamic Attributes */}
            {product.attributes && Object.keys(product.attributes).length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Technical Specifications
                </span>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 text-xs overflow-hidden">
                  {Object.entries(product.attributes).map(([key, val]) => (
                    <div key={key} className="p-2 flex justify-between bg-white dark:bg-slate-900">
                      <span className="text-slate-500">{key}</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Variants Matrix */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Variants ({product.variants?.length || 0})
                </span>
                <button
                  type="button"
                  onClick={() => onManageVariants(product)}
                  className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline"
                >
                  Manage →
                </button>
              </div>

              {product.variants && product.variants.length > 0 ? (
                <div className="space-y-1.5">
                  {product.variants.map((v) => (
                    <div
                      key={v.id}
                      className="rounded-lg border border-slate-200 dark:border-slate-800 p-2 text-xs flex items-center justify-between bg-white dark:bg-slate-900"
                    >
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                          {v.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {v.sku}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {v.priceOverride ? formatCurrency(v.priceOverride) : 'Base Price'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No variants created.</p>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onEdit(product)}
                leftIcon={<Edit2 className="h-3.5 w-3.5" />}
                className="flex-1 text-xs"
              >
                Edit Item
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onManageVariants(product)}
                leftIcon={<Layers className="h-3.5 w-3.5" />}
                className="flex-1 text-xs"
              >
                Variants
              </Button>
            </div>

            <Button
              type="button"
              variant={product.isPublished ? 'ghost' : 'primary'}
              size="sm"
              onClick={() => onTogglePublish(product)}
              className="w-full text-xs"
            >
              <Globe className="h-3.5 w-3.5 mr-1" />
              {product.isPublished ? 'Unpublish from Storefront' : 'Publish to Storefront'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
