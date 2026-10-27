/**
 * CSV Security & Formula Injection Neutralizer
 * Module 23 — Security Hardening & Access Control
 * XFORCE Construction Ltd / X-FORCE BRICKS
 *
 * Prevents CSV / Spreadsheet Formula Injection (CWE-1236)
 * Disarms cells starting with =, +, -, @, \t, or \r by prepending a single quote (').
 */

export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }

  const str = String(value);

  // If the string starts with spreadsheet formula triggers
  const hasFormulaTrigger = /^[=+\-@\t\r]/.test(str);
  const safeStr = hasFormulaTrigger ? `'${str}` : str;

  // Escape inner double quotes by doubling them
  const escaped = safeStr.replace(/"/g, '""');

  return `"${escaped}"`;
}

export function buildSafeCsvRow(cells: unknown[]): string {
  return cells.map((cell) => sanitizeCsvCell(cell)).join(',');
}

export function buildSafeCsvContent(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map((h) => sanitizeCsvCell(h)).join(',');
  const rowLines = rows.map((r) => buildSafeCsvRow(r));
  return [headerLine, ...rowLines].join('\n');
}
