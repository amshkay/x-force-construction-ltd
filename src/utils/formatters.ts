import { defaultFullBusinessSettings } from '../config/business.config';
import { RegionalSettings } from '../types/business';

/**
 * Enterprise Formatters
 * Grounded in centralized business settings
 * Module 04: Regional & Currency Formatting
 */

export interface NumberFormatOptions {
  decimals?: number;
  thousandsSeparator?: string;
  decimalSeparator?: string;
}

/**
 * Formats a raw numeric value according to regional thousands and decimal separators
 */
export function formatNumber(
  amount: number,
  options?: NumberFormatOptions
): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '0.00';

  const decimals = options?.decimals ?? defaultFullBusinessSettings.regional.decimalPlaces;
  const thousandsSep = options?.thousandsSeparator ?? defaultFullBusinessSettings.regional.thousandsSeparator;
  const decimalSep = options?.decimalSeparator ?? defaultFullBusinessSettings.regional.decimalSeparator;

  const parts = amount.toFixed(decimals).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep);

  if (decimals === 0) return parts[0];
  return parts.join(decimalSep);
}

/**
 * Formats currency respecting symbol, position, decimals, and custom separators
 */
export function formatCurrency(
  amount: number,
  overrideConfig?: Partial<RegionalSettings>
): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    const symbol = overrideConfig?.currencySymbol ?? defaultFullBusinessSettings.regional.currencySymbol;
    return `${symbol}0.00`;
  }

  const regional = {
    ...defaultFullBusinessSettings.regional,
    ...overrideConfig,
  };

  const formattedValue = formatNumber(amount, {
    decimals: regional.decimalPlaces,
    thousandsSeparator: regional.thousandsSeparator,
    decimalSeparator: regional.decimalSeparator,
  });

  if (regional.currencyPosition === 'after') {
    return `${formattedValue} ${regional.currencySymbol}`;
  }

  return `${regional.currencySymbol}${formattedValue}`;
}

export function formatDate(
  dateInput: string | number | Date,
  format: 'short' | 'medium' | 'long' | 'time' = 'medium',
  locale = defaultFullBusinessSettings.regional.defaultLocale,
  timezone = defaultFullBusinessSettings.regional.timezone
): string {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '—';

  try {
    switch (format) {
      case 'short':
        return new Intl.DateTimeFormat(locale, {
          dateStyle: 'short',
          timeZone: timezone,
        }).format(date);
      case 'long':
        return new Intl.DateTimeFormat(locale, {
          dateStyle: 'full',
          timeStyle: 'short',
          timeZone: timezone,
        }).format(date);
      case 'time':
        return new Intl.DateTimeFormat(locale, {
          timeStyle: 'short',
          timeZone: timezone,
        }).format(date);
      case 'medium':
      default:
        return new Intl.DateTimeFormat(locale, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          timeZone: timezone,
        }).format(date);
    }
  } catch {
    // Fallback if timezone is invalid
    return date.toLocaleDateString(locale);
  }
}

export function formatDateTime(
  dateInput: string | number | Date,
  locale = defaultFullBusinessSettings.regional.defaultLocale,
  timezone = defaultFullBusinessSettings.regional.timezone
): string {
  return formatDate(dateInput, 'long', locale, timezone);
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

export function formatRelativeTime(dateInput: string | number | Date): string {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '—';

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 45) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(date, 'medium');
}


