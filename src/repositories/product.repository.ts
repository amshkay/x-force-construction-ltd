/**
 * Product & Catalogue Repository
 * Module 06 — Product Catalogue & Product Variants
 *
 * XFORCE Construction Ltd / X-FORCE BRICKS
 * Single-Business Generic Building Materials Architecture
 *
 * Implements IBaseRepository with resilient Supabase operations and
 * synchronized local offline caching for progressive web app support.
 */

import { getSupabaseClient } from '../lib/supabase/client';
import { appConfig } from '../config/app.config';
import { localStore } from '../lib/storage/localStorage';
import {
  Product,
  ProductCategory,
  ProductVariant,
  ProductFilterParams,
  ProductFormData,
  VariantFormData,
  CategoryFormData,
} from '../types/product';
import { Result } from '../types/common';

const LOCAL_STORAGE_PRODUCTS_KEY = 'xforce_catalogue_products_v8';
const LOCAL_STORAGE_CATEGORIES_KEY = 'xforce_catalogue_categories_v8';
const LOCAL_STORAGE_VARIANTS_KEY = 'xforce_catalogue_variants_v8';

// Genuine foundational categories for XFORCE Construction Ltd
const INITIAL_FOUNDATIONAL_CATEGORIES: ProductCategory[] = [
  {
    id: 'c1000000-0000-0000-0000-000000000001',
    name: 'Interlocking Bricks & Blocks',
    slug: 'interlocking-bricks',
    description: 'Eco-friendly, precision-engineered soil-cement hydraulic interlocking blocks and hollow blocks.',
    imageUrl: null,
    isActive: true,
    sortOrder: 1,
    parentId: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c1000000-0000-0000-0000-000000000002',
    name: 'Paving Stones & Walkway Pavers',
    slug: 'paving-stones',
    description: 'Heavy-duty industrial and residential concrete pavers, interlocking stones, and kerbs.',
    imageUrl: null,
    isActive: true,
    sortOrder: 2,
    parentId: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c1000000-0000-0000-0000-000000000003',
    name: 'Raw Aggregates & Binders',
    slug: 'aggregates-binders',
    description: 'High-grade Portland cement, sharp sand, granite quarry dust, and natural stone gravel.',
    imageUrl: null,
    isActive: true,
    sortOrder: 3,
    parentId: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c1000000-0000-0000-0000-000000000004',
    name: 'Coping & Structural Concrete',
    slug: 'coping-structural',
    description: 'Wall coping caps, pillar caps, precast lintels, drainage gutters, and fencing balustrades.',
    imageUrl: null,
    isActive: true,
    sortOrder: 4,
    parentId: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c1000000-0000-0000-0000-000000000005',
    name: 'Installation Accessories & Tools',
    slug: 'installation-accessories',
    description: 'Specialist alignment rubbers, bricklaying mallets, jointing sand, and sealer chemicals.',
    imageUrl: null,
    isActive: true,
    sortOrder: 5,
    parentId: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

// Foundational genuine products for XFORCE Construction Ltd
const INITIAL_FOUNDATIONAL_PRODUCTS: Product[] = [
  {
    id: 'b1000000-0000-0000-0000-000000000001',
    categoryId: 'c1000000-0000-0000-0000-000000000002',
    categoryName: 'Paving Stones & Walkway Pavers',
    name: '80mm Heavy-Duty Interlocking Paver (45 MPa)',
    slug: '80mm-heavy-duty-interlocking-paver',
    sku: 'PAV-80-HD-001',
    shortDescription: 'Engineered for ports, container staging yards, truck depots, and commercial arterial driveways.',
    description: 'Solid high-density interlocking concrete paving block manufactured on automated hydraulic vibratory presses with 45 MPa compressive strength rating.',
    unit: 'piece',
    costPrice: 130,
    sellingPrice: 185,
    priceOnRequest: false,
    minimumStock: 5000,
    reorderLevel: 2000,
    requiresInstallation: true,
    isActive: true,
    isPublished: true,
    isFeatured: true,
    images: [
      '/assets/products/paver-80mm-charcoal.jpg',
      '/assets/products/paver-80mm-terracotta.jpg',
      '/assets/products/paver-80mm-granite-grey.jpg',
    ],
    attributes: { 'Compressive Strength': '45 MPa', Thickness: '80mm', 'Coverage Per m²': '40 blocks' },
    sortOrder: 1,
    variants: [
      {
        id: 'ba000000-0000-0000-0000-000000000001',
        productId: 'b1000000-0000-0000-0000-000000000001',
        name: 'Industrial Terracotta Red',
        sku: 'PAV-80-TERRA-01',
        color: 'Terracotta Red',
        size: '80mm Heavy-Duty',
        finish: 'Hydraulic Vibratory Pressed',
        description: 'Vibrant earth-iron oxide pigmented paver for commercial walkways and demarcation.',
        imageUrl: '/assets/products/paver-80mm-terracotta.jpg',
        priceOverride: 185,
        isActive: true,
        sortOrder: 1,
        attributes: { Pigment: 'Iron Oxide Red', CompressiveStrength: '45 MPa' },
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'ba000000-0000-0000-0000-000000000002',
        productId: 'b1000000-0000-0000-0000-000000000001',
        name: 'Charcoal Black High-Torque',
        sku: 'PAV-80-CHAR-02',
        color: 'Charcoal Black',
        size: '80mm Heavy-Duty',
        finish: 'Carbon-Infused Industrial Finish',
        description: 'High-torque heavy container yard and logistics terminal finish.',
        imageUrl: '/assets/products/paver-80mm-charcoal.jpg',
        priceOverride: 195,
        isActive: true,
        sortOrder: 2,
        attributes: { Pigment: 'Carbon Black', CompressiveStrength: '45 MPa' },
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'ba000000-0000-0000-0000-000000000003',
        productId: 'b1000000-0000-0000-0000-000000000001',
        name: 'Natural Granite Grey',
        sku: 'PAV-80-GREY-03',
        color: 'Granite Grey',
        size: '80mm Heavy-Duty',
        finish: 'Unpigmented Pure Granite Aggregate',
        description: 'Heavy architectural traffic road surface with natural stone appearance.',
        imageUrl: '/assets/products/paver-80mm-granite-grey.jpg',
        priceOverride: 185,
        isActive: true,
        sortOrder: 3,
        attributes: { Pigment: 'Natural Concrete', CompressiveStrength: '45 MPa' },
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'b1000000-0000-0000-0000-000000000002',
    categoryId: 'c1000000-0000-0000-0000-000000000002',
    categoryName: 'Paving Stones & Walkway Pavers',
    name: '60mm Standard Interlocking Paver (30 MPa)',
    slug: '60mm-standard-interlocking-paver',
    sku: 'PAV-60-STD-002',
    shortDescription: 'Optimal for residential driveways, commercial parking bays, estate walkways, and garden patios.',
    description: 'Precision-moulded interlocking paver offering exceptional wear resistance, thermal comfort, and rapid installation speed.',
    unit: 'piece',
    costPrice: 100,
    sellingPrice: 145,
    priceOnRequest: false,
    minimumStock: 4000,
    reorderLevel: 1500,
    requiresInstallation: true,
    isActive: true,
    isPublished: true,
    isFeatured: true,
    images: [
      '/assets/products/paver-60mm-1.jpg',
      '/assets/products/paver-60mm-2.jpg',
      '/assets/products/paver-60mm-3.jpg',
      '/assets/products/paver-60mm-4.jpg',
    ],
    attributes: { 'Compressive Strength': '30 MPa', Thickness: '60mm', 'Coverage Per m²': '40 blocks' },
    sortOrder: 2,
    variants: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'b1000000-0000-0000-0000-000000000003',
    categoryId: 'c1000000-0000-0000-0000-000000000001',
    categoryName: 'Interlocking Bricks & Blocks',
    name: '220mm Hydraform Interlocking Earth Block',
    slug: '220mm-hydraform-interlocking-earth-block',
    sku: 'BLK-220-HYD-001',
    shortDescription: 'Precision mortarless dry-stack masonry block delivering 40% faster wall erection velocity.',
    description: 'Eco-engineered hydraulic compressed stabilized soil-cement block with integrated tongue-and-groove profile eliminating mortar beds between courses.',
    unit: 'piece',
    costPrice: 230,
    sellingPrice: 320,
    priceOnRequest: false,
    minimumStock: 3000,
    reorderLevel: 1000,
    requiresInstallation: true,
    isActive: true,
    isPublished: true,
    isFeatured: true,
    images: [
      '/assets/products/hydraform-ochre.jpg',
      '/assets/products/hydraform-terracotta.jpg',
    ],
    attributes: { Dimensions: '220 x 220 x 115mm', 'Thermal Mass': 'High', Joint: 'Mortarless Dry-Stack' },
    sortOrder: 3,
    variants: [
      {
        id: 'ba000000-0000-0000-0000-000000000004',
        productId: 'b1000000-0000-0000-0000-000000000003',
        name: 'Natural Clay Ochre',
        sku: 'BLK-220-OCH-01',
        color: 'Natural Ochre',
        size: '220 x 220 x 115mm',
        finish: 'Smooth Hydraulic Compressed Earth',
        description: 'Stabilized soil-cement block with natural golden warm earth tone.',
        imageUrl: '/assets/products/hydraform-ochre.jpg',
        priceOverride: 320,
        isActive: true,
        sortOrder: 1,
        attributes: { SoilType: 'Laterite Sand', CementRatio: '8%' },
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'ba000000-0000-0000-0000-000000000005',
        productId: 'b1000000-0000-0000-0000-000000000003',
        name: 'Earthy Terracotta Red',
        sku: 'BLK-220-TER-02',
        color: 'Terracotta',
        size: '220 x 220 x 115mm',
        finish: 'Warm Iron-Rich Laterite',
        description: 'Rich red soil compressed block for exterior structural facing walls.',
        imageUrl: '/assets/products/hydraform-terracotta.jpg',
        priceOverride: 335,
        isActive: true,
        sortOrder: 2,
        attributes: { SoilType: 'Red Laterite', CementRatio: '8%' },
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'b1000000-0000-0000-0000-000000000004',
    categoryId: 'c1000000-0000-0000-0000-000000000001',
    categoryName: 'Interlocking Bricks & Blocks',
    name: 'Cored Interlocking Conduit Block (220mm)',
    slug: 'cored-interlocking-conduit-block',
    sku: 'BLK-220-CRD-002',
    shortDescription: 'Twin vertical hollow channels for electrical conduits, plumbing pipes, and vertical steel tie rods.',
    description: 'Specialist interlocking block matching standard hydraform courses with internal hollow cores for reinforced grout columns and concealed utilities.',
    unit: 'piece',
    costPrice: 260,
    sellingPrice: 350,
    priceOnRequest: false,
    minimumStock: 2000,
    reorderLevel: 800,
    requiresInstallation: true,
    isActive: true,
    isPublished: true,
    isFeatured: false,
    images: [
      '/assets/products/conduit-1.jpg',
      '/assets/products/conduit-2.jpg',
      '/assets/products/conduit-3.jpg',
      '/assets/products/conduit-4.jpg',
      '/assets/products/conduit-5.jpg',
      '/assets/products/conduit-6.jpg',
    ],
    attributes: { Core: 'Dual 75mm Diameter', Dimensions: '220 x 220 x 115mm' },
    sortOrder: 4,
    variants: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'b1000000-0000-0000-0000-000000000005',
    categoryId: 'c1000000-0000-0000-0000-000000000004',
    categoryName: 'Coping & Structural Concrete',
    name: 'Cast Concrete Barrier Kerb (125x250x500mm)',
    slug: 'cast-concrete-barrier-kerb',
    sku: 'CPG-KRB-BAR-001',
    shortDescription: 'Solid road boundary and paver containment restraint manufactured with high-strength granite aggregate.',
    description: 'Precast concrete barrier curb with chamfered profile for parking lots, road edging, and containment of paver fields against lateral movement.',
    unit: 'piece',
    costPrice: 1600,
    sellingPrice: 2200,
    priceOnRequest: false,
    minimumStock: 500,
    reorderLevel: 200,
    requiresInstallation: true,
    isActive: true,
    isPublished: true,
    isFeatured: false,
    images: [
      '/assets/products/kerb-1.jpg',
      '/assets/products/kerb-2.jpg',
      '/assets/products/kerb-3.jpg',
      '/assets/products/kerb-4.jpg',
      '/assets/products/kerb-5.jpg',
    ],
    attributes: { Dimensions: '125 x 250 x 500mm', Grade: 'Grade 30 Vibrated' },
    sortOrder: 5,
    variants: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'b1000000-0000-0000-0000-000000000006',
    categoryId: 'c1000000-0000-0000-0000-000000000004',
    categoryName: 'Coping & Structural Concrete',
    name: 'Precast Saddleback Wall Coping (300mm)',
    slug: 'precast-saddleback-wall-coping',
    sku: 'CPG-SDL-300-002',
    shortDescription: 'Dual-sloped architectural coping with integrated continuous drip throats to prevent wall water stains.',
    description: 'Weatherproof precast concrete coping capping for 9-inch walling and hydraform brick fence perimeters.',
    unit: 'piece',
    costPrice: 1300,
    sellingPrice: 1850,
    priceOnRequest: false,
    minimumStock: 400,
    reorderLevel: 150,
    requiresInstallation: true,
    isActive: true,
    isPublished: true,
    isFeatured: false,
    images: [
      '/assets/products/coping-1.jpg',
      '/assets/products/coping-2.jpg',
      '/assets/products/coping-3.jpg',
    ],
    attributes: { Width: '300mm', Profile: 'Saddleback Peak' },
    sortOrder: 6,
    variants: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'b1000000-0000-0000-0000-000000000007',
    categoryId: 'c1000000-0000-0000-0000-000000000003',
    categoryName: 'Raw Aggregates & Binders',
    name: 'Sharp River Sand (20-Tonne Tipper Dump)',
    slug: 'sharp-river-sand-20t-tipper',
    sku: 'AGG-SND-TIP-001',
    shortDescription: 'Washed, graded coarse sharp river sand delivered directly to site via 20-tonne tipper truck.',
    description: 'Silt-free sharp river sand optimal for paver bedding screed layers, interlocking brick mortarless dry-mix, and structural concrete mixing.',
    unit: 'trip',
    costPrice: 110000,
    sellingPrice: 145000,
    priceOnRequest: false,
    minimumStock: 5,
    reorderLevel: 2,
    requiresInstallation: false,
    isActive: true,
    isPublished: true,
    isFeatured: false,
    images: [
      '/assets/services/pavement-laying.jpg',
    ],
    attributes: { Volume: '20 Metric Tonnes', Purity: 'Washed, Low Silt (<3%)' },
    sortOrder: 7,
    variants: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'b1000000-0000-0000-0000-000000000008',
    categoryId: 'c1000000-0000-0000-0000-000000000003',
    categoryName: 'Raw Aggregates & Binders',
    name: 'Dangote 3X Portland Cement 42.5R (50kg Bag)',
    slug: 'dangote-3x-portland-cement-50kg',
    sku: 'AGG-CMT-50KG-002',
    shortDescription: 'Premium Grade 42.5R high-early-strength Portland cement for concrete precasting and block production.',
    description: 'Standard 50kg bag of rapid-hardening Portland limestone cement conforming to NIS 444-1:2014 standards.',
    unit: 'bag',
    costPrice: 9200,
    sellingPrice: 10500,
    priceOnRequest: false,
    minimumStock: 100,
    reorderLevel: 30,
    requiresInstallation: false,
    isActive: true,
    isPublished: true,
    isFeatured: false,
    images: [
      '/assets/services/site-inspection-surveying.jpg',
    ],
    attributes: { Weight: '50kg', Grade: 'CEM II 42.5R' },
    sortOrder: 8,
    variants: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];


export class ProductRepository {
  private productsCache: Product[] = [];
  private categoriesCache: ProductCategory[] = [];

  constructor() {
    this.initLocalStorage();
  }

  private initLocalStorage() {
    const existingCats = localStore.get<ProductCategory[] | null>(LOCAL_STORAGE_CATEGORIES_KEY, null);
    if (!existingCats || existingCats.length === 0) {
      localStore.set(LOCAL_STORAGE_CATEGORIES_KEY, INITIAL_FOUNDATIONAL_CATEGORIES);
      this.categoriesCache = [...INITIAL_FOUNDATIONAL_CATEGORIES];
    } else {
      this.categoriesCache = existingCats;
    }

    const existingProds = localStore.get<Product[] | null>(LOCAL_STORAGE_PRODUCTS_KEY, null);
    if (!existingProds || existingProds.length === 0) {
      localStore.set(LOCAL_STORAGE_PRODUCTS_KEY, INITIAL_FOUNDATIONAL_PRODUCTS);
      this.productsCache = [...INITIAL_FOUNDATIONAL_PRODUCTS];
    } else {
      this.productsCache = existingProds;
    }
  }

  // ==========================================
  // CATEGORIES OPERATIONS
  // ==========================================

  async getAllCategories(): Promise<ProductCategory[]> {
    if (appConfig.supabase.isConfigured) {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('sort_order', { ascending: true });

        if (!error && data && data.length > 0) {
          const categoryMap = new Map<string, string>();
          data.forEach((c) => categoryMap.set(c.id, c.name));

          const formatted: ProductCategory[] = data.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            description: c.description,
            imageUrl: c.image_url,
            isActive: Boolean(c.is_active),
            sortOrder: c.sort_order || 0,
            parentId: c.parent_id,
            parentName: c.parent_id ? categoryMap.get(c.parent_id) || null : null,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
          }));

          this.categoriesCache = formatted;
          localStore.set(LOCAL_STORAGE_CATEGORIES_KEY, formatted);
          return formatted;
        }
      } catch (err) {
        console.warn('[ProductRepository] Supabase categories query failed, falling back to local store:', err);
      }
    }

    const stored = localStore.get<ProductCategory[]>(LOCAL_STORAGE_CATEGORIES_KEY, this.categoriesCache);
    return stored.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async saveCategory(formData: CategoryFormData, categoryId?: string): Promise<ProductCategory> {
    const now = new Date().toISOString();
    const id = categoryId || `cat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newCat: ProductCategory = {
      id,
      name: formData.name.trim(),
      slug: formData.slug.trim(),
      description: formData.description?.trim() || null,
      imageUrl: formData.imageUrl?.trim() || null,
      isActive: formData.isActive,
      sortOrder: Number(formData.sortOrder) || 0,
      parentId: formData.parentId || null,
      createdAt: now,
      updatedAt: now,
    };

    if (appConfig.supabase.isConfigured) {
      try {
        const supabase = getSupabaseClient();
        const dbPayload = {
          id: newCat.id,
          name: newCat.name,
          slug: newCat.slug,
          description: newCat.description,
          image_url: newCat.imageUrl,
          is_active: newCat.isActive,
          sort_order: newCat.sortOrder,
          parent_id: newCat.parentId,
          updated_at: now,
        };

        if (categoryId) {
          const { id: _ignoreId, ...updatePayload } = dbPayload;
          await supabase.from('categories').update(updatePayload as any).eq('id', categoryId);
        } else {
          await supabase.from('categories').insert(dbPayload);
        }
      } catch (err) {
        console.warn('[ProductRepository] Failed to sync category to Supabase:', err);
      }
    }

    // Update local cache
    const current = localStore.get<ProductCategory[]>(LOCAL_STORAGE_CATEGORIES_KEY, this.categoriesCache);
    const index = current.findIndex((c) => c.id === id);
    if (index >= 0) {
      current[index] = { ...current[index], ...newCat, updatedAt: now };
    } else {
      current.push(newCat);
    }
    localStore.set(LOCAL_STORAGE_CATEGORIES_KEY, current);
    this.categoriesCache = current;

    return newCat;
  }

  async deleteCategory(id: string): Promise<boolean> {
    if (appConfig.supabase.isConfigured) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from('categories').delete().eq('id', id);
      } catch (err) {
        console.warn('[ProductRepository] Supabase delete category failed:', err);
      }
    }

    const current = localStore.get<ProductCategory[]>(LOCAL_STORAGE_CATEGORIES_KEY, this.categoriesCache);
    const filtered = current.filter((c) => c.id !== id);
    localStore.set(LOCAL_STORAGE_CATEGORIES_KEY, filtered);
    this.categoriesCache = filtered;
    return true;
  }

  // ==========================================
  // PRODUCTS OPERATIONS
  // ==========================================

  async getAllProducts(filters?: ProductFilterParams): Promise<Product[]> {
    let products: Product[] = [];

    if (appConfig.supabase.isConfigured) {
      try {
        const supabase = getSupabaseClient();
        const { data: prodsData, error: prodsErr } = await supabase
          .from('products')
          .select(`
            *,
            categories:category_id (name)
          `)
          .order('sort_order', { ascending: true });

        if (!prodsErr && prodsData && prodsData.length > 0) {
          const productIds = prodsData.map((p) => p.id);

          const { data: variantsData } = await supabase
            .from('product_variants')
            .select('*')
            .in('product_id', productIds)
            .order('sort_order', { ascending: true });

          const variantsByProdId: Record<string, ProductVariant[]> = {};
          (variantsData || []).forEach((v) => {
            if (!variantsByProdId[v.product_id]) {
              variantsByProdId[v.product_id] = [];
            }
            variantsByProdId[v.product_id].push({
              id: v.id,
              productId: v.product_id,
              name: v.name,
              sku: v.sku,
              color: v.color,
              size: v.size,
              finish: v.finish,
              description: v.description,
              imageUrl: v.image_url,
              priceOverride: v.price_override,
              isActive: Boolean(v.is_active),
              sortOrder: v.sort_order || 0,
              attributes: (v.attributes as Record<string, string>) || {},
              createdAt: v.created_at,
              updatedAt: v.updated_at,
            });
          });

          products = prodsData.map((p) => ({
            id: p.id,
            categoryId: p.category_id,
            categoryName: (p.categories as any)?.name || undefined,
            name: p.name,
            slug: p.slug,
            sku: p.sku,
            shortDescription: p.short_description || null,
            description: p.description || null,
            unit: p.unit || 'piece',
            costPrice: p.cost_price != null ? Number(p.cost_price) : null,
            sellingPrice: Number(p.selling_price) || 0,
            priceOnRequest: Boolean(p.price_on_request),
            minimumStock: Number(p.minimum_stock) || 0,
            reorderLevel: Number(p.reorder_level) || 0,
            requiresInstallation: Boolean(p.requires_installation),
            isActive: Boolean(p.is_active),
            isPublished: Boolean(p.is_published),
            isFeatured: Boolean(p.is_featured),
            images: Array.isArray(p.images)
              ? (p.images as unknown[]).filter((img): img is string => typeof img === 'string')
              : [],
            attributes: (p.attributes as Record<string, string>) || {},
            sortOrder: p.sort_order || 0,
            variants: variantsByProdId[p.id] || [],
            createdAt: p.created_at,
            updatedAt: p.updated_at,
          }));

          this.productsCache = products;
          localStore.set(LOCAL_STORAGE_PRODUCTS_KEY, products);
        }
      } catch (err) {
        console.warn('[ProductRepository] Supabase products query failed, using local store:', err);
      }
    }

    if (products.length === 0) {
      products = localStore.get<Product[]>(LOCAL_STORAGE_PRODUCTS_KEY, this.productsCache);
    }

    // Auto-upgrade legacy mock images (Unsplash or service photos) in products and variants to authentic assets
    let prodsChanged = false;
    products = products.map((p) => {
      let images = Array.isArray(p.images)
        ? p.images.filter(
            (img): img is string =>
              typeof img === 'string' &&
              img.trim() !== '' &&
              !img.includes('unsplash.com') &&
              !img.includes('/assets/services/') &&
              !img.includes('1590381105924')
          )
        : [];

      if (images.length === 0) {
        prodsChanged = true;
        const nameLower = p.name.toLowerCase();
        if (p.id === 'b1000000-0000-0000-0000-000000000001' || nameLower.includes('80mm')) {
          images = [
            '/assets/products/paver-80mm-charcoal.jpg',
            '/assets/products/paver-80mm-terracotta.jpg',
            '/assets/products/paver-80mm-granite-grey.jpg',
            '/assets/products/paver-80mm-0.jpg',
            '/assets/products/paver-80mm-1.jpg',
            '/assets/products/paver-80mm-2.jpg',
            '/assets/products/paver-80mm-3.jpg',
            '/assets/products/paver-80mm-4.jpg',
          ];
        } else if (nameLower.includes('hydraform') || nameLower.includes('earth block')) {
          images = [
            '/assets/products/hydraform-ochre.jpg',
            '/assets/products/hydraform-terracotta.jpg',
          ];
        } else if (nameLower.includes('kerb') || nameLower.includes('barrier')) {
          images = [
            '/assets/products/kerb-1.jpg',
            '/assets/products/kerb-2.jpg',
            '/assets/products/kerb-3.jpg',
            '/assets/products/kerb-4.jpg',
            '/assets/products/kerb-5.jpg',
          ];
        } else if (nameLower.includes('coping') || nameLower.includes('saddleback')) {
          images = [
            '/assets/products/coping-1.jpg',
            '/assets/products/coping-2.jpg',
            '/assets/products/coping-3.jpg',
          ];
        } else if (nameLower.includes('conduit') || nameLower.includes('cored')) {
          images = [
            '/assets/products/conduit-1.jpg',
            '/assets/products/conduit-2.jpg',
            '/assets/products/conduit-3.jpg',
            '/assets/products/conduit-4.jpg',
            '/assets/products/conduit-5.jpg',
            '/assets/products/conduit-6.jpg',
          ];
        } else if (nameLower.includes('60mm') || nameLower.includes('standard')) {
          images = [
            '/assets/products/paver-60mm-1.jpg',
            '/assets/products/paver-60mm-2.jpg',
            '/assets/products/paver-60mm-3.jpg',
            '/assets/products/paver-60mm-4.jpg',
          ];
        } else if (nameLower.includes('paver') || nameLower.includes('paving')) {
          images = [
            '/assets/products/paver-80mm-granite-grey.jpg',
            '/assets/products/paver-80mm-charcoal.jpg',
          ];
        } else {
          images = ['/assets/products/paver-80mm-charcoal.jpg'];
        }
      }

      // If product has no variants loaded, check if foundational variants exist
      let variants = Array.isArray(p.variants) && p.variants.length > 0 ? [...p.variants] : [];
      if (variants.length === 0) {
        const found = INITIAL_FOUNDATIONAL_PRODUCTS.find((fp) => fp.id === p.id);
        if (found && found.variants && found.variants.length > 0) {
          variants = [...found.variants];
          prodsChanged = true;
        }
      }

      // Sanitize variant images
      variants = variants.map((v) => {
        const vUrl = v.imageUrl || '';
        const isMockVariant =
          !vUrl ||
          vUrl.includes('unsplash.com') ||
          vUrl.includes('/assets/services/') ||
          vUrl.includes('1590381105924');

        if (isMockVariant) {
          prodsChanged = true;
          const col = `${v.name} ${v.color || ''}`.toLowerCase();
          let cleanUrl = images[0] || '/assets/products/paver-80mm-charcoal.jpg';
          if (col.includes('terracotta') || col.includes('red')) {
            cleanUrl = p.name.toLowerCase().includes('hydraform')
              ? '/assets/products/hydraform-terracotta.jpg'
              : '/assets/products/paver-80mm-terracotta.jpg';
          } else if (col.includes('charcoal') || col.includes('black')) {
            cleanUrl = '/assets/products/paver-80mm-charcoal.jpg';
          } else if (col.includes('granite') || col.includes('grey') || col.includes('gray')) {
            cleanUrl = '/assets/products/paver-80mm-granite-grey.jpg';
          } else if (col.includes('ochre') || col.includes('clay')) {
            cleanUrl = '/assets/products/hydraform-ochre.jpg';
          }
          return { ...v, imageUrl: cleanUrl };
        }
        return v;
      });

      return {
        ...p,
        images,
        variants,
      };
    });

    if (prodsChanged) {
      localStore.set(LOCAL_STORAGE_PRODUCTS_KEY, products);
    }

    // Attach category names from categoriesCache if missing
    const catMap = new Map<string, string>();
    this.categoriesCache.forEach((c) => catMap.set(c.id, c.name));
    products.forEach((p) => {
      if (!p.categoryName && catMap.has(p.categoryId)) {
        p.categoryName = catMap.get(p.categoryId);
      }
    });

    // Apply filters
    if (filters) {
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase().trim();
        products = products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            (p.categoryName && p.categoryName.toLowerCase().includes(q)) ||
            (p.shortDescription && p.shortDescription.toLowerCase().includes(q)) ||
            (p.description && p.description.toLowerCase().includes(q)) ||
            p.variants.some(
              (v) =>
                v.name.toLowerCase().includes(q) ||
                v.sku.toLowerCase().includes(q) ||
                (v.color && v.color.toLowerCase().includes(q))
            )
        );
      }

      if (filters.categoryId && filters.categoryId !== 'all') {
        products = products.filter((p) => p.categoryId === filters.categoryId);
      }

      if (filters.status && filters.status !== 'all') {
        products = products.filter((p) =>
          filters.status === 'active' ? p.isActive : !p.isActive
        );
      }

      if (filters.visibility && filters.visibility !== 'all') {
        products = products.filter((p) =>
          filters.visibility === 'published' ? p.isPublished : !p.isPublished
        );
      }

      if (filters.pricingType && filters.pricingType !== 'all') {
        products = products.filter((p) =>
          filters.pricingType === 'on_request' ? p.priceOnRequest : !p.priceOnRequest
        );
      }

      if (filters.sortBy) {
        switch (filters.sortBy) {
          case 'name_asc':
            products.sort((a, b) => a.name.localeCompare(b.name));
            break;
          case 'name_desc':
            products.sort((a, b) => b.name.localeCompare(a.name));
            break;
          case 'price_asc':
            products.sort((a, b) => a.sellingPrice - b.sellingPrice);
            break;
          case 'price_desc':
            products.sort((a, b) => b.sellingPrice - a.sellingPrice);
            break;
          case 'newest':
            products.sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            break;
          case 'sort_order':
          default:
            products.sort((a, b) => a.sortOrder - b.sortOrder);
            break;
        }
      }
    }

    return products;
  }

  async getProductById(id: string): Promise<Product | null> {
    const products = await this.getAllProducts();
    return products.find((p) => p.id === id) || null;
  }

  async saveProduct(formData: ProductFormData, productId?: string): Promise<Product> {
    const now = new Date().toISOString();
    const id = productId || `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Look up existing variants if updating
    let existingVariants: ProductVariant[] = [];
    if (productId) {
      const existing = await this.getProductById(productId);
      if (existing) {
        existingVariants = existing.variants || [];
      }
    }

    const newProduct: Product = {
      id,
      categoryId: formData.categoryId,
      name: formData.name.trim(),
      slug: formData.slug.trim(),
      sku: formData.sku.trim().toUpperCase(),
      shortDescription: formData.shortDescription?.trim() || null,
      description: formData.description?.trim() || null,
      unit: formData.unit,
      costPrice: formData.costPrice != null ? Number(formData.costPrice) : null,
      sellingPrice: Number(formData.sellingPrice) || 0,
      priceOnRequest: formData.priceOnRequest,
      minimumStock: 0,
      reorderLevel: 0,
      requiresInstallation: formData.requiresInstallation,
      isActive: formData.isActive,
      isPublished: formData.isPublished,
      isFeatured: formData.isFeatured,
      images: formData.images || [],
      attributes: formData.attributes || {},
      sortOrder: Number(formData.sortOrder) || 0,
      variants: existingVariants,
      createdAt: now,
      updatedAt: now,
    };

    if (appConfig.supabase.isConfigured) {
      try {
        const supabase = getSupabaseClient();
        const dbPayload = {
          id: newProduct.id,
          category_id: newProduct.categoryId,
          name: newProduct.name,
          slug: newProduct.slug,
          sku: newProduct.sku,
          short_description: newProduct.shortDescription,
          description: newProduct.description,
          unit: newProduct.unit,
          cost_price: newProduct.costPrice,
          selling_price: newProduct.sellingPrice,
          price_on_request: newProduct.priceOnRequest,
          requires_installation: newProduct.requiresInstallation,
          is_active: newProduct.isActive,
          is_published: newProduct.isPublished,
          is_featured: newProduct.isFeatured,
          images: newProduct.images,
          attributes: newProduct.attributes,
          sort_order: newProduct.sortOrder,
          updated_at: now,
        };

        if (productId) {
          await (supabase.from('products') as any).update(dbPayload).eq('id', productId);
        } else {
          await (supabase.from('products') as any).insert(dbPayload);
        }
      } catch (err) {
        console.warn('[ProductRepository] Supabase product write error, fallback to local store:', err);
      }
    }

    // Local Storage sync
    const current = localStore.get<Product[]>(LOCAL_STORAGE_PRODUCTS_KEY, this.productsCache);
    const index = current.findIndex((p) => p.id === id);
    if (index >= 0) {
      current[index] = { ...current[index], ...newProduct, variants: existingVariants, updatedAt: now };
    } else {
      current.push(newProduct);
    }
    localStore.set(LOCAL_STORAGE_PRODUCTS_KEY, current);
    this.productsCache = current;

    return newProduct;
  }

  async deleteProduct(id: string): Promise<boolean> {
    if (appConfig.supabase.isConfigured) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from('products').delete().eq('id', id);
      } catch (err) {
        console.warn('[ProductRepository] Supabase delete product error:', err);
      }
    }

    const current = localStore.get<Product[]>(LOCAL_STORAGE_PRODUCTS_KEY, this.productsCache);
    const filtered = current.filter((p) => p.id !== id);
    localStore.set(LOCAL_STORAGE_PRODUCTS_KEY, filtered);
    this.productsCache = filtered;
    return true;
  }

  async toggleProductStatus(id: string, isActive: boolean): Promise<void> {
    if (appConfig.supabase.isConfigured) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from('products').update({ is_active: isActive }).eq('id', id);
      } catch (err) {
        console.warn('[ProductRepository] Supabase toggle status error:', err);
      }
    }

    const current = localStore.get<Product[]>(LOCAL_STORAGE_PRODUCTS_KEY, this.productsCache);
    const item = current.find((p) => p.id === id);
    if (item) {
      item.isActive = isActive;
      item.updatedAt = new Date().toISOString();
      localStore.set(LOCAL_STORAGE_PRODUCTS_KEY, current);
      this.productsCache = current;
    }
  }

  async updateProductThresholds(
    id: string,
    thresholds: { minimumStock: number; reorderLevel: number }
  ): Promise<Product> {
    const current = localStore.get<Product[]>(LOCAL_STORAGE_PRODUCTS_KEY, this.productsCache);
    const index = current.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error(`Product with ID '${id}' not found.`);
    }

    const updated: Product = {
      ...current[index],
      minimumStock: thresholds.minimumStock,
      reorderLevel: thresholds.reorderLevel,
      updatedAt: new Date().toISOString(),
    };

    current[index] = updated;
    localStore.set(LOCAL_STORAGE_PRODUCTS_KEY, current);
    this.productsCache = current;

    return updated;
  }

  async toggleProductPublish(id: string, isPublished: boolean): Promise<void> {
    if (appConfig.supabase.isConfigured) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from('products').update({ is_published: isPublished }).eq('id', id);
      } catch (err) {
        console.warn('[ProductRepository] Supabase toggle publish error:', err);
      }
    }

    const current = localStore.get<Product[]>(LOCAL_STORAGE_PRODUCTS_KEY, this.productsCache);
    const item = current.find((p) => p.id === id);
    if (item) {
      item.isPublished = isPublished;
      item.updatedAt = new Date().toISOString();
      localStore.set(LOCAL_STORAGE_PRODUCTS_KEY, current);
      this.productsCache = current;
    }
  }

  // ==========================================
  // VARIANTS OPERATIONS
  // ==========================================

  async saveVariant(
    productId: string,
    formData: VariantFormData,
    variantId?: string
  ): Promise<ProductVariant> {
    const now = new Date().toISOString();
    const id = variantId || `var-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newVariant: ProductVariant = {
      id,
      productId,
      name: formData.name.trim(),
      sku: formData.sku.trim().toUpperCase(),
      color: formData.color?.trim() || null,
      size: formData.size?.trim() || null,
      finish: formData.finish?.trim() || null,
      description: formData.description?.trim() || null,
      imageUrl: formData.imageUrl?.trim() || null,
      priceOverride: formData.priceOverride != null ? Number(formData.priceOverride) : null,
      isActive: formData.isActive,
      sortOrder: Number(formData.sortOrder) || 0,
      attributes: formData.attributes || {},
      createdAt: now,
      updatedAt: now,
    };

    if (appConfig.supabase.isConfigured) {
      try {
        const supabase = getSupabaseClient();
        const dbPayload = {
          id: newVariant.id,
          product_id: newVariant.productId,
          name: newVariant.name,
          sku: newVariant.sku,
          color: newVariant.color,
          size: newVariant.size,
          finish: newVariant.finish,
          description: newVariant.description,
          image_url: newVariant.imageUrl,
          price_override: newVariant.priceOverride,
          is_active: newVariant.isActive,
          sort_order: newVariant.sortOrder,
          attributes: newVariant.attributes,
          updated_at: now,
        };

        if (variantId) {
          await (supabase.from('product_variants') as any).update(dbPayload).eq('id', variantId);
        } else {
          await (supabase.from('product_variants') as any).insert(dbPayload);
        }
      } catch (err) {
        console.warn('[ProductRepository] Supabase variant save error:', err);
      }
    }

    // Local storage sync
    const current = localStore.get<Product[]>(LOCAL_STORAGE_PRODUCTS_KEY, this.productsCache);
    const prod = current.find((p) => p.id === productId);
    if (prod) {
      if (!prod.variants) prod.variants = [];
      const varIndex = prod.variants.findIndex((v) => v.id === id);
      if (varIndex >= 0) {
        prod.variants[varIndex] = newVariant;
      } else {
        prod.variants.push(newVariant);
      }
      prod.variants.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      localStore.set(LOCAL_STORAGE_PRODUCTS_KEY, current);
      this.productsCache = current;
    }

    return newVariant;
  }

  async deleteVariant(productId: string, variantId: string): Promise<boolean> {
    if (appConfig.supabase.isConfigured) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from('product_variants').delete().eq('id', variantId);
      } catch (err) {
        console.warn('[ProductRepository] Supabase delete variant error:', err);
      }
    }

    const current = localStore.get<Product[]>(LOCAL_STORAGE_PRODUCTS_KEY, this.productsCache);
    const prod = current.find((p) => p.id === productId);
    if (prod && prod.variants) {
      prod.variants = prod.variants.filter((v) => v.id !== variantId);
      localStore.set(LOCAL_STORAGE_PRODUCTS_KEY, current);
      this.productsCache = current;
    }
    return true;
  }

  async toggleVariantStatus(productId: string, variantId: string, isActive: boolean): Promise<void> {
    if (appConfig.supabase.isConfigured) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from('product_variants').update({ is_active: isActive }).eq('id', variantId);
      } catch (err) {
        console.warn('[ProductRepository] Supabase toggle variant status error:', err);
      }
    }

    const current = localStore.get<Product[]>(LOCAL_STORAGE_PRODUCTS_KEY, this.productsCache);
    const prod = current.find((p) => p.id === productId);
    if (prod && prod.variants) {
      const v = prod.variants.find((item) => item.id === variantId);
      if (v) {
        v.isActive = isActive;
        v.updatedAt = new Date().toISOString();
        localStore.set(LOCAL_STORAGE_PRODUCTS_KEY, current);
        this.productsCache = current;
      }
    }
  }

  // ==========================================
  // BULK IMPORT & RESET
  // ==========================================

  async bulkImport(products: Product[], categories?: ProductCategory[]): Promise<{ importedProducts: number; importedCategories: number }> {
    if (categories && categories.length > 0) {
      const currentCats = localStore.get<ProductCategory[]>(LOCAL_STORAGE_CATEGORIES_KEY, this.categoriesCache);
      const catMap = new Map<string, ProductCategory>();
      currentCats.forEach((c) => catMap.set(c.id, c));
      categories.forEach((c) => catMap.set(c.id, c));
      const mergedCats = Array.from(catMap.values());
      localStore.set(LOCAL_STORAGE_CATEGORIES_KEY, mergedCats);
      this.categoriesCache = mergedCats;
    }

    const currentProds = localStore.get<Product[]>(LOCAL_STORAGE_PRODUCTS_KEY, this.productsCache);
    const prodMap = new Map<string, Product>();
    currentProds.forEach((p) => prodMap.set(p.id, p));
    products.forEach((p) => prodMap.set(p.id, p));
    const mergedProds = Array.from(prodMap.values());
    localStore.set(LOCAL_STORAGE_PRODUCTS_KEY, mergedProds);
    this.productsCache = mergedProds;

    return {
      importedProducts: products.length,
      importedCategories: categories ? categories.length : 0,
    };
  }
}

export const productRepository = new ProductRepository();
