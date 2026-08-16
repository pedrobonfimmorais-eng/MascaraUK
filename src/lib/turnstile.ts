import "server-only";

export interface TurnstileVerification {
  ok: boolean;
  error: "captcha_not_configured_skip" | "captcha_missing" | "captcha_invalid" | "captcha_error" | null;
}

/**
 * Verifies a Cloudflare Turnstile token server-side against Cloudflare's
 * siteverify API. When TURNSTILE_SECRET_KEY isn't set, verification is
 * skipped entirely (documented no-op for local dev without Cloudflare
 * credentials) — but once the secret IS configured, a missing or invalid
 * token is always rejected, there is no bypass.
 */
export async function verifyTurnstileToken(
  token: string | null,
  remoteIp: string | null
): Promise<TurnstileVerification> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return { ok: true, error: "captcha_not_configured_skip" };
  }

  if (!token) {
    return { ok: false, error: "captcha_missing" };
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const data = (await response.json()) as { success?: boolean };
    return data.success ? { ok: true, error: null } : { ok: false, error: "captcha_invalid" };
  } catch {
    return { ok: false, error: "captcha_error" };
  }
}
