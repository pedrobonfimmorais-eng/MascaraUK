"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { t } from "@/i18n";
import {
  COOKIE_CONSENT_NAME,
  COOKIE_CONSENT_MAX_AGE_SECONDS,
  parseConsentCookie,
  serializeConsentCookie,
  defaultConsent,
  type ConsentPreferences,
} from "@/lib/consent";
import { Button } from "@/components/ui/Button";

function readCookieFrom(cookieString: string, name: string): string | undefined {
  return cookieString
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
}

function writeConsent(consent: ConsentPreferences) {
  document.cookie = `${COOKIE_CONSENT_NAME}=${serializeConsentCookie(consent)}; path=/; max-age=${COOKIE_CONSENT_MAX_AGE_SECONDS}; SameSite=Lax`;
}

// No native "cookie changed" event exists, so this store never notifies — it
// only exists to read document.cookie once without touching it during SSR
// (getServerSnapshot) and without a setState-in-effect to sync it in.
function subscribeToNothing() {
  return () => {};
}

function getCookieSnapshot(): string {
  return document.cookie;
}

function getServerCookieSnapshot(): string {
  return "";
}

export function CookieConsentBanner() {
  const cookieString = useSyncExternalStore(subscribeToNothing, getCookieSnapshot, getServerCookieSnapshot);
  const hasStoredConsent = parseConsentCookie(readCookieFrom(cookieString, COOKIE_CONSENT_NAME)) !== null;

  const [dismissed, setDismissed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  const visible = !hasStoredConsent && !dismissed;

  function acceptAll() {
    writeConsent({ essential: true, analytics: true, marketing: true, decidedAt: new Date().toISOString() });
    setDismissed(true);
  }

  function acceptEssentialOnly() {
    writeConsent({ ...defaultConsent(), decidedAt: new Date().toISOString() });
    setDismissed(true);
  }

  function savePreferences() {
    writeConsent({ essential: true, analytics, marketing, decidedAt: new Date().toISOString() });
    setDismissed(true);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white p-4 shadow-lg">
      <div className="mx-auto flex max-w-4xl flex-col gap-3">
        <p className="text-sm text-gray-700">
          {t("consent.message")}{" "}
          <Link href="/politica-de-cookies" className="text-brand-primary hover:underline">
            {t("legalLinks.cookiePolicy")}
          </Link>
          .
        </p>

        {showDetails && (
          <div className="flex flex-col gap-2 rounded-lg bg-gray-50 p-3 text-sm">
            <label className="flex items-center gap-2 text-gray-500">
              <input type="checkbox" checked disabled />
              {t("consent.essential")}
            </label>
            <label className="flex items-center gap-2 text-gray-700">
              <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />
              {t("consent.analytics")}
            </label>
            <label className="flex items-center gap-2 text-gray-700">
              <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
              {t("consent.marketing")}
            </label>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={acceptAll}>
            {t("consent.acceptAll")}
          </Button>
          <Button size="sm" variant="outline" onClick={acceptEssentialOnly}>
            {t("consent.essentialOnly")}
          </Button>
          {showDetails ? (
            <Button size="sm" variant="ghost" onClick={savePreferences}>
              {t("consent.savePreferences")}
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setShowDetails(true)}>
              {t("consent.customize")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
