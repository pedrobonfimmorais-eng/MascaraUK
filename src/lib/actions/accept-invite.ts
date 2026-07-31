"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/actions/activity-log";
import type { AdminInvite } from "@/types/database";

export interface AcceptInviteResult {
  ok: boolean;
  message: string;
}

export async function getPendingInvite(token: string): Promise<{ invite: AdminInvite | null; error: string | null }> {
  if (!token) return { invite: null, error: "Convite inválido." };

  const admin = createAdminClient();
  const { data: invite } = await admin.from("admin_invites").select("*").eq("token", token).maybeSingle();

  if (!invite) return { invite: null, error: "Convite não encontrado. Peça um novo convite ao administrador principal." };
  if (invite.used_at) return { invite: null, error: "Este convite já foi utilizado." };
  if (new Date(invite.expires_at) < new Date()) return { invite: null, error: "Este convite expirou. Peça um novo convite." };

  return { invite, error: null };
}

/**
 * Turns a valid, unused admin invite into a real account with the invited
 * role/permissions. This is the only way an account other than "cliente"
 * can ever be created — there is no public admin sign-up form.
 */
export async function acceptAdminInvite(
  token: string,
  fullName: string,
  password: string
): Promise<AcceptInviteResult> {
  const { invite, error } = await getPendingInvite(token);
  if (!invite) return { ok: false, message: error ?? "Convite inválido." };

  if (!fullName.trim()) return { ok: false, message: "Informe seu nome completo." };
  if (password.length < 8) return { ok: false, message: "A senha precisa ter pelo menos 8 caracteres." };

  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    if (createError?.message?.toLowerCase().includes("already")) {
      return {
        ok: false,
        message: "Já existe uma conta com este e-mail. Entre em contato com o administrador principal para vincular o acesso manualmente.",
      };
    }
    return { ok: false, message: "Não foi possível criar a conta. Tente novamente." };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ role: invite.role, permissions: invite.permissions, full_name: fullName.trim() })
    .eq("id", created.user.id);

  if (profileError) {
    return { ok: false, message: "Conta criada, mas houve um erro ao definir o acesso. Contate o administrador principal." };
  }

  await admin.from("admin_invites").update({ used_at: new Date().toISOString() }).eq("id", invite.id);

  await logAdminAction({
    adminId: created.user.id,
    action: "convite_admin_aceito",
    entityType: "profile",
    entityId: created.user.id,
    details: { role: invite.role },
  });

  return { ok: true, message: "Conta criada com sucesso. Você já pode fazer login." };
}

export interface AcceptInviteFormState {
  error: string | null;
  success?: boolean;
}

export async function acceptAdminInviteFormAction(
  _prevState: AcceptInviteFormState,
  formData: FormData
): Promise<AcceptInviteFormState> {
  const token = String(formData.get("token") ?? "");
  const fullName = String(formData.get("fullName") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password !== confirmPassword) {
    return { error: "As senhas não coincidem." };
  }

  const result = await acceptAdminInvite(token, fullName, password);
  return result.ok ? { error: null, success: true } : { error: result.message };
}
