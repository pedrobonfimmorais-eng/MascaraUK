"use server";

import { createClient } from "@/lib/supabase/server";
import { sendTemplateEmail, contactMessageReceivedEmail } from "@/lib/email";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { checkRateLimit, recordAttempt } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { t } from "@/i18n";

export interface ContactFormState {
  error: string | null;
  success?: boolean;
}

/**
 * Public contact form submission. Uses the anon client (not the admin
 * client) so it goes through the "anyone can insert" RLS policy on
 * `messages` — reading/updating messages afterwards is staff-only.
 *
 * `website` is a honeypot: a hidden field real visitors never see or fill,
 * but simple spam bots do. When it's filled we silently report success
 * without touching the database, so bots get no feedback that they were
 * caught.
 */
export async function submitContactMessage(
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const website = String(formData.get("website") ?? "");
  if (website.trim() !== "") {
    return { error: null, success: true };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const orderNumber = String(formData.get("orderNumber") ?? "").trim() || null;

  if (!name || !email || !email.includes("@") || !subject || !message) {
    return { error: t("contact.requiredFieldsError") };
  }

  if (message.length > 5000) {
    return { error: t("contact.messageTooLong") };
  }

  const ip = await getClientIp();
  const rateLimit = await checkRateLimit("contact", email, ip);
  if (rateLimit.blocked) {
    const minutes = Math.max(1, Math.ceil(rateLimit.retryAfterSeconds / 60));
    return { error: t("auth.errorTooManyAttempts", { minutes }) };
  }

  const captchaToken = String(formData.get("captchaToken") ?? "");
  const captcha = await verifyTurnstileToken(captchaToken || null, ip);
  if (!captcha.ok) {
    return { error: t("auth.errorCaptchaFailed") };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({
    name,
    email,
    phone,
    subject,
    message,
    order_number: orderNumber,
  });

  await recordAttempt("contact", email, ip, !error);

  if (error) {
    return { error: t("contact.sendFailed") };
  }

  await sendTemplateEmail(email, contactMessageReceivedEmail(name, subject));

  return { error: null, success: true };
}
