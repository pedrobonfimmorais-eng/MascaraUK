"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AlertStatus } from "@/types/database";

async function updateAlertStatus(alertId: string, status: AlertStatus): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) return;

  const supabaseAdmin = createAdminClient();
  await supabaseAdmin.from("alerts").update({ status }).eq("id", alertId);
  revalidatePath("/admin/analytics/alertas");
}

export async function markAlertRead(alertId: string): Promise<void> {
  await updateAlertStatus(alertId, "lido");
}

export async function markAlertResolved(alertId: string): Promise<void> {
  await updateAlertStatus(alertId, "resolvido");
}

export async function ignoreAlert(alertId: string): Promise<void> {
  await updateAlertStatus(alertId, "ignorado");
}
