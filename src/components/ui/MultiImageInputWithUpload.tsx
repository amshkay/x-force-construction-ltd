import React, { useRef, useState } from 'react';
import {
  Upload,
  Link as LinkIcon,
  X,
  Plus,
  Image as ImageIcon,
  Loader2,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { mediaService } from '../../services/media.service';
import { useToast } from './Toast';
import { cn } from '../../utils/cn';

export interface MultiImageInputWithUploadProps {
  label?: string;
  helperText?: string;
  images: string[];
  onChange: (images: string[]) => void;
  bucket?: 'product-media' | 'project-media' | 'installation-media' | 'customer-uploads' | 'business-assets';
  folder?: string;
  maxImages?: number;
  className?: string;
  id?: string;
}

export const MultiImageInputWithUpload: React.FC<MultiImageInputWithUploadProps> = ({
  label,
  helperText,
  images = [],
  onChange,
  bucket = 'product-media',
  folder = 'products',
  maxImages = 10,
  className,
  id = 'multi-image-upload',
}) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const handleLocalFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      toast.warning(`Maximum limit of ${maxImages} images already reached.`);
      return;
    }

    const filesToUpload = Array.from(fileList).slice(0, remainingSlots);
    setIsUploading(true);
    setUploadProgressText(`Uploading 1 of ${filesToUpload.length}...`);

    try {
      const uploadedUrls: string[] = [];
      let index = 0;

      for (const file of filesToUpload) {
        index++;
        setUploadProgressText(`Uploading ${index} of ${filesToUpload.length}...`);

        if (file.size > 15 * 1024 * 1024) {
          toast.warning(`"${file.name}" exceeds 15MB limit and was skipped.`);
          continue;
        }

        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const timestamp = Date.now();
        const storagePath = `${folder}/${timestamp}_${cleanName}`;

        const res = await mediaService.uploadMedia(file, storagePath, {
          bucket,
          maxSizeBytes: 15 * 1024 * 1024,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
        });

        if (res && res.url) {
          uploadedUrls.push(res.url);
        }
      }

      if (uploadedUrls.length > 0) {
        onChange([...images, ...uploadedUrls]);
        toast.success(`Successfully uploaded ${uploadedUrls.length} image(s) to cloud storage.`);
      }
    } catch (err: any) {
      console.error('[MultiImageInputWithUpload] Upload error:', err);
      toast.error(err.message || 'Failed to upload images.');
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddUrl = () => {
    const trimmed = imageUrlInput.trim();
    if (!trimmed) return;

    if (images.includes(trimmed)) {
      toast.warning('This image URL is already in the list.');
      return;
    }

    if (images.length >= maxImages) {
      toast.warning(`Maximum limit of ${maxImages} images reached.`);
      return;
    }

    onChange([...images, trimmed]);
    setImageUrlInput('');
    toast.success('Image URL added.');
  };

  const handleRemoveImage = (indexToRemove: number) => {
    onChange(images.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className={cn('w-full space-y-3 text-left', className)} id={id}>
      {/* Header */}
      <div className="flex items-center justify-between">
        {label && (
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          {images.length} / {maxImages} images
        </span>
      </div>

      {/* Hidden Multi-file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={(e) => handleLocalFiles(e.target.files)}
        className="hidden"
        disabled={isUploading || images.length >= maxImages}
      />

      {/* Upload & URL Action Row */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || images.length >= maxImages}
          isLoading={isUploading}
          leftIcon={<Upload className="h-4 w-4" />}
          className="shrink-0 text-xs"
        >
          {isUploading ? (uploadProgressText || 'Uploading...') : 'Upload from Device'}
        </Button>

        <span className="text-xs text-slate-400 text-center sm:text-left shrink-0">or paste link:</span>

        <div className="flex flex-1 gap-2">
          <Input
            value={imageUrlInput}
            onChange={(e) => setImageUrlInput(e.target.value)}
            placeholder="Paste HTTPS image URL (Unsplash, CDN)..."
            disabled={isUploading || images.length >= maxImages}
            className="flex-1 text-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddUrl();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddUrl}
            disabled={!imageUrlInput.trim() || isUploading || images.length >= maxImages}
            className="shrink-0 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add URL
          </Button>
        </div>
      </div>

      {/* Drag & Drop Area if list is empty */}
      {images.length === 0 && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            handleLocalFiles(e.dataTransfer.files);
          }}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition-colors',
            isDragOver
              ? 'border-orange-500 bg-orange-50/60 dark:bg-orange-950/30'
              : 'border-slate-300 hover:border-orange-400 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30'
          )}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400 mb-1.5">
            <Layers className="h-4 w-4" />
          </div>
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            No images attached yet
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Click &apos;Upload from Device&apos;, drop files here, or paste image URLs
          </p>
        </div>
      )}

      {/* Thumbnails Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 pt-1">
          {images.map((url, idx) => (
            <div
              key={idx}
              className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shadow-sm"
            >
              <img
                src={url}
                alt={`Media thumbnail ${idx + 1}`}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded-full bg-white/90 text-slate-700 hover:bg-white transition"
                  title="View full"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  className="p-1 rounded-full bg-rose-600 text-white hover:bg-rose-700 transition"
                  title="Remove image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {idx === 0 && (
                <span className="absolute top-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                  Primary
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {helperText && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          {helperText}
        </p>
      )}
    </div>
  );
};
