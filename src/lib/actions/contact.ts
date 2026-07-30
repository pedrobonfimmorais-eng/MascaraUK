"use server";

import { createClient } from "@/lib/supabase/server";
import { sendTemplateEmail, contactMessageReceivedEmail } from "@/lib/email";

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
    return { error: "Preencha todos os campos obrigatórios com um e-mail válido." };
  }

  if (message.length > 5000) {
    return { error: "Mensagem muito longa." };
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

  if (error) {
    return { error: "Não foi possível enviar sua mensagem. Tente novamente em instantes." };
  }

  await sendTemplateEmail(email, contactMessageReceivedEmail(name, subject));

  return { error: null, success: true };
}
