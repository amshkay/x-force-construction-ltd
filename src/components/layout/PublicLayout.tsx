import React from 'react';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { PublicSeoHead } from '../public/PublicSeoHead';
import { OfflineIndicator } from '../../pwa/OfflineIndicator';

interface PublicLayoutProps {
  children: React.ReactNode;
  currentRoute?: string;
  onRouteChange?: (route: string) => void;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({
  children,
  currentRoute = '/',
  onRouteChange,
}) => {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100 transition-colors">
      <PublicSeoHead currentRoute={currentRoute} />
      <PublicHeader currentRoute={currentRoute} onRouteChange={onRouteChange} />
      <main className="flex-1">{children}</main>
      <PublicFooter onRouteChange={onRouteChange} />
      <OfflineIndicator />
    </div>
  );
};
