/**
 * Media, Designs & Project Gallery Repository
 * Module 07 — Media, Designs & Project Gallery
 *
 * XFORCE Construction Ltd / X-FORCE BRICKS
 * Single-Business Architecture
 *
 * Resilient Supabase integration with PWA offline-first cache
 * for media assets, design inspiration showcases, and completed project portfolios.
 */

import { getSupabaseClient } from '../lib/supabase/client';
import { appConfig } from '../config/app.config';
import { localStore } from '../lib/storage/localStorage';
import {
  MediaAsset,
  DesignItem,
  DesignFormData,
  ProjectGalleryItem,
  ProjectFormData,
} from '../types/mediaGallery';
import { Result } from '../types/common';

const LOCAL_STORAGE_MEDIA_KEY = 'xforce_gallery_media_v7';
const LOCAL_STORAGE_DESIGNS_KEY = 'xforce_gallery_designs_v7';
const LOCAL_STORAGE_PROJECTS_KEY = 'xforce_gallery_projects_v7';

// Initial realistic design concepts for XFORCE Construction Ltd
const INITIAL_DESIGNS: DesignItem[] = [
  {
    id: 'd7000000-0000-0000-0000-000000000001',
    title: '45° Interlocking Herringbone Pavement',
    slug: '45-degree-interlocking-herringbone',
    description: 'Supreme mechanical interlock providing maximum resistance to vehicle braking and rotational wheel shear. Ideal for driveways, container yards, and heavy-traffic commercial loading aprons.',
    category: 'Interlocking Paving',
    patternStyle: '45° Herringbone',
    applicationType: 'Heavy Vehicle Yard',
    images: [
      'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?auto=format&fit=crop&w=1200&q=80',
    ],
    videoUrl: null,
    colorPalette: [
      { name: 'Terracotta Red', hex: '#C05621' },
      { name: 'Charcoal Black', hex: '#2D3748' },
      { name: 'Natural Grey', hex: '#718096' },
    ],
    suitableProducts: ['80mm Heavy-Duty Interlocking Paver', '60mm Standard Interlocking Paver'],
    isPublished: true,
    sortOrder: 1,
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
  },
  {
    id: 'd7000000-0000-0000-0000-000000000002',
    title: 'Mortarless Dry-Stack Stretcher Wall Bond',
    slug: 'mortarless-dry-stack-stretcher-wall',
    description: 'Eco-engineered dry-stack masonry utilizing precision tongue-and-groove interlocking blocks. Eliminates mortar bedding between courses, expedites construction velocity, and maintains superior thermal mass.',
    category: 'Structural Wall Masonry',
    patternStyle: 'Stretcher Bond (Dry-Stack)',
    applicationType: 'Exterior Building Wall',
    images: [
      'https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    ],
    videoUrl: null,
    colorPalette: [
      { name: 'Natural Clay Ochre', hex: '#D69E2E' },
      { name: 'Earthy Terracotta', hex: '#9C4221' },
      { name: 'Granite Charcoal', hex: '#1A202C' },
    ],
    suitableProducts: ['220mm Hydraform Interlocking Earth Block', 'Cored Interlocking Conduit Block'],
    isPublished: true,
    sortOrder: 2,
    createdAt: '2026-01-18T10:30:00Z',
    updatedAt: '2026-01-18T10:30:00Z',
  },
  {
    id: 'd7000000-0000-0000-0000-000000000003',
    title: 'Basket Weave Pedestrian Terrace Bond',
    slug: 'basket-weave-pedestrian-terrace',
    description: 'Timeless geometric dual-paver layout combining pairs of blocks in alternating orthogonal orientations. Produces an elegant woven aesthetic for outdoor living spaces, pool patios, and garden plazas.',
    category: 'Interlocking Paving',
    patternStyle: 'Basket Weave',
    applicationType: 'Pedestrian Walkway & Patio',
    images: [
      'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    ],
    videoUrl: null,
    colorPalette: [
      { name: 'Sahara Sand', hex: '#E2E8F0' },
      { name: 'Sunset Terracotta', hex: '#DD6B20' },
    ],
    suitableProducts: ['60mm Standard Interlocking Paver', '50mm Patio Paver Tile'],
    isPublished: true,
    sortOrder: 3,
    createdAt: '2026-01-20T14:00:00Z',
    updatedAt: '2026-01-20T14:00:00Z',
  },
  {
    id: 'd7000000-0000-0000-0000-000000000004',
    title: 'Soldier Course Boundary & Kerb Edge Trim',
    slug: 'soldier-course-boundary-kerb-edge',
    description: 'Vertically stacked soldier pavers forming a distinct containment frame along roadway curbs, garden perimeters, and steps. Locks internal paver fields firmly against lateral displacement.',
    category: 'Perimeter & Trims',
    patternStyle: 'Soldier Course',
    applicationType: 'Garden Edging & Trims',
    images: [
      'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=1200&q=80',
    ],
    videoUrl: null,
    colorPalette: [
      { name: 'Midnight Charcoal', hex: '#171923' },
      { name: 'Industrial Grey', hex: '#4A5568' },
    ],
    suitableProducts: ['Cast Concrete Barrier Kerb (125x250x500mm)', '60mm Standard Interlocking Paver'],
    isPublished: true,
    sortOrder: 4,
    createdAt: '2026-01-22T11:15:00Z',
    updatedAt: '2026-01-22T11:15:00Z',
  },
];

// Initial realistic completed projects for XFORCE Construction Ltd
export const INITIAL_PROJECTS: ProjectGalleryItem[] = [
  {
    id: 'e7000000-0000-0000-0000-000000000001',
    title: 'Atlantic Logistics Freight Terminal & Staging Yard',
    slug: 'atlantic-logistics-freight-terminal',
    category: 'Industrial Yard',
    location: 'Ibeju-Lekki Free Trade Zone, Lagos State',
    clientType: 'Commercial',
    status: 'completed',
    completionDate: 'November 2025',
    description: 'Turnkey paving of a 4,800m² heavy container staging yard designed to withstand axle loads up to 140 kN. Constructed with high-density 80mm interlocking pavers over laser-graded sub-base and stone-dust bedding.',
    scopeSummary: '4,800 m² heavy-duty paving, sub-base compaction testing, perimeter retaining kerbs, and integrated storm-water runoff drainage.',
    materialsUsed: [
      '80mm Heavy-Duty Interlocking Paver (45 MPa)',
      'Sharp River Sand Bedding',
      'Granite Stone Dust (0-5mm)',
      'Cast Concrete Heavy Kerbs',
    ],
    coverImageUrl: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1200&q=80',
    galleryMedia: [
      {
        id: 'pm-01-before',
        url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80',
        caption: 'Site cleared and graded prior to sub-base compaction and geotextile installation.',
        phase: 'before',
        sortOrder: 1,
      },
      {
        id: 'pm-01-during-1',
        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
        caption: 'Laser leveling of sharp sand bedding layer and laying 45° herringbone paver matrix.',
        phase: 'during',
        sortOrder: 2,
      },
      {
        id: 'pm-01-during-2',
        url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80',
        caption: 'Vibratory plate compaction with rubber protective mat to lock kiln-dried joint sand.',
        phase: 'during',
        sortOrder: 3,
      },
      {
        id: 'pm-01-after',
        url: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1200&q=80',
        caption: 'Fully operational container staging apron delivered ahead of schedule.',
        phase: 'after',
        sortOrder: 4,
      },
    ],
    videoUrl: null,
    isPublished: true,
    sortOrder: 1,
    createdAt: '2025-11-28T16:00:00Z',
    updatedAt: '2025-11-28T16:00:00Z',
  },
  {
    id: 'e7000000-0000-0000-0000-000000000002',
    title: 'The Palms Luxury Villa Residential Dry-Stack Facade',
    slug: 'the-palms-luxury-villa-facade',
    category: 'Residential Building',
    location: 'Banana Island, Ikoyi, Lagos',
    clientType: 'Residential',
    status: 'completed',
    completionDate: 'January 2026',
    description: 'High-end contemporary private residence featuring exposed interlocking earth brick walls. Mortarless dry-stack installation paired with high-performance matte silicone sealant provides aesthetic warmth and natural acoustic dampening.',
    scopeSummary: '3-story residential perimeter facade, exposed interior feature columns, and entrance foyer masonry.',
    materialsUsed: [
      '220mm Hydraform Interlocking Earth Block',
      'High-Strength Reinforced Grout',
      'Breathable Siloxane Water-Repellent Sealant',
    ],
    coverImageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    galleryMedia: [
      {
        id: 'pm-02-before',
        url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
        caption: 'Engineered raft foundation completed with vertical starter dowels positioned for block alignment.',
        phase: 'before',
        sortOrder: 1,
      },
      {
        id: 'pm-02-during',
        url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=1200&q=80',
        caption: 'Dry-stack assembly of interlocking blocks with rubber mallets ensuring 0mm mortar joint tolerance.',
        phase: 'during',
        sortOrder: 2,
      },
      {
        id: 'pm-02-after',
        url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
        caption: 'Completed residence showcasing rich natural earth tones and clean architectural shadow lines.',
        phase: 'after',
        sortOrder: 3,
      },
    ],
    videoUrl: null,
    isPublished: true,
    sortOrder: 2,
    createdAt: '2026-01-10T12:00:00Z',
    updatedAt: '2026-01-10T12:00:00Z',
  },
  {
    id: 'e7000000-0000-0000-0000-000000000003',
    title: 'Epe Waterfront Estate Architectural Perimeter Enclosure',
    slug: 'epe-waterfront-estate-perimeter',
    category: 'Perimeter Wall',
    location: 'Epe Resort Expressway, Lagos State',
    clientType: 'Commercial',
    status: 'completed',
    completionDate: 'December 2025',
    description: '1.2km structural perimeter wall engineered for high wind load resistance along the coastal breeze corridor. Features reinforced interlocking piers every 3.5m and decorative saddleback coping caps.',
    scopeSummary: '1,200 linear meters of 2.7m-high security boundary walling including reinforced pillar columns and capping.',
    materialsUsed: [
      '220mm Hydraform Interlocking Earth Block',
      'Precast Concrete Saddleback Wall Coping (300mm)',
      '12mm High-Yield Reinforcement Rebar',
    ],
    coverImageUrl: 'https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?auto=format&fit=crop&w=1200&q=80',
    galleryMedia: [
      {
        id: 'pm-03-before',
        url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80',
        caption: 'Trench excavation and lean concrete blinding along 1.2km estate perimeter contour.',
        phase: 'before',
        sortOrder: 1,
      },
      {
        id: 'pm-03-during',
        url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
        caption: 'Rapid interlocking block wall erection by trained XFORCE certified installation crew.',
        phase: 'during',
        sortOrder: 2,
      },
      {
        id: 'pm-03-after',
        url: 'https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?auto=format&fit=crop&w=1200&q=80',
        caption: 'Finished perimeter security wall with decorative concrete coping.',
        phase: 'after',
        sortOrder: 3,
      },
    ],
    videoUrl: null,
    isPublished: true,
    sortOrder: 3,
    createdAt: '2025-12-18T10:00:00Z',
    updatedAt: '2025-12-18T10:00:00Z',
  },
  {
    id: 'e7000000-0000-0000-0000-000000000004',
    title: 'Victoria Corporate Plaza Commercial Driveway & Apron',
    slug: 'victoria-corporate-plaza-driveway',
    category: 'Commercial Paving',
    location: 'Victoria Island Central Business District, Lagos',
    clientType: 'Commercial',
    status: 'in_progress',
    completionDate: 'Target: April 2026',
    description: 'Refurbishment and modernization of bank headquarters parking lot and circular VIP driveway. Incorporating dual-tone charcoal and beige interlocking stones with high-contrast disabled parking demarcations.',
    scopeSummary: '2,200 m² commercial parking lot rehabilitation, sub-grade rectification, and pedestrian sidewalk paving.',
    materialsUsed: [
      '60mm Standard Interlocking Paver (Dual Tone)',
      'Sub-base Crushed Stone Granite',
      'Drainage Channel Precast Gutters',
    ],
    coverImageUrl: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1200&q=80',
    galleryMedia: [
      {
        id: 'pm-04-before',
        url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80',
        caption: 'Demolition and extraction of aged cracked asphalt surface.',
        phase: 'before',
        sortOrder: 1,
      },
      {
        id: 'pm-04-during',
        url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80',
        caption: 'Crushed stone aggregate compaction and bedding screed alignment.',
        phase: 'during',
        sortOrder: 2,
      },
    ],
    videoUrl: null,
    isPublished: true,
    sortOrder: 4,
    createdAt: '2026-02-05T08:30:00Z',
    updatedAt: '2026-02-05T08:30:00Z',
  },
];

// Initial realistic media records for XFORCE Construction Ltd
const INITIAL_MEDIA_ASSETS: MediaAsset[] = [
  {
    id: 'f7000000-0000-0000-0000-000000000001',
    storageProvider: 'supabase',
    storageBucket: 'project-media',
    storagePath: 'projects/atlantic-terminal-yard.jpg',
    publicUrl: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1200&q=80',
    fileName: 'atlantic-terminal-yard.jpg',
    mimeType: 'image/jpeg',
    fileSize: 1420500,
    altText: 'Heavy-duty 80mm interlocking paver container apron in Ibeju-Lekki',
    caption: 'Atlantic Logistics Freight Terminal & Staging Yard',
    category: 'Completed Projects',
    entityType: 'project',
    entityId: 'e7000000-0000-0000-0000-000000000001',
    isPublished: true,
    createdAt: '2025-11-28T16:00:00Z',
  },
  {
    id: 'f7000000-0000-0000-0000-000000000002',
    storageProvider: 'supabase',
    storageBucket: 'project-media',
    storagePath: 'designs/45-degree-herringbone-pave.jpg',
    publicUrl: 'https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?auto=format&fit=crop&w=1200&q=80',
    fileName: '45-degree-herringbone-pave.jpg',
    mimeType: 'image/jpeg',
    fileSize: 1890300,
    altText: '45 degree interlocking herringbone pavement bond pattern',
    caption: 'High-torque pavement shear resistance pattern',
    category: 'Design Inspiration',
    entityType: 'design',
    entityId: 'd7000000-0000-0000-0000-000000000001',
    isPublished: true,
    createdAt: '2026-01-15T09:00:00Z',
  },
  {
    id: 'f7000000-0000-0000-0000-000000000003',
    storageProvider: 'supabase',
    storageBucket: 'project-media',
    storagePath: 'projects/palms-villa-ikoyi.jpg',
    publicUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    fileName: 'palms-villa-ikoyi.jpg',
    mimeType: 'image/jpeg',
    fileSize: 2150000,
    altText: 'The Palms Luxury Villa dry-stack exterior wall masonry in Ikoyi',
    caption: 'Exposed Hydraform interlocking brick facade',
    category: 'Completed Projects',
    entityType: 'project',
    entityId: 'e7000000-0000-0000-0000-000000000002',
    isPublished: true,
    createdAt: '2026-01-10T12:00:00Z',
  },
  {
    id: 'f7000000-0000-0000-0000-000000000004',
    storageProvider: 'supabase',
    storageBucket: 'business-assets',
    storagePath: 'designs/basket-weave-terrace.jpg',
    publicUrl: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1200&q=80',
    fileName: 'basket-weave-terrace.jpg',
    mimeType: 'image/jpeg',
    fileSize: 1340100,
    altText: 'Basket weave interlocking paver layout for residential patio',
    caption: 'Dual paver basket weave arrangement',
    category: 'Design Inspiration',
    entityType: 'design',
    entityId: 'd7000000-0000-0000-0000-000000000003',
    isPublished: true,
    createdAt: '2026-01-20T14:00:00Z',
  },
];

class MediaGalleryRepository {
  // --------------------------------------------------------------------------
  // DESIGNS OPERATIONS
  // --------------------------------------------------------------------------

  async getAllDesigns(): Promise<Result<DesignItem[]>> {
    try {
      if (appConfig.supabase.isConfigured) {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('designs' as any)
          .select('*')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped: DesignItem[] = data.map((d: any) => ({
            id: d.id,
            title: d.title,
            slug: d.slug,
            description: d.description,
            category: d.category,
            patternStyle: d.pattern_style,
            applicationType: d.application_type,
            images: Array.isArray(d.images) ? d.images : [],
            videoUrl: d.video_url,
            colorPalette: Array.isArray(d.color_palette) ? d.color_palette : [],
            suitableProducts: Array.isArray(d.suitable_products) ? d.suitable_products : [],
            isPublished: Boolean(d.is_published),
            sortOrder: d.sort_order ?? 0,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }));
          localStore.set(LOCAL_STORAGE_DESIGNS_KEY, mapped);
          return { success: true, data: mapped };
        }
      }
    } catch {
      // fallback to local cache
    }

    const cached = localStore.get<DesignItem[]>(LOCAL_STORAGE_DESIGNS_KEY, []);
    if (cached && cached.length > 0) {
      return { success: true, data: cached };
    }

    localStore.set(LOCAL_STORAGE_DESIGNS_KEY, INITIAL_DESIGNS);
    return { success: true, data: INITIAL_DESIGNS };
  }

  async getPublishedDesigns(): Promise<Result<DesignItem[]>> {
    const all = await this.getAllDesigns();
    if (!all.success || !all.data) {
      return all;
    }
    return {
      success: true,
      data: all.data.filter((d) => d.isPublished),
    };
  }

  async getDesignById(id: string): Promise<Result<DesignItem>> {
    const all = await this.getAllDesigns();
    if (!all.success || !all.data) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Failed to load designs' } };
    }
    const found = all.data.find((d) => d.id === id || d.slug === id);
    if (!found) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Design item not found' } };
    }
    return { success: true, data: found };
  }

  async saveDesign(formData: DesignFormData, existingId?: string): Promise<Result<DesignItem>> {
    const now = new Date().toISOString();
    const id = existingId || `d7000000-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 6)}`;
    const designRecord: DesignItem = {
      id,
      title: formData.title.trim(),
      slug: formData.slug.trim() || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      description: formData.description.trim(),
      category: formData.category,
      patternStyle: formData.patternStyle,
      applicationType: formData.applicationType,
      images: formData.images,
      videoUrl: formData.videoUrl?.trim() || null,
      colorPalette: formData.colorPalette,
      suitableProducts: formData.suitableProducts,
      isPublished: formData.isPublished,
      sortOrder: formData.sortOrder,
      createdAt: now,
      updatedAt: now,
    };

    // Try Supabase if configured
    if (appConfig.supabase.isConfigured) {
      try {
        const supabase = getSupabaseClient();
        const payload = {
          id: designRecord.id,
          title: designRecord.title,
          slug: designRecord.slug,
          description: designRecord.description,
          category: designRecord.category,
          pattern_style: designRecord.patternStyle,
          application_type: designRecord.applicationType,
          images: designRecord.images,
          video_url: designRecord.videoUrl,
          color_palette: designRecord.colorPalette,
          suitable_products: designRecord.suitableProducts,
          is_published: designRecord.isPublished,
          sort_order: designRecord.sortOrder,
          updated_at: now,
        };

        if (existingId) {
          await supabase.from('designs' as any).update(payload).eq('id', existingId);
        } else {
          await supabase.from('designs' as any).insert([payload]);
        }
      } catch {
        // Continue with local sync
      }
    }

    // Update local cache
    const allDesignsRes = await this.getAllDesigns();
    const current: DesignItem[] = allDesignsRes.success ? allDesignsRes.data : [];
    const idx = current.findIndex((d: DesignItem) => d.id === id);
    let updatedList: DesignItem[];
    if (idx >= 0) {
      updatedList = [...current];
      updatedList[idx] = { ...current[idx], ...designRecord, createdAt: current[idx].createdAt };
    } else {
      updatedList = [designRecord, ...current];
    }

    localStore.set(LOCAL_STORAGE_DESIGNS_KEY, updatedList);
    window.dispatchEvent(new CustomEvent('xforce_designs_updated', { detail: designRecord }));
    return { success: true, data: idx >= 0 ? updatedList[idx] : designRecord };
  }

  async deleteDesign(id: string): Promise<Result<void>> {
    if (appConfig.supabase.isConfigured) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from('designs' as any).delete().eq('id', id);
      } catch {
        // Fallback
      }
    }

    const allDesignsRes = await this.getAllDesigns();
    const current: DesignItem[] = allDesignsRes.success ? allDesignsRes.data : [];
    const updated = current.filter((d: DesignItem) => d.id !== id);
    localStore.set(LOCAL_STORAGE_DESIGNS_KEY, updated);
    window.dispatchEvent(new CustomEvent('xforce_designs_updated'));
    return { success: true, data: undefined };
  }

  async toggleDesignPublish(id: string): Promise<Result<DesignItem>> {
    const currentRes = await this.getDesignById(id);
    if (!currentRes.success || !currentRes.data) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Design item not found' } };
    }
    const item = currentRes.data;
    return this.saveDesign(
      {
        title: item.title,
        slug: item.slug,
        description: item.description,
        category: item.category,
        patternStyle: item.patternStyle || '',
        applicationType: item.applicationType || '',
        images: item.images,
        videoUrl: item.videoUrl || '',
        colorPalette: item.colorPalette || [],
        suitableProducts: item.suitableProducts || [],
        isPublished: !item.isPublished,
        sortOrder: item.sortOrder,
      },
      item.id
    );
  }

  // --------------------------------------------------------------------------
  // PROJECTS OPERATIONS
  // --------------------------------------------------------------------------

  async getAllProjects(): Promise<Result<ProjectGalleryItem[]>> {
    try {
      if (appConfig.supabase.isConfigured) {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('projects' as any)
          .select('*')
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped: ProjectGalleryItem[] = data.map((p: any) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            category: p.category,
            location: p.location,
            clientType: p.client_type,
            status: p.status,
            completionDate: p.completion_date,
            description: p.description,
            scopeSummary: p.scope_summary,
            materialsUsed: Array.isArray(p.materials_used) ? p.materials_used : [],
            coverImageUrl: p.cover_image_url,
            galleryMedia: Array.isArray(p.gallery_media) ? p.gallery_media : [],
            videoUrl: p.video_url,
            isPublished: Boolean(p.is_published),
            sortOrder: p.sort_order ?? 0,
            createdAt: p.created_at,
            updatedAt: p.updated_at,
          }));
          localStore.set(LOCAL_STORAGE_PROJECTS_KEY, mapped);
          return { success: true, data: mapped };
        }
      }
    } catch {
      // fallback
    }

    const cached = localStore.get<ProjectGalleryItem[]>(LOCAL_STORAGE_PROJECTS_KEY, []);
    if (cached && cached.length > 0) {
      return { success: true, data: cached };
    }

    localStore.set(LOCAL_STORAGE_PROJECTS_KEY, INITIAL_PROJECTS);
    return { success: true, data: INITIAL_PROJECTS };
  }

  async getPublishedProjects(): Promise<Result<ProjectGalleryItem[]>> {
    const all = await this.getAllProjects();
    if (!all.success || !all.data) {
      return all;
    }
    return {
      success: true,
      data: all.data.filter((p) => p.isPublished),
    };
  }

  async getProjectById(id: string): Promise<Result<ProjectGalleryItem>> {
    const all = await this.getAllProjects();
    if (!all.success || !all.data) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Failed to load projects' } };
    }
    const found = all.data.find((p) => p.id === id || p.slug === id);
    if (!found) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } };
    }
    return { success: true, data: found };
  }

  async saveProject(formData: ProjectFormData, existingId?: string): Promise<Result<ProjectGalleryItem>> {
    const now = new Date().toISOString();
    const id = existingId || `e7000000-${Date.now().toString(16).padStart(4, '0')}-${Math.random().toString(16).slice(2, 6).padEnd(4, '0')}-000000000001`;
    const projectRecord: ProjectGalleryItem = {
      id,
      title: formData.title.trim(),
      slug: formData.slug.trim() || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      category: formData.category,
      location: formData.location.trim(),
      clientType: formData.clientType,
      status: formData.status,
      completionDate: formData.completionDate.trim() || undefined,
      description: formData.description.trim(),
      scopeSummary: formData.scopeSummary.trim() || undefined,
      materialsUsed: formData.materialsUsed,
      coverImageUrl: formData.coverImageUrl.trim() || (formData.galleryMedia[0]?.url ?? ''),
      galleryMedia: formData.galleryMedia,
      videoUrl: formData.videoUrl.trim() || null,
      isPublished: formData.isPublished,
      sortOrder: formData.sortOrder,
      createdAt: now,
      updatedAt: now,
    };

    if (appConfig.supabase.isConfigured) {
      try {
        const supabase = getSupabaseClient();
        const payload = {
          id: projectRecord.id,
          title: projectRecord.title,
          slug: projectRecord.slug,
          category: projectRecord.category,
          location: projectRecord.location,
          client_type: projectRecord.clientType,
          status: projectRecord.status,
          completion_date: projectRecord.completionDate,
          description: projectRecord.description,
          scope_summary: projectRecord.scopeSummary,
          materials_used: projectRecord.materialsUsed,
          cover_image_url: projectRecord.coverImageUrl,
          gallery_media: projectRecord.galleryMedia,
          video_url: projectRecord.videoUrl,
          is_published: projectRecord.isPublished,
          sort_order: projectRecord.sortOrder,
          updated_at: now,
        };

        if (existingId) {
          await supabase.from('projects' as any).update(payload).eq('id', existingId);
        } else {
          await supabase.from('projects' as any).insert([payload]);
        }
      } catch {
        // Continue with local sync
      }
    }

    const allProjectsRes = await this.getAllProjects();
    const current: ProjectGalleryItem[] = allProjectsRes.success ? allProjectsRes.data : [];
    const idx = current.findIndex((p: ProjectGalleryItem) => p.id === id);
    let updatedList: ProjectGalleryItem[];
    if (idx >= 0) {
      updatedList = [...current];
      updatedList[idx] = { ...current[idx], ...projectRecord, createdAt: current[idx].createdAt };
    } else {
      updatedList = [projectRecord, ...current];
    }

    localStore.set(LOCAL_STORAGE_PROJECTS_KEY, updatedList);
    window.dispatchEvent(new CustomEvent('xforce_projects_updated', { detail: projectRecord }));
    try {
      fetch('/api/public/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects: updatedList.filter((p) => p.isPublished) }),
      }).catch(() => {});
    } catch {
      // Safe exit
    }
    return { success: true, data: idx >= 0 ? updatedList[idx] : projectRecord };
  }

  async deleteProject(id: string): Promise<Result<void>> {
    if (appConfig.supabase.isConfigured) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from('projects' as any).delete().eq('id', id);
      } catch {
        // Fallback
      }
    }

    const allProjectsRes = await this.getAllProjects();
    const current: ProjectGalleryItem[] = allProjectsRes.success ? allProjectsRes.data : [];
    const updated = current.filter((p: ProjectGalleryItem) => p.id !== id);
    localStore.set(LOCAL_STORAGE_PROJECTS_KEY, updated);
    window.dispatchEvent(new CustomEvent('xforce_projects_updated'));
    try {
      fetch('/api/public/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects: updated.filter((p) => p.isPublished) }),
      }).catch(() => {});
    } catch {
      // Safe exit
    }
    return { success: true, data: undefined };
  }

  async toggleProjectPublish(id: string): Promise<Result<ProjectGalleryItem>> {
    const currentRes = await this.getProjectById(id);
    if (!currentRes.success || !currentRes.data) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } };
    }
    const item = currentRes.data;
    return this.saveProject(
      {
        title: item.title,
        slug: item.slug,
        category: item.category,
        location: item.location,
        clientType: item.clientType || 'Commercial',
        status: item.status,
        completionDate: item.completionDate || '',
        description: item.description,
        scopeSummary: item.scopeSummary || '',
        materialsUsed: item.materialsUsed,
        coverImageUrl: item.coverImageUrl,
        galleryMedia: item.galleryMedia,
        videoUrl: item.videoUrl || '',
        isPublished: !item.isPublished,
        sortOrder: item.sortOrder,
      },
      item.id
    );
  }

  async resetToDefaultProjects(): Promise<Result<ProjectGalleryItem[]>> {
    localStore.set(LOCAL_STORAGE_PROJECTS_KEY, INITIAL_PROJECTS);
    window.dispatchEvent(new CustomEvent('xforce_projects_updated'));
    return { success: true, data: INITIAL_PROJECTS };
  }

  // --------------------------------------------------------------------------
  // MEDIA ASSETS OPERATIONS
  // --------------------------------------------------------------------------

  async getAllMedia(): Promise<Result<MediaAsset[]>> {
    try {
      if (appConfig.supabase.isConfigured) {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('media' as any)
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped: MediaAsset[] = data.map((m: any) => ({
            id: m.id,
            storageProvider: m.storage_provider,
            storageBucket: m.storage_bucket,
            storagePath: m.storage_path,
            publicUrl: m.public_url,
            fileName: m.file_name,
            mimeType: m.mime_type,
            fileSize: m.file_size,
            altText: m.alt_text,
            caption: m.caption,
            category: m.category || 'general',
            entityType: m.entity_type,
            entityId: m.entity_id,
            isPublished: Boolean(m.is_published),
            createdBy: m.created_by,
            createdAt: m.created_at,
          }));
          localStore.set(LOCAL_STORAGE_MEDIA_KEY, mapped);
          return { success: true, data: mapped };
        }
      }
    } catch {
      // fallback
    }

    const cached = localStore.get<MediaAsset[]>(LOCAL_STORAGE_MEDIA_KEY, []);
    if (cached && cached.length > 0) {
      return { success: true, data: cached };
    }

    localStore.set(LOCAL_STORAGE_MEDIA_KEY, INITIAL_MEDIA_ASSETS);
    return { success: true, data: INITIAL_MEDIA_ASSETS };
  }

  async saveMedia(media: MediaAsset): Promise<Result<MediaAsset>> {
    if (appConfig.supabase.isConfigured) {
      try {
        const supabase = getSupabaseClient();
        const payload = {
          id: media.id,
          storage_provider: media.storageProvider,
          storage_bucket: media.storageBucket,
          storage_path: media.storagePath,
          public_url: media.publicUrl,
          file_name: media.fileName,
          mime_type: media.mimeType,
          file_size: media.fileSize,
          alt_text: media.altText,
          caption: media.caption,
          category: media.category,
          entity_type: media.entityType,
          entity_id: media.entityId,
          is_published: media.isPublished,
          created_at: media.createdAt,
        };
        await supabase.from('media' as any).upsert([payload]);
      } catch {
        // Continue with local sync
      }
    }

    const allMediaRes = await this.getAllMedia();
    const current: MediaAsset[] = allMediaRes.success ? allMediaRes.data : [];
    const idx = current.findIndex((m: MediaAsset) => m.id === media.id);
    let updatedList: MediaAsset[];
    if (idx >= 0) {
      updatedList = [...current];
      updatedList[idx] = media;
    } else {
      updatedList = [media, ...current];
    }

    localStore.set(LOCAL_STORAGE_MEDIA_KEY, updatedList);
    window.dispatchEvent(new CustomEvent('xforce_media_updated', { detail: media }));
    return { success: true, data: media };
  }

  async deleteMedia(id: string): Promise<Result<void>> {
    if (appConfig.supabase.isConfigured) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from('media' as any).delete().eq('id', id);
      } catch {
        // Fallback
      }
    }

    const allMediaRes = await this.getAllMedia();
    const current: MediaAsset[] = allMediaRes.success ? allMediaRes.data : [];
    const updated = current.filter((m: MediaAsset) => m.id !== id);
    localStore.set(LOCAL_STORAGE_MEDIA_KEY, updated);
    window.dispatchEvent(new CustomEvent('xforce_media_updated'));
    return { success: true, data: undefined };
  }
}

export const mediaGalleryRepository = new MediaGalleryRepository();
