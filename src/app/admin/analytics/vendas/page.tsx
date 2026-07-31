import type { Metadata } from "next";
import Link from "next/link";
import { ta } from "@/i18n";
import { AnalyticsNav } from "@/components/analytics/AnalyticsNav";
import { PeriodFilterBar } from "@/components/analytics/PeriodFilterBar";
import { AdditionalCostsManager } from "@/components/analytics/AdditionalCostsManager";
import { formatCurrency } from "@/lib/utils";
import { parseAnalyticsSearchParams, type AnalyticsSearchParams } from "@/lib/analytics/request-params";
import { getPaidOrdersSummary } from "@/lib/analytics/queries";
import { getApplicableAdditionalCosts, listAdditionalCosts } from "@/lib/analytics/costs";
import { getProfitEstimate, getProductsMissingCost } from "@/lib/analytics/profit";

export const metadata: Metadata = { title: ta("analytics.nav.sales") };

interface SalesPageProps {
  searchParams: Promise<AnalyticsSearchParams>;
}

export default async function SalesAnalyticsPage({ searchParams }: SalesPageProps) {
  const rawParams = await searchParams;
  const { period, includeTest } = parseAnalyticsSearchParams(rawParams);

  const [summary, profit, missingCost, costs] = await Promise.all([
    getPaidOrdersSummary(period.range, { includeTest }),
    getProfitEstimate(period.range, includeTest),
    getProductsMissingCost(period.range, includeTest),
    listAdditionalCosts(),
  ]);

  const additionalCosts = await getApplicableAdditionalCosts(period.range, summary.grossRevenue, summary.paidOrdersCount);
  const netRevenueEstimate = Math.max(0, summary.grossRevenue - summary.discountTotal - summary.refundTotal - additionalCosts.total);
  const hasNoSales = summary.paidOrdersCount === 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-brand-secondary">{ta("analytics.nav.sales")}</h1>
      <AnalyticsNav active="vendas" />
      <PeriodFilterBar
        period={period.key}
        from={rawParams.de}
        to={rawParams.ate}
        compare={rawParams.comparar === "lastMonth" ? "lastMonth" : rawParams.comparar === "lastYear" ? "lastYear" : "previous"}
        includeTest={includeTest}
      />

      {hasNoSales ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          {ta("analytics.noSalesInPeriod")}
        </p>
      ) : (
        <>
          <section className="rounded-xl border border-gray-200 p-4">
            <h2 className="mb-3 font-semibold text-brand-secondary">{ta("analytics.sales.summaryTitle")}</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-4">
              <Item label={ta("analytics.metrics.grossRevenue")} value={formatCurrency(summary.grossRevenue)} />
              <Item label={ta("analytics.sales.discounts")} value={formatCurrency(summary.discountTotal)} />
              <Item label={ta("analytics.sales.couponValue")} value={formatCurrency(summary.couponDiscountTotal)} />
              <Item label={ta("analytics.sales.shippingValue")} value={formatCurrency(summary.shippingTotal)} />
              <Item label={ta("analytics.sales.refunds")} value={formatCurrency(summary.refundTotal)} />
              <Item label={ta("analytics.metrics.netRevenue")} value={formatCurrency(netRevenueEstimate)} highlight />
              <Item label={ta("analytics.metrics.paidOrders")} value={String(summary.paidOrdersCount)} />
              <Item label={ta("analytics.metrics.itemsSold")} value={String(summary.itemsSold)} />
              <Item label={ta("analytics.metrics.aov")} value={formatCurrency(summary.averageOrderValue)} />
              <Item label={ta("analytics.sales.biggestOrder")} value={formatCurrency(summary.biggestOrder)} />
              <Item label={ta("analytics.sales.smallestOrder")} value={formatCurrency(summary.smallestOrder)} />
              <Item label={ta("analytics.sales.avgItemsPerOrder")} value={summary.averageItemsPerOrder.toString()} />
            </dl>
            <p className="mt-3 text-xs text-gray-500">{ta("analytics.netRevenueDisclaimer")}</p>
          </section>

          <section className="rounded-xl border border-gray-200 p-4">
            <h2 className="mb-3 font-semibold text-brand-secondary">{ta("analytics.profit.title")}</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Item label={ta("analytics.profit.productRevenue")} value={formatCurrency(profit.productRevenue)} />
              <Item label={ta("analytics.profit.cogs")} value={formatCurrency(profit.cogs)} />
              <Item label={ta("cart.discount")} value={formatCurrency(profit.discountTotal)} />
              <Item label={ta("analytics.sales.refunds")} value={formatCurrency(profit.refundTotal)} />
              <Item label={ta("analytics.profit.grossProfit")} value={formatCurrency(profit.grossProfit)} highlight />
              <Item
                label={ta("analytics.profit.grossMargin")}
                value={profit.grossMargin == null ? ta("analytics.insufficientData") : `${profit.grossMargin}%`}
                highlight
              />
            </dl>
            <p className="mt-3 text-xs text-gray-500">{ta("analytics.profit.estimateDisclaimer")}</p>

            {missingCost.length > 0 && (
              <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-medium">{ta("analytics.profit.missingCostWarning")}</p>
                <ul className="mt-2 flex flex-col gap-1">
                  {missingCost.map((product) => (
                    <li key={product.id} className="flex justify-between">
                      <Link href={`/admin/produtos`} className="hover:underline">
                        {product.name}
                      </Link>
                      <span>{ta("analytics.profit.soldUnits", { count: product.quantitySold })}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </>
      )}

      <section className="rounded-xl border border-gray-200 p-4">
        <h2 className="mb-1 font-semibold text-brand-secondary">{ta("analytics.costs.title")}</h2>
        <p className="mb-4 text-sm text-gray-500">{ta("analytics.costs.subtitle")}</p>
        <AdditionalCostsManager costs={costs} />
      </section>
    </div>
  );
}

function Item({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className={highlight ? "font-semibold text-brand-secondary" : "text-gray-700"}>{value}</dd>
    </div>
  );
}
