import type { Metadata } from "next";
import { ta } from "@/i18n";
import { AnalyticsNav } from "@/components/analytics/AnalyticsNav";
import { PeriodFilterBar } from "@/components/analytics/PeriodFilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { parseAnalyticsSearchParams, type AnalyticsSearchParams } from "@/lib/analytics/request-params";
import { getCouponAnalytics } from "@/lib/analytics/coupons";

export const metadata: Metadata = { title: ta("analytics.nav.coupons") };

interface CouponsAnalyticsPageProps {
  searchParams: Promise<AnalyticsSearchParams>;
}

export default async function CouponsAnalyticsPage({ searchParams }: CouponsAnalyticsPageProps) {
  const rawParams = await searchParams;
  const { period, includeTest } = parseAnalyticsSearchParams(rawParams);
  const coupons = await getCouponAnalytics(period.range, includeTest);
  const sorted = [...coupons].sort((a, b) => b.uses - a.uses);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-brand-secondary">{ta("analytics.nav.coupons")}</h1>
      <AnalyticsNav active="cupons" />
      <PeriodFilterBar
        period={period.key}
        from={rawParams.de}
        to={rawParams.ate}
        compare={rawParams.comparar === "lastMonth" ? "lastMonth" : rawParams.comparar === "lastYear" ? "lastYear" : "previous"}
        includeTest={includeTest}
      />

      {sorted.length === 0 ? (
        <EmptyState title={ta("analytics.insufficientData")} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">{ta("cart.couponPlaceholder")}</th>
                <th className="px-4 py-3">{ta("analytics.coupons.uses")}</th>
                <th className="px-4 py-3">{ta("analytics.coupons.customers")}</th>
                <th className="px-4 py-3">{ta("admin.orders.columnTotal")}</th>
                <th className="px-4 py-3">{ta("analytics.coupons.discountGiven")}</th>
                <th className="px-4 py-3">{ta("analytics.metrics.aov")}</th>
                <th className="px-4 py-3">{ta("account.orderStatus")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sorted.map((coupon) => {
                const isExpired = coupon.expiresAt ? new Date(coupon.expiresAt) < new Date() : false;
                const nearLimit = coupon.maxUses != null && coupon.usedCount / coupon.maxUses >= 0.8;
                return (
                  <tr key={coupon.id}>
                    <td className="px-4 py-3 font-medium text-brand-secondary">{coupon.code}</td>
                    <td className="px-4 py-3">{coupon.uses}</td>
                    <td className="px-4 py-3">{coupon.customersCount}</td>
                    <td className="px-4 py-3">{formatCurrency(coupon.revenue)}</td>
                    <td className="px-4 py-3">{formatCurrency(coupon.discountGiven)}</td>
                    <td className="px-4 py-3">{formatCurrency(coupon.averageOrderValue)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {!coupon.isActive && <Badge tone="neutral">{ta("common.no")}</Badge>}
                        {isExpired && <Badge tone="danger">{ta("analytics.coupons.expired")}</Badge>}
                        {nearLimit && <Badge tone="warning">{ta("analytics.coupons.nearLimit")}</Badge>}
                        {coupon.uses === 0 && <Badge tone="neutral">{ta("analytics.coupons.unused")}</Badge>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
