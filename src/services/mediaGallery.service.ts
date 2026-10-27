/**
 * Media, Designs & Project Gallery Service
 * Module 07 — Media, Designs & Project Gallery
 *
 * XFORCE Construction Ltd / X-FORCE BRICKS
 * Single-Business Architecture
 *
 * Business logic layer for:
 * 1. Uploading media assets using MediaService storage abstraction.
 * 2. Creating and updating architectural design inspiration showcases.
 * 3. Managing completed project portfolios with Before / During / After progression.
 * 4. Fulfilling strict public/private visibility rules and audit logging.
 */

import { mediaService } from './media.service';
import { auditService } from './audit.service';
import { mediaGalleryRepository } from '../repositories/mediaGallery.repository';
import {
  MediaAsset,
  MediaUploadFormData,
  DesignItem,
  DesignFormData,
  ProjectGalleryItem,
  ProjectFormData,
  ProjectPhaseMedia,
} from '../types/mediaGallery';
import { Result } from '../types/common';

const ALLOWED_MEDIA_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'application/pdf',
];

const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15 MB

class MediaGalleryService {
  /**
   * Uploads an asset via the storage abstraction and registers it in the media catalogue
   */
  async uploadMediaAsset(
    data: MediaUploadFormData,
    userId?: string
  ): Promise<Result<MediaAsset>> {
    try {
      const file = data.file;
      const originalName = file instanceof File ? file.name : 'upload.bin';
      const fileExt = originalName.split('.').pop()?.toLowerCase() || 'bin';
      const cleanFileName = originalName
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .toLowerCase();
      const storageBucket = 'project-media';
      const subFolder = data.category ? data.category.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'general';
      const storagePath = `${subFolder}/${Date.now()}_${cleanFileName}`;

      const uploaded = await mediaService.uploadMedia(file, storagePath, {
        bucket: storageBucket,
        allowedMimeTypes: ALLOWED_MEDIA_TYPES,
        maxSizeBytes: MAX_IMAGE_SIZE,
      });

      const mediaAsset: MediaAsset = {
        id: uploaded.id.startsWith('mock-')
          ? `m7000000-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 6)}`
          : uploaded.id,
        storageProvider: uploaded.provider,
        storageBucket,
        storagePath: uploaded.path,
        publicUrl: uploaded.url,
        fileName: cleanFileName,
        mimeType: uploaded.mimeType,
        fileSize: uploaded.sizeBytes,
        altText: data.altText?.trim() || data.title?.trim() || null,
        caption: data.caption?.trim() || null,
        category: data.category,
        entityType: data.entityType || null,
        entityId: data.entityId || null,
        isPublished: data.isPublished ?? true,
        createdBy: userId || null,
        createdAt: new Date().toISOString(),
      };

      const saveRes = await mediaGalleryRepository.saveMedia(mediaAsset);

      if (userId) {
        await auditService.logAction(
          userId,
          'upload_media',
          'media',
          mediaAsset.id,
          { fileName: mediaAsset.fileName, bucket: storageBucket, size: mediaAsset.fileSize },
          undefined,
          `Uploaded media asset for ${data.category}`
        );
      }

      return saveRes;
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: err.message || 'Failed to upload media asset.',
        },
      };
    }
  }

  /**
   * Registers a media asset from an online URL (e.g. Unsplash, CDN)
   */
  async registerMediaAssetFromUrl(
    data: {
      url: string;
      fileName?: string;
      category: string;
      altText?: string;
      caption?: string;
      isPublished?: boolean;
      entityType?: string;
      entityId?: string;
    },
    userId?: string
  ): Promise<Result<MediaAsset>> {
    try {
      const url = data.url.trim();
      if (!url) {
        return {
          success: false,
          error: { code: 'INVALID_URL', message: 'Image URL is required.' },
        };
      }

      const generatedId = `f7000000-${Date.now().toString(16).padStart(4, '0')}-${Math.random().toString(16).slice(2, 6).padEnd(4, '0')}-000000000001`;
      const fileName =
        data.fileName ||
        url.split('/').pop()?.split('?')[0] ||
        `external-image-${Date.now()}.jpg`;

      const mediaAsset: MediaAsset = {
        id: generatedId,
        storageProvider: 'external',
        storageBucket: 'project-media',
        storagePath: `external/${fileName}`,
        publicUrl: url,
        fileName,
        mimeType: url.endsWith('.png') ? 'image/png' : 'image/jpeg',
        fileSize: 102400,
        altText: data.altText?.trim() || data.caption?.trim() || null,
        caption: data.caption?.trim() || null,
        category: data.category,
        entityType: (data.entityType as any) || null,
        entityId: data.entityId || null,
        isPublished: data.isPublished ?? true,
        createdBy: userId || null,
        createdAt: new Date().toISOString(),
      };

      const saveRes = await mediaGalleryRepository.saveMedia(mediaAsset);
      if (userId && saveRes.success) {
        await auditService.logAction(
          userId,
          'upload_media',
          'media',
          mediaAsset.id,
          { fileName: mediaAsset.fileName, sourceUrl: url },
          undefined,
          `Linked online image asset for ${data.category}`
        );
      }
      return saveRes;
    } catch (err: any) {
      return {
        success: false,
        error: { code: 'REGISTER_ERROR', message: err.message || 'Failed to register online image asset.' },
      };
    }
  }

  /**
   * Retrieves all media assets with optional filtering
   */
  async getMediaAssets(filters?: {
    category?: string;
    type?: 'image' | 'video' | 'all';
    search?: string;
  }): Promise<MediaAsset[]> {
    const res = await mediaGalleryRepository.getAllMedia();
    if (!res.success || !res.data) return [];
    let items = res.data;

    if (filters?.category && filters.category !== 'all') {
      items = items.filter((m) => m.category === filters.category);
    }
    if (filters?.type && filters.type !== 'all') {
      if (filters.type === 'image') {
        items = items.filter((m) => m.mimeType.startsWith('image/'));
      } else if (filters.type === 'video') {
        items = items.filter((m) => m.mimeType.startsWith('video/'));
      }
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      items = items.filter(
        (m) =>
          m.fileName.toLowerCase().includes(q) ||
          m.altText?.toLowerCase().includes(q) ||
          m.caption?.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q)
      );
    }
    return items;
  }

  /**
   * Deletes a media asset
   */
  async deleteMediaAsset(id: string, userId?: string): Promise<Result<void>> {
    const res = await mediaGalleryRepository.deleteMedia(id);
    if (res.success && userId) {
      await auditService.logAction(
        userId,
        'delete_media',
        'media',
        id,
        undefined,
        undefined,
        'Deleted media asset from catalogue'
      );
    }
    return res;
  }

  // --------------------------------------------------------------------------
  // DESIGN INSPIRATION SHOWCASE
  // --------------------------------------------------------------------------

  async getDesigns(publishedOnly = false): Promise<DesignItem[]> {
    const res = publishedOnly
      ? await mediaGalleryRepository.getPublishedDesigns()
      : await mediaGalleryRepository.getAllDesigns();
    return res.success ? res.data : [];
  }

  async getDesignById(id: string): Promise<DesignItem | null> {
    const res = await mediaGalleryRepository.getDesignById(id);
    return res.success ? res.data : null;
  }

  async createDesign(data: DesignFormData, userId?: string): Promise<Result<DesignItem>> {
    return this.saveDesign(data, undefined, userId);
  }

  async updateDesign(id: string, data: DesignFormData, userId?: string): Promise<Result<DesignItem>> {
    return this.saveDesign(data, id, userId);
  }

  async saveDesign(
    data: DesignFormData,
    existingId?: string,
    userId?: string
  ): Promise<Result<DesignItem>> {
    if (!data.title.trim()) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Design title is required.' } };
    }
    if (!data.category.trim()) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Design category is required.' } };
    }

    const res = await mediaGalleryRepository.saveDesign(data, existingId);
    if (res.success && userId) {
      await auditService.logAction(
        userId,
        existingId ? 'update_design' : 'create_design',
        'designs',
        res.data.id,
        data,
        undefined,
        `${existingId ? 'Updated' : 'Created'} architectural design ${data.title}`
      );
    }
    return res;
  }

  async deleteDesign(id: string, userId?: string): Promise<Result<void>> {
    const res = await mediaGalleryRepository.deleteDesign(id);
    if (res.success && userId) {
      await auditService.logAction(
        userId,
        'delete_design',
        'designs',
        id,
        undefined,
        undefined,
        'Deleted design pattern from showcase'
      );
    }
    return res;
  }

  async toggleDesignPublish(id: string, userId?: string): Promise<Result<DesignItem>> {
    const res = await mediaGalleryRepository.toggleDesignPublish(id);
    if (res.success && userId) {
      await auditService.logAction(
        userId,
        'toggle_publish_design',
        'designs',
        id,
        { isPublished: res.data!.isPublished },
        undefined,
        `Toggled publish status to ${res.data!.isPublished ? 'published' : 'draft'}`
      );
    }
    return res;
  }

  // --------------------------------------------------------------------------
  // PROJECT GALLERY & PROGRESSION (BEFORE / DURING / AFTER)
  // --------------------------------------------------------------------------

  async getProjects(publishedOnly = false): Promise<ProjectGalleryItem[]> {
    const res = publishedOnly
      ? await mediaGalleryRepository.getPublishedProjects()
      : await mediaGalleryRepository.getAllProjects();
    return res.success ? res.data : [];
  }

  async getProjectById(id: string): Promise<ProjectGalleryItem | null> {
    const res = await mediaGalleryRepository.getProjectById(id);
    return res.success ? res.data : null;
  }

  async createProject(data: ProjectFormData, userId?: string): Promise<Result<ProjectGalleryItem>> {
    return this.saveProject(data, undefined, userId);
  }

  async updateProject(id: string, data: ProjectFormData, userId?: string): Promise<Result<ProjectGalleryItem>> {
    return this.saveProject(data, id, userId);
  }

  async saveProject(
    data: ProjectFormData,
    existingId?: string,
    userId?: string
  ): Promise<Result<ProjectGalleryItem>> {
    if (!data.title.trim()) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Project title is required.' } };
    }
    if (!data.location.trim()) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Project location is required.' } };
    }
    if (!data.category.trim()) {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Project category is required.' } };
    }

    const res = await mediaGalleryRepository.saveProject(data, existingId);
    if (res.success && userId) {
      await auditService.logAction(
        userId,
        existingId ? 'update_project' : 'create_project',
        'projects',
        res.data.id,
        data,
        undefined,
        `${existingId ? 'Updated' : 'Created'} project showcase ${data.title}`
      );
    }
    return res;
  }

  async deleteProject(id: string, userId?: string): Promise<Result<void>> {
    const res = await mediaGalleryRepository.deleteProject(id);
    if (res.success && userId) {
      await auditService.logAction(
        userId,
        'delete_project',
        'projects',
        id,
        undefined,
        undefined,
        'Deleted project from portfolio showcase'
      );
    }
    return res;
  }

  async toggleProjectPublish(id: string, userId?: string): Promise<Result<ProjectGalleryItem>> {
    const res = await mediaGalleryRepository.toggleProjectPublish(id);
    if (res.success && userId) {
      await auditService.logAction(
        userId,
        'toggle_publish_project',
        'projects',
        id,
        { isPublished: res.data!.isPublished },
        undefined,
        `Toggled project publish status to ${res.data!.isPublished ? 'published' : 'draft'}`
      );
    }
    return res;
  }
}

export const mediaGalleryService = new MediaGalleryService();
