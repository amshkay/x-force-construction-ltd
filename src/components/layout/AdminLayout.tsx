import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  FileSpreadsheet,
  Receipt,
  FileQuestion,
  Boxes,
  Package,
  ClipboardCheck,
  Warehouse,
  Users,
  Wrench,
  Briefcase,
  UserCheck,
  Truck,
  CreditCard,
  BarChart3,
  MessageSquare,
  Settings,
  Menu,
  X,
  Bell,
  Sun,
  Moon,
  ExternalLink,
  ChevronDown,
  User,
  LogOut,
  Image as ImageIcon,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Activity,
} from 'lucide-react';
import { defaultBusinessConfig } from '../../config/business.config';
import { useTheme } from '../../hooks/useTheme';
import { Avatar } from '../ui/Avatar';
import { SearchInput } from '../ui/SearchInput';
import { Tooltip } from '../ui/Tooltip';
import { Popover } from '../ui/Popover';
import { ConnectionStatusIndicator } from '../ui/ConnectionStatusIndicator';
import { Breadcrumb, BreadcrumbItem } from '../ui/Breadcrumb';
import { PWAInstallButton } from '../../pwa/PWAInstallButton';
import { OfflineIndicator } from '../../pwa/OfflineIndicator';
import { useAuth } from '../../hooks/useAuth';
import { PERMISSION_CODES } from '../../types/auth';
import { UserProfileModal } from '../auth/UserProfileModal';
import { NotificationBell } from '../notifications/NotificationBell';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeModule?: string;
  onModuleSelect?: (moduleId: string) => void;
  onSwitchToPublic?: () => void;
  pageTitle?: string;
  pageDescription?: string;
  breadcrumbItems?: BreadcrumbItem[];
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  activeModule = 'dashboard',
  onModuleSelect,
  onSwitchToPublic,
  pageTitle = 'Dashboard Overview',
  pageDescription = 'Real-time operational overview for XFORCE',
  breadcrumbItems,
}) => {
  // Persist desktop sidebar collapsed state with tablet-first default (Section 14)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem('xforce_admin_sidebar_collapsed');
      if (stored !== null) return stored === 'true';
      // Default collapsed on tablet screens (< 1024px) for maximized work area
      return typeof window !== 'undefined' && window.innerWidth < 1024;
    } catch {
      return false;
    }
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { resolvedTheme, toggleTheme } = useTheme();
  const { profile, role, logout, hasPermission, isAdministrator } = useAuth();

  // Handle escape key to close mobile menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const toggleSidebar = () => {
    const nextState = !sidebarCollapsed;
    setSidebarCollapsed(nextState);
    try {
      localStorage.setItem('xforce_admin_sidebar_collapsed', String(nextState));
    } catch {
      // safe fallback
    }
  };

  // Section 13 Admin Sidebar Navigation Groups with Granular Permissions (Module 03)
  const allNavigationGroups = [
    {
      heading: 'Overview',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          status: 'active',
          permission: PERMISSION_CODES.DASHBOARD_VIEW,
        },
      ],
    },
    {
      heading: 'Sales',
      items: [
        {
          id: 'requests',
          label: 'Requests',
          icon: FileQuestion,
          status: 'active',
          permission: PERMISSION_CODES.REQUESTS_VIEW,
        },
        {
          id: 'quotations',
          label: 'Quotations',
          icon: FileSpreadsheet,
          status: 'active',
          permission: PERMISSION_CODES.QUOTATIONS_VIEW,
        },
        {
          id: 'orders',
          label: 'Orders',
          icon: ShoppingCart,
          status: 'active',
          module: 'Module 10',
          permission: PERMISSION_CODES.ORDERS_VIEW,
        },
        {
          id: 'pos',
          label: 'POS Counter',
          icon: Receipt,
          status: 'active',
          module: 'Module 13',
          permission: PERMISSION_CODES.POS_ACCESS,
        },
      ],
    },
    {
      heading: 'Products & Stock',
      items: [
        {
          id: 'products',
          label: 'Products',
          icon: Boxes,
          status: 'active',
          module: 'Module 06',
          permission: PERMISSION_CODES.PRODUCTS_VIEW,
        },
        {
          id: 'inventory',
          label: 'Inventory',
          icon: Package,
          status: 'active',
          module: 'Module 11',
          permission: PERMISSION_CODES.INVENTORY_VIEW,
        },
        {
          id: 'stock-counts',
          label: 'Stock Counting',
          icon: ClipboardCheck,
          status: 'active',
          module: 'Module 12',
          permission: PERMISSION_CODES.STOCK_COUNTS_VIEW,
        },
        {
          id: 'warehouse',
          label: 'Warehouse & Yard',
          icon: Warehouse,
          status: 'active',
          module: 'Module 14',
          permission: PERMISSION_CODES.WAREHOUSE_VIEW,
        },
      ],
    },
    {
      heading: 'Gallery & Media',
      items: [
        {
          id: 'media-gallery',
          label: 'Media & Gallery',
          icon: ImageIcon,
          status: 'active',
          module: 'Module 07',
          permission: PERMISSION_CODES.MEDIA_VIEW,
        },
      ],
    },
    {
      heading: 'Customers',
      items: [
        {
          id: 'customers',
          label: 'Customers',
          icon: Users,
          status: 'active',
          module: 'Module 08',
          permission: PERMISSION_CODES.CUSTOMERS_VIEW,
        },
      ],
    },
    {
      heading: 'Services',
      items: [
        {
          id: 'installations',
          label: 'Installations',
          icon: Wrench,
          status: 'active',
          module: 'Module 15',
          permission: PERMISSION_CODES.INSTALLATIONS_VIEW,
        },
        {
          id: 'service-providers',
          label: 'Service Providers',
          icon: Briefcase,
          status: 'active',
          module: 'Module 16',
          permission: PERMISSION_CODES.SERVICE_PROVIDERS_VIEW,
        },
      ],
    },
    {
      heading: 'Business',
      items: [
        {
          id: 'staff',
          label: 'Staff',
          icon: UserCheck,
          status: 'active',
          module: 'Module 17',
          permission: PERMISSION_CODES.STAFF_VIEW,
        },
        {
          id: 'suppliers',
          label: 'Suppliers',
          icon: Truck,
          status: 'active',
          module: 'Module 17',
          permission: PERMISSION_CODES.SUPPLIERS_VIEW,
        },
        {
          id: 'expenses',
          label: 'Expenses & Finance',
          icon: CreditCard,
          status: 'active',
          module: 'Module 17',
          permission: PERMISSION_CODES.EXPENSES_VIEW,
        },
        {
          id: 'reports',
          label: 'Reports & Analytics',
          icon: BarChart3,
          status: 'active',
          module: 'Module 20',
          permission: PERMISSION_CODES.REPORTS_VIEW,
        },
      ],
    },
    {
      heading: 'Communication',
      items: [
        {
          id: 'communication',
          label: 'Internal Messaging',
          icon: MessageSquare,
          status: 'active',
          module: 'Module 18',
          permission: PERMISSION_CODES.COMMUNICATION_VIEW,
        },
        {
          id: 'notifications',
          label: 'Notification Center',
          icon: Bell,
          status: 'active',
          module: 'Module 18',
          permission: PERMISSION_CODES.NOTIFICATIONS_VIEW,
        },
      ],
    },
    {
      heading: 'Intelligence',
      items: [
        {
          id: 'ai-assistant',
          label: 'AI Business Assistant',
          icon: Sparkles,
          status: 'active',
          module: 'Module 19',
          permission: PERMISSION_CODES.AI_ASSISTANT_USE,
        },
      ],
    },
    {
      heading: 'System & Governance',
      items: [
        {
          id: 'settings',
          label: 'Settings',
          icon: Settings,
          status: 'active',
          module: 'Module 04',
          permission: PERMISSION_CODES.SETTINGS_VIEW,
        },
        {
          id: 'audit-logs',
          label: 'Audit Logs & Activity',
          icon: ShieldCheck,
          status: 'active',
          module: 'Module 21',
          permission: PERMISSION_CODES.AUDIT_LOGS_VIEW,
        },
        {
          id: 'sync-center',
          label: 'Offline & Sync Center',
          icon: RefreshCw,
          status: 'active',
          module: 'Module 22',
          permission: PERMISSION_CODES.SYNC_VIEW,
        },
        {
          id: 'system-health',
          label: 'System Health & Diagnostics',
          icon: Activity,
          status: 'active',
          module: 'Module 26',
          permission: PERMISSION_CODES.SYSTEM_HEALTH_VIEW,
        },
      ],
    },
  ];

  // Dynamically filter navigation items strictly to granted permissions
  const navigationGroups = allNavigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.permission || hasPermission(item.permission) || isAdministrator()
      ),
    }))
    .filter((group) => group.items.length > 0);

  const handleItemClick = (id: string) => {
    if (onModuleSelect) {
      onModuleSelect(id);
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100 transition-colors">
      {/* Sidebar Desktop */}
      <aside
        id="admin-sidebar"
        aria-label="Sidebar navigation"
        className={`hidden md:flex flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 transition-all duration-300 select-none ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-600 font-bold text-white shadow-sm">
                X
              </div>
              <div className="truncate text-left">
                <p className="text-xs font-bold leading-tight text-slate-900 dark:text-white truncate">
                  {defaultBusinessConfig.publicBrandName}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                  Management Console
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 font-bold text-white shadow-sm">
              X
            </div>
          )}

          <button
            id="btn-sidebar-toggle"
            type="button"
            onClick={toggleSidebar}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-2.5 py-4 space-y-4">
          {navigationGroups.map((group, idx) => (
            <div key={idx} className="space-y-0.5">
              {!sidebarCollapsed ? (
                <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-left">
                  {group.heading}
                </p>
              ) : (
                <div className="h-px bg-slate-100 dark:bg-slate-800 mx-2 my-1" />
              )}

              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeModule === item.id;
                const isComingSoon = item.status === 'coming_soon';

                const buttonContent = (
                  <button
                    key={item.id}
                    id={`sidebar-item-${item.id}`}
                    type="button"
                    onClick={() => handleItemClick(item.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400 font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive
                          ? 'text-orange-600 dark:text-orange-400'
                          : isComingSoon
                          ? 'text-slate-400 dark:text-slate-500'
                          : 'text-slate-500'
                      }`}
                    />
                    {!sidebarCollapsed && (
                      <div className="flex flex-1 items-center justify-between overflow-hidden">
                        <span className="truncate">{item.label}</span>
                        {isComingSoon && (
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-normal">
                            soon
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );

                return sidebarCollapsed ? (
                  <Tooltip key={item.id} content={`${item.label}${isComingSoon ? ' (Coming Soon)' : ''}`} position="right">
                    {buttonContent}
                  </Tooltip>
                ) : (
                  buttonContent
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
          {onSwitchToPublic && (
            <button
              id="btn-switch-to-public"
              type="button"
              onClick={onSwitchToPublic}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 transition"
              title="Customer Public Portal"
            >
              <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
              {!sidebarCollapsed && <span>Customer Portal</span>}
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Navbar Header (Section 15) */}
        <header
          id="admin-header"
          className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900 transition-colors"
        >
          {/* Left: Mobile Menu & Search / Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              id="btn-mobile-sidebar-toggle"
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="hidden sm:block">
              <SearchInput
                id="admin-global-search"
                value={globalSearch}
                onChange={setGlobalSearch}
                placeholder="Search orders, materials, customers..."
              />
            </div>
          </div>

          {/* Right: Connection status, Notifications, Theme toggle, User menu (Section 15, 16) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Connection Status Indicator */}
            <ConnectionStatusIndicator
              id="admin-connection-status"
              showText={false}
              onClick={() => onModuleSelect && onModuleSelect('sync-center')}
            />

            <PWAInstallButton />

            {/* Theme Toggle */}
            <button
              id="btn-admin-theme-toggle"
              type="button"
              onClick={toggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
              aria-label="Toggle light/dark theme"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-600" />
              )}
            </button>

            {/* Quick AI Business Assistant Launcher (Module 19) */}
            {(isAdministrator() || hasPermission(PERMISSION_CODES.AI_ASSISTANT_USE)) && (
              <button
                id="btn-admin-quick-ai"
                type="button"
                onClick={() => onModuleSelect && onModuleSelect('ai-assistant')}
                className="relative hidden sm:flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-400 dark:hover:bg-amber-900/40 transition shadow-2xs"
                aria-label="AI Business Assistant"
                title="AI Business Assistant (Module 19)"
              >
                <Sparkles className="h-4 w-4" />
              </button>
            )}

            {/* Quick Internal Messages */}
            <button
                id="btn-admin-quick-messages"
                type="button"
                onClick={() => onModuleSelect && onModuleSelect('communication')}
                className="relative hidden sm:flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition"
                aria-label="Internal Messaging"
                title="Internal Messaging (Module 18)"
              >
                <MessageSquare className="h-4 w-4" />
              </button>

            {/* Notifications Bell (Module 18) */}
            <NotificationBell
              onNavigateToModule={onModuleSelect}
              onOpenNotificationCenter={() => onModuleSelect && onModuleSelect('notifications')}
            />

            <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-800" />

            {/* User Menu Foundation (Module 03 Integrated) */}
            <Popover
              id="admin-user-menu"
              trigger={
                <button
                  id="btn-user-menu-trigger"
                  type="button"
                  className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  aria-label="User menu"
                >
                  <Avatar name={profile?.full_name || 'Staff'} size="sm" status="online" />
                  <div className="hidden md:block text-left leading-tight">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[120px]">
                      {profile?.full_name || 'Staff Member'}
                    </p>
                    <p className="text-[10px] text-slate-400 capitalize truncate max-w-[120px]">
                      {role?.display_name || role?.name || 'Operations'}
                    </p>
                  </div>
                  <ChevronDown className="hidden md:block h-3.5 w-3.5 text-slate-400" />
                </button>
              }
              align="right"
              className="w-56 p-2"
            >
              <div className="space-y-1 text-left">
                <div className="px-2 py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {profile?.full_name || 'Staff Member'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono truncate">
                    {profile?.email || 'staff@xforce.internal'}
                  </p>
                  <div className="mt-1">
                    <span className="inline-block text-[9px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 px-1.5 py-0.5 rounded">
                      {role?.display_name || 'Staff'}
                    </span>
                  </div>
                </div>
                <div className="py-1">
                  <button
                    id="btn-open-user-profile"
                    type="button"
                    onClick={() => setIsProfileModalOpen(true)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                  >
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span>My Profile & Security</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleItemClick('settings')}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                  >
                    <Settings className="h-3.5 w-3.5 text-slate-400" />
                    <span>System Settings</span>
                  </button>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                  <button
                    id="btn-admin-logout"
                    type="button"
                    onClick={() => logout()}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 transition"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </Popover>
          </div>
        </header>

        {/* Page Content Canvas */}
        <main
          id="admin-main-viewport"
          className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8"
        >
          {/* Breadcrumb / Title Bar */}
          <div className="mb-6 space-y-2 border-b border-slate-200/80 pb-4 dark:border-slate-800/80 text-left">
            {breadcrumbItems && breadcrumbItems.length > 0 && (
              <Breadcrumb items={breadcrumbItems} />
            )}
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                {pageTitle}
              </h1>
              {pageDescription && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {pageDescription}
                </p>
              )}
            </div>
          </div>

          {children}
        </main>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          id="mobile-sidebar-drawer"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileMenuOpen(false);
          }}
          className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm md:hidden animate-in fade-in"
        >
          <div className="flex h-full w-4/5 max-w-xs flex-col bg-white dark:bg-slate-900 shadow-2xl p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {defaultBusinessConfig.publicBrandName}
              </span>
              <button
                id="btn-close-mobile-drawer"
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-slate-400"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-left">
              {navigationGroups.map((group, idx) => (
                <div key={idx} className="space-y-1">
                  <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {group.heading}
                  </p>
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleItemClick(item.id)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium ${
                        activeModule === item.id
                          ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 font-semibold'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 text-orange-600" />
                        <span>{item.label}</span>
                      </div>
                      {item.status === 'coming_soon' && (
                        <span className="text-[9px] text-slate-400">soon</span>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            {onSwitchToPublic && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onSwitchToPublic();
                  }}
                  className="flex w-full items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Customer Portal</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <OfflineIndicator />

      {/* User Profile & Security Modal (Module 03) */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
};
