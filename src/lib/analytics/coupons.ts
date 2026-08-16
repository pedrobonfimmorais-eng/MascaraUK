import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DateRange } from "@/lib/analytics/period";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function toIso(date: Date): string {
  return date.toISOString();
}

export interface CouponAnalyticsRow {
  id: string;
  code: string;
  uses: number;
  customersCount: number;
  revenue: number;
  discountGiven: number;
  averageOrderValue: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  maxUses: number | null;
  usedCount: number;
}

/** "Uses" only counts coupons attached to an actually paid order — a cart that merely applied the code doesn't count. */
export async function getCouponAnalytics(range: DateRange, includeTest: boolean): Promise<CouponAnalyticsRow[]> {
  const admin = createAdminClient();
  const { data: coupons } = await admin.from("coupons").select("*");
  if (!coupons || coupons.length === 0) return [];

  let ordersQuery = admin
    .from("orders")
    .select("coupon_code, total, discount_total, user_id")
    .eq("payment_status", "pago")
    .not("coupon_code", "is", null)
    .gte("paid_at", toIso(range.start))
    .lt("paid_at", toIso(range.end));
  if (!includeTest) ordersQuery = ordersQuery.eq("is_test", false);
  const { data: orders } = await ordersQuery;

  return coupons.map((coupon) => {
    const matching = (orders ?? []).filter((o) => o.coupon_code?.toUpperCase() === coupon.code.toUpperCase());
    const revenue = round2(matching.reduce((sum, o) => sum + o.total, 0));
    const discountGiven = round2(matching.reduce((sum, o) => sum + o.discount_total, 0));
    const customers = new Set(matching.map((o) => o.user_id).filter(Boolean));

    return {
      id: coupon.id,
      code: coupon.code,
      uses: matching.length,
      customersCount: customers.size,
      revenue,
      discountGiven,
      averageOrderValue: matching.length > 0 ? round2(revenue / matching.length) : 0,
      startsAt: coupon.starts_at,
      expiresAt: coupon.expires_at,
      isActive: coupon.is_active,
      maxUses: coupon.max_uses,
      usedCount: coupon.used_count,
    };
  });
}
