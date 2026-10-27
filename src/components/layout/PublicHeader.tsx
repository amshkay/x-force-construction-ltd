import React, { useState } from 'react';
import { Menu, X, Sun, Moon, Sparkles, ShieldCheck, Lock, User } from 'lucide-react';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { PWAInstallButton } from '../../pwa/PWAInstallButton';
import { Button } from '../ui/Button';

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

  // Section 18 Navigation
  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'About', path: '/about' },
    { label: 'Products', path: '/products' },
    { label: 'Designs', path: '/designs' },
    { label: 'Projects', path: '/projects' },
    { label: 'Services', path: '/services' },
    { label: 'Contact', path: '/contact' },
    { label: 'Track Request', path: '/track' },
  ];

  const handleNavClick = (path: string) => {
    if (onRouteChange) {
      onRouteChange(path);
    }
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
        <nav id="desktop-nav" className="hidden lg:flex items-center gap-3 xl:gap-5">
          {navItems.map((item) => {
            const isActive = currentRoute === item.path;
            return (
              <button
                key={item.path}
                id={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => handleNavClick(item.path)}
                className={`text-xs font-semibold transition-colors whitespace-nowrap ${
                  isActive
                    ? 'text-orange-600 dark:text-orange-400 font-bold'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
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
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden shrink-0"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-menu"
          className="border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 lg:hidden animate-in slide-in-from-top-2"
        >
          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${
                  currentRoute === item.path
                    ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 font-semibold'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <Button
              id="btn-mobile-request-quote"
              size="sm"
              variant="primary"
              className="w-full"
              onClick={() => handleNavClick('/request')}
            >
              Request Quote
            </Button>
            <Button
              id="btn-mobile-customer-login"
              size="sm"
              variant="outline"
              className="w-full text-xs"
              leftIcon={<User className="h-3.5 w-3.5 text-orange-600" />}
              onClick={() => handleNavClick('/customer/login')}
            >
              Customer Account Sign In
            </Button>
            {isAuthenticated ? (
              <Button
                id="btn-mobile-staff-portal"
                size="sm"
                variant="outline"
                className="w-full"
                leftIcon={<ShieldCheck className="h-3.5 w-3.5 text-orange-600" />}
                onClick={() => handleNavClick('/admin')}
              >
                Go to Management Console
              </Button>
            ) : (
              <Button
                id="btn-mobile-staff-login"
                size="sm"
                variant="ghost"
                className="w-full text-xs text-slate-600 dark:text-slate-300"
                leftIcon={<Lock className="h-3.5 w-3.5 text-slate-400" />}
                onClick={() => handleNavClick('/auth/login')}
              >
                Staff Portal Sign In
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
