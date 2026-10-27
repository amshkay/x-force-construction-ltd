import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  X,
  Image as ImageIcon,
  Film,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Link as LinkIcon,
  Upload,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { mediaGalleryService } from '../../services/mediaGallery.service';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../ui/Toast';
import { MediaAsset } from '../../types/mediaGallery';

export interface MediaUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded?: (asset: MediaAsset) => void;
  defaultCategory?: string;
}

export const MediaUploadModal: React.FC<MediaUploadModalProps> = ({
  isOpen,
  onClose,
  onUploaded,
  defaultCategory = 'Projects',
}) => {
  const { currentUser, profile } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sourceMode, setSourceMode] = useState<'upload' | 'url'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [onlineUrlInput, setOnlineUrlInput] = useState<string>('');
  const [category, setCategory] = useState<string>(defaultCategory);
  const [altText, setAltText] = useState<string>('');
  const [caption, setCaption] = useState<string>('');
  const [isPublished, setIsPublished] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 15 * 1024 * 1024) {
        setErrorMsg('File exceeds maximum size limit of 15MB.');
        return;
      }
      setSelectedFile(file);
      setErrorMsg(null);
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (sourceMode !== 'upload') return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size > 15 * 1024 * 1024) {
        setErrorMsg('File exceeds maximum size limit of 15MB.');
        return;
      }
      setSelectedFile(file);
      setErrorMsg(null);
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleOnlineUrlChange = (val: string) => {
    setOnlineUrlInput(val);
    setErrorMsg(null);
    if (val.trim()) {
      setPreviewUrl(val.trim());
    } else {
      setPreviewUrl(null);
    }
  };

  const handleUpload = async () => {
    if (sourceMode === 'upload' && !selectedFile) {
      setErrorMsg('Please select a file to upload from your device.');
      return;
    }
    if (sourceMode === 'url' && !onlineUrlInput.trim()) {
      setErrorMsg('Please enter a valid online image URL.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    let res;
    if (sourceMode === 'upload' && selectedFile) {
      res = await mediaGalleryService.uploadMediaAsset(
        {
          file: selectedFile,
          category,
          altText,
          caption,
          isPublished,
        },
        currentUser?.id || profile?.id
      );
    } else {
      res = await mediaGalleryService.registerMediaAssetFromUrl(
        {
          url: onlineUrlInput.trim(),
          category,
          altText,
          caption,
          isPublished,
        },
        currentUser?.id || profile?.id
      );
    }

    setIsUploading(false);

    if (res.success && res.data) {
      toast.success('Media asset successfully stored in repository.', 'Asset Uploaded');
      if (onUploaded) onUploaded(res.data);
      onClose();
      // Reset state
      setSelectedFile(null);
      setPreviewUrl(null);
      setOnlineUrlInput('');
      setAltText('');
      setCaption('');
    } else {
      setErrorMsg(!res.success ? res.error.message : 'Failed to save media asset.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title="Upload Media Asset"
    >
      <div className="space-y-4 text-left" id="modal-media-uploader">
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Source Mode Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 pb-1 text-xs gap-2">
          <button
            type="button"
            onClick={() => {
              setSourceMode('upload');
              setErrorMsg(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
              sourceMode === 'upload'
                ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload from Device</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSourceMode('url');
              setErrorMsg(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
              sourceMode === 'url'
                ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <LinkIcon className="h-3.5 w-3.5" />
            <span>Online Image URL</span>
          </button>
        </div>

        {sourceMode === 'upload' ? (
          /* Drag and Drop Zone */
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-6 text-center cursor-pointer hover:border-orange-500 dark:hover:border-orange-500 transition"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/mp4,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            {previewUrl && selectedFile ? (
              <div className="relative h-44 w-full rounded-lg overflow-hidden bg-black/5 flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt="Upload preview"
                  className="h-full w-full object-contain"
                  referrerPolicy="no-referrer"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : selectedFile ? (
              <div className="flex flex-col items-center gap-2 text-slate-700 dark:text-slate-200">
                <FileText className="h-10 w-10 text-orange-600" />
                <span className="text-xs font-semibold">{selectedFile.name}</span>
                <span className="text-[10px] text-slate-400">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-500">
                <UploadCloud className="h-10 w-10 text-orange-600 dark:text-orange-400" />
                <div className="text-xs">
                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                    Click to browse
                  </span>{' '}
                  or drag and drop site photo
                </div>
                <p className="text-[11px] text-slate-400">
                  JPEG, PNG, WebP, SVG, MP4 (Max 15MB)
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Online Image URL Input */
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Image Web Link (HTTPS)
              </label>
              <Input
                value={onlineUrlInput}
                onChange={(e) => handleOnlineUrlChange(e.target.value)}
                placeholder="https://images.unsplash.com/... or cloud image CDN URL"
                className="w-full"
              />
            </div>
            {previewUrl && (
              <div className="relative h-44 w-full rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt="Online URL preview"
                  className="h-full w-full object-contain"
                  referrerPolicy="no-referrer"
                  onError={() => setErrorMsg('Failed to load image from the provided URL. Please check the link.')}
                />
              </div>
            )}
          </div>
        )}

        {/* Category Selection */}
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Media Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none"
          >
            <option value="Projects">Projects (Site Progress & Portfolios)</option>
            <option value="Designs">Designs (Inspirations & Patterns)</option>
            <option value="Products">Products (Materials & Finishes)</option>
            <option value="Certificates">Certificates & Quality Reports</option>
            <option value="General">General Marketing & Business</option>
          </select>
        </div>

        {/* Descriptive Text & SEO Alt Text */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Alt Text (Accessibility & SEO)
            </label>
            <Input
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="e.g. 80mm herringbone interlocking paver at logistics terminal"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Public Caption / Notes (Optional)
            </label>
            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. Heavy compaction bed with laser grading"
            />
          </div>
        </div>

        {/* Visibility Toggle */}
        <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-white block">
              Public Visibility
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Published assets are viewable by prospective clients
            </span>
          </div>
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="h-4 w-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleUpload}
            disabled={isUploading || (sourceMode === 'upload' ? !selectedFile : !onlineUrlInput.trim())}
            leftIcon={
              isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4" />
              )
            }
          >
            {isUploading
              ? 'Saving Asset...'
              : sourceMode === 'upload'
              ? 'Upload & Save'
              : 'Save Image Link'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
