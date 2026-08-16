import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminInvite, UserRole } from "@/types/database";

export interface StaffMember {
  id: string;
  email: string | null;
  fullName: string | null;
  role: UserRole;
  permissions: Record<string, boolean>;
  /**
   * Whether this account has at least one VERIFIED TOTP factor on file in
   * Supabase Auth right now (auth.mfa_factors, read live via the Admin MFA
   * API) -- never a boolean we store and maintain ourselves.
   */
  twoFactorEnabled: boolean;
  createdAt: string;
}

export interface StaffOverview {
  staff: StaffMember[];
  pendingInvites: AdminInvite[];
}

const STAFF_ROLES: UserRole[] = ["estoque", "atendimento", "gerente", "administrador", "administrador_principal"];

/** Read-only directory for /admin/administradores (requirePrincipal-gated at the page level). */
export async function getStaffOverview(): Promise<StaffOverview> {
  const admin = createAdminClient();

  const [{ data: profiles }, { data: invites }, { data: authUsers }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, role, permissions, created_at")
      .in("role", STAFF_ROLES)
      .order("created_at", { ascending: true }),
    admin.from("admin_invites").select("*").is("used_at", null).gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const emailById = new Map((authUsers?.users ?? []).map((u) => [u.id, u.email ?? null]));

  // The Admin MFA API only lists factors one user at a time -- fine for a
  // staff directory (a handful of accounts), not meant for high-frequency
  // calls.
  const twoFactorByUser = new Map<string, boolean>();
  await Promise.all(
    (profiles ?? []).map(async (profile) => {
      const { data } = await admin.auth.admin.mfa.listFactors({ userId: profile.id });
      const hasVerifiedFactor = (data?.factors ?? []).some((factor) => factor.status === "verified");
      twoFactorByUser.set(profile.id, hasVerifiedFactor);
    })
  );

  const staff: StaffMember[] = (profiles ?? []).map((profile) => ({
    id: profile.id,
    email: emailById.get(profile.id) ?? null,
    fullName: profile.full_name,
    role: profile.role,
    permissions: (profile.permissions as Record<string, boolean>) ?? {},
    twoFactorEnabled: twoFactorByUser.get(profile.id) ?? false,
    createdAt: profile.created_at,
  }));

  return { staff, pendingInvites: invites ?? [] };
}

export interface SecurityOverview {
  totalStaff: number;
  staffWith2fa: number;
  recentLoginAttempts: { email: string; success: boolean; createdAt: string }[];
  recentFailedAttempts: number;
}

/** Read-only data for the "Segurança" settings tab — never returns secrets or full session tokens. */
export async function getSecurityOverview(): Promise<SecurityOverview> {
  const admin = createAdminClient();

  const [{ data: staffRows }, { data: attempts }] = await Promise.all([
    admin.from("profiles").select("id").in("role", STAFF_ROLES),
    admin.from("login_attempts").select("email, success, created_at").order("created_at", { ascending: false }).limit(20),
  ]);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentFailedAttempts } = await admin
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("success", false)
    .gte("created_at", since);

  let staffWith2fa = 0;
  await Promise.all(
    (staffRows ?? []).map(async (row) => {
      const { data } = await admin.auth.admin.mfa.listFactors({ userId: row.id });
      if ((data?.factors ?? []).some((factor) => factor.status === "verified")) staffWith2fa += 1;
    })
  );

  return {
    totalStaff: staffRows?.length ?? 0,
    staffWith2fa,
    recentLoginAttempts: (attempts ?? []).map((a) => ({ email: a.email, success: a.success, createdAt: a.created_at })),
    recentFailedAttempts: recentFailedAttempts ?? 0,
  };
}
