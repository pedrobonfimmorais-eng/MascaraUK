"use client";

import { useActionState } from "react";
import { t } from "@/i18n";
import type { ReportSchedule } from "@/types/database";
import { createReportSchedule, toggleReportSchedule, deleteReportSchedule, type ScheduleActionResult } from "@/lib/actions/report-schedules";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { REPORT_TYPES } from "@/lib/reports/types";

const initialState: ScheduleActionResult = { ok: true, message: "" };

export function ReportScheduleManager({ schedules }: { schedules: ReportSchedule[] }) {
  const [state, formAction, isPending] = useActionState(createReportSchedule, initialState);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500">{t("analytics.schedule.disclaimer")}</p>

      {schedules.length > 0 && (
        <div className="flex flex-col gap-2">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm">
              <div>
                <p className="font-medium text-brand-secondary">
                  {schedule.report_type} — {schedule.frequency} — {schedule.format.toUpperCase()}
                </p>
                <p className="text-xs text-gray-500">{schedule.recipients.join(", ")}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={schedule.is_active ? "success" : "neutral"}>
                  {schedule.is_active ? t("common.yes") : t("common.no")}
                </Badge>
                <Button size="sm" variant="outline" onClick={() => toggleReportSchedule(schedule.id, !schedule.is_active)}>
                  {schedule.is_active ? t("analytics.schedule.deactivate") : t("analytics.schedule.activate")}
                </Button>
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteReportSchedule(schedule.id)}>
                  {t("common.delete")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <select name="reportType" className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          {REPORT_TYPES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select name="frequency" className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="diario">{t("analytics.schedule.daily")}</option>
          <option value="semanal">{t("analytics.schedule.weekly")}</option>
          <option value="mensal">{t("analytics.schedule.monthly")}</option>
        </select>
        <select name="format" className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="csv">CSV</option>
          <option value="xlsx">XLSX</option>
          <option value="pdf">PDF</option>
        </select>
        <input name="sendTime" type="time" defaultValue="08:00" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        <input
          name="recipients"
          placeholder={t("analytics.schedule.recipientsPlaceholder")}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        {state.message && <p className="text-sm text-emerald-700 sm:col-span-5">{state.message}</p>}
        <Button type="submit" disabled={isPending} className="w-fit sm:col-span-5">
          {t("analytics.schedule.save")}
        </Button>
      </form>
    </div>
  );
}
