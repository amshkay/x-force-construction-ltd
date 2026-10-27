/**
 * Common Input & Form Validation Helpers
 */

export const validators = {
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  },

  isValidPhone(phone: string): boolean {
    // Allows international formats, spaces, dashes, parentheses
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ''));
  },

  isNotEmpty(val: unknown): boolean {
    if (val === null || val === undefined) return false;
    if (typeof val === 'string') return val.trim().length > 0;
    if (Array.isArray(val)) return val.length > 0;
    return true;
  },

  isPositiveNumber(val: unknown): boolean {
    const num = Number(val);
    return !isNaN(num) && num > 0;
  },
};
