import { resolvePeriod, PERIOD_KEYS, type PeriodKey, type DateRange, type ResolvedPeriod } from "@/lib/analytics/period";

export interface AnalyticsSearchParams {
  periodo?: string;
  de?: string;
  ate?: string;
  comparar?: string;
  teste?: string;
}

export interface ParsedAnalyticsRequest {
  period: ResolvedPeriod;
  compareMode: "previous" | "lastMonth" | "lastYear";
  compareRange: DateRange;
  includeTest: boolean;
}

function isPeriodKey(value: string | undefined): value is PeriodKey {
  return !!value && (PERIOD_KEYS as string[]).includes(value);
}

export function parseAnalyticsSearchParams(params: AnalyticsSearchParams): ParsedAnalyticsRequest {
  const periodKey: PeriodKey = isPeriodKey(params.periodo) ? params.periodo : "last30";
  const period = resolvePeriod(periodKey, params.de, params.ate);

  const compareMode: ParsedAnalyticsRequest["compareMode"] =
    params.comparar === "lastMonth" ? "lastMonth" : params.comparar === "lastYear" ? "lastYear" : "previous";

  const compareRange =
    compareMode === "lastMonth" ? period.previousMonthRange : compareMode === "lastYear" ? period.previousYearRange : period.previousRange;

  return {
    period,
    compareMode,
    compareRange,
    includeTest: params.teste === "1" || params.teste === "true",
  };
}
