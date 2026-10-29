/**
 * Public Mobile Bottom Navigation Bar
 * Module 05: Public Website & Customer Experience
 *
 * Provides instant, ergonomic thumb access on mobile phones (md:hidden)
 * to core pages: Home, About, Services, Products, and Full Drawer Menu.
 */

import React from 'react';
import { Home, Info, Wrench, Layers, Menu, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';

interface PublicMobileBottomNavProps {
  currentRoute?: string;
  onRouteChange?: (route: string) => void;
  onOpenMenu?: () => void;
}

export const PublicMobileBottomNav: React.FC<PublicMobileBottomNavProps> = ({
  currentRoute = '/',
  onRouteChange,
  onOpenMenu,
}) => {
  const handleNav = (path: string) => {
    if (onRouteChange) {
      onRouteChange(path);
    }
  };

  const handleMenuClick = () => {
    if (onOpenMenu) {
      onOpenMenu();
    } else {
      window.dispatchEvent(new CustomEvent('xforce_toggle_mobile_menu'));
    }
  };

  const navTabs = [
    {
      id: 'tab-home',
      label: 'Home',
      path: '/',
      icon: Home,
      isActive: currentRoute === '/',
    },
    {
      id: 'tab-about',
      label: 'About',
      path: '/about',
      icon: Info,
      isActive: currentRoute === '/about',
    },
    {
      id: 'tab-services',
      label: 'Services',
      path: '/services',
      icon: Wrench,
      isActive: currentRoute === '/services',
    },
    {
      id: 'tab-products',
      label: 'Products',
      path: '/products',
      icon: Layers,
      isActive: currentRoute === '/products',
    },
  ];

  return (
    <nav
      id="public-mobile-bottom-nav"
      aria-label="Mobile Navigation Bar"
      className="fixed bottom-0 inset-x-0 z-40 block md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800/90 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
    >
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-1">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              id={tab.id}
              type="button"
              onClick={() => handleNav(tab.path)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 transition-all select-none relative',
                tab.isActive
                  ? 'text-orange-600 dark:text-orange-500 font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              )}
            >
              {tab.isActive && (
                <span className="absolute top-0 inset-x-4 h-0.5 bg-orange-600 dark:bg-orange-500 rounded-full" />
              )}
              <Icon className={cn('w-5 h-5 transition-transform', tab.isActive ? 'scale-110' : '')} />
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}

        {/* Menu Toggler Tab */}
        <button
          id="tab-mobile-more-menu"
          type="button"
          onClick={handleMenuClick}
          className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400 transition-all select-none relative"
          aria-label="Open complete menu drawer"
        >
          <div className="relative">
            <Menu className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-orange-600" />
          </div>
          <span className="text-[10px] tracking-tight font-medium">Menu</span>
        </button>
      </div>
    </nav>
  );
};
