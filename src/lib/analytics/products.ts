import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DateRange } from "@/lib/analytics/period";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toIso(date: Date): string {
  return date.toISOString();
}

function rate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return round2((numerator / denominator) * 100);
}

export interface ProductPerformanceRow {
  id: string;
  name: string;
  imageUrl: string | null;
  categoryName: string | null;
  isActive: boolean;
  stock: number;
  views: number;
  addToCart: number;
  beginCheckout: number;
  purchases: number;
  quantitySold: number;
  revenue: number;
  conversionRate: number | null;
  refundedAmount: number;
  returnedQuantity: number;
}

export type ProductSortKey =
  | "mostViewed"
  | "mostAddedToCart"
  | "bestSelling"
  | "highestRevenue"
  | "highestConversion"
  | "lowestConversion"
  | "mostAbandoned"
  | "mostRefunded";

async function getEventCountsByProduct(
  range: DateRange,
  includeTest: boolean,
  eventType: string
): Promise<Map<string, number>> {
  const admin = createAdminClient();
  let query = admin
    .from("analytics_events")
    .select("product_id")
    .eq("event_type", eventType)
    .not("product_id", "is", null)
    .gte("created_at", toIso(range.start))
    .lt("created_at", toIso(range.end));
  if (!includeTest) query = query.eq("is_test", false);

  const { data } = await query;
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.product_id) continue;
    counts.set(row.product_id, (counts.get(row.product_id) ?? 0) + 1);
  }
  return counts;
}

export async function getProductPerformance(
  range: DateRange,
  includeTest: boolean
): Promise<ProductPerformanceRow[]> {
  const admin = createAdminClient();

  const [{ data: products }, views, addToCart, beginCheckout] = await Promise.all([
    admin
      .from("products")
      .select("id, name, is_active, category_id, categories(name), product_images(url, is_primary)")
      .limit(500),
    getEventCountsByProduct(range, includeTest, "product_view"),
    getEventCountsByProduct(range, includeTest, "add_to_cart"),
    getEventCountsByProduct(range, includeTest, "begin_checkout"),
  ]);

  const productIds = (products ?? []).map((p) => p.id);

  let paidOrdersQuery = admin
    .from("orders")
    .select("id")
    .eq("payment_status", "pago")
    .gte("paid_at", toIso(range.start))
    .lt("paid_at", toIso(range.end));
  if (!includeTest) paidOrdersQuery = paidOrdersQuery.eq("is_test", false);
  const { data: paidOrders } = await paidOrdersQuery;
  const paidOrderIds = (paidOrders ?? []).map((o) => o.id);

  const { data: items } =
    paidOrderIds.length > 0
      ? await admin.from("order_items").select("order_id, product_id, quantity, total").in("order_id", paidOrderIds)
      : { data: [] };

  const purchasesByProduct = new Map<string, { orders: Set<string>; quantity: number; revenue: number }>();
  for (const item of items ?? []) {
    if (!item.product_id) continue;
    const entry = purchasesByProduct.get(item.product_id) ?? { orders: new Set(), quantity: 0, revenue: 0 };
    entry.orders.add(item.order_id);
    entry.quantity += item.quantity;
    entry.revenue += item.total;
    purchasesByProduct.set(item.product_id, entry);
  }

  const { data: inventoryRows } = productIds.length > 0 ? await admin.from("inventory").select("product_id, quantity, reserved_quantity").in("product_id", productIds) : { data: [] };
  const stockByProduct = new Map<string, number>();
  for (const row of inventoryRows ?? []) {
    stockByProduct.set(row.product_id, (stockByProduct.get(row.product_id) ?? 0) + Math.max(0, row.quantity - row.reserved_quantity));
  }

  const { data: refundRows } =
    paidOrderIds.length > 0
      ? await admin.from("refunds").select("order_id, amount").in("order_id", paidOrderIds).eq("status", "concluido")
      : { data: [] };
  const refundedOrderIds = new Set((refundRows ?? []).map((r) => r.order_id));
  const totalRefundedByOrder = new Map<string, number>();
  for (const r of refundRows ?? []) {
    totalRefundedByOrder.set(r.order_id, (totalRefundedByOrder.get(r.order_id) ?? 0) + r.amount);
  }

  return (products ?? []).map((product) => {
    const purchase = purchasesByProduct.get(product.id);
    const productImages = (product as unknown as { product_images?: { url: string; is_primary: boolean }[] }).product_images ?? [];
    const primaryImage = productImages.find((i) => i.is_primary) ?? productImages[0];
    const categoryName = (product as unknown as { categories?: { name: string } | { name: string }[] | null }).categories;
    const categoryLabel = Array.isArray(categoryName) ? categoryName[0]?.name : categoryName?.name;

    // Approximates refunded amount attributable to this product proportionally to its share of the refunded order's revenue.
    let refundedAmount = 0;
    if (purchase) {
      for (const orderId of purchase.orders) {
        if (refundedOrderIds.has(orderId)) {
          refundedAmount += totalRefundedByOrder.get(orderId) ?? 0;
        }
      }
    }

    return {
      id: product.id,
      name: product.name,
      imageUrl: primaryImage?.url ?? null,
      categoryName: categoryLabel ?? null,
      isActive: product.is_active,
      stock: stockByProduct.get(product.id) ?? 0,
      views: views.get(product.id) ?? 0,
      addToCart: addToCart.get(product.id) ?? 0,
      beginCheckout: beginCheckout.get(product.id) ?? 0,
      purchases: purchase?.orders.size ?? 0,
      quantitySold: purchase?.quantity ?? 0,
      revenue: round2(purchase?.revenue ?? 0),
      conversionRate: rate(purchase?.orders.size ?? 0, views.get(product.id) ?? 0),
      refundedAmount: round2(refundedAmount),
      returnedQuantity: 0,
    };
  });
}

export function sortProductPerformance(rows: ProductPerformanceRow[], sort: ProductSortKey): ProductPerformanceRow[] {
  const copy = [...rows];
  switch (sort) {
    case "mostViewed":
      return copy.sort((a, b) => b.views - a.views);
    case "mostAddedToCart":
      return copy.sort((a, b) => b.addToCart - a.addToCart);
    case "bestSelling":
      return copy.sort((a, b) => b.quantitySold - a.quantitySold);
    case "highestRevenue":
      return copy.sort((a, b) => b.revenue - a.revenue);
    case "highestConversion":
      return copy.sort((a, b) => (b.conversionRate ?? -1) - (a.conversionRate ?? -1));
    case "lowestConversion":
      return copy.sort((a, b) => (a.conversionRate ?? 101) - (b.conversionRate ?? 101));
    case "mostAbandoned":
      return copy.sort((a, b) => b.addToCart - b.quantitySold - (a.addToCart - a.quantitySold));
    case "mostRefunded":
      return copy.sort((a, b) => b.refundedAmount - a.refundedAmount);
    default:
      return copy;
  }
}

export interface ProductFunnel {
  views: number;
  uniqueVisitors: number;
  addToCart: number;
  removeFromCart: number;
  beginCheckout: number;
  purchases: number;
  quantitySold: number;
  revenue: number;
  discountGiven: number;
  refundedAmount: number;
  addToCartRate: number | null;
  beginCheckoutRate: number | null;
  conversionRate: number | null;
  abandonmentRate: number | null;
}

export async function getProductFunnel(productId: string, range: DateRange, includeTest: boolean): Promise<ProductFunnel> {
  const admin = createAdminClient();

  let eventsQuery = admin
    .from("analytics_events")
    .select("event_type, session_id")
    .eq("product_id", productId)
    .gte("created_at", toIso(range.start))
    .lt("created_at", toIso(range.end));
  if (!includeTest) eventsQuery = eventsQuery.eq("is_test", false);
  const { data: events } = await eventsQuery;

  const views = (events ?? []).filter((e) => e.event_type === "product_view").length;
  const uniqueVisitors = new Set(
    (events ?? []).filter((e) => e.event_type === "product_view" && e.session_id).map((e) => e.session_id)
  ).size;
  const addToCart = (events ?? []).filter((e) => e.event_type === "add_to_cart").length;
  const removeFromCart = (events ?? []).filter((e) => e.event_type === "remove_from_cart").length;
  const beginCheckout = (events ?? []).filter((e) => e.event_type === "begin_checkout").length;

  let paidOrdersQuery = admin
    .from("orders")
    .select("id, discount_total")
    .eq("payment_status", "pago")
    .gte("paid_at", toIso(range.start))
    .lt("paid_at", toIso(range.end));
  if (!includeTest) paidOrdersQuery = paidOrdersQuery.eq("is_test", false);
  const { data: paidOrders } = await paidOrdersQuery;
  const paidOrderIds = (paidOrders ?? []).map((o) => o.id);

  const { data: items } =
    paidOrderIds.length > 0
      ? await admin
          .from("order_items")
          .select("order_id, quantity, total, discount_amount")
          .eq("product_id", productId)
          .in("order_id", paidOrderIds)
      : { data: [] };

  const purchaseOrderIds = new Set((items ?? []).map((i) => i.order_id));
  const quantitySold = (items ?? []).reduce((sum, i) => sum + i.quantity, 0);
  const revenue = round2((items ?? []).reduce((sum, i) => sum + i.total, 0));
  const discountGiven = round2((items ?? []).reduce((sum, i) => sum + i.discount_amount, 0));

  const { data: refundRows } =
    purchaseOrderIds.size > 0
      ? await admin.from("refunds").select("order_id, amount").in("order_id", [...purchaseOrderIds]).eq("status", "concluido")
      : { data: [] };
  const refundedAmount = round2((refundRows ?? []).reduce((sum, r) => sum + r.amount, 0));

  const purchases = purchaseOrderIds.size;

  return {
    views,
    uniqueVisitors,
    addToCart,
    removeFromCart,
    beginCheckout,
    purchases,
    quantitySold,
    revenue,
    discountGiven,
    refundedAmount,
    addToCartRate: rate(addToCart, views),
    beginCheckoutRate: rate(beginCheckout, addToCart),
    conversionRate: rate(purchases, views),
    abandonmentRate: views > 0 ? round2(100 - (rate(purchases, views) ?? 0)) : null,
  };
}

export interface VariantPerformance {
  id: string;
  label: string;
  views: number;
  addToCart: number;
  quantitySold: number;
  stock: number;
  isActive: boolean;
}

export async function getVariantPerformance(productId: string, range: DateRange, includeTest: boolean): Promise<VariantPerformance[]> {
  const admin = createAdminClient();

  const { data: variants } = await admin
    .from("product_variants")
    .select("id, name, value, is_active")
    .eq("product_id", productId);
  if (!variants || variants.length === 0) return [];

  const { data: inventoryRows } = await admin
    .from("inventory")
    .select("variant_id, quantity, reserved_quantity")
    .eq("product_id", productId)
    .not("variant_id", "is", null);
  const stockByVariant = new Map((inventoryRows ?? []).map((r) => [r.variant_id, Math.max(0, r.quantity - r.reserved_quantity)]));

  let eventsQuery = admin
    .from("analytics_events")
    .select("event_type, variant_id")
    .eq("product_id", productId)
    .not("variant_id", "is", null)
    .gte("created_at", toIso(range.start))
    .lt("created_at", toIso(range.end));
  if (!includeTest) eventsQuery = eventsQuery.eq("is_test", false);
  const { data: events } = await eventsQuery;

  let paidOrdersQuery = admin
    .from("orders")
    .select("id")
    .eq("payment_status", "pago")
    .gte("paid_at", toIso(range.start))
    .lt("paid_at", toIso(range.end));
  if (!includeTest) paidOrdersQuery = paidOrdersQuery.eq("is_test", false);
  const { data: paidOrders } = await paidOrdersQuery;
  const paidOrderIds = (paidOrders ?? []).map((o) => o.id);

  const { data: items } =
    paidOrderIds.length > 0
      ? await admin.from("order_items").select("variant_id, quantity").eq("product_id", productId).in("order_id", paidOrderIds)
      : { data: [] };

  return variants.map((variant) => ({
    id: variant.id,
    label: `${variant.name}: ${variant.value}`,
    views: (events ?? []).filter((e) => e.event_type === "product_view" && e.variant_id === variant.id).length,
    addToCart: (events ?? []).filter((e) => e.event_type === "add_to_cart" && e.variant_id === variant.id).length,
    quantitySold: (items ?? []).filter((i) => i.variant_id === variant.id).reduce((sum, i) => sum + i.quantity, 0),
    stock: stockByVariant.get(variant.id) ?? 0,
    isActive: variant.is_active,
  }));
}
