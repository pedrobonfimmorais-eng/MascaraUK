import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: UserRole;
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
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name ?? null,
    role: (profile?.role as UserRole) ?? "cliente",
  };
}

export async function requireAdmin(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "administrador") return null;
  return user;
}
