import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AnalyticsThresholds } from "@/lib/analytics/settings";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface StockAnalyticsRow {
  productId: string;
  variantId: string | null;
  name: string;
  stock: number;
  soldLast30Days: number;
  estimatedDaysOfStock: number | null;
  stockValue: number;
  stockCost: number | null;
  status: "sem_estoque" | "estoque_baixo" | "excesso" | "parado" | "normal";
}

export interface StockAnalyticsSummary {
  rows: StockAnalyticsRow[];
  lowStockCount: number;
  outOfStockCount: number;
  excessCount: number;
  stalledCount: number;
  totalStockValue: number;
  totalStockCost: number | null;
}

/**
 * "Giro" (turnover) is measured from confirmed sales in the last 30 days —
 * a product with zero sales in that window for longer than the configured
 * "dias parado" threshold counts as stalled.
 */
export async function getStockAnalytics(thresholds: AnalyticsThresholds, includeTest: boolean): Promise<StockAnalyticsSummary> {
  const admin = createAdminClient();
  const since30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const stalledCutoff = new Date(Date.now() - thresholds.stalledProductDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: inventoryRows } = await admin.from("inventory").select("id, product_id, variant_id, quantity, reserved_quantity");
  const { data: products } = await admin.from("products").select("id, name, base_price, cost_price");
  const { data: variants } = await admin.from("product_variants").select("id, name, value");

  const productById = new Map((products ?? []).map((p) => [p.id, p]));
  const variantById = new Map((variants ?? []).map((v) => [v.id, v]));

  let paidOrdersQuery = admin
    .from("orders")
    .select("id")
    .eq("payment_status", "pago")
    .gte("paid_at", since30Days);
  if (!includeTest) paidOrdersQuery = paidOrdersQuery.eq("is_test", false);
  const { data: recentPaidOrders } = await paidOrdersQuery;
  const recentOrderIds = (recentPaidOrders ?? []).map((o) => o.id);

  const { data: recentItems } =
    recentOrderIds.length > 0
      ? await admin.from("order_items").select("order_id, product_id, variant_id, quantity, created_at").in("order_id", recentOrderIds)
      : { data: [] };

  const soldByKey = new Map<string, number>();
  const lastSaleByKey = new Map<string, string>();
  for (const item of recentItems ?? []) {
    if (!item.product_id) continue;
    const key = `${item.product_id}:${item.variant_id ?? "null"}`;
    soldByKey.set(key, (soldByKey.get(key) ?? 0) + item.quantity);
    const existingLast = lastSaleByKey.get(key);
    if (!existingLast || item.created_at > existingLast) lastSaleByKey.set(key, item.created_at);
  }

  const rows: StockAnalyticsRow[] = (inventoryRows ?? []).map((inv) => {
    const product = productById.get(inv.product_id);
    const variant = inv.variant_id ? variantById.get(inv.variant_id) : null;
    const key = `${inv.product_id}:${inv.variant_id ?? "null"}`;
    const available = Math.max(0, inv.quantity - inv.reserved_quantity);
    const soldLast30Days = soldByKey.get(key) ?? 0;
    const dailyRate = soldLast30Days / 30;
    const estimatedDaysOfStock = dailyRate > 0 ? Math.round(available / dailyRate) : null;
    const lastSale = lastSaleByKey.get(key);
    const isStalled = soldLast30Days === 0 && (!lastSale || lastSale < stalledCutoff);

    let status: StockAnalyticsRow["status"] = "normal";
    if (available <= 0) status = "sem_estoque";
    else if (available <= thresholds.lowStockQuantity) status = "estoque_baixo";
    else if (available >= thresholds.excessStockQuantity) status = "excesso";
    else if (isStalled) status = "parado";

    const price = product?.base_price ?? 0;
    const cost = product?.cost_price ?? null;

    return {
      productId: inv.product_id,
      variantId: inv.variant_id,
      name: product ? (variant ? `${product.name} — ${variant.name}: ${variant.value}` : product.name) : "Produto",
      stock: available,
      soldLast30Days,
      estimatedDaysOfStock,
      stockValue: round2(available * price),
      stockCost: cost != null ? round2(available * cost) : null,
      status,
    };
  });

  const totalStockValue = round2(rows.reduce((sum, r) => sum + r.stockValue, 0));
  const hasAnyCost = rows.some((r) => r.stockCost != null);
  const totalStockCost = hasAnyCost ? round2(rows.reduce((sum, r) => sum + (r.stockCost ?? 0), 0)) : null;

  return {
    rows,
    lowStockCount: rows.filter((r) => r.status === "estoque_baixo").length,
    outOfStockCount: rows.filter((r) => r.status === "sem_estoque").length,
    excessCount: rows.filter((r) => r.status === "excesso").length,
    stalledCount: rows.filter((r) => r.status === "parado").length,
    totalStockValue,
    totalStockCost,
  };
}

export interface ForecastRow {
  productId: string;
  name: string;
  dailyRate: number;
  estimatedDaysUntilStockout: number | null;
  needsRestock: boolean;
}

/** Estimativa baseada no histórico — never a guarantee, just a linear projection from the last 30 days of sales. */
export function buildSimpleForecast(rows: StockAnalyticsRow[]): ForecastRow[] {
  return rows
    .filter((r) => r.soldLast30Days > 0)
    .map((r) => ({
      productId: r.productId,
      name: r.name,
      dailyRate: round2(r.soldLast30Days / 30),
      estimatedDaysUntilStockout: r.estimatedDaysOfStock,
      needsRestock: r.estimatedDaysOfStock != null && r.estimatedDaysOfStock <= 14,
    }))
    .sort((a, b) => (a.estimatedDaysUntilStockout ?? 9999) - (b.estimatedDaysUntilStockout ?? 9999));
}
