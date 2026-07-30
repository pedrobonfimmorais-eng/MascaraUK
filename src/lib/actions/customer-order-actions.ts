"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTemplateEmail, orderCancelledEmail } from "@/lib/email";
import { t } from "@/i18n";

export interface CustomerOrderActionResult {
  ok: boolean;
  message: string;
}

const RETURN_WINDOW_DAYS = 7;

async function loadOwnedOrder(orderId: string) {
  const user = await getCurrentUser();
  if (!user) return { user: null, order: null };

  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order || order.user_id !== user.id) return { user, order: null };

  return { user, order };
}

/**
 * Orders awaiting payment are cancelled outright (nothing was charged yet).
 * Orders already paid but not shipped are flagged for the administrator to
 * review, rather than cancelled automatically — matches "pedidos pagos e
 * ainda não enviados podem ser analisados". Shipped/delivered/cancelled
 * orders can't be cancelled from here at all.
 */
export async function requestOrderCancellation(orderId: string): Promise<CustomerOrderActionResult> {
  const { order } = await loadOwnedOrder(orderId);
  if (!order) return { ok: false, message: t("account.orderNotFound") };

  if (["enviado", "entregue", "cancelado", "devolvido"].includes(order.status)) {
    return { ok: false, message: t("account.orderCannotBeCancelledHere") };
  }

  const admin = createAdminClient();

  if (order.payment_status === "aguardando_pagamento") {
    if (!order.stock_confirmed) {
      const { data: items } = await admin.from("order_items").select("product_id, variant_id, quantity").eq("order_id", order.id);
      for (const item of items ?? []) {
        if (!item.product_id) continue;
        await admin.rpc("release_stock", {
          p_product_id: item.product_id,
          p_variant_id: item.variant_id,
          p_qty: item.quantity,
        });
      }
    }

    await admin
      .from("orders")
      .update({ status: "cancelado", payment_status: "cancelado", cancelled_at: new Date().toISOString() })
      .eq("id", order.id);

    await admin.from("order_events").insert({
      order_id: order.id,
      event_type: "pedido_cancelado",
      previous_status: order.status,
      new_status: "cancelado",
      note: "Cancelled by the customer before payment confirmation.",
    });

    await sendTemplateEmail(
      order.customer_email,
      orderCancelledEmail(
        order.order_number,
        order.customer_first_name ?? order.customer_name,
        `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/minha-conta/pedidos`
      )
    );

    revalidatePath(`/minha-conta/pedidos/${order.id}`);
    revalidatePath("/minha-conta/pedidos");
    return { ok: true, message: t("account.orderCancelledMessage") };
  }

  await admin.from("order_events").insert({
    order_id: order.id,
    event_type: "cancelamento_solicitado",
    note: "Customer requested cancellation of this order.",
  });

  revalidatePath(`/minha-conta/pedidos/${order.id}`);
  return { ok: true, message: t("account.cancellationRequested") };
}

/** Only available for delivered orders, within the returns window. */
export async function requestOrderReturn(orderId: string): Promise<CustomerOrderActionResult> {
  const { order } = await loadOwnedOrder(orderId);
  if (!order) return { ok: false, message: t("account.orderNotFound") };

  if (order.status !== "entregue") {
    return { ok: false, message: t("account.onlyDeliveredOrdersCanBeReturned") };
  }

  if (order.delivered_at) {
    const daysSinceDelivery = (Date.now() - new Date(order.delivered_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceDelivery > RETURN_WINDOW_DAYS) {
      return { ok: false, message: t("account.returnWindowExpired", { days: RETURN_WINDOW_DAYS }) };
    }
  }

  const admin = createAdminClient();
  await admin.from("orders").update({ status: "devolucao_solicitada" }).eq("id", order.id);
  await admin.from("order_events").insert({
    order_id: order.id,
    event_type: "devolucao_solicitada",
    previous_status: "entregue",
    new_status: "devolucao_solicitada",
    note: "Customer requested a return.",
  });

  revalidatePath(`/minha-conta/pedidos/${order.id}`);
  return { ok: true, message: t("account.returnRequested") };
}
