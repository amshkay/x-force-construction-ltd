import React, { useState, useEffect } from 'react';
import { PageHeader } from '../ui/PageHeader';
import { SearchInput } from '../ui/SearchInput';
import { ProductCard } from '../cards/ProductCard';
import { ProductDetailModal } from './ProductDetailModal';
import { EmptyState } from '../ui/EmptyState';
import { LoadingState } from '../ui/LoadingState';
import { ErrorState } from '../ui/ErrorState';
import { Button } from '../ui/Button';
import { Package, RefreshCw, MessageSquare, Plus } from 'lucide-react';
import { publicDataService } from '../../services/publicData.service';
import { PublicProduct, PublicCategory } from '../../types/public';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';
import { openWhatsAppChat } from '../../utils/whatsapp';

export interface PublicProductsPageProps {
  onBackHome?: () => void;
  onRequestQuote?: (product?: PublicProduct) => void;
}

export const PublicProductsPage: React.FC<PublicProductsPageProps> = ({
  onBackHome,
  onRequestQuote,
}) => {
  const { publicSettings } = useBusinessSettings();

  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeModalProduct, setActiveModalProduct] = useState<PublicProduct | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedCats, fetchedProds] = await Promise.all([
        publicDataService.getCategories(),
        publicDataService.getProducts(),
      ]);
      setCategories(fetchedCats);
      setProducts(fetchedProds);
    } catch (err: any) {
      console.error('[PublicProductsPage] Load failed:', err);
      setError('Unable to load product catalog. Please verify connectivity.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter products by selected category and search query
  const filteredProducts = products.filter((item) => {
    const matchesCategory =
      selectedCategory === 'all' ||
      item.categoryId === selectedCategory ||
      (item.categoryName && item.categoryName.toLowerCase() === selectedCategory.toLowerCase());

    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      (item.categoryName && item.categoryName.toLowerCase().includes(q));

    return matchesCategory && matchesSearch;
  });

  const handleWhatsAppInquiry = () => {
    const msg = `Hello ${publicSettings.publicBrandName}, I would like to inquire about your current brick and paver stock availability.`;
    openWhatsAppChat(publicSettings.whatsappNumber, msg);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 text-left space-y-6" id="public-products-catalog">
      <PageHeader
        title="Engineered Masonry & Paving Materials"
        description="Explore factory-certified interlocking soil-cement bricks, heavy-duty industrial pavers, and structural masonry elements."
        breadcrumbItems={[
          { label: 'Home', onClick: onBackHome },
          { label: 'Products Catalog', isCurrent: true },
        ]}
        primaryAction={
          <Button
            size="sm"
            variant="outline"
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            onClick={loadData}
          >
            Refresh
          </Button>
        }
      />

      {/* Search & Category Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="w-full md:w-80">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name, SKU or keyword..."
          />
        </div>

        {/* Dynamic Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`rounded-full px-3.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            All Products
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {cat.name}
            </button>
          ))}

          {/* Fallback to supportedMaterialCategories from business settings if database categories not yet populated */}
          {categories.length === 0 &&
            publicSettings.supportedMaterialCategories?.map((catName) => (
              <button
                key={catName}
                type="button"
                onClick={() => setSelectedCategory(catName)}
                className={`rounded-full px-3.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === catName
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {catName}
              </button>
            ))}
        </div>
      </div>

      {/* Catalog Display States */}
      {isLoading ? (
        <LoadingState message="Loading factory materials catalog..." />
      ) : error ? (
        <ErrorState
          title="Catalog Temporarily Unavailable"
          message={error}
          onRetry={loadData}
        />
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900 text-center">
          <EmptyState
            title="No Products Currently Listed"
            description={
              search
                ? `No materials matched "${search}". Try adjusting your search term or view all categories.`
                : 'Our production catalog is currently being updated in the factory database. You can request custom quotes or inquire directly with our sales desk.'
            }
            actionLabel="Request Custom Batch Quotation"
            onAction={() => onRequestQuote && onRequestQuote()}
          />
          <div className="mt-4 flex justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<MessageSquare className="h-4 w-4 text-emerald-600" />}
              onClick={handleWhatsAppInquiry}
            >
              Inquire on WhatsApp
            </Button>
            {search && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('all');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-2">
          {filteredProducts.map((prod) => (
            <ProductCard
              key={prod.id}
              id={prod.id}
              name={prod.name}
              category={prod.categoryName || 'Building Material'}
              variant={prod.variants?.[0]?.name || `SKU: ${prod.sku}`}
              price={prod.sellingPrice}
              priceOnRequest={prod.priceOnRequest}
              unit={prod.unit}
              imageUrl={prod.imageUrl || undefined}
              status="active"
              statusLabel={prod.priceOnRequest ? 'Upon Request' : prod.sellingPrice > 0 ? 'In Stock' : 'Upon Request'}
              onAction={() => setActiveModalProduct(prod)}
              actionLabel="View Details"
            />
          ))}
        </div>
      )}

      {/* Technical Footnote */}
      <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40 text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>
          Wholesale volume pricing discounts and automated contractor purchase orders are activated through our sales desk.
        </p>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onRequestQuote && onRequestQuote()}
          className="text-orange-600 hover:text-orange-700 dark:text-orange-400"
        >
          Submit Bill of Quantities (BOQ) →
        </Button>
      </div>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={activeModalProduct}
        isOpen={Boolean(activeModalProduct)}
        onClose={() => setActiveModalProduct(null)}
        onRequestQuote={(p) => {
          setActiveModalProduct(null);
          onRequestQuote && onRequestQuote(p);
        }}
      />
    </div>
  );
};
