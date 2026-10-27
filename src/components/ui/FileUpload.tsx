import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, X, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatBytes } from '../../utils/formatters';

export interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSizeBytes?: number;
  label?: string;
  helperText?: string;
  className?: string;
  id?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept,
  multiple = false,
  maxSizeBytes = 10 * 1024 * 1024, // 10 MB default
  label,
  helperText,
  className,
  id = 'file-upload',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndAddFiles = (newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return;
    setErrorMessage(null);

    const validFiles: File[] = [];
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      if (file.size > maxSizeBytes) {
        setErrorMessage(
          `File "${file.name}" exceeds maximum allowed size of ${formatBytes(maxSizeBytes)}.`
        );
        return;
      }
      validFiles.push(file);
    }

    const updated = multiple ? [...selectedFiles, ...validFiles] : validFiles;
    setSelectedFiles(updated);
    onFileSelect(updated);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    validateAndAddFiles(e.dataTransfer.files);
  };

  const handleRemoveFile = (index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
    onFileSelect(updated);
  };

  return (
    <div className={cn('w-full space-y-2 text-left', className)} id={id}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
          {label}
        </label>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors',
          isDragOver
            ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20'
            : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-slate-600'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => validateAndAddFiles(e.target.files)}
          className="hidden"
          aria-label={label || 'Upload files'}
        />
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400 mb-2">
          <UploadCloud className="h-5 w-5" />
        </div>
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
          Click to browse or drag & drop files here
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
          {helperText || `Up to ${formatBytes(maxSizeBytes)} per file`}
        </p>
      </div>

      {errorMessage && (
        <p className="flex items-center gap-1.5 text-xs text-rose-500 mt-1">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </p>
      )}

      {selectedFiles.length > 0 && (
        <ul className="space-y-1.5 pt-1">
          {selectedFiles.map((file, idx) => (
            <li
              key={idx}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 shadow-sm"
            >
              <div className="flex items-center gap-2 truncate">
                <FileText className="h-4 w-4 shrink-0 text-orange-600" />
                <span className="truncate font-medium">{file.name}</span>
                <span className="text-[10px] text-slate-400">({formatBytes(file.size)})</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile(idx);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
