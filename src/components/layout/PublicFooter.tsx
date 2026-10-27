import React from 'react';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';
import { useBusinessSettings } from '../../hooks/useBusinessSettings';

export interface PublicFooterProps {
  onRouteChange?: (route: string) => void;
}

export const PublicFooter: React.FC<PublicFooterProps> = ({ onRouteChange }) => {
  const currentYear = new Date().getFullYear();
  const { publicSettings } = useBusinessSettings();

  return (
    <footer
      id="public-footer"
      className="border-t border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 transition-colors"
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand Col */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {publicSettings.branding.logoUrl ? (
                <img
                  src={publicSettings.branding.logoUrl}
                  alt={publicSettings.publicBrandName}
                  className="h-8 w-auto max-w-[120px] object-contain rounded"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 font-bold text-white">
                  {publicSettings.shortName ? publicSettings.shortName.charAt(0) : 'X'}
                </div>
              )}
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {publicSettings.publicBrandName}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {publicSettings.slogan}. High-strength interlocking bricks, paving blocks, and professional installation.
            </p>
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase">
              Operated by {publicSettings.legalName}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
              Explore & Services
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => onRouteChange && onRouteChange('/products')}
                  className="hover:text-orange-600 dark:hover:text-orange-400 transition"
                >
                  Interlocking Products & Pavers
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onRouteChange && onRouteChange('/designs')}
                  className="hover:text-orange-600 dark:hover:text-orange-400 transition"
                >
                  Bonding Patterns & Designs
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onRouteChange && onRouteChange('/projects')}
                  className="hover:text-orange-600 dark:hover:text-orange-400 transition"
                >
                  Engineering Showcase & Sites
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onRouteChange && onRouteChange('/services')}
                  className="hover:text-orange-600 dark:hover:text-orange-400 transition"
                >
                  Turnkey Installation Scope
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onRouteChange && onRouteChange('/track')}
                  className="hover:text-orange-600 dark:hover:text-orange-400 font-medium transition"
                >
                  Track Request or Order Status
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
              Contact & Factory
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-orange-600 mt-0.5" />
                <span>
                  {publicSettings.contact.address.street},{' '}
                  {publicSettings.contact.address.city},{' '}
                  {publicSettings.contact.address.state}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-orange-600" />
                <span>{publicSettings.contact.phone}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-orange-600" />
                <span>{publicSettings.contact.email}</span>
              </li>
              <li className="pt-1">
                <button
                  type="button"
                  onClick={() => onRouteChange && onRouteChange('/request')}
                  className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline"
                >
                  Submit Instant Quotation Request →
                </button>
              </li>
            </ul>
          </div>

          {/* Operating Hours */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
              Operating Hours
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>Mon – Fri: {publicSettings.operatingHoursFormatted.weekdays}</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>Saturday: {publicSettings.operatingHoursFormatted.saturdays}</span>
              </li>
              <li className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>Sunday: {publicSettings.operatingHoursFormatted.sundays}</span>
              </li>
              <li className="pt-2">
                <button
                  type="button"
                  onClick={() => onRouteChange && onRouteChange('/customer/login')}
                  className="rounded bg-slate-200 dark:bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-orange-600 hover:text-white transition"
                >
                  Customer Account Portal
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200 dark:border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <p>© {currentYear} {publicSettings.legalName}. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <button type="button" onClick={() => onRouteChange && onRouteChange('/about')} className="hover:underline">About Company</button>
            <span>•</span>
            <button type="button" onClick={() => onRouteChange && onRouteChange('/contact')} className="hover:underline">Contact Desk</button>
            <span>•</span>
            <button type="button" onClick={() => onRouteChange && onRouteChange('/auth/login')} className="hover:underline">Staff Login</button>
          </div>
        </div>
      </div>
    </footer>
  );
};
