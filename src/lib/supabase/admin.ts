import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

/**
 * Privileged Supabase client using the service role key. Bypasses Row Level
 * Security — only import this from trusted server-side code (Route Handlers,
 * Server Actions, webhooks) such as the Stripe webhook or admin-only
 * operations. Never import this from a Client Component. The "server-only"
 * import above makes any accidental client-side import fail the build.
 */
export function createAdminClient() {
  const { url } = getSupabasePublicEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "Supabase admin client is not configured: missing SUPABASE_SERVICE_ROLE_KEY. Set it in your environment (see .env.example)."
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
