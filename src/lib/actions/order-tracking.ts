"use server";

import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { t } from "@/i18n";

export interface GuestTrackingActionState {
  error: string | null;
  success?: boolean;
}

/**
 * Sends a fresh secure tracking link by e-mail when the order number + the
 * e-mail used in the purchase match — never reveals whether a match was
 * found directly in the response, so this form can't be used to enumerate
 * order numbers or the e-mails behind them.
 */
export async function requestGuestOrderAccess(
  _prevState: GuestTrackingActionState,
  formData: FormData
): Promise<GuestTrackingActionState> {
  const orderNumber = String(formData.get("orderNumber") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!orderNumber || !email) {
    return { error: t("orderTracking.missingFields") };
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, order_number")
    .eq("order_number", orderNumber)
    .ilike("customer_email", email)
    .maybeSingle();

  if (order) {
    const token = randomBytes(32).toString("hex");
    await admin.from("order_access_tokens").insert({
      order_id: order.id,
      token,
      email,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const trackingUrl = `${siteUrl}/pedido-confirmado?pedido=${order.order_number}&token=${token}`;

    await sendEmail({
      to: email,
      subject: t("orderTracking.trackingEmailSubject", { orderNumber: order.order_number }),
      html: `<p>${t("orderTracking.trackingEmailBody", { orderNumber: order.order_number })}</p><p><a href="${trackingUrl}">${trackingUrl}</a></p>`,
    });
  }

  // Always report success — whether or not the order/e-mail matched.
  return { error: null, success: true };
}
