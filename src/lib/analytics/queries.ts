import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DateRange } from "@/lib/analytics/period";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toIso(date: Date): string {
  return date.toISOString();
}

interface RangeFilterOptions {
  includeTest: boolean;
}

export interface PaidOrdersSummary {
  grossRevenue: number;
  discountTotal: number;
  shippingTotal: number;
  couponDiscountTotal: number;
  refundTotal: number;
  paidOrdersCount: number;
  itemsSold: number;
  averageOrderValue: number;
  biggestOrder: number;
  smallestOrder: number;
  averageItemsPerOrder: number;
}

/** Only orders with payment_status = "pago" count as a sale — never pending/recusado/expirado. */
export async function getPaidOrdersSummary(range: DateRange, options: RangeFilterOptions): Promise<PaidOrdersSummary> {
  const admin = createAdminClient();

  let query = admin
    .from("orders")
    .select("id, total, subtotal, discount_total, shipping_total, coupon_code")
    .eq("payment_status", "pago")
    .gte("paid_at", toIso(range.start))
    .lt("paid_at", toIso(range.end));
  if (!options.includeTest) query = query.eq("is_test", false);

  const { data: orders } = await query;
  const orderRows = orders ?? [];

  if (orderRows.length === 0) {
    return {
      grossRevenue: 0,
      discountTotal: 0,
      shippingTotal: 0,
      couponDiscountTotal: 0,
      refundTotal: 0,
      paidOrdersCount: 0,
      itemsSold: 0,
      averageOrderValue: 0,
      biggestOrder: 0,
      smallestOrder: 0,
      averageItemsPerOrder: 0,
    };
  }

  const orderIds = orderRows.map((o) => o.id);
  const { data: itemRows } = await admin.from("order_items").select("order_id, quantity").in("order_id", orderIds);
  const itemsByOrder = new Map<string, number>();
  for (const item of itemRows ?? []) {
    itemsByOrder.set(item.order_id, (itemsByOrder.get(item.order_id) ?? 0) + item.quantity);
  }
  const itemsSold = [...itemsByOrder.values()].reduce((sum, qty) => sum + qty, 0);

  const refundQuery = admin
    .from("refunds")
    .select("amount, order_id")
    .in("order_id", orderIds)
    .eq("status", "concluido");
  const { data: refundRows } = await refundQuery;
  const refundTotal = (refundRows ?? []).reduce((sum, r) => sum + r.amount, 0);

  const totals = orderRows.map((o) => o.total);
  const grossRevenue = round2(totals.reduce((sum, t) => sum + t, 0));
  const discountTotal = round2(orderRows.reduce((sum, o) => sum + o.discount_total, 0));
  const shippingTotal = round2(orderRows.reduce((sum, o) => sum + o.shipping_total, 0));
  const couponDiscountTotal = round2(
    orderRows.filter((o) => o.coupon_code).reduce((sum, o) => sum + o.discount_total, 0)
  );

  return {
    grossRevenue,
    discountTotal,
    shippingTotal,
    couponDiscountTotal,
    refundTotal: round2(refundTotal),
    paidOrdersCount: orderRows.length,
    itemsSold,
    averageOrderValue: round2(grossRevenue / orderRows.length),
    biggestOrder: Math.max(...totals),
    smallestOrder: Math.min(...totals),
    averageItemsPerOrder: round2(itemsSold / orderRows.length),
  };
}

export interface OrderCounts {
  total: number;
  paid: number;
  cancelled: number;
  refunded: number;
}

/** All orders created in the range, regardless of payment outcome — used for the "quantidade de pedidos" cards. */
export async function getOrderCounts(range: DateRange, options: RangeFilterOptions): Promise<OrderCounts> {
  const admin = createAdminClient();
  let query = admin
    .from("orders")
    .select("status, payment_status")
    .gte("created_at", toIso(range.start))
    .lt("created_at", toIso(range.end));
  if (!options.includeTest) query = query.eq("is_test", false);

  const { data } = await query;
  const rows = data ?? [];

  return {
    total: rows.length,
    paid: rows.filter((o) => o.payment_status === "pago").length,
    cancelled: rows.filter((o) => o.status === "cancelado").length,
    refunded: rows.filter((o) => o.payment_status === "reembolsado" || o.payment_status === "reembolsado_parcial").length,
  };
}

export interface CustomerCounts {
  totalCustomers: number;
  newCustomers: number;
  recurringCustomers: number;
}

/** "Cliente recorrente" = customer with more than one paid order (ever, not just in the selected period). */
export async function getCustomerCounts(range: DateRange, options: RangeFilterOptions): Promise<CustomerCounts> {
  const admin = createAdminClient();

  const { count: totalCustomers } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "cliente");

  const { count: newCustomers } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "cliente")
    .gte("created_at", toIso(range.start))
    .lt("created_at", toIso(range.end));

  let paidOrdersQuery = admin
    .from("orders")
    .select("user_id")
    .eq("payment_status", "pago")
    .not("user_id", "is", null);
  if (!options.includeTest) paidOrdersQuery = paidOrdersQuery.eq("is_test", false);
  const { data: paidOrders } = await paidOrdersQuery;

  const ordersByCustomer = new Map<string, number>();
  for (const order of paidOrders ?? []) {
    if (!order.user_id) continue;
    ordersByCustomer.set(order.user_id, (ordersByCustomer.get(order.user_id) ?? 0) + 1);
  }
  const recurringCustomers = [...ordersByCustomer.values()].filter((count) => count > 1).length;

  return {
    totalCustomers: totalCustomers ?? 0,
    newCustomers: newCustomers ?? 0,
    recurringCustomers,
  };
}

export interface ConversionData {
  sessionsWithPurchase: number;
  totalSessions: number;
  conversionRate: number | null;
}

/** Conversion = distinct sessions that purchased / distinct sessions seen in the period (page_view/product_view sessions). */
export async function getConversionRate(range: DateRange, options: RangeFilterOptions): Promise<ConversionData> {
  const admin = createAdminClient();

  let sessionsQuery = admin
    .from("analytics_events")
    .select("session_id")
    .not("session_id", "is", null)
    .gte("created_at", toIso(range.start))
    .lt("created_at", toIso(range.end));
  if (!options.includeTest) sessionsQuery = sessionsQuery.eq("is_test", false);
  const { data: sessionRows } = await sessionsQuery;
  const totalSessions = new Set((sessionRows ?? []).map((r) => r.session_id)).size;

  let paidOrdersQuery = admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("payment_status", "pago")
    .gte("paid_at", toIso(range.start))
    .lt("paid_at", toIso(range.end));
  if (!options.includeTest) paidOrdersQuery = paidOrdersQuery.eq("is_test", false);
  const { count: paidOrdersInRange } = await paidOrdersQuery;

  return {
    sessionsWithPurchase: paidOrdersInRange ?? 0,
    totalSessions,
    conversionRate: totalSessions > 0 ? round2(((paidOrdersInRange ?? 0) / totalSessions) * 100) : null,
  };
}

export interface AbandonedCartInfo {
  abandonedCount: number;
}

/** A cart is only "abandoned" after the configured inactivity window — never immediately. */
export async function getAbandonedCartsCount(abandonedAfterHours: number, includeTest: boolean): Promise<number> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - abandonedAfterHours * 60 * 60 * 1000);

  const { data: carts } = await admin
    .from("carts")
    .select("id, updated_at")
    .lt("updated_at", cutoff.toISOString());

  if (!carts || carts.length === 0) return 0;

  const { data: itemRows } = await admin
    .from("cart_items")
    .select("cart_id")
    .in(
      "cart_id",
      carts.map((c) => c.id)
    );

  const cartsWithItems = new Set((itemRows ?? []).map((r) => r.cart_id));
  void includeTest; // carts aren't tagged is_test — always counted (no Stripe order exists yet).
  return carts.filter((c) => cartsWithItems.has(c.id)).length;
}

export interface StockAlerts {
  outOfStock: number;
  lowStock: number;
}

export async function getStockAlertCounts(lowStockThreshold: number): Promise<StockAlerts> {
  const admin = createAdminClient();
  const { data } = await admin.from("inventory").select("quantity, reserved_quantity");

  let outOfStock = 0;
  let lowStock = 0;
  for (const row of data ?? []) {
    const available = row.quantity - row.reserved_quantity;
    if (available <= 0) outOfStock += 1;
    else if (available <= lowStockThreshold) lowStock += 1;
  }
  return { outOfStock, lowStock };
}

export interface DailySeriesPoint {
  date: string;
  revenue: number;
  orders: number;
  itemsSold: number;
  averageOrderValue: number;
  newCustomers: number;
  recurringCustomers: number;
  refunds: number;
  cancellations: number;
}

/**
 * Day-by-day series powering every chart on /admin/analytics. Loads all
 * relevant rows for the range once and buckets them in memory — simple and
 * fast enough for a single store's order volume without needing a
 * pre-aggregated summary table.
 */
export async function getDailySeries(range: DateRange, options: RangeFilterOptions): Promise<DailySeriesPoint[]> {
  const admin = createAdminClient();

  let ordersQuery = admin
    .from("orders")
    .select("id, total, status, payment_status, paid_at, created_at, cancelled_at, user_id")
    .gte("created_at", toIso(range.start))
    .lt("created_at", toIso(range.end));
  if (!options.includeTest) ordersQuery = ordersQuery.eq("is_test", false);
  const { data: orders } = await ordersQuery;

  let paidQuery = admin
    .from("orders")
    .select("id, total, paid_at, user_id")
    .eq("payment_status", "pago")
    .gte("paid_at", toIso(range.start))
    .lt("paid_at", toIso(range.end));
  if (!options.includeTest) paidQuery = paidQuery.eq("is_test", false);
  const { data: paidOrders } = await paidQuery;

  const refundsQuery = admin
    .from("refunds")
    .select("amount, created_at")
    .eq("status", "concluido")
    .gte("created_at", toIso(range.start))
    .lt("created_at", toIso(range.end));
  const { data: refunds } = await refundsQuery;

  const paidOrderIds = (paidOrders ?? []).map((o) => o.id);
  const { data: items } =
    paidOrderIds.length > 0
      ? await admin.from("order_items").select("order_id, quantity").in("order_id", paidOrderIds)
      : { data: [] };
  const itemsByOrder = new Map<string, number>();
  for (const item of items ?? []) {
    itemsByOrder.set(item.order_id, (itemsByOrder.get(item.order_id) ?? 0) + item.quantity);
  }

  // First-ever paid order per customer, to classify "novo" vs "recorrente" per day.
  const paidUserIds = [...new Set((paidOrders ?? []).map((o) => o.user_id).filter((id): id is string => !!id))];
  const firstOrderByUser = new Map<string, string>();
  if (paidUserIds.length > 0) {
    const { data: allPaidForUsers } = await admin
      .from("orders")
      .select("user_id, paid_at")
      .eq("payment_status", "pago")
      .in("user_id", paidUserIds)
      .order("paid_at", { ascending: true });
    for (const row of allPaidForUsers ?? []) {
      if (row.user_id && !firstOrderByUser.has(row.user_id) && row.paid_at) {
        firstOrderByUser.set(row.user_id, row.paid_at);
      }
    }
  }

  const buckets = new Map<string, DailySeriesPoint>();
  const cursor = new Date(range.start);
  while (cursor < range.end) {
    const key = cursor.toISOString().slice(0, 10);
    buckets.set(key, {
      date: key,
      revenue: 0,
      orders: 0,
      itemsSold: 0,
      averageOrderValue: 0,
      newCustomers: 0,
      recurringCustomers: 0,
      refunds: 0,
      cancellations: 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  for (const order of orders ?? []) {
    const key = order.created_at.slice(0, 10);
    const bucket = buckets.get(key);
    if (bucket) bucket.orders += 1;
    if (order.status === "cancelado" && order.cancelled_at) {
      const cancelKey = order.cancelled_at.slice(0, 10);
      const cancelBucket = buckets.get(cancelKey);
      if (cancelBucket) cancelBucket.cancellations += 1;
    }
  }

  const seenUserThisSeries = new Set<string>();
  for (const order of paidOrders ?? []) {
    if (!order.paid_at) continue;
    const key = order.paid_at.slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.revenue = round2(bucket.revenue + order.total);
    bucket.itemsSold += itemsByOrder.get(order.id) ?? 0;

    if (order.user_id) {
      const firstOrderDate = firstOrderByUser.get(order.user_id);
      const isFirstOrderEver = firstOrderDate === order.paid_at;
      if (isFirstOrderEver && !seenUserThisSeries.has(order.user_id)) {
        bucket.newCustomers += 1;
      } else {
        bucket.recurringCustomers += 1;
      }
      seenUserThisSeries.add(order.user_id);
    }
  }

  for (const refund of refunds ?? []) {
    const key = refund.created_at.slice(0, 10);
    const bucket = buckets.get(key);
    if (bucket) bucket.refunds = round2(bucket.refunds + refund.amount);
  }

  const points = [...buckets.values()];
  for (const point of points) {
    const paidOrdersThatDay = (paidOrders ?? []).filter((o) => o.paid_at?.slice(0, 10) === point.date).length;
    point.averageOrderValue = paidOrdersThatDay > 0 ? round2(point.revenue / paidOrdersThatDay) : 0;
  }

  return points;
}
