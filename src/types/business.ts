/**
 * Business Configuration & Identity Types
 * Centralizes all enterprise metadata so that no company-specific data
 * is hardcoded throughout the application.
 *
 * Module 04: Business Settings & Configuration
 * Strictly single-business design for XFORCE Construction Ltd / X-FORCE BRICKS.
 */

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface DaySchedule {
  isOpen: boolean;
  openTime: string; // e.g. '08:00'
  closeTime: string; // e.g. '17:30'
}

export type BusinessHoursSchedule = Record<DayOfWeek, DaySchedule>;

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
}

export interface GpsCoordinates {
  latitude: number | null;
  longitude: number | null;
  locationDescription?: string;
  mapLinkUrl?: string;
}

export interface SocialLinks {
  whatsapp?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  twitter?: string;
  youtube?: string;
  tiktok?: string;
}

export interface CurrencyConfig {
  code: string; // e.g. 'NGN', 'USD'
  symbol: string; // e.g. '₦', '$'
  name: string;
  decimals: number;
}

export interface RegionalSettings {
  currencyCode: string; // e.g. 'NGN'
  currencySymbol: string; // e.g. '₦'
  currencyPosition: 'before' | 'after';
  decimalPlaces: number;
  thousandsSeparator: string;
  decimalSeparator: string;
  countryCode: string; // e.g. 'NG'
  countryName: string; // e.g. 'Nigeria'
  defaultLocale: string; // e.g. 'en-NG'
  timezone: string; // e.g. 'Africa/Lagos'
}

export interface NumberingSettings {
  defaultCustomerPrefix: string; // e.g. 'XFC'
  defaultRequestPrefix: string; // e.g. 'XFR'
  defaultQuotationPrefix: string; // e.g. 'XFQ'
  defaultOrderPrefix: string; // e.g. 'XFO'
  defaultTrackingPrefix: string; // e.g. 'XFT'
  defaultPaymentPrefix: string; // e.g. 'XFP'
  defaultInvoicePrefix: string; // e.g. 'XFI'
  defaultStockCountPrefix?: string; // e.g. 'STC'
  defaultPosSalePrefix?: string; // e.g. 'POS'
  defaultFulfilmentPrefix?: string; // e.g. 'FUL'
  defaultWarehouseTaskPrefix?: string; // e.g. 'TSK'
  defaultWaybillPrefix?: string; // e.g. 'WAY'
  defaultServicePrefix?: string; // e.g. 'SRV'
  defaultServiceProviderPrefix?: string; // e.g. 'SPV'
  defaultStaffPrefix?: string; // e.g. 'STF'
  defaultSupplierPrefix?: string; // e.g. 'SUP'
  defaultExpensePrefix?: string; // e.g. 'EXP'
}

export interface BankAccountDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  sortCode?: string;
  swiftBic?: string;
}

export interface PaymentMethodConfig {
  id: string;
  code: 'cash' | 'bank_transfer' | 'pos' | 'card' | 'ussd' | 'paystack';
  name: string;
  description: string;
  isEnabled: boolean;
  instructions?: string;
  bankDetails?: BankAccountDetails;
}

export interface FeatureTogglesConfig {
  productSales: boolean;
  customerRequests: boolean;
  quotations: boolean;
  delivery: boolean;
  posOfflineTransactions: boolean;
  inventory: boolean;
  installationsEnabled: boolean;
  serviceProviders: boolean;
  customerTracking: boolean;
  publicWebsite: boolean;
  whatsappContact: boolean;
  onlinePayments: boolean;
  customerAccounts: boolean;
}

export interface BrandingSettings {
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryBrandColor: string; // Hex color e.g. '#ea580c'
  secondaryBrandColor: string; // Hex color e.g. '#0f172a'
  accentBrandColor: string; // Hex color e.g. '#f97316'
}

export interface PublicWebsiteContentSettings {
  websiteTitle: string;
  metaDescription: string;
  publicSlogan: string;
  heroHeading: string;
  heroSubheading: string;
  heroImageUrl: string | null;
  secondaryHeroImageUrl: string | null;
  homepageIntro: string;
  aboutDescription: string;
  publicContactText: string;
  footerText: string;
  isPublicVisible: boolean;
}

/**
 * Full unified business settings model (stored in database singleton)
 */
export interface FullBusinessSettings {
  id: string; // 'current_business'

  // Business Identity
  companyName: string;
  publicBrandName: string;
  shortName: string;
  slogan: string;
  businessDescription: string;
  businessCategory: string;
  tinNumber: string;

  // Contact Information
  contactEmail: string;
  contactPhone: string;
  secondaryPhone: string;
  whatsappNumber: string;
  websiteUrl: string;
  address: Address;
  location: GpsCoordinates;
  socialLinks: SocialLinks;

  // Branding & Media
  branding: BrandingSettings;

  // Public Website Settings
  websiteContent: PublicWebsiteContentSettings;

  // Currency & Regional Settings
  regional: RegionalSettings;

  // Business Hours
  operatingHours: BusinessHoursSchedule;

  // Numbering Settings
  numbering: NumberingSettings;

  // Payment Methods
  paymentMethods: PaymentMethodConfig[];

  // Feature Toggles
  features: FeatureTogglesConfig;

  // Material Categories supported by X-FORCE
  supportedMaterialCategories: string[];

  // Concurrency & Metadata
  version: number;
  updatedAt: string;
  createdAt: string;
}

/**
 * Public Safe Projection
 * Strips internal operational and numbering configurations before exposing to public unauthenticated callers.
 */
export interface PublicBusinessSettings {
  companyName: string;
  legalName: string;
  publicBrandName: string;
  shortName: string;
  slogan: string;
  businessDescription: string;
  description: string;
  businessCategory: string;
  tinNumber?: string | null;
  branding: BrandingSettings;
  contactEmail: string;
  contactPhone: string;
  secondaryPhone?: string;
  whatsappNumber: string;
  websiteUrl: string;
  address: Address;
  location: GpsCoordinates;
  socialLinks: SocialLinks;
  operatingHours: BusinessHoursSchedule;
  operatingHoursFormatted: {
    weekdays: string;
    saturdays: string;
    sundays: string;
  };
  contact: {
    email: string;
    phone: string;
    secondaryPhone?: string;
    whatsapp: string;
    address: Address;
  };
  websiteContent: PublicWebsiteContentSettings;
  currency: {
    code: string;
    symbol: string;
    position: 'before' | 'after';
  };
  features: {
    installationsEnabled: boolean;
    customerTracking: boolean;
    whatsappContact: boolean;
    customerRequests: boolean;
    productSales: boolean;
  };
  supportedMaterialCategories: string[];
}

/**
 * Legacy interface for backward compatibility with Modules 00-03
 */
export interface ContactInfo {
  email: string;
  phone: string;
  alternatePhone?: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string;
  };
  socialLinks?: {
    whatsapp?: string;
    instagram?: string;
    facebook?: string;
    linkedin?: string;
  };
}

export interface OperatingHours {
  weekdays: string;
  saturdays: string;
  sundays: string;
}

export interface BusinessConfig {
  companyName: string;
  publicBrandName: string;
  tagline: string;
  description: string;
  tinOrRegistrationNumber?: string;
  currency: CurrencyConfig;
  defaultLocale: string;
  contact: ContactInfo;
  operatingHours: OperatingHours;
  features: {
    installationsEnabled: boolean;
    posOfflineTransactions: boolean;
    customerPortalEnabled: boolean;
    digitalQuotations: boolean;
    warehouseTracking: boolean;
    aiAssistantPreview: boolean;
  };
  supportedMaterialCategories: string[];
}

