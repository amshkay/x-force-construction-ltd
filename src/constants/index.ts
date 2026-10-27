/**
 * Application Constants
 */

export const STORAGE_KEYS = {
  THEME: 'xforce_theme_mode',
  AUTH_SESSION: 'xforce_auth_session',
  OFFLINE_QUEUE: 'xforce_offline_sync_queue',
  OFFLINE_DRAFTS: 'xforce_offline_drafts',
  SAVED_PREFERENCES: 'xforce_user_preferences',
} as const;

export const MODULE_IDS = {
  AUTH: 'auth',
  CUSTOMERS: 'customers',
  PRODUCTS: 'products',
  INVENTORY: 'inventory',
  QUOTATIONS: 'quotations',
  ORDERS: 'orders',
  PAYMENTS: 'payments',
  POS: 'pos',
  WAREHOUSE: 'warehouse',
  INSTALLATIONS: 'installations',
  SERVICE_PROVIDERS: 'service-providers',
  STAFF: 'staff',
  SUPPLIERS: 'suppliers',
  EXPENSES: 'expenses',
  COMMUNICATION: 'communication',
  REPORTS: 'reports',
  AI_ASSISTANT: 'ai-assistant',
  SETTINGS: 'settings',
} as const;

export const ROUTES = {
  PUBLIC: {
    HOME: '/',
    ABOUT: '/about',
    PRODUCTS: '/products',
    PRODUCT_DETAIL: '/products/:id',
    DESIGNS: '/designs',
    PROJECTS: '/projects',
    SERVICES: '/services',
    CONTACT: '/contact',
    REQUEST_QUOTE: '/request',
    TRACK_ORDER: '/track',
  },
  ADMIN: {
    ROOT: '/admin',
    DASHBOARD: '/admin/dashboard',
    PRODUCTS: '/admin/products',
    INVENTORY: '/admin/inventory',
    ORDERS: '/admin/orders',
    CUSTOMERS: '/admin/customers',
    QUOTATIONS: '/admin/quotations',
    POS: '/admin/pos',
    WAREHOUSE: '/admin/warehouse',
    INSTALLATIONS: '/admin/installations',
    STAFF: '/admin/staff',
    SUPPLIERS: '/admin/suppliers',
    REPORTS: '/admin/reports',
    SETTINGS: '/admin/settings',
    AUDIT_LOGS: '/admin/audit-logs',
  },
} as const;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  PAGE_SIZE: 15,
  MAX_PAGE_SIZE: 100,
} as const;
