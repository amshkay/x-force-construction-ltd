/**
 * Business Settings Service
 * Module 04: Centralized Business Settings & System Configuration
 *
 * Strictly single-business design for XFORCE Construction Ltd / X-FORCE BRICKS.
 * Interacts with the singleton record ('current_business') in `business_settings`.
 */

import {
  FullBusinessSettings,
  PublicBusinessSettings,
  FeatureTogglesConfig,
  RegionalSettings,
  NumberingSettings,
} from '../types/business';
import {
  defaultFullBusinessSettings,
  getPublicProjection,
} from '../config/business.config';
import { getSupabaseClient, isNetworkOrFetchError, markRemoteDbUnavailable } from '../lib/supabase/client';
import { appConfig } from '../config/app.config';
import { localStore } from '../lib/storage/localStorage';
import { auditService } from './audit.service';

const SETTINGS_LOCAL_STORAGE_KEY = 'xforce_business_settings_v4';
const SETTINGS_CACHE_TTL_MS = 60 * 1000; // 1 minute memory cache

type SettingsChangeListener = (settings: FullBusinessSettings) => void;

export class BusinessSettingsService {
  private cachedSettings: FullBusinessSettings | null = null;
  private lastFetchedAt: number = 0;
  private listeners: Set<SettingsChangeListener> = new Set();
  private isFetching: boolean = false;
  private isRemoteTableAvailable: boolean = true;
  private warnedAboutMissingTable: boolean = false;

  constructor() {
    // Initialize cache from local storage if available for instant UI boot
    const stored = localStore.get<FullBusinessSettings | null>(
      SETTINGS_LOCAL_STORAGE_KEY,
      null
    );
    if (stored) {
      this.cachedSettings = this.mergeWithDefaults(stored);
    } else {
      this.cachedSettings = defaultFullBusinessSettings;
    }

    if (typeof window !== 'undefined') {
      // Synchronize changes across multiple browser tabs
      window.addEventListener('storage', (e) => {
        if (e.key === SETTINGS_LOCAL_STORAGE_KEY && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            const merged = this.mergeWithDefaults(parsed);
            this.cachedSettings = merged;
            this.lastFetchedAt = Date.now();
            this.notifyListeners(merged);
          } catch {
            // ignore JSON parse error
          }
        }
      });

      // Synchronize internal custom events within the same tab
      window.addEventListener('xforce-settings-updated', ((e: CustomEvent) => {
        if (e.detail) {
          const merged = this.mergeWithDefaults(e.detail);
          this.cachedSettings = merged;
          this.lastFetchedAt = Date.now();
          this.notifyListeners(merged);
        }
      }) as EventListener);
    }
  }

  /**
   * Helper to detect if a database error is due to missing schema / unmigrated table
   */
  private isTableMissingError(error: any): boolean {
    if (!error) return false;
    if (isNetworkOrFetchError(error)) {
      markRemoteDbUnavailable(error);
      return true;
    }
    const msg = typeof error.message === 'string' ? error.message : '';
    const code = error.code;
    return (
      code === 'PGRST205' ||
      code === '42P01' ||
      msg.includes('in the schema cache') ||
      msg.includes('Could not find the table') ||
      msg.includes('relation "business_settings" does not exist') ||
      msg.includes('relation "public.business_settings" does not exist')
    );
  }

  /**
   * Status check for whether the remote table is available
   */
  public isDatabaseTableAvailable(): boolean {
    return this.isRemoteTableAvailable;
  }

  /**
   * Subscribe to business settings modifications
   */
  public subscribe(listener: SettingsChangeListener): () => void {
    this.listeners.add(listener);
    // Immediately emit current cached state if present
    if (this.cachedSettings) {
      try {
        listener(this.cachedSettings);
      } catch (err) {
        console.error('[Settings] Listener notification failed:', err);
      }
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(settings: FullBusinessSettings): void {
    this.listeners.forEach((listener) => {
      try {
        listener(settings);
      } catch (err) {
        console.error('[Settings] Listener execution error:', err);
      }
    });
  }

  /**
   * Safe deep merge of database/storage record with defaults to prevent null dereferences
   */
  private mergeWithDefaults(partial: Partial<FullBusinessSettings>): FullBusinessSettings {
    const d = defaultFullBusinessSettings;

    return {
      id: 'current_business',
      companyName: partial.companyName || d.companyName,
      publicBrandName: partial.publicBrandName || d.publicBrandName,
      shortName: partial.shortName || d.shortName,
      slogan: partial.slogan !== undefined && partial.slogan !== null ? partial.slogan : d.slogan,
      businessDescription: partial.businessDescription || d.businessDescription,
      businessCategory: partial.businessCategory || d.businessCategory,
      tinNumber: partial.tinNumber !== undefined && partial.tinNumber !== null ? partial.tinNumber : d.tinNumber,
      contactEmail: partial.contactEmail || d.contactEmail,
      contactPhone: partial.contactPhone || d.contactPhone,
      secondaryPhone: partial.secondaryPhone !== undefined ? partial.secondaryPhone : d.secondaryPhone,
      whatsappNumber: partial.whatsappNumber || d.whatsappNumber,
      websiteUrl: partial.websiteUrl || d.websiteUrl,
      address: {
        ...d.address,
        ...(partial.address || {}),
      },
      location: {
        ...d.location,
        ...(partial.location || {}),
      },
      socialLinks: {
        ...d.socialLinks,
        ...(partial.socialLinks || {}),
      },
      branding: {
        ...d.branding,
        ...(partial.branding || {}),
      },
      websiteContent: {
        ...d.websiteContent,
        ...(partial.websiteContent || {}),
      },
      regional: {
        ...d.regional,
        ...(partial.regional || {}),
      },
      operatingHours: {
        ...d.operatingHours,
        ...(partial.operatingHours || {}),
      },
      numbering: {
        ...d.numbering,
        ...(partial.numbering || {}),
      },
      paymentMethods: Array.isArray(partial.paymentMethods) && partial.paymentMethods.length > 0
        ? partial.paymentMethods
        : d.paymentMethods,
      features: {
        ...d.features,
        ...(partial.features || {}),
      },
      supportedMaterialCategories: Array.isArray(partial.supportedMaterialCategories) && partial.supportedMaterialCategories.length > 0
        ? partial.supportedMaterialCategories
        : d.supportedMaterialCategories,
      version: typeof partial.version === 'number' ? partial.version : d.version,
      updatedAt: partial.updatedAt || new Date().toISOString(),
      createdAt: partial.createdAt || d.createdAt,
    };
  }

  /**
   * Converts database snake_case row into structured FullBusinessSettings
   */
  private mapDbRowToSettings(row: any): FullBusinessSettings {
    const d = defaultFullBusinessSettings;

    const address = typeof row.address === 'object' && row.address ? row.address : d.address;
    const location: any = {
      latitude: row.gps_latitude !== null && row.gps_latitude !== undefined ? Number(row.gps_latitude) : d.location.latitude,
      longitude: row.gps_longitude !== null && row.gps_longitude !== undefined ? Number(row.gps_longitude) : d.location.longitude,
      locationDescription: row.location_description || d.location.locationDescription,
      mapLinkUrl: row.map_link_url || d.location.mapLinkUrl,
    };
    const socialLinks = typeof row.social_links === 'object' && row.social_links ? row.social_links : d.socialLinks;
    const operatingHours = typeof row.operating_hours === 'object' && row.operating_hours ? row.operating_hours : d.operatingHours;
    const features = typeof row.features === 'object' && row.features ? row.features : d.features;
    const regional = typeof row.regional_settings === 'object' && row.regional_settings ? row.regional_settings : {
      ...d.regional,
      currencyCode: row.currency_code || d.regional.currencyCode,
      currencySymbol: row.currency_symbol || d.regional.currencySymbol,
      countryCode: row.country_code || d.regional.countryCode,
    };
    const numbering = typeof row.numbering_settings === 'object' && row.numbering_settings ? row.numbering_settings : {
      defaultCustomerPrefix: row.default_customer_prefix || d.numbering.defaultCustomerPrefix,
      defaultRequestPrefix: row.default_request_prefix || d.numbering.defaultRequestPrefix,
      defaultQuotationPrefix: row.default_quotation_prefix || d.numbering.defaultQuotationPrefix,
      defaultOrderPrefix: row.default_order_prefix || d.numbering.defaultOrderPrefix,
      defaultTrackingPrefix: row.default_tracking_prefix || d.numbering.defaultTrackingPrefix,
      defaultPaymentPrefix: row.default_payment_prefix || d.numbering.defaultPaymentPrefix,
      defaultInvoicePrefix: row.default_invoice_prefix || d.numbering.defaultInvoicePrefix,
    };
    const branding = typeof row.branding === 'object' && row.branding ? row.branding : {
      logoUrl: row.logo_url ?? d.branding.logoUrl,
      faviconUrl: row.favicon_url ?? d.branding.faviconUrl,
      primaryBrandColor: row.primary_brand_color || d.branding.primaryBrandColor,
      secondaryBrandColor: row.secondary_brand_color || d.branding.secondaryBrandColor,
      accentBrandColor: row.accent_brand_color || d.branding.accentBrandColor,
    };
    const heroImageFromImages = Array.isArray(row.hero_images) && row.hero_images.length > 0 ? row.hero_images[0] : null;
    const secondaryHeroFromImages = Array.isArray(row.hero_images) && row.hero_images.length > 1 ? row.hero_images[1] : null;

    const rawWebsite = typeof row.website_content === 'object' && row.website_content ? row.website_content : {};
    const websiteContent = {
      ...d.websiteContent,
      ...rawWebsite,
      heroHeading: rawWebsite.heroHeading || row.hero_text || d.websiteContent.heroHeading,
      heroImageUrl: rawWebsite.heroImageUrl || heroImageFromImages || d.websiteContent.heroImageUrl,
      secondaryHeroImageUrl: rawWebsite.secondaryHeroImageUrl || secondaryHeroFromImages || d.websiteContent.secondaryHeroImageUrl,
    };
    const paymentMethods = Array.isArray(row.payment_methods) ? row.payment_methods : d.paymentMethods;

    return this.mergeWithDefaults({
      id: 'current_business',
      companyName: row.company_name || d.companyName,
      publicBrandName: row.public_brand_name || d.publicBrandName,
      shortName: row.short_name || d.shortName,
      slogan: row.slogan ?? d.slogan,
      businessDescription: row.business_description || d.businessDescription,
      businessCategory: row.business_category || d.businessCategory,
      tinNumber: row.tin_number ?? d.tinNumber,
      contactEmail: row.contact_email || d.contactEmail,
      contactPhone: row.contact_phone || d.contactPhone,
      secondaryPhone: row.secondary_phone || d.secondaryPhone,
      whatsappNumber: row.whatsapp_number || d.whatsappNumber,
      websiteUrl: row.website_url || d.websiteUrl,
      address,
      location,
      socialLinks,
      branding,
      websiteContent,
      regional,
      operatingHours,
      numbering,
      paymentMethods,
      features,
      supportedMaterialCategories: Array.isArray(row.supported_categories) ? row.supported_categories : d.supportedMaterialCategories,
      version: row.version || 1,
      updatedAt: row.updated_at || new Date().toISOString(),
      createdAt: row.created_at || d.createdAt,
    });
  }

  /**
   * Serializes FullBusinessSettings into database columns for `business_settings`
   */
  private mapSettingsToDbRow(settings: FullBusinessSettings): Record<string, any> {
    return {
      id: 'current_business',
      company_name: settings.companyName,
      public_brand_name: settings.publicBrandName,
      short_name: settings.shortName,
      slogan: settings.slogan,
      business_description: settings.businessDescription,
      business_category: settings.businessCategory,
      tin_number: settings.tinNumber,
      logo_url: settings.branding.logoUrl,
      favicon_url: settings.branding.faviconUrl,
      primary_brand_color: settings.branding.primaryBrandColor,
      secondary_brand_color: settings.branding.secondaryBrandColor,
      accent_brand_color: settings.branding.accentBrandColor,
      currency_code: settings.regional.currencyCode,
      currency_symbol: settings.regional.currencySymbol,
      country_code: settings.regional.countryCode,
      contact_email: settings.contactEmail,
      contact_phone: settings.contactPhone,
      secondary_phone: settings.secondaryPhone,
      whatsapp_number: settings.whatsappNumber,
      website_url: settings.websiteUrl,
      address: settings.address,
      gps_latitude: settings.location.latitude,
      gps_longitude: settings.location.longitude,
      location_description: settings.location.locationDescription,
      map_link_url: settings.location.mapLinkUrl,
      social_links: settings.socialLinks,
      operating_hours: settings.operatingHours,
      hero_text: settings.websiteContent.heroHeading,
      hero_images: [
        settings.websiteContent?.heroImageUrl,
        settings.websiteContent?.secondaryHeroImageUrl,
      ].filter(Boolean),
      website_content: settings.websiteContent,
      branding: settings.branding,
      regional_settings: settings.regional,
      numbering_settings: settings.numbering,
      payment_methods: settings.paymentMethods,
      default_customer_prefix: settings.numbering.defaultCustomerPrefix,
      default_request_prefix: settings.numbering.defaultRequestPrefix,
      default_quotation_prefix: settings.numbering.defaultQuotationPrefix,
      default_order_prefix: settings.numbering.defaultOrderPrefix,
      default_tracking_prefix: settings.numbering.defaultTrackingPrefix,
      default_payment_prefix: settings.numbering.defaultPaymentPrefix,
      default_invoice_prefix: settings.numbering.defaultInvoicePrefix,
      features: settings.features,
      supported_categories: settings.supportedMaterialCategories,
      version: settings.version + 1,
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Retrieves the full Master Business Settings
   * Leverages multi-tier caching (Memory -> LocalStorage -> Supabase)
   */
  public async getBusinessSettings(forceRefresh = false): Promise<FullBusinessSettings> {
    const now = Date.now();

    if (
      !forceRefresh &&
      this.cachedSettings &&
      now - this.lastFetchedAt < SETTINGS_CACHE_TTL_MS
    ) {
      return this.cachedSettings;
    }

    // If Supabase is not configured or table is known to be missing, rely on local storage / defaults
    if (!appConfig.supabase.isConfigured || (!forceRefresh && !this.isRemoteTableAvailable)) {
      const stored = localStore.get<FullBusinessSettings | null>(
        SETTINGS_LOCAL_STORAGE_KEY,
        null
      );
      const settings = stored ? this.mergeWithDefaults(stored) : (this.cachedSettings || defaultFullBusinessSettings);
      this.cachedSettings = settings;
      this.lastFetchedAt = now;
      return settings;
    }

    try {
      this.isFetching = true;
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .eq('id', 'current_business')
        .maybeSingle();

      if (error) {
        this.lastFetchedAt = now;
        if (this.isTableMissingError(error)) {
          this.isRemoteTableAvailable = false;
          if (!this.warnedAboutMissingTable) {
            console.info(
              '[Settings] Database table "business_settings" is not yet available in the schema cache. Operating seamlessly with local-first configuration.'
            );
            this.warnedAboutMissingTable = true;
          }
        } else {
          console.warn('[Settings] Failed to fetch settings from database:', error.message);
        }

        // Fall back to cached or local storage
        if (this.cachedSettings) return this.cachedSettings;
        const stored = localStore.get<FullBusinessSettings | null>(SETTINGS_LOCAL_STORAGE_KEY, null);
        const fallback = stored ? this.mergeWithDefaults(stored) : defaultFullBusinessSettings;
        this.cachedSettings = fallback;
        return fallback;
      }

      // Query succeeded, table is confirmed available
      this.isRemoteTableAvailable = true;

      if (!data) {
        // Record does not exist yet; initialize it
        console.info('[Settings] No settings record found in database. Seeding defaults.');
        await this.initializeSingletonSettings();
        this.cachedSettings = defaultFullBusinessSettings;
        this.lastFetchedAt = now;
        return defaultFullBusinessSettings;
      }

      const settings = this.mapDbRowToSettings(data);
      this.cachedSettings = settings;
      this.lastFetchedAt = now;
      localStore.set(SETTINGS_LOCAL_STORAGE_KEY, settings);
      return settings;
    } catch (err: any) {
      this.lastFetchedAt = now;
      if (this.isTableMissingError(err)) {
        this.isRemoteTableAvailable = false;
      } else {
        console.warn('[Settings] Unexpected exception reading settings:', err?.message || err);
      }
      if (this.cachedSettings) return this.cachedSettings;
      const stored = localStore.get<FullBusinessSettings | null>(SETTINGS_LOCAL_STORAGE_KEY, null);
      const fallback = stored ? this.mergeWithDefaults(stored) : defaultFullBusinessSettings;
      this.cachedSettings = fallback;
      return fallback;
    } finally {
      this.isFetching = false;
    }
  }

  public getFullSettings(): FullBusinessSettings {
    return this.cachedSettings || defaultFullBusinessSettings;
  }

  /**
   * Retrieves strictly public-safe settings projection for client portals and anonymous visitors
   */
  public async getPublicBusinessSettings(forceRefresh = false): Promise<PublicBusinessSettings> {
    const full = await this.getBusinessSettings(forceRefresh);
    return getPublicProjection(full);
  }

  /**
   * Updates Business Settings with Concurrency Checking and Audit Logging
   */
  public async updateBusinessSettings(
    updates: Partial<FullBusinessSettings>,
    adminUserId: string,
    changeReason?: string
  ): Promise<FullBusinessSettings> {
    const current = await this.getBusinessSettings();

    // Prepare merged updated record
    const updatedRecord: FullBusinessSettings = this.mergeWithDefaults({
      ...current,
      ...updates,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    });

    // 1. Optimistically update memory and localStorage
    this.cachedSettings = updatedRecord;
    this.lastFetchedAt = Date.now();
    localStore.set(SETTINGS_LOCAL_STORAGE_KEY, updatedRecord);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('xforce-settings-updated', { detail: updatedRecord }));
    }

    // 2. Persist to Supabase if configured and table is available
    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const supabase = getSupabaseClient();
        const dbPayload = this.mapSettingsToDbRow(updatedRecord);

        const { error } = await supabase
          .from('business_settings')
          .upsert(dbPayload, { onConflict: 'id' });

        if (error) {
          if (this.isTableMissingError(error)) {
            this.isRemoteTableAvailable = false;
            console.info(
              '[Settings] Remote table "business_settings" is not yet available; settings persisted successfully to local offline storage.'
            );
          } else {
            console.error('[Settings] Database update error:', error.message);
            throw new Error(`Failed to save settings: ${error.message}`);
          }
        }
      } catch (err: any) {
        if (this.isTableMissingError(err)) {
          this.isRemoteTableAvailable = false;
          console.info(
            '[Settings] Remote table "business_settings" not yet created; settings persisted locally.'
          );
        } else {
          console.error('[Settings] Supabase persist exception:', err);
          throw err;
        }
      }
    }

    // 3. Record structured audit log
    try {
      await auditService.logEvent({
        action: 'settings.update',
        entity_type: 'business_settings',
        entity_id: 'current_business',
        user_id: adminUserId,
        reason: changeReason || 'Admin updated business configuration',
        old_values: {
          companyName: current.companyName,
          publicBrandName: current.publicBrandName,
          currency: current.regional.currencyCode,
          features: current.features,
          version: current.version,
        },
        new_values: {
          companyName: updatedRecord.companyName,
          publicBrandName: updatedRecord.publicBrandName,
          currency: updatedRecord.regional.currencyCode,
          features: updatedRecord.features,
          version: updatedRecord.version,
        },
      });
    } catch (auditErr) {
      console.warn('[Settings] Failed to record audit log:', auditErr);
    }

    // 4. Notify all reactive subscribers
    this.notifyListeners(updatedRecord);

    return updatedRecord;
  }

  /**
   * Resets Business Settings back to default system values
   */
  public async resetToDefaults(
    adminUserId: string,
    reason = 'Reset business settings to factory defaults'
  ): Promise<FullBusinessSettings> {
    const current = await this.getBusinessSettings();
    const resetRecord: FullBusinessSettings = {
      ...defaultFullBusinessSettings,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    };

    this.cachedSettings = resetRecord;
    this.lastFetchedAt = Date.now();
    localStore.set(SETTINGS_LOCAL_STORAGE_KEY, resetRecord);

    if (appConfig.supabase.isConfigured && this.isRemoteTableAvailable) {
      try {
        const supabase = getSupabaseClient();
        const dbPayload = this.mapSettingsToDbRow(resetRecord);
        const { error } = await supabase.from('business_settings').upsert(dbPayload, { onConflict: 'id' });
        if (error && this.isTableMissingError(error)) {
          this.isRemoteTableAvailable = false;
        }
      } catch (err: any) {
        if (this.isTableMissingError(err)) {
          this.isRemoteTableAvailable = false;
        }
      }
    }

    await auditService.logEvent({
      action: 'settings.reset_defaults',
      entity_type: 'business_settings',
      entity_id: 'current_business',
      user_id: adminUserId,
      reason,
      old_values: { version: current.version },
      new_values: { version: resetRecord.version },
    });

    this.notifyListeners(resetRecord);
    return resetRecord;
  }

  /**
   * Quick Feature Toggle Query Helper
   */
  public async isFeatureEnabled(featureKey: keyof FeatureTogglesConfig): Promise<boolean> {
    const settings = await this.getBusinessSettings();
    return Boolean(settings.features[featureKey]);
  }

  public async getFeatureSettings(): Promise<FeatureTogglesConfig> {
    const settings = await this.getBusinessSettings();
    return settings.features;
  }

  public async getRegionalSettings(): Promise<RegionalSettings> {
    const settings = await this.getBusinessSettings();
    return settings.regional;
  }

  public async getNumberingSettings(): Promise<NumberingSettings> {
    const settings = await this.getBusinessSettings();
    return settings.numbering;
  }

  /**
   * Internal bootstrap initialization helper
   */
  private async initializeSingletonSettings(): Promise<void> {
    if (!appConfig.supabase.isConfigured || !this.isRemoteTableAvailable) return;
    try {
      const supabase = getSupabaseClient();
      const payload = this.mapSettingsToDbRow(defaultFullBusinessSettings);
      const { error } = await supabase.from('business_settings').upsert(payload, { onConflict: 'id' });
      if (error && this.isTableMissingError(error)) {
        this.isRemoteTableAvailable = false;
      }
    } catch (err: any) {
      if (this.isTableMissingError(err)) {
        this.isRemoteTableAvailable = false;
      } else {
        console.warn('[Settings] Failed to seed initial business settings:', err);
      }
    }
  }
}

export const businessSettingsService = new BusinessSettingsService();
export const settingsService = businessSettingsService;
