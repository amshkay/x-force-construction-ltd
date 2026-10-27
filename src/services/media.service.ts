import {
  IMediaStorageProvider,
  MediaUploadOptions,
  UploadedMedia,
  StorageProviderType,
} from '../types/storage';
import { getSupabaseClient } from '../lib/supabase/client';
import { appConfig } from '../config/app.config';
import { formatBytes } from '../utils/formatters';
import { sanitizeStoragePath, validateUploadSecurity } from '../utils/securitySanitizer';

/**
 * Converts a File or Blob to an optimized Base64 data URL for instant client-side preview and durable local persistence
 */
async function fileToDataUrl(file: File | Blob): Promise<string> {
  // If not an image or is SVG, convert directly
  if (!file.type || !file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Optimize images to max 1600px and 85% quality to ensure fast, robust persistence in local store
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1600;
        const maxHeight = 1600;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const format = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          resolve(canvas.toDataURL(format, 0.85));
        } else {
          resolve((e.target?.result as string) || '');
        }
      };
      img.onerror = () => resolve((e.target?.result as string) || '');
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * Supabase Storage Provider Implementation with Safe Development Fallback
 */
export class SupabaseStorageProvider implements IMediaStorageProvider {
  async upload(
    file: File | Blob,
    path: string,
    options: MediaUploadOptions = { bucket: 'media' }
  ): Promise<UploadedMedia> {
    const bucket = options.bucket || 'media';
    const cleanPath = sanitizeStoragePath(path);
    const mimeType = file.type || 'application/octet-stream';
    const filename = cleanPath.split('/').pop() || 'upload';

    // Module 23: Strict file and upload security validation (Section 17)
    const securityCheck = validateUploadSecurity(file, filename, {
      maxSizeBytes: options.maxSizeBytes,
      allowedMimeTypes: options.allowedMimeTypes,
    });
    if (!securityCheck.isSafe) {
      throw new Error(securityCheck.errorMessage || 'File failed security validation.');
    }

    // Helper to upload via server proxy (which uses service key to persist to Supabase Storage)
    const uploadViaServerStorage = async (): Promise<UploadedMedia> => {
      const dataUrl = await fileToDataUrl(file);
      try {
        const res = await fetch('/api/media/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename,
            dataUrl,
            path: cleanPath,
            bucket,
            category: cleanPath.split('/')[0] || 'general',
            mimeType,
          }),
        });

        if (res.ok) {
          const payload = await res.json();
          if (payload && payload.url) {
            return {
              id: payload.id || `media-${Date.now()}`,
              url: payload.url,
              path: payload.path || cleanPath,
              filename: payload.filename || filename,
              sizeBytes: payload.sizeBytes || file.size,
              mimeType: payload.mimeType || mimeType,
              provider: payload.provider || 'supabase',
              uploadedAt: payload.createdAt || new Date().toISOString(),
            };
          }
        }
      } catch (err) {
        console.warn('[Storage] Server storage proxy upload failed, attempting fallback:', err);
      }

      // Offline PWA fallback
      return {
        id: `local-${Date.now()}`,
        url: dataUrl,
        path: cleanPath,
        filename,
        sizeBytes: file.size,
        mimeType,
        provider: 'local',
        uploadedAt: new Date().toISOString(),
      };
    };

    // 1. Try server-side Supabase Storage proxy first (handles service key & cloud persistence)
    try {
      const serverResult = await uploadViaServerStorage();
      if (serverResult.provider === 'supabase' || !appConfig.supabase.isConfigured) {
        return serverResult;
      }
    } catch {
      // Fall through to client direct upload
    }

    // 2. Client direct Supabase upload (if server proxy was bypassed)
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.storage.from(bucket).upload(cleanPath, file, {
        upsert: true,
      });

      if (error) {
        console.warn(`[Storage] Client direct upload returned error: ${error.message}.`);
        return uploadViaServerStorage();
      }

      const publicUrl = this.getPublicUrl(data.path, bucket);

      return {
        id: data.id || data.path,
        url: publicUrl,
        path: data.path,
        filename: cleanPath.split('/').pop() || 'upload',
        sizeBytes: file.size,
        mimeType,
        provider: 'supabase',
        uploadedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      console.warn(`[Storage] Storage exception: ${err.message}.`);
      return uploadViaServerStorage();
    }

  }

  getPublicUrl(path: string, bucket = 'media'): string {
    if (path.startsWith('/uploads/') || path.startsWith('uploads/') || path.startsWith('data:') || path.startsWith('blob:') || path.startsWith('http')) {
      return path.startsWith('uploads/') ? `/${path}` : path;
    }
    const supabase = getSupabaseClient();
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const { data } = supabase.storage.from(bucket).getPublicUrl(cleanPath);
    return data.publicUrl;
  }

  async delete(path: string, bucket = 'media'): Promise<boolean> {
    if (path.startsWith('/uploads/') || path.startsWith('uploads/')) {
      try {
        await fetch('/api/media/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path }),
        });
        return true;
      } catch {
        return false;
      }
    }
    if (!appConfig.supabase.isConfigured || path.startsWith('data:')) {
      return true;
    }
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.storage.from(bucket).remove([path]);
      return !error;
    } catch {
      return true;
    }
  }
}

/**
 * High-Level Media Service Abstraction
 *
 * Allows switching providers (Supabase Storage -> Cloudflare R2)
 * without affecting feature modules.
 */
export class MediaService {
  private provider: IMediaStorageProvider;
  private providerType: StorageProviderType;

  constructor(provider: IMediaStorageProvider = new SupabaseStorageProvider(), providerType: StorageProviderType = 'supabase') {
    this.provider = provider;
    this.providerType = providerType;
  }

  public setProvider(provider: IMediaStorageProvider, type: StorageProviderType): void {
    this.provider = provider;
    this.providerType = type;
  }

  public getActiveProviderType(): StorageProviderType {
    return this.providerType;
  }

  public async uploadMedia(
    file: File | Blob,
    path: string,
    options?: MediaUploadOptions
  ): Promise<UploadedMedia> {
    return this.provider.upload(file, path, options);
  }

  public getPublicUrl(path: string, bucket?: string): string {
    return this.provider.getPublicUrl(path, bucket);
  }

  public async deleteMedia(path: string, bucket?: string): Promise<boolean> {
    return this.provider.delete(path, bucket);
  }
}

export const mediaService = new MediaService();

