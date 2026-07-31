import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DateRange } from "@/lib/analytics/period";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toIso(date: Date): string {
  return date.toISOString();
}

export interface CartAnalyticsSummary {
  cartsCreated: number;
  cartsActive: number;
  cartsConverted: number;
  cartsAbandoned: number;
  conversionRate: number | null;
  totalCartValue: number;
  convertedValue: number;
  abandonedValue: number;
  averageItemsPerCart: number;
}

/**
 * A cart only counts as "abandoned" once it's had items for longer than the
 * configured window with no activity — never immediately just because it's
 * old. "Convertido" is approximated by paid orders in the period (the store
 * doesn't keep a direct cart→order link once checkout clears the cart).
 */
export async function getCartAnalyticsSummary(
  range: DateRange,
  includeTest: boolean,
  abandonedAfterHours: number
): Promise<CartAnalyticsSummary> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - abandonedAfterHours * 60 * 60 * 1000);

  const { count: cartsCreated } = await admin
    .from("carts")
    .select("id", { count: "exact", head: true })
    .gte("created_at", toIso(range.start))
    .lt("created_at", toIso(range.end));

  const { data: carts } = await admin.from("carts").select("id, updated_at");
  const cartIds = (carts ?? []).map((c) => c.id);

  const { data: itemRows } =
    cartIds.length > 0 ? await admin.from("cart_items").select("cart_id, quantity, unit_price").in("cart_id", cartIds) : { data: [] };

  const itemsByCart = new Map<string, { quantity: number; value: number }>();
  for (const item of itemRows ?? []) {
    const entry = itemsByCart.get(item.cart_id) ?? { quantity: 0, value: 0 };
    entry.quantity += item.quantity;
    entry.value += item.quantity * item.unit_price;
    itemsByCart.set(item.cart_id, entry);
  }

  const cartsWithItems = (carts ?? []).filter((c) => itemsByCart.has(c.id));
  const abandonedCarts = cartsWithItems.filter((c) => new Date(c.updated_at) < cutoff);
  const activeCarts = cartsWithItems.filter((c) => new Date(c.updated_at) >= cutoff);

  const totalCartValue = round2(cartsWithItems.reduce((sum, c) => sum + (itemsByCart.get(c.id)?.value ?? 0), 0));
  const abandonedValue = round2(abandonedCarts.reduce((sum, c) => sum + (itemsByCart.get(c.id)?.value ?? 0), 0));

  let paidOrdersQuery = admin
    .from("orders")
    .select("id, total")
    .eq("payment_status", "pago")
    .gte("paid_at", toIso(range.start))
    .lt("paid_at", toIso(range.end));
  if (!includeTest) paidOrdersQuery = paidOrdersQuery.eq("is_test", false);
  const { data: paidOrders } = await paidOrdersQuery;

  const convertedValue = round2((paidOrders ?? []).reduce((sum, o) => sum + o.total, 0));
  const cartsConverted = paidOrders?.length ?? 0;
  const totalItemsAcrossCarts = cartsWithItems.reduce((sum, c) => sum + (itemsByCart.get(c.id)?.quantity ?? 0), 0);

  return {
    cartsCreated: cartsCreated ?? 0,
    cartsActive: activeCarts.length,
    cartsConverted,
    cartsAbandoned: abandonedCarts.length,
    conversionRate: (cartsCreated ?? 0) > 0 ? round2((cartsConverted / (cartsCreated ?? 1)) * 100) : null,
    totalCartValue,
    convertedValue,
    abandonedValue,
    averageItemsPerCart: cartsWithItems.length > 0 ? round2(totalItemsAcrossCarts / cartsWithItems.length) : 0,
  };
}

export interface AbandonedProductRow {
  productId: string;
  name: string;
  variantLabel: string | null;
  cartsCount: number;
  abandonedCount: number;
  potentialValue: number;
}

export async function getMostAbandonedProducts(abandonedAfterHours: number): Promise<AbandonedProductRow[]> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - abandonedAfterHours * 60 * 60 * 1000);

  const { data: carts } = await admin.from("carts").select("id, updated_at").lt("updated_at", cutoff.toISOString());
  if (!carts || carts.length === 0) return [];

  const { data: items } = await admin
    .from("cart_items")
    .select("product_id, variant_id, quantity, unit_price, cart_id")
    .in(
      "cart_id",
      carts.map((c) => c.id)
    );
  if (!items || items.length === 0) return [];

  const productIds = [...new Set(items.map((i) => i.product_id))];
  const variantIds = [...new Set(items.map((i) => i.variant_id).filter((id): id is string => !!id))];

  const { data: products } = await admin.from("products").select("id, name").in("id", productIds);
  const { data: variants } =
    variantIds.length > 0 ? await admin.from("product_variants").select("id, name, value").in("id", variantIds) : { data: [] };

  const nameById = new Map((products ?? []).map((p) => [p.id, p.name]));
  const variantById = new Map((variants ?? []).map((v) => [v.id, `${v.name}: ${v.value}`]));

  const byKey = new Map<string, AbandonedProductRow>();
  for (const item of items) {
    const key = `${item.product_id}:${item.variant_id ?? "null"}`;
    const entry =
      byKey.get(key) ??
      ({
        productId: item.product_id,
        name: nameById.get(item.product_id) ?? "Produto",
        variantLabel: item.variant_id ? variantById.get(item.variant_id) ?? null : null,
        cartsCount: 0,
        abandonedCount: 0,
        potentialValue: 0,
      } as AbandonedProductRow);
    entry.cartsCount += 1;
    entry.abandonedCount += item.quantity;
    entry.potentialValue = round2(entry.potentialValue + item.quantity * item.unit_price);
    byKey.set(key, entry);
  }

  return [...byKey.values()].sort((a, b) => b.abandonedCount - a.abandonedCount);
}
