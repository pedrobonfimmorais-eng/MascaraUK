import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type RateLimitAction = "login" | "signup" | "password_reset" | "contact" | "admin_invite_accept";

interface RateLimitConfig {
  windowMinutes: number;
  maxAttempts: number;
}

const CONFIGS: Record<RateLimitAction, RateLimitConfig> = {
  login: { windowMinutes: 15, maxAttempts: 5 },
  signup: { windowMinutes: 60, maxAttempts: 5 },
  password_reset: { windowMinutes: 60, maxAttempts: 5 },
  contact: { windowMinutes: 60, maxAttempts: 8 },
  admin_invite_accept: { windowMinutes: 60, maxAttempts: 5 },
};

/**
 * Hard ceiling on the progressive backoff. Without this, repeated failures
 * against the same identifier (e.g. someone else's e-mail) could compound
 * into an effectively permanent block — capping it means the worst case is
 * always "try again within the hour", never "locked out forever".
 */
const MAX_BACKOFF_MINUTES = 60;

function backoffMinutes(overflowCount: number, base: number): number {
  if (overflowCount <= 0) return 0;
  return Math.min(base * 2 ** (overflowCount - 1), MAX_BACKOFF_MINUTES);
}

export interface RateLimitResult {
  blocked: boolean;
  retryAfterSeconds: number;
}

interface AttemptRow {
  success: boolean;
  created_at: string;
}

function evaluate(rows: AttemptRow[], config: RateLimitConfig): RateLimitResult {
  if (rows.length < config.maxAttempts) return { blocked: false, retryAfterSeconds: 0 };

  let consecutiveFailures = 0;
  for (const row of rows) {
    if (row.success) break;
    consecutiveFailures += 1;
  }

  if (consecutiveFailures < config.maxAttempts) return { blocked: false, retryAfterSeconds: 0 };

  const lastAttemptAt = new Date(rows[0].created_at).getTime();
  const waitMinutes = backoffMinutes(consecutiveFailures - config.maxAttempts + 1, config.windowMinutes);
  const retryAt = lastAttemptAt + waitMinutes * 60 * 1000;
  const retryAfterSeconds = Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));

  return { blocked: retryAfterSeconds > 0, retryAfterSeconds };
}

/**
 * Checks the identifier (e.g. an e-mail address) and the caller's IP
 * independently — either one tripping its own limit blocks the attempt.
 * This split is what stops one attacker from permanently locking out
 * someone else's e-mail: the IP-side limit catches the attacker no matter
 * how many different target e-mails they cycle through, while the
 * identifier-side limit is always time-boxed and capped at
 * MAX_BACKOFF_MINUTES, so it can never compound into an unbounded block on
 * one e-mail alone.
 */
export async function checkRateLimit(
  action: RateLimitAction,
  identifier: string,
  ip: string | null
): Promise<RateLimitResult> {
  const config = CONFIGS[action];
  const admin = createAdminClient();
  const since = new Date(Date.now() - config.windowMinutes * 60 * 1000).toISOString();
  const identifierKey = identifier.toLowerCase();

  const [{ data: byIdentifier }, { data: byIp }] = await Promise.all([
    admin
      .from("rate_limit_events")
      .select("success, created_at")
      .eq("action", action)
      .eq("identifier", identifierKey)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50),
    ip
      ? admin
          .from("rate_limit_events")
          .select("success, created_at")
          .eq("action", action)
          .eq("ip", ip)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [] as AttemptRow[] }),
  ]);

  const identifierResult = evaluate(byIdentifier ?? [], config);
  // The IP dimension covers every identifier an attacker might target from
  // that address, so it gets a higher ceiling before tripping — otherwise
  // a shared IP (office, campus, CGNAT) would rate-limit unrelated people.
  const ipResult = evaluate(byIp ?? [], { ...config, maxAttempts: config.maxAttempts * 4 });

  return {
    blocked: identifierResult.blocked || ipResult.blocked,
    retryAfterSeconds: Math.max(identifierResult.retryAfterSeconds, ipResult.retryAfterSeconds),
  };
}

/** Records one attempt. Never pass a password, token, or CAPTCHA response here — identifier/ip/success only. */
export async function recordAttempt(
  action: RateLimitAction,
  identifier: string,
  ip: string | null,
  success: boolean
): Promise<void> {
  const admin = createAdminClient();

  try {
    await admin.from("rate_limit_events").insert({
      action,
      identifier: identifier.toLowerCase(),
      ip,
      success,
    });
  } catch {
    // Best-effort: never block the actual flow because logging failed.
  }

  // Light best-effort retention prune so old rows don't pile up even on a
  // project without pg_cron enabled — runs rarely, not on every write.
  if (Math.random() < 0.02) {
    try {
      await admin.rpc("cleanup_old_rate_limit_events");
    } catch {
      // Non-critical.
    }
  }
}
