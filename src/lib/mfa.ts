import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Thin wrapper around Supabase Auth's own MFA/TOTP implementation
 * (`supabase.auth.mfa.*`). Supabase stores and verifies the TOTP secret
 * itself, server-side, in its own auth schema — this app never generates,
 * stores, or sees a raw secret outside of the one-time enrollment response
 * that has to be shown to the user to scan. There is no "2fa_enabled"
 * boolean anywhere in our own tables: whether a session has actually
 * completed the second factor is always re-derived from
 * getAuthenticatorAssuranceLevel(), which reflects the real session JWT,
 * not a row in `profiles`/`admin_2fa`.
 */

export interface TotpEnrollment {
  factorId: string;
  qrCodeSvg: string;
  secret: string;
  uri: string;
}

/** Starts enrollment of a new TOTP factor for the currently signed-in user. */
export async function enrollTotpFactor(): Promise<{ data: TotpEnrollment | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });

  if (error || !data) {
    return { data: null, error: error?.message ?? "Não foi possível iniciar a ativação do 2FA." };
  }

  return {
    data: {
      factorId: data.id,
      qrCodeSvg: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    },
    error: null,
  };
}

/**
 * Confirms enrollment with the first 6-digit code from the authenticator
 * app. Only after this succeeds does Supabase mark the factor "verified"
 * and promote the current session to aal2 — an enrolled-but-unconfirmed
 * factor never counts as MFA being active.
 */
export async function confirmTotpEnrollment(
  factorId: string,
  code: string
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient();
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError || !challenge) {
    return { ok: false, error: challengeError?.message ?? "Não foi possível gerar o desafio de verificação." };
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });

  if (verifyError) {
    return { ok: false, error: "Código inválido. Confira o horário do seu celular e tente novamente." };
  }

  return { ok: true, error: null };
}

/** Step-up login: verifies the 6-digit code against an already-challenged factor. */
export async function challengeAndVerifyTotp(
  factorId: string,
  code: string
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });

  if (error) {
    return { ok: false, error: "Código inválido ou expirado." };
  }

  return { ok: true, error: null };
}

export interface AssuranceLevel {
  currentLevel: string | null;
  nextLevel: string | null;
}

/**
 * The only source of truth for "did this session actually complete MFA".
 * currentLevel === nextLevel === 'aal2' means the session presented a
 * verified second factor. currentLevel === 'aal1' with nextLevel === 'aal2'
 * means a factor exists but this particular session hasn't cleared the
 * challenge yet (e.g. right after a fresh password login) — the caller
 * must be sent to the code-entry step, never treated as authenticated.
 */
export async function getAssuranceLevel(): Promise<AssuranceLevel> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return { currentLevel: null, nextLevel: null };
  return { currentLevel: data.currentLevel, nextLevel: data.nextLevel };
}

export interface TotpFactorSummary {
  id: string;
  friendlyName: string | null;
  status: "verified" | "unverified";
  createdAt: string;
}

export async function listMyTotpFactors(): Promise<TotpFactorSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return [];

  return data.totp.map((factor) => ({
    id: factor.id,
    friendlyName: factor.friendly_name ?? null,
    status: factor.status,
    createdAt: factor.created_at,
  }));
}

/** Removes one of the current user's own factors (requires the current session, i.e. the device is still available). */
export async function unenrollMyFactor(factorId: string): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { ok: false, error: error.message };
  return { ok: true, error: null };
}

/**
 * Lost-device recovery: only reachable through requirePrincipal() in the
 * calling Server Action. Uses the service-role Admin API to force-remove
 * every TOTP factor from ANOTHER staff account, since that account can no
 * longer clear its own aal2 challenge to unenroll itself. The account is
 * then required to re-enroll a new factor the next time it reaches
 * /admin (see requireAdmin() in src/lib/auth.ts).
 */
export async function adminForceRemoveFactors(targetUserId: string): Promise<{ removed: number; error: string | null }> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.mfa.listFactors({ userId: targetUserId });
  if (error || !data) return { removed: 0, error: error?.message ?? "Não foi possível listar os fatores do usuário." };

  let removed = 0;
  for (const factor of data.factors) {
    const { error: deleteError } = await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId: targetUserId });
    if (!deleteError) removed += 1;
  }

  return { removed, error: null };
}
