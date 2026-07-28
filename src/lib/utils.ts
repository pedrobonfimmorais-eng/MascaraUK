import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(value: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
}

// Matches Unicode combining diacritical marks (U+0300 - U+036F) left behind
// by String.prototype.normalize("NFD"), e.g. turning "a" + combining-acute
// into a plain "a".
const DIACRITICS_PATTERN = /[̀-ͯ]/g;

/**
 * Strips accents/diacritics and lowercases, so searching "mascara" also
 * matches "máscara". Used for both demo-data search and the real Supabase
 * search fallback (Postgres ILIKE alone is accent-sensitive).
 */
export function normalizeSearchText(value: string): string {
  return value.normalize("NFD").replace(DIACRITICS_PATTERN, "").toLowerCase();
}
