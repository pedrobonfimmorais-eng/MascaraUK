import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ta } from "@/i18n";
import { requirePermission } from "@/lib/auth";
import { AnalyticsNav } from "@/components/analytics/AnalyticsNav";
import { ReportBuilder } from "@/components/reports/ReportBuilder";
import { ReportScheduleManager } from "@/components/reports/ReportScheduleManager";
import { REPORT_TYPES } from "@/lib/reports/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ReportSchedule } from "@/types/database";

export const metadata: Metadata = { title: ta("analytics.nav.reports") };

// Depends on the service-role client (no cookies/searchParams touched otherwise),
// so force dynamic rendering — this page must never run at build time.
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const staff = await requirePermission("reports.export");
  if (!staff) redirect("/acesso-negado");

  let schedules: ReportSchedule[] = [];
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient();
    const { data } = await admin.from("report_schedules").select("*").order("created_at", { ascending: false });
    schedules = data ?? [];
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-brand-secondary">{ta("analytics.nav.reports")}</h1>
      <AnalyticsNav active="relatorios" />

      <ReportBuilder reportTypes={REPORT_TYPES} />

      <section className="rounded-xl border border-gray-200 p-4">
        <h2 className="mb-1 font-semibold text-brand-secondary">{ta("analytics.schedule.title")}</h2>
        <ReportScheduleManager schedules={schedules ?? []} />
      </section>
    </div>
  );
}
