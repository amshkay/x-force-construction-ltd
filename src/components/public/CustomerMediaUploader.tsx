import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Loader2, Link as LinkIcon, Plus } from 'lucide-react';
import { mediaService } from '../../services/media.service';
import { Button } from '../ui/Button';

export interface CustomerMediaUploaderProps {
  onUploadsChanged: (urls: string[]) => void;
  maxFiles?: number;
}

interface UploadedFilePreview {
  id: string;
  name: string;
  url: string;
  isImage: boolean;
  sizeKb: number;
}

export const CustomerMediaUploader: React.FC<CustomerMediaUploaderProps> = ({
  onUploadsChanged,
  maxFiles = 3,
}) => {
  const [uploads, setUploads] = useState<UploadedFilePreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [onlineUrlInput, setOnlineUrlInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMsg(null);

    const remainingSlots = maxFiles - uploads.length;
    if (remainingSlots <= 0) {
      setErrorMsg(`Maximum of ${maxFiles} attachments permitted.`);
      return;
    }

    const filesToUpload = Array.from(fileList).slice(0, remainingSlots);
    setIsUploading(true);

    try {
      const newItems: UploadedFilePreview[] = [];

      for (const file of filesToUpload) {
        // Validate size (< 5MB)
        if (file.size > 5 * 1024 * 1024) {
          setErrorMsg(`"${file.name}" exceeds 5MB limit.`);
          continue;
        }

        const isImage = file.type.startsWith('image/');
        const uploaded = await mediaService.uploadMedia(
          file,
          `requests/${Date.now()}_${file.name.replace(/\s+/g, '_')}`,
          {
            bucket: 'customer-uploads',
            maxSizeBytes: 5 * 1024 * 1024,
          }
        );

        newItems.push({
          id: uploaded.id,
          name: file.name,
          url: uploaded.url,
          isImage,
          sizeKb: Math.round(file.size / 1024),
        });
      }

      const updated = [...uploads, ...newItems];
      setUploads(updated);
      onUploadsChanged(updated.map((u) => u.url));
    } catch (err: any) {
      setErrorMsg(err.message || 'File upload failed. Please try a smaller image.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (id: string) => {
    const updated = uploads.filter((u) => u.id !== id);
    setUploads(updated);
    onUploadsChanged(updated.map((u) => u.url));
  };

  const handleAddUrl = () => {
    const trimmed = onlineUrlInput.trim();
    if (!trimmed) return;
    if (uploads.length >= maxFiles) {
      setErrorMsg(`Maximum of ${maxFiles} attachments permitted.`);
      return;
    }
    const fileName = trimmed.split('/').pop()?.split('?')[0] || `sketch-${Date.now()}.jpg`;
    const newItem: UploadedFilePreview = {
      id: `ext-${Date.now()}`,
      name: fileName,
      url: trimmed,
      isImage: true,
      sizeKb: 100,
    };
    const updated = [...uploads, newItem];
    setUploads(updated);
    onUploadsChanged(updated.map((u) => u.url));
    setOnlineUrlInput('');
    setErrorMsg(null);
  };

  return (
    <div className="space-y-3" id="customer-media-uploader">
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFiles(e.target.files)}
        multiple
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        id="input-customer-media"
      />

      {/* Upload Dropzone / Button */}
      {uploads.length < maxFiles && (
        <div className="space-y-2">
          <div
            onClick={() => !isUploading && fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFiles(e.dataTransfer.files);
            }}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
              isUploading
                ? 'border-orange-300 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20 cursor-wait'
                : 'border-slate-200 hover:border-orange-500 hover:bg-orange-50/30 dark:border-slate-800 dark:hover:border-orange-500/60 dark:hover:bg-orange-950/10'
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-1.5 text-slate-500 dark:text-slate-400">
              {isUploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
              ) : (
                <Upload className="h-6 w-6 text-slate-400 dark:text-slate-500" />
              )}
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {isUploading ? 'Uploading file...' : 'Attach site photos or architectural sketches (Upload from Device)'}
              </p>
              <p className="text-[11px] text-slate-400">
                PNG, JPG, WebP or PDF up to 5MB (Max {maxFiles} files)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="url"
              value={onlineUrlInput}
              onChange={(e) => setOnlineUrlInput(e.target.value)}
              placeholder="Or paste online plan / sketch image link (https://...)"
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
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
              disabled={!onlineUrlInput.trim()}
              className="shrink-0 text-xs h-8 px-2.5"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Link
            </Button>
          </div>
        </div>
      )}

      {errorMsg && (
        <p className="text-xs text-red-600 dark:text-red-400 font-medium">{errorMsg}</p>
      )}

      {/* Previews */}
      {uploads.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
          {uploads.map((item) => (
            <div
              key={item.id}
              className="relative flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900"
            >
              {item.isImage ? (
                <img
                  src={item.url}
                  alt={item.name}
                  className="h-10 w-10 rounded object-cover shrink-0 bg-slate-100"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-100 text-slate-500 shrink-0 dark:bg-slate-800">
                  <FileText className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                  {item.name}
                </p>
                <p className="text-[10px] text-slate-400">{item.sizeKb} KB</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                className="h-6 w-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
                title="Remove file"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
