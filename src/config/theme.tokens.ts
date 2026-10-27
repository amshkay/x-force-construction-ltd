/**
 * Centralized Design Tokens & Color Palettes
 *
 * Provides a unified design token reference across the application.
 * Defines semantic color pairings, typography hierarchy, radius scales,
 * and standard status mappings.
 */

export const designTokens = {
  colors: {
    // Brand Core
    primary: {
      light: '#ea580c', // Orange 600
      dark: '#f97316',  // Orange 500
      hoverLight: '#c2410c', // Orange 700
      hoverDark: '#ea580c',  // Orange 600
      foreground: '#ffffff',
    },
    secondary: {
      light: '#f1f5f9', // Slate 100
      dark: '#1e293b',  // Slate 800
      hoverLight: '#e2e8f0', // Slate 200
      hoverDark: '#334155',  // Slate 700
      foreground: '#0f172a',
      foregroundDark: '#f8fafc',
    },
    accent: {
      light: '#fff7ed', // Orange 50
      dark: '#431407',  // Orange 950
      foreground: '#c2410c',
      foregroundDark: '#fdba74',
    },
    // Surface & Layout
    background: {
      light: '#ffffff',
      lightCanvas: '#f8fafc', // Slate 50
      dark: '#090d16',        // Deep Slate 950
      darkCanvas: '#020617',  // Slate 950
    },
    card: {
      light: '#ffffff',
      dark: '#0f172a',        // Slate 900
      borderLight: '#e2e8f0', // Slate 200
      borderDark: '#1e293b',  // Slate 800
    },
    foreground: {
      primaryLight: '#0f172a',   // Slate 900
      primaryDark: '#f8fafc',    // Slate 50
      mutedLight: '#64748b',     // Slate 500
      mutedDark: '#94a3b8',      // Slate 400
    },
    // Feedback & System States
    destructive: {
      light: '#ef4444',
      bgLight: '#fef2f2',
      borderLight: '#fecaca',
      dark: '#f87171',
      bgDark: '#450a0a',
      borderDark: '#7f1d1d',
    },
    success: {
      light: '#10b981',
      bgLight: '#ecfdf5',
      borderLight: '#a7f3d0',
      dark: '#34d399',
      bgDark: '#064e3b',
      borderDark: '#065f46',
    },
    warning: {
      light: '#f59e0b',
      bgLight: '#fffbeb',
      borderLight: '#fde68a',
      dark: '#fbbf24',
      bgDark: '#451a03',
      borderDark: '#78350f',
    },
    info: {
      light: '#0284c7',
      bgLight: '#f0f9ff',
      borderLight: '#bae6fd',
      dark: '#38bdf8',
      bgDark: '#082f49',
      borderDark: '#075985',
    },
  },

  typography: {
    display: 'text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight',
    h1: 'text-2xl sm:text-3xl font-bold tracking-tight',
    h2: 'text-xl sm:text-2xl font-bold tracking-tight',
    h3: 'text-lg sm:text-xl font-semibold tracking-tight',
    body: 'text-sm sm:text-base leading-relaxed',
    small: 'text-xs sm:text-sm leading-normal',
    caption: 'text-xs text-slate-500 dark:text-slate-400',
    label: 'text-xs font-semibold uppercase tracking-wider',
  },

  radius: {
    sm: 'rounded-md',    // 6px - buttons, inputs, pills
    md: 'rounded-lg',    // 8px - cards, dialogs
    lg: 'rounded-xl',    // 12px - major containers
    full: 'rounded-full',
  },

  shadows: {
    subtle: 'shadow-sm',
    card: 'shadow-sm hover:shadow-md transition-shadow',
    modal: 'shadow-2xl',
  },
} as const;

/**
 * Standard System Status Types
 */
export type SystemStatus =
  | 'success'
  | 'pending'
  | 'processing'
  | 'warning'
  | 'error'
  | 'inactive'
  | 'active'
  | 'draft'
  | 'completed'
  | 'cancelled';

export interface StatusConfig {
  label: string;
  badgeVariant: 'success' | 'warning' | 'info' | 'danger' | 'default' | 'primary';
  colorClasses: string;
  dotColor: string;
}

/**
 * Centralized Status Badge & Indicator Mapping
 * Ensures consistent colors and semantics across all modules.
 */
export const STATUS_CONFIG_MAP: Record<SystemStatus, StatusConfig> = {
  success: {
    label: 'Success',
    badgeVariant: 'success',
    colorClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    dotColor: 'bg-emerald-500',
  },
  active: {
    label: 'Active',
    badgeVariant: 'success',
    colorClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    dotColor: 'bg-emerald-500',
  },
  completed: {
    label: 'Completed',
    badgeVariant: 'success',
    colorClasses: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    dotColor: 'bg-emerald-500',
  },
  pending: {
    label: 'Pending',
    badgeVariant: 'warning',
    colorClasses: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    dotColor: 'bg-amber-500',
  },
  processing: {
    label: 'Processing',
    badgeVariant: 'info',
    colorClasses: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800',
    dotColor: 'bg-sky-500',
  },
  warning: {
    label: 'Warning',
    badgeVariant: 'warning',
    colorClasses: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    dotColor: 'bg-amber-500',
  },
  error: {
    label: 'Error',
    badgeVariant: 'danger',
    colorClasses: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
    dotColor: 'bg-rose-500',
  },
  cancelled: {
    label: 'Cancelled',
    badgeVariant: 'danger',
    colorClasses: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
    dotColor: 'bg-rose-500',
  },
  draft: {
    label: 'Draft',
    badgeVariant: 'default',
    colorClasses: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    dotColor: 'bg-slate-400',
  },
  inactive: {
    label: 'Inactive',
    badgeVariant: 'default',
    colorClasses: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    dotColor: 'bg-slate-400',
  },
};
