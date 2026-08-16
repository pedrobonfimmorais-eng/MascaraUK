import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

/**
 * Supabase client for use inside Client Components ("use client").
 * Reads the public URL/anon key, safe to expose to the browser. Throws a
 * safe, non-leaking error if the environment isn't configured.
 */
export function createClient() {
  const { url, anonKey } = getSupabasePublicEnv();
  return createBrowserClient<Database>(url, anonKey);
}
