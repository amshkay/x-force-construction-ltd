import React from 'react';
import { MapPin, Calendar, Building2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { StatusBadge } from '../ui/StatusBadge';
import { SystemStatus } from '../../config/theme.tokens';

export interface ProjectCardProps {
  id: string;
  title: string;
  location: string;
  category: string;
  completionDate?: string;
  status?: SystemStatus;
  statusLabel?: string;
  coverImageUrl?: string;
  className?: string;
  onClick?: (id: string) => void;
}

const getProjectFallbackImage = (cat: string, title: string): string => {
  const text = `${cat} ${title}`.toLowerCase();
  if (text.includes('industrial') || text.includes('commercial') || text.includes('yard') || text.includes('road') || text.includes('terminal')) {
    return 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=800&q=80';
  }
  if (text.includes('residential') || text.includes('villa') || text.includes('facade') || text.includes('house')) {
    return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80';
  }
  if (text.includes('perimeter') || text.includes('fencing') || text.includes('wall') || text.includes('gatehouse') || text.includes('enclosure')) {
    return 'https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?auto=format&fit=crop&w=800&q=80';
  }
  return 'https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?auto=format&fit=crop&w=800&q=80';
};

export const ProjectCard: React.FC<ProjectCardProps> = ({
  id,
  title,
  location,
  category,
  completionDate,
  status = 'completed',
  statusLabel,
  coverImageUrl,
  className,
  onClick,
}) => {
  const [imageError, setImageError] = React.useState(false);
  const activeImage = !imageError && coverImageUrl ? coverImageUrl : getProjectFallbackImage(category, title);

  return (
    <div
      id={`project-card-${id}`}
      onClick={() => onClick && onClick(id)}
      className={cn(
        'group cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 text-left',
        className
      )}
    >
      {/* Cover Image */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        {activeImage ? (
          <img
            src={activeImage}
            alt={title}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
            <Building2 className="h-10 w-10 stroke-1" />
            <span className="mt-1 text-[11px]">Construction Showcase</span>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <StatusBadge status={status} label={statusLabel} size="sm" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
          {category}
        </p>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
          {title}
        </h4>

        <div className="space-y-1 pt-1 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{location}</span>
          </div>
          {completionDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>{completionDate}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
