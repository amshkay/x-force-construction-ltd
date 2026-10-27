import {
  BusinessConfig,
  FullBusinessSettings,
  PublicBusinessSettings,
} from '../types/business';

/**
 * Default Master Full Business Settings
 * Grounded in XFORCE CONSTRUCTION LTD / X-FORCE BRICKS specification
 *
 * Module 04: Centralized Business Settings & Configuration
 */
export const defaultFullBusinessSettings: FullBusinessSettings = {
  id: 'current_business',

  // 1. Business Identity
  companyName: 'XFORCE CONSTRUCTION LTD',
  publicBrandName: 'X-FORCE BRICKS',
  shortName: 'X-FORCE',
  slogan: 'Building Excellence. Finishing with Pride.',
  businessDescription:
    'Leading manufacturer and supplier of high-durability decorative bricks, interlocking paving stones, structural blocks, and specialized construction masonry with certified professional installation services.',
  businessCategory: 'Building Materials Manufacturer & Construction',
  tinNumber: 'RC-1849204',

  // 2. Contact Information
  contactEmail: 'info@xforceconstruction.com',
  contactPhone: '+234 803 000 0000',
  secondaryPhone: '+234 812 000 0000',
  whatsappNumber: '+234 803 000 0000',
  websiteUrl: 'https://xforcebricks.com',
  address: {
    street: 'Km 14 Industrial Avenue, Construction District',
    city: 'Lagos',
    state: 'Lagos State',
    country: 'Nigeria',
    postalCode: '100001',
  },
  location: {
    latitude: 6.5243793,
    longitude: 3.3792057,
    locationDescription: 'Main Factory Yard & Heavy Duty Loading Bay, Km 14 Industrial Corridor, Lagos',
    mapLinkUrl: 'https://maps.google.com/?q=6.5243793,3.3792057',
  },
  socialLinks: {
    whatsapp: 'https://wa.me/2348030000000',
    instagram: 'https://instagram.com/xforcebricks',
    facebook: 'https://facebook.com/xforceconstruction',
    linkedin: 'https://linkedin.com/company/xforce-construction-ltd',
    twitter: 'https://twitter.com/xforcebricks',
    youtube: 'https://youtube.com/@xforcebricks',
  },

  // 3. Branding & Media
  branding: {
    logoUrl: null, // Default SVG / Brand Icon renders dynamically
    faviconUrl: null,
    primaryBrandColor: '#ea580c', // Orange-600
    secondaryBrandColor: '#0f172a', // Slate-900
    accentBrandColor: '#f97316', // Orange-500
  },

  // 4. Public Website Settings
  websiteContent: {
    websiteTitle: 'X-FORCE BRICKS | Engineered Interlocking Bricks & Paving Solutions',
    metaDescription:
      'Certified high-durability interlocking bricks, decorative paving stones, and turnkey structural masonry installation services across Nigeria.',
    publicSlogan: 'Engineered For Strength. Crafted For Distinction.',
    heroHeading: 'Engineered Interlocking Bricks & Architectural Construction',
    heroSubheading:
      'Premium hydraulic-cured paving stones, decorative facing bricks, and turnkey site installation by master masons.',
    heroImageUrl:
      'https://images.unsplash.com/photo-1621847468516-1ed5d0df56fe?auto=format&fit=crop&w=1600&q=80',
    secondaryHeroImageUrl:
      'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1600&q=80',
    homepageIntro:
      'X-FORCE BRICKS delivers world-class masonry engineered to withstand demanding climate conditions while elevating architectural beauty.',
    aboutDescription:
      'XFORCE CONSTRUCTION LTD is a premier Nigerian manufacturing and civil construction company specializing in engineered paving blocks, interlocking bricks, structural masonry, and turnkey installation contracts.',
    publicContactText:
      'Speak directly with our technical sales engineers for bulk site deliveries, sample boards, or quotation requests.',
    footerText: '© 2026 XFORCE CONSTRUCTION LTD. All rights reserved. Registered in the Federal Republic of Nigeria.',
    isPublicVisible: true,
  },

  // 5. Currency & Regional Settings
  regional: {
    currencyCode: 'NGN',
    currencySymbol: '₦',
    currencyPosition: 'before',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
    countryCode: 'NG',
    countryName: 'Nigeria',
    defaultLocale: 'en-NG',
    timezone: 'Africa/Lagos',
  },

  // 6. Business Hours
  operatingHours: {
    monday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
    tuesday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
    wednesday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
    thursday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
    friday: { isOpen: true, openTime: '08:00', closeTime: '18:00' },
    saturday: { isOpen: true, openTime: '09:00', closeTime: '16:00' },
    sunday: { isOpen: false, openTime: '09:00', closeTime: '16:00' },
  },

  // 7. Numbering Prefixes
  numbering: {
    defaultCustomerPrefix: 'XFC',
    defaultRequestPrefix: 'XFR',
    defaultQuotationPrefix: 'XFQ',
    defaultOrderPrefix: 'XFO',
    defaultTrackingPrefix: 'XFT',
    defaultPaymentPrefix: 'XFP',
    defaultInvoicePrefix: 'XFI',
    defaultStockCountPrefix: 'STC',
    defaultPosSalePrefix: 'POS',
    defaultFulfilmentPrefix: 'FUL',
    defaultWarehouseTaskPrefix: 'TSK',
    defaultWaybillPrefix: 'WAY',
    defaultServicePrefix: 'SRV',
    defaultServiceProviderPrefix: 'SPV',
    defaultStaffPrefix: 'STF',
    defaultSupplierPrefix: 'SUP',
    defaultExpensePrefix: 'EXP',
  },

  // 8. Payment Methods
  paymentMethods: [
    {
      id: 'pm-cash',
      code: 'cash',
      name: 'Cash on Counter',
      description: 'Physical cash received at factory yard or showroom counter with instant printed receipt.',
      isEnabled: true,
      instructions: 'Physical verification by cashier required before issue voucher release.',
    },
    {
      id: 'pm-transfer',
      code: 'bank_transfer',
      name: 'Direct Bank Transfer',
      description: 'Direct electronic wire or transfer to designated enterprise corporate accounts.',
      isEnabled: true,
      instructions: 'Please quote your Quotation/Order number as payment reference for fast reconciliation.',
      bankDetails: {
        bankName: 'First Bank of Nigeria',
        accountName: 'XFORCE CONSTRUCTION LTD',
        accountNumber: '2039481928',
        sortCode: '011151003',
      },
    },
    {
      id: 'pm-pos',
      code: 'pos',
      name: 'POS Terminal (Yard / Field)',
      description: 'Debit and credit card processing via company cellular POS terminals.',
      isEnabled: true,
      instructions: 'Available for walk-in counter clients and on-site delivery drivers.',
    },
    {
      id: 'pm-card',
      code: 'card',
      name: 'Online Debit / Credit Card',
      description: 'Instant online card checkout via secure 3D-Secure gateway.',
      isEnabled: true,
      instructions: 'Automated receipt dispatched to customer email upon successful gateway charge.',
    },
    {
      id: 'pm-ussd',
      code: 'ussd',
      name: 'USSD Bank Code',
      description: 'Quick mobile banking USSD transaction reference.',
      isEnabled: true,
      instructions: 'Dial bank USSD code with provided payment reference string.',
    },
    {
      id: 'pm-paystack',
      code: 'paystack',
      name: 'Paystack Gateway',
      description: 'Integrated multi-channel payment gateway supporting cards, transfers, and Apple Pay.',
      isEnabled: true,
      instructions: 'Live transaction secrets configured securely via server environment variables.',
    },
  ],

  // 9. Feature Toggles
  features: {
    productSales: true,
    customerRequests: true,
    quotations: true,
    delivery: true,
    posOfflineTransactions: true,
    inventory: true,
    installationsEnabled: true,
    serviceProviders: true,
    customerTracking: true,
    publicWebsite: true,
    whatsappContact: true,
    onlinePayments: true,
    customerAccounts: true,
  },

  // Material Categories
  supportedMaterialCategories: [
    'Decorative Facing Bricks',
    'Interlocking Paving Stones',
    'Hollow & Solid Sandcrete Blocks',
    'Roofing & Wall Coping Tiles',
    'Kerb Stones & Drainage Channels',
    'Aggregates & Specialized Mortar',
  ],

  version: 1,
  updatedAt: '2026-09-20T00:00:00.000Z',
  createdAt: '2026-09-20T00:00:00.000Z',
};

/**
 * Public Safe Projection Helper
 */
export function getPublicProjection(settings: FullBusinessSettings): PublicBusinessSettings {
  const mon = settings.operatingHours?.monday || { isOpen: true, openTime: '08:00', closeTime: '18:00' };
  const sat = settings.operatingHours?.saturday || { isOpen: true, openTime: '09:00', closeTime: '16:00' };
  const sun = settings.operatingHours?.sunday || { isOpen: false, openTime: '00:00', closeTime: '00:00' };

  return {
    companyName: settings.companyName,
    legalName: settings.companyName,
    publicBrandName: settings.publicBrandName,
    shortName: settings.shortName,
    slogan: settings.slogan,
    businessDescription: settings.businessDescription,
    description: settings.businessDescription,
    businessCategory: settings.businessCategory,
    tinNumber: settings.tinNumber,
    branding: settings.branding,
    contactEmail: settings.contactEmail,
    contactPhone: settings.contactPhone,
    secondaryPhone: settings.secondaryPhone,
    whatsappNumber: settings.whatsappNumber,
    websiteUrl: settings.websiteUrl,
    address: settings.address,
    location: settings.location,
    socialLinks: settings.socialLinks,
    operatingHours: settings.operatingHours,
    operatingHoursFormatted: {
      weekdays: mon.isOpen ? `${mon.openTime} – ${mon.closeTime}` : 'Closed',
      saturdays: sat.isOpen ? `${sat.openTime} – ${sat.closeTime}` : 'Closed',
      sundays: sun.isOpen ? `${sun.openTime} – ${sun.closeTime}` : 'Closed',
    },
    contact: {
      email: settings.contactEmail,
      phone: settings.contactPhone,
      secondaryPhone: settings.secondaryPhone,
      whatsapp: settings.whatsappNumber,
      address: settings.address,
    },
    websiteContent: settings.websiteContent,
    currency: {
      code: settings.regional.currencyCode,
      symbol: settings.regional.currencySymbol,
      position: settings.regional.currencyPosition,
    },
    features: {
      installationsEnabled: settings.features.installationsEnabled,
      customerTracking: settings.features.customerTracking,
      whatsappContact: settings.features.whatsappContact,
      customerRequests: settings.features.customerRequests,
      productSales: settings.features.productSales,
    },
    supportedMaterialCategories: settings.supportedMaterialCategories,
  };
}

export const defaultPublicBusinessSettings: PublicBusinessSettings =
  getPublicProjection(defaultFullBusinessSettings);

/**
 * Legacy BusinessConfig representation for backward compatibility
 */
export const defaultBusinessConfig: BusinessConfig = {
  companyName: defaultFullBusinessSettings.companyName,
  publicBrandName: defaultFullBusinessSettings.publicBrandName,
  tagline: defaultFullBusinessSettings.slogan,
  description: defaultFullBusinessSettings.businessDescription,
  tinOrRegistrationNumber: defaultFullBusinessSettings.tinNumber,
  currency: {
    code: defaultFullBusinessSettings.regional.currencyCode,
    symbol: defaultFullBusinessSettings.regional.currencySymbol,
    name: 'Nigerian Naira',
    decimals: defaultFullBusinessSettings.regional.decimalPlaces,
  },
  defaultLocale: defaultFullBusinessSettings.regional.defaultLocale,
  contact: {
    email: defaultFullBusinessSettings.contactEmail,
    phone: defaultFullBusinessSettings.contactPhone,
    alternatePhone: defaultFullBusinessSettings.secondaryPhone,
    address: defaultFullBusinessSettings.address,
    socialLinks: defaultFullBusinessSettings.socialLinks,
  },
  operatingHours: {
    weekdays: `${defaultFullBusinessSettings.operatingHours.monday.openTime} – ${defaultFullBusinessSettings.operatingHours.monday.closeTime}`,
    saturdays: `${defaultFullBusinessSettings.operatingHours.saturday.openTime} – ${defaultFullBusinessSettings.operatingHours.saturday.closeTime}`,
    sundays: defaultFullBusinessSettings.operatingHours.sunday.isOpen ? 'Open' : 'Closed',
  },
  features: {
    installationsEnabled: defaultFullBusinessSettings.features.installationsEnabled,
    posOfflineTransactions: defaultFullBusinessSettings.features.posOfflineTransactions,
    customerPortalEnabled: defaultFullBusinessSettings.features.customerAccounts,
    digitalQuotations: defaultFullBusinessSettings.features.quotations,
    warehouseTracking: defaultFullBusinessSettings.features.inventory,
    aiAssistantPreview: false,
  },
  supportedMaterialCategories: defaultFullBusinessSettings.supportedMaterialCategories,
};

