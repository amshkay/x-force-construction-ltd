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
import { PublicProduct, PublicProject, PublicServiceItem } from '../../types/public';

export interface PublicHomePageProps {
  onNavigate: (route: string) => void;
}

const FALLBACK_PRODUCTS = [
  {
    id: 'b1000000-0000-0000-0000-000000000003',
    name: '220mm Hydraform Interlocking Earth Block',
    categoryName: 'Interlocking Bricks & Blocks',
    variant: '220mm x 220mm x 115mm (Precision Tongue & Groove)',
    sellingPrice: 320,
    unit: 'piece',
    imageUrl: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'b1000000-0000-0000-0000-000000000001',
    name: '80mm Heavy-Duty Interlocking Paver (45 MPa)',
    categoryName: 'Paving Stones & Walkway Pavers',
    variant: '80mm High-Load Hydraulic Vibratory Pressed',
    sellingPrice: 185,
    unit: 'piece',
    imageUrl: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'b1000000-0000-0000-0000-000000000006',
    name: 'Precast Saddleback Wall Coping (300mm)',
    categoryName: 'Coping & Structural Concrete',
    variant: 'Water-shedding dual drip throat profile',
    sellingPrice: 1850,
    unit: 'piece',
    imageUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80',
  },
];

const FALLBACK_PROJECTS = [
  {
    id: 'e7000000-0000-0000-0000-000000000001',
    title: 'Atlantic Logistics Freight Terminal & Staging Yard',
    location: 'Ibeju-Lekki Free Trade Zone, Lagos',
    category: 'Industrial Yard',
    completionDate: 'November 2025',
    coverImageUrl: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'e7000000-0000-0000-0000-000000000002',
    title: 'The Palms Luxury Villa Residential Dry-Stack Facade',
    location: 'Banana Island, Ikoyi, Lagos',
    category: 'Residential Building',
    completionDate: 'January 2026',
    coverImageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'e7000000-0000-0000-0000-000000000003',
    title: 'Epe Waterfront Estate Architectural Perimeter Enclosure',
    location: 'Epe Resort Expressway, Lagos',
    category: 'Perimeter Wall',
    completionDate: 'December 2025',
    coverImageUrl: 'https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?auto=format&fit=crop&w=800&q=80',
  },
];

export const PublicHomePage: React.FC<PublicHomePageProps> = ({ onNavigate }) => {
  const { publicSettings } = useBusinessSettings();
  const [liveSettings, setLiveSettings] = useState(publicSettings);
  const [featuredProducts, setFeaturedProducts] = useState<PublicProduct[]>([]);
  const [featuredProjects, setFeaturedProjects] = useState<PublicProject[]>([]);
  const [services, setServices] = useState<PublicServiceItem[]>([]);
  const [heroImageError, setHeroImageError] = useState(false);

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
    return () => {
      isMounted = false;
    };
  }, []);

  const displayProducts = featuredProducts.length > 0 ? featuredProducts : FALLBACK_PRODUCTS;
  const displayProjects = featuredProjects.length > 0 ? featuredProjects : FALLBACK_PROJECTS;
  const activeServices = services.length > 0 ? services : DEFAULT_PUBLIC_SERVICES;
  const displayServices = activeServices.filter((s) => s.isAvailable !== false).slice(0, 3);

  const fallbackHeroUrl = 'https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?auto=format&fit=crop&w=1600&q=80';
  const heroImageUrl = !heroImageError && liveSettings.websiteContent?.heroImageUrl
    ? liveSettings.websiteContent.heroImageUrl
    : fallbackHeroUrl;

  return (
    <div className="space-y-16 sm:space-y-24 py-8 sm:py-12" id="public-home-page">
      {/* 1. Hero Section (Section 19) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800 dark:border-orange-900/50 dark:bg-orange-950/40 dark:text-orange-300 mb-6">
          <Sparkles className="h-3.5 w-3.5 text-orange-600" />
          <span>{liveSettings.slogan || liveSettings.websiteContent?.publicSlogan || 'Engineered For Strength. Crafted For Distinction.'}</span>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight">
          {liveSettings.websiteContent?.heroHeading || (
            <>
              Engineered Interlocking Bricks &{' '}
              <span className="text-orange-600 dark:text-orange-500">
                Architectural Construction
              </span>
            </>
          )}
        </h1>

        <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          {liveSettings.websiteContent?.heroSubheading || liveSettings.description}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button
            size="lg"
            variant="primary"
            onClick={() => onNavigate('/request')}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Request Instant Quotation
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => onNavigate('/products')}
          >
            Browse Products Catalog
          </Button>
        </div>

        {/* Hero Visual Card Showcase */}
        <div className="mt-12 relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl max-w-5xl mx-auto h-64 sm:h-80 md:h-96">
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6 sm:p-8 text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-600/90 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white w-fit mb-2">
              <span>Hydraulic-Cured 45 MPa Precision Blocks</span>
            </div>
            <h3 className="text-lg sm:text-2xl font-bold text-white drop-shadow-sm">
              Mortarless Interlocking Dry-Stack System
            </h3>
            <p className="text-xs sm:text-sm text-slate-200 max-w-xl line-clamp-2 mt-1">
              Zero plastering required. Thermal insulating, high seismic resilience, and 40% faster structural erection speed across Nigeria.
            </p>
          </div>
        </div>

        {/* Value Highlights */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
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
                onAction={() => onNavigate('/products')}
                actionLabel="View Specs"
              />
            );
          })}
        </div>
      </section>

      {/* 3. Professional Installation Services Section (Section 20) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-left">
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-left">
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
    </div>
  );
};
