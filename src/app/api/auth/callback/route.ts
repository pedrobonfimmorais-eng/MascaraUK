import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/safe-redirect";

/**
 * Shared landing point for Supabase Auth e-mail links (signup confirmation
 * and password recovery). Both use the PKCE `code` query param; exchanging
 * it here (a Route Handler, which — unlike a Server Component — is allowed
 * to write cookies) turns it into a real session before redirecting to
 * `next`. Configured as `emailRedirectTo`/`redirectTo` in
 * src/lib/actions/auth.ts.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const safeNext = safeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?erro=link_invalido`);
    }
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
