/**
 * Product & Catalogue Service
 * Module 06 — Product Catalogue & Product Variants
 *
 * XFORCE Construction Ltd / X-FORCE BRICKS
 * Single-Business Generic Building Materials Architecture
 *
 * Provides business logic, validation, audit trail generation,
 * and statistical aggregations for product catalogue operations.
 */

import { productRepository, ProductRepository } from '../repositories/product.repository';
import { auditService } from './audit.service';
import {
  Product,
  ProductCategory,
  ProductVariant,
  ProductFilterParams,
  ProductFormData,
  VariantFormData,
  CategoryFormData,
  ProductStats,
  ProductExportData,
} from '../types/product';

export class ProductService {
  private repo: ProductRepository;

  constructor(repo = productRepository) {
    this.repo = repo;
  }

  // ==========================================
  // QUERY METHODS
  // ==========================================

  async getProducts(filters?: ProductFilterParams): Promise<Product[]> {
    return this.repo.getAllProducts(filters);
  }

  async getProductById(id: string): Promise<Product | null> {
    return this.repo.getProductById(id);
  }

  async getCategories(): Promise<ProductCategory[]> {
    const categories = await this.repo.getAllCategories();
    const products = await this.repo.getAllProducts();

    // Compute live product counts per category
    const countMap = new Map<string, number>();
    products.forEach((p) => {
      countMap.set(p.categoryId, (countMap.get(p.categoryId) || 0) + 1);
    });

    return categories.map((cat) => ({
      ...cat,
      productCount: countMap.get(cat.id) || 0,
    }));
  }

  async getStats(): Promise<ProductStats> {
    const products = await this.repo.getAllProducts();
    const categories = await this.repo.getAllCategories();

    let totalVariants = 0;
    let activeProducts = 0;
    let publishedProducts = 0;

    products.forEach((p) => {
      if (p.isActive) activeProducts++;
      if (p.isPublished) publishedProducts++;
      if (p.variants) totalVariants += p.variants.length;
    });

    return {
      totalProducts: products.length,
      activeProducts,
      publishedProducts,
      totalCategories: categories.length,
      totalVariants,
    };
  }

  // ==========================================
  // PRODUCT MUTATION METHODS
  // ==========================================

  async createProduct(formData: ProductFormData, staffUserId: string): Promise<Product> {
    this.validateProductForm(formData);

    const product = await this.repo.saveProduct(formData);

    await auditService.logAction(
      staffUserId,
      'create',
      'products',
      product.id,
      {
        name: product.name,
        sku: product.sku,
        categoryId: product.categoryId,
        sellingPrice: product.sellingPrice,
        priceOnRequest: product.priceOnRequest,
        unit: product.unit,
      }
    );

    return product;
  }

  async updateProduct(
    id: string,
    formData: ProductFormData,
    staffUserId: string
  ): Promise<Product> {
    this.validateProductForm(formData);

    const existing = await this.repo.getProductById(id);
    if (!existing) {
      throw new Error(`Product with ID "${id}" was not found.`);
    }

    const updated = await this.repo.saveProduct(formData, id);

    await auditService.logAction(
      staffUserId,
      'update',
      'products',
      updated.id,
      {
        name: updated.name,
        sku: updated.sku,
        sellingPrice: updated.sellingPrice,
        priceOnRequest: updated.priceOnRequest,
        isPublished: updated.isPublished,
        isActive: updated.isActive,
      }
    );

    return updated;
  }

  async toggleProductStatus(
    id: string,
    isActive: boolean,
    staffUserId: string
  ): Promise<void> {
    await this.repo.toggleProductStatus(id, isActive);
    await auditService.logAction(
      staffUserId,
      isActive ? 'update' : 'delete',
      'products',
      id,
      { action: isActive ? 'activated_product' : 'archived_product' }
    );
  }

  async toggleProductPublish(
    id: string,
    isPublished: boolean,
    staffUserId: string
  ): Promise<void> {
    await this.repo.toggleProductPublish(id, isPublished);
    await auditService.logAction(
      staffUserId,
      'update',
      'products',
      id,
      { action: isPublished ? 'published_to_storefront' : 'hidden_from_storefront' }
    );
  }

  async deleteProduct(id: string, staffUserId: string): Promise<boolean> {
    const existing = await this.repo.getProductById(id);
    const success = await this.repo.deleteProduct(id);
    if (success && existing) {
      await auditService.logAction(
        staffUserId,
        'delete',
        'products',
        id,
        { name: existing.name, sku: existing.sku }
      );
    }
    return success;
  }

  // ==========================================
  // VARIANT MUTATION METHODS
  // ==========================================

  async saveVariant(
    productId: string,
    formData: VariantFormData,
    variantId?: string,
    staffUserId: string = 'system'
  ): Promise<ProductVariant> {
    if (!formData.name.trim()) {
      throw new Error('Variant name is required.');
    }
    if (!formData.sku.trim()) {
      throw new Error('Variant SKU is required.');
    }

    const variant = await this.repo.saveVariant(productId, formData, variantId);

    await auditService.logAction(
      staffUserId,
      variantId ? 'update' : 'create',
      'products',
      productId,
      {
        variantId: variant.id,
        variantName: variant.name,
        sku: variant.sku,
        priceOverride: variant.priceOverride,
      }
    );

    return variant;
  }

  async deleteVariant(
    productId: string,
    variantId: string,
    staffUserId: string = 'system'
  ): Promise<boolean> {
    const success = await this.repo.deleteVariant(productId, variantId);
    if (success) {
      await auditService.logAction(
        staffUserId,
        'delete',
        'products',
        productId,
        { variantId, action: 'deleted_variant' }
      );
    }
    return success;
  }

  async toggleVariantStatus(
    productId: string,
    variantId: string,
    isActive: boolean,
    staffUserId: string = 'system'
  ): Promise<void> {
    await this.repo.toggleVariantStatus(productId, variantId, isActive);
    await auditService.logAction(
      staffUserId,
      'update',
      'products',
      productId,
      { variantId, isActive, action: 'toggled_variant_status' }
    );
  }

  // ==========================================
  // CATEGORY MUTATION METHODS
  // ==========================================

  async saveCategory(
    formData: CategoryFormData,
    categoryId?: string,
    staffUserId: string = 'system'
  ): Promise<ProductCategory> {
    if (!formData.name.trim()) {
      throw new Error('Category name is required.');
    }
    if (!formData.slug.trim()) {
      formData.slug = this.generateSlug(formData.name);
    }

    const category = await this.repo.saveCategory(formData, categoryId);

    await auditService.logAction(
      staffUserId,
      categoryId ? 'update' : 'create',
      'settings',
      category.id,
      {
        categoryName: category.name,
        slug: category.slug,
        parentId: category.parentId,
      }
    );

    return category;
  }

  async deleteCategory(
    categoryId: string,
    staffUserId: string = 'system'
  ): Promise<boolean> {
    const products = await this.repo.getAllProducts();
    const hasProducts = products.some((p) => p.categoryId === categoryId);
    if (hasProducts) {
      throw new Error(
        'Cannot delete category with associated products. Reassign or delete those products first.'
      );
    }

    const success = await this.repo.deleteCategory(categoryId);
    if (success) {
      await auditService.logAction(
        staffUserId,
        'delete',
        'settings',
        categoryId,
        { action: 'deleted_category' }
      );
    }
    return success;
  }

  // ==========================================
  // UTILITIES & BULK OPERATIONS
  // ==========================================

  generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  generateSku(categoryPrefix: string, productName: string, variantSuffix?: string): string {
    const p1 = (categoryPrefix || 'XF')
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 3)
      .toUpperCase();

    const words = productName.trim().split(/\s+/);
    let p2 = '';
    if (words.length === 1) {
      p2 = words[0].substring(0, 4).toUpperCase();
    } else {
      p2 = words
        .slice(0, 3)
        .map((w) => w[0])
        .join('')
        .toUpperCase();
    }

    const randomDigits = Math.floor(100 + Math.random() * 900);
    let sku = `XF-${p1}-${p2}-${randomDigits}`;
    if (variantSuffix) {
      const v = variantSuffix
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, 3)
        .toUpperCase();
      sku += `-${v}`;
    }
    return sku;
  }

  async exportCatalogue(): Promise<ProductExportData> {
    const products = await this.repo.getAllProducts();
    const categories = await this.repo.getAllCategories();

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      businessBrand: 'XFORCE Construction Ltd / X-FORCE BRICKS',
      categories,
      products,
    };
  }

  async importCatalogue(
    data: ProductExportData,
    staffUserId: string
  ): Promise<{ importedProducts: number; importedCategories: number }> {
    if (!data || !Array.isArray(data.products)) {
      throw new Error('Invalid catalogue format. JSON must contain a "products" array.');
    }

    const res = await this.repo.bulkImport(data.products, data.categories || []);

    await auditService.logAction(
      staffUserId,
      'create',
      'products',
      'bulk_import',
      {
        importedProductsCount: res.importedProducts,
        importedCategoriesCount: res.importedCategories,
      }
    );

    return res;
  }

  private validateProductForm(data: ProductFormData) {
    if (!data.name?.trim()) {
      throw new Error('Product name is required.');
    }
    if (!data.sku?.trim()) {
      throw new Error('Product SKU is required.');
    }
    if (!data.categoryId?.trim()) {
      throw new Error('Product category selection is required.');
    }
    if (!data.unit?.trim()) {
      throw new Error('Unit of measurement is required.');
    }
    if (!data.priceOnRequest && (data.sellingPrice == null || data.sellingPrice < 0)) {
      throw new Error('Selling price must be greater than or equal to 0.');
    }
  }
}

export const productService = new ProductService();
