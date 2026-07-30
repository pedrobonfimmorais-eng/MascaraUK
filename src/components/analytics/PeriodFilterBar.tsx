"use client";

import { useState } from "react";
import { t } from "@/i18n";
import { PERIOD_KEYS, type PeriodKey } from "@/lib/analytics/period";

const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: "Hoje",
  yesterday: "Ontem",
  last7: "Últimos 7 dias",
  last30: "Últimos 30 dias",
  thisMonth: "Este mês",
  lastMonth: "Mês anterior",
  last3Months: "Últimos 3 meses",
  last6Months: "Últimos 6 meses",
  thisYear: "Este ano",
  lastYear: "Ano anterior",
  custom: "Período personalizado",
};

interface PeriodFilterBarProps {
  period: PeriodKey;
  from?: string;
  to?: string;
  compare: "previous" | "lastMonth" | "lastYear";
  includeTest: boolean;
}

/** Plain GET form (like the admin orders filters) so every /admin/analytics/* page shares the same period params without extra client state. */
export function PeriodFilterBar({ period, from, to, compare, includeTest }: PeriodFilterBarProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>(period);

  return (
    <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 p-4 text-sm">
      <label className="flex flex-col gap-1">
        {t("analytics.period")}
        <select
          name="periodo"
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value as PeriodKey)}
          className="rounded-lg border border-gray-300 px-3 py-2"
        >
          {PERIOD_KEYS.map((key) => (
            <option key={key} value={key}>
              {PERIOD_LABELS[key]}
            </option>
          ))}
        </select>
      </label>

      {selectedPeriod === "custom" && (
        <>
          <label className="flex flex-col gap-1">
            {t("analytics.from")}
            <input name="de" type="date" defaultValue={from} className="rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1">
            {t("analytics.to")}
            <input name="ate" type="date" defaultValue={to} className="rounded-lg border border-gray-300 px-3 py-2" />
          </label>
        </>
      )}

      <label className="flex flex-col gap-1">
        {t("analytics.compareWith")}
        <select name="comparar" defaultValue={compare} className="rounded-lg border border-gray-300 px-3 py-2">
          <option value="previous">{t("analytics.comparePrevious")}</option>
          <option value="lastMonth">{t("analytics.compareLastMonth")}</option>
          <option value="lastYear">{t("analytics.compareLastYear")}</option>
        </select>
      </label>

      <label className="flex items-center gap-2 pb-2 text-gray-600">
        <input type="checkbox" name="teste" value="1" defaultChecked={includeTest} />
        {t("analytics.includeTestData")}
      </label>

      <button type="submit" className="rounded-lg bg-brand-primary px-4 py-2 font-medium text-white">
        {t("products.applyFilters")}
      </button>
    </form>
  );
}
