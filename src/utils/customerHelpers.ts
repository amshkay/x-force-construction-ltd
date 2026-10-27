/**
 * Customer Experience Helpers & Communication Utilities
 *
 * Module 05: Public Website & Customer Experience
 * XFORCE Construction Ltd / X-FORCE BRICKS
 */

/**
 * Builds a direct WhatsApp click-to-chat URL with pre-filled message text.
 * Handles cleaning of country codes and non-numeric characters.
 */
export function buildWhatsAppInquiryUrl(
  rawPhone: string,
  message: string
): string {
  if (!rawPhone) return '#';

  // Strip all non-numeric characters except leading +
  let cleanNumber = rawPhone.replace(/[^\d+]/g, '');

  // If starts with +, remove +
  if (cleanNumber.startsWith('+')) {
    cleanNumber = cleanNumber.slice(1);
  } else if (cleanNumber.startsWith('0')) {
    // Standard Nigerian domestic 080... -> 23480...
    cleanNumber = '234' + cleanNumber.slice(1);
  }

  const encodedText = encodeURIComponent(message.trim());
  return `https://wa.me/${cleanNumber}?text=${encodedText}`;
}

/**
 * Format currency with fallback to pricing inquiry when selling price is zero or not specified
 */
export function formatPublicPrice(
  price: number | null | undefined,
  currencySymbol = '₦',
  unit = 'unit'
): string {
  if (!price || price <= 0) {
    return 'Contact for Pricing';
  }
  return `${currencySymbol}${price.toLocaleString()} / ${unit}`;
}

/**
 * Native Web Share API helper with clipboard fallback
 */
export async function sharePublicItem(options: {
  title: string;
  text: string;
  url?: string;
}): Promise<'shared' | 'copied' | 'unsupported'> {
  const targetUrl = options.url || window.location.href;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: options.title,
        text: options.text,
        url: targetUrl,
      });
      return 'shared';
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return 'unsupported';
      }
    }
  }

  // Fallback to clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(`${options.title}\n${options.text}\n${targetUrl}`);
      return 'copied';
    } catch {
      return 'unsupported';
    }
  }

  return 'unsupported';
}
