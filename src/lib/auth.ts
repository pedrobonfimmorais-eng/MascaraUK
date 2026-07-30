import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";
import { hasPermission, isStaffRole, type Capability } from "@/lib/permissions";

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
 * Any staff account (estoque/atendimento/gerente/administrador/administrador_principal)
 * — the base gate for entering the /admin panel at all. Individual pages and
 * server actions must additionally call requirePermission()/requirePrincipal()
 * for the specific capability they need; being staff alone never implies
 * access to payments, security, refunds, or admin creation.
 */
export async function requireAdmin(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user || !isStaffRole(user.role)) return null;
  return user;
}

/** Only ADMINISTRADOR_PRINCIPAL: security settings, payments config, refunds, admin creation/management. */
export async function requirePrincipal(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "administrador_principal") return null;
  return user;
}

/** Staff account holding the given capability (fixed by role, or granted via profiles.permissions for "administrador"). */
export async function requirePermission(capability: Capability): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user || !isStaffRole(user.role) || !hasPermission(user, capability)) return null;
  return user;
}
