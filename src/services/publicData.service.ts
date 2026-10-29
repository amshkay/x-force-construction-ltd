/**
 * Public Data Service
 *
 * Module 05: Public Website & Customer Experience
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Facilitates safe, unauthenticated public read operations from Supabase
 * with resilient offline caching and graceful empty states.
 * Strictly separates public views from internal administrative tables.
 */

import { getSupabaseClient } from '../lib/supabase/client';
import { appConfig } from '../config/app.config';
import { localStore } from '../lib/storage/localStorage';
import { productRepository } from '../repositories/product.repository';
import { mediaGalleryRepository, INITIAL_PROJECTS } from '../repositories/mediaGallery.repository';
import { requestRepository } from '../repositories/request.repository';
import { quotationRepository } from '../repositories/quotation.repository';
import { orderRepository } from '../repositories/order.repository';
import { installationRepository } from '../repositories/installation.repository';
import {
  PublicCategory,
  PublicProduct,
  PublicProductVariant,
  PublicProject,
  PublicDesignPattern,
  PublicDesignItem,
  PublicServiceItem,
  CustomerQuoteRequest,
  RequestTrackingResult,
} from '../types/public';

const QUOTE_REQUESTS_STORAGE_KEY = 'xforce_customer_quote_requests';

export const DEFAULT_PUBLIC_SERVICES: PublicServiceItem[] = [
  {
    id: 'srv-interlocking-masonry',
    title: 'Interlocking Brick Wall Construction',
    shortDescription:
      'Specialized bricklaying by certified X-FORCE masons using mortarless dry-stack or thin-bed techniques.',
    fullDescription:
      'Our certified masonry teams ensure true plumb, precise level, and uniform interlocking keys for both load-bearing and decorative facing walls. Dry-stack installation drastically reduces water and cement consumption on site while providing superior thermal and acoustic performance.',
    keyFeatures: [
      'Laser-guided vertical alignment check',
      'Mortarless tongue-and-groove precision locking',
      'Integrated tie-beam structural anchoring',
      'Zero plastering needed: pristine natural facade',
    ],
    deliverables: [
      'Master mason on-site supervision',
      'Daily progress and quality verification logs',
      'Structural guarantee on masonry joints',
    ],
    iconName: 'Wrench',
    imageUrl: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    sortOrder: 1,
  },
  {
    id: 'srv-pavement-laying',
    title: 'Commercial & Residential Pavement Laying',
    shortDescription:
      'Complete sub-base preparation, compacted aggregate bed, and mechanized compaction for driveways and yards.',
    fullDescription:
      'Proper paving performance is 80% sub-base engineering. We perform geotextile membrane placement, crushed stone grading, laser slope leveling for rain runoff, sand screeding, and heavy vibratory plate compaction with rubber mats.',
    keyFeatures: [
      'Slope engineering to eliminate standing water puddles',
      'Perimeter concrete haunching and kerb lock',
      'Fine kiln-dried silica sand joint filling',
      'High shear resistance against vehicle tire turning',
    ],
    deliverables: [
      'Compaction density verification',
      'Pavement drainage slope certification',
      '12-month settlement warranty',
    ],
    iconName: 'Ruler',
    imageUrl: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    sortOrder: 2,
  },
  {
    id: 'srv-site-assessment',
    title: 'On-Site Inspection & Quantity Surveying',
    shortDescription:
      'Pre-construction site visit by an experienced technician to measure terrain and calculate exact materials.',
    fullDescription:
      'Avoid costly material shortages or wasteful over-ordering. Our quantity surveyor evaluates soil conditions, checks site accessibility for delivery trucks, measures exact perimeters, and provides an optimized cutting and quantity plan.',
    keyFeatures: [
      'Accurate m² and block count takeoff',
      'Site access logistics survey for heavy trucks',
      'Sub-soil stability recommendations',
      'Physical brick and color sample board review on site',
    ],
    deliverables: [
      'Detailed Bill of Quantities (BOQ)',
      'Logistics and offloading plan',
      'Customized technical quotation',
    ],
    iconName: 'ShieldCheck',
    imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    sortOrder: 3,
  },
  {
    id: 'srv-facade-sealing',
    title: 'Facade Sealing & Efflorescence Protection',
    shortDescription:
      'Post-construction penetrating hydrophobic sealing to protect exposed brick surfaces from moisture and salt staining.',
    fullDescription:
      'Coastal and humid tropical environments can cause white salt efflorescence on exposed masonry. We apply specialized silane-siloxane hydrophobic sealers that penetrate deep into the pores without altering the natural earthy tone of the brick.',
    keyFeatures: [
      'Repels rain moisture and atmospheric pollution',
      'Prevents algae and mildew formation',
      'Breathable: allows internal vapor to escape',
      'Maintains natural matte or slight satin luster',
    ],
    deliverables: [
      'Pressure wash cleaning of surface efflorescence',
      'Two-coat industrial sprayer sealant application',
      '3-year water repellency warranty',
    ],
    iconName: 'Sparkles',
    imageUrl: 'https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?auto=format&fit=crop&w=800&q=80',
    isAvailable: true,
    sortOrder: 4,
  },
];

export const DEFAULT_PUBLIC_PROJECTS: PublicProject[] = INITIAL_PROJECTS.map((p) => ({
  id: p.id,
  title: p.title,
  slug: p.slug,
  location: p.location,
  category: p.category,
  completionDate: p.completionDate || 'Recent',
  clientType: p.clientType,
  description: p.description,
  coverImageUrl: p.coverImageUrl,
  galleryImages: Array.isArray(p.galleryMedia)
    ? p.galleryMedia.map((m: any) => ({
        url: m.url,
        caption: m.caption,
        phase: m.phase,
      }))
    : [],
  materialsUsed: p.materialsUsed || [],
  scopeSummary: p.scopeSummary,
  status: p.status || 'completed',
}));

export class PublicDataService {
  /**
   * Fetch all active product categories
   */
  async getCategories(): Promise<PublicCategory[]> {
    try {
      const cats = await productRepository.getAllCategories();
      return cats
        .filter((c) => c.isActive)
        .map((cat) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          imageUrl: cat.imageUrl,
          sortOrder: cat.sortOrder,
        }));
    } catch (err) {
      console.warn('[PublicDataService] Error fetching categories:', err);
      return [];
    }
  }

  /**
   * Fetch published products with variants
   * Only returns active, published items and strictly omits cost_price and internal fields.
   */
  async getProducts(options?: {
    categoryId?: string;
    searchQuery?: string;
  }): Promise<PublicProduct[]> {
    try {
      const allProducts = await productRepository.getAllProducts();
      // Public view filter: ONLY active and published products
      let filtered = allProducts.filter((p) => p.isActive && p.isPublished);

      if (options?.categoryId && options.categoryId !== 'all') {
        filtered = filtered.filter((p) => p.categoryId === options.categoryId);
      }

      if (options?.searchQuery) {
        const q = options.searchQuery.toLowerCase().trim();
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            (p.categoryName && p.categoryName.toLowerCase().includes(q)) ||
            (p.shortDescription && p.shortDescription.toLowerCase().includes(q)) ||
            (p.description && p.description.toLowerCase().includes(q))
        );
      }

      return filtered.map((p) => {
        const activeVariants: PublicProductVariant[] = (p.variants || [])
          .filter((v) => v.isActive)
          .map((v) => ({
            id: v.id,
            productId: v.productId,
            name: v.name,
            sku: v.sku,
            color: v.color,
            size: v.size,
            finish: v.finish,
            description: v.description,
            imageUrl: v.imageUrl,
            priceOverride: v.priceOverride,
            attributes: v.attributes,
          }));

        const primaryImage =
          (p.images && p.images.length > 0 ? p.images[0] : null) ||
          activeVariants.find((v) => v.imageUrl)?.imageUrl ||
          null;

        return {
          id: p.id,
          categoryId: p.categoryId,
          categoryName: p.categoryName || 'Building Material',
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          shortDescription: p.shortDescription,
          description: p.description,
          unit: p.unit,
          sellingPrice: p.sellingPrice,
          priceOnRequest: p.priceOnRequest,
          requiresInstallation: p.requiresInstallation,
          imageUrl: primaryImage,
          images: p.images,
          attributes: p.attributes,
          isFeatured: p.isFeatured,
          variants: activeVariants,
          isAvailable: true,
        };
      });
    } catch (err) {
      console.warn('[PublicDataService] Error querying products:', err);
      return [];
    }
  }

  /**
   * Fetch single product by slug or id
   */
  async getProductBySlugOrId(identifier: string): Promise<PublicProduct | null> {
    try {
      const allProducts = await this.getProducts();
      return (
        allProducts.find((p) => p.id === identifier || p.slug === identifier) ||
        null
      );
    } catch (err) {
      console.warn('[PublicDataService] Error fetching product detail:', err);
      return null;
    }
  }

  /**
   * Architectural Design Patterns
   * Grounded in civil engineering & interlocking masonry standards
   */
  getDesignPatterns(): PublicDesignPattern[] {
    return [
      {
        id: 'pat-herringbone-45',
        name: '45° Herringbone Bond',
        slug: 'herringbone-45',
        bondType: 'Interlocking Angular',
        recommendedUse: 'High-traffic driveways, loading yards & parking lots',
        shearResistance: 'Maximum lateral interlock (360° load distribution)',
        loadRating: 'Heavy Vehicle',
        description:
          'Blocks are laid at 45 degrees to the direction of traffic. Provides the highest mechanical resistance against braking and turning forces, preventing tire rutting and creep.',
        suitableProducts: ['Interlocking Paving Stones 80mm', 'Hydraulic Pressed Pavers'],
        colorOptions: [
          { name: 'Natural Grey', hex: '#64748b' },
          { name: 'Industrial Terracotta', hex: '#c2410c' },
          { name: 'Charcoal Black', hex: '#1e293b' },
        ],
      },
      {
        id: 'pat-herringbone-90',
        name: '90° Herringbone Bond',
        slug: 'herringbone-90',
        bondType: 'Orthogonal Angular',
        recommendedUse: 'Commercial plazas, pedestrian aprons & access ways',
        shearResistance: 'High rotational lock with easier edge cutting alignment',
        loadRating: 'Medium Traffic',
        description:
          'Blocks are oriented perpendicular to the edge restraints. Simplifies cutting at perimeter kerbs while maintaining outstanding interlocking stability for residential and medium commercial applications.',
        suitableProducts: ['Interlocking Paving Stones 60mm', 'Driveway Zig-Zag Paver'],
        colorOptions: [
          { name: 'Ochre Yellow', hex: '#d97706' },
          { name: 'Earth Red', hex: '#b91c1c' },
          { name: 'Granite Grey', hex: '#475569' },
        ],
      },
      {
        id: 'pat-stretcher-bond',
        name: 'Stretcher (Running) Bond',
        slug: 'stretcher-bond',
        bondType: 'Linear Longitudinal',
        recommendedUse: 'Garden walkways, perimeter pathways & linear verandas',
        shearResistance: 'Directional flow resistance; optimal for pedestrian traffic',
        loadRating: 'Light Pedestrian',
        description:
          'The traditional brick bond where each block overlaps the joint below by half its length. Visually extends linear perspectives along walkways and courtyards.',
        suitableProducts: ['Interlocking Soil-Cement Facing Bricks', 'Walkway Pavers'],
        colorOptions: [
          { name: 'Warm Terracotta', hex: '#ea580c' },
          { name: 'Buff Tan', hex: '#d97706' },
        ],
      },
      {
        id: 'pat-basket-weave',
        name: 'Basket Weave Bond',
        slug: 'basket-weave',
        bondType: 'Geometric Modular',
        recommendedUse: 'Patios, pool surrounds, courtyards & heritage spaces',
        shearResistance: 'Balanced square grid load distribution with rich visual texture',
        loadRating: 'Light Pedestrian',
        description:
          'Pairs of rectangular bricks laid in alternating horizontal and vertical pairs. Produces a classic woven textile aesthetic that highlights dual-color contrasts.',
        suitableProducts: ['Architectural Facing Bricks', 'Decorative Paving Bricks'],
        colorOptions: [
          { name: 'Duo Terracotta & Charcoal', hex: '#9a3412' },
          { name: 'Sandstone Ivory', hex: '#cbd5e1' },
        ],
      },
      {
        id: 'pat-dry-stack-masonry',
        name: 'Mortarless Interlocking Dry-Stack',
        slug: 'dry-stack-masonry',
        bondType: 'Tongue-and-Groove Gravity Interlock',
        recommendedUse: 'Structural building walls, perimeter fences & security enclosures',
        shearResistance: 'High seismic and shear locking through male-female interlocking keys',
        loadRating: 'Architectural Facing',
        description:
          'Patented tongue-and-groove engineering allows blocks to self-align without thick mortar beds. Delivers up to 40% construction speed advantage and superior insulation.',
        suitableProducts: ['Interlocking Soil-Cement Facing Bricks', 'Hollow Interlocking Blocks'],
        colorOptions: [
          { name: 'Natural Ochre', hex: '#b45309' },
          { name: 'Architectural Slate', hex: '#334155' },
        ],
      },
      {
        id: 'pat-soldier-course',
        name: 'Soldier & Header Border Trim',
        slug: 'soldier-course',
        bondType: 'Perimeter Restraint Edge',
        recommendedUse: 'Border edging, flowerbed containment & step risers',
        shearResistance: 'Perimeter locking against pavement edge spread',
        loadRating: 'Medium Traffic',
        description:
          'Bricks laid upright with narrow faces exposed, creating a crisp framing border along lawns, walls, and driveways.',
        suitableProducts: ['Bevelled Kerb Stones', 'Coping Tiles'],
        colorOptions: [
          { name: 'Contrasting Charcoal', hex: '#0f172a' },
          { name: 'Bold Red', hex: '#991b1b' },
        ],
      },
    ];
  }

  /**
   * Public Projects Showcase
   * Synchronously reads from local store or cache, or async from repository
   */
  getProjects(): PublicProject[] {
    const cached = localStore.get<any[]>('xforce_gallery_projects_v7', []);
    if (cached && cached.length > 0) {
      return cached
        .filter((p) => p.isPublished !== false)
        .map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          location: p.location,
          category: p.category,
          completionDate: p.completionDate || 'Recent',
          clientType: p.clientType,
          description: p.description,
          coverImageUrl: p.coverImageUrl,
          galleryImages: Array.isArray(p.galleryMedia)
            ? p.galleryMedia.map((m: any) => ({
                url: m.url,
                caption: m.caption,
                phase: m.phase,
              }))
            : [],
          materialsUsed: p.materialsUsed || [],
          scopeSummary: p.scopeSummary,
          status: p.status || 'completed',
        }));
    }

    localStore.set('xforce_gallery_projects_v7', INITIAL_PROJECTS);
    return DEFAULT_PUBLIC_PROJECTS;
  }

  /**
   * Async project retrieval for fresh Supabase fetching
   */
  async getProjectsAsync(): Promise<PublicProject[]> {
    const res = await mediaGalleryRepository.getPublishedProjects();
    if (res.success && res.data) {
      return res.data.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        location: p.location,
        category: p.category,
        completionDate: p.completionDate || 'Recent',
        clientType: p.clientType,
        description: p.description,
        coverImageUrl: p.coverImageUrl,
        galleryImages: p.galleryMedia.map((m) => ({
          url: m.url,
          caption: m.caption,
          phase: m.phase,
        })),
        materialsUsed: p.materialsUsed,
        scopeSummary: p.scopeSummary,
        status: p.status,
      }));
    }
    return this.getProjects();
  }

  /**
   * Public Design Inspiration Items
   */
  getDesignItems(): PublicDesignItem[] {
    const cached = localStore.get<any[]>('xforce_gallery_designs_v7', []);
    if (cached && cached.length > 0) {
      return cached
        .filter((d) => d.isPublished)
        .map((d) => ({
          id: d.id,
          title: d.title,
          slug: d.slug,
          description: d.description,
          category: d.category,
          patternStyle: d.patternStyle,
          applicationType: d.applicationType,
          images: d.images || [],
          videoUrl: d.videoUrl,
          colorPalette: d.colorPalette || [],
          suitableProducts: d.suitableProducts || [],
          sortOrder: d.sortOrder || 0,
        }));
    }
    return [];
  }

  /**
   * Async design items retrieval for fresh Supabase fetching
   */
  async getDesignItemsAsync(): Promise<PublicDesignItem[]> {
    const res = await mediaGalleryRepository.getPublishedDesigns();
    if (res.success && res.data) {
      return res.data.map((d) => ({
        id: d.id,
        title: d.title,
        slug: d.slug,
        description: d.description,
        category: d.category,
        patternStyle: d.patternStyle,
        applicationType: d.applicationType,
        images: d.images || [],
        videoUrl: d.videoUrl,
        colorPalette: d.colorPalette || [],
        suitableProducts: d.suitableProducts || [],
        sortOrder: d.sortOrder || 0,
      }));
    }
    return this.getDesignItems();
  }

  /**
   * Public Services
   */
  /**
   * Public Services (Specialized Installation Services)
   * Stored in persistent cache and synchronized with admin management
   */
  getServices(): PublicServiceItem[] {
    const stored = localStore.get<PublicServiceItem[] | null>('xforce_public_services_v4', null);
    if (stored && Array.isArray(stored) && stored.length > 0) {
      return stored.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }
    localStore.set('xforce_public_services_v4', DEFAULT_PUBLIC_SERVICES);
    return DEFAULT_PUBLIC_SERVICES;
  }

  saveService(serviceData: Partial<PublicServiceItem> & { title: string }): PublicServiceItem {
    const current = this.getServices();
    const id = serviceData.id || `srv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const existingIndex = current.findIndex((s) => s.id === id);

    const updatedItem: PublicServiceItem = {
      id,
      title: serviceData.title.trim(),
      shortDescription: serviceData.shortDescription?.trim() || '',
      fullDescription: serviceData.fullDescription?.trim() || serviceData.shortDescription?.trim() || '',
      keyFeatures: Array.isArray(serviceData.keyFeatures) ? serviceData.keyFeatures.filter(Boolean) : [],
      deliverables: Array.isArray(serviceData.deliverables) ? serviceData.deliverables.filter(Boolean) : [],
      iconName: serviceData.iconName || 'Wrench',
      imageUrl: serviceData.imageUrl?.trim() || '',
      isAvailable: serviceData.isAvailable !== false,
      sortOrder: serviceData.sortOrder ?? (existingIndex >= 0 ? current[existingIndex].sortOrder : current.length + 1),
    };

    let updatedList: PublicServiceItem[];
    if (existingIndex >= 0) {
      updatedList = [...current];
      updatedList[existingIndex] = updatedItem;
    } else {
      updatedList = [...current, updatedItem];
    }

    localStore.set('xforce_public_services_v4', updatedList);
    window.dispatchEvent(new CustomEvent('xforce_services_updated', { detail: updatedItem }));
    try {
      fetch('/api/public/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: updatedList }),
      }).catch(() => {});
    } catch {
      // Safe exit
    }
    return updatedItem;
  }

  deleteService(serviceId: string): boolean {
    const current = this.getServices();
    const filtered = current.filter((s) => s.id !== serviceId);
    localStore.set('xforce_public_services_v4', filtered);
    window.dispatchEvent(new CustomEvent('xforce_services_updated', { detail: { id: serviceId, deleted: true } }));
    try {
      fetch('/api/public/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: filtered }),
      }).catch(() => {});
    } catch {
      // Safe exit
    }
    return true;
  }

  resetServicesToDefaults(): PublicServiceItem[] {
    localStore.set('xforce_public_services_v4', DEFAULT_PUBLIC_SERVICES);
    window.dispatchEvent(new CustomEvent('xforce_services_updated'));
    return DEFAULT_PUBLIC_SERVICES;
  }

  /**
   * Save a customer quote request locally and in offline store
   */
  async submitQuoteRequest(
    request: Omit<CustomerQuoteRequest, 'referenceNumber' | 'createdAt' | 'status'>,
    prefix = 'XFR'
  ): Promise<CustomerQuoteRequest> {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const year = new Date().getFullYear();
    const referenceNumber = `${prefix}-${year}-${randomSuffix}`;

    const newRequest: CustomerQuoteRequest = {
      ...request,
      referenceNumber,
      createdAt: new Date().toISOString(),
      status: 'received',
    };

    // Store in local storage queue for resilience
    const existing = localStore.get<CustomerQuoteRequest[]>(QUOTE_REQUESTS_STORAGE_KEY, []);
    existing.unshift(newRequest);
    localStore.set(QUOTE_REQUESTS_STORAGE_KEY, existing.slice(0, 50));

    return newRequest;
  }

  /**
   * Track status of a request, quotation or order reference
   */
  async trackReference(reference: string): Promise<RequestTrackingResult | null> {
    const trimmed = reference.trim().toUpperCase();

    // 0. Check Service Job Repository (Module 15)
    try {
      const dbServiceJob = await installationRepository.getByJobReference(trimmed);
      if (dbServiceJob) {
        const maskedName = dbServiceJob.customerName
          .split(' ')
          .map((part) => (part.length > 1 ? part[0] + '*'.repeat(part.length - 1) : part))
          .join(' ');

        const isArrivalOrLater = ['on_site', 'inspection', 'preparation', 'installation', 'quality_check', 'final_cleaning', 'customer_confirmation', 'completed'].includes(dbServiceJob.status);
        const isPrepOrLater = ['preparation', 'installation', 'quality_check', 'final_cleaning', 'customer_confirmation', 'completed'].includes(dbServiceJob.status);
        const isInstallOrLater = ['installation', 'quality_check', 'final_cleaning', 'customer_confirmation', 'completed'].includes(dbServiceJob.status);
        const isQcOrLater = ['quality_check', 'final_cleaning', 'customer_confirmation', 'completed'].includes(dbServiceJob.status);
        const isCleanOrLater = ['final_cleaning', 'customer_confirmation', 'completed'].includes(dbServiceJob.status);
        const isCompleted = dbServiceJob.status === 'completed';

        return {
          referenceNumber: dbServiceJob.jobReference,
          type: 'service',
          status: dbServiceJob.status,
          statusLabel: `Service: ${dbServiceJob.serviceTypeLabel} (${dbServiceJob.status.replace(/_/g, ' ').toUpperCase()})`,
          dateCreated: dbServiceJob.createdAt.split('T')[0],
          estimatedCompletion: dbServiceJob.scheduledDate ? `Scheduled: ${dbServiceJob.scheduledDate}` : 'In Progress',
          customerNameMasked: maskedName || 'Verified Client',
          summary: `${dbServiceJob.serviceTypeLabel} at ${dbServiceJob.siteAddress}. ${dbServiceJob.customerVisibleNotes || ''}`,
          steps: [
            {
              title: 'Service Scheduled & Assigned',
              description: dbServiceJob.scheduledDate ? `Scheduled for ${dbServiceJob.scheduledDate}. Team dispatched.` : 'Work registered into operations queue.',
              completed: true,
              current: dbServiceJob.status === 'scheduled' || dbServiceJob.status === 'assigned',
              date: dbServiceJob.scheduledDate || dbServiceJob.createdAt.split('T')[0],
            },
            {
              title: 'Site Arrival & Inspection',
              description: isArrivalOrLater
                ? 'Team on site. Surface survey and foundation leveling audited.'
                : 'Technicians arriving on site.',
              completed: isArrivalOrLater,
              current: dbServiceJob.status === 'on_site' || dbServiceJob.status === 'inspection',
            },
            {
              title: 'Site & Surface Preparation',
              description: isPrepOrLater
                ? 'Surface swept, guide lines set, materials staged.'
                : 'Preparation pending.',
              completed: isPrepOrLater,
              current: dbServiceJob.status === 'preparation',
            },
            {
              title: 'Brick Laying / Installation',
              description: isInstallOrLater
                ? dbServiceJob.installationDetails?.squareMetersInstalled
                  ? `Installation in progress (${dbServiceJob.installationDetails.squareMetersInstalled} m² laid).`
                  : 'Laying interlocking masonry and structural courses.'
                : 'Awaiting starter course.',
              completed: isInstallOrLater,
              current: dbServiceJob.status === 'installation',
            },
            {
              title: 'Quality Check & Cleaning',
              description: isQcOrLater
                ? 'Plumb, true level verified, efflorescence cleaned.'
                : 'Awaiting installation completion.',
              completed: isQcOrLater,
              current: dbServiceJob.status === 'quality_check' || dbServiceJob.status === 'final_cleaning',
            },
            {
              title: 'Completed & Client Sign-Off',
              description: isCompleted
                ? 'Handover completed and signed off.'
                : 'Pending final handover walk-through.',
              completed: isCompleted,
              current: dbServiceJob.status === 'customer_confirmation',
            },
          ],
        };
      }
    } catch (err) {
      console.warn('[PublicDataService] Error querying installationRepository:', err);
    }

    // 1. Check Authoritative Customer Request Repository (Module 09)
    try {
      const dbRequest = await requestRepository.getRequestByNumber(trimmed);
      if (dbRequest) {
        const maskedName = dbRequest.customerName
          .split(' ')
          .map((part) => (part.length > 1 ? part[0] + '*'.repeat(part.length - 1) : part))
          .join(' ');

        const isReviewed = dbRequest.status !== 'submitted';
        const isQuoteReady =
          dbRequest.status === 'quotation_prepared' ||
          dbRequest.status === 'quotation_sent' ||
          dbRequest.status === 'customer_reviewing' ||
          dbRequest.status === 'accepted';
        const isAccepted = dbRequest.status === 'accepted';

        return {
          referenceNumber: dbRequest.requestNumber,
          type: 'request',
          status: dbRequest.status,
          statusLabel: `Request: ${dbRequest.status.replace(/_/g, ' ').toUpperCase()}`,
          dateCreated: dbRequest.createdAt.split('T')[0],
          estimatedCompletion: 'Within 24 business hours',
          customerNameMasked: maskedName || 'Verified Client',
          summary: `Request for ${dbRequest.items.map((i) => i.itemName).join(', ') || 'Building Materials'} at ${dbRequest.projectCity || 'Site'}.`,
          steps: [
            {
              title: 'Request Logged',
              description: 'Project details registered into sales queue.',
              completed: true,
              current: false,
              date: dbRequest.createdAt.split('T')[0],
            },
            {
              title: 'Engineering Review',
              description: 'Site logistics, batch sizing, and delivery access assessed.',
              completed: isReviewed,
              current: !isReviewed,
            },
            {
              title: 'Official Quotation Ready',
              description: isQuoteReady && dbRequest.quotationNumber
                ? `Quotation #${dbRequest.quotationNumber} generated.`
                : 'Itemized material pricing and logistics fees compiled.',
              completed: isQuoteReady,
              current: isReviewed && !isQuoteReady,
            },
            {
              title: 'Quotation Confirmation',
              description: isAccepted
                ? 'Client approved terms and pricing.'
                : 'Under consideration by client.',
              completed: isAccepted,
              current: isQuoteReady && !isAccepted,
            },
          ],
        };
      }
    } catch (err) {
      console.warn('[PublicDataService] Error querying requestRepository:', err);
    }

    // 2. Check Authoritative Quotation Repository (Module 09)
    try {
      const dbQuote = await quotationRepository.getQuotationByNumber(trimmed);
      if (dbQuote) {
        const maskedName = dbQuote.customerName
          .split(' ')
          .map((part) => (part.length > 1 ? part[0] + '*'.repeat(part.length - 1) : part))
          .join(' ');

        const isSent = dbQuote.status !== 'draft' && dbQuote.status !== 'pending_approval';
        const isAccepted = dbQuote.status === 'accepted' || dbQuote.status === 'converted';

        return {
          referenceNumber: dbQuote.quotationNumber,
          type: 'quotation',
          status: dbQuote.status,
          statusLabel: `Quotation: ${dbQuote.status.replace(/_/g, ' ').toUpperCase()}`,
          dateCreated: dbQuote.quotationDate,
          customerNameMasked: maskedName || 'Verified Client',
          summary: `Official X-FORCE quotation valid until ${dbQuote.validUntil}. Total: ${dbQuote.currency} ${dbQuote.totalAmount.toLocaleString()}`,
          steps: [
            {
              title: 'Quotation Generated',
              description: 'Verified unit rates and logistical haulage charges computed.',
              completed: true,
              current: false,
              date: dbQuote.quotationDate,
            },
            {
              title: 'Sent to Customer',
              description: 'Official quote communicated to client for appraisal.',
              completed: isSent,
              current: !isSent,
            },
            {
              title: 'Customer Review & Decision',
              description: isAccepted ? 'Client accepted quotation terms.' : 'Awaiting client response.',
              completed: isAccepted,
              current: isSent && !isAccepted,
            },
            {
              title: 'Order Conversion',
              description: isAccepted ? 'Ready for production booking (Module 10).' : 'Pending order confirmation.',
              completed: isAccepted,
              current: false,
            },
          ],
        };
      }
    } catch (err) {
      console.warn('[PublicDataService] Error querying quotationRepository:', err);
    }

    // 3. Check Authoritative Order Repository (Module 10)
    try {
      const dbOrder = await orderRepository.getOrderByNumber(trimmed);
      if (dbOrder) {
        const maskedName = dbOrder.customerName
          .split(' ')
          .map((part) => (part.length > 1 ? part[0] + '*'.repeat(part.length - 1) : part))
          .join(' ');

        const isConfirmed = dbOrder.status !== 'pending' && dbOrder.status !== 'cancelled';
        const isPaidOrDeposited =
          dbOrder.paymentStatus === 'partially_paid' ||
          dbOrder.paymentStatus === 'paid' ||
          dbOrder.status === 'processing' ||
          dbOrder.status === 'ready' ||
          dbOrder.status === 'completed';
        const isProduction =
          dbOrder.status === 'processing' ||
          dbOrder.status === 'ready' ||
          dbOrder.status === 'completed';
        const isReadyOrDispatched =
          dbOrder.status === 'ready' || dbOrder.status === 'completed';
        const isCompleted = dbOrder.status === 'completed';
        const isCancelled = dbOrder.status === 'cancelled';

        return {
          referenceNumber: dbOrder.orderNumber,
          type: 'order',
          status: dbOrder.status,
          statusLabel: isCancelled
            ? 'Order Cancelled'
            : `Order: ${dbOrder.status.replace(/_/g, ' ').toUpperCase()}`,
          dateCreated: dbOrder.orderDate,
          customerNameMasked: maskedName || 'Verified Client',
          summary: `Order for ${dbOrder.items.map((i) => `${i.quantity} ${i.unit} ${i.productName}`).join(', ') || 'Building Materials'}. Total: ${dbOrder.currency} ${dbOrder.totalAmount.toLocaleString()} (${dbOrder.paymentStatus.replace(/_/g, ' ').toUpperCase()}).`,
          steps: [
            {
              title: 'Order Confirmed',
              description: isConfirmed
                ? 'Order terms and item specifications locked.'
                : 'Order registered in sales queue awaiting confirmation.',
              completed: isConfirmed,
              current: !isConfirmed && !isCancelled,
              date: dbOrder.orderDate,
            },
            {
              title: 'Payment & Mobilization',
              description:
                dbOrder.paymentStatus === 'paid'
                  ? 'Payment cleared in full.'
                  : dbOrder.paymentStatus === 'partially_paid'
                  ? `Deposit recorded (${dbOrder.currency} ${dbOrder.amountPaid.toLocaleString()}).`
                  : 'Awaiting deposit or payment verification.',
              completed: isPaidOrDeposited,
              current: isConfirmed && !isPaidOrDeposited && !isCancelled,
            },
            {
              title: 'Factory Production & Curing',
              description: isProduction
                ? 'Hydraulic compaction and curing bay batching in progress.'
                : 'Queued for manufacturing.',
              completed: isProduction,
              current: isPaidOrDeposited && !isProduction && !isCancelled,
            },
            {
              title: 'Ready for Dispatch / Site Delivery',
              description: isReadyOrDispatched
                ? 'Materials palletized and ready for haulage.'
                : 'Awaiting yard inspection and loading.',
              completed: isReadyOrDispatched,
              current: isProduction && !isReadyOrDispatched && !isCancelled,
            },
            {
              title: 'Fulfilled & Delivered',
              description: isCompleted
                ? 'Materials delivered to site.'
                : 'Final delivery sign-off pending.',
              completed: isCompleted,
              current: isReadyOrDispatched && !isCompleted && !isCancelled,
            },
          ],
        };
      }
    } catch (err) {
      console.warn('[PublicDataService] Error querying orderRepository:', err);
    }

    // 4. Check local quote requests fallback
    const localRequests = localStore.get<CustomerQuoteRequest[]>(QUOTE_REQUESTS_STORAGE_KEY, []);
    const matchedLocal = localRequests.find(
      (r) => r.referenceNumber.toUpperCase() === trimmed
    );

    if (matchedLocal) {
      const maskedName = matchedLocal.customerName
        .split(' ')
        .map((part) => (part.length > 1 ? part[0] + '*'.repeat(part.length - 1) : part))
        .join(' ');

      return {
        referenceNumber: matchedLocal.referenceNumber,
        type: 'request',
        status: 'received',
        statusLabel: 'Request Logged & Under Engineering Review',
        dateCreated: matchedLocal.createdAt,
        estimatedCompletion: 'Within 24 business hours',
        customerNameMasked: maskedName || 'Verified Client',
        summary: `Quotation request for ${matchedLocal.materialCategory || 'building materials'} at ${matchedLocal.projectCity || 'site address'}.`,
        steps: [
          {
            title: 'Request Received',
            description: 'Customer project details and quantities submitted online.',
            completed: true,
            current: false,
            date: matchedLocal.createdAt.split('T')[0],
          },
          {
            title: 'Technical Review',
            description: 'Engineering sales team evaluating site specifications and logistics.',
            completed: false,
            current: true,
          },
          {
            title: 'Formal Quotation Ready',
            description: 'Itemized material pricing and delivery schedule compiled (Module 09).',
            completed: false,
            current: false,
          },
          {
            title: 'Order Dispatch & Delivery',
            description: 'Hydraulic-cured materials dispatched from factory yard (Module 10).',
            completed: false,
            current: false,
          },
        ],
      };
    }

    // 2. Check Supabase quotations or orders if database is connected
    if (appConfig.supabase.isConfigured) {
      try {
        const supabase = getSupabaseClient();

        // Check quotations table
        const { data: quoteData } = await supabase
          .from('quotations')
          .select('id, quotation_number, status, quotation_date, valid_until, total_amount')
          .eq('quotation_number', trimmed)
          .maybeSingle();

        if (quoteData) {
          const isApproved = quoteData.status === 'approved' || quoteData.status === 'converted';
          return {
            referenceNumber: quoteData.quotation_number,
            type: 'quotation',
            status: quoteData.status,
            statusLabel: `Quotation Status: ${quoteData.status.replace(/_/g, ' ').toUpperCase()}`,
            dateCreated: quoteData.quotation_date,
            customerNameMasked: 'Verified Customer',
            summary: `Official X-FORCE quotation valid until ${quoteData.valid_until}.`,
            steps: [
              {
                title: 'Quotation Generated',
                description: 'Official quote pricing verified by sales manager.',
                completed: true,
                current: false,
                date: quoteData.quotation_date,
              },
              {
                title: 'Customer Review',
                description: 'Under consideration by client.',
                completed: isApproved,
                current: !isApproved,
              },
              {
                title: 'Order Conversion',
                description: 'Payment verified and converted to active production order.',
                completed: isApproved,
                current: false,
              },
            ],
          };
        }

        // Check orders table
        const { data: orderData } = await supabase
          .from('orders')
          .select('id, order_number, status, order_date, payment_status, delivery_city')
          .eq('order_number', trimmed)
          .maybeSingle();

        if (orderData) {
          const isDelivered = orderData.status === 'delivered' || orderData.status === 'completed';
          const isDispatched = isDelivered || orderData.status === 'dispatched';
          return {
            referenceNumber: orderData.order_number,
            type: 'order',
            status: orderData.status,
            statusLabel: `Order: ${orderData.status.replace(/_/g, ' ').toUpperCase()}`,
            dateCreated: orderData.order_date,
            customerNameMasked: 'Verified Buyer',
            summary: `Factory order scheduled for delivery to ${orderData.delivery_city || 'client location'}. Payment status: ${orderData.payment_status}.`,
            steps: [
              {
                title: 'Order Confirmed',
                description: 'Factory production queue confirmed.',
                completed: true,
                current: false,
                date: orderData.order_date,
              },
              {
                title: 'Production & Palletizing',
                description: 'Hydraulic curing and yard palletizing.',
                completed: isDispatched,
                current: !isDispatched,
              },
              {
                title: 'Dispatched from Yard',
                description: 'Truck en route to installation or offloading site.',
                completed: isDelivered,
                current: isDispatched && !isDelivered,
              },
              {
                title: 'Delivered & Accepted',
                description: 'Site offloading completed and verified.',
                completed: isDelivered,
                current: false,
              },
            ],
          };
        }
      } catch (err) {
        console.warn('[PublicDataService] Tracking lookup error:', err);
      }
    }

    return null;
  }
}

export const publicDataService = new PublicDataService();
