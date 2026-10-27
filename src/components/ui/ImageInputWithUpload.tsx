import React, { useRef, useState } from 'react';
import {
  Upload,
  Link as LinkIcon,
  X,
  Image as ImageIcon,
  Loader2,
  Check,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { mediaService } from '../../services/media.service';
import { useToast } from './Toast';
import { cn } from '../../utils/cn';

export interface ImageInputWithUploadProps {
  label?: string;
  helperText?: string;
  value?: string | null;
  onChange: (url: string) => void;
  onRemove?: () => void;
  bucket?: 'product-media' | 'project-media' | 'installation-media' | 'customer-uploads' | 'business-assets';
  folder?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  previewHeight?: string;
  className?: string;
  id?: string;
}

export const ImageInputWithUpload: React.FC<ImageInputWithUploadProps> = ({
  label,
  helperText,
  value,
  onChange,
  onRemove,
  bucket = 'project-media',
  folder = 'uploads',
  placeholder = 'https://images.unsplash.com/... or paste image URL',
  required = false,
  disabled = false,
  previewHeight = 'h-32',
  className,
  id = 'image-input-upload',
}) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState(value || '');
  const [imageError, setImageError] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Sync internal URL state when external value changes
  React.useEffect(() => {
    setUrlInputValue(value || '');
    setImageError(false);
  }, [value]);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (JPEG, PNG, WebP, SVG).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error('Image exceeds 15MB limit. Please upload a smaller image.');
      return;
    }

    setIsUploading(true);
    setImageError(false);
    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const timestamp = Date.now();
      const storagePath = `${folder}/${timestamp}_${cleanName}`;

      const res = await mediaService.uploadMedia(file, storagePath, {
        bucket,
        maxSizeBytes: 15 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/x-icon'],
      });

      if (res && res.url) {
        onChange(res.url);
        setUrlInputValue(res.url);
        toast.success('Image successfully uploaded and stored.', 'Image Uploaded');
      } else {
        throw new Error('Upload succeeded but no URL was returned.');
      }
    } catch (err: any) {
      console.error('[ImageInputWithUpload] Upload error:', err);
      toast.error(err.message || 'Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || isUploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleApplyUrl = () => {
    const trimmed = urlInputValue.trim();
    if (!trimmed) {
      handleClearImage();
      return;
    }

    onChange(trimmed);
    setImageError(false);
    toast.info('Image link set. Verifying preview...');
  };

  const handleClearImage = () => {
    onChange('');
    setUrlInputValue('');
    setImageError(false);
    if (onRemove) onRemove();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const hasImage = Boolean(value && value.trim());

  return (
    <div className={cn('w-full space-y-2 text-left', className)} id={id}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          {hasImage && (
            <button
              type="button"
              onClick={handleClearImage}
              disabled={disabled || isUploading}
              className="text-[11px] text-rose-600 hover:text-rose-700 dark:text-rose-400 font-medium flex items-center gap-1 transition-colors"
            >
              <X className="h-3 w-3" />
              <span>Remove Image</span>
            </button>
          )}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Preview Card (if image is present) */}
      {hasImage && (
        <div className="relative group rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-2 overflow-hidden shadow-sm">
          <div className={cn('relative w-full rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-950 flex items-center justify-center', previewHeight)}>
            {!imageError ? (
              <img
                src={value || ''}
                alt="Selected preview"
                onError={() => setImageError(true)}
                className="h-full w-full object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-1 p-4 text-center text-rose-500">
                <AlertCircle className="h-6 w-6" />
                <span className="text-xs font-semibold">Image failed to load</span>
                <span className="text-[10px] text-slate-400">Please verify the URL or upload a fresh file.</span>
              </div>
            )}

            {/* Quick Actions Overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isUploading}
                className="px-2.5 py-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-800 text-xs font-semibold flex items-center gap-1 shadow-md transition"
              >
                <Upload className="h-3.5 w-3.5 text-orange-600" />
                <span>Replace File</span>
              </button>
              {value && (
                <a
                  href={value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-800 text-xs font-semibold flex items-center gap-1 shadow-md transition"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-slate-600" />
                  <span>Open Full</span>
                </a>
              )}
              <button
                type="button"
                onClick={handleClearImage}
                disabled={disabled || isUploading}
                className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1 shadow-md transition"
              >
                <X className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input / Upload Controls */}
      <div className="space-y-2">
        {/* Dual Mode Switcher */}
        <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-colors',
              activeTab === 'upload'
                ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload from Device</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-colors',
              activeTab === 'url'
                ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            <LinkIcon className="h-3.5 w-3.5" />
            <span>Online Image URL</span>
          </button>
        </div>

        {activeTab === 'upload' ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && !disabled && fileInputRef.current?.click()}
            className={cn(
              'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-colors',
              isDragOver
                ? 'border-orange-500 bg-orange-50/60 dark:bg-orange-950/30'
                : 'border-slate-300 hover:border-orange-400 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/30 dark:hover:border-slate-600',
              (isUploading || disabled) && 'opacity-60 cursor-not-allowed'
            )}
          >
            {isUploading ? (
              <div className="flex flex-col items-center justify-center gap-1.5 py-2">
                <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Uploading image to cloud storage...
                </p>
                <p className="text-[11px] text-slate-400">Saving permanently to Supabase</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1 py-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400 mb-1">
                  <Upload className="h-4 w-4" />
                </div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Click to browse or drag & drop image here
                </p>
                <p className="text-[11px] text-slate-400">
                  JPG, PNG, WebP, SVG up to 15MB
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            <Input
              id={`${id}-url-input`}
              value={urlInputValue}
              onChange={(e) => {
                const val = e.target.value;
                setUrlInputValue(val);
                if (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:image/')) {
                  onChange(val.trim());
                  setImageError(false);
                }
              }}
              onBlur={() => {
                if (urlInputValue.trim() && urlInputValue !== value) {
                  handleApplyUrl();
                }
              }}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData('text');
                if (pasted && (pasted.startsWith('http://') || pasted.startsWith('https://') || pasted.startsWith('data:image/'))) {
                  setUrlInputValue(pasted.trim());
                  onChange(pasted.trim());
                  setImageError(false);
                }
              }}
              placeholder={placeholder}
              disabled={disabled || isUploading}
              className="flex-1 text-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleApplyUrl();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleApplyUrl}
              disabled={disabled || isUploading || !urlInputValue.trim()}
              className="shrink-0 text-xs h-9 px-3"
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Apply URL
            </Button>
          </div>
        )}
      </div>

      {helperText && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          {helperText}
        </p>
      )}
    </div>
  );
};
