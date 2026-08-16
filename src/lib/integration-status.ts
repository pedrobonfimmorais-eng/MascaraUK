import "server-only";

export type IntegrationState = "funcionando" | "nao_configurado" | "modo_teste";

export interface PaymentIntegrationStatus {
  state: IntegrationState;
  webhookConfigured: boolean;
  publishableKeyConfigured: boolean;
}

/**
 * Status only — never returns the actual key value. Test vs. production
 * mode is inferred from the Stripe secret key's own prefix (sk_test_ /
 * sk_live_), which Stripe guarantees never changes meaning.
 */
export function getPaymentIntegrationStatus(): PaymentIntegrationStatus {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookConfigured = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
  const publishableKeyConfigured = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

  if (!secretKey) return { state: "nao_configurado", webhookConfigured, publishableKeyConfigured };
  if (secretKey.startsWith("sk_test_")) return { state: "modo_teste", webhookConfigured, publishableKeyConfigured };
  return { state: "funcionando", webhookConfigured, publishableKeyConfigured };
}

export function getEmailIntegrationStatus(): { state: IntegrationState } {
  return { state: process.env.RESEND_API_KEY ? "funcionando" : "nao_configurado" };
}

export function getDatabaseIntegrationStatus(): { state: IntegrationState } {
  return {
    state: process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "funcionando" : "nao_configurado",
  };
}

export function getStorageIntegrationStatus(): { state: IntegrationState } {
  return { state: process.env.SUPABASE_SERVICE_ROLE_KEY ? "funcionando" : "nao_configurado" };
}

export function getDomainStatus(): { state: IntegrationState; url: string } {
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return { state: url.includes("localhost") ? "nao_configurado" : "funcionando", url };
}
