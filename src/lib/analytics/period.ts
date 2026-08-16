/**
 * Resolves the named period filters used across /admin/analytics into
 * concrete date ranges, plus the three comparison ranges the spec asks
 * for (equivalent previous period, same period last month, same period
 * last year). Dates are treated as whole UTC days — a reasonable
 * simplification for a single-timezone (BR) store without pulling in a
 * timezone library.
 */
export type PeriodKey =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "last3Months"
  | "last6Months"
  | "thisYear"
  | "lastYear"
  | "custom";

export const PERIOD_KEYS: PeriodKey[] = [
  "today",
  "yesterday",
  "last7",
  "last30",
  "thisMonth",
  "lastMonth",
  "last3Months",
  "last6Months",
  "thisYear",
  "lastYear",
  "custom",
];

export interface DateRange {
  /** Inclusive start of day, UTC. */
  start: Date;
  /** Exclusive end (start of the day after the last day included). */
  end: Date;
}

export interface ResolvedPeriod {
  key: PeriodKey;
  range: DateRange;
  previousRange: DateRange;
  previousMonthRange: DateRange;
  previousYearRange: DateRange;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result;
}

function rangeLengthMs(range: DateRange): number {
  return range.end.getTime() - range.start.getTime();
}

function shiftRangeBefore(range: DateRange): DateRange {
  const length = rangeLengthMs(range);
  return { start: new Date(range.start.getTime() - length), end: new Date(range.start.getTime()) };
}

function shiftRangeByMonths(range: DateRange, months: number): DateRange {
  return { start: addMonths(range.start, months), end: addMonths(range.end, months) };
}

function shiftRangeByYears(range: DateRange, years: number): DateRange {
  return { start: addYears(range.start, years), end: addYears(range.end, years) };
}

/**
 * @param customFrom / customTo: "YYYY-MM-DD" strings, only used when key === "custom".
 */
export function resolvePeriod(key: PeriodKey, customFrom?: string, customTo?: string, now: Date = new Date()): ResolvedPeriod {
  const today = startOfUtcDay(now);
  const tomorrow = addDays(today, 1);

  let range: DateRange;

  switch (key) {
    case "today":
      range = { start: today, end: tomorrow };
      break;
    case "yesterday":
      range = { start: addDays(today, -1), end: today };
      break;
    case "last7":
      range = { start: addDays(today, -6), end: tomorrow };
      break;
    case "last30":
      range = { start: addDays(today, -29), end: tomorrow };
      break;
    case "thisMonth": {
      const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
      range = { start, end: tomorrow };
      break;
    }
    case "lastMonth": {
      const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
      const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
      range = { start, end };
      break;
    }
    case "last3Months":
      range = { start: addMonths(today, -3), end: tomorrow };
      break;
    case "last6Months":
      range = { start: addMonths(today, -6), end: tomorrow };
      break;
    case "thisYear": {
      const start = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
      range = { start, end: tomorrow };
      break;
    }
    case "lastYear": {
      const start = new Date(Date.UTC(today.getUTCFullYear() - 1, 0, 1));
      const end = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
      range = { start, end };
      break;
    }
    case "custom": {
      const parsedFrom = customFrom ? startOfUtcDay(new Date(`${customFrom}T00:00:00Z`)) : addDays(today, -6);
      const parsedTo = customTo ? addDays(startOfUtcDay(new Date(`${customTo}T00:00:00Z`)), 1) : tomorrow;
      range = parsedFrom < parsedTo ? { start: parsedFrom, end: parsedTo } : { start: parsedTo, end: parsedFrom };
      break;
    }
    default:
      range = { start: addDays(today, -6), end: tomorrow };
  }

  return {
    key,
    range,
    previousRange: shiftRangeBefore(range),
    previousMonthRange: shiftRangeByMonths(range, -1),
    previousYearRange: shiftRangeByYears(range, -1),
  };
}

/** Percentage change from previous to current; null when there's nothing meaningful to compare against. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Splits a range into day/week/month buckets for chart x-axes. */
export function bucketDates(range: DateRange, granularity: "day" | "week" | "month"): Date[] {
  const buckets: Date[] = [];
  let cursor = new Date(range.start);

  while (cursor < range.end) {
    buckets.push(new Date(cursor));
    if (granularity === "day") cursor = addDays(cursor, 1);
    else if (granularity === "week") cursor = addDays(cursor, 7);
    else cursor = addMonths(cursor, 1);
  }

  return buckets;
}

export function formatBucketLabel(date: Date, granularity: "day" | "week" | "month"): string {
  if (granularity === "month") {
    return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" });
  }
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}
