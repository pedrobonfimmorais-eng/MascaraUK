"use client";

import { useState } from "react";
import Link from "next/link";
import { t } from "@/i18n";

export interface MetricCardProps {
  label: string;
  value: string;
  explanation: string;
  changePercent?: number | null;
  href?: string;
}

export function MetricCard({ label, value, explanation, changePercent, href }: MetricCardProps) {
  const [showHelp, setShowHelp] = useState(false);

  const changeTone =
    changePercent == null ? "text-gray-400" : changePercent > 0 ? "text-emerald-600" : changePercent < 0 ? "text-red-600" : "text-gray-500";

  return (
    <div className="relative rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-gray-500">{label}</p>
        <button
          type="button"
          aria-label={t("analytics.whatIsThis")}
          onClick={() => setShowHelp((v) => !v)}
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-gray-300 text-[10px] text-gray-400 hover:border-brand-primary hover:text-brand-primary"
        >
          ?
        </button>
      </div>

      {showHelp && (
        <p className="mt-1 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">{explanation}</p>
      )}

      <p className="mt-2 text-2xl font-semibold text-brand-secondary">{value}</p>

      <div className="mt-1 flex items-center justify-between">
        <p className={`text-xs font-medium ${changeTone}`}>
          {changePercent == null
            ? t("analytics.noPreviousData")
            : `${changePercent > 0 ? "+" : ""}${changePercent}% ${t("analytics.vsPreviousPeriod")}`}
        </p>
        {href && (
          <Link href={href} className="text-xs font-medium text-brand-primary hover:underline">
            {t("analytics.viewDetails")}
          </Link>
        )}
      </div>
    </div>
  );
}
