/**
 * Product & Catalogue Domain Types
 * Module 06 — Product Catalogue & Product Variants
 *
 * XFORCE Construction Ltd / X-FORCE BRICKS
 * Single-Business Generic Building Materials Architecture
 */

import { DbCategory, DbProduct, DbProductVariant } from './database';

export interface ProductAttributeItem {
  key: string;
  label: string;
  value: string;
  unit?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  parentId: string | null;
  parentName?: string | null;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

export const PRODUCT_UNITS = [
  'piece',
  'sqm',
  'trip',
  'ton',
  'bag',
  'bundle',
  'pallet',
  'linear_meter',
  'set',
  'kg',
] as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[number];

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  color: string | null;
  size: string | null;
  finish: string | null;
  description: string | null;
  imageUrl: string | null;
  priceOverride: number | null;
  costPriceOverride?: number | null;
  isActive: boolean;
  sortOrder?: number;
  attributes: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  categoryId: string;
  categoryName?: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  description: string | null;
  unit: string;
  costPrice: number | null;
  sellingPrice: number;
  priceOnRequest: boolean;
  minimumStock: number;
  reorderLevel: number;
  requiresInstallation: boolean;
  isActive: boolean;
  isPublished: boolean;
  isFeatured: boolean;
  images: string[];
  attributes: Record<string, string>;
  sortOrder: number;
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export type ProductStatusFilter = 'all' | 'active' | 'archived';
export type ProductVisibilityFilter = 'all' | 'published' | 'hidden';
export type ProductPricingFilter = 'all' | 'fixed' | 'on_request';
export type ProductSortOption =
  | 'sort_order'
  | 'newest'
  | 'name_asc'
  | 'name_desc'
  | 'price_asc'
  | 'price_desc';

export interface ProductFilterParams {
  searchQuery?: string;
  categoryId?: string;
  status?: ProductStatusFilter;
  visibility?: ProductVisibilityFilter;
  pricingType?: ProductPricingFilter;
  sortBy?: ProductSortOption;
}

export interface ProductFormData {
  name: string;
  sku: string;
  categoryId: string;
  slug: string;
  unit: string;
  sellingPrice: number;
  costPrice: number | null;
  minimumStock: number;
  reorderLevel: number;
  priceOnRequest: boolean;
  requiresInstallation: boolean;
  isPublished: boolean;
  isFeatured: boolean;
  isActive: boolean;
  shortDescription: string;
  description: string;
  images: string[];
  attributes: Record<string, string>;
  sortOrder: number;
}

export interface VariantFormData {
  name: string;
  sku: string;
  color: string;
  size: string;
  finish: string;
  description: string;
  imageUrl: string;
  priceOverride: number | null;
  costPriceOverride?: number | null;
  isActive: boolean;
  sortOrder?: number;
  attributes: Record<string, string>;
}

export interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  parentId: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  publishedProducts: number;
  totalCategories: number;
  totalVariants: number;
}

export interface ProductExportData {
  version: string;
  exportedAt: string;
  businessBrand: string;
  categories: ProductCategory[];
  products: Product[];
}
