import type { Metadata } from "next";
import { t } from "@/i18n";
import { AnalyticsNav } from "@/components/analytics/AnalyticsNav";
import { PeriodFilterBar } from "@/components/analytics/PeriodFilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/utils";
import { parseAnalyticsSearchParams, type AnalyticsSearchParams } from "@/lib/analytics/request-params";
import { getAnalyticsThresholds } from "@/lib/analytics/settings";
import { getCustomerAnalyticsSummary, listCustomersBySegment, type CustomerSegment } from "@/lib/analytics/customers";

export const metadata: Metadata = { title: t("analytics.nav.customers") };

interface CustomersAnalyticsPageProps {
  searchParams: Promise<AnalyticsSearchParams & { segmento?: string }>;
}

const SEGMENT_LABELS: Record<CustomerSegment, string> = {
  new: "Todos os clientes",
  recurring: "Clientes recorrentes",
  highValue: "Clientes de alto valor",
  inactive: "Clientes inativos",
  noOrders: "Clientes sem pedidos",
  usedCoupon: "Clientes que usaram cupom",
};

function isSegment(value: string | undefined): value is CustomerSegment {
  return !!value && value in SEGMENT_LABELS;
}

export default async function CustomersAnalyticsPage({ searchParams }: CustomersAnalyticsPageProps) {
  const rawParams = await searchParams;
  const { period, includeTest } = parseAnalyticsSearchParams(rawParams);
  const thresholds = await getAnalyticsThresholds();
  const segment: CustomerSegment = isSegment(rawParams.segmento) ? rawParams.segmento : "new";

  const [summary, customers] = await Promise.all([
    getCustomerAnalyticsSummary(period.range, includeTest),
    listCustomersBySegment(segment, thresholds, includeTest),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-brand-secondary">{t("analytics.nav.customers")}</h1>
      <AnalyticsNav active="clientes" />
      <PeriodFilterBar
        period={period.key}
        from={rawParams.de}
        to={rawParams.ate}
        compare={rawParams.comparar === "lastMonth" ? "lastMonth" : rawParams.comparar === "lastYear" ? "lastYear" : "previous"}
        includeTest={includeTest}
      />

      <section className="rounded-xl border border-gray-200 p-4">
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-4">
          <Item label={t("analytics.metrics.totalCustomers")} value={String(summary.totalCustomers)} />
          <Item label={t("analytics.metrics.newCustomers")} value={String(summary.newCustomers)} />
          <Item label={t("analytics.customers.oneTime")} value={String(summary.oneTimeCustomers)} />
          <Item label={t("analytics.customers.moreThanOnce")} value={String(summary.moreThanOnceCustomers)} />
          <Item label={t("analytics.customers.withoutOrders")} value={String(summary.customersWithoutOrders)} />
          <Item label={t("analytics.customers.avgSpendPerCustomer")} value={formatCurrency(summary.averageSpendPerCustomer)} />
          <Item label={t("analytics.customers.avgOrdersPerCustomer")} value={summary.averageOrdersPerCustomer.toString()} />
          <Item
            label={t("analytics.customers.avgDaysBetweenPurchases")}
            value={summary.averageDaysBetweenPurchases == null ? t("analytics.insufficientData") : `${summary.averageDaysBetweenPurchases}`}
          />
        </dl>
        <p className="mt-2 text-xs text-gray-500">{t("analytics.customers.recurringDefinition")}</p>
      </section>

      <form method="get" className="flex flex-wrap gap-3 text-sm">
        <input type="hidden" name="periodo" value={rawParams.periodo ?? period.key} />
        <select name="segmento" defaultValue={segment} className="rounded-lg border border-gray-300 px-3 py-2">
          {(Object.keys(SEGMENT_LABELS) as CustomerSegment[]).map((key) => (
            <option key={key} value={key}>
              {SEGMENT_LABELS[key]}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-lg bg-brand-primary px-4 py-2 font-medium text-white">
          {t("products.applyFilters")}
        </button>
      </form>

      {customers.length === 0 ? (
        <EmptyState title={t("analytics.insufficientData")} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">{t("admin.orders.columnCustomer")}</th>
                <th className="px-4 py-3">{t("account.myOrders")}</th>
                <th className="px-4 py-3">{t("analytics.customers.totalSpent")}</th>
                <th className="px-4 py-3">{t("analytics.customers.lastPurchase")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {customers.slice(0, 200).map((customer) => (
                <tr key={customer.id}>
                  <td className="px-4 py-3">
                    {customer.name}
                    <br />
                    <span className="text-xs text-gray-500">{customer.email}</span>
                  </td>
                  <td className="px-4 py-3">{customer.ordersCount}</td>
                  <td className="px-4 py-3">{formatCurrency(customer.totalSpent)}</td>
                  <td className="px-4 py-3">
                    {customer.lastPaidAt ? new Date(customer.lastPaidAt).toLocaleDateString("pt-BR") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
