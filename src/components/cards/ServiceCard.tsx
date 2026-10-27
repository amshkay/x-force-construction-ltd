import React from 'react';
import { ArrowRight, Wrench } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';

export interface ServiceCardProps {
  id: string;
  name: string;
  description: string;
  icon?: React.ReactNode;
  imageUrl?: string;
  actionLabel?: string;
  onAction?: (id: string) => void;
  className?: string;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  id,
  name,
  description,
  icon,
  imageUrl,
  actionLabel = 'Learn More',
  onAction,
  className,
}) => {
  const [imageError, setImageError] = React.useState(false);
  const showImage = Boolean(imageUrl && !imageError);

  return (
    <div
      id={`service-card-${id}`}
      className={cn(
        'group flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 text-left',
        className
      )}
    >
      <div>
        {showImage ? (
          <div className="relative h-44 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
            <img
              src={imageUrl}
              alt={name}
              onError={() => setImageError(true)}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-3 left-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white/90 backdrop-blur text-orange-600 shadow-md dark:bg-slate-900/90 dark:text-orange-400">
              {icon || <Wrench className="h-5 w-5" />}
            </div>
          </div>
        ) : null}

        <div className="p-5 space-y-3">
          {!showImage && (
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400">
              {icon || <Wrench className="h-5 w-5" />}
            </div>
          )}
          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              {name}
            </h4>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 pt-0">
        <Button
          size="sm"
          variant="ghost"
          className="px-0 hover:bg-transparent text-orange-600 hover:text-orange-700 dark:text-orange-400"
          rightIcon={<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />}
          onClick={() => onAction && onAction(id)}
        >
          {actionLabel}
        </Button>
      </div>
    </div>
  );
};
