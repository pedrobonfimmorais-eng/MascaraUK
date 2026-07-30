import "server-only";
import { Resend } from "resend";

let cachedClient: Resend | null = null;

/**
 * Lazily creates the Resend client. Mirrors the Stripe client pattern
 * (src/lib/stripe/server.ts): the app must keep working before e-mail is
 * configured, so a missing RESEND_API_KEY degrades to a logged no-op
 * instead of throwing and breaking the order flow.
 */
function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!cachedClient) cachedClient = new Resend(apiKey);
  return cachedClient;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
}

export interface SendEmailResult {
  ok: boolean;
}

/**
 * Sends a transactional e-mail through Resend. Never throws: order
 * confirmation, payment and admin-notice e-mails are important but must
 * never block or fail the checkout/webhook flow they're attached to.
 * When RESEND_API_KEY isn't set yet, the e-mail is logged to the server
 * console instead — useful for local development and Stripe test payments.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const from = process.env.EMAIL_FROM ?? "MascaraUK <pedidos@mascarauk.example>";
  const resend = getResendClient();

  if (!resend) {
    console.info(
      `[email] RESEND_API_KEY não configurado — e-mail simulado (não enviado). Assunto: "${input.subject}" | Para: ${input.to}`
    );
    return { ok: false };
  }

  try {
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });

    if (error) {
      console.error("[email] Falha ao enviar e-mail:", error);
      return { ok: false };
    }

    return { ok: true };
  } catch (error) {
    console.error("[email] Falha ao enviar e-mail:", error);
    return { ok: false };
  }
}

/** Sends a { subject, html } template (see src/lib/email/templates.ts) to a specific recipient. */
export async function sendTemplateEmail(to: string, template: EmailTemplate): Promise<SendEmailResult> {
  return sendEmail({ to, subject: template.subject, html: template.html });
}
