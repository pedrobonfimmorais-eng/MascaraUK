import type { Metadata } from "next";
import { ta } from "@/i18n";
import { AnalyticsNav } from "@/components/analytics/AnalyticsNav";
import { PeriodFilterBar } from "@/components/analytics/PeriodFilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/utils";
import { parseAnalyticsSearchParams, type AnalyticsSearchParams } from "@/lib/analytics/request-params";
import { getAnalyticsThresholds } from "@/lib/analytics/settings";
import { getCartAnalyticsSummary, getMostAbandonedProducts } from "@/lib/analytics/carts";

export const metadata: Metadata = { title: ta("analytics.nav.carts") };

interface CartsAnalyticsPageProps {
  searchParams: Promise<AnalyticsSearchParams>;
}

export default async function CartsAnalyticsPage({ searchParams }: CartsAnalyticsPageProps) {
  const rawParams = await searchParams;
  const { period, includeTest } = parseAnalyticsSearchParams(rawParams);
  const thresholds = await getAnalyticsThresholds();

  const [summary, abandonedProducts] = await Promise.all([
    getCartAnalyticsSummary(period.range, includeTest, thresholds.abandonedCartHours),
    getMostAbandonedProducts(thresholds.abandonedCartHours),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-brand-secondary">{ta("analytics.nav.carts")}</h1>
      <AnalyticsNav active="carrinhos" />
      <PeriodFilterBar
        period={period.key}
        from={rawParams.de}
        to={rawParams.ate}
        compare={rawParams.comparar === "lastMonth" ? "lastMonth" : rawParams.comparar === "lastYear" ? "lastYear" : "previous"}
        includeTest={includeTest}
      />

      <p className="text-xs text-gray-500">
        {ta("analytics.carts.abandonedWindow", { hours: thresholds.abandonedCartHours })}
      </p>

      <section className="rounded-xl border border-gray-200 p-4">
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-4">
          <Item label={ta("analytics.carts.created")} value={String(summary.cartsCreated)} />
          <Item label={ta("analytics.carts.active")} value={String(summary.cartsActive)} />
          <Item label={ta("analytics.carts.converted")} value={String(summary.cartsConverted)} />
          <Item label={ta("analytics.carts.abandoned")} value={String(summary.cartsAbandoned)} />
          <Item
            label={ta("analytics.products.columnConversion")}
            value={summary.conversionRate == null ? ta("analytics.insufficientData") : `${summary.conversionRate}%`}
          />
          <Item label={ta("analytics.carts.totalValue")} value={formatCurrency(summary.totalCartValue)} />
          <Item label={ta("analytics.carts.convertedValue")} value={formatCurrency(summary.convertedValue)} />
          <Item label={ta("analytics.carts.abandonedValue")} value={formatCurrency(summary.abandonedValue)} />
          <Item label={ta("analytics.carts.avgItems")} value={summary.averageItemsPerCart.toString()} />
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 p-4">
        <h2 className="mb-3 font-semibold text-brand-secondary">{ta("analytics.carts.mostAbandonedTitle")}</h2>
        {abandonedProducts.length === 0 ? (
          <EmptyState title={ta("analytics.carts.noAbandoned")} />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">{ta("products.pageTitle")}</th>
                  <th className="px-3 py-2">{ta("product.selectVariant")}</th>
                  <th className="px-3 py-2">{ta("analytics.carts.cartsCount")}</th>
                  <th className="px-3 py-2">{ta("analytics.carts.abandonedQuantity")}</th>
                  <th className="px-3 py-2">{ta("analytics.carts.potentialValue")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {abandonedProducts.slice(0, 50).map((row, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2">{row.variantLabel ?? "—"}</td>
                    <td className="px-3 py-2">{row.cartsCount}</td>
                    <td className="px-3 py-2">{row.abandonedCount}</td>
                    <td className="px-3 py-2">{formatCurrency(row.potentialValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="font-medium text-brand-secondary">{value}</dd>
    </div>
  );
}
