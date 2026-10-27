import React, { useState, useEffect } from 'react';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calculator,
  Compass,
  Palette,
  Image as ImageIcon,
} from 'lucide-react';
import { publicDataService } from '../../services/publicData.service';
import { PublicDesignPattern, PublicDesignItem } from '../../types/public';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';
import { DesignDetailModal } from './DesignDetailModal';
import { EmptyState } from '../ui/EmptyState';

export interface PublicDesignsPageProps {
  onBackHome?: () => void;
  onRequestQuote?: (itemOrPatternName?: string | any) => void;
}

export const PublicDesignsPage: React.FC<PublicDesignsPageProps> = ({
  onBackHome,
  onRequestQuote,
}) => {
  const { publicSettings } = useBusinessSettings();
  const patterns: PublicDesignPattern[] = publicDataService.getDesignPatterns();

  // Active view tab: 'designs' (Showcase gallery) or 'patterns' (Bond schematics & calculator)
  const [activeTab, setActiveTab] = useState<'designs' | 'patterns'>('designs');

  // Design Showcase State
  const [designItems, setDesignItems] = useState<PublicDesignItem[]>(() =>
    publicDataService.getDesignItems()
  );
  const [selectedDesignCategory, setSelectedDesignCategory] = useState<string>('all');
  const [activeDesignModal, setActiveDesignModal] = useState<PublicDesignItem | null>(null);

  // Pattern Schematics State
  const [selectedLoadRating, setSelectedLoadRating] = useState<string>('all');
  const [activePattern, setActivePattern] = useState<PublicDesignPattern>(patterns[0]);

  // Interactive Pattern Estimation Calculator
  const [calcSquareMeters, setCalcSquareMeters] = useState<number>(100);
  const blocksPerSqm = activePattern.loadRating === 'Architectural Facing' ? 36 : 50;
  const totalEstimatedBlocks = Math.round(calcSquareMeters * blocksPerSqm * 1.05); // 5% cutting allowance
  const estimatedJointSandTons = ((calcSquareMeters * 3.5) / 1000).toFixed(2); // ~3.5kg joint sand per sqm

  useEffect(() => {
    let mounted = true;
    publicDataService.getDesignItemsAsync().then((items) => {
      if (mounted && items.length > 0) {
        setDesignItems(items);
      }
    });

    const handleUpdate = () => {
      publicDataService.getDesignItemsAsync().then((items) => {
        if (mounted) setDesignItems(items);
      });
    };

    window.addEventListener('xforce_designs_updated', handleUpdate);
    return () => {
      mounted = false;
      window.removeEventListener('xforce_designs_updated', handleUpdate);
    };
  }, []);

  const dynamicCategories = Array.from(
    new Set(designItems.map((d) => d.category).filter(Boolean))
  );
  const designCategories = ['all', ...dynamicCategories];

  const filteredDesigns = designItems.filter((d) => {
    return selectedDesignCategory === 'all' || d.category === selectedDesignCategory;
  });

  const filteredPatterns = patterns.filter(
    (p) => selectedLoadRating === 'all' || p.loadRating === selectedLoadRating
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 text-left space-y-8" id="public-designs-page">
      <PageHeader
        title="Architectural Designs & Laying Patterns"
        description="Explore curated design inspirations, interlocking pavement shear bonds, structural mortarless dry-stack masonry, and color combinations."
        breadcrumbItems={[
          { label: 'Home', onClick: onBackHome },
          { label: 'Designs & Patterns', isCurrent: true },
        ]}
      />

      {/* Main Tab Toggle: Showcase Gallery vs Laying Patterns */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('designs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
              activeTab === 'designs'
                ? 'bg-orange-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Design Inspiration Showcase
            <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
              {designItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('patterns')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition ${
              activeTab === 'patterns'
                ? 'bg-orange-600 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="h-4 w-4" />
            Laying Patterns & Bonds
            <span className="ml-1 rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-[10px] text-slate-700 dark:text-slate-300">
              {patterns.length}
            </span>
          </button>
        </div>
      </div>

      {/* VIEW 1: DESIGN INSPIRATION SHOWCASE */}
      {activeTab === 'designs' && (
        <div className="space-y-6">
          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <Compass className="h-3.5 w-3.5" /> Category:
            </span>
            {designCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedDesignCategory(cat)}
                className={`rounded-full px-3.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedDesignCategory === cat
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {cat === 'all' ? 'All Architectural Designs' : cat}
              </button>
            ))}
          </div>

          {/* Designs Grid */}
          {filteredDesigns.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900 text-center">
              <EmptyState
                title="No Designs in this Category"
                description="Our design catalog is continuously updated with certified project applications."
                actionLabel="Show All Designs"
                onAction={() => setSelectedDesignCategory('all')}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredDesigns.map((design) => {
                const coverImage =
                  design.images && design.images.length > 0
                    ? design.images[0]
                    : 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=800&q=80';

                return (
                  <div
                    key={design.id}
                    onClick={() => setActiveDesignModal(design)}
                    className="group rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer dark:border-slate-800 dark:bg-slate-900 flex flex-col"
                  >
                    {/* Visual Cover */}
                    <div className="relative h-48 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <img
                        src={coverImage}
                        alt={design.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <span className="rounded-md bg-white/95 backdrop-blur px-2 py-0.5 text-[10px] font-bold text-orange-600 shadow-sm dark:bg-slate-900/95 dark:text-orange-400">
                          {design.category}
                        </span>
                        {design.applicationType && (
                          <span className="rounded-md bg-black/60 backdrop-blur px-2 py-0.5 text-[10px] font-semibold text-white">
                            {design.applicationType}
                          </span>
                        )}
                      </div>

                      {design.images && design.images.length > 1 && (
                        <div className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] text-white flex items-center gap-1 font-semibold">
                          <ImageIcon className="h-3 w-3" /> {design.images.length} Photos
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-orange-600 transition-colors line-clamp-1">
                          {design.title}
                        </h4>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {design.description}
                        </p>
                      </div>

                      {/* Color Swatches Preview */}
                      {design.colorPalette && design.colorPalette.length > 0 && (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] font-semibold text-slate-400">Palette:</span>
                          <div className="flex items-center -space-x-1.5">
                            {design.colorPalette.map((c, i) => (
                              <span
                                key={i}
                                title={c.name}
                                className="h-4 w-4 rounded-full border border-white dark:border-slate-900 shadow-sm"
                                style={{ backgroundColor: c.hex }}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1">
                            {design.colorPalette[0]?.name}
                          </span>
                        </div>
                      )}

                      <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
                        <span>{design.patternStyle || 'Engineered Bond'}</span>
                        <span className="text-orange-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                          Explore Design →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: LAYING PATTERNS & TAKEOFF CALCULATOR */}
      {activeTab === 'patterns' && (
        <div className="space-y-8">
          {/* Traffic Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <Compass className="h-3.5 w-3.5" /> Traffic Rating:
            </span>
            {[
              { id: 'all', label: 'All Patterns' },
              { id: 'Heavy Vehicle', label: 'Heavy Vehicle Traffic' },
              { id: 'Medium Traffic', label: 'Medium & Driveway' },
              { id: 'Light Pedestrian', label: 'Walkways & Patios' },
              { id: 'Architectural Facing', label: 'Structural Wall Masonry' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedLoadRating(tab.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedLoadRating === tab.id
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Selected Pattern Showcase Banner */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Visual Schematic Diagram */}
            <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/60 rounded-xl p-6 border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center min-h-[260px]">
              <div className="w-48 h-48 rounded-lg overflow-hidden bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-2 shadow-inner flex items-center justify-center">
                {activePattern.slug === 'herringbone-45' ? (
                  <svg viewBox="0 0 100 100" className="w-full h-full text-orange-600 dark:text-orange-500 stroke-current">
                    <g fill="none" strokeWidth="2.5">
                      <path d="M10,25 L35,50 L60,25 L85,50" />
                      <path d="M25,10 L50,35 L75,10" />
                      <path d="M10,55 L35,80 L60,55 L85,80" />
                      <path d="M25,40 L50,65 L75,40" />
                      <path d="M25,70 L50,95 L75,70" />
                    </g>
                  </svg>
                ) : activePattern.slug === 'herringbone-90' ? (
                  <svg viewBox="0 0 100 100" className="w-full h-full text-orange-600 dark:text-orange-500 stroke-current">
                    <g fill="none" strokeWidth="2.5">
                      <rect x="15" y="15" width="20" height="40" />
                      <rect x="35" y="15" width="40" height="20" />
                      <rect x="55" y="35" width="20" height="40" />
                      <rect x="15" y="55" width="40" height="20" />
                      <rect x="35" y="75" width="40" height="20" />
                    </g>
                  </svg>
                ) : activePattern.slug === 'basket-weave' ? (
                  <svg viewBox="0 0 100 100" className="w-full h-full text-orange-600 dark:text-orange-500 stroke-current">
                    <g fill="none" strokeWidth="2">
                      <rect x="10" y="10" width="18" height="38" />
                      <rect x="28" y="10" width="18" height="38" />
                      <rect x="50" y="10" width="38" height="18" />
                      <rect x="50" y="28" width="38" height="18" />
                      <rect x="10" y="52" width="38" height="18" />
                      <rect x="10" y="70" width="38" height="18" />
                      <rect x="52" y="52" width="18" height="38" />
                      <rect x="70" y="52" width="18" height="38" />
                    </g>
                  </svg>
                ) : activePattern.slug === 'dry-stack-masonry' ? (
                  <svg viewBox="0 0 100 100" className="w-full h-full text-orange-600 dark:text-orange-500 stroke-current">
                    <g fill="none" strokeWidth="2.5">
                      <rect x="10" y="15" width="38" height="20" rx="1" />
                      <rect x="52" y="15" width="38" height="20" rx="1" />
                      <rect x="2" y="39" width="26" height="20" rx="1" />
                      <rect x="31" y="39" width="38" height="20" rx="1" />
                      <rect x="72" y="39" width="26" height="20" rx="1" />
                      <rect x="10" y="63" width="38" height="20" rx="1" />
                      <rect x="52" y="63" width="38" height="20" rx="1" />
                    </g>
                  </svg>
                ) : (
                  <svg viewBox="0 0 100 100" className="w-full h-full text-orange-600 dark:text-orange-500 stroke-current">
                    <g fill="none" strokeWidth="2">
                      <rect x="10" y="20" width="40" height="15" />
                      <rect x="50" y="20" width="40" height="15" />
                      <rect x="5" y="40" width="25" height="15" />
                      <rect x="30" y="40" width="40" height="15" />
                      <rect x="70" y="40" width="25" height="15" />
                      <rect x="10" y="60" width="40" height="15" />
                      <rect x="50" y="60" width="40" height="15" />
                    </g>
                  </svg>
                )}
              </div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-3">
                Bond Geometry: {activePattern.bondType}
              </span>
            </div>

            {/* Detailed Pattern Description */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 px-2.5 py-0.5 text-xs font-bold">
                  {activePattern.loadRating}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {activePattern.bondType}
                </span>
              </div>

              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {activePattern.name}
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {activePattern.description}
              </p>

              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/80 p-3 text-xs space-y-1.5 border border-slate-200 dark:border-slate-800">
                <p>
                  <strong className="text-slate-800 dark:text-slate-200">Recommended Applications:</strong>{' '}
                  <span className="text-slate-600 dark:text-slate-400">{activePattern.recommendedUse}</span>
                </p>
                <p>
                  <strong className="text-slate-800 dark:text-slate-200">Mechanical Shear Resistance:</strong>{' '}
                  <span className="text-slate-600 dark:text-slate-400">{activePattern.shearResistance}</span>
                </p>
              </div>

              {/* Color Options */}
              {activePattern.colorOptions && (
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Popular Factory Pigments:
                  </span>
                  <div className="flex items-center gap-2">
                    {activePattern.colorOptions.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] shadow-sm dark:border-slate-800 dark:bg-slate-900"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span className="text-slate-700 dark:text-slate-300">{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                  onClick={() => onRequestQuote && onRequestQuote(activePattern.name)}
                >
                  Request Quote for this Pattern
                </Button>
              </div>
            </div>
          </div>

          {/* Grid of All Available Patterns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPatterns.map((pat) => (
              <div
                key={pat.id}
                onClick={() => setActivePattern(pat)}
                className={`rounded-xl border p-5 cursor-pointer transition-all ${
                  activePattern.id === pat.id
                    ? 'border-orange-600 bg-orange-50/20 ring-1 ring-orange-500 shadow-md dark:border-orange-500 dark:bg-orange-950/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase font-bold text-orange-600 dark:text-orange-400">
                    {pat.loadRating}
                  </span>
                  {activePattern.id === pat.id && (
                    <CheckCircle2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  )}
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {pat.name}
                </h4>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {pat.recommendedUse}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>{pat.bondType}</span>
                  <span className="text-orange-600 font-semibold group-hover:underline">View Specs →</span>
                </div>
              </div>
            ))}
          </div>

          {/* Pattern Material Takeoff Estimator */}
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-orange-50/80 via-white to-slate-50 p-6 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-600 text-white shadow-sm">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Quick Pattern Material Takeoff Estimator
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Calculate estimated blocks and joint stabilization sand for <strong>{activePattern.name}</strong>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 items-center">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Project Area (m² / Square Meters):
                </label>
                <Input
                  type="number"
                  min={10}
                  max={10000}
                  value={calcSquareMeters}
                  onChange={(e) => setCalcSquareMeters(Math.max(1, Number(e.target.value)))}
                  placeholder="e.g. 150"
                />
              </div>

              <div className="rounded-xl bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Estimated Blocks Needed</span>
                <p className="text-xl font-extrabold text-orange-600 dark:text-orange-400">
                  {totalEstimatedBlocks.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-slate-400">units (incl. 5% cut waste)</span>
                </p>
              </div>

              <div className="rounded-xl bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Silica Joint Sand</span>
                <p className="text-xl font-extrabold text-slate-900 dark:text-white">
                  ~{estimatedJointSandTons}{' '}
                  <span className="text-xs font-normal text-slate-400">metric tons</span>
                </p>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 pt-1">
              *Estimates are calculated based on standard dimensions. Our certified survey technician will verify exact perimeters during on-site inspection.
            </p>
          </div>
        </div>
      )}

      {/* Design Detail Modal */}
      <DesignDetailModal
        design={activeDesignModal}
        isOpen={Boolean(activeDesignModal)}
        onClose={() => setActiveDesignModal(null)}
        onRequestQuote={(d) => {
          setActiveDesignModal(null);
          onRequestQuote && onRequestQuote(d.title);
        }}
      />
    </div>
  );
};
