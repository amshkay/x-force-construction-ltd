import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  Palette,
  Image as ImageIcon,
  Sparkles,
  Layers,
  Package,
  Upload,
} from 'lucide-react';
import { mediaService } from '../../services/media.service';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { MultiImageInputWithUpload } from '../ui/MultiImageInputWithUpload';
import { DesignItem, DesignFormData } from '../../types/mediaGallery';

export interface DesignFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  design?: DesignItem | null;
  onSave: (data: DesignFormData, existingId?: string) => Promise<boolean>;
}

const COLOR_PRESETS = [
  { name: 'Natural Terracotta', hex: '#c2410c' },
  { name: 'Warm Sahara Sand', hex: '#d97706' },
  { name: 'Charcoal Basalt', hex: '#1e293b' },
  { name: 'Natural Ochre', hex: '#b45309' },
  { name: 'Architectural Slate', hex: '#334155' },
  { name: 'Granite Gray', hex: '#64748b' },
  { name: 'Heritage Brick Red', hex: '#991b1b' },
];

export const DesignFormModal: React.FC<DesignFormModalProps> = ({
  isOpen,
  onClose,
  design,
  onSave,
}) => {
  const isEditing = Boolean(design);

  const [title, setTitle] = useState<string>('');
  const [slug, setSlug] = useState<string>('');
  const [category, setCategory] = useState<string>('Residential Facade');
  const [description, setDescription] = useState<string>('');
  const [patternStyle, setPatternStyle] = useState<string>('');
  const [applicationType, setApplicationType] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isPublished, setIsPublished] = useState<boolean>(true);
  const [isFeatured, setIsFeatured] = useState<boolean>(false);

  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLocalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);
    setErrorMsg(null);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const res = await mediaService.uploadMedia(file, `designs/${Date.now()}_${cleanName}`, {
          bucket: 'project-media',
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
        });
        return res.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter(Boolean);

      setImages((prev) => [...prev, ...validUrls]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload design images.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const [colorPalette, setColorPalette] = useState<{ name: string; hex: string }[]>([]);
  const [newColorName, setNewColorName] = useState<string>('');
  const [newColorHex, setNewColorHex] = useState<string>('#c2410c');

  const [suitableProducts, setSuitableProducts] = useState<string[]>([]);
  const [productsInput, setProductsInput] = useState<string>('');

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (design) {
      setTitle(design.title);
      setSlug(design.slug);
      setCategory(design.category);
      setDescription(design.description);
      setPatternStyle(design.patternStyle || '');
      setApplicationType(design.applicationType || '');
      setVideoUrl(design.videoUrl || '');
      setSortOrder(design.sortOrder || 0);
      setIsPublished(design.isPublished);
      setIsFeatured(design.isFeatured ?? false);
      setImages(design.images || []);
      setColorPalette(design.colorPalette || []);
      setSuitableProducts(design.suitableProducts || []);
      setProductsInput((design.suitableProducts || []).join(', '));
    } else {
      setTitle('');
      setSlug('');
      setCategory('Residential Facade');
      setDescription('');
      setPatternStyle('Mortarless Interlocking Dry-Stack');
      setApplicationType('Architectural Perimeter & Facade');
      setVideoUrl('');
      setSortOrder(0);
      setIsPublished(true);
      setIsFeatured(false);
      setImages([]);
      setColorPalette([
        { name: 'Natural Terracotta', hex: '#c2410c' },
        { name: 'Charcoal Basalt', hex: '#1e293b' },
      ]);
      setSuitableProducts(['220mm Hydraform Interlocking Earth Block']);
      setProductsInput('220mm Hydraform Interlocking Earth Block');
    }
    setErrorMsg(null);
  }, [design, isOpen]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isEditing || !slug) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
      );
    }
  };

  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    setImages((prev) => [...prev, newImageUrl.trim()]);
    setNewImageUrl('');
  };

  const handleRemoveImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddColor = () => {
    if (!newColorName.trim()) return;
    setColorPalette((prev) => [
      ...prev,
      { name: newColorName.trim(), hex: newColorHex },
    ]);
    setNewColorName('');
  };

  const handleApplyPresetColor = (preset: { name: string; hex: string }) => {
    if (!colorPalette.some((c) => c.name === preset.name)) {
      setColorPalette((prev) => [...prev, preset]);
    }
  };

  const handleRemoveColor = (idx: number) => {
    setColorPalette((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddProduct = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const parts = productsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      setSuitableProducts(Array.from(new Set([...suitableProducts, ...parts])));
      setProductsInput('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Design title is required.');
      return;
    }
    if (!category.trim()) {
      setErrorMsg('Category is required.');
      return;
    }

    let finalProducts = [...suitableProducts];
    if (productsInput.trim()) {
      const extra = productsInput.split(',').map((s) => s.trim()).filter(Boolean);
      finalProducts = Array.from(new Set([...finalProducts, ...extra]));
    }

    setIsSaving(true);
    setErrorMsg(null);

    const formData: DesignFormData = {
      title: title.trim(),
      slug: slug.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: description.trim(),
      category: category.trim(),
      patternStyle: patternStyle.trim() || undefined,
      applicationType: applicationType.trim() || undefined,
      videoUrl: videoUrl.trim() || undefined,
      images,
      colorPalette,
      suitableProducts: finalProducts,
      sortOrder,
      isPublished,
      isFeatured,
    };

    const ok = await onSave(formData, design?.id);
    setIsSaving(false);
    if (ok) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={isEditing ? 'Edit Architectural Design' : 'Add New Design Inspiration'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left text-xs" id="form-design-modal">
        {errorMsg && (
          <div className="rounded-lg bg-red-50 p-2.5 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900">
            {errorMsg}
          </div>
        )}

        {/* Title & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Design Title *
            </label>
            <Input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. Modern Terracotta Stretcher Bond Facade"
              required
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
            >
              <option value="Residential Facade">Residential Facade</option>
              <option value="Commercial Driveway">Commercial Driveway</option>
              <option value="Estate Perimeter">Estate Perimeter</option>
              <option value="Courtyard & Patio">Courtyard & Patio</option>
              <option value="Heavy Industrial">Heavy Industrial</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Pattern Style
            </label>
            <Input
              value={patternStyle}
              onChange={(e) => setPatternStyle(e.target.value)}
              placeholder="e.g. 45° Herringbone, Dry-Stack"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Application Type
            </label>
            <Input
              value={applicationType}
              onChange={(e) => setApplicationType(e.target.value)}
              placeholder="e.g. Driveway & Entrance Pavement"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Video Walkthrough URL (Optional)
            </label>
            <Input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>

        {/* Narrative Description */}
        <div>
          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Design Description & Concept
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
            placeholder="Describe the architectural concept, aesthetic character, and recommended lighting or mortar joint accents..."
          />
        </div>

        {/* Photos Gallery */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <MultiImageInputWithUpload
            id="design-images-uploader"
            label="Showcase Images"
            helperText="Upload showcase photos from device or paste image URLs."
            images={images}
            onChange={(imgs) => setImages(imgs)}
            bucket="project-media"
            folder="designs"
            maxImages={8}
          />
        </div>

        {/* Color Palette Builder */}
        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Palette className="h-4 w-4 text-orange-600" />
              Featured Pigment Palette ({colorPalette.length})
            </label>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400">Presets:</span>
              {COLOR_PRESETS.slice(0, 4).map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPresetColor(preset)}
                  title={preset.name}
                  className="h-3.5 w-3.5 rounded-full border border-slate-300 hover:scale-110 transition"
                  style={{ backgroundColor: preset.hex }}
                />
              ))}
            </div>
          </div>

          {/* Current Palette Swatches */}
          {colorPalette.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {colorPalette.map((c, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1"
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-black/10"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="text-slate-700 dark:text-slate-200 font-medium">
                    {c.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveColor(idx)}
                    className="text-slate-400 hover:text-red-500 ml-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Color Row */}
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={newColorHex}
              onChange={(e) => setNewColorHex(e.target.value)}
              className="h-8 w-10 rounded border border-slate-300 p-0.5 cursor-pointer"
            />
            <Input
              value={newColorName}
              onChange={(e) => setNewColorName(e.target.value)}
              placeholder="Color name (e.g. Natural Terracotta)"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddColor}
              disabled={!newColorName.trim()}
            >
              Add Color
            </Button>
          </div>
        </div>

        {/* Suitable Products */}
        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <label className="font-semibold text-slate-700 dark:text-slate-300 block">
            Compatible X-FORCE Products (Type and press Enter)
          </label>
          <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 min-h-[36px]">
            {suitableProducts.map((p, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-300 px-2 py-0.5 text-[11px] font-medium"
              >
                {p}
                <button
                  type="button"
                  onClick={() =>
                    setSuitableProducts((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={productsInput}
              onChange={(e) => setProductsInput(e.target.value)}
              onKeyDown={handleAddProduct}
              placeholder="e.g. 220mm Hydraform Block..."
              className="flex-1 bg-transparent border-none text-xs focus:outline-none min-w-[140px] text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="h-4 w-4 rounded text-orange-600 focus:ring-orange-500"
            />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Publish to Design Showcase
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="h-4 w-4 rounded text-orange-600 focus:ring-orange-500"
            />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Featured Design
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Design'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
