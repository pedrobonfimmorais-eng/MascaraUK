"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/actions/activity-log";
import { getStripeClient } from "@/lib/stripe/server";
import {
  sendTemplateEmail,
  orderReceivedEmail,
  paymentConfirmedEmail,
  orderPreparingEmail,
  orderShippedEmail,
  orderDeliveredEmail,
  orderCancelledEmail,
  returnReceivedEmail,
  type OrderEmailAddress,
} from "@/lib/email";
import type { Order, OrderStatus } from "@/types/database";

export interface AdminOrderActionResult {
  ok: boolean;
  message: string;
}

const UNAUTHORIZED: AdminOrderActionResult = { ok: false, message: "Acesso não autorizado." };

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function toEmailAddress(snapshot: Record<string, unknown> | null): OrderEmailAddress | null {
  if (!snapshot) return null;
  return {
    recipientName: String(snapshot.recipient_name ?? ""),
    companyName: (snapshot.company_name as string | null) ?? null,
    addressLine1: String(snapshot.address_line1 ?? ""),
    addressLine2: (snapshot.address_line2 as string | null) ?? null,
    townCity: String(snapshot.town_city ?? ""),
    county: (snapshot.county as string | null) ?? null,
    postcode: String(snapshot.postcode ?? ""),
    country: String(snapshot.country ?? "United Kingdom"),
  };
}

async function loadOrder(admin: ReturnType<typeof createAdminClient>, orderId: string): Promise<Order | null> {
  const { data } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
  return data;
}

function revalidateOrder(orderId: string) {
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/pedidos");
  revalidatePath(`/minha-conta/pedidos/${orderId}`);
  revalidatePath("/minha-conta/pedidos");
}

/** Generic status transition, logged to order_events with who/what/before/after. */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  note?: string
): Promise<AdminOrderActionResult> {
  const admin = await requirePermission("orders.manage");
  if (!admin) return UNAUTHORIZED;

  const supabaseAdmin = createAdminClient();
  const order = await loadOrder(supabaseAdmin, orderId);
  if (!order) return { ok: false, message: "Pedido não encontrado." };

  if (newStatus === "enviado" && !order.tracking_code) {
    return { ok: false, message: "Adicione o código de rastreio antes de marcar como enviado." };
  }

  const updates: Partial<Order> = { status: newStatus };
  if (newStatus === "entregue") updates.delivered_at = new Date().toISOString();

  await supabaseAdmin.from("orders").update(updates).eq("id", order.id);
  await supabaseAdmin.from("order_events").insert({
    order_id: order.id,
    event_type: "status_alterado",
    previous_status: order.status,
    new_status: newStatus,
    note: note ?? null,
    admin_id: admin.id,
  });
  await logAdminAction({
    adminId: admin.id,
    action: "pedido_status_alterado",
    entityType: "order",
    entityId: order.id,
    details: { orderNumber: order.order_number, previousStatus: order.status, newStatus },
  });

  const trackingUrl = order.user_id ? `${siteUrl()}/minha-conta/pedidos/${order.id}` : `${siteUrl()}/`;

  if (newStatus === "em_preparacao") {
    await sendTemplateEmail(
      order.customer_email,
      orderPreparingEmail({
        orderNumber: order.order_number,
        customerName: order.customer_first_name ?? order.customer_name,
        items: [],
        subtotal: order.subtotal,
        discountTotal: order.discount_total,
        shippingTotal: order.shipping_total,
        total: order.total,
        currency: order.currency,
        address: toEmailAddress(order.shipping_address_snapshot),
        deliveryEstimate: null,
        trackingUrl,
      })
    );
  } else if (newStatus === "entregue") {
    await sendTemplateEmail(
      order.customer_email,
      orderDeliveredEmail({
        orderNumber: order.order_number,
        customerName: order.customer_first_name ?? order.customer_name,
        items: [],
        subtotal: order.subtotal,
        discountTotal: order.discount_total,
        shippingTotal: order.shipping_total,
        total: order.total,
        currency: order.currency,
        address: toEmailAddress(order.shipping_address_snapshot),
        deliveryEstimate: null,
        trackingUrl,
      })
    );
  } else if (newStatus === "devolvido") {
    await sendTemplateEmail(
      order.customer_email,
      returnReceivedEmail(order.order_number, order.customer_first_name ?? order.customer_name, trackingUrl)
    );
  }

  revalidateOrder(order.id);
  return { ok: true, message: "Status atualizado." };
}

export async function addTrackingInfo(
  orderId: string,
  data: { carrier: string; code: string; url: string }
): Promise<AdminOrderActionResult> {
  const admin = await requirePermission("orders.manage");
  if (!admin) return UNAUTHORIZED;

  if (!data.code.trim()) return { ok: false, message: "Informe o código de rastreio." };

  const supabaseAdmin = createAdminClient();
  const order = await loadOrder(supabaseAdmin, orderId);
  if (!order) return { ok: false, message: "Pedido não encontrado." };

  const wasAlreadyShipped = order.status === "enviado" || order.status === "entregue";
  const updates: Partial<Order> = {
    tracking_carrier: data.carrier || null,
    tracking_code: data.code,
    tracking_url: data.url || null,
  };
  if (!wasAlreadyShipped) {
    updates.status = "enviado";
    updates.shipped_at = new Date().toISOString();
  }

  await supabaseAdmin.from("orders").update(updates).eq("id", order.id);
  await supabaseAdmin.from("order_events").insert({
    order_id: order.id,
    event_type: "rastreio_adicionado",
    previous_status: order.status,
    new_status: updates.status ?? order.status,
    note: `${data.carrier ? `${data.carrier} — ` : ""}${data.code}`,
    admin_id: admin.id,
  });
  await logAdminAction({
    adminId: admin.id,
    action: "pedido_rastreio_adicionado",
    entityType: "order",
    entityId: order.id,
    details: { orderNumber: order.order_number, carrier: data.carrier, code: data.code },
  });

  const trackingUrl = order.user_id ? `${siteUrl()}/minha-conta/pedidos/${order.id}` : `${siteUrl()}/`;

  await sendTemplateEmail(
    order.customer_email,
    orderShippedEmail(
      {
        orderNumber: order.order_number,
        customerName: order.customer_first_name ?? order.customer_name,
        items: [],
        subtotal: order.subtotal,
        discountTotal: order.discount_total,
        shippingTotal: order.shipping_total,
        total: order.total,
        currency: order.currency,
        address: toEmailAddress(order.shipping_address_snapshot),
        deliveryEstimate: null,
        trackingUrl,
      },
      { carrier: data.carrier || null, code: data.code, url: data.url || null }
    )
  );

  revalidateOrder(order.id);
  return { ok: true, message: "Rastreio adicionado e cliente avisado por e-mail." };
}

export async function addInternalNote(orderId: string, note: string): Promise<AdminOrderActionResult> {
  const admin = await requirePermission("orders.manage");
  if (!admin) return UNAUTHORIZED;
  if (!note.trim()) return { ok: false, message: "Escreva uma observação." };

  const supabaseAdmin = createAdminClient();
  await supabaseAdmin.from("order_events").insert({
    order_id: orderId,
    event_type: "observacao_adicionada",
    note,
    admin_id: admin.id,
  });

  revalidateOrder(orderId);
  return { ok: true, message: "Observação adicionada." };
}

async function releaseOrReturnStock(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  order: Order,
  restock: boolean
) {
  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("product_id, variant_id, quantity")
    .eq("order_id", order.id);

  for (const item of items ?? []) {
    if (!item.product_id) continue;

    if (!order.stock_confirmed) {
      await supabaseAdmin.rpc("release_stock", {
        p_product_id: item.product_id,
        p_variant_id: item.variant_id,
        p_qty: item.quantity,
      });
    } else if (restock) {
      await supabaseAdmin.rpc("return_stock_to_inventory", {
        p_product_id: item.product_id,
        p_variant_id: item.variant_id,
        p_qty: item.quantity,
        p_order_id: order.id,
        p_order_number: order.order_number,
        p_reason: "cancelamento",
      });
    }
  }
}

/**
 * Orders not yet shipped can be cancelled directly. When the order was
 * already paid, a Stripe refund is triggered here — the order's
 * payment_status only flips to "reembolsado" once the webhook confirms it
 * (see /api/stripe/webhook), never optimistically.
 */
export async function cancelOrder(
  orderId: string,
  options: { reason: string; restock: boolean }
): Promise<AdminOrderActionResult> {
  const admin = await requirePermission("orders.manage");
  if (!admin) return UNAUTHORIZED;

  const supabaseAdmin = createAdminClient();
  const order = await loadOrder(supabaseAdmin, orderId);
  if (!order) return { ok: false, message: "Pedido não encontrado." };

  if (["enviado", "entregue", "cancelado", "devolvido"].includes(order.status)) {
    return { ok: false, message: "Pedidos enviados não podem ser cancelados diretamente." };
  }

  // Cancelling a paid order triggers a real refund, which is reserved to
  // ADMINISTRADOR_PRINCIPAL even for staff who otherwise manage orders.
  if (order.payment_status === "pago" && !hasPermission(admin, "orders.refund")) {
    return { ok: false, message: "Este pedido já foi pago. Somente o administrador principal pode cancelar e reembolsar." };
  }

  if (order.payment_status === "pago") {
    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("stripe_payment_intent_id")
      .eq("order_id", order.id)
      .eq("status", "pago")
      .maybeSingle();

    if (payment?.stripe_payment_intent_id) {
      try {
        const stripe = getStripeClient();
        const refund = await stripe.refunds.create({ payment_intent: payment.stripe_payment_intent_id });
        await supabaseAdmin.from("refunds").insert({
          order_id: order.id,
          amount: order.total,
          currency: order.currency,
          reason: options.reason,
          internal_note: "Reembolso automático por cancelamento do pedido.",
          status: "pendente",
          stripe_refund_id: refund.id,
          admin_id: admin.id,
        });
      } catch (error) {
        console.error("[admin-orders] Falha ao reembolsar no Stripe:", error);
        return { ok: false, message: "Não foi possível processar o reembolso no Stripe. Tente novamente." };
      }
    }
  }

  await releaseOrReturnStock(supabaseAdmin, order, options.restock);

  await supabaseAdmin
    .from("orders")
    .update({ status: "cancelado", cancelled_at: new Date().toISOString() })
    .eq("id", order.id);

  await supabaseAdmin.from("order_events").insert({
    order_id: order.id,
    event_type: "pedido_cancelado",
    previous_status: order.status,
    new_status: "cancelado",
    note: options.reason,
    admin_id: admin.id,
  });
  await logAdminAction({
    adminId: admin.id,
    action: "pedido_cancelado",
    entityType: "order",
    entityId: order.id,
    details: { orderNumber: order.order_number, reason: options.reason, restock: options.restock },
  });

  const trackingUrl = order.user_id ? `${siteUrl()}/minha-conta/pedidos/${order.id}` : `${siteUrl()}/`;
  await sendTemplateEmail(
    order.customer_email,
    orderCancelledEmail(order.order_number, order.customer_first_name ?? order.customer_name, trackingUrl, options.reason)
  );

  revalidateOrder(order.id);
  return { ok: true, message: "Pedido cancelado." };
}

/** Full or partial refund. Never allows refunding more than what remains unrefunded. */
export async function refundOrder(
  orderId: string,
  options: { amount: number; reason: string; note: string; restock: boolean }
): Promise<AdminOrderActionResult> {
  const admin = await requirePermission("orders.refund");
  if (!admin) return UNAUTHORIZED;

  if (options.amount <= 0) return { ok: false, message: "Informe um valor válido para o reembolso." };

  const supabaseAdmin = createAdminClient();
  const order = await loadOrder(supabaseAdmin, orderId);
  if (!order) return { ok: false, message: "Pedido não encontrado." };

  const { data: existingRefunds } = await supabaseAdmin
    .from("refunds")
    .select("amount, status")
    .eq("order_id", order.id)
    .neq("status", "falhou");

  const alreadyRefunded = (existingRefunds ?? []).reduce((sum, refund) => sum + refund.amount, 0);
  const remaining = order.total - alreadyRefunded;

  if (options.amount > remaining) {
    return { ok: false, message: `O valor máximo disponível para reembolso é ${remaining.toFixed(2)}.` };
  }

  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("stripe_payment_intent_id")
    .eq("order_id", order.id)
    .eq("status", "pago")
    .maybeSingle();

  if (!payment?.stripe_payment_intent_id) {
    return { ok: false, message: "Não há um pagamento confirmado para reembolsar." };
  }

  try {
    const stripe = getStripeClient();
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      amount: Math.round(options.amount * 100),
    });

    await supabaseAdmin.from("refunds").insert({
      order_id: order.id,
      amount: options.amount,
      currency: order.currency,
      reason: options.reason,
      internal_note: options.note || null,
      status: "pendente",
      stripe_refund_id: refund.id,
      admin_id: admin.id,
    });
  } catch (error) {
    console.error("[admin-orders] Falha ao reembolsar no Stripe:", error);
    return { ok: false, message: "Não foi possível processar o reembolso no Stripe." };
  }

  if (options.restock) {
    await releaseOrReturnStock(supabaseAdmin, order, true);
  }

  await supabaseAdmin.from("order_events").insert({
    order_id: order.id,
    event_type: "reembolso_realizado",
    note: `Reembolso de ${options.amount.toFixed(2)} solicitado. Motivo: ${options.reason}.`,
    admin_id: admin.id,
  });
  await logAdminAction({
    adminId: admin.id,
    action: "pedido_reembolsado",
    entityType: "order",
    entityId: order.id,
    details: { orderNumber: order.order_number, amount: options.amount, reason: options.reason },
  });

  revalidateOrder(order.id);
  return { ok: true, message: "Reembolso enviado ao Stripe. O status será confirmado automaticamente." };
}

export async function resendOrderConfirmationEmail(orderId: string): Promise<AdminOrderActionResult> {
  const admin = await requirePermission("orders.manage");
  if (!admin) return UNAUTHORIZED;

  const supabaseAdmin = createAdminClient();
  const order = await loadOrder(supabaseAdmin, orderId);
  if (!order) return { ok: false, message: "Pedido não encontrado." };

  const trackingUrl = order.user_id ? `${siteUrl()}/minha-conta/pedidos/${order.id}` : `${siteUrl()}/pedido-confirmado?pedido=${order.order_number}`;
  const emailData = {
    orderNumber: order.order_number,
    customerName: order.customer_first_name ?? order.customer_name,
    items: [],
    subtotal: order.subtotal,
    discountTotal: order.discount_total,
    shippingTotal: order.shipping_total,
    total: order.total,
    currency: order.currency,
    address: toEmailAddress(order.shipping_address_snapshot),
    deliveryEstimate: null,
    trackingUrl,
  };

  await sendTemplateEmail(
    order.customer_email,
    order.payment_status === "pago" ? paymentConfirmedEmail(emailData) : orderReceivedEmail(emailData)
  );

  return { ok: true, message: "E-mail reenviado ao cliente." };
}

export async function resendTrackingEmail(orderId: string): Promise<AdminOrderActionResult> {
  const admin = await requirePermission("orders.manage");
  if (!admin) return UNAUTHORIZED;

  const supabaseAdmin = createAdminClient();
  const order = await loadOrder(supabaseAdmin, orderId);
  if (!order || !order.tracking_code) return { ok: false, message: "Este pedido ainda não tem rastreio." };

  const trackingUrl = order.user_id ? `${siteUrl()}/minha-conta/pedidos/${order.id}` : `${siteUrl()}/`;
  await sendTemplateEmail(
    order.customer_email,
    orderShippedEmail(
      {
        orderNumber: order.order_number,
        customerName: order.customer_first_name ?? order.customer_name,
        items: [],
        subtotal: order.subtotal,
        discountTotal: order.discount_total,
        shippingTotal: order.shipping_total,
        total: order.total,
        currency: order.currency,
        address: toEmailAddress(order.shipping_address_snapshot),
        deliveryEstimate: null,
        trackingUrl,
      },
      { carrier: order.tracking_carrier, code: order.tracking_code, url: order.tracking_url }
    )
  );

  return { ok: true, message: "Informações de rastreio reenviadas." };
}
