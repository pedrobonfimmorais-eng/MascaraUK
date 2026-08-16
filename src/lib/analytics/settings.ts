import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface AnalyticsThresholds {
  highValueCustomerTotalSpent: number;
  inactiveCustomerDays: number;
  abandonedCartHours: number;
  lowStockQuantity: number;
  excessStockQuantity: number;
  stalledProductDays: number;
}

const DEFAULT_THRESHOLDS: AnalyticsThresholds = {
  highValueCustomerTotalSpent: 500,
  inactiveCustomerDays: 90,
  abandonedCartHours: 24,
  lowStockQuantity: 5,
  excessStockQuantity: 100,
  stalledProductDays: 60,
};

/** Every threshold used across /admin/analytics comes from here — never hardcoded inline. */
export async function getAnalyticsThresholds(): Promise<AnalyticsThresholds> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return DEFAULT_THRESHOLDS;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("store_settings")
      .select("value")
      .eq("key", "analytics_thresholds")
      .maybeSingle();

    const value = data?.value as Partial<Record<string, number>> | undefined;
    if (!value) return DEFAULT_THRESHOLDS;

    return {
      highValueCustomerTotalSpent: value.high_value_customer_total_spent ?? DEFAULT_THRESHOLDS.highValueCustomerTotalSpent,
      inactiveCustomerDays: value.inactive_customer_days ?? DEFAULT_THRESHOLDS.inactiveCustomerDays,
      abandonedCartHours: value.abandoned_cart_hours ?? DEFAULT_THRESHOLDS.abandonedCartHours,
      lowStockQuantity: value.low_stock_quantity ?? DEFAULT_THRESHOLDS.lowStockQuantity,
      excessStockQuantity: value.excess_stock_quantity ?? DEFAULT_THRESHOLDS.excessStockQuantity,
      stalledProductDays: value.stalled_product_days ?? DEFAULT_THRESHOLDS.stalledProductDays,
    };
  } catch {
    return DEFAULT_THRESHOLDS;
  }
}

export async function updateAnalyticsThresholds(thresholds: AnalyticsThresholds): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("store_settings")
    .update({
      value: {
        high_value_customer_total_spent: thresholds.highValueCustomerTotalSpent,
        inactive_customer_days: thresholds.inactiveCustomerDays,
        abandoned_cart_hours: thresholds.abandonedCartHours,
        low_stock_quantity: thresholds.lowStockQuantity,
        excess_stock_quantity: thresholds.excessStockQuantity,
        stalled_product_days: thresholds.stalledProductDays,
      },
    })
    .eq("key", "analytics_thresholds");
}
