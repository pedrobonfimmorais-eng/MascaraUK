import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Order, OrderItem, OrderEvent, Refund } from "@/types/database";

export interface OrderDetailData {
  order: Order;
  items: OrderItem[];
  events: OrderEvent[];
  refunds: Refund[];
}

/**
 * Loads an order and everything needed to render its detail view, using the
 * admin (service role) client — callers are responsible for authorization
 * (matching the signed-in customer, verifying a guest token, or requiring
 * an administrator) before rendering what this returns.
 */
export async function loadOrderDetail(orderId: string): Promise<OrderDetailData | null> {
  const admin = createAdminClient();

  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return null;

  const [{ data: items }, { data: events }, { data: refunds }] = await Promise.all([
    admin.from("order_items").select("*").eq("order_id", orderId).order("created_at", { ascending: true }),
    admin.from("order_events").select("*").eq("order_id", orderId).order("created_at", { ascending: true }),
    admin.from("refunds").select("*").eq("order_id", orderId).order("created_at", { ascending: true }),
  ]);

  return { order, items: items ?? [], events: events ?? [], refunds: refunds ?? [] };
}

export async function loadOrderDetailByNumber(orderNumber: string): Promise<OrderDetailData | null> {
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("id").eq("order_number", orderNumber).maybeSingle();
  if (!order) return null;
  return loadOrderDetail(order.id);
}

/** Validates a guest tracking token (see /acompanhar-pedido, /pedido-confirmado). */
export async function isValidGuestToken(orderId: string, token: string): Promise<boolean> {
  if (!token) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("order_access_tokens")
    .select("id, expires_at")
    .eq("order_id", orderId)
    .eq("token", token)
    .maybeSingle();

  if (!data) return false;
  return new Date(data.expires_at).getTime() > Date.now();
}
