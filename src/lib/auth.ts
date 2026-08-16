import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";
import { hasPermission, isStaffRole, type Capability } from "@/lib/permissions";
import { getAssuranceLevel } from "@/lib/mfa";

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: UserRole;
  permissions: Record<string, boolean>;
};

/**
 * Reads the signed-in user and their profile role (CLIENTE / ADMINISTRADOR).
 * Returns null when there is no active session. The role always comes from
 * the `profiles` table in the database, never from client input, so a
 * customer can never elevate themselves to administrator.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, permissions")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name ?? null,
    role: (profile?.role as UserRole) ?? "cliente",
    permissions: (profile?.permissions as Record<string, boolean>) ?? {},
  };
}

/**
 * Any staff account (estoque/atendimento/gerente/administrador/administrador_principal),
 * without checking MFA. Only meant for the MFA enrollment/step-up flow
 * itself (src/lib/actions/mfa.ts, /login/ativar-2fa, /login/verificar-codigo)
 * -- an account that hasn't verified a second factor yet still needs to be
 * able to reach those specific actions to set one up or step up. Every
 * other admin entry point must use requireAdmin()/requirePermission()/
 * requirePrincipal() below, which also enforce aal2.
 */
export async function requireStaffSession(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user || !isStaffRole(user.role)) return null;
  return user;
}

/**
 * Any staff account — the base gate for entering the /admin panel at all,
 * and for every admin Server Action. Also requires the CURRENT SESSION to
 * have actually completed a second factor (aal2), re-derived live from
 * Supabase Auth on every call (getAssuranceLevel() -> auth.mfa.getAuthenticatorAssuranceLevel()).
 * There is no "2fa done" flag anywhere in our own tables to trust instead —
 * a password-only session can never pass this check, no matter the role.
 * Individual pages/actions must additionally call
 * requirePermission()/requirePrincipal() for the specific capability they
 * need; being staff (and aal2) alone never implies access to payments,
 * security, refunds, or admin creation.
 */
export async function requireAdmin(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user || !isStaffRole(user.role)) return null;

  const { currentLevel } = await getAssuranceLevel();
  if (currentLevel !== "aal2") return null;

  return user;
}

/** Only ADMINISTRADOR_PRINCIPAL, with aal2: security settings, payments config, refunds, admin creation/management. */
export async function requirePrincipal(): Promise<CurrentUser | null> {
  const user = await requireAdmin();
  if (!user || user.role !== "administrador_principal") return null;
  return user;
}

/** Staff account (aal2) holding the given capability (fixed by role, or granted via profiles.permissions for "administrador"). */
export async function requirePermission(capability: Capability): Promise<CurrentUser | null> {
  const user = await requireAdmin();
  if (!user || !hasPermission(user, capability)) return null;
  return user;
}
