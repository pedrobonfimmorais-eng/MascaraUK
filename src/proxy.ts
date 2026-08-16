import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isStaffRole } from "@/lib/permissions";
import type { UserRole } from "@/types/database";

const PROTECTED_ACCOUNT_PREFIX = "/minha-conta";
const PROTECTED_ADMIN_PREFIX = "/admin";

// Always reachable even in maintenance mode: staff need /login and /admin to
// turn it back off, the API keeps serving webhooks/tracking/auth callbacks,
// and /manutencao is the page itself (rewriting it to itself would loop).
const MAINTENANCE_ALLOWLIST = ["/admin", "/login", "/api", "/manutencao", "/acesso-negado"];

/**
 * Runs on every request (except static assets, see `config.matcher` below):
 * 1. Refreshes the Supabase auth session cookie.
 * 2. Blocks unauthenticated visitors from /minha-conta.
 * 3. Blocks anyone who isn't staff (estoque/atendimento/gerente/administrador/
 *    administrador_principal) from /admin — a regular "cliente" account can
 *    never reach the admin panel, even if signed in. Finer-grained access
 *    within /admin (who can see payments, security, refunds, admin creation)
 *    is enforced separately by requirePermission()/requirePrincipal() in
 *    each server action/page, never by this route check alone.
 * 4. When maintenance mode is on (store_settings.maintenance_mode), blocks
 *    the public storefront for everyone except staff — webhooks, tracking,
 *    and auth endpoints under /api are never blocked so payment
 *    confirmations are never lost mid-maintenance.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Before Supabase is configured there is no real session/role to check —
  // let requests through so the public site still works during initial setup.
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  let profileRole: UserRole | null = null;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    profileRole = (profile?.role as UserRole) ?? null;
  }

  if (pathname.startsWith(PROTECTED_ACCOUNT_PREFIX) && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname.startsWith(PROTECTED_ADMIN_PREFIX)) {
    if (!user) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(redirectUrl);
    }

    if (!profileRole || !isStaffRole(profileRole)) {
      return NextResponse.redirect(new URL("/acesso-negado", request.url));
    }

    // Password alone is never enough for /admin: re-derive the real MFA
    // state from this request's own session JWT on every request (never a
    // boolean stored in our own tables). nextLevel !== 'aal2' means the
    // account has no verified TOTP factor at all yet -- mandatory
    // enrollment, not optional. currentLevel !== 'aal2' with a factor on
    // file means this particular session hasn't cleared the challenge yet.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aal?.nextLevel !== "aal2") {
      const url = new URL("/login/ativar-2fa", request.url);
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    if (aal.currentLevel !== "aal2") {
      const url = new URL("/login/verificar-codigo", request.url);
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    return response;
  }

  const isStaffVisitor = profileRole ? isStaffRole(profileRole) : false;
  if (!isStaffVisitor && !MAINTENANCE_ALLOWLIST.some((path) => pathname.startsWith(path))) {
    const { data: maintenance } = await supabase
      .from("store_settings")
      .select("value")
      .eq("key", "maintenance_mode")
      .maybeSingle();

    if (maintenance?.value === true) {
      return NextResponse.rewrite(new URL("/manutencao", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
