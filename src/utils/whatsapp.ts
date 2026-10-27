/**
 * Centralized WhatsApp Link & Messaging Utility
 * Module 04: Business Settings & Configuration
 *
 * Normalizes phone numbers (handles Nigerian local prefixes, international plus signs,
 * spaces, dashes) and builds standard wa.me URLs.
 */

import { defaultFullBusinessSettings } from '../config/business.config';

/**
 * Normalizes any phone number into an international digits-only format for WhatsApp
 * (e.g. "0803 000 0000" -> "2348030000000", "+234 803 000 0000" -> "2348030000000")
 */
export function normalizeWhatsAppNumber(rawPhone?: string): string {
  if (!rawPhone) {
    rawPhone = defaultFullBusinessSettings.whatsappNumber;
  }

  // Strip all non-numeric characters except leading +
  let cleaned = rawPhone.trim().replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Standard Nigerian 0-prefixed 11-digit mobile number normalization
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '234' + cleaned.substring(1);
  }

  return cleaned;
}

/**
 * Generates a standard wa.me WhatsApp direct chat URL with an optional pre-filled message
 */
export function getWhatsAppUrl(rawPhone?: string, prefilledMessage?: string): string {
  const normalized = normalizeWhatsAppNumber(rawPhone);
  if (!normalized) return '#';

  const baseUrl = `https://wa.me/${normalized}`;
  if (!prefilledMessage || !prefilledMessage.trim()) {
    return baseUrl;
  }

  return `${baseUrl}?text=${encodeURIComponent(prefilledMessage.trim())}`;
}

/**
 * Programmatically opens WhatsApp in a new tab/window without window.open popup block
 */
export function openWhatsAppChat(rawPhone?: string, prefilledMessage?: string): void {
  const url = getWhatsAppUrl(rawPhone, prefilledMessage);
  if (url && url !== '#') {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.location.href = url;
    }
  }
}
