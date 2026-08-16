"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { ta, type TranslationKey } from "@/i18n";
import { requirePrincipal } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTemplateEmail, adminInviteEmail } from "@/lib/email";
import { logAdminAction } from "@/lib/actions/activity-log";
import { listGrantablePermissions } from "@/lib/permissions";
import type { UserRole } from "@/types/database";

export interface AdminActionResult {
  ok: boolean;
  message: string;
}

const INVITE_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const INVITABLE_ROLES: UserRole[] = ["estoque", "atendimento", "gerente", "administrador"];

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/**
 * Only ADMINISTRADOR_PRINCIPAL can invite new staff — there is no public
 * sign-up path to any admin role. The invite is single-use and expires.
 */
export async function createAdminInvite(
  _prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const principal = await requirePrincipal();
  if (!principal) return { ok: false, message: "Apenas o administrador principal pode convidar novos administradores." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "") as UserRole;

  if (!email || !email.includes("@")) return { ok: false, message: "Informe um e-mail válido." };
  if (!INVITABLE_ROLES.includes(role)) return { ok: false, message: "Papel inválido." };

  const permissions =
    role === "administrador"
      ? Object.fromEntries(listGrantablePermissions().map((cap) => [cap, formData.get(`perm_${cap}`) === "on"]))
      : {};

  const admin = createAdminClient();

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

  const { error } = await admin.from("admin_invites").insert({
    email,
    role,
    permissions,
    token,
    invited_by: principal.id,
    expires_at: expiresAt,
  });

  if (error) return { ok: false, message: "Não foi possível criar o convite." };

  const acceptUrl = `${siteUrl()}/convite-admin/${token}`;
  await sendTemplateEmail(
    email,
    adminInviteEmail({
      inviterName: principal.fullName ?? principal.email ?? "Administrador",
      roleLabel: ta(`roles.${role}` as TranslationKey),
      acceptUrl,
      expiresAtLabel: new Date(expiresAt).toLocaleDateString("pt-BR"),
    })
  );

  await logAdminAction({
    adminId: principal.id,
    action: "admin_convidado",
    entityType: "admin_invite",
    details: { email, role },
  });

  revalidatePath("/admin/administradores");
  return { ok: true, message: "Convite enviado por e-mail." };
}

export async function revokeAdminInvite(inviteId: string): Promise<AdminActionResult> {
  const principal = await requirePrincipal();
  if (!principal) return { ok: false, message: "Acesso não autorizado." };

  const admin = createAdminClient();
  await admin.from("admin_invites").delete().eq("id", inviteId).is("used_at", null);

  await logAdminAction({ adminId: principal.id, action: "convite_admin_revogado", entityType: "admin_invite", entityId: inviteId });

  revalidatePath("/admin/administradores");
  return { ok: true, message: "Convite revogado." };
}

/**
 * Changes an existing staff member's role/permissions. A principal can never
 * demote themselves through this form — that would risk locking the store
 * out of security/payments/admin-creation entirely.
 */
export async function updateAdminAccess(
  userId: string,
  role: UserRole,
  permissions: Record<string, boolean>
): Promise<AdminActionResult> {
  const principal = await requirePrincipal();
  if (!principal) return { ok: false, message: "Acesso não autorizado." };
  if (userId === principal.id) return { ok: false, message: "Você não pode alterar seu próprio papel por aqui." };
  if (role === "administrador_principal") return { ok: false, message: "Só é possível ter um administrador principal, definido na configuração inicial." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role, permissions: role === "administrador" ? permissions : {} })
    .eq("id", userId);

  if (error) return { ok: false, message: "Não foi possível atualizar o acesso." };

  await logAdminAction({
    adminId: principal.id,
    action: "acesso_admin_alterado",
    entityType: "profile",
    entityId: userId,
    details: { newRole: role },
  });

  revalidatePath("/admin/administradores");
  return { ok: true, message: "Acesso atualizado." };
}

/** Revokes admin/staff access entirely, returning the account to a plain customer. */
export async function revokeAdminAccess(userId: string): Promise<AdminActionResult> {
  const principal = await requirePrincipal();
  if (!principal) return { ok: false, message: "Acesso não autorizado." };
  if (userId === principal.id) return { ok: false, message: "Você não pode remover seu próprio acesso." };

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ role: "cliente", permissions: {} }).eq("id", userId);
  if (error) return { ok: false, message: "Não foi possível remover o acesso." };

  await logAdminAction({ adminId: principal.id, action: "acesso_admin_removido", entityType: "profile", entityId: userId });

  revalidatePath("/admin/administradores");
  return { ok: true, message: "Acesso de administrador removido." };
}
