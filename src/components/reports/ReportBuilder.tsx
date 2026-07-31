"use client";

import { useMemo, useState } from "react";
import { t } from "@/i18n";
import { PERIOD_KEYS, type PeriodKey } from "@/lib/analytics/period";
import type { ReportType } from "@/lib/reports/types";
import { Button } from "@/components/ui/Button";

const REPORT_LABELS: Record<ReportType, string> = {
  pedidos: "Pedidos",
  vendas: "Vendas",
  produtos: "Produtos",
  estoque: "Estoque",
  clientes: "Clientes",
  cupons: "Cupons",
  promocoes: "Promoções",
  ofertas_relampago: "Ofertas Relâmpago",
  reembolsos: "Reembolsos",
  cancelamentos: "Cancelamentos",
  analytics_produtos: "Analytics de Produtos",
  movimentacoes_estoque: "Movimentações de Estoque",
  lucro_estimado: "Lucro Estimado",
};

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

export function ReportBuilder({ reportTypes }: { reportTypes: ReportType[] }) {
  const [type, setType] = useState<ReportType>(reportTypes[0]);
  const [periodo, setPeriodo] = useState<PeriodKey>("last30");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [status, setStatus] = useState("");
  const [valorMinimo, setValorMinimo] = useState("");
  const [valorMaximo, setValorMaximo] = useState("");
  const [includeTest, setIncludeTest] = useState(false);

  const params = useMemo(() => {
    const search = new URLSearchParams({ type, periodo });
    if (periodo === "custom") {
      if (de) search.set("de", de);
      if (ate) search.set("ate", ate);
    }
    if (status) search.set("status", status);
    if (valorMinimo) search.set("valorMinimo", valorMinimo);
    if (valorMaximo) search.set("valorMaximo", valorMaximo);
    if (includeTest) search.set("teste", "1");
    return search;
  }, [type, periodo, de, ate, status, valorMinimo, valorMaximo, includeTest]);

  function downloadUrl(format: "csv" | "xlsx") {
    const search = new URLSearchParams(params);
    search.set("format", format);
    return `/api/admin/reports/export?${search.toString()}`;
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-200 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          {t("analytics.reports.type")}
          <select value={type} onChange={(e) => setType(e.target.value as ReportType)} className="rounded-lg border border-gray-300 px-3 py-2">
            {reportTypes.map((value) => (
              <option key={value} value={value}>
                {REPORT_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-gray-700">
          {t("analytics.period")}
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value as PeriodKey)} className="rounded-lg border border-gray-300 px-3 py-2">
            {PERIOD_KEYS.map((key) => (
              <option key={key} value={key}>
                {PERIOD_LABELS[key]}
              </option>
            ))}
          </select>
        </label>

        {periodo === "custom" && (
          <>
            <label className="flex flex-col gap-1 text-sm text-gray-700">
              {t("analytics.from")}
              <input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm text-gray-700">
              {t("analytics.to")}
              <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2" />
            </label>
          </>
        )}

        <label className="flex flex-col gap-1 text-sm text-gray-700">
          {t("account.orderStatus")} ({t("common.optional")})
          <input value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          {t("products.filterPriceMin")}
          <input type="number" value={valorMinimo} onChange={(e) => setValorMinimo(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-700">
          {t("products.filterPriceMax")}
          <input type="number" value={valorMaximo} onChange={(e) => setValorMaximo(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2" />
        </label>
        <label className="flex items-center gap-2 pt-6 text-sm text-gray-700">
          <input type="checkbox" checked={includeTest} onChange={(e) => setIncludeTest(e.target.checked)} />
          {t("analytics.includeTestData")}
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button href={downloadUrl("csv")}>{t("analytics.reports.exportCsv")}</Button>
        <Button href={downloadUrl("xlsx")} variant="outline">
          {t("analytics.reports.exportXlsx")}
        </Button>
      </div>
    </div>
  );
}
