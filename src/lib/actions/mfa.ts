"use server";

import { redirect } from "next/navigation";
import { requireStaffSession, requirePrincipal } from "@/lib/auth";
import { logAdminAction } from "@/lib/actions/activity-log";
import { safeRedirectPath } from "@/lib/safe-redirect";
import {
  enrollTotpFactor,
  confirmTotpEnrollment,
  challengeAndVerifyTotp,
  getAssuranceLevel,
  unenrollMyFactor,
  adminForceRemoveFactors,
  type TotpEnrollment,
} from "@/lib/mfa";

export interface MfaActionState {
  error: string | null;
  success?: boolean;
}

export async function startMfaEnrollment(): Promise<{ data: TotpEnrollment | null; error: string | null }> {
  const user = await requireStaffSession();
  if (!user) return { data: null, error: "Sessão inválida." };

  return enrollTotpFactor();
}

export async function confirmMfaEnrollment(
  _prevState: MfaActionState,
  formData: FormData
): Promise<MfaActionState> {
  const user = await requireStaffSession();
  if (!user) return { error: "Sessão inválida." };

  const factorId = String(formData.get("factorId") ?? "");
  const code = String(formData.get("code") ?? "").trim();

  if (!factorId || code.length !== 6) {
    return { error: "Informe o código de 6 dígitos do aplicativo autenticador." };
  }

  const result = await confirmTotpEnrollment(factorId, code);
  if (!result.ok) return { error: result.error };

  await logAdminAction({
    adminId: user.id,
    action: "2fa_ativado",
    entityType: "profile",
    entityId: user.id,
  });

  // Enrollment's own challenge+verify already promotes this session to
  // aal2 (see confirmTotpEnrollment/GoTrueMFAApi.verify docs), so it's safe
  // to send the user straight on to wherever they were headed.
  redirect(safeRedirectPath(String(formData.get("redirect") ?? "")));
}

/** Login step-up: verifies the code for an account that already has a verified factor. */
export async function verifyMfaChallenge(
  _prevState: MfaActionState,
  formData: FormData
): Promise<MfaActionState> {
  const user = await requireStaffSession();
  if (!user) return { error: "Sessão inválida." };

  const factorId = String(formData.get("factorId") ?? "");
  const code = String(formData.get("code") ?? "").trim();

  if (!factorId || code.length !== 6) {
    return { error: "Informe o código de 6 dígitos do aplicativo autenticador." };
  }

  const result = await challengeAndVerifyTotp(factorId, code);
  if (!result.ok) {
    await logAdminAction({
      adminId: user.id,
      action: "2fa_desafio_falhou",
      entityType: "profile",
      entityId: user.id,
    });
    return { error: result.error };
  }

  await logAdminAction({
    adminId: user.id,
    action: "2fa_desafio_confirmado",
    entityType: "profile",
    entityId: user.id,
  });

  redirect(safeRedirectPath(String(formData.get("redirect") ?? "")));
}

/** Removing your own factor requires the session to already be aal2 (proves the device that's about to be deregistered still works). */
export async function removeMyOwnFactor(factorId: string): Promise<MfaActionState> {
  const user = await requireStaffSession();
  if (!user) return { error: "Sessão inválida." };

  const { currentLevel } = await getAssuranceLevel();
  if (currentLevel !== "aal2") {
    return { error: "Confirme um código do seu autenticador antes de remover um fator." };
  }

  const result = await unenrollMyFactor(factorId);
  if (!result.ok) return { error: result.error };

  await logAdminAction({
    adminId: user.id,
    action: "2fa_removido",
    entityType: "profile",
    entityId: user.id,
    details: { factorId },
  });

  return { error: null, success: true };
}

/**
 * Lost-device recovery: only administrador_principal, only with aal2 on
 * their OWN session, can force-remove every TOTP factor from another
 * staff account. That account is then required to re-enroll a brand new
 * factor the next time it reaches /admin (requireAdmin() has nothing to
 * check currentLevel against once the factor is gone, so the middleware
 * sends it back to /login/ativar-2fa).
 */
export async function forceRemoveStaffMfa(targetUserId: string): Promise<MfaActionState> {
  const principal = await requirePrincipal();
  if (!principal) return { error: "Apenas o administrador principal pode fazer isso." };

  if (targetUserId === principal.id) {
    return { error: "Use a opção de remover o próprio fator, não a recuperação de dispositivo perdido." };
  }

  const result = await adminForceRemoveFactors(targetUserId);
  if (result.error) return { error: result.error };

  await logAdminAction({
    adminId: principal.id,
    action: "2fa_removido_recuperacao_dispositivo_perdido",
    entityType: "profile",
    entityId: targetUserId,
    details: { fatoresRemovidos: result.removed },
  });

  return { error: null, success: true };
}
