import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DateRange } from "@/lib/analytics/period";
import type { AnalyticsThresholds } from "@/lib/analytics/settings";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toIso(date: Date): string {
  return date.toISOString();
}

interface CustomerOrderAgg {
  userId: string;
  ordersCount: number;
  totalSpent: number;
  firstPaidAt: string;
  lastPaidAt: string;
  usedCoupon: boolean;
}

async function aggregatePaidOrdersByCustomer(includeTest: boolean): Promise<Map<string, CustomerOrderAgg>> {
  const admin = createAdminClient();
  let query = admin
    .from("orders")
    .select("user_id, total, paid_at, coupon_code")
    .eq("payment_status", "pago")
    .not("user_id", "is", null)
    .order("paid_at", { ascending: true });
  if (!includeTest) query = query.eq("is_test", false);

  const { data } = await query;
  const map = new Map<string, CustomerOrderAgg>();

  for (const order of data ?? []) {
    if (!order.user_id || !order.paid_at) continue;
    const existing = map.get(order.user_id);
    if (existing) {
      existing.ordersCount += 1;
      existing.totalSpent = round2(existing.totalSpent + order.total);
      existing.lastPaidAt = order.paid_at;
      if (order.coupon_code) existing.usedCoupon = true;
    } else {
      map.set(order.user_id, {
        userId: order.user_id,
        ordersCount: 1,
        totalSpent: order.total,
        firstPaidAt: order.paid_at,
        lastPaidAt: order.paid_at,
        usedCoupon: Boolean(order.coupon_code),
      });
    }
  }

  return map;
}

export interface CustomerAnalyticsSummary {
  totalCustomers: number;
  newCustomers: number;
  recurringCustomers: number;
  oneTimeCustomers: number;
  moreThanOnceCustomers: number;
  customersWithoutOrders: number;
  averageSpendPerCustomer: number;
  averageOrdersPerCustomer: number;
  averageDaysBetweenPurchases: number | null;
}

export async function getCustomerAnalyticsSummary(range: DateRange, includeTest: boolean): Promise<CustomerAnalyticsSummary> {
  const admin = createAdminClient();
  const { count: totalCustomers } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "cliente");
  const { count: newCustomers } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "cliente")
    .gte("created_at", toIso(range.start))
    .lt("created_at", toIso(range.end));

  const ordersByCustomer = await aggregatePaidOrdersByCustomer(includeTest);
  const buyers = [...ordersByCustomer.values()];

  const recurringCustomers = buyers.filter((c) => c.ordersCount > 1).length;
  const oneTimeCustomers = buyers.filter((c) => c.ordersCount === 1).length;
  const customersWithoutOrders = Math.max(0, (totalCustomers ?? 0) - buyers.length);

  const totalSpent = buyers.reduce((sum, c) => sum + c.totalSpent, 0);
  const totalOrders = buyers.reduce((sum, c) => sum + c.ordersCount, 0);

  const gapsInDays: number[] = [];
  for (const buyer of buyers) {
    if (buyer.ordersCount > 1) {
      const days = (new Date(buyer.lastPaidAt).getTime() - new Date(buyer.firstPaidAt).getTime()) / (1000 * 60 * 60 * 24);
      gapsInDays.push(days / (buyer.ordersCount - 1));
    }
  }

  return {
    totalCustomers: totalCustomers ?? 0,
    newCustomers: newCustomers ?? 0,
    recurringCustomers,
    oneTimeCustomers,
    moreThanOnceCustomers: recurringCustomers,
    customersWithoutOrders,
    averageSpendPerCustomer: buyers.length > 0 ? round2(totalSpent / buyers.length) : 0,
    averageOrdersPerCustomer: buyers.length > 0 ? round2(totalOrders / buyers.length) : 0,
    averageDaysBetweenPurchases: gapsInDays.length > 0 ? round2(gapsInDays.reduce((a, b) => a + b, 0) / gapsInDays.length) : null,
  };
}

export type CustomerSegment =
  | "new"
  | "recurring"
  | "highValue"
  | "inactive"
  | "noOrders"
  | "usedCoupon";

export interface SegmentedCustomer {
  id: string;
  name: string;
  email: string | null;
  ordersCount: number;
  totalSpent: number;
  lastPaidAt: string | null;
}

export async function listCustomersBySegment(
  segment: CustomerSegment,
  thresholds: AnalyticsThresholds,
  includeTest: boolean
): Promise<SegmentedCustomer[]> {
  const admin = createAdminClient();
  const { data: profiles } = await admin.from("profiles").select("id, full_name").eq("role", "cliente");

  const emailById = new Map<string, string | null>();
  try {
    const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
    for (const user of authUsers?.users ?? []) {
      emailById.set(user.id, user.email ?? null);
    }
  } catch {
    // Best-effort only — the segment list still works without e-mails shown.
  }

  const ordersByCustomer = await aggregatePaidOrdersByCustomer(includeTest);
  const inactiveCutoff = Date.now() - thresholds.inactiveCustomerDays * 24 * 60 * 60 * 1000;

  const results: SegmentedCustomer[] = [];

  for (const profile of profiles ?? []) {
    const agg = ordersByCustomer.get(profile.id);
    const email = emailById.get(profile.id) ?? null;
    const base: SegmentedCustomer = {
      id: profile.id,
      name: profile.full_name ?? email ?? "Cliente",
      email,
      ordersCount: agg?.ordersCount ?? 0,
      totalSpent: agg?.totalSpent ?? 0,
      lastPaidAt: agg?.lastPaidAt ?? null,
    };

    switch (segment) {
      case "recurring":
        if (agg && agg.ordersCount > 1) results.push(base);
        break;
      case "highValue":
        if (agg && agg.totalSpent >= thresholds.highValueCustomerTotalSpent) results.push(base);
        break;
      case "inactive":
        if (agg && new Date(agg.lastPaidAt).getTime() < inactiveCutoff) results.push(base);
        break;
      case "noOrders":
        if (!agg) results.push(base);
        break;
      case "usedCoupon":
        if (agg?.usedCoupon) results.push(base);
        break;
      case "new":
      default:
        results.push(base);
        break;
    }
  }

  return results.sort((a, b) => b.totalSpent - a.totalSpent);
}
