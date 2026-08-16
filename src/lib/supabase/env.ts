/**
 * Shared, safe validation for the Supabase environment variables. Used by
 * every Supabase client factory (browser, server, admin) so a missing
 * variable always fails the same way: a clear error naming which variable
 * is missing, never the variable's value and never a raw client-library
 * stack trace.
 */

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Returns the public Supabase URL/anon key, or throws a safe error if
 * either is missing. Safe to call from Client Components: both variables
 * are meant to be public, and the error message never echoes their values.
 */
export function getSupabasePublicEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    const missing = [
      !url && "NEXT_PUBLIC_SUPABASE_URL",
      !anonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]
      .filter(Boolean)
      .join(", ");

    throw new Error(
      `Supabase is not configured: missing ${missing}. Set it in your environment (see .env.example).`
    );
  }

  return { url, anonKey };
}
