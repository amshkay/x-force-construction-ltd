/**
 * Storage & Media Management Abstraction Types
 * Decouples upload/storage consumers from Supabase Storage or Cloudflare R2
 */

export type StorageProviderType = 'supabase' | 'r2' | 'local' | 'persistent-disk';

export interface MediaUploadOptions {
  bucket: string;
  folder?: string;
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
  makePublic?: boolean;
}

export interface UploadedMedia {
  id: string;
  url: string;
  path: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  provider: StorageProviderType;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface IMediaStorageProvider {
  upload(file: File | Blob, path: string, options?: MediaUploadOptions): Promise<UploadedMedia>;
  getPublicUrl(path: string, bucket?: string): string;
  delete(path: string, bucket?: string): Promise<boolean>;
}
