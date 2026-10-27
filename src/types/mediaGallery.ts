/**
 * Media, Designs & Project Gallery Types
 *
 * Module 07: Media, Designs & Project Gallery
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Provides typed models for media assets, design inspiration showcases,
 * and project portfolio progression (Before / During / After).
 */

export type MediaType = 'image' | 'video' | 'document';

export type ProjectPhase = 'before' | 'during' | 'after' | 'finished';

export type ProjectGalleryStatus = 'completed' | 'in_progress';

export type GalleryItemVisibility = 'draft' | 'published' | 'archived';

export interface MediaAsset {
  id: string;
  storageProvider: string;
  storageBucket: string;
  storagePath: string;
  publicUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  altText: string | null;
  caption: string | null;
  category: string; // e.g., 'design_inspiration', 'completed_project', 'before_after', 'installation', 'general'
  entityType?: 'design' | 'project' | 'product' | 'general' | null;
  entityId?: string | null;
  isPublished: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface MediaUploadFormData {
  file: File | Blob;
  title?: string;
  altText?: string;
  caption?: string;
  category: string;
  entityType?: 'design' | 'project' | 'product' | 'general';
  entityId?: string;
  isPublished: boolean;
}

export interface ColorOption {
  name: string;
  hex: string;
}

export interface DesignItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string; // e.g., 'Interlocking Paving', 'Structural Wall Masonry', 'Perimeter & Trims', 'Decorative Facades'
  patternStyle?: string; // e.g., '45° Herringbone', '90° Herringbone', 'Stretcher Bond', 'Basket Weave', 'Dry-Stack'
  applicationType?: string; // e.g., 'Exterior Wall', 'Interior Wall', 'Boundary Wall', 'Driveway Pavement', 'Commercial Plaza', 'Feature Wall'
  images: string[];
  videoUrl?: string | null;
  colorPalette?: ColorOption[];
  suitableProducts?: string[]; // Product names or IDs referenced safely
  isPublished: boolean;
  isFeatured?: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface DesignFormData {
  title: string;
  slug: string;
  description: string;
  category: string;
  patternStyle?: string;
  applicationType?: string;
  images: string[];
  videoUrl?: string;
  colorPalette: ColorOption[];
  suitableProducts: string[];
  isPublished: boolean;
  isFeatured?: boolean;
  sortOrder: number;
}

export interface ProjectPhaseMedia {
  id: string;
  url: string;
  caption?: string;
  phase: ProjectPhase;
  sortOrder?: number;
}

export interface ProjectGalleryItem {
  id: string;
  title: string;
  slug: string;
  category: string; // e.g., 'Commercial Paving', 'Residential Building', 'Industrial Yard', 'Perimeter Wall'
  location: string;
  clientType?: 'Residential' | 'Commercial' | 'Industrial' | 'Institutional';
  status: ProjectGalleryStatus;
  completionDate?: string;
  description: string;
  scopeSummary?: string;
  materialsUsed: string[];
  coverImageUrl: string;
  galleryMedia: ProjectPhaseMedia[];
  videoUrl?: string | null;
  isPublished: boolean;
  isFeatured?: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFormData {
  title: string;
  slug: string;
  category: string;
  location: string;
  clientType: 'Residential' | 'Commercial' | 'Industrial' | 'Institutional';
  status: ProjectGalleryStatus;
  completionDate: string;
  description: string;
  scopeSummary: string;
  materialsUsed: string[];
  coverImageUrl: string;
  galleryMedia: ProjectPhaseMedia[];
  videoUrl: string;
  isPublished: boolean;
  isFeatured?: boolean;
  sortOrder: number;
}

export const MEDIA_PRESET_CATEGORIES = [
  'Design Inspiration',
  'Completed Projects',
  'Before & After',
  'Installation Walkthrough',
  'Exterior Applications',
  'Interior & Features',
  'Pavements & Yards',
  'Branding & Showcase',
] as const;

export const DESIGN_APPLICATION_TYPES = [
  'Exterior Building Wall',
  'Interior Accent Wall',
  'Boundary & Security Wall',
  'Driveway Pavement',
  'Heavy Vehicle Yard',
  'Pedestrian Walkway & Patio',
  'Pool Deck & Courtyard',
  'Garden Edging & Trims',
] as const;

export const PROJECT_GALLERY_CATEGORIES = [
  'Commercial Paving',
  'Residential Building',
  'Industrial Yard',
  'Perimeter Wall',
  'Civic & Institutional',
  'Drainage & Infrastructure',
] as const;
