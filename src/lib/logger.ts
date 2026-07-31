/**
 * Minimal categorized server-side logger. Writes structured JSON lines to
 * stdout/stderr so the hosting platform's log viewer can filter by
 * category — no external log service is wired up, so this is the only place
 * server errors currently go. Never pass passwords, tokens, full card data,
 * or Stripe/Supabase secret keys as `details` — logs are not access-controlled
 * beyond the host's own infrastructure.
 */
export type LogCategory = "application" | "payment" | "auth" | "stock" | "email" | "integration";

function write(level: "info" | "warn" | "error", category: LogCategory, message: string, details?: Record<string, unknown>) {
  const line = {
    ts: new Date().toISOString(),
    level,
    category,
    message,
    ...(details ? { details } : {}),
  };
  const serialized = JSON.stringify(line);
  if (level === "error") console.error(serialized);
  else if (level === "warn") console.warn(serialized);
  else console.log(serialized);
}

export const logger = {
  info: (category: LogCategory, message: string, details?: Record<string, unknown>) => write("info", category, message, details),
  warn: (category: LogCategory, message: string, details?: Record<string, unknown>) => write("warn", category, message, details),
  error: (category: LogCategory, message: string, details?: Record<string, unknown>) => write("error", category, message, details),
};

/** Short, non-guessable identifier a customer can quote to support without exposing any internals. */
export function generateErrorId(): string {
  return `ERR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}
