/**
 * Feature Module Registry & Architecture Contracts
 *
 * Each feature module encapsulates its own components, hooks, services, and types.
 * Status is strictly tracked:
 * - 'pending': Scheduled for future module prompts
 * - 'foundation_ready': Architecture and contracts established
 * - 'implemented': Fully functional business logic
 */

export interface FeatureModuleDescriptor {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'foundation_ready' | 'implemented';
  targetModuleNumber: number;
  category: 'core' | 'operations' | 'sales' | 'support';
}

export const FEATURE_MODULES: Record<string, FeatureModuleDescriptor> = {
  auth: {
    id: 'auth',
    name: 'Authentication & Access Control',
    description: 'Supabase authentication, RBAC, password recovery, session handling',
    status: 'foundation_ready',
    targetModuleNumber: 1,
    category: 'core',
  },
  settings: {
    id: 'settings',
    name: 'Business Configuration & Settings',
    description: 'Centralized business identity, operational hours, currency, pricing rules',
    status: 'foundation_ready',
    targetModuleNumber: 2,
    category: 'core',
  },
  customers: {
    id: 'customers',
    name: 'Customer Management',
    description: 'Customer profiles, delivery addresses, order history, credit terms',
    status: 'pending',
    targetModuleNumber: 3,
    category: 'sales',
  },
  products: {
    id: 'products',
    name: 'Product & Catalog Management',
    description: 'Generic building material categories, variants, specifications, pricing',
    status: 'pending',
    targetModuleNumber: 4,
    category: 'operations',
  },
  inventory: {
    id: 'inventory',
    name: 'Inventory & Stock Control',
    description: 'Warehouse stock tracking, reorder thresholds, stock valuation, transfer logs',
    status: 'pending',
    targetModuleNumber: 5,
    category: 'operations',
  },
  quotations: {
    id: 'quotations',
    name: 'Quotations & Estimates',
    description: 'Custom material + installation estimates, PDF generation, discount approvals',
    status: 'pending',
    targetModuleNumber: 6,
    category: 'sales',
  },
  orders: {
    id: 'orders',
    name: 'Order Processing & Fulfillment',
    description: 'Customer order life cycle, dispatch notes, delivery tracking',
    status: 'pending',
    targetModuleNumber: 7,
    category: 'operations',
  },
  payments: {
    id: 'payments',
    name: 'Payment Tracking & Invoicing',
    description: 'Direct transfers, POS records, bank verification, payment receipts',
    status: 'pending',
    targetModuleNumber: 8,
    category: 'sales',
  },
  pos: {
    id: 'pos',
    name: 'Point of Sale (POS)',
    description: 'Fast over-the-counter sales, offline cache, instant thermal receipt',
    status: 'pending',
    targetModuleNumber: 9,
    category: 'sales',
  },
  warehouse: {
    id: 'warehouse',
    name: 'Warehouse Operations',
    description: 'Goods receiving, quality check, bin locations, mobile stock counts',
    status: 'pending',
    targetModuleNumber: 10,
    category: 'operations',
  },
  installations: {
    id: 'installations',
    name: 'Installation & Field Services',
    description: 'Site assessment, installation crew assignment, photo audit logs',
    status: 'pending',
    targetModuleNumber: 11,
    category: 'operations',
  },
  service_providers: {
    id: 'service-providers',
    name: 'Service Providers & Subcontractors',
    description: 'Specialist bricklayers, installers, logistics contractors',
    status: 'pending',
    targetModuleNumber: 12,
    category: 'operations',
  },
  staff: {
    id: 'staff',
    name: 'Staff & Team Management',
    description: 'Team directory, assigned roles, permissions, sales performance',
    status: 'pending',
    targetModuleNumber: 13,
    category: 'core',
  },
  suppliers: {
    id: 'suppliers',
    name: 'Supplier Management & Purchasing',
    description: 'Raw materials suppliers (sand, cement, pigments, molds), POs',
    status: 'pending',
    targetModuleNumber: 14,
    category: 'operations',
  },
  expenses: {
    id: 'expenses',
    name: 'Expense Tracking',
    description: 'Operational expenses, vehicle diesel, machinery maintenance, overhead',
    status: 'pending',
    targetModuleNumber: 15,
    category: 'core',
  },
  communication: {
    id: 'communication',
    name: 'Customer Communication & Notifications',
    description: 'SMS/WhatsApp order updates, dispatch alerts, quote reminders',
    status: 'pending',
    targetModuleNumber: 16,
    category: 'support',
  },
  reports: {
    id: 'reports',
    name: 'Business Reports & Analytics',
    description: 'Sales velocity, inventory turnover, gross margins, installer efficiency',
    status: 'pending',
    targetModuleNumber: 17,
    category: 'core',
  },
  ai_assistant: {
    id: 'ai-assistant',
    name: 'AI Construction Assistant',
    description: 'Gemini server-side brick calculator, estimator, and customer assistant',
    status: 'pending',
    targetModuleNumber: 18,
    category: 'support',
  },
};
