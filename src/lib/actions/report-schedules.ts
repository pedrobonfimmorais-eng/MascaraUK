"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ReportSchedule } from "@/types/database";

export interface ScheduleActionResult {
  ok: boolean;
  message: string;
}

const FREQUENCIES: ReportSchedule["frequency"][] = ["diario", "semanal", "mensal"];
const FORMATS: ReportSchedule["format"][] = ["csv", "xlsx", "pdf"];

function toFrequency(value: string): ReportSchedule["frequency"] {
  return (FREQUENCIES as string[]).includes(value) ? (value as ReportSchedule["frequency"]) : "diario";
}

function toFormat(value: string): ReportSchedule["format"] {
  return (FORMATS as string[]).includes(value) ? (value as ReportSchedule["format"]) : "csv";
}

/** Only stores the preference — no automatic sending happens until a scheduler job is wired up (see README). */
export async function createReportSchedule(
  _prevState: ScheduleActionResult,
  formData: FormData
): Promise<ScheduleActionResult> {
  const admin = await requirePermission("reports.export");
  if (!admin) return { ok: false, message: "Acesso não autorizado." };

  const reportType = String(formData.get("reportType") ?? "").trim();
  const frequency = toFrequency(String(formData.get("frequency") ?? "diario"));
  const format = toFormat(String(formData.get("format") ?? "csv"));
  const sendTime = String(formData.get("sendTime") ?? "08:00");
  const recipientsRaw = String(formData.get("recipients") ?? "");
  const recipients = recipientsRaw
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  if (!reportType || recipients.length === 0) {
    return { ok: false, message: "Selecione o tipo de relatório e informe ao menos um destinatário." };
  }

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.from("report_schedules").insert({
    report_type: reportType,
    frequency,
    format,
    send_time: sendTime,
    recipients,
    is_active: false,
    created_by: admin.id,
  });

  if (error) return { ok: false, message: "Não foi possível salvar o agendamento." };

  revalidatePath("/admin/relatorios");
  return { ok: true, message: "Agendamento salvo (inativo até ser ativado)." };
}

export async function toggleReportSchedule(scheduleId: string, isActive: boolean): Promise<void> {
  const admin = await requirePermission("reports.export");
  if (!admin) return;

  const supabaseAdmin = createAdminClient();
  await supabaseAdmin.from("report_schedules").update({ is_active: isActive }).eq("id", scheduleId);
  revalidatePath("/admin/relatorios");
}

export async function deleteReportSchedule(scheduleId: string): Promise<void> {
  const admin = await requirePermission("reports.export");
  if (!admin) return;

  const supabaseAdmin = createAdminClient();
  await supabaseAdmin.from("report_schedules").delete().eq("id", scheduleId);
  revalidatePath("/admin/relatorios");
}
