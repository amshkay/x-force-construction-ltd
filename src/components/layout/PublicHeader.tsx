import React, { useState, useEffect } from 'react';
import {
  Menu,
  X,
  Sun,
  Moon,
  Sparkles,
  ShieldCheck,
  Lock,
  User,
  Home,
  Info,
  Layers,
  Palette,
  Building2,
  Wrench,
  Phone,
  Search,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { PWAInstallButton } from '../../pwa/PWAInstallButton';
import { Button } from '../ui/Button';
import { openWhatsAppChat } from '../../utils/whatsapp';

interface PublicHeaderProps {
  currentRoute?: string;
  onRouteChange?: (route: string) => void;
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({
  currentRoute = '/',
  onRouteChange,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { resolvedTheme, toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const { publicSettings } = useBusinessSettings();

  // Navigation Items with descriptive subtitles and distinct icons
  const navItems = [
    {
      label: 'Home',
      path: '/',
      icon: Home,
      subtitle: 'Main overview & factory showcase',
    },
    {
      label: 'About',
      path: '/about',
      icon: Info,
      subtitle: 'Company history, mission & certified crew',
    },
    {
      label: 'Services',
      path: '/services',
      icon: Wrench,
      subtitle: 'Specialized laying, masonry & surveying',
    },
    {
      label: 'Products',
      path: '/products',
      icon: Layers,
      subtitle: 'Interlocking earth bricks, pavers & kerbs',
    },
    {
      label: 'Projects',
      path: '/projects',
      icon: Building2,
      subtitle: 'Completed logistics yards, estates & villas',
    },
    {
      label: 'Designs',
      path: '/designs',
      icon: Palette,
      subtitle: 'Herringbone, stretcher & weave bond styles',
    },
    {
      label: 'Contact',
      path: '/contact',
      icon: Phone,
      subtitle: 'Factory yards, GPS map & direct desk',
    },
    {
      label: 'Track Request',
      path: '/track',
      icon: Search,
      subtitle: 'Live quotation & order progress check',
    },
  ];

  // Listen to external toggle events (e.g. from mobile bottom nav bar)
  useEffect(() => {
    const handleToggle = () => setMobileMenuOpen((prev) => !prev);
    window.addEventListener('xforce_toggle_mobile_menu', handleToggle);
    return () => window.removeEventListener('xforce_toggle_mobile_menu', handleToggle);
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const handleNavClick = (path: string) => {
    if (onRouteChange) {
      onRouteChange(path);
    }
    setMobileMenuOpen(false);
  };

  const handleWhatsAppHelp = () => {
    const msg = `Hello ${publicSettings.publicBrandName}, I need assistance regarding your products and installation services.`;
    openWhatsAppChat(publicSettings.whatsappNumber, msg);
    setMobileMenuOpen(false);
  };

  return (
    <header
      id="public-header"
      className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/95 transition-colors"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand identity */}
        <div
          id="brand-logo-container"
          onClick={() => handleNavClick('/')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          {publicSettings.branding.logoUrl ? (
            <img
              src={publicSettings.branding.logoUrl}
              alt={publicSettings.publicBrandName}
              className="h-9 w-auto max-w-[140px] object-contain rounded transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-600 font-bold text-white shadow-sm transition-transform group-hover:scale-105">
              {publicSettings.shortName ? publicSettings.shortName.charAt(0) : 'X'}
            </div>
          )}
          <div className="min-w-0">
            <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white truncate block max-w-[140px] xs:max-w-[180px] sm:max-w-none">
              {publicSettings.publicBrandName}
            </span>
            <span className="hidden sm:block text-[10px] uppercase tracking-wider font-semibold text-orange-600 dark:text-orange-400 truncate">
              {publicSettings.slogan}
            </span>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav id="desktop-nav" className="hidden lg:flex items-center gap-2 xl:gap-4">
          {navItems.map((item) => {
            const isActive = currentRoute === item.path;
            return (
              <button
                key={item.path}
                id={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => handleNavClick(item.path)}
                className={`text-xs font-semibold px-2 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? 'text-orange-600 dark:text-orange-400 bg-orange-50/80 dark:bg-orange-950/40 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <PWAInstallButton />

          <button
            id="btn-theme-toggle"
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition shrink-0"
            aria-label="Toggle light/dark theme"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-600" />
            )}
          </button>

          <Button
            id="btn-public-customer-portal"
            size="sm"
            variant="ghost"
            leftIcon={<User className="h-3.5 w-3.5 text-slate-500" />}
            onClick={() => handleNavClick('/customer/login')}
            className="hidden xl:inline-flex text-xs text-slate-600 dark:text-slate-300 hover:text-orange-600"
          >
            Customer Sign In
          </Button>

          {isAuthenticated ? (
            <Button
              id="btn-public-staff-portal"
              size="sm"
              variant="outline"
              leftIcon={<ShieldCheck className="h-3.5 w-3.5 text-orange-600" />}
              onClick={() => handleNavClick('/admin')}
              className="hidden md:inline-flex border-slate-300 dark:border-slate-700"
            >
              Console
            </Button>
          ) : (
            <Button
              id="btn-public-staff-login"
              size="sm"
              variant="ghost"
              leftIcon={<Lock className="h-3.5 w-3.5 text-slate-500" />}
              onClick={() => handleNavClick('/auth/login')}
              className="hidden xl:inline-flex text-xs text-slate-600 dark:text-slate-300 hover:text-orange-600"
            >
              Staff Portal
            </Button>
          )}

          <Button
            id="btn-public-request-quote"
            size="sm"
            variant="primary"
            leftIcon={<Sparkles className="h-3.5 w-3.5" />}
            onClick={() => handleNavClick('/request')}
            className="hidden sm:inline-flex"
          >
            Request Quote
          </Button>

          {/* Mobile hamburger menu toggle */}
          <button
            id="btn-mobile-menu-toggle"
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden shrink-0 border border-slate-200 dark:border-slate-800 ml-1"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5 text-orange-600" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Full-Screen Mobile Drawer Modal with Backdrop */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileMenuOpen(false);
          }}
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
        >
          <div className="flex h-full w-full max-w-sm flex-col bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 text-left">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-600 text-white font-bold flex items-center justify-center text-sm">
                  {publicSettings.shortName ? publicSettings.shortName.charAt(0) : 'X'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    {publicSettings.publicBrandName}
                  </h3>
                  <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold uppercase tracking-wider block">
                    Public Navigation
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Navigation Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Primary Pages Group */}
              <div className="space-y-1">
                <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                  Explore Pages & Offerings
                </p>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentRoute === item.path;
                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => handleNavClick(item.path)}
                      className={`flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition-all ${
                        isActive
                          ? 'bg-orange-50 border border-orange-200 text-orange-900 dark:bg-orange-950/50 dark:border-orange-900/60 dark:text-orange-300 font-semibold'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/80 border border-transparent'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                          isActive
                            ? 'bg-orange-600 text-white'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold block">{item.label}</span>
                          {isActive && (
                            <span className="text-[10px] bg-orange-600 text-white px-1.5 py-0.2 rounded font-bold">
                              Current
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 block">
                          {item.subtitle}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons & Portals */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Instant Access & Portals
                </p>

                <Button
                  size="md"
                  variant="primary"
                  className="w-full justify-center"
                  leftIcon={<Sparkles className="w-4 h-4" />}
                  onClick={() => handleNavClick('/request')}
                >
                  Request Instant Quotation
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-center text-xs"
                  leftIcon={<User className="w-4 h-4 text-orange-600" />}
                  onClick={() => handleNavClick('/customer/login')}
                >
                  Customer Account Sign In
                </Button>

                {isAuthenticated ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-center text-xs border-orange-300 dark:border-orange-800 text-orange-700 dark:text-orange-400"
                    leftIcon={<ShieldCheck className="w-4 h-4 text-orange-600" />}
                    onClick={() => handleNavClick('/admin')}
                  >
                    Go to Management Console
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full justify-center text-xs text-slate-600 dark:text-slate-300"
                    leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                    onClick={() => handleNavClick('/auth/login')}
                  >
                    Staff Portal Sign In
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Contact Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span className="font-semibold">Direct Factory Line:</span>
                <a href={`tel:${publicSettings.contactPhone}`} className="text-orange-600 font-bold hover:underline">
                  {publicSettings.contactPhone}
                </a>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="w-full text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 justify-center"
                leftIcon={<MessageSquare className="w-3.5 h-3.5 text-emerald-600" />}
                onClick={handleWhatsAppHelp}
              >
                Chat on WhatsApp Support
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
