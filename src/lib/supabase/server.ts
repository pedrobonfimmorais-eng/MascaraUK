import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

/**
 * Supabase client for use inside Server Components, Server Actions and
 * Route Handlers. Must be created per-request (cookies() is request-bound).
 * Throws a safe, non-leaking error if the environment isn't configured.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabasePublicEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component without a mutable cookie jar
          // (e.g. during static rendering). Safe to ignore: proxy.ts
          // refreshes the session on every request instead.
        }
      },
    },
  });
}
