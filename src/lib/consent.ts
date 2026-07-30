/**
 * Cookie consent preferences (essential / analytics / marketing), stored in
 * a first-party cookie so both server and client code can read it. Used to
 * decide whether behavioral analytics events fire and whether optional
 * third-party scripts (GA/GTM/Meta/TikTok) are allowed to load — see
 * src/lib/analytics/track-client.ts and src/components/consent/*.
 */
export const COOKIE_CONSENT_NAME = "mascarauk_cookie_consent";
export const COOKIE_CONSENT_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export interface ConsentPreferences {
  essential: true;
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
}

export function defaultConsent(): ConsentPreferences {
  return { essential: true, preferences: false, analytics: false, marketing: false, decidedAt: "" };
}

export function parseConsentCookie(rawValue: string | undefined | null): ConsentPreferences | null {
  if (!rawValue) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(rawValue));
    if (typeof parsed !== "object" || parsed === null) return null;
    return {
      essential: true,
      preferences: Boolean(parsed.preferences),
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      decidedAt: typeof parsed.decidedAt === "string" ? parsed.decidedAt : "",
    };
  } catch {
    return null;
  }
}

export function serializeConsentCookie(consent: ConsentPreferences): string {
  return encodeURIComponent(JSON.stringify(consent));
}
