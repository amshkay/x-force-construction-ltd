import React from 'react';
import { Package, ArrowRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatCurrency } from '../../utils/formatters';
import { StatusBadge } from '../ui/StatusBadge';
import { Button } from '../ui/Button';
import { SystemStatus } from '../../config/theme.tokens';

export interface ProductCardProps {
  id: string;
  name: string;
  category: string;
  variant?: string;
  price: number;
  priceOnRequest?: boolean;
  unit?: string;
  status?: SystemStatus;
  statusLabel?: string;
  imageUrl?: string;
  onAction?: (id: string) => void;
  actionLabel?: string;
  className?: string;
}

const getCategoryFallbackImage = (cat: string, prodName: string): string => {
  const text = `${cat} ${prodName}`.toLowerCase();
  if (text.includes('paver') || text.includes('paving') || text.includes('stone')) {
    return 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=800&q=80';
  }
  if (text.includes('brick') || text.includes('hydraform') || text.includes('wall') || text.includes('earth') || text.includes('block')) {
    return 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80';
  }
  if (text.includes('coping') || text.includes('kerb') || text.includes('concrete') || text.includes('cap') || text.includes('tile')) {
    return 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80';
  }
  return 'https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?auto=format&fit=crop&w=800&q=80';
};

export const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  category,
  variant,
  price,
  priceOnRequest,
  unit = 'unit',
  status = 'active',
  statusLabel,
  imageUrl,
  onAction,
  actionLabel = 'View Details',
  className,
}) => {
  const [imageError, setImageError] = React.useState(false);
  const activeImage = !imageError && imageUrl ? imageUrl : getCategoryFallbackImage(category, name);

  return (
    <div
      id={`product-card-${id}`}
      className={cn(
        'group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 text-left',
        className
      )}
    >
      <div>
        {/* Card Header Media */}
        <div className="relative mb-3 flex h-44 w-full items-center justify-center overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800/80">
          {activeImage ? (
            <img
              src={activeImage}
              alt={name}
              onError={() => setImageError(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
              <Package className="h-10 w-10 stroke-1" />
              <span className="mt-1 text-[11px] font-medium">Catalog Material</span>
            </div>
          )}
          <div className="absolute top-2 right-2">
            <StatusBadge status={status} label={statusLabel} size="sm" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
            {category}
          </p>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
            {name}
          </h4>
          {variant && (
            <p className="text-xs text-slate-500 dark:text-slate-400">{variant}</p>
          )}
        </div>
      </div>

      {/* Footer Details & Action */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <div>
          {priceOnRequest || price <= 0 ? (
            <p className="text-xs font-bold text-orange-600 dark:text-orange-400">
              Price on Request
            </p>
          ) : (
            <>
              <span className="text-xs text-slate-400">From</span>
              <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                {formatCurrency(price)}{' '}
                <span className="text-[10px] font-normal text-slate-400">/ {unit}</span>
              </p>
            </>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          rightIcon={<ArrowRight className="h-3 w-3" />}
          onClick={() => onAction && onAction(id)}
        >
          {actionLabel}
        </Button>
      </div>
    </div>
  );
};
