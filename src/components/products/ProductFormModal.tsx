/**
 * Product Form Modal (Create / Edit)
 * Module 06 — Product Catalogue & Product Variants
 *
 * XFORCE Construction Ltd / X-FORCE BRICKS
 * Generic Building Materials Architecture
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Package,
  Plus,
  Trash2,
  Sparkles,
  Layers,
  Image as ImageIcon,
  DollarSign,
  AlertCircle,
  HelpCircle,
  Upload,
} from 'lucide-react';
import { mediaService } from '../../services/media.service';
import {
  Product,
  ProductCategory,
  ProductFormData,
  PRODUCT_UNITS,
  ProductUnit,
} from '../../types/product';
import { productService } from '../../services/product.service';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Switch } from '../ui/Switch';
import { useToast } from '../ui/Toast';
import { MultiImageInputWithUpload } from '../ui/MultiImageInputWithUpload';

export interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  categories: ProductCategory[];
  onSaved: (product: Product) => void;
  staffUserId: string;
}

const COMMON_ATTRIBUTES = [
  'Dimensions',
  'Compressive Strength',
  'Weight',
  'Water Absorption',
  'Coverage (Units/sqm)',
  'Color Range',
  'Edge Profile',
  'Density',
];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  product,
  categories,
  onSaved,
  staffUserId,
}) => {
  const toast = useToast();
  const isEditing = Boolean(product);

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    sku: '',
    slug: '',
    categoryId: categories[0]?.id || '',
    shortDescription: '',
    description: '',
    unit: 'PCS',
    sellingPrice: 0,
    costPrice: 0,
    priceOnRequest: false,
    minimumStock: 0,
    reorderLevel: 0,
    requiresInstallation: false,
    isFeatured: false,
    isActive: true,
    isPublished: true,
    sortOrder: 1,
    images: [],
    attributes: {},
  });

  const [imageUrlInput, setImageUrlInput] = useState('');
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize on open or product change
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        sku: product.sku,
        slug: product.slug || '',
        categoryId: product.categoryId,
        shortDescription: product.shortDescription || '',
        description: product.description || '',
        unit: product.unit || 'PCS',
        sellingPrice: product.sellingPrice || 0,
        costPrice: product.costPrice || 0,
        priceOnRequest: Boolean(product.priceOnRequest),
        minimumStock: product.minimumStock || 0,
        reorderLevel: product.reorderLevel || 0,
        requiresInstallation: Boolean(product.requiresInstallation),
        isFeatured: Boolean(product.isFeatured),
        isActive: product.isActive !== false,
        isPublished: product.isPublished !== false,
        sortOrder: product.sortOrder || 1,
        images: product.images ? [...product.images] : [],
        attributes: product.attributes ? { ...product.attributes } : {},
      });
    } else {
      setFormData({
        name: '',
        sku: '',
        slug: '',
        categoryId: categories[0]?.id || '',
        shortDescription: '',
        description: '',
        unit: 'PCS',
        sellingPrice: 0,
        costPrice: 0,
        priceOnRequest: false,
        minimumStock: 50,
        reorderLevel: 100,
        requiresInstallation: false,
        isFeatured: false,
        isActive: true,
        isPublished: true,
        sortOrder: 1,
        images: [],
        attributes: {
          'Dimensions': '230 x 220 x 115 mm',
          'Compressive Strength': '7.5 N/mm²',
        },
      });
    }
    setImageUrlInput('');
    setValidationError(null);
  }, [product, isOpen, categories]);

  const handleGenerateSku = () => {
    const selectedCat = categories.find((c) => c.id === formData.categoryId);
    const catPrefix = selectedCat?.name ? selectedCat.name.substring(0, 3) : 'XF';
    const generated = productService.generateSku(catPrefix, formData.name || 'MATERIAL');
    setFormData((prev) => ({ ...prev, sku: generated }));
  };

  const handleAddImage = () => {
    const trimmed = imageUrlInput.trim();
    if (!trimmed) return;
    if (formData.images && formData.images.includes(trimmed)) {
      toast.warning('Image URL is already added.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      images: [...(prev.images || []), trimmed],
    }));
    setImageUrlInput('');
  };

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLocalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const res = await mediaService.uploadMedia(file, `products/${Date.now()}_${cleanName}`, {
          bucket: 'product-media',
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
        });
        return res.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter(Boolean);

      setFormData((prev) => ({
        ...prev,
        images: [...(prev.images || []), ...validUrls],
      }));
      toast.success(`Successfully uploaded ${validUrls.length} product image(s).`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload product images.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index),
    }));
  };

  const handleAddAttribute = () => {
    const key = newAttrKey.trim();
    const val = newAttrValue.trim();
    if (!key || !val) {
      toast.warning('Please enter both specification name and value.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      attributes: {
        ...(prev.attributes || {}),
        [key]: val,
      },
    }));
    setNewAttrKey('');
    setNewAttrValue('');
  };

  const handleRemoveAttribute = (key: string) => {
    setFormData((prev) => {
      const next = { ...(prev.attributes || {}) };
      delete next[key];
      return { ...prev, attributes: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!formData.name.trim()) {
      setValidationError('Product name is required.');
      return;
    }
    if (!formData.sku.trim()) {
      setValidationError('Product SKU is required.');
      return;
    }
    if (!formData.categoryId) {
      setValidationError('Please select a category.');
      return;
    }

    try {
      setIsSubmitting(true);
      let saved: Product;
      if (isEditing && product) {
        saved = await productService.updateProduct(product.id, formData, staffUserId);
        toast.success(`Product "${saved.name}" updated successfully.`);
      } else {
        saved = await productService.createProduct(formData, staffUserId);
        toast.success(`Product "${saved.name}" added to catalogue.`);
      }
      onSaved(saved);
      onClose();
    } catch (err: any) {
      console.error('[ProductFormModal] Save error:', err);
      setValidationError(err.message || 'Failed to save product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={isEditing ? `Edit Product: ${product?.name}` : 'Add New Catalogue Product'}
    >
      <form onSubmit={handleSubmit} className="space-y-6 text-left max-h-[80vh] overflow-y-auto pr-1">
        {validationError && (
          <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 flex items-center gap-2 border border-rose-200 dark:border-rose-900">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* SECTION 1: Core Identification */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
            <Package className="h-4 w-4 text-orange-600" />
            <span>1. Core Identification & Category</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Product Name <span className="text-rose-500">*</span>
              </label>
              <Input
                id="input-product-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Standard Interlocking Brick (Hydraulic Cured)"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <Select
                id="select-product-category"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Stock Keeping Unit (SKU) <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <Input
                  id="input-product-sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                  placeholder="e.g. XF-IB-STD-001"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateSku}
                  className="shrink-0 text-xs"
                  title="Generate SKU automatically"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1 text-orange-600" />
                  Auto SKU
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unit of Measure <span className="text-rose-500">*</span>
              </label>
              <Select
                id="select-product-unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                options={PRODUCT_UNITS.map((u) => ({ value: u, label: u }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Short Description (Listing Summary)
            </label>
            <Input
              id="input-product-short-description"
              value={formData.shortDescription || ''}
              onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
              placeholder="Concise 1-line summary displayed on product cards and invoices"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Technical & Engineering Specifications
            </label>
            <Textarea
              id="textarea-product-description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Provide engineering parameters, curing methods, mix ratio details, and structural application advice..."
            />
          </div>
        </div>

        {/* SECTION 2: Pricing & Inventory Control */}
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            <span>2. Pricing & Costing Engine</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Standard Selling Price (₦)
              </label>
              <Input
                id="input-product-selling-price"
                type="number"
                min="0"
                step="0.01"
                disabled={formData.priceOnRequest}
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
              {formData.priceOnRequest && (
                <span className="text-[10px] text-orange-600 dark:text-orange-400">
                  Deactivated: Price on Request mode active
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Direct Cost Price (₦ - Staff Confidential)
              </label>
              <Input
                id="input-product-cost-price"
                type="number"
                min="0"
                step="0.01"
                value={formData.costPrice ?? ''}
                onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
              <span className="text-[10px] text-slate-400">
                Used for gross margin calculations
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reorder Threshold Level
              </label>
              <Input
                id="input-product-reorder-level"
                type="number"
                min="0"
                value={formData.reorderLevel}
                onChange={(e) => setFormData({ ...formData, reorderLevel: parseInt(e.target.value, 10) || 0 })}
                placeholder="100"
              />
              <span className="text-[10px] text-slate-400">
                Low-stock notification trigger
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-900/40">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Price on Request Mode
                </span>
                <span className="text-[11px] text-slate-500">
                  Hides exact numeric rate on public website and invites direct inquiry
                </span>
              </div>
              <Switch
                id="switch-price-on-request"
                checked={Boolean(formData.priceOnRequest)}
                onChange={(checked) => setFormData({ ...formData, priceOnRequest: checked })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-900/40">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Turnkey Installation Required
                </span>
                <span className="text-[11px] text-slate-500">
                  Flags item as requiring masonry installation laying service
                </span>
              </div>
              <Switch
                id="switch-requires-installation"
                checked={Boolean(formData.requiresInstallation)}
                onChange={(checked) => setFormData({ ...formData, requiresInstallation: checked })}
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: Dynamic Generic Attributes */}
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-blue-600" />
              <span>3. Generic Material Specifications & Attributes</span>
            </h4>
            <span className="text-[10px] text-slate-400">
              Non-hardcoded flexible parameters
            </span>
          </div>

          {/* Preset quick buttons */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[11px] text-slate-500 self-center mr-1">Quick Add:</span>
            {COMMON_ATTRIBUTES.map((attr) => (
              <button
                key={attr}
                type="button"
                onClick={() => setNewAttrKey(attr)}
                className="rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2 py-0.5 text-[10px] text-slate-700 dark:text-slate-300 transition"
              >
                + {attr}
              </button>
            ))}
          </div>

          {/* Add custom attribute input */}
          <div className="flex gap-2 items-center">
            <Input
              id="input-new-attribute-key"
              value={newAttrKey}
              onChange={(e) => setNewAttrKey(e.target.value)}
              placeholder="Specification Name (e.g. Dimensions)"
              className="flex-1"
            />
            <Input
              id="input-new-attribute-value"
              value={newAttrValue}
              onChange={(e) => setNewAttrValue(e.target.value)}
              placeholder="Value (e.g. 230 x 220 x 115 mm)"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddAttribute}
              className="shrink-0"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          {/* Render existing attributes */}
          {formData.attributes && Object.keys(formData.attributes).length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(formData.attributes).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-xs"
                >
                  <div className="overflow-hidden">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block truncate">
                      {key}:
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 text-[11px] truncate block">
                      {value}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttribute(key)}
                    className="text-slate-400 hover:text-rose-600 p-1 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">
              No technical attributes attached yet. Add dimensions, compressive strength, or weight above.
            </p>
          )}
        </div>

        {/* SECTION 4: Media Images */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <MultiImageInputWithUpload
            id="product-images-uploader"
            label="4. Product Media & Gallery Images"
            helperText="Upload photographs from device or paste image URLs. Images are stored permanently in Supabase Cloud Storage."
            images={formData.images || []}
            onChange={(imgs) => setFormData((prev) => ({ ...prev, images: imgs }))}
            bucket="product-media"
            folder="products"
            maxImages={12}
          />
        </div>

        {/* SECTION 5: Visibility & Status */}
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            5. Visibility & Lifecycle Status
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50 dark:bg-slate-900/40">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Published Online
                </span>
                <span className="text-[10px] text-slate-500">
                  Visible to public storefront visitors
                </span>
              </div>
              <Switch
                id="switch-is-published"
                checked={Boolean(formData.isPublished)}
                onChange={(checked) => setFormData({ ...formData, isPublished: checked })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50 dark:bg-slate-900/40">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Active Status
                </span>
                <span className="text-[10px] text-slate-500">
                  Internal operational availability
                </span>
              </div>
              <Switch
                id="switch-is-active"
                checked={Boolean(formData.isActive)}
                onChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50 dark:bg-slate-900/40">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Featured Showcase
                </span>
                <span className="text-[10px] text-slate-500">
                  Highlighted on homepage grid
                </span>
              </div>
              <Switch
                id="switch-is-featured"
                checked={Boolean(formData.isFeatured)}
                onChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
              />
            </div>
          </div>
        </div>

        {/* Modal Controls */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 sticky bottom-0 bg-white dark:bg-slate-900 py-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            {isEditing ? 'Save Product Changes' : 'Create Product'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
