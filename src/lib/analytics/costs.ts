import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DateRange } from "@/lib/analytics/period";
import type { AdditionalCost } from "@/types/database";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface CostBreakdownItem {
  id: string;
  name: string;
  amount: number;
}

export interface CostBreakdown {
  items: CostBreakdownItem[];
  total: number;
}

/**
 * Applies each active additional cost to the period: percentage costs are a
 * % of gross revenue, fixed costs are charged per paid order (e.g.
 * "embalagem: R$5" × number of paid orders). A cost only counts when its
 * active window (starts_at/ends_at) overlaps the selected period.
 */
export async function getApplicableAdditionalCosts(
  range: DateRange,
  grossRevenue: number,
  paidOrdersCount: number
): Promise<CostBreakdown> {
  const admin = createAdminClient();
  const { data } = await admin.from("additional_costs").select("*").eq("is_active", true);

  const items: CostBreakdownItem[] = [];

  for (const cost of (data ?? []) as AdditionalCost[]) {
    if (cost.starts_at && new Date(cost.starts_at) >= range.end) continue;
    if (cost.ends_at && new Date(cost.ends_at) < range.start) continue;

    const amount =
      cost.amount_type === "percentual" ? round2(grossRevenue * (cost.value / 100)) : round2(cost.value * paidOrdersCount);

    if (amount > 0) items.push({ id: cost.id, name: cost.name, amount });
  }

  return { items, total: round2(items.reduce((sum, item) => sum + item.amount, 0)) };
}

export async function listAdditionalCosts(): Promise<AdditionalCost[]> {
  const admin = createAdminClient();
  const { data } = await admin.from("additional_costs").select("*").order("created_at", { ascending: false });
  return data ?? [];
}
