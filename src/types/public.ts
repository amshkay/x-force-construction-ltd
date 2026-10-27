/**
 * Public Website & Customer Experience Type Definitions
 *
 * Module 05: Public Website & Customer Experience
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Enforces strict public/private separation:
 * Only customer-safe fields are exposed. No costs, margins, reorder levels,
 * or internal staff notes.
 */

export interface PublicCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
}

export interface PublicProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  color?: string | null;
  size?: string | null;
  finish?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  priceOverride?: number | null;
  attributes?: Record<string, string>;
}

export interface PublicProduct {
  id: string;
  categoryId: string;
  categoryName?: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription?: string | null;
  description: string | null;
  unit: string;
  sellingPrice: number;
  priceOnRequest?: boolean;
  requiresInstallation: boolean;
  imageUrl?: string | null;
  images?: string[];
  attributes?: Record<string, string>;
  isFeatured?: boolean;
  variants?: PublicProductVariant[];
  isAvailable?: boolean;
}

export interface PublicProject {
  id: string;
  title: string;
  slug: string;
  location: string;
  category: string;
  completionDate: string;
  clientType?: 'Residential' | 'Commercial' | 'Industrial' | 'Institutional';
  description: string;
  coverImageUrl?: string;
  galleryImages?: {
    url: string;
    caption?: string;
    phase?: 'before' | 'during' | 'after' | 'finished';
  }[];
  materialsUsed?: string[];
  scopeSummary?: string;
  status: 'completed' | 'in_progress';
}

export interface PublicDesignPattern {
  id: string;
  name: string;
  slug: string;
  bondType: string;
  recommendedUse: string;
  shearResistance: string;
  loadRating: 'Light Pedestrian' | 'Medium Traffic' | 'Heavy Vehicle' | 'Architectural Facing';
  description: string;
  suitableProducts?: string[];
  visualSvg?: string;
  colorOptions?: { name: string; hex: string }[];
}

export interface PublicDesignItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  patternStyle?: string;
  applicationType?: string;
  images: string[];
  videoUrl?: string | null;
  colorPalette?: { name: string; hex: string }[];
  suitableProducts?: string[];
  sortOrder: number;
}

export interface PublicServiceItem {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  keyFeatures: string[];
  deliverables: string[];
  iconName: string;
  imageUrl?: string;
  isAvailable: boolean;
  sortOrder?: number;
}

export interface CustomerQuoteRequest {
  id?: string;
  referenceNumber: string; // e.g. XFR-2026-0042
  requestType: 'material_only' | 'installation_only' | 'turnkey' | 'site_assessment';
  materialCategory?: string;
  selectedProduct?: string;
  estimatedQuantity?: string;
  projectAddress: string;
  projectCity: string;
  projectState: string;
  desiredTimeline?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  companyName?: string;
  siteNotes?: string;
  attachmentUrls?: string[];
  createdAt: string;
  status: 'received' | 'in_review' | 'quotation_ready' | 'contacted';
}

export interface RequestTrackingResult {
  referenceNumber: string;
  type: 'request' | 'quotation' | 'order' | 'service';
  status: string;
  statusLabel: string;
  dateCreated: string;
  estimatedCompletion?: string;
  customerNameMasked: string; // e.g. "D*** A***"
  summary: string;
  steps: {
    title: string;
    description: string;
    completed: boolean;
    current?: boolean;
    date?: string;
  }[];
}
