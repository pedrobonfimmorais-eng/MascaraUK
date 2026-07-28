import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Stripe webhook endpoint. Configure this URL (`/api/stripe/webhook`) in the
 * Stripe Dashboard (or via `stripe listen --forward-to` locally) and set
 * STRIPE_WEBHOOK_SECRET so signatures can be verified.
 *
 * Uses the Supabase admin (service role) client because this request has no
 * end-user session — Stripe is calling the server directly.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 400 });
  }

  const payload = await request.text();
  const stripe = getStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;

    if (orderId) {
      const supabase = createAdminClient();

      await supabase
        .from("orders")
        .update({ status: "pagamento_confirmado" })
        .eq("id", orderId);

      await supabase
        .from("payments")
        .update({
          status: "pago",
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id:
            typeof session.payment_intent === "string" ? session.payment_intent : null,
        })
        .eq("stripe_checkout_session_id", session.id);
    }
  }

  return NextResponse.json({ received: true });
}
