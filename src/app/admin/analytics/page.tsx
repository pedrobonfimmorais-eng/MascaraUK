import type { Metadata } from "next";
import { ta } from "@/i18n";
import { AnalyticsNav } from "@/components/analytics/AnalyticsNav";
import { PeriodFilterBar } from "@/components/analytics/PeriodFilterBar";
import { MetricCard } from "@/components/analytics/MetricCard";
import { AnalyticsChart } from "@/components/analytics/AnalyticsChart";
import { formatCurrency } from "@/lib/utils";
import { parseAnalyticsSearchParams, type AnalyticsSearchParams } from "@/lib/analytics/request-params";
import { getAnalyticsThresholds } from "@/lib/analytics/settings";
import {
  getPaidOrdersSummary,
  getOrderCounts,
  getCustomerCounts,
  getConversionRate,
  getAbandonedCartsCount,
  getStockAlertCounts,
  getDailySeries,
} from "@/lib/analytics/queries";
import { getApplicableAdditionalCosts } from "@/lib/analytics/costs";
import { formatBucketLabel } from "@/lib/analytics/period";

export const metadata: Metadata = { title: ta("analytics.nav.overview") };

interface AnalyticsPageProps {
  searchParams: Promise<AnalyticsSearchParams>;
}

export default async function AnalyticsOverviewPage({ searchParams }: AnalyticsPageProps) {
  const rawParams = await searchParams;
  const { period, compareRange, includeTest } = parseAnalyticsSearchParams(rawParams);
  const thresholds = await getAnalyticsThresholds();

  const [current, previous, orderCounts, customerCounts, conversion, abandonedCarts, stockAlerts, series] =
    await Promise.all([
      getPaidOrdersSummary(period.range, { includeTest }),
      getPaidOrdersSummary(compareRange, { includeTest }),
      getOrderCounts(period.range, { includeTest }),
      getCustomerCounts(period.range, { includeTest }),
      getConversionRate(period.range, { includeTest }),
      getAbandonedCartsCount(thresholds.abandonedCartHours, includeTest),
      getStockAlertCounts(thresholds.lowStockQuantity),
      getDailySeries(period.range, { includeTest }),
    ]);

  const additionalCosts = await getApplicableAdditionalCosts(period.range, current.grossRevenue, current.paidOrdersCount);
  const netRevenueEstimate = Math.max(
    0,
    current.grossRevenue - current.discountTotal - current.refundTotal - additionalCosts.total
  );

  function changePercent(currentValue: number, previousValue: number): number | null {
    if (previousValue === 0) return currentValue === 0 ? 0 : null;
    return Math.round(((currentValue - previousValue) / previousValue) * 1000) / 10;
  }

  const labels = series.map((point) => formatBucketLabel(new Date(point.date), "day"));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-brand-secondary">{ta("analytics.nav.overview")}</h1>
      <AnalyticsNav active="geral" />
      <PeriodFilterBar
        period={period.key}
        from={rawParams.de}
        to={rawParams.ate}
        compare={
          rawParams.comparar === "lastMonth" ? "lastMonth" : rawParams.comparar === "lastYear" ? "lastYear" : "previous"
        }
        includeTest={includeTest}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={ta("analytics.metrics.grossRevenue")}
          value={formatCurrency(current.grossRevenue)}
          explanation={ta("analytics.explain.grossRevenue")}
          changePercent={changePercent(current.grossRevenue, previous.grossRevenue)}
          href="/admin/analytics/vendas"
        />
        <MetricCard
          label={ta("analytics.metrics.netRevenue")}
          value={formatCurrency(netRevenueEstimate)}
          explanation={ta("analytics.explain.netRevenue")}
          href="/admin/analytics/vendas"
        />
        <MetricCard
          label={ta("analytics.metrics.orderCount")}
          value={String(orderCounts.total)}
          explanation={ta("analytics.explain.orderCount")}
          href="/admin/pedidos"
        />
        <MetricCard
          label={ta("analytics.metrics.paidOrders")}
          value={String(orderCounts.paid)}
          explanation={ta("analytics.explain.paidOrders")}
          href="/admin/pedidos?payment=pago"
        />
        <MetricCard
          label={ta("analytics.metrics.cancelledOrders")}
          value={String(orderCounts.cancelled)}
          explanation={ta("analytics.explain.cancelledOrders")}
          href="/admin/pedidos?status=cancelado"
        />
        <MetricCard
          label={ta("analytics.metrics.refundedOrders")}
          value={String(orderCounts.refunded)}
          explanation={ta("analytics.explain.refundedOrders")}
          href="/admin/pedidos?payment=reembolsado"
        />
        <MetricCard
          label={ta("analytics.metrics.itemsSold")}
          value={String(current.itemsSold)}
          explanation={ta("analytics.explain.itemsSold")}
          href="/admin/analytics/produtos"
        />
        <MetricCard
          label={ta("analytics.metrics.aov")}
          value={formatCurrency(current.averageOrderValue)}
          explanation={ta("analytics.explain.aov")}
          changePercent={changePercent(current.averageOrderValue, previous.averageOrderValue)}
          href="/admin/analytics/vendas"
        />
        <MetricCard
          label={ta("analytics.metrics.totalCustomers")}
          value={String(customerCounts.totalCustomers)}
          explanation={ta("analytics.explain.totalCustomers")}
          href="/admin/analytics/clientes"
        />
        <MetricCard
          label={ta("analytics.metrics.newCustomers")}
          value={String(customerCounts.newCustomers)}
          explanation={ta("analytics.explain.newCustomers")}
          href="/admin/analytics/clientes"
        />
        <MetricCard
          label={ta("analytics.metrics.recurringCustomers")}
          value={String(customerCounts.recurringCustomers)}
          explanation={ta("analytics.explain.recurringCustomers")}
          href="/admin/analytics/clientes"
        />
        <MetricCard
          label={ta("analytics.metrics.conversionRate")}
          value={conversion.conversionRate == null ? ta("analytics.insufficientData") : `${conversion.conversionRate}%`}
          explanation={ta("analytics.explain.conversionRate")}
        />
        <MetricCard
          label={ta("analytics.metrics.abandonedCarts")}
          value={String(abandonedCarts)}
          explanation={ta("analytics.explain.abandonedCarts")}
          href="/admin/analytics/carrinhos"
        />
        <MetricCard
          label={ta("analytics.metrics.outOfStock")}
          value={String(stockAlerts.outOfStock)}
          explanation={ta("analytics.explain.outOfStock")}
          href="/admin/analytics/estoque"
        />
        <MetricCard
          label={ta("analytics.metrics.lowStock")}
          value={String(stockAlerts.lowStock)}
          explanation={ta("analytics.explain.lowStock")}
          href="/admin/analytics/estoque"
        />
      </div>

      {additionalCosts.total > 0 || current.refundTotal > 0 ? (
        <p className="text-xs text-gray-500">{ta("analytics.netRevenueDisclaimer")}</p>
      ) : null}

      <section className="rounded-xl border border-gray-200 p-4">
        <h2 className="mb-3 font-semibold text-brand-secondary">{ta("analytics.charts.revenuePerDay")}</h2>
        <AnalyticsChart
          labels={labels}
          series={[{ key: "revenue", label: ta("analytics.charts.revenuePerDay"), color: "#7c3aed", values: series.map((p) => p.revenue), isCurrency: true }]}
        />
      </section>

      <section className="rounded-xl border border-gray-200 p-4">
        <h2 className="mb-3 font-semibold text-brand-secondary">{ta("analytics.charts.ordersPerDay")}</h2>
        <AnalyticsChart
          labels={labels}
          series={[{ key: "orders", label: ta("analytics.charts.ordersPerDay"), color: "#111827", values: series.map((p) => p.orders) }]}
        />
      </section>

      <section className="rounded-xl border border-gray-200 p-4">
        <h2 className="mb-3 font-semibold text-brand-secondary">{ta("analytics.charts.itemsSoldPerDay")}</h2>
        <AnalyticsChart
          labels={labels}
          series={[{ key: "items", label: ta("analytics.charts.itemsSoldPerDay"), color: "#059669", values: series.map((p) => p.itemsSold) }]}
        />
      </section>

      <section className="rounded-xl border border-gray-200 p-4">
        <h2 className="mb-3 font-semibold text-brand-secondary">{ta("analytics.charts.aovPerDay")}</h2>
        <AnalyticsChart
          labels={labels}
          series={[{ key: "aov", label: ta("analytics.charts.aovPerDay"), color: "#d97706", values: series.map((p) => p.averageOrderValue), isCurrency: true }]}
        />
      </section>

      <section className="rounded-xl border border-gray-200 p-4">
        <h2 className="mb-3 font-semibold text-brand-secondary">{ta("analytics.charts.customers")}</h2>
        <AnalyticsChart
          labels={labels}
          series={[
            { key: "new", label: ta("analytics.metrics.newCustomers"), color: "#2563eb", values: series.map((p) => p.newCustomers) },
            { key: "recurring", label: ta("analytics.metrics.recurringCustomers"), color: "#7c3aed", values: series.map((p) => p.recurringCustomers) },
          ]}
        />
      </section>

      <section className="rounded-xl border border-gray-200 p-4">
        <h2 className="mb-3 font-semibold text-brand-secondary">{ta("analytics.charts.refundsAndCancellations")}</h2>
        <AnalyticsChart
          labels={labels}
          series={[
            { key: "refunds", label: ta("orderStatus.cancelado"), color: "#dc2626", values: series.map((p) => p.cancellations) },
            { key: "refundValue", label: ta("account.refunds"), color: "#b91c1c", values: series.map((p) => p.refunds), isCurrency: true },
          ]}
        />
      </section>
    </div>
  );
}
