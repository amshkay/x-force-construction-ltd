/**
 * Category Manager Modal
 * Module 06 — Product Catalogue & Product Variants
 *
 * XFORCE Construction Ltd / X-FORCE BRICKS
 * Generic Building Materials Architecture
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  Package,
  Layers,
  Sparkles,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { ProductCategory, CategoryFormData } from '../../types/product';
import { productService } from '../../services/product.service';
import { mediaService } from '../../services/media.service';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Switch } from '../ui/Switch';
import { ImageInputWithUpload } from '../ui/ImageInputWithUpload';
import { useToast } from '../ui/Toast';

export interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriesChanged: () => void;
  staffUserId: string;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  onCategoriesChanged,
  staffUserId,
}) => {
  const toast = useToast();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    slug: '',
    description: '',
    imageUrl: '',
    parentId: null,
    sortOrder: 1,
    isActive: true,
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
      const res = await mediaService.uploadMedia(file, `categories/${Date.now()}_${cleanName}`, {
        bucket: 'product-media',
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
      });
      if (res.url) {
        setFormData((prev) => ({ ...prev, imageUrl: res.url }));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload category image.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const loadCategories = async () => {
    try {
      const list = await productService.getCategories();
      setCategories(list);
    } catch (err) {
      console.error('[CategoryManagerModal] Error loading categories:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setEditingCategoryId(null);
    setShowAddForm(false);
    setErrorMsg(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      imageUrl: '',
      parentId: null,
      sortOrder: (categories.length || 0) + 1,
      isActive: true,
    });
  };

  const handleStartEdit = (cat: ProductCategory) => {
    setEditingCategoryId(cat.id);
    setShowAddForm(true);
    setErrorMsg(null);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      imageUrl: cat.imageUrl || '',
      parentId: cat.parentId || null,
      sortOrder: cat.sortOrder || 1,
      isActive: cat.isActive !== false,
    });
  };

  const handleNameChange = (name: string) => {
    const slug = productService.generateSlug(name);
    setFormData((prev) => ({
      ...prev,
      name,
      slug: editingCategoryId ? prev.slug : slug,
    }));
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.name.trim()) {
      setErrorMsg('Category name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await productService.saveCategory(formData, editingCategoryId || undefined, staffUserId);
      toast.success(
        editingCategoryId ? 'Category updated successfully.' : 'New category created.'
      );
      await loadCategories();
      onCategoriesChanged();
      resetForm();
    } catch (err: any) {
      console.error('[CategoryManagerModal] Save error:', err);
      setErrorMsg(err.message || 'Failed to save category.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (cat: ProductCategory) => {
    if ((cat.productCount || 0) > 0) {
      toast.warning(`Cannot delete "${cat.name}" because it contains ${cat.productCount} product(s). Reassign them first.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;

    try {
      await productService.deleteCategory(cat.id, staffUserId);
      toast.success(`Category "${cat.name}" deleted.`);
      await loadCategories();
      onCategoriesChanged();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete category.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Product Category Hierarchy"
    >
      <div className="space-y-6 text-left max-h-[80vh] overflow-y-auto pr-1">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              Taxonomy & Classification
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              Organize building materials into flexible public storefront and reporting categories.
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
              New Category
            </Button>
          )}
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <form
            onSubmit={handleSaveCategory}
            className="rounded-xl border border-orange-200 dark:border-orange-900/50 bg-white dark:bg-slate-900 p-4 space-y-4 shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                <FolderTree className="h-4 w-4 text-orange-600" />
                <span>{editingCategoryId ? 'Edit Category' : 'Create New Category'}</span>
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
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  id="input-category-name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Kerbs, Channels & Drainage"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  URL Slug <span className="text-rose-500">*</span>
                </label>
                <Input
                  id="input-category-slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="e.g. kerbs-channels-drainage"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Parent Category (Optional Hierarchy)
                </label>
                <Select
                  id="select-parent-category"
                  value={formData.parentId || ''}
                  onChange={(e) => setFormData({ ...formData, parentId: e.target.value || null })}
                  options={[
                    { value: '', label: 'None (Top Level Category)' },
                    ...categories
                      .filter((c) => c.id !== editingCategoryId)
                      .map((c) => ({ value: c.id, label: c.name })),
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Display Order
                </label>
                <Input
                  id="input-category-sort"
                  type="number"
                  min="1"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value, 10) || 1 })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description
              </label>
              <Textarea
                id="textarea-category-description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                placeholder="Brief summary of building materials classified under this group..."
              />
            </div>

            <ImageInputWithUpload
              id="input-category-image"
              label="Category Cover Image (Optional)"
              helperText="Upload an image from your device or paste an online HTTPS image URL."
              value={formData.imageUrl}
              onChange={(url) => setFormData({ ...formData, imageUrl: url })}
              onRemove={() => setFormData({ ...formData, imageUrl: '' })}
              bucket="product-media"
              folder="categories"
              placeholder="https://images.unsplash.com/... or paste image URL"
              previewHeight="h-28"
            />

            <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50 dark:bg-slate-900/40">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Category Active
                </span>
                <span className="text-[10px] text-slate-500">
                  Visible in customer navigation and product tagging
                </span>
              </div>
              <Switch
                id="switch-category-active"
                checked={Boolean(formData.isActive)}
                onChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={resetForm} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                {editingCategoryId ? 'Update Category' : 'Save Category'}
              </Button>
            </div>
          </form>
        )}

        {/* Existing Categories Table */}
        <div className="space-y-2">
          {categories.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No categories found.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              {categories.map((cat) => {
                const parentCat = categories.find((c) => c.id === cat.parentId);
                return (
                  <div
                    key={cat.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                        <FolderTree className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                            {cat.name}
                          </h5>
                          {parentCat && (
                            <span className="rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.2 text-[9px]">
                              in {parentCat.name}
                            </span>
                          )}
                          {!cat.isActive && (
                            <span className="rounded bg-rose-100 text-rose-700 px-1.5 py-0.2 text-[9px] font-semibold">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {cat.description || 'Generic building material taxonomy.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                        {cat.productCount || 0} items
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(cat)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition"
                          title="Edit category"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition"
                          title="Delete category"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
