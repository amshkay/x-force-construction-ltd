/**
 * Variant Manager Modal
 * Module 06 — Product Catalogue & Product Variants
 *
 * XFORCE Construction Ltd / X-FORCE BRICKS
 * Allows managing color, finish, dimensional, and pricing variations
 * for any generic building material product.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  CheckCircle2,
  XCircle,
  DollarSign,
  AlertCircle,
  Package,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { Product, ProductVariant, VariantFormData } from '../../types/product';
import { productService } from '../../services/product.service';
import { mediaService } from '../../services/media.service';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Switch } from '../ui/Switch';
import { useToast } from '../ui/Toast';
import { formatCurrency } from '../../utils/formatters';
import { ImageInputWithUpload } from '../ui/ImageInputWithUpload';

export interface VariantManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onUpdated: (updatedProduct: Product) => void;
  staffUserId: string;
}

export const VariantManagerModal: React.FC<VariantManagerModalProps> = ({
  isOpen,
  onClose,
  product,
  onUpdated,
  staffUserId,
}) => {
  const toast = useToast();
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState<VariantFormData>({
    name: '',
    sku: '',
    color: '',
    size: '',
    finish: '',
    description: '',
    imageUrl: '',
    priceOverride: null,
    costPriceOverride: null,
    isActive: true,
    attributes: {},
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLocalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setErrorMsg(null);
    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const res = await mediaService.uploadMedia(file, `variants/${Date.now()}_${cleanName}`, {
        bucket: 'product-media',
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
      });
      if (res.url) {
        setFormData((prev) => ({ ...prev, imageUrl: res.url }));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload variant image.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (product) {
      setVariants(product.variants || []);
    } else {
      setVariants([]);
    }
    resetForm();
  }, [product, isOpen]);

  const resetForm = () => {
    setEditingVariantId(null);
    setShowAddForm(false);
    setErrorMsg(null);
    if (product) {
      const nextNum = (product.variants?.length || 0) + 1;
      setFormData({
        name: '',
        sku: `${product.sku}-V${nextNum}`,
        color: '',
        size: '',
        finish: '',
        description: '',
        imageUrl: '',
        priceOverride: null,
        costPriceOverride: null,
        isActive: true,
        attributes: {},
      });
    }
  };

  const handleStartEdit = (v: ProductVariant) => {
    setEditingVariantId(v.id);
    setShowAddForm(true);
    setErrorMsg(null);
    setFormData({
      name: v.name,
      sku: v.sku,
      color: v.color || '',
      size: v.size || '',
      finish: v.finish || '',
      description: v.description || '',
      imageUrl: v.imageUrl || '',
      priceOverride: v.priceOverride ?? null,
      costPriceOverride: v.costPriceOverride ?? null,
      isActive: v.isActive !== false,
      attributes: v.attributes ? { ...v.attributes } : {},
    });
  };

  const handleGenerateSku = () => {
    if (!product) return;
    const suffix = formData.name ? formData.name.substring(0, 3) : `V${variants.length + 1}`;
    const generated = `${product.sku}-${suffix.toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
    setFormData((prev) => ({ ...prev, sku: generated }));
  };

  const handleSaveVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setErrorMsg(null);

    if (!formData.name.trim()) {
      setErrorMsg('Variant name is required.');
      return;
    }
    if (!formData.sku.trim()) {
      setErrorMsg('Variant SKU is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await productService.saveVariant(
        product.id,
        formData,
        editingVariantId || undefined,
        staffUserId
      );

      // Refresh product from database/store
      const refreshed = await productService.getProductById(product.id);
      if (refreshed) {
        setVariants(refreshed.variants || []);
        onUpdated(refreshed);
      }

      toast.success(
        editingVariantId ? 'Variant updated successfully.' : 'New variant created.'
      );
      resetForm();
    } catch (err: any) {
      console.error('[VariantManagerModal] Save error:', err);
      setErrorMsg(err.message || 'Failed to save variant.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!product) return;
    if (!window.confirm('Are you sure you want to delete this variant?')) return;

    try {
      await productService.deleteVariant(product.id, variantId, staffUserId);
      const refreshed = await productService.getProductById(product.id);
      if (refreshed) {
        setVariants(refreshed.variants || []);
        onUpdated(refreshed);
      }
      toast.success('Variant removed.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete variant.');
    }
  };

  const handleToggleStatus = async (variantId: string, currentStatus: boolean) => {
    if (!product) return;
    try {
      await productService.toggleVariantStatus(product.id, variantId, !currentStatus, staffUserId);
      const refreshed = await productService.getProductById(product.id);
      if (refreshed) {
        setVariants(refreshed.variants || []);
        onUpdated(refreshed);
      }
      toast.success(`Variant ${!currentStatus ? 'activated' : 'deactivated'}.`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle variant status.');
    }
  };

  if (!product) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={`Product Variants: ${product.name}`}
    >
      <div className="space-y-6 text-left max-h-[80vh] overflow-y-auto pr-1">
        {/* Header Summary */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              Parent Product SKU: {product.sku}
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              Base Price: {formatCurrency(product.sellingPrice)} / {product.unit}
            </p>
          </div>
          {!showAddForm && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                resetForm();
                setShowAddForm(true);
              }}
              className="text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Variant
            </Button>
          )}
        </div>

        {/* Form Container (When Adding or Editing) */}
        {showAddForm && (
          <form
            onSubmit={handleSaveVariant}
            className="rounded-xl border border-orange-200 dark:border-orange-900/50 bg-white dark:bg-slate-900 p-4 space-y-4 shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-orange-600" />
                <span>{editingVariantId ? 'Edit Variant' : 'Create New Variant'}</span>
              </h4>
              <button
                type="button"
                onClick={resetForm}
                className="text-slate-400 hover:text-slate-600 text-xs font-medium"
              >
                Cancel
              </button>
            </div>

            {errorMsg && (
              <div className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 flex items-center gap-2 border border-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Variant Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  id="input-variant-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Charcoal Black Interlocking"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Variant SKU <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-1.5">
                  <Input
                    id="input-variant-sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                    placeholder="e.g. XF-IB-STD-001-BLK"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateSku}
                    className="shrink-0 text-xs px-2"
                    title="Generate SKU"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Color / Shade
                </label>
                <Input
                  id="input-variant-color"
                  value={formData.color || ''}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="e.g. Charcoal Black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Size / Thickness
                </label>
                <Input
                  id="input-variant-size"
                  value={formData.size || ''}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  placeholder="e.g. 60mm Standard"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Surface Finish
                </label>
                <Input
                  id="input-variant-finish"
                  value={formData.finish || ''}
                  onChange={(e) => setFormData({ ...formData, finish: e.target.value })}
                  placeholder="e.g. Textured Cobblestone"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Price Override (₦ - Optional)
                </label>
                <Input
                  id="input-variant-price-override"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.priceOverride !== null && formData.priceOverride !== undefined ? formData.priceOverride : ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priceOverride: e.target.value === '' ? null : parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder={`Inherits base price (${formatCurrency(product.sellingPrice)})`}
                />
                <span className="text-[10px] text-slate-400">
                  Leave blank to inherit product base price
                </span>
              </div>

              <ImageInputWithUpload
                id="input-variant-image"
                label="Variant Photo (Optional)"
                helperText="Upload a color/finish swatch photo or paste an online HTTPS image URL."
                value={formData.imageUrl}
                onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                onRemove={() => setFormData({ ...formData, imageUrl: '' })}
                bucket="product-media"
                folder="variants"
                placeholder="https://images.unsplash.com/... or paste image URL"
                previewHeight="h-24"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50 dark:bg-slate-900/40">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Variant Active
                </span>
                <span className="text-[10px] text-slate-500">
                  Available for quotation and purchase order line items
                </span>
              </div>
              <Switch
                id="switch-variant-active"
                checked={Boolean(formData.isActive)}
                onChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={resetForm} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                {editingVariantId ? 'Update Variant' : 'Save Variant'}
              </Button>
            </div>
          </form>
        )}

        {/* Existing Variants List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Configured Variants ({variants.length})
            </h4>
          </div>

          {variants.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center">
              <Package className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                No distinct variants configured yet.
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                The product currently uses its default base specifications and price.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {variants.map((v) => {
                const effectivePrice = v.priceOverride ?? product.sellingPrice;
                return (
                  <div
                    key={v.id}
                    className={`rounded-xl border p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
                      v.isActive
                        ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                        : 'border-slate-200/60 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/30 opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800">
                        {v.imageUrl ? (
                          <img
                            src={v.imageUrl}
                            alt={v.name}
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Layers className="h-5 w-5 text-slate-400" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                            {v.name}
                          </h5>
                          {v.isActive ? (
                            <span className="rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 text-[9px] font-semibold">
                              Active
                            </span>
                          ) : (
                            <span className="rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 text-[9px] font-semibold">
                              Inactive
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="font-mono font-medium text-slate-600 dark:text-slate-400">
                            {v.sku}
                          </span>
                          {v.color && <span>• Color: {v.color}</span>}
                          {v.size && <span>• Size: {v.size}</span>}
                          {v.finish && <span>• Finish: {v.finish}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Unit Price</span>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {formatCurrency(effectivePrice)}
                        </p>
                        {v.priceOverride !== null && v.priceOverride !== undefined && (
                          <span className="text-[9px] text-orange-600 dark:text-orange-400">
                            Overridden
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-3">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(v)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition"
                          title="Edit variant"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(v.id, v.isActive !== false)}
                          className={`p-1.5 rounded transition ${
                            v.isActive
                              ? 'text-emerald-600 hover:text-emerald-700'
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                          title={v.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {v.isActive ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteVariant(v.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition"
                          title="Delete variant"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
