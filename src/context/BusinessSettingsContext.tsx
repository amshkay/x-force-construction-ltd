/**
 * Business Settings React Context
 * Module 04: Centralized Business Settings & Configuration
 *
 * Provides reactive access to business settings across all components,
 * guarantees zero null dereferences with default fallbacks, and synchronizes
 * document title and meta description dynamically.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  FullBusinessSettings,
  PublicBusinessSettings,
  FeatureTogglesConfig,
} from '../types/business';
import {
  defaultFullBusinessSettings,
  defaultPublicBusinessSettings,
  getPublicProjection,
} from '../config/business.config';
import { businessSettingsService } from '../services/settings.service';
import { formatCurrency as formatCurrencyUtil, formatDate as formatDateUtil } from '../utils/formatters';
import { getWhatsAppUrl as getWhatsAppUrlUtil } from '../utils/whatsapp';
import { useAuth } from '../hooks/useAuth';

export interface BusinessSettingsContextType {
  settings: FullBusinessSettings;
  publicSettings: PublicBusinessSettings;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  updateSettings: (updates: Partial<FullBusinessSettings>, reason?: string) => Promise<boolean>;
  resetToDefaults: (reason?: string) => Promise<boolean>;
  refreshSettings: () => Promise<void>;
  isFeatureEnabled: (featureKey: keyof FeatureTogglesConfig) => boolean;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string | number | Date, format?: 'short' | 'medium' | 'long' | 'time') => string;
  getWhatsAppUrl: (customMessage?: string) => string;
}

const BusinessSettingsContext = createContext<BusinessSettingsContextType | undefined>(undefined);

export interface BusinessSettingsProviderProps {
  children: React.ReactNode;
}

export const BusinessSettingsProvider: React.FC<BusinessSettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<FullBusinessSettings>(defaultFullBusinessSettings);
  const [publicSettings, setPublicSettings] = useState<PublicBusinessSettings>(defaultPublicBusinessSettings);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { currentUser } = useAuth();
  const currentUserId = currentUser?.id || 'system-admin';

  // Load and subscribe to changes
  useEffect(() => {
    let isMounted = true;

    async function loadInitial() {
      try {
        setIsLoading(true);
        const data = await businessSettingsService.getBusinessSettings();
        if (isMounted) {
          setSettings(data);
          setPublicSettings(getPublicProjection(data));
          setError(null);
        }
      } catch (err: any) {
        console.warn('[SettingsContext] Failed to load settings:', err);
        if (isMounted) {
          setError(err.message || 'Failed to load business settings');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitial();

    // Subscribe to background/cross-tab updates
    const unsubscribe = businessSettingsService.subscribe((updated) => {
      if (isMounted) {
        setSettings(updated);
        setPublicSettings(getPublicProjection(updated));
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Synchronize document <title> and meta tags dynamically
  useEffect(() => {
    if (typeof document !== 'undefined' && publicSettings) {
      const siteTitle = publicSettings.websiteContent.websiteTitle || `${publicSettings.publicBrandName} | High-Strength Interlocking Bricks`;
      document.title = siteTitle;

      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      if (publicSettings.websiteContent.metaDescription) {
        metaDesc.setAttribute('content', publicSettings.websiteContent.metaDescription);
      }

      // Sync brand color theme-color if present
      let metaTheme = document.querySelector('meta[name="theme-color"]');
      if (!metaTheme && publicSettings.branding.primaryBrandColor) {
        metaTheme = document.createElement('meta');
        metaTheme.setAttribute('name', 'theme-color');
        document.head.appendChild(metaTheme);
      }
      if (metaTheme && publicSettings.branding.primaryBrandColor) {
        metaTheme.setAttribute('content', publicSettings.branding.primaryBrandColor);
      }
    }
  }, [publicSettings]);

  const refreshSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await businessSettingsService.getBusinessSettings(true);
      setSettings(data);
      setPublicSettings(getPublicProjection(data));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSettings = useCallback(
    async (updates: Partial<FullBusinessSettings>, reason?: string): Promise<boolean> => {
      setIsSaving(true);
      setError(null);
      try {
        const updated = await businessSettingsService.updateBusinessSettings(
          updates,
          currentUserId,
          reason
        );
        setSettings(updated);
        setPublicSettings(getPublicProjection(updated));
        return true;
      } catch (err: any) {
        console.error('[SettingsContext] Save failed:', err);
        setError(err.message || 'Failed to save business settings');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [currentUserId]
  );

  const resetToDefaults = useCallback(
    async (reason?: string): Promise<boolean> => {
      setIsSaving(true);
      setError(null);
      try {
        const reset = await businessSettingsService.resetToDefaults(currentUserId, reason);
        setSettings(reset);
        setPublicSettings(getPublicProjection(reset));
        return true;
      } catch (err: any) {
        setError(err.message || 'Failed to reset settings');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [currentUserId]
  );

  const isFeatureEnabled = useCallback(
    (featureKey: keyof FeatureTogglesConfig): boolean => {
      return Boolean(settings.features && settings.features[featureKey]);
    },
    [settings.features]
  );

  const formatCurrency = useCallback(
    (amount: number): string => {
      return formatCurrencyUtil(amount, settings.regional);
    },
    [settings.regional]
  );

  const formatDate = useCallback(
    (date: string | number | Date, format: 'short' | 'medium' | 'long' | 'time' = 'medium'): string => {
      return formatDateUtil(date, format, settings.regional.defaultLocale, settings.regional.timezone);
    },
    [settings.regional.defaultLocale, settings.regional.timezone]
  );

  const getWhatsAppUrl = useCallback(
    (customMessage?: string): string => {
      return getWhatsAppUrlUtil(settings.whatsappNumber, customMessage);
    },
    [settings.whatsappNumber]
  );

  return (
    <BusinessSettingsContext.Provider
      value={{
        settings,
        publicSettings,
        isLoading,
        isSaving,
        error,
        updateSettings,
        resetToDefaults,
        refreshSettings,
        isFeatureEnabled,
        formatCurrency,
        formatDate,
        getWhatsAppUrl,
      }}
    >
      {children}
    </BusinessSettingsContext.Provider>
  );
};

export function useBusinessSettings(): BusinessSettingsContextType {
  const context = useContext(BusinessSettingsContext);
  if (!context) {
    throw new Error('useBusinessSettings must be used within a BusinessSettingsProvider');
  }
  return context;
}
