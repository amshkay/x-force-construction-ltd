/**
 * Product Management Panel
 * Module 06 — Product Catalogue & Product Variants
 *
 * XFORCE Construction Ltd / X-FORCE BRICKS
 * Single-Business Generic Building Materials Architecture
 *
 * Provides a comprehensive administrative interface for managing products,
 * variants, dynamic specifications, categories, pricing, and storefront publication.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Layers,
  FolderTree,
  Download,
  Upload,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Copy,
  ExternalLink,
  Globe,
  DollarSign,
  Boxes,
  LayoutGrid,
  List,
  Sparkles,
  Archive,
  RefreshCw,
  AlertCircle,
  Wrench,
} from 'lucide-react';
import {
  Product,
  ProductCategory,
  ProductFilterParams,
  ProductStats,
} from '../../types/product';
import { productService } from '../../services/product.service';
import { useAuth } from '../../hooks/useAuth';
import { PERMISSION_CODES } from '../../types/auth';
import { formatCurrency } from '../../utils/formatters';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Switch } from '../ui/Switch';
import { Badge } from '../ui/Badge';
import { ProductFormModal } from './ProductFormModal';
import { VariantManagerModal } from './VariantManagerModal';
import { CategoryManagerModal } from './CategoryManagerModal';
import { CatalogueExportImportModal } from './CatalogueExportImportModal';
import { ProductDetailDrawer } from './ProductDetailDrawer';

export const ProductManagementPanel: React.FC = () => {
  const { profile, hasPermission } = useAuth();
  const toast = useToast();
  const staffUserId = profile?.id || 'staff_system';

  // Permission checks
  const canCreate = hasPermission(PERMISSION_CODES.PRODUCTS_CREATE);
  const canUpdate = hasPermission(PERMISSION_CODES.PRODUCTS_UPDATE);
  const canDelete = hasPermission(PERMISSION_CODES.PRODUCTS_DELETE);

  // Core Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [stats, setStats] = useState<ProductStats>({
    totalProducts: 0,
    activeProducts: 0,
    publishedProducts: 0,
    totalCategories: 0,
    totalVariants: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedPublished, setSelectedPublished] = useState<'all' | 'published' | 'draft'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Active Modals & Drawer State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [variantTargetProduct, setVariantTargetProduct] = useState<Product | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerProduct, setDrawerProduct] = useState<Product | null>(null);

  // Data Loading
  const loadCatalogueData = async () => {
    try {
      setIsLoading(true);
      const [prods, cats, st] = await Promise.all([
        productService.getProducts(),
        productService.getCategories(),
        productService.getStats(),
      ]);
      setProducts(prods);
      setCategories(cats);
      setStats(st);
    } catch (err) {
      console.error('[ProductManagementPanel] Error loading catalogue:', err);
      toast.error('Failed to load product catalogue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCatalogueData();
  }, []);

  // Filtered Products Memo
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) {
        return false;
      }

      // Status filter
      if (selectedStatus === 'active' && !p.isActive) return false;
      if (selectedStatus === 'inactive' && p.isActive) return false;

      // Publication filter
      if (selectedPublished === 'published' && !p.isPublished) return false;
      if (selectedPublished === 'draft' && p.isPublished) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSku = p.sku.toLowerCase().includes(q);
        const matchesCategory = p.categoryName?.toLowerCase().includes(q);
        const matchesDesc = p.description?.toLowerCase().includes(q) || p.shortDescription?.toLowerCase().includes(q);
        const matchesVariant = p.variants?.some((v) => v.name.toLowerCase().includes(q) || v.sku.toLowerCase().includes(q));

        if (!matchesName && !matchesSku && !matchesCategory && !matchesDesc && !matchesVariant) {
          return false;
        }
      }

      return true;
    });
  }, [products, selectedCategory, selectedStatus, selectedPublished, searchQuery]);

  // Actions
  const handleOpenAddProduct = () => {
    if (!canCreate) {
      toast.error('You do not have permission to create products.');
      return;
    }
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    if (!canUpdate) {
      toast.error('You do not have permission to edit products.');
      return;
    }
    setEditingProduct(prod);
    setIsProductModalOpen(true);
  };

  const handleOpenVariantManager = (prod: Product) => {
    setVariantTargetProduct(prod);
    setIsVariantModalOpen(true);
  };

  const handleOpenDrawer = (prod: Product) => {
    setDrawerProduct(prod);
    setIsDrawerOpen(true);
  };

  const handleTogglePublish = async (prod: Product) => {
    if (!canUpdate) {
      toast.error('Permission denied to alter publication state.');
      return;
    }
    const newPub = !prod.isPublished;
    try {
      await productService.toggleProductPublish(prod.id, newPub, staffUserId);
      setProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, isPublished: newPub } : p))
      );
      if (drawerProduct?.id === prod.id) {
        setDrawerProduct((prev) => (prev ? { ...prev, isPublished: newPub } : null));
      }
      toast.success(
        newPub
          ? `"${prod.name}" published to public storefront.`
          : `"${prod.name}" hidden from public storefront.`
      );
      const st = await productService.getStats();
      setStats(st);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update publication status.');
    }
  };

  const handleToggleActive = async (prod: Product) => {
    if (!canUpdate) {
      toast.error('Permission denied to alter product status.');
      return;
    }
    const newActive = !prod.isActive;
    try {
      await productService.toggleProductStatus(prod.id, newActive, staffUserId);
      setProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, isActive: newActive } : p))
      );
      toast.success(
        newActive ? `"${prod.name}" reactivated.` : `"${prod.name}" archived.`
      );
      const st = await productService.getStats();
      setStats(st);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update active status.');
    }
  };

  const handleDeleteProduct = async (prod: Product) => {
    if (!canDelete) {
      toast.error('You do not have permission to delete products.');
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete "${prod.name}" (${prod.sku})? This cannot be undone.`)) {
      return;
    }
    try {
      await productService.deleteProduct(prod.id, staffUserId);
      setProducts((prev) => prev.filter((p) => p.id !== prod.id));
      toast.success(`Product "${prod.name}" deleted.`);
      const st = await productService.getStats();
      setStats(st);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete product.');
    }
  };

  const copySkuToClipboard = (sku: string) => {
    navigator.clipboard.writeText(sku);
    toast.success(`SKU "${sku}" copied to clipboard.`);
  };

  const categoryNameMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  return (
    <div className="space-y-6 text-left">
      {/* Top Header & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-400 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider">
              Module 06
            </span>
            <span className="text-xs text-slate-400 font-medium">Generic Building Materials</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
            Product Catalogue & Product Variants
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage certified masonry, interlocking bricks, paving blocks, concrete products, and architectural materials.
          </p>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            id="btn-catalogue-import-export"
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsDataModalOpen(true)}
            leftIcon={<Download className="h-3.5 w-3.5 text-slate-500" />}
            className="text-xs"
          >
            Import / Export
          </Button>

          <Button
            id="btn-catalogue-categories"
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCategoryModalOpen(true)}
            leftIcon={<FolderTree className="h-3.5 w-3.5 text-orange-600" />}
            className="text-xs"
          >
            Categories ({categories.length})
          </Button>

          {canCreate && (
            <Button
              id="btn-catalogue-add-product"
              type="button"
              variant="primary"
              size="sm"
              onClick={handleOpenAddProduct}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              className="text-xs"
            >
              Add Product
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Total Products</span>
            <Boxes className="h-4 w-4 text-orange-600" />
          </div>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white">
            {stats.totalProducts}
          </p>
          <span className="text-[10px] text-slate-400">In Master Catalogue</span>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Active Catalogue</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white">
            {stats.activeProducts}
          </p>
          <span className="text-[10px] text-emerald-600 font-medium">
            Available for sales orders
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Published Live</span>
            <Globe className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white">
            {stats.publishedProducts}
          </p>
          <span className="text-[10px] text-blue-600 font-medium">
            Visible on Public Web
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Categories</span>
            <FolderTree className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white">
            {stats.totalCategories}
          </p>
          <span className="text-[10px] text-slate-400">Taxonomy groups</span>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Product Variants</span>
            <Layers className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-xl font-extrabold text-slate-900 dark:text-white">
            {stats.totalVariants}
          </p>
          <span className="text-[10px] text-slate-400">Color & finish options</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="sm:col-span-5 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              id="input-product-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product name, SKU, category, or variant..."
              className="pl-9 text-xs"
            />
          </div>

          {/* Category Filter */}
          <div className="sm:col-span-3">
            <Select
              id="select-filter-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              options={[
                { value: 'all', label: 'All Categories' },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
              className="text-xs"
            />
          </div>

          {/* Publication Filter */}
          <div className="sm:col-span-2">
            <Select
              id="select-filter-published"
              value={selectedPublished}
              onChange={(e) => setSelectedPublished(e.target.value as any)}
              options={[
                { value: 'all', label: 'All Store Visibility' },
                { value: 'published', label: 'Published Online' },
                { value: 'draft', label: 'Draft / Hidden' },
              ]}
              className="text-xs"
            />
          </div>

          {/* View Mode & Reset Controls */}
          <div className="sm:col-span-2 flex items-center justify-end gap-2">
            <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-900 text-orange-600 shadow-sm'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Table View"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-900 text-orange-600 shadow-sm'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Grid Cards"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadCatalogueData}
              title="Refresh catalogue"
              className="p-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Catalogue Presentation */}
      {isLoading ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
          <RefreshCw className="h-8 w-8 text-orange-600 animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">
            Loading products, variants, and engineering specifications...
          </p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
          <Package className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            No products match current filters
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
            {searchQuery || selectedCategory !== 'all' || selectedPublished !== 'all'
              ? 'Try adjusting your search keywords or clearing active filters.'
              : 'Your catalogue is currently empty. Add your first building material item.'}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            {(searchQuery || selectedCategory !== 'all' || selectedPublished !== 'all') && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedPublished('all');
                }}
              >
                Clear Filters
              </Button>
            )}
            {canCreate && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleOpenAddProduct}
                leftIcon={<Plus className="h-3.5 w-3.5" />}
              >
                Add First Product
              </Button>
            )}
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4">Material / SKU</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-right">Selling Price</th>
                  <th className="py-3 px-3 text-center">Variants</th>
                  <th className="py-3 px-3 text-center">Storefront</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-normal">
                {filteredProducts.map((prod) => {
                  const categoryName = categoryNameMap.get(prod.categoryId) || prod.categoryName || 'Material';
                  const primaryImg =
                    (prod.images && prod.images.length > 0 ? prod.images[0] : null) ||
                    prod.variants?.find((v) => v.imageUrl)?.imageUrl ||
                    null;

                  return (
                    <tr
                      key={prod.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                    >
                      {/* Product Name & SKU */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800">
                            {primaryImg ? (
                              <img
                                src={primaryImg}
                                alt={prod.name}
                                className="h-full w-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <Package className="h-5 w-5 text-slate-400" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenDrawer(prod)}
                                className="font-bold text-slate-900 dark:text-white hover:text-orange-600 dark:hover:text-orange-400 transition text-left"
                              >
                                {prod.name}
                              </button>
                              {prod.isFeatured && (
                                <span className="rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 px-1 py-0.2 text-[9px] font-bold">
                                  ★ Featured
                                </span>
                              )}
                              {prod.requiresInstallation && (
                                <span className="text-slate-400" title="Installation service available">
                                  <Wrench className="h-3 w-3 inline text-blue-500" />
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-0.5">
                              <button
                                type="button"
                                onClick={() => copySkuToClipboard(prod.sku)}
                                className="font-mono text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1"
                                title="Click to copy SKU"
                              >
                                <span>{prod.sku}</span>
                                <Copy className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                              <span className="text-slate-300 dark:text-slate-700">•</span>
                              <span className="text-[11px] text-slate-400">
                                per {prod.unit}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                          {categoryName}
                        </span>
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-3 text-right">
                        {prod.priceOnRequest ? (
                          <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                            Upon Request
                          </span>
                        ) : (
                          <div>
                            <span className="font-extrabold text-slate-900 dark:text-white">
                              {formatCurrency(prod.sellingPrice)}
                            </span>
                            {prod.costPrice && prod.costPrice > 0 && (
                              <span className="block text-[10px] text-slate-400">
                                Cost: {formatCurrency(prod.costPrice)}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Variants Count & Shortcut */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenVariantManager(prod)}
                          className="inline-flex items-center gap-1 rounded-full bg-slate-100 hover:bg-orange-50 dark:bg-slate-800 dark:hover:bg-orange-950/40 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 hover:text-orange-600 dark:text-slate-300 dark:hover:text-orange-400 transition border border-transparent hover:border-orange-200"
                          title="Manage variants for this item"
                        >
                          <Layers className="h-3 w-3" />
                          <span>{prod.variants?.length || 0}</span>
                        </button>
                      </td>

                      {/* Public Storefront Publication Toggle */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(prod)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition ${
                            prod.isPublished
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                          title={prod.isPublished ? 'Click to unpublish' : 'Click to publish'}
                        >
                          <Globe className="h-3 w-3" />
                          <span>{prod.isPublished ? 'Live' : 'Hidden'}</span>
                        </button>
                      </td>

                      {/* Operational Status */}
                      <td className="py-3 px-3 text-center">
                        {prod.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                            <Archive className="h-3.5 w-3.5" />
                            <span>Archived</span>
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenDrawer(prod)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition"
                            title="Inspect product detail"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditProduct(prod)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition"
                              title="Edit product"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(prod)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition"
                              title="Delete product"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((prod) => {
            const categoryName = categoryNameMap.get(prod.categoryId) || prod.categoryName || 'Material';
            const primaryImg =
              (prod.images && prod.images.length > 0 ? prod.images[0] : null) ||
              prod.variants?.find((v) => v.imageUrl)?.imageUrl ||
              null;

            return (
              <div
                key={prod.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                <div>
                  {/* Media Header */}
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                    {primaryImg ? (
                      <img
                        src={primaryImg}
                        alt={prod.name}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Package className="h-10 w-10 text-slate-400 stroke-1" />
                    )}
                    <div className="absolute top-2 left-2">
                      <span className="rounded bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white uppercase backdrop-blur">
                        {categoryName}
                      </span>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1">
                      {prod.isPublished && (
                        <span className="rounded bg-emerald-600 text-white px-2 py-0.5 text-[9px] font-bold">
                          Live
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & SKU */}
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                    {prod.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                    <span className="font-mono">{prod.sku}</span>
                    <span>•</span>
                    <span>{prod.unit}</span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-2">
                    {prod.shortDescription || prod.description || 'Certified building material.'}
                  </p>
                </div>

                {/* Footer Commercials & Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    {prod.priceOnRequest ? (
                      <span className="text-xs font-bold text-orange-600">Price on Request</span>
                    ) : (
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {formatCurrency(prod.sellingPrice)}
                        <span className="text-[10px] font-normal text-slate-400"> / {prod.unit}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenVariantManager(prod)}
                      className="rounded bg-slate-100 dark:bg-slate-800 hover:bg-orange-50 px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-orange-600 flex items-center gap-1"
                      title="Manage variants"
                    >
                      <Layers className="h-3 w-3" />
                      <span>{prod.variants?.length || 0}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDrawer(prod)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                      title="View Details"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    {canUpdate && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditProduct(prod)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                        title="Edit Item"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Product Create / Edit */}
      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        product={editingProduct}
        categories={categories}
        onSaved={() => loadCatalogueData()}
        staffUserId={staffUserId}
      />

      {/* Modal 2: Variant Manager */}
      <VariantManagerModal
        isOpen={isVariantModalOpen}
        onClose={() => setIsVariantModalOpen(false)}
        product={variantTargetProduct}
        onUpdated={(updated) => {
          setProducts((prev) =>
            prev.map((p) => (p.id === updated.id ? updated : p))
          );
          if (drawerProduct?.id === updated.id) {
            setDrawerProduct(updated);
          }
        }}
        staffUserId={staffUserId}
      />

      {/* Modal 3: Category Hierarchy */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onCategoriesChanged={() => loadCatalogueData()}
        staffUserId={staffUserId}
      />

      {/* Modal 4: Import / Export Engine */}
      <CatalogueExportImportModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        onDataChanged={() => loadCatalogueData()}
        staffUserId={staffUserId}
      />

      {/* Drawer 5: Product Specification Inspection */}
      <ProductDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        product={drawerProduct}
        categoryName={
          drawerProduct ? categoryNameMap.get(drawerProduct.categoryId) : undefined
        }
        onEdit={(p) => {
          setIsDrawerOpen(false);
          handleOpenEditProduct(p);
        }}
        onManageVariants={(p) => {
          setIsDrawerOpen(false);
          handleOpenVariantManager(p);
        }}
        onTogglePublish={(p) => handleTogglePublish(p)}
      />
    </div>
  );
};
