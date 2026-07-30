"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mergeGuestCartIntoUser } from "@/lib/actions/cart";

export interface AuthActionState {
  error: string | null;
  success?: boolean;
}

const LOGIN_ATTEMPT_WINDOW_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 5;
const GENERIC_LOGIN_ERROR = "E-mail ou senha inválidos.";
const TOO_MANY_ATTEMPTS_ERROR =
  "Muitas tentativas de login para este e-mail. Aguarde alguns minutos e tente novamente.";

function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Best-effort brute-force guard: blocks an e-mail after too many recent failed logins. */
async function isRateLimited(email: string): Promise<boolean> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return false;

  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - LOGIN_ATTEMPT_WINDOW_MINUTES * 60 * 1000).toISOString();
    const { data } = await admin
      .from("login_attempts")
      .select("success")
      .eq("email", email.toLowerCase())
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(MAX_FAILED_ATTEMPTS);

    if (!data || data.length < MAX_FAILED_ATTEMPTS) return false;
    return data.every((attempt) => !attempt.success);
  } catch {
    return false;
  }
}

async function recordLoginAttempt(email: string, success: boolean): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  try {
    const admin = createAdminClient();
    await admin.from("login_attempts").insert({ email: email.toLowerCase(), success });
  } catch {
    // Best-effort only: never block login because the attempt log failed to write.
  }
}

/**
 * Downgrades the Supabase auth cookies to session-only (cleared when the
 * browser closes) when the customer didn't check "lembrar acesso". Supabase
 * itself always persists the refresh token cookie with a long expiry, so
 * this rewrites the same cookies without a maxAge/expires to get
 * browser-session-only behavior instead.
 */
async function applyRememberMePreference(remember: boolean): Promise<void> {
  if (remember) return;

  const cookieStore = await cookies();
  for (const cookie of cookieStore.getAll()) {
    if (cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token")) {
      cookieStore.set(cookie.name, cookie.value, {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
      });
    }
  }
}

/**
 * Signs a customer or administrator in with email/password. There is no
 * role selector anywhere in the public sign-up/sign-in flow — every account
 * created via /cadastro ends up as "cliente"; only a direct database change
 * can promote someone to "administrador" (see README). The redirect target
 * comes from the "redirect" field (e.g. /admin, when an admin was bounced
 * from the admin panel to /login), never from a role the browser could fake.
 */
export async function signIn(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on";
  const redirectTo = String(formData.get("redirect") ?? "/minha-conta");

  if (!email || !password) {
    return { error: GENERIC_LOGIN_ERROR };
  }

  if (await isRateLimited(email)) {
    return { error: TOO_MANY_ATTEMPTS_ERROR };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  await recordLoginAttempt(email, !error);

  if (error) {
    return { error: GENERIC_LOGIN_ERROR };
  }

  await applyRememberMePreference(remember);

  if (data.user) {
    await mergeGuestCartIntoUser(data.user.id);
  }

  redirect(redirectTo.startsWith("/") ? redirectTo : "/minha-conta");
}

export async function signUp(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const acceptedTerms = formData.get("acceptTerms") === "on";
  const marketingOptIn = formData.get("marketingOptIn") === "on";
  const redirectTo = String(formData.get("redirect") ?? "/minha-conta");
  const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/minha-conta";

  if (!firstName || !lastName) {
    return { error: "Informe seu nome e sobrenome." };
  }

  if (!acceptedTerms) {
    return { error: "É necessário aceitar os Termos de Uso para criar uma conta." };
  }

  if (password.length < 8) {
    return { error: "A senha deve ter pelo menos 8 caracteres." };
  }

  if (password !== confirmPassword) {
    return { error: "As senhas não coincidem." };
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const fullName = `${firstName} ${lastName}`.trim();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
        marketing_opt_in: marketingOptIn,
        terms_accepted: true,
      },
      emailRedirectTo: `${siteUrl}/api/auth/callback?next=${encodeURIComponent(safeRedirect)}`,
    },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return { error: "Já existe uma conta com este e-mail." };
    }
    return { error: "Não foi possível criar a conta. Tente novamente." };
  }

  // With "confirmar e-mail" enabled in Supabase Auth, signUp doesn't return a
  // session until the customer clicks the confirmation link — send them to
  // /verificar-email instead of treating them as logged in.
  if (!data.session) {
    redirect(`/verificar-email?email=${encodeURIComponent(email)}`);
  }

  if (data.user) {
    await mergeGuestCartIntoUser(data.user.id);
  }

  redirect(safeRedirect);
}

export async function resendVerificationEmail(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Informe o e-mail cadastrado." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email });

  if (error) {
    return { error: "Não foi possível reenviar o e-mail de confirmação." };
  }

  return { error: null, success: true };
}

export async function requestPasswordReset(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (!isSupabaseConfigured()) {
    return { error: null, success: true };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/api/auth/callback?next=/redefinir-senha`,
  });

  // Always report success, whether or not the e-mail exists, so this form
  // can't be used to check which e-mails have an account.
  return { error: null, success: true };
}

export async function updatePasswordWithRecoverySession(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) {
    return { error: "A senha deve ter pelo menos 8 caracteres." };
  }

  if (password !== confirmPassword) {
    return { error: "As senhas não coincidem." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: "Não foi possível redefinir a senha. Solicite um novo link de recuperação." };
  }

  return { error: null, success: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
