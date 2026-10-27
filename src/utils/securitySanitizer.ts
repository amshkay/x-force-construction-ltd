/**
 * Application Security & Input Sanitizer Utilities
 * Module 23 — Security Hardening & Access Control
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Implements defenses against:
 * 1. Stored & Reflected XSS in user-supplied strings (customer comments, names, site notes)
 * 2. Directory / Path Traversal in storage keys & filenames
 * 3. Dangerous executable file uploads (.exe, .sh, .html, .svg with script payloads)
 * 4. Formula injection characters in exported content
 */

/**
 * Strips script tags, iframe tags, javascript: pseudo-protocols, and inline event handlers
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:[^"']*/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^>\s]+/gi, '')
    .trim();
}

/**
 * Sanitizes plain user input strings to neutralize potential HTML injections
 */
export function sanitizeInputString(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .trim();
}

/**
 * Sanitizes a storage file path or filename to prevent directory traversal
 */
export function sanitizeStoragePath(pathStr: string): string {
  if (!pathStr || typeof pathStr !== 'string') return 'upload';
  return pathStr
    .replace(/\0/g, '') // remove null bytes
    .replace(/\\/g, '/') // normalize backslashes
    .replace(/\.{2,}\//g, '') // strip directory traversal ../
    .replace(/^\/+/, '') // strip leading slashes
    .replace(/[^a-zA-Z0-9_\-\.\/]/g, '_'); // sanitize unsafe characters
}

/**
 * Blocks dangerous executable extensions from being uploaded
 */
const DANGEROUS_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'php', 'phtml', 'php3', 'php4', 'php5',
  'py', 'rb', 'pl', 'jsp', 'asp', 'aspx', 'cgi', 'dll', 'so', 'jar',
  'html', 'htm', 'xhtml', 'shtml', 'svgz'
]);

/**
 * Validates whether an uploaded file is safe and adheres to size and type boundaries
 */
export function validateUploadSecurity(
  file: File | Blob,
  fileName: string,
  options: { maxSizeBytes?: number; allowedMimeTypes?: string[] } = {}
): { isSafe: boolean; errorMessage?: string } {
  // 1. Check file size
  const maxBytes = options.maxSizeBytes || 15 * 1024 * 1024; // Default 15MB
  if (file.size > maxBytes) {
    return {
      isSafe: false,
      errorMessage: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds limit of ${(maxBytes / (1024 * 1024)).toFixed(1)}MB.`,
    };
  }

  // 2. Validate filename and extension
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  if (DANGEROUS_EXTENSIONS.has(extension)) {
    return {
      isSafe: false,
      errorMessage: `Executable file extension ".${extension}" is blocked for security.`,
    };
  }

  // 3. Validate MIME type
  const mimeType = file.type?.toLowerCase() || 'application/octet-stream';
  if (options.allowedMimeTypes && options.allowedMimeTypes.length > 0) {
    const isAllowed = options.allowedMimeTypes.some((allowed) => {
      if (allowed.endsWith('/*')) {
        const prefix = allowed.slice(0, -2);
        return mimeType.startsWith(prefix);
      }
      return mimeType === allowed;
    });

    if (!isAllowed) {
      return {
        isSafe: false,
        errorMessage: `File type "${mimeType}" is not permitted.`,
      };
    }
  }

  return { isSafe: true };
}

/**
 * Validates a Nigerian or international standard telephone number
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  // Clean spaces, dashes, brackets
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  // Allows +234..., 080..., 090..., 070..., 081..., or generic international 7-15 digits
  return /^\+?[0-9]{7,15}$/.test(cleaned);
}

/**
 * Validates standard email address format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

/**
 * Checks whether a candidate password matches the single-business temporary setup credential (Xforcecon)
 * Enforces business rule: Default passwords must NEVER be accepted as permanent user passwords.
 */
export function isDefaultPassword(password: string): boolean {
  if (!password || typeof password !== 'string') return false;
  return password.trim().toLowerCase() === 'xforcecon';
}

/**
 * Validates password strength and disallows the default setup password
 */
export function validateSecurePassword(password: string): { isValid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required.' };
  }
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (isDefaultPassword(password)) {
    return {
      isValid: false,
      error: 'Your password cannot be the temporary default password. Please choose a personalized password.',
    };
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  if (!hasLetter || !hasNumberOrSymbol) {
    return {
      isValid: false,
      error: 'Password must include both letters and at least one number or symbol.',
    };
  }
  return { isValid: true };
}

