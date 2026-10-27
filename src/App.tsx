import React, { useState } from 'react';
import { ThemeProvider } from './hooks/useTheme';
import { ToastProvider, useToast } from './components/ui/Toast';
import { PublicLayout } from './components/layout/PublicLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { defaultBusinessConfig } from './config/business.config';
import { DashboardShell } from './components/dashboard/DashboardShell';
import { DesignSystemShowcase } from './components/showcase/DesignSystemShowcase';
import { RoutePlaceholder } from './components/common/RoutePlaceholder';

// Public pages
import { PublicHomePage } from './components/public/PublicHomePage';
import { PublicProductsPage } from './components/public/PublicProductsPage';
import { PublicProjectsPage } from './components/public/PublicProjectsPage';
import { PublicServicesPage } from './components/public/PublicServicesPage';
import { PublicDesignsPage } from './components/public/PublicDesignsPage';
import { PublicAboutPage } from './components/public/PublicAboutPage';
import { PublicContactPage } from './components/public/PublicContactPage';
import { PublicTrackRequestPage } from './components/public/PublicTrackRequestPage';
import { PublicRequestQuotePage } from './components/public/PublicRequestQuotePage';
import { PublicCustomerAuthPage } from './components/public/PublicCustomerAuthPage';

// Authentication & Access Control (Module 03)
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { PERMISSION_CODES, PermissionCode, StaffRoleName } from './types/auth';
import { LoginPage } from './components/auth/LoginPage';
import { ForgotPasswordPage } from './components/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { SetupAccountPage } from './components/auth/SetupAccountPage';
import { AccountDeactivatedPage } from './components/auth/AccountDeactivatedPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { StaffManagementPanel } from './components/staff/StaffManagementPanel';

// Business Settings & Configuration (Module 04)
import { BusinessSettingsProvider } from './context/BusinessSettingsContext';
import { BusinessSettingsPanel } from './components/settings/BusinessSettingsPanel';

// Product Catalogue & Variants (Module 06)
import { ProductManagementPanel } from './components/products';

// Media, Designs & Gallery (Module 07)
import { MediaGalleryManagementPanel } from './components/media';

// Customer Management & Customer Portal (Module 08)
import { CustomerManagementPanel } from './components/customers';
import { CustomerPortalView } from './components/customer';

// Customer Requests & Quotation Management (Module 09)
import { RequestManagementPanel } from './components/requests/RequestManagementPanel';
import { QuotationManagementPanel } from './components/quotations/QuotationManagementPanel';

// Orders, Payments & Customer Tracking (Module 10)
import { OrderManagementPanel } from './components/orders';

// Inventory & Stock Management (Module 11)
import { InventoryManagementPanel } from './components/inventory';

// Physical Stock Counting & Reconciliation (Module 12)
import { StockCountManagementPanel } from './components/stockCount';

// Point of Sale (POS) Counter (Module 13)
import { PosSalesCounterPanel } from './components/pos/PosSalesCounterPanel';

// Warehouse & Delivery Operations (Module 14)
import { WarehouseOperationsPanel } from './components/warehouse/WarehouseOperationsPanel';

// Installation & Service Management (Module 15)
import { InstallationManagementPanel } from './components/installation/InstallationManagementPanel';

// Service Provider Management (Module 16)
import { ServiceProviderManagementPanel } from './components/serviceProviders/ServiceProviderManagementPanel';

// Staff, Suppliers, Expenses & Basic Finance (Module 17)
import { SupplierManagementPanel } from './components/suppliers/SupplierManagementPanel';
import { ExpenseManagementPanel } from './components/expenses/ExpenseManagementPanel';

// Communication & Notifications (Module 18)
import { InternalMessagingPanel } from './components/messaging/InternalMessagingPanel';
import { NotificationCenterPanel } from './components/notifications/NotificationCenterPanel';

// Admin AI Business Assistant (Module 19)
import { AiAssistantPanel } from './components/ai/AiAssistantPanel';

// Reporting, Analytics & Management Dashboard (Module 20)
import { ReportsManagementPanel } from './components/reports/ReportsManagementPanel';
import { ReportTab } from './types/report';

// Audit Logs & System Activity (Module 21)
import { AuditLogsManagementPanel } from './components/audit/AuditLogsManagementPanel';

// Offline-First PWA & Synchronization (Module 22)
import { SyncCenterPanel } from './components/sync/SyncCenterPanel';

// Production Monitoring, Health & Operational Diagnostics (Module 26)
import { SystemHealthPanel } from './components/diagnostics';

import {
  SlidersHorizontal,
  Palette,
  ExternalLink,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { BreadcrumbItem } from './components/ui/Breadcrumb';

interface ModuleMetadata {
  name: string;
  number: string;
  description: string;
  features: string[];
}

const MODULE_DEFINITIONS: Record<string, ModuleMetadata> = {
  requests: {
    name: 'Customer Quote Requests',
    number: 'Module 09',
    description: 'Inbound requests from website visitors, WhatsApp inquiries, and walk-in site project submissions.',
    features: [
      'Digital intake queue for new architectural inquiries',
      'Attachment parser for architectural drawings and site surveys',
      'Automatic quote reference generation and customer notification',
      'One-click conversion into formalized price quotations',
    ],
  },
  quotations: {
    name: 'Quotations & Estimations Engine',
    number: 'Module 09',
    description: 'Detailed cost estimations for interlocking bricks, pavers, site sand, transport logistics, and installation labor.',
    features: [
      'Dynamic square-meterage to brick quantity calculator',
      'Multi-tier wholesale discount rules',
      'Formal PDF generation with corporate XFORCE letterhead',
      'Expiration tracking and conversion into sales orders',
    ],
  },
  orders: {
    name: 'Order Management & Fulfillment',
    number: 'Module 10',
    description: 'Complete order lifecycle tracking from payment confirmation to dispatch, transport, and delivery sign-off.',
    features: [
      'Full, partial, and installment payment tracking',
      'Fulfillment and dispatch status pipeline',
      'Printable waybills and driver delivery manifests',
      'Customer delivery acknowledgement sign-off',
    ],
  },
  pos: {
    name: 'Point of Sale (POS) Counter',
    number: 'Module 13',
    description: 'Fast counter-sales register designed for quick walk-in contractor transactions, physical receipts, and instant stock deduction.',
    features: [
      'Touch-friendly rapid product grid and barcode scanning',
      'Split payment handling (Cash, POS Terminal, Bank Transfer)',
      'Thermal receipt printing (80mm / 58mm)',
      'Cash drawer reconciliation and daily sales balancing',
    ],
  },
  products: {
    name: 'Products & Materials Catalog',
    number: 'Module 06',
    description: 'Centralized catalog for all manufacturing SKUs, dimensional specifications, pricing tiers, and production costs.',
    features: [
      'Material variant management (Dimensions, colors, psi strength)',
      'Retail, contractor, and bulk pricing schedules',
      'High-resolution technical spec sheets and imagery',
      'Category hierarchies and material recipe linking',
    ],
  },
  inventory: {
    name: 'Inventory & Stock Management',
    number: 'Module 11',
    description: 'Real-time stock tracking across raw materials (cement, quarry dust, sand, pigment) and cured finished goods.',
    features: [
      'Live stock count across manufacturing bays and curing yards',
      'Automated low-stock reorder point notifications',
      'Stock adjustment logs with mandatory audit reason codes',
      'Periodic physical stocktaking and variance reconciliation',
    ],
  },
  'stock-counts': {
    name: 'Physical Stock Counting & Reconciliation',
    number: 'Module 12',
    description: 'Physical inventory stocktaking, blind count sheets, discrepancy variance reviews, and atomic reconciliation movements.',
    features: [
      'Multi-location stock count sessions with snapshot quantity freezing',
      'Blind counting mode preventing bias during physical audits',
      'Preserved recounts with audit history and supervisor reviews',
      'Atomic reconciliation movements linked to inventory ledgers',
    ],
  },
  warehouse: {
    name: 'Warehouse & Delivery Operations',
    number: 'Module 14',
    description: 'Physical fulfilment preparation, stock allocation, yard picking, container packing, truck dispatch, and proof of delivery.',
    features: [
      'Inventory stock allocation with live availability and shortage warnings',
      'Warehouse loader picking task queue with barcode scan simulation',
      'Supervisor quantity verification and crating/palletizing checklists',
      'Official waybill generation, fleet dispatch, and customer site POD sign-off',
    ],
  },
  customers: {
    name: 'Customer Directory & Accounts',
    number: 'Module 08',
    description: 'Comprehensive directory of architects, real estate developers, building contractors, and private property owners.',
    features: [
      'Customer profiling and transaction history',
      'Credit limit management and outstanding balance aging',
      'Delivery site address book with landmark details',
      'Direct WhatsApp and SMS integration for order updates',
    ],
  },
  installations: {
    name: 'Installation & Field Site Jobs',
    number: 'Module 15',
    description: 'Job scheduling, site supervisor assignments, and quality assurance inspections for laying teams.',
    features: [
      'Site preparation checklist and laser leveling signoff',
      'Daily square-meter progress logging with site photos',
      'Laying team supervisor and mason assignment',
      'Client handover inspection and snagging management',
    ],
  },
  'service-providers': {
    name: 'Service Providers & Mason Network',
    number: 'Module 16',
    description: 'Directory of certified bricklayers, paving specialists, heavy-duty truck drivers, and external contractors.',
    features: [
      'Certified artisan database with skill ratings and locations',
      'Labor payout calculation based on verified installed square meters',
      'Performance reviews and safety compliance records',
      'Direct dispatch to client site projects',
    ],
  },
  staff: {
    name: 'Staff & Team Access Control',
    number: 'Module 17',
    description: 'Staff directory, role-based access permissions, sales commission tracking, and shift management.',
    features: [
      'Role assignment (Manager, Cashier, Yard Supervisor, Sales Rep)',
      'Individual sales target tracking and commission reporting',
      'Shift schedules and attendance logs',
      'Granular permission toggles for sensitive transactions',
    ],
  },
  suppliers: {
    name: 'Suppliers & Raw Material Vendors',
    number: 'Module 17',
    description: 'Management of cement manufacturers, quarry dust suppliers, gravel haulers, and machinery maintenance vendors.',
    features: [
      'Vendor database and purchase order tracking',
      'Supply lead times and material quality grading',
      'Accounts payable and supplier payment terms',
      'Waybill intake and weighing bridge records',
    ],
  },
  expenses: {
    name: 'Expense Tracking & Cost Accounting',
    number: 'Module 17',
    description: 'Operating cost tracking for generator diesel, plant maintenance, haulage fees, and administrative expenses.',
    features: [
      'Category-based expenditure recording (Fuel, Repairs, Logistics)',
      'Receipt attachment upload and digital voucher storage',
      'Managerial approval thresholds for high-value expenses',
      'Direct feed into profit and loss reports',
    ],
  },
  reports: {
    name: 'Business Intelligence & Reports',
    number: 'Module 20',
    description: 'Executive dashboards, sales analytics, gross margin breakdown, and material utilization insights.',
    features: [
      'Daily, weekly, and monthly revenue trends',
      'Product profitability analysis and best-selling variants',
      'Material wastage rates and production efficiency metrics',
      'Exportable financial spreadsheets and management summaries',
    ],
  },
  communication: {
    name: 'Customer Communication & Messaging',
    number: 'Module 18',
    description: 'Unified WhatsApp, SMS, and email messaging center for order confirmations, receipts, and dispatch alerts.',
    features: [
      'Automated WhatsApp templates for quotations and receipts',
      'Dispatch driver phone number delivery notification to clients',
      'Marketing broadcast engine for new product arrivals',
      'Inbound customer support message management',
    ],
  },
  settings: {
    name: 'Business Settings & System Configuration',
    number: 'Module 04',
    description: 'Company profiles, tax configurations, currency settings, receipt templates, and hardware peripherals.',
    features: [
      'Company legal entity and brand metadata configuration',
      'VAT and withholding tax parameter toggles',
      'Receipt header/footer and logo customization',
      'Thermal printer and barcode scanner hardware configuration',
    ],
  },
  'ai-assistant': {
    name: 'Executive AI Business Assistant',
    number: 'Module 19',
    description: 'Autonomous natural language business intelligence workspace for operational data questions, low stock alerts, and managerial confirmations.',
    features: [
      'Grounded queries against commercial orders, cash flow, and brick inventory',
      'Data source transparency tracking for executive auditability',
      'Protected workflow proposals requiring explicit manager confirmation',
      'Integrated Google Gemini 3.8 Flash model with local analytics fallback',
    ],
  },
  'audit-logs': {
    name: 'Audit Logs & System Activity',
    number: 'Module 21',
    description: 'Immutable historical audit logging, security events, before/after diff tracking, and operational activity streams.',
    features: [
      'Immutable append-only business event ledger with user and timestamp accountability',
      'Before and after state diffs with automatic redaction of sensitive credentials',
      'Full-text search, action type filters, date presets, and source channel breakdown',
      'Entity-specific activity history drilldown and tamper-evident CSV export',
    ],
  },
  'sync-center': {
    name: 'PWA Sync Center & Offline Diagnostics',
    number: 'Module 22',
    description: 'Durable client outbox queue, local IndexedDB persistence, conflict resolution, and background sync manager.',
    features: [
      'Transactional IndexedDB outbox with client-generated idempotency keys',
      'Automatic online detection with immediate exponential backoff retry dispatcher',
      'Inventory stock-drift conflict detection with server vs local resolution tools',
      'Local schema snapshots for offline POS checkout and yard operations',
    ],
  },
};

const MODULE_PERMISSION_MAP: Record<string, PermissionCode> = {
  dashboard: PERMISSION_CODES.DASHBOARD_VIEW,
  requests: PERMISSION_CODES.REQUESTS_VIEW,
  quotations: PERMISSION_CODES.QUOTATIONS_VIEW,
  orders: PERMISSION_CODES.ORDERS_VIEW,
  pos: PERMISSION_CODES.POS_ACCESS,
  products: PERMISSION_CODES.PRODUCTS_VIEW,
  'media-gallery': PERMISSION_CODES.MEDIA_VIEW,
  gallery: PERMISSION_CODES.MEDIA_VIEW,
  inventory: PERMISSION_CODES.INVENTORY_VIEW,
  'stock-counts': PERMISSION_CODES.STOCK_COUNTS_VIEW,
  warehouse: PERMISSION_CODES.WAREHOUSE_VIEW,
  customers: PERMISSION_CODES.CUSTOMERS_VIEW,
  installations: PERMISSION_CODES.INSTALLATIONS_VIEW,
  'service-providers': PERMISSION_CODES.SERVICE_PROVIDERS_VIEW,
  staff: PERMISSION_CODES.STAFF_VIEW,
  suppliers: PERMISSION_CODES.SUPPLIERS_VIEW,
  expenses: PERMISSION_CODES.EXPENSES_VIEW,
  reports: PERMISSION_CODES.REPORTS_VIEW,
  communication: PERMISSION_CODES.COMMUNICATION_VIEW,
  notifications: PERMISSION_CODES.NOTIFICATIONS_VIEW,
  'ai-assistant': PERMISSION_CODES.AI_ASSISTANT_USE,
  settings: PERMISSION_CODES.SETTINGS_VIEW,
  'audit-logs': PERMISSION_CODES.AUDIT_LOGS_VIEW,
  audit: PERMISSION_CODES.AUDIT_LOGS_VIEW,
  'sync-center': PERMISSION_CODES.SYNC_VIEW,
  sync: PERMISSION_CODES.SYNC_VIEW,
  'system-health': PERMISSION_CODES.SYSTEM_HEALTH_VIEW,
  diagnostics: PERMISSION_CODES.SYSTEM_HEALTH_VIEW,
};

function MainApplication() {
  const [viewMode, setViewMode] = useState<'public' | 'admin' | 'auth'>('public');
  const [authScreen, setAuthScreen] = useState<
    'login' | 'forgot-password' | 'reset-password' | 'setup-account' | 'account-deactivated'
  >('login');
  const [publicRoute, setPublicRoute] = useState<string>('/');
  const [adminModule, setAdminModule] = useState<string>('dashboard');
  const [targetQuotationRequestId, setTargetQuotationRequestId] = useState<string | null>(null);
  const [targetInstallationOrderId, setTargetInstallationOrderId] = useState<string | null>(null);
  const [targetConversationId, setTargetConversationId] = useState<string | null>(null);
  const [targetReportsTab, setTargetReportsTab] = useState<ReportTab | null>(null);
  const toast = useToast();

  const {
    isAuthenticated,
    isAccountActive,
    needsPasswordSetup,
    profile,
    role,
    logout,
    activeSandboxPersona,
    switchSandboxPersona,
  } = useAuth();

  const handlePublicNavigation = (route: string) => {
    if (route === '/auth/login' || route === '/login') {
      setViewMode('auth');
      setAuthScreen('login');
      return;
    }
    if (route === '/admin') {
      setViewMode('admin');
      return;
    }
    setPublicRoute(route);
  };

  // 1. AUTHENTICATION SCREENS (Module 03)
  if (viewMode === 'auth') {
    if (authScreen === 'forgot-password') {
      return (
        <ForgotPasswordPage onBackToLogin={() => setAuthScreen('login')} />
      );
    }
    if (authScreen === 'reset-password') {
      return (
        <ResetPasswordPage onSuccess={() => setAuthScreen('login')} />
      );
    }
    if (authScreen === 'setup-account') {
      return (
        <SetupAccountPage
          onComplete={() => {
            setViewMode('admin');
            setAdminModule('dashboard');
          }}
        />
      );
    }
    if (authScreen === 'account-deactivated') {
      return (
        <AccountDeactivatedPage onBackToPublic={() => setViewMode('public')} />
      );
    }
    // Default auth screen is Login
    return (
      <LoginPage
        onSuccess={() => {
          setViewMode('admin');
          setAdminModule('dashboard');
        }}
        onForgotPassword={() => setAuthScreen('forgot-password')}
        onBackToPublic={() => setViewMode('public')}
      />
    );
  }

  // 2. PUBLIC WEBSITE VIEW
  if (viewMode === 'public') {
    return (
      <PublicLayout
        currentRoute={publicRoute}
        onRouteChange={handlePublicNavigation}
      >
        {/* Public Routes Rendering */}
        {publicRoute === '/' && (
          <PublicHomePage onNavigate={handlePublicNavigation} />
        )}
        {publicRoute === '/products' && (
          <PublicProductsPage
            onBackHome={() => handlePublicNavigation('/')}
            onRequestQuote={() => handlePublicNavigation('/request')}
          />
        )}
        {publicRoute === '/designs' && (
          <PublicDesignsPage onBackHome={() => handlePublicNavigation('/')} />
        )}
        {publicRoute === '/projects' && (
          <PublicProjectsPage
            onBackHome={() => handlePublicNavigation('/')}
            onRequestQuote={() => handlePublicNavigation('/request')}
          />
        )}
        {publicRoute === '/services' && (
          <PublicServicesPage
            onBackHome={() => handlePublicNavigation('/')}
            onRequestQuote={() => handlePublicNavigation('/request')}
          />
        )}
        {publicRoute === '/about' && (
          <PublicAboutPage onBackHome={() => handlePublicNavigation('/')} />
        )}
        {publicRoute === '/contact' && (
          <PublicContactPage onBackHome={() => handlePublicNavigation('/')} />
        )}
        {(publicRoute === '/track' || publicRoute === '/track-request') && (
          <PublicTrackRequestPage
            onBackHome={() => handlePublicNavigation('/')}
            onRequestQuote={() => handlePublicNavigation('/request')}
          />
        )}
        {publicRoute === '/request' && (
          <PublicRequestQuotePage
            onBackHome={() => handlePublicNavigation('/')}
            onViewTrack={() => handlePublicNavigation('/track')}
          />
        )}
        {(publicRoute === '/customer' || publicRoute === '/customer/profile') && (
          <CustomerPortalView
            onNavigateHome={() => handlePublicNavigation('/')}
            onNavigateToAuth={() => handlePublicNavigation('/customer/login')}
          />
        )}
        {(publicRoute === '/customer/login' || publicRoute === '/customer/register') && (
          <PublicCustomerAuthPage
            initialMode={publicRoute === '/customer/register' ? 'register' : 'login'}
            onBackHome={() => handlePublicNavigation('/')}
            onNavigateToStaff={() => {
              setViewMode('auth');
              setAuthScreen('login');
            }}
            onSuccess={() => handlePublicNavigation('/customer')}
          />
        )}
      </PublicLayout>
    );
  }

  // 3. ADMIN / MANAGEMENT CONSOLE VIEW (Protected by ProtectedRoute)
  const currentModuleDef = MODULE_DEFINITIONS[adminModule];

  let pageTitle = 'Dashboard Overview';
  let pageDescription = 'Operational overview and quick actions for XFORCE';
  let breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Management Console', onClick: () => setAdminModule('dashboard') },
    { label: 'Dashboard', isCurrent: true },
  ];

  if (adminModule === 'design-system') {
    pageTitle = 'Design System & Component Library';
    pageDescription = 'Live verification workbench for all UI primitives, badges, dialogs, and states';
    breadcrumbItems = [
      { label: 'Management Console', onClick: () => setAdminModule('dashboard') },
      { label: 'UI Component Showcase', isCurrent: true },
    ];
  } else if (adminModule === 'staff') {
    pageTitle = 'Staff & Access Control';
    pageDescription = 'Manage team profiles, assign roles, inspect permissions, and configure account access.';
    breadcrumbItems = [
      { label: 'Management Console', onClick: () => setAdminModule('dashboard') },
      { label: 'Staff Directory', isCurrent: true },
    ];
  } else if (adminModule === 'media-gallery' || adminModule === 'gallery') {
    pageTitle = 'Media, Designs & Project Gallery';
    pageDescription = 'Manage completed site project portfolios, architectural laying inspirations, and media storage.';
    breadcrumbItems = [
      { label: 'Management Console', onClick: () => setAdminModule('dashboard') },
      { label: 'Media & Gallery', isCurrent: true },
    ];
  } else if (adminModule === 'customers') {
    pageTitle = 'Customer Directory & Accounts';
    pageDescription = 'Manage building contractors, homeowners, architects, and customer portal accounts.';
    breadcrumbItems = [
      { label: 'Management Console', onClick: () => setAdminModule('dashboard') },
      { label: 'Customers', isCurrent: true },
    ];
  } else if (adminModule === 'requests') {
    pageTitle = 'Customer Requests & Inquiries';
    pageDescription = 'Review incoming project quote requests, analyze site specifications, and dispatch quotations.';
    breadcrumbItems = [
      { label: 'Management Console', onClick: () => setAdminModule('dashboard') },
      { label: 'Customer Requests', isCurrent: true },
    ];
  } else if (adminModule === 'quotations') {
    pageTitle = 'Quotation & Estimation Management';
    pageDescription = 'Compile itemized product and service estimates, dispatch to clients, and track approvals.';
    breadcrumbItems = [
      { label: 'Management Console', onClick: () => setAdminModule('dashboard') },
      { label: 'Quotations', isCurrent: true },
    ];
  } else if (adminModule === 'orders') {
    pageTitle = 'Orders & Payments Management';
    pageDescription = 'Track order fulfillment, payment installments, and delivery sign-offs.';
    breadcrumbItems = [
      { label: 'Management Console', onClick: () => setAdminModule('dashboard') },
      { label: 'Orders', isCurrent: true },
    ];
  } else if (adminModule === 'inventory') {
    pageTitle = 'Physical Inventory & Stock Management';
    pageDescription = 'Real-time multi-location physical inventory, stock movements, and replenishment alerts.';
    breadcrumbItems = [
      { label: 'Management Console', onClick: () => setAdminModule('dashboard') },
      { label: 'Inventory & Stock', isCurrent: true },
    ];
  } else if (adminModule === 'stock-counts') {
    pageTitle = 'Physical Stock Counting & Reconciliation';
    pageDescription = 'Manage physical count sessions, blind stocktaking, variance reviews, and atomic inventory reconciliations.';
    breadcrumbItems = [
      { label: 'Management Console', onClick: () => setAdminModule('dashboard') },
      { label: 'Physical Stock Counting', isCurrent: true },
    ];
  } else if (adminModule === 'pos') {
    pageTitle = 'POS / Sales Counter Terminal';
    pageDescription = 'Direct counter sales, rapid product selection, cash change, split payments, and instant receipts.';
    breadcrumbItems = [
      { label: 'Management Console', onClick: () => setAdminModule('dashboard') },
      { label: 'POS Sales Counter', isCurrent: true },
    ];
  } else if (adminModule === 'warehouse') {
    pageTitle = 'Warehouse & Delivery Operations';
    pageDescription = 'Physical fulfilment preparation, stock allocation, yard picking, truck dispatch, and site proof of delivery.';
    breadcrumbItems = [
      { label: 'Management Console', onClick: () => setAdminModule('dashboard') },
      { label: 'Warehouse & Delivery', isCurrent: true },
    ];
  } else if (adminModule === 'installations') {
    pageTitle = 'Installation & Field Service Operations';
    pageDescription = 'Schedule on-site bricklaying teams, manage site leveling inspections, track daily m² progress, and perform quality audits.';
    breadcrumbItems = [
      { label: 'Management Console', onClick: () => setAdminModule('dashboard') },
      { label: 'Installation & Services', isCurrent: true },
    ];
  } else if (adminModule === 'reports') {
    pageTitle = 'Reporting, Analytics & Management Dashboard';
    pageDescription = 'Executive performance metrics, yard inventory health, commercial orders, field installations, operating finance, and staff workload.';
    breadcrumbItems = [
      { label: 'Management Console', onClick: () => setAdminModule('dashboard') },
      { label: 'Reports & Analytics', isCurrent: true },
    ];
  } else if (adminModule === 'system-health' || adminModule === 'diagnostics') {
    pageTitle = 'System Health & Operational Diagnostics';
    pageDescription = 'Real-time infrastructure health, synchronization outbox status, and operational failure diagnostics for XFORCE Construction Ltd.';
    breadcrumbItems = [
      { label: 'Management Console', onClick: () => setAdminModule('dashboard') },
      { label: 'System Health & Diagnostics', isCurrent: true },
    ];
  } else if (currentModuleDef) {
    pageTitle = currentModuleDef.name;
    pageDescription = `Planned for implementation in ${currentModuleDef.number}`;
    breadcrumbItems = [
      { label: 'Management Console', onClick: () => setAdminModule('dashboard') },
      { label: currentModuleDef.name, isCurrent: true },
    ];
  }

  return (
    <ProtectedRoute
      requiredModule={adminModule === 'staff' ? 'Staff Directory' : currentModuleDef?.name || adminModule}
      requiredPermission={MODULE_PERMISSION_MAP[adminModule]}
      onRedirectToLogin={() => {
        setViewMode('auth');
        setAuthScreen('login');
      }}
      onRedirectToSetup={() => {
        setViewMode('auth');
        setAuthScreen('setup-account');
      }}
      onRedirectToDeactivated={() => {
        setViewMode('auth');
        setAuthScreen('account-deactivated');
      }}
      onNavigateToDashboard={() => {
        setAdminModule('dashboard');
      }}
    >
      <AdminLayout
        activeModule={adminModule}
        onModuleSelect={(id) => setAdminModule(id)}
        onSwitchToPublic={() => setViewMode('public')}
        pageTitle={pageTitle}
        pageDescription={pageDescription}
        breadcrumbItems={breadcrumbItems}
      >
        {/* Top Bar Switcher to Design System Workbench */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-slate-200 bg-white p-3 sm:px-4 sm:py-2 text-xs dark:border-slate-800 dark:bg-slate-900 shadow-xs gap-2.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              Active Workspace:
            </span>
            <span className="rounded bg-orange-100 dark:bg-orange-950 px-2 py-0.5 font-bold text-orange-600 dark:text-orange-400 uppercase text-[10px]">
              {adminModule === 'dashboard'
                ? 'Dashboard Shell'
                : adminModule === 'design-system'
                ? 'Component Showcase'
                : adminModule === 'staff'
                ? 'Staff Directory'
                : adminModule === 'suppliers'
                ? 'Suppliers & Vendors'
                : adminModule === 'expenses'
                ? 'Expenses & Basic Finance'
                : adminModule === 'products'
                ? 'Product Catalogue'
                : adminModule === 'media-gallery' || adminModule === 'gallery'
                ? 'Media & Gallery'
                : adminModule === 'orders'
                ? 'Orders & Payments'
                : adminModule === 'inventory'
                ? 'Inventory & Stock'
                : adminModule === 'stock-counts'
                ? 'Stock Counting'
                : adminModule === 'pos'
                ? 'POS Sales Counter'
                : adminModule === 'warehouse'
                ? 'Warehouse & Yard'
                : adminModule === 'installations'
                ? 'Installation & Site Services'
                : adminModule === 'service-providers'
                ? 'Service Providers & Network'
                : adminModule === 'settings'
                ? 'Business Settings'
                : adminModule === 'reports'
                ? 'Reports & Analytics'
                : currentModuleDef?.number || adminModule}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end w-full sm:w-auto">
            {/* Persona Switcher in Admin Bar */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Test Role:</span>
              <select
                id="select-admin-persona"
                value={activeSandboxPersona ?? ''}
                onChange={(e) => switchSandboxPersona((e.target.value || null) as StaffRoleName | 'inactive' | null)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded px-1.5 py-0.5 text-[11px] focus:outline-none"
              >
                <option value="administrator">Admin</option>
                <option value="sales_manager">Sales Mgr</option>
                <option value="warehouse_staff">Warehouse</option>
                <option value="installation_staff">Installation</option>
                <option value="pos_staff">POS / Cashier</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {adminModule !== 'design-system' ? (
              <button
                type="button"
                onClick={() => setAdminModule('design-system')}
                className="flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 font-medium transition"
              >
                <Palette className="h-3.5 w-3.5 text-orange-600" />
                <span>UI Showcase</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAdminModule('dashboard')}
                className="flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 font-medium transition"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-orange-600" />
                <span>Dashboard</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setViewMode('public')}
              className="flex items-center gap-1.5 rounded-md bg-orange-600 px-2.5 py-1 text-white hover:bg-orange-700 font-semibold transition"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Customer Portal</span>
            </button>
          </div>
        </div>

        {/* Main Content Conditional Routing */}
        {adminModule === 'dashboard' && (
          <DashboardShell
            onNavigateToModule={(modId) => {
              if (modId === 'reports') {
                setTargetReportsTab('overview');
              }
              setAdminModule(modId);
            }}
          />
        )}

        {adminModule === 'design-system' && <DesignSystemShowcase />}

        {adminModule === 'staff' && <StaffManagementPanel />}

        {adminModule === 'settings' && <BusinessSettingsPanel />}

        {adminModule === 'products' && <ProductManagementPanel />}

        {(adminModule === 'media-gallery' || adminModule === 'gallery') && (
          <MediaGalleryManagementPanel />
        )}

        {adminModule === 'customers' && <CustomerManagementPanel />}

        {adminModule === 'requests' && (
          <RequestManagementPanel
            onNavigateToQuotationBuilder={(reqId) => {
              setTargetQuotationRequestId(reqId || null);
              setAdminModule('quotations');
            }}
          />
        )}

        {adminModule === 'quotations' && (
          <QuotationManagementPanel
            initialRequestId={targetQuotationRequestId}
            onClearInitialRequest={() => setTargetQuotationRequestId(null)}
            onNavigateToOrders={() => {
              setAdminModule('orders');
            }}
          />
        )}

        {adminModule === 'orders' && (
          <OrderManagementPanel
            onNavigateToWarehouse={() => {
              setAdminModule('warehouse');
            }}
            onNavigateToInstallations={(orderId) => {
              setTargetInstallationOrderId(orderId || null);
              setAdminModule('installations');
            }}
            onNavigateToCommunication={(convId) => {
              if (convId) setTargetConversationId(convId);
              setAdminModule('communication');
            }}
          />
        )}

        {adminModule === 'inventory' && (
          <InventoryManagementPanel
            onNavigateToStockCount={() => {
              setAdminModule('stock-counts');
            }}
          />
        )}

        {adminModule === 'stock-counts' && <StockCountManagementPanel />}

        {adminModule === 'pos' && <PosSalesCounterPanel />}

        {adminModule === 'warehouse' && <WarehouseOperationsPanel />}

        {adminModule === 'installations' && (
          <InstallationManagementPanel
            initialOrderId={targetInstallationOrderId}
            onClearInitialOrder={() => setTargetInstallationOrderId(null)}
            onNavigateToOrders={() => setAdminModule('orders')}
          />
        )}

        {adminModule === 'service-providers' && (
          <ServiceProviderManagementPanel
            onNavigateToInstallations={(jobId) => {
              if (jobId) setTargetInstallationOrderId(jobId);
              setAdminModule('installations');
            }}
          />
        )}

        {adminModule === 'suppliers' && <SupplierManagementPanel />}

        {adminModule === 'expenses' && <ExpenseManagementPanel />}

        {adminModule === 'communication' && (
          <InternalMessagingPanel
            onNavigateToModule={(mod) => setAdminModule(mod)}
            initialConversationId={targetConversationId}
          />
        )}

        {adminModule === 'notifications' && (
          <NotificationCenterPanel
            onNavigateToModule={(mod) => setAdminModule(mod)}
          />
        )}

        {adminModule === 'ai-assistant' && (
          <AiAssistantPanel
            onNavigateToModule={(mod) => setAdminModule(mod)}
          />
        )}

        {adminModule === 'reports' && (
          <ReportsManagementPanel
            initialTab={targetReportsTab || 'overview'}
            onNavigateToModule={(mod) => setAdminModule(mod)}
          />
        )}

        {(adminModule === 'audit-logs' || adminModule === 'audit') && (
          <AuditLogsManagementPanel />
        )}

        {(adminModule === 'sync-center' || adminModule === 'sync') && (
          <SyncCenterPanel />
        )}

        {(adminModule === 'system-health' || adminModule === 'diagnostics') && (
          <SystemHealthPanel onNavigateToModule={(mod) => setAdminModule(mod)} />
        )}

        {currentModuleDef &&
          adminModule !== 'staff' &&
          adminModule !== 'suppliers' &&
          adminModule !== 'expenses' &&
          adminModule !== 'communication' &&
          adminModule !== 'notifications' &&
          adminModule !== 'ai-assistant' &&
          adminModule !== 'reports' &&
          adminModule !== 'audit-logs' &&
          adminModule !== 'audit' &&
          adminModule !== 'sync-center' &&
          adminModule !== 'sync' &&
          adminModule !== 'settings' &&
          adminModule !== 'products' &&
          adminModule !== 'media-gallery' &&
          adminModule !== 'gallery' &&
          adminModule !== 'customers' &&
          adminModule !== 'requests' &&
          adminModule !== 'quotations' &&
          adminModule !== 'orders' &&
          adminModule !== 'inventory' &&
          adminModule !== 'stock-counts' &&
          adminModule !== 'pos' &&
          adminModule !== 'warehouse' &&
          adminModule !== 'installations' &&
          adminModule !== 'service-providers' && (
            <RoutePlaceholder
              moduleName={currentModuleDef.name}
              moduleNumber={currentModuleDef.number}
              description={currentModuleDef.description}
              featuresPlanned={currentModuleDef.features}
              onBack={() => setAdminModule('dashboard')}
            />
          )}
      </AdminLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BusinessSettingsProvider>
            <MainApplication />
          </BusinessSettingsProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
