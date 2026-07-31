"use client";

import { COOKIE_CONSENT_NAME, parseConsentCookie } from "@/lib/consent";

const SESSION_STORAGE_KEY = "mascarauk_analytics_sid";

/** "Essential" events power the store's own cart/checkout/order mechanics
 * and are logged regardless of the analytics-cookie preference (see
 * CLAUDE.md: "podem ser tratados como essenciais quando realmente
 * necessários"). Everything else is behavioral and requires consent. */
const ESSENTIAL_EVENT_TYPES = new Set([
  "add_to_cart",
  "remove_from_cart",
  "view_cart",
  "begin_checkout",
  "add_shipping_info",
  "payment_started",
  "coupon_applied",
]);

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
}

function hasAnalyticsConsent(): boolean {
  const consent = parseConsentCookie(readCookie(COOKIE_CONSENT_NAME));
  return consent?.analytics ?? false;
}

/** Anonymous, per-browser session id — never tied to a real identity. */
export function getAnalyticsSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem(SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    return "";
  }
}

function getUtmParams(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    const value = params.get(key);
    if (value) utm[key] = value.slice(0, 100);
  }
  return utm;
}

export interface TrackEventInput {
  type: string;
  productId?: string;
  variantId?: string;
  quantity?: number;
  value?: number;
  currency?: string;
  searchTerm?: string;
  resultsCount?: number;
  path?: string;
}

/**
 * Fire-and-forget event logging (never blocks navigation, never throws).
 * Behavioral event types are skipped entirely when the visitor hasn't
 * opted into analytics cookies — see ESSENTIAL_EVENT_TYPES above.
 */
export function trackEvent(input: TrackEventInput): void {
  if (typeof window === "undefined") return;
  if (!ESSENTIAL_EVENT_TYPES.has(input.type) && !hasAnalyticsConsent()) return;

  const payload = {
    ...input,
    sessionId: getAnalyticsSessionId(),
    path: input.path ?? window.location.pathname,
    referrer: document.referrer || null,
    ...getUtmParams(),
  };

  try {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics/track", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/analytics/track", { method: "POST", body, keepalive: true });
    }
  } catch {
    // Analytics must never break the storefront.
  }
}
