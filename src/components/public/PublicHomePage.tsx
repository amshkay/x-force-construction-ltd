import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Wrench, Building2, CheckCircle2 } from 'lucide-react';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';
import { Button } from '../ui/Button';
import { ProductCard } from '../cards/ProductCard';
import { ProjectCard } from '../cards/ProjectCard';
import { ServiceCard } from '../cards/ServiceCard';
import { publicDataService, DEFAULT_PUBLIC_SERVICES } from '../../services/publicData.service';
import { businessSettingsService } from '../../services/settings.service';
import { getPublicProjection } from '../../config/business.config';
import { ProductDetailModal } from './ProductDetailModal';
import { PublicProduct, PublicProject, PublicServiceItem } from '../../types/public';

export interface PublicHomePageProps {
  onNavigate: (route: string) => void;
  onRequestQuote?: (product?: PublicProduct) => void;
}

const FALLBACK_PRODUCTS: PublicProduct[] = [
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
    sellingPrice: 320,
    priceOnRequest: false,
    requiresInstallation: true,
    imageUrl: '/assets/products/hydraform-ochre.jpg',
    images: [
      '/assets/products/hydraform-ochre.jpg',
      '/assets/products/hydraform-terracotta.jpg',
    ],
    variants: [
      {
        id: 'ba000000-0000-0000-0000-000000000004',
        productId: 'b1000000-0000-0000-0000-000000000003',
        name: 'Natural Clay Ochre',
        sku: 'BLK-220-OCH-01',
        color: 'Natural Ochre',
        size: '220 x 220 x 115mm',
        finish: 'Smooth Hydraulic Compressed Earth',
        imageUrl: '/assets/products/hydraform-ochre.jpg',
        priceOverride: 320,
      },
      {
        id: 'ba000000-0000-0000-0000-000000000005',
        productId: 'b1000000-0000-0000-0000-000000000003',
        name: 'Earthy Terracotta Red',
        sku: 'BLK-220-TER-02',
        color: 'Terracotta',
        size: '220 x 220 x 115mm',
        finish: 'Warm Iron-Rich Laterite',
        imageUrl: '/assets/products/hydraform-terracotta.jpg',
        priceOverride: 335,
      },
    ],
    isFeatured: true,
    isAvailable: true,
  },
  {
    id: 'b1000000-0000-0000-0000-000000000001',
    categoryId: 'c1000000-0000-0000-0000-000000000002',
    categoryName: 'Paving Stones & Walkway Pavers',
    name: '80mm Heavy-Duty Interlocking Paver (45 MPa)',
    slug: '80mm-heavy-duty-interlocking-paver',
    sku: 'PAV-80-HD-001',
    shortDescription: 'Solid high-density interlocking concrete paving block manufactured on automated hydraulic vibratory presses with 45 MPa rating.',
    description: 'Engineered for ports, container staging yards, truck depots, and commercial arterial driveways.',
    unit: 'piece',
    sellingPrice: 185,
    priceOnRequest: false,
    requiresInstallation: true,
    imageUrl: '/assets/products/paver-80mm-charcoal.jpg',
    images: [
      '/assets/products/paver-80mm-charcoal.jpg',
      '/assets/products/paver-80mm-terracotta.jpg',
      '/assets/products/paver-80mm-granite-grey.jpg',
    ],
    variants: [
      {
        id: 'ba000000-0000-0000-0000-000000000001',
        productId: 'b1000000-0000-0000-0000-000000000001',
        name: 'Industrial Terracotta Red',
        sku: 'PAV-80-TERRA-01',
        color: 'Terracotta Red',
        size: '80mm Heavy-Duty',
        finish: 'Hydraulic Vibratory Pressed',
        imageUrl: '/assets/products/paver-80mm-terracotta.jpg',
        priceOverride: 185,
      },
      {
        id: 'ba000000-0000-0000-0000-000000000002',
        productId: 'b1000000-0000-0000-0000-000000000001',
        name: 'Charcoal Black High-Torque',
        sku: 'PAV-80-CHAR-02',
        color: 'Charcoal Black',
        size: '80mm Heavy-Duty',
        finish: 'Carbon-Infused Industrial Finish',
        imageUrl: '/assets/products/paver-80mm-charcoal.jpg',
        priceOverride: 195,
      },
      {
        id: 'ba000000-0000-0000-0000-000000000003',
        productId: 'b1000000-0000-0000-0000-000000000001',
        name: 'Natural Granite Grey',
        sku: 'PAV-80-GREY-03',
        color: 'Granite Grey',
        size: '80mm Heavy-Duty',
        finish: 'Unpigmented Pure Granite Aggregate',
        imageUrl: '/assets/products/paver-80mm-granite-grey.jpg',
        priceOverride: 185,
      },
    ],
    isFeatured: true,
    isAvailable: true,
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
    sellingPrice: 2200,
    priceOnRequest: false,
    requiresInstallation: true,
    imageUrl: '/assets/products/kerb-1.jpg',
    images: [
      '/assets/products/kerb-1.jpg',
      '/assets/products/kerb-2.jpg',
      '/assets/products/kerb-3.jpg',
      '/assets/products/kerb-4.jpg',
      '/assets/products/kerb-5.jpg',
    ],
    variants: [],
    isFeatured: true,
    isAvailable: true,
  },
  {
    id: 'b1000000-0000-0000-0000-000000000006',
    categoryId: 'c1000000-0000-0000-0000-000000000004',
    categoryName: 'Coping & Structural Concrete',
    name: 'Precast Saddleback Wall Coping (300mm)',
    slug: 'precast-saddleback-wall-coping',
    sku: 'CPG-SDL-300-002',
    shortDescription: 'Dual-sloped architectural coping with integrated continuous drip throats.',
    description: 'Weatherproof precast concrete coping capping for 9-inch walling and perimeter fencing.',
    unit: 'piece',
    sellingPrice: 1850,
    priceOnRequest: false,
    requiresInstallation: true,
    imageUrl: '/assets/products/coping-1.jpg',
    images: [
      '/assets/products/coping-1.jpg',
      '/assets/products/coping-2.jpg',
      '/assets/products/coping-3.jpg',
    ],
    variants: [],
    isFeatured: true,
    isAvailable: true,
  },
];

const FALLBACK_PROJECTS = [
  {
    id: 'e7000000-0000-0000-0000-000000000001',
    title: 'Atlantic Logistics Freight Terminal & Staging Yard',
    location: 'Ibeju-Lekki Free Trade Zone, Lagos',
    category: 'Industrial Yard',
    completionDate: 'November 2025',
    coverImageUrl: '/assets/projects/atlantic-logistics.jpg',
  },
  {
    id: 'e7000000-0000-0000-0000-000000000002',
    title: 'The Palms Luxury Villa Residential Dry-Stack Facade',
    location: 'Banana Island, Ikoyi, Lagos',
    category: 'Residential Building',
    completionDate: 'January 2026',
    coverImageUrl: '/assets/projects/palms-villa.jpg',
  },
  {
    id: 'e7000000-0000-0000-0000-000000000003',
    title: 'Epe Waterfront Estate Architectural Perimeter Enclosure',
    location: 'Epe Resort Expressway, Lagos',
    category: 'Perimeter Wall',
    completionDate: 'December 2025',
    coverImageUrl: '/assets/projects/epe-waterfront.jpg',
  },
];

export const PublicHomePage: React.FC<PublicHomePageProps> = ({ onNavigate, onRequestQuote }) => {
  const { publicSettings } = useBusinessSettings();
  const [liveSettings, setLiveSettings] = useState(publicSettings);
  const [featuredProducts, setFeaturedProducts] = useState<PublicProduct[]>([]);
  const [featuredProjects, setFeaturedProjects] = useState<PublicProject[]>([]);
  const [services, setServices] = useState<PublicServiceItem[]>([]);
  const [heroImageError, setHeroImageError] = useState(false);
  const [activeModalProduct, setActiveModalProduct] = useState<PublicProduct | null>(null);

  // Synchronize liveSettings whenever publicSettings changes
  useEffect(() => {
    setLiveSettings(publicSettings);
  }, [publicSettings]);

  // Subscribe directly to businessSettingsService for instant updates
  useEffect(() => {
    const unsub = businessSettingsService.subscribe((updated) => {
      setLiveSettings(getPublicProjection(updated));
    });
    return unsub;
  }, []);

  // Reset error whenever heroImageUrl updates
  useEffect(() => {
    setHeroImageError(false);
  }, [liveSettings.websiteContent?.heroImageUrl]);

  useEffect(() => {
    let isMounted = true;
    const fetchHomepageData = async () => {
      try {
        const [prods, projs, srvs] = await Promise.all([
          publicDataService.getProducts(),
          publicDataService.getProjects(),
          publicDataService.getServices(),
        ]);
        if (isMounted) {
          if (prods && prods.length > 0) {
            setFeaturedProducts(prods.slice(0, 3));
          }
          if (projs && projs.length > 0) {
            setFeaturedProjects(projs.slice(0, 3));
          }
          if (srvs && srvs.length > 0) {
            setServices(srvs);
          }
        }
      } catch (err) {
        console.warn('[PublicHomePage] Error fetching live data, using fallbacks:', err);
      }
    };
    fetchHomepageData();

    const handleServicesUpdate = () => {
      const updatedSrvs = publicDataService.getServices();
      if (updatedSrvs && updatedSrvs.length > 0) {
        setServices(updatedSrvs);
      }
    };
    const handleProjectsUpdate = () => {
      const updatedProjs = publicDataService.getProjects();
      if (updatedProjs && updatedProjs.length > 0) {
        setFeaturedProjects(updatedProjs.slice(0, 3));
      }
    };

    window.addEventListener('xforce_services_updated', handleServicesUpdate);
    window.addEventListener('xforce_projects_updated', handleProjectsUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('xforce_services_updated', handleServicesUpdate);
      window.removeEventListener('xforce_projects_updated', handleProjectsUpdate);
    };
  }, []);

  const displayProducts = featuredProducts.length > 0 ? featuredProducts : FALLBACK_PRODUCTS;
  const displayProjects = featuredProjects.length > 0 ? featuredProjects : FALLBACK_PROJECTS;
  const activeServices = services.length > 0 ? services : DEFAULT_PUBLIC_SERVICES;
  const displayServices = activeServices.filter((s) => s.isAvailable !== false).slice(0, 3);

  const fallbackHeroUrl = '/assets/services/pavement-laying.jpg';
  const heroImageUrl = !heroImageError && liveSettings.websiteContent?.heroImageUrl
    ? liveSettings.websiteContent.heroImageUrl
    : fallbackHeroUrl;

  const quickNavLinks = [
    { label: 'Products', path: '/products', icon: '🧱', desc: 'Catalog & Pavers' },
    { label: 'Services', path: '/services', icon: '🔨', desc: 'Laying & Survey' },
    { label: 'Projects', path: '/projects', icon: '🏛️', desc: 'Completed Sites' },
    { label: 'Designs', path: '/designs', icon: '📐', desc: 'Patterns & Bonds' },
    { label: 'About Us', path: '/about', icon: 'ℹ️', desc: 'Factory & Heritage' },
    { label: 'Contact', path: '/contact', icon: '📞', desc: 'Direct Desk' },
    { label: 'Track Order', path: '/track', icon: '🔍', desc: 'Status Check' },
  ];

  return (
    <div className="space-y-12 sm:space-y-20 py-6 sm:py-10" id="public-home-page">
      {/* 1. Hero Section (Section 19) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800 dark:border-orange-900/50 dark:bg-orange-950/40 dark:text-orange-300 mb-4 sm:mb-6">
          <Sparkles className="h-3.5 w-3.5 text-orange-600" />
          <span className="truncate max-w-[280px] xs:max-w-none">{liveSettings.slogan || liveSettings.websiteContent?.publicSlogan || 'Engineered For Strength. Crafted For Distinction.'}</span>
        </div>

        <h1 className="text-2xl xs:text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight">
          {liveSettings.websiteContent?.heroHeading || (
            <>
              Engineered Interlocking Bricks &{' '}
              <span className="text-orange-600 dark:text-orange-500">
                Architectural Construction
              </span>
            </>
          )}
        </h1>

        <p className="mt-4 sm:mt-5 text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          {liveSettings.websiteContent?.heroSubheading || liveSettings.description}
        </p>

        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-md mx-auto">
          <Button
            size="lg"
            variant="primary"
            onClick={() => onNavigate('/request')}
            rightIcon={<ArrowRight className="h-4 w-4" />}
            className="w-full sm:w-auto justify-center"
          >
            Request Instant Quotation
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => onNavigate('/products')}
            className="w-full sm:w-auto justify-center"
          >
            Browse Products Catalog
          </Button>
        </div>

        {/* Mobile Quick-Jump Directory Strip (Visible on mobile/tablet to ensure instant discoverability) */}
        <div className="mt-6 lg:hidden">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 text-left px-1">
            Quick Directory & Offerings
          </p>
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-2 text-left">
            {quickNavLinks.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => onNavigate(item.path)}
                className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shadow-2xs hover:border-orange-500 active:scale-[0.98] transition-all"
              >
                <span className="text-base select-none shrink-0">{item.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {item.label}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {item.desc}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Hero Visual Card Showcase */}
        <div className="mt-8 sm:mt-12 relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl max-w-5xl mx-auto h-64 sm:h-80 md:h-96">
          <img
            key={heroImageUrl}
            src={heroImageUrl}
            alt="XFORCE Engineered Interlocking Masonry"
            onError={() => {
              console.warn('[PublicHomePage] Hero image failed to load, falling back to default:', heroImageUrl);
              setHeroImageError(true);
            }}
            className="w-full h-full object-cover transition-all duration-500"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-4 sm:p-6 md:p-8 text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-600/90 backdrop-blur-sm px-2.5 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs font-semibold text-white w-fit mb-1.5 sm:mb-2">
              <span>Hydraulic-Cured 45 MPa Precision Blocks</span>
            </div>
            <h3 className="text-base sm:text-xl md:text-2xl font-bold text-white drop-shadow-sm leading-tight">
              Mortarless Interlocking Dry-Stack System
            </h3>
            <p className="text-xs sm:text-sm text-slate-200 max-w-xl line-clamp-2 mt-1">
              Zero plastering required. Thermal insulating, high seismic resilience, and 40% faster structural erection speed across Nigeria.
            </p>
          </div>
        </div>

        {/* Value Highlights */}
        <div className="mt-8 sm:mt-12 grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 max-w-4xl mx-auto text-left">
          <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-900/40">
            <ShieldCheck className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Certified Strength</p>
              <p className="text-[11px] text-slate-500">High-compression hydraulic cured</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-900/40">
            <Wrench className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Expert Laying</p>
              <p className="text-[11px] text-slate-500">Skilled site technicians</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-900/40">
            <Building2 className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Eco-Efficient</p>
              <p className="text-[11px] text-slate-500">Minimal mortar requirement</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-900/40">
            <CheckCircle2 className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Direct Factory</p>
              <p className="text-[11px] text-slate-500">Wholesale contractor rates</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Company & Heritage Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-left">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-6 sm:p-10 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800 dark:border-orange-900/50 dark:bg-orange-950/40 dark:text-orange-300">
                <Building2 className="h-3.5 w-3.5 text-orange-600" />
                <span>About {liveSettings.publicBrandName || 'XFORCE Construction Ltd'}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Pioneering Interlocking Masonry & Turnkey Construction
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                {liveSettings.websiteContent?.aboutDescription ||
                  'X-FORCE BRICKS and XFORCE Construction Ltd manufacture heavy-duty, high-compression hydraulic-pressed interlocking earth blocks and commercial pavers. We supply materials and deploy certified laying teams to deliver durable, eco-friendly, and cost-effective structures with zero external plastering required.'}
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => onNavigate('/about')}
                  rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                >
                  Learn More About Us
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigate('/services')}
                >
                  Explore Installation Services
                </Button>
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <p className="text-2xl font-black text-orange-600">45 MPa</p>
                <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">Hydraulic Strength</p>
                <p className="text-[11px] text-slate-500">High mechanical compression</p>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <p className="text-2xl font-black text-orange-600">40% Faster</p>
                <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">Erection Speed</p>
                <p className="text-[11px] text-slate-500">Tongue-and-groove precision</p>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <p className="text-2xl font-black text-orange-600">0mm Mortar</p>
                <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">Dry-Stack Joint</p>
                <p className="text-[11px] text-slate-500">Eliminates wet mortar bed</p>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <p className="text-2xl font-black text-orange-600">100%</p>
                <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">Certified Crew</p>
                <p className="text-[11px] text-slate-500">Master site craftsmen</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Core Material Categories Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-left">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              Manufacturing Excellence
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Featured Building Materials
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('/products')}
            rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
          >
            View All Products
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayProducts.map((prod) => {
            const img =
              (prod as any).imageUrl ||
              ((prod as any).images && (prod as any).images.length > 0
                ? (prod as any).images[0]
                : undefined);

            return (
              <ProductCard
                key={prod.id}
                id={prod.id}
                name={prod.name}
                category={(prod as any).categoryName || (prod as any).category || 'Building Material'}
                variant={
                  (prod as any).variant ||
                  ((prod as any).variants && (prod as any).variants.length > 0
                    ? (prod as any).variants[0].name
                    : undefined)
                }
                price={(prod as any).sellingPrice ?? (prod as any).price ?? 0}
                unit={prod.unit || 'piece'}
                status="active"
                statusLabel="In Stock"
                imageUrl={img}
                onAction={() => {
                  const match =
                    featuredProducts.find((p) => p.id === prod.id) ||
                    FALLBACK_PRODUCTS.find((p) => p.id === prod.id) ||
                    (prod as unknown as PublicProduct);
                  setActiveModalProduct(match);
                }}
                actionLabel="View Specs"
              />
            );
          })}
        </div>
      </section>

      {/* 3. Professional Installation Services Section (Section 20) */}
      <section id="homepage-services-section" className="relative z-0 block w-full clear-both mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-left">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
            End-to-End Solutions
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Specialized Installation Services
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            We provide material supply, professional laying crews, and on-site engineering oversight.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayServices.map((srv) => (
            <ServiceCard
              key={srv.id}
              id={srv.id}
              name={srv.title}
              description={srv.shortDescription}
              imageUrl={srv.imageUrl}
              onAction={() => onNavigate('/services')}
            />
          ))}
        </div>
      </section>

      {/* 4. Project Showcase Section (Section 20) */}
      <section id="homepage-projects-section" className="relative z-0 block w-full clear-both mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-left">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              Proven Delivery
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Featured Client Projects
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('/projects')}
            rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
          >
            Explore Projects
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayProjects.map((proj) => (
            <ProjectCard
              key={proj.id}
              id={proj.id}
              title={proj.title}
              location={proj.location}
              category={proj.category}
              completionDate={proj.completionDate || 'Recent'}
              status="completed"
              coverImageUrl={(proj as any).coverImageUrl}
              onClick={() => onNavigate('/projects')}
            />
          ))}
        </div>
      </section>

      {/* 5. Reusable Testimonials Placeholder (Section 19) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-8 sm:p-12 text-center dark:border-slate-800 dark:bg-slate-900/40">
          <p className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 mb-2">
            Client Trust & Verification
          </p>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Built for Architects, Developers & Property Owners
          </h3>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
            "X-FORCE Bricks provided consistent dimensional uniformity across our entire 25,000 unit consignment with zero transport breakage."
          </p>
          <div className="mt-4">
            <p className="text-xs font-bold text-slate-900 dark:text-white">Lead Structural Engineer</p>
            <p className="text-[11px] text-slate-400">Apex Construction Consortium</p>
          </div>
        </div>
      </section>

      {/* 6. Call To Action (Section 19) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-orange-600 px-6 py-12 sm:p-16 text-center text-white shadow-xl dark:bg-orange-700">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Start Your Construction Project?
          </h2>
          <p className="mt-3 text-sm sm:text-base text-orange-100 max-w-2xl mx-auto">
            Get in touch with our technical sales engineers for customized quotes, site assessment, or factory visits.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => onNavigate('/request')}
            >
              Request a Free Quote
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/40 text-white hover:bg-white/10"
              onClick={() => onNavigate('/contact')}
            >
              Contact Sales Team
            </Button>
          </div>
        </div>
      </section>

      {/* Interactive Material Specification & Variant Swatch Modal */}
      <ProductDetailModal
        product={activeModalProduct}
        isOpen={Boolean(activeModalProduct)}
        onClose={() => setActiveModalProduct(null)}
        onRequestQuote={(p) => {
          setActiveModalProduct(null);
          if (onRequestQuote) {
            onRequestQuote(p);
          } else {
            onNavigate('/request');
          }
        }}
      />
    </div>
  );
};
