import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Formats a currency amount British-style (£1,299.00 — comma thousands
 * separator, dot decimal point), regardless of whether the surrounding UI
 * text is in English (storefront) or Portuguese (admin panel) — the
 * store's currency is GBP everywhere, so the number format follows en-GB
 * conventions everywhere too, per store_settings.store_currency.
 */
export function formatCurrency(value: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(value);
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
