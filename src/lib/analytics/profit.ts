import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DateRange } from "@/lib/analytics/period";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toIso(date: Date): string {
  return date.toISOString();
}

export interface ProfitEstimate {
  productRevenue: number;
  cogs: number;
  discountTotal: number;
  refundTotal: number;
  grossProfit: number;
  grossMargin: number | null;
  hasMissingCost: boolean;
  itemsMissingCostCount: number;
}

/**
 * Lucro bruto estimado = receita de produtos - custo dos produtos vendidos
 * - descontos - reembolsos. Margem bruta estimada = lucro / receita de
 * produtos. Never invents a cost: products without cost_price simply don't
 * contribute to COGS, and hasMissingCost flags that the number is
 * incomplete so the UI can say so explicitly.
 */
export interface ProductMissingCost {
  id: string;
  name: string;
  quantitySold: number;
}

/** Products actually sold in the period that have no cost_price registered — never guessed, just listed. */
export async function getProductsMissingCost(range: DateRange, includeTest: boolean): Promise<ProductMissingCost[]> {
  const admin = createAdminClient();

  let ordersQuery = admin
    .from("orders")
    .select("id")
    .eq("payment_status", "pago")
    .gte("paid_at", toIso(range.start))
    .lt("paid_at", toIso(range.end));
  if (!includeTest) ordersQuery = ordersQuery.eq("is_test", false);
  const { data: orders } = await ordersQuery;
  if (!orders || orders.length === 0) return [];

  const { data: items } = await admin
    .from("order_items")
    .select("product_id, quantity")
    .in(
      "order_id",
      orders.map((o) => o.id)
    );

  const productIds = [...new Set((items ?? []).map((i) => i.product_id).filter((id): id is string => !!id))];
  if (productIds.length === 0) return [];

  const { data: products } = await admin.from("products").select("id, name, cost_price").in("id", productIds);
  const missing = (products ?? []).filter((p) => p.cost_price == null);

  const quantityByProduct = new Map<string, number>();
  for (const item of items ?? []) {
    if (!item.product_id) continue;
    quantityByProduct.set(item.product_id, (quantityByProduct.get(item.product_id) ?? 0) + item.quantity);
  }

  return missing.map((p) => ({ id: p.id, name: p.name, quantitySold: quantityByProduct.get(p.id) ?? 0 }));
}

export async function getProfitEstimate(range: DateRange, includeTest: boolean): Promise<ProfitEstimate> {
  const admin = createAdminClient();

  let ordersQuery = admin
    .from("orders")
    .select("id, discount_total")
    .eq("payment_status", "pago")
    .gte("paid_at", toIso(range.start))
    .lt("paid_at", toIso(range.end));
  if (!includeTest) ordersQuery = ordersQuery.eq("is_test", false);
  const { data: orders } = await ordersQuery;

  const empty: ProfitEstimate = {
    productRevenue: 0,
    cogs: 0,
    discountTotal: 0,
    refundTotal: 0,
    grossProfit: 0,
    grossMargin: null,
    hasMissingCost: false,
    itemsMissingCostCount: 0,
  };

  if (!orders || orders.length === 0) return empty;

  const orderIds = orders.map((o) => o.id);
  const discountTotal = round2(orders.reduce((sum, o) => sum + o.discount_total, 0));

  const { data: items } = await admin
    .from("order_items")
    .select("order_id, product_id, quantity, total")
    .in("order_id", orderIds);

  const productIds = [...new Set((items ?? []).map((i) => i.product_id).filter((id): id is string => !!id))];
  const { data: products } =
    productIds.length > 0 ? await admin.from("products").select("id, cost_price").in("id", productIds) : { data: [] };
  const costById = new Map((products ?? []).map((p) => [p.id, p.cost_price]));

  let productRevenue = 0;
  let cogs = 0;
  let itemsMissingCostCount = 0;

  for (const item of items ?? []) {
    productRevenue += item.total;
    const cost = item.product_id ? costById.get(item.product_id) : null;
    if (cost != null) {
      cogs += cost * item.quantity;
    } else {
      itemsMissingCostCount += 1;
    }
  }

  const { data: refunds } = await admin
    .from("refunds")
    .select("amount")
    .in("order_id", orderIds)
    .eq("status", "concluido");
  const refundTotal = round2((refunds ?? []).reduce((sum, r) => sum + r.amount, 0));

  productRevenue = round2(productRevenue);
  cogs = round2(cogs);
  const grossProfit = round2(productRevenue - cogs - discountTotal - refundTotal);

  return {
    productRevenue,
    cogs,
    discountTotal,
    refundTotal,
    grossProfit,
    grossMargin: productRevenue > 0 ? round2((grossProfit / productRevenue) * 100) : null,
    hasMissingCost: itemsMissingCostCount > 0,
    itemsMissingCostCount,
  };
}
