import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendTemplateEmail,
  paymentConfirmedEmail,
  paymentFailedEmail,
  paymentExpiredEmail,
  refundEmail,
  adminNewOrderEmail,
  adminPaymentErrorEmail,
  type OrderEmailItem,
} from "@/lib/email";

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Stripe webhook endpoint. Configure this URL (`/api/stripe/webhook`) in the
 * Stripe Dashboard (or via `stripe listen --forward-to` locally) and set
 * STRIPE_WEBHOOK_SECRET so signatures can be verified.
 *
 * Every event is recorded in `stripe_webhook_events` (keyed by Stripe's own
 * event.id) BEFORE any side effect runs. That insert is the single point of
 * truth for "already processed" — if Stripe redelivers the same event, the
 * insert hits a primary-key conflict and this handler returns immediately
 * without creating a second order, reducing stock twice, or sending a
 * duplicate e-mail.
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

  const admin = createAdminClient();

  const orderIdHint = extractOrderIdHint(event);
  const { error: dedupeError } = await admin
    .from("stripe_webhook_events")
    .insert({ id: event.id, event_type: event.type, order_id: orderIdHint });

  if (dedupeError) {
    // Either already processed (primary key conflict — the expected case
    // for a Stripe retry/duplicate delivery) or a transient DB error; in
    // both cases we must NOT reprocess, so acknowledge and stop here.
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(admin, event.data.object as Stripe.Checkout.Session);
        break;
      case "checkout.session.expired":
        await handleCheckoutSessionExpired(admin, event.data.object as Stripe.Checkout.Session);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(admin, event.data.object as Stripe.PaymentIntent);
        break;
      case "charge.refunded":
        await handleChargeRefunded(admin, event.data.object as Stripe.Charge);
        break;
      case "charge.dispute.created":
        await handleDisputeCreated(admin, event.data.object as Stripe.Dispute);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error(`[stripe-webhook] Falha ao processar evento ${event.type} (${event.id}):`, error);
    // Still acknowledge with 200: the event is already marked as seen above,
    // and returning an error would make Stripe retry indefinitely into a
    // handler we know will hit the same dedupe row. Failures are logged for
    // the administrator to investigate manually.
  }

  return NextResponse.json({ received: true });
}

function extractOrderIdHint(event: Stripe.Event): string | null {
  const object = event.data.object as { metadata?: Record<string, string> };
  return object.metadata?.order_id ?? null;
}

async function getOrderById(admin: AdminClient, orderId: string) {
  const { data } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
  return data;
}

async function getOrderItems(admin: AdminClient, orderId: string) {
  const { data } = await admin.from("order_items").select("*").eq("order_id", orderId);
  return data ?? [];
}

function toEmailItems(items: { product_name_snapshot: string; variant_label_snapshot: string | null; quantity: number; unit_price: number; image_url_snapshot: string | null }[]): OrderEmailItem[] {
  return items.map((item) => ({
    name: item.product_name_snapshot,
    variantLabel: item.variant_label_snapshot,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    imageUrl: item.image_url_snapshot,
  }));
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

async function handleCheckoutSessionCompleted(admin: AdminClient, session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.order_id;
  if (!orderId) return;

  const order = await getOrderById(admin, orderId);
  if (!order) return;

  // Defensive double-check: never re-confirm a payment already marked as paid.
  if (order.payment_status === "pago") return;

  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;
  const paidAt = new Date().toISOString();

  await admin
    .from("orders")
    .update({ payment_status: "pago", paid_at: paidAt })
    .eq("id", order.id);

  await admin
    .from("payments")
    .update({ status: "pago", paid_at: paidAt, stripe_payment_intent_id: paymentIntentId })
    .eq("stripe_checkout_session_id", session.id);

  await admin.from("order_events").insert({
    order_id: order.id,
    event_type: "pagamento_confirmado",
    previous_status: order.payment_status,
    new_status: "pago",
  });

  // Reduce stock exactly once, guarded by orders.stock_confirmed — the
  // reservation made at checkout becomes a real, permanent stock decrease.
  if (!order.stock_confirmed) {
    const items = await getOrderItems(admin, order.id);
    for (const item of items) {
      if (!item.product_id) continue;
      await admin.rpc("confirm_stock_sale", {
        p_product_id: item.product_id,
        p_variant_id: item.variant_id,
        p_qty: item.quantity,
        p_order_id: order.id,
        p_order_number: order.order_number,
      });
    }
    await admin.from("orders").update({ stock_confirmed: true }).eq("id", order.id);
    await admin.from("order_events").insert({ order_id: order.id, event_type: "estoque_reduzido" });
  }

  // Clear the customer's cart now that the order is truly paid for.
  if (order.user_id) {
    const { data: userCart } = await admin.from("carts").select("id").eq("user_id", order.user_id).maybeSingle();
    if (userCart) await admin.from("cart_items").delete().eq("cart_id", userCart.id);
  }

  const items = await getOrderItems(admin, order.id);
  const trackingUrl = order.user_id
    ? `${siteUrl()}/minha-conta/pedidos`
    : `${siteUrl()}/pedido-confirmado?pedido=${order.order_number}`;

  await sendTemplateEmail(
    order.customer_email,
    paymentConfirmedEmail({
      orderNumber: order.order_number,
      customerName: order.customer_first_name ?? order.customer_name,
      items: toEmailItems(items),
      subtotal: order.subtotal,
      discountTotal: order.discount_total,
      shippingTotal: order.shipping_total,
      total: order.total,
      currency: order.currency,
      address: shippingSnapshotToEmailAddress(order.shipping_address_snapshot),
      deliveryEstimate: null,
      trackingUrl,
    })
  );

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (adminEmail) {
    await sendTemplateEmail(
      adminEmail,
      adminNewOrderEmail({
        orderNumber: order.order_number,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
        address: shippingSnapshotToEmailAddress(order.shipping_address_snapshot),
        items: toEmailItems(items),
        total: order.total,
        currency: order.currency,
        adminUrl: `${siteUrl()}/admin/pedidos/${order.id}`,
      })
    );
  }
}

async function releaseOrderStock(admin: AdminClient, orderId: string) {
  const items = await getOrderItems(admin, orderId);
  for (const item of items) {
    if (!item.product_id) continue;
    await admin.rpc("release_stock", {
      p_product_id: item.product_id,
      p_variant_id: item.variant_id,
      p_qty: item.quantity,
    });
  }
}

async function handleCheckoutSessionExpired(admin: AdminClient, session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.order_id;
  if (!orderId) return;

  const order = await getOrderById(admin, orderId);
  if (!order || order.payment_status === "pago") return;

  await admin.from("orders").update({ payment_status: "expirado" }).eq("id", order.id);
  await admin
    .from("payments")
    .update({ status: "expirado" })
    .eq("stripe_checkout_session_id", session.id);

  await releaseOrderStock(admin, order.id);

  await admin.from("order_events").insert({
    order_id: order.id,
    event_type: "pagamento_expirado",
    previous_status: order.payment_status,
    new_status: "expirado",
  });

  await sendTemplateEmail(
    order.customer_email,
    paymentExpiredEmail(order.order_number, order.customer_first_name ?? order.customer_name, `${siteUrl()}/carrinho`)
  );
}

async function handlePaymentIntentFailed(admin: AdminClient, paymentIntent: Stripe.PaymentIntent) {
  const orderId = paymentIntent.metadata?.order_id;
  if (!orderId) return;

  const order = await getOrderById(admin, orderId);
  if (!order || order.payment_status === "pago") return;

  const failureMessage = paymentIntent.last_payment_error?.message ?? "Pagamento recusado pela operadora.";

  await admin.from("orders").update({ payment_status: "recusado" }).eq("id", order.id);
  await admin
    .from("payments")
    .update({ status: "recusado", failure_message: failureMessage })
    .eq("stripe_payment_intent_id", paymentIntent.id);

  await releaseOrderStock(admin, order.id);

  await admin.from("order_events").insert({
    order_id: order.id,
    event_type: "pagamento_recusado",
    previous_status: order.payment_status,
    new_status: "recusado",
    note: failureMessage,
  });

  await sendTemplateEmail(
    order.customer_email,
    paymentFailedEmail(order.order_number, order.customer_first_name ?? order.customer_name, `${siteUrl()}/pagamento-cancelado?pedido=${order.order_number}`)
  );

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (adminEmail) {
    await sendTemplateEmail(
      adminEmail,
      adminPaymentErrorEmail(order.order_number, failureMessage, `${siteUrl()}/admin/pedidos/${order.id}`)
    );
  }
}

async function handleChargeRefunded(admin: AdminClient, charge: Stripe.Charge) {
  const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!paymentIntentId) return;

  const { data: payment } = await admin
    .from("payments")
    .select("id, order_id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();
  if (!payment) return;

  const order = await getOrderById(admin, payment.order_id);
  if (!order) return;

  const amountRefunded = charge.amount_refunded / 100;
  const isFullRefund = charge.amount_refunded >= charge.amount;
  const newPaymentStatus = isFullRefund ? "reembolsado" : "reembolsado_parcial";

  await admin.from("orders").update({ payment_status: newPaymentStatus }).eq("id", order.id);
  await admin.from("payments").update({ status: newPaymentStatus }).eq("id", payment.id);

  const latestRefund = charge.refunds?.data?.[0];
  if (latestRefund) {
    const { data: existingRefund } = await admin
      .from("refunds")
      .select("id")
      .eq("stripe_refund_id", latestRefund.id)
      .maybeSingle();

    if (existingRefund) {
      // Refund was initiated from the admin panel — this webhook is the
      // authoritative confirmation, so flip its status to "concluido" now.
      await admin.from("refunds").update({ status: "concluido" }).eq("id", existingRefund.id);
    } else {
      await admin.from("refunds").insert({
        order_id: order.id,
        payment_id: payment.id,
        stripe_refund_id: latestRefund.id,
        amount: latestRefund.amount / 100,
        currency: order.currency,
        reason: latestRefund.reason ?? null,
        status: "concluido",
      });
    }
  }

  await admin.from("order_events").insert({
    order_id: order.id,
    event_type: "reembolso_realizado",
    previous_status: order.payment_status,
    new_status: newPaymentStatus,
  });

  await sendTemplateEmail(
    order.customer_email,
    refundEmail(
      order.order_number,
      order.customer_first_name ?? order.customer_name,
      amountRefunded,
      order.currency,
      !isFullRefund,
      order.user_id ? `${siteUrl()}/minha-conta/pedidos` : `${siteUrl()}/`
    )
  );
}

async function handleDisputeCreated(admin: AdminClient, dispute: Stripe.Dispute) {
  const paymentIntentId = typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id;
  if (!paymentIntentId) return;

  const { data: payment } = await admin
    .from("payments")
    .select("order_id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();
  if (!payment) return;

  const order = await getOrderById(admin, payment.order_id);
  if (!order) return;

  await admin.from("order_events").insert({
    order_id: order.id,
    event_type: "contestacao_criada",
    note: `Motivo informado ao Stripe: ${dispute.reason}.`,
  });

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (adminEmail) {
    await sendTemplateEmail(
      adminEmail,
      adminPaymentErrorEmail(
        order.order_number,
        `Contestação de pagamento (chargeback) aberta pelo cliente. Motivo: ${dispute.reason}.`,
        `${siteUrl()}/admin/pedidos/${order.id}`
      )
    );
  }
}

function shippingSnapshotToEmailAddress(snapshot: Record<string, unknown> | null) {
  if (!snapshot) return null;
  return {
    recipientName: String(snapshot.recipient_name ?? ""),
    street: String(snapshot.street ?? ""),
    number: String(snapshot.number ?? ""),
    complement: (snapshot.complement as string | null) ?? null,
    neighborhood: String(snapshot.neighborhood ?? ""),
    city: String(snapshot.city ?? ""),
    state: String(snapshot.state ?? ""),
    zipCode: String(snapshot.zip_code ?? ""),
  };
}
