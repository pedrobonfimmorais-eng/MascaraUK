import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DeviceType, ReferrerType } from "@/types/database";

/**
 * Client-side event ingestion endpoint (see src/lib/analytics/track-client.ts).
 * "purchase" and "refund" are intentionally NOT accepted here — those are
 * only ever recorded server-side from the Stripe webhook once a payment is
 * actually confirmed, so a visitor's browser can never fabricate a sale.
 */
const ALLOWED_EVENT_TYPES = new Set([
  "page_view",
  "product_view",
  "search",
  "category_view",
  "add_to_cart",
  "remove_from_cart",
  "view_cart",
  "begin_checkout",
  "add_shipping_info",
  "payment_started",
  "coupon_applied",
  "wishlist_add",
]);

function detectDeviceType(userAgent: string): DeviceType {
  const ua = userAgent.toLowerCase();
  if (/tablet|ipad/.test(ua)) return "tablet";
  if (/mobile|android|iphone/.test(ua)) return "mobile";
  if (ua) return "desktop";
  return "desconhecido";
}

function detectReferrerType(referrer: string | null, hasUtm: boolean): ReferrerType {
  if (hasUtm) return "campanha";
  if (!referrer) return "direto";
  try {
    const host = new URL(referrer).host.toLowerCase();
    if (/google\.|bing\.|duckduckgo\.|yahoo\./.test(host)) return "pesquisa";
    if (/facebook\.|instagram\.|tiktok\.|twitter\.|x\.com|linkedin\.|pinterest\./.test(host)) return "rede_social";
    return "link_externo";
  } catch {
    return "desconhecido";
  }
}

export async function POST(request: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false }, { status: 202 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const type = String(payload.type ?? "");
  if (!ALLOWED_EVENT_TYPES.has(type)) {
    return NextResponse.json({ error: "invalid event type" }, { status: 400 });
  }

  const sessionId = String(payload.sessionId ?? "").slice(0, 100) || null;
  const path = String(payload.path ?? "").slice(0, 300) || null;
  const referrer = payload.referrer ? String(payload.referrer).slice(0, 500) : null;
  const utmSource = payload.utm_source ? String(payload.utm_source).slice(0, 100) : null;
  const utmMedium = payload.utm_medium ? String(payload.utm_medium).slice(0, 100) : null;
  const utmCampaign = payload.utm_campaign ? String(payload.utm_campaign).slice(0, 100) : null;
  const utmContent = payload.utm_content ? String(payload.utm_content).slice(0, 100) : null;
  const utmTerm = payload.utm_term ? String(payload.utm_term).slice(0, 100) : null;

  const deviceType = detectDeviceType(request.headers.get("user-agent") ?? "");
  const referrerType = detectReferrerType(referrer, Boolean(utmSource || utmCampaign));

  const admin = createAdminClient();

  await admin.from("analytics_events").insert({
    event_type: type,
    session_id: sessionId,
    product_id: typeof payload.productId === "string" ? payload.productId : null,
    variant_id: typeof payload.variantId === "string" ? payload.variantId : null,
    quantity: typeof payload.quantity === "number" ? payload.quantity : null,
    value: typeof payload.value === "number" ? payload.value : null,
    currency: typeof payload.currency === "string" ? payload.currency : null,
    device_type: deviceType,
    referrer_type: referrerType,
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    utm_content: utmContent,
    utm_term: utmTerm,
    path,
    metadata:
      type === "search"
        ? { term: String(payload.searchTerm ?? "").slice(0, 100), resultsCount: payload.resultsCount ?? 0 }
        : null,
  });

  if (type === "search") {
    const term = String(payload.searchTerm ?? "").trim().slice(0, 100);
    if (term) {
      await admin.from("search_queries").insert({
        term,
        results_count: typeof payload.resultsCount === "number" ? payload.resultsCount : 0,
        session_id: sessionId,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
