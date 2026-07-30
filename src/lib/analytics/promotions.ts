import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DateRange } from "@/lib/analytics/period";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toIso(date: Date): string {
  return date.toISOString();
}

function overlap(a: DateRange, bStart: Date | null, bEnd: Date | null): DateRange {
  const start = bStart && bStart > a.start ? bStart : a.start;
  const end = bEnd && bEnd < a.end ? bEnd : a.end;
  return { start, end: end > start ? end : start };
}

export interface PromotionAnalyticsRow {
  id: string;
  name: string;
  productIds: string[];
  startsAt: string | null;
  endsAt: string | null;
  views: number;
  addToCart: number;
  purchases: number;
  quantitySold: number;
  revenue: number;
  discountGiven: number;
  conversionRate: number | null;
}

/**
 * Approximate: views/carts/purchases come from the promotion's products
 * during the overlap of its active window and the selected period. This
 * can't isolate exactly which sale was "caused" by the promotion (a product
 * could sell without it) — the UI must show the standard disclaimer.
 */
export async function getPromotionAnalytics(range: DateRange, includeTest: boolean): Promise<PromotionAnalyticsRow[]> {
  const admin = createAdminClient();
  const { data: promotions } = await admin.from("promotions").select("*");
  if (!promotions || promotions.length === 0) return [];

  const rows: PromotionAnalyticsRow[] = [];

  for (const promo of promotions) {
    const promoRange = overlap(
      range,
      promo.starts_at ? new Date(promo.starts_at) : null,
      promo.expires_at ? new Date(promo.expires_at) : null
    );

    let productIds: string[] = [];
    if (promo.product_id) {
      productIds = [promo.product_id];
    } else if (promo.category_id) {
      const { data: products } = await admin.from("products").select("id").eq("category_id", promo.category_id);
      productIds = (products ?? []).map((p) => p.id);
    }

    if (productIds.length === 0) {
      rows.push({
        id: promo.id,
        name: promo.name,
        productIds: [],
        startsAt: promo.starts_at,
        endsAt: promo.expires_at,
        views: 0,
        addToCart: 0,
        purchases: 0,
        quantitySold: 0,
        revenue: 0,
        discountGiven: 0,
        conversionRate: null,
      });
      continue;
    }

    const { data: events } = await admin
      .from("analytics_events")
      .select("event_type, product_id")
      .in("product_id", productIds)
      .gte("created_at", toIso(promoRange.start))
      .lt("created_at", toIso(promoRange.end));

    let ordersQuery = admin
      .from("orders")
      .select("id")
      .eq("payment_status", "pago")
      .gte("paid_at", toIso(promoRange.start))
      .lt("paid_at", toIso(promoRange.end));
    if (!includeTest) ordersQuery = ordersQuery.eq("is_test", false);
    const { data: paidOrders } = await ordersQuery;
    const paidOrderIds = (paidOrders ?? []).map((o) => o.id);

    const { data: items } =
      paidOrderIds.length > 0
        ? await admin
            .from("order_items")
            .select("order_id, product_id, quantity, total, discount_amount")
            .in("product_id", productIds)
            .in("order_id", paidOrderIds)
        : { data: [] };

    const views = (events ?? []).filter((e) => e.event_type === "product_view").length;
    const addToCart = (events ?? []).filter((e) => e.event_type === "add_to_cart").length;
    const purchaseOrders = new Set((items ?? []).map((i) => i.order_id));

    rows.push({
      id: promo.id,
      name: promo.name,
      productIds,
      startsAt: promo.starts_at,
      endsAt: promo.expires_at,
      views,
      addToCart,
      purchases: purchaseOrders.size,
      quantitySold: (items ?? []).reduce((sum, i) => sum + i.quantity, 0),
      revenue: round2((items ?? []).reduce((sum, i) => sum + i.total, 0)),
      discountGiven: round2((items ?? []).reduce((sum, i) => sum + i.discount_amount, 0)),
      conversionRate: views > 0 ? round2((purchaseOrders.size / views) * 100) : null,
    });
  }

  return rows;
}

export interface FlashSaleAnalyticsRow {
  id: string;
  name: string;
  endsAt: string | null;
  views: number;
  addToCart: number;
  purchases: number;
  quantitySold: number;
  revenue: number;
  discountGiven: number;
  conversionRate: number | null;
  stockRemaining: number;
}

/** Never counts sales made after flash_sale_ends_at as part of the flash sale. */
export async function getFlashSaleAnalytics(includeTest: boolean): Promise<FlashSaleAnalyticsRow[]> {
  const admin = createAdminClient();
  const { data: products } = await admin
    .from("products")
    .select("id, name, flash_sale_price, flash_sale_ends_at, created_at")
    .not("flash_sale_price", "is", null)
    .not("flash_sale_ends_at", "is", null);

  if (!products || products.length === 0) return [];

  const rows: FlashSaleAnalyticsRow[] = [];

  for (const product of products) {
    const end = new Date(product.flash_sale_ends_at as string);

    const { data: events } = await admin
      .from("analytics_events")
      .select("event_type")
      .eq("product_id", product.id)
      .lt("created_at", end.toISOString());

    let ordersQuery = admin
      .from("orders")
      .select("id")
      .eq("payment_status", "pago")
      .lt("paid_at", end.toISOString());
    if (!includeTest) ordersQuery = ordersQuery.eq("is_test", false);
    const { data: paidOrders } = await ordersQuery;
    const paidOrderIds = (paidOrders ?? []).map((o) => o.id);

    const { data: items } =
      paidOrderIds.length > 0
        ? await admin
            .from("order_items")
            .select("order_id, quantity, total, discount_amount")
            .eq("product_id", product.id)
            .in("order_id", paidOrderIds)
        : { data: [] };

    const { data: inventoryRows } = await admin.from("inventory").select("quantity, reserved_quantity").eq("product_id", product.id).is("variant_id", null);
    const stockRemaining = (inventoryRows ?? []).reduce((sum, r) => sum + Math.max(0, r.quantity - r.reserved_quantity), 0);

    const views = (events ?? []).filter((e) => e.event_type === "product_view").length;
    const addToCart = (events ?? []).filter((e) => e.event_type === "add_to_cart").length;
    const purchaseOrders = new Set((items ?? []).map((i) => i.order_id));

    rows.push({
      id: product.id,
      name: product.name,
      endsAt: product.flash_sale_ends_at,
      views,
      addToCart,
      purchases: purchaseOrders.size,
      quantitySold: (items ?? []).reduce((sum, i) => sum + i.quantity, 0),
      revenue: round2((items ?? []).reduce((sum, i) => sum + i.total, 0)),
      discountGiven: round2((items ?? []).reduce((sum, i) => sum + i.discount_amount, 0)),
      conversionRate: views > 0 ? round2((purchaseOrders.size / views) * 100) : null,
      stockRemaining,
    });
  }

  return rows;
}
