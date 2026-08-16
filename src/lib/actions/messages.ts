"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/actions/activity-log";
import type { MessageStatus } from "@/types/database";

export interface MessageActionResult {
  ok: boolean;
  message: string;
}

const VALID_STATUSES: MessageStatus[] = ["nova", "em_atendimento", "aguardando_cliente", "resolvida", "spam"];

export async function updateMessageStatus(messageId: string, status: MessageStatus): Promise<MessageActionResult> {
  const staff = await requirePermission("messages.manage");
  if (!staff) return { ok: false, message: "Acesso não autorizado." };
  if (!VALID_STATUSES.includes(status)) return { ok: false, message: "Status inválido." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("messages")
    .update({ status, handled_by: staff.id, updated_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) return { ok: false, message: "Não foi possível atualizar o status." };

  await logAdminAction({
    adminId: staff.id,
    action: "mensagem_status_alterado",
    entityType: "message",
    entityId: messageId,
    details: { newStatus: status },
  });

  revalidatePath("/admin/mensagens");
  revalidatePath(`/admin/mensagens/${messageId}`);
  return { ok: true, message: "Status atualizado." };
}

export async function saveMessageNote(messageId: string, note: string): Promise<MessageActionResult> {
  const staff = await requirePermission("messages.manage");
  if (!staff) return { ok: false, message: "Acesso não autorizado." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("messages")
    .update({ admin_note: note, updated_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) return { ok: false, message: "Não foi possível salvar a observação." };

  revalidatePath(`/admin/mensagens/${messageId}`);
  return { ok: true, message: "Observação salva." };
}
