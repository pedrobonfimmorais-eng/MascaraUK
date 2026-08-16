import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ta, type TranslationKey } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { AnalyticsNav } from "@/components/analytics/AnalyticsNav";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { getAnalyticsThresholds } from "@/lib/analytics/settings";
import { getStockAnalytics, buildSimpleForecast } from "@/lib/analytics/stock";

export const metadata: Metadata = { title: ta("analytics.nav.stock") };

interface StockAnalyticsPageProps {
  searchParams: Promise<{ teste?: string }>;
}

const STATUS_TONE: Record<string, "danger" | "warning" | "neutral" | "success"> = {
  sem_estoque: "danger",
  estoque_baixo: "warning",
  excesso: "neutral",
  parado: "neutral",
  normal: "success",
};

export default async function StockAnalyticsPage({ searchParams }: StockAnalyticsPageProps) {
  const staff = await requirePermission("analytics.view");
  if (!staff) redirect("/acesso-negado");

  const { teste } = await searchParams;
  const includeTest = teste === "1";
  const thresholds = await getAnalyticsThresholds();
  const summary = await getStockAnalytics(thresholds, includeTest);
  const forecast = buildSimpleForecast(summary.rows).filter((f) => f.needsRestock).slice(0, 20);

  const problemRows = summary.rows.filter((r) => r.status !== "normal");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-brand-secondary">{ta("analytics.nav.stock")}</h1>
      <AnalyticsNav active="estoque" />

      <section className="rounded-xl border border-gray-200 p-4">
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
          <Item label={ta("analytics.metrics.outOfStock")} value={String(summary.outOfStockCount)} />
          <Item label={ta("analytics.metrics.lowStock")} value={String(summary.lowStockCount)} />
          <Item label={ta("analytics.stock.excess")} value={String(summary.excessCount)} />
          <Item label={ta("analytics.stock.stalled")} value={String(summary.stalledCount)} />
          <Item label={ta("analytics.stock.totalValue")} value={formatCurrency(summary.totalStockValue)} />
          <Item
            label={ta("analytics.stock.totalCost")}
            value={summary.totalStockCost == null ? ta("analytics.profit.costNotInformed") : formatCurrency(summary.totalStockCost)}
          />
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 p-4">
        <h2 className="mb-3 font-semibold text-brand-secondary">{ta("analytics.stock.problemsTitle")}</h2>
        {problemRows.length === 0 ? (
          <EmptyState title={ta("analytics.insufficientData")} />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">{ta("products.pageTitle")}</th>
                  <th className="px-3 py-2">{ta("admin.sidebar.inventory")}</th>
                  <th className="px-3 py-2">{ta("analytics.stock.soldLast30Days")}</th>
                  <th className="px-3 py-2">{ta("analytics.stock.estimatedDays")}</th>
                  <th className="px-3 py-2">{ta("account.orderStatus")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {problemRows.slice(0, 100).map((row, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2">{row.stock}</td>
                    <td className="px-3 py-2">{row.soldLast30Days}</td>
                    <td className="px-3 py-2">{row.estimatedDaysOfStock ?? "—"}</td>
                    <td className="px-3 py-2">
                      <Badge tone={STATUS_TONE[row.status]}>{ta(`analytics.stock.status.${row.status}` as TranslationKey)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 p-4">
        <h2 className="mb-1 font-semibold text-brand-secondary">{ta("analytics.stock.forecastTitle")}</h2>
        <p className="mb-3 text-xs text-gray-500">{ta("analytics.stock.forecastDisclaimer")}</p>
        {forecast.length === 0 ? (
          <EmptyState title={ta("analytics.insufficientData")} />
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {forecast.map((item) => (
              <li key={item.productId} className="flex items-center justify-between rounded-lg bg-gray-50 p-2">
                <span>{item.name}</span>
                <span className="text-gray-600">
                  {ta("analytics.stock.daysUntilStockout", { days: item.estimatedDaysUntilStockout ?? 0 })}
                </span>
              </li>
            ))}
          </ul>
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
