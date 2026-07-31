import type { Metadata } from "next";
import { ta } from "@/i18n";
import { AnalyticsNav } from "@/components/analytics/AnalyticsNav";
import { AlertsList } from "@/components/analytics/AlertsList";
import { computeAndSyncAlerts, listAlerts } from "@/lib/analytics/alerts";
import type { AlertStatus } from "@/types/database";

export const metadata: Metadata = { title: ta("analytics.nav.alerts") };

interface AlertsPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AlertsPage({ searchParams }: AlertsPageProps) {
  const { status } = await searchParams;
  await computeAndSyncAlerts();

  const alerts = await listAlerts(status && status !== "todos" ? (status as AlertStatus) : undefined);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-brand-secondary">{ta("analytics.nav.alerts")}</h1>
      <AnalyticsNav active="alertas" />

      <form method="get" className="flex gap-3 text-sm">
        <select name="status" defaultValue={status ?? "todos"} className="rounded-lg border border-gray-300 px-3 py-2">
          <option value="todos">{ta("admin.orders.allOrderStatuses")}</option>
          <option value="novo">{ta("analytics.alerts.status.novo")}</option>
          <option value="lido">{ta("analytics.alerts.status.lido")}</option>
          <option value="resolvido">{ta("analytics.alerts.status.resolvido")}</option>
          <option value="ignorado">{ta("analytics.alerts.status.ignorado")}</option>
        </select>
        <button type="submit" className="rounded-lg bg-brand-primary px-4 py-2 font-medium text-white">
          {ta("products.applyFilters")}
        </button>
      </form>

      <AlertsList alerts={alerts} />
    </div>
  );
}
