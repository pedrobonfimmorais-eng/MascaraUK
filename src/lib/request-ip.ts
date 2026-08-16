import "server-only";
import { headers } from "next/headers";

/**
 * Best-effort client IP for rate limiting. Reads the headers set by the
 * hosting platform's edge/proxy (x-forwarded-for / x-real-ip) — there is
 * no direct socket access from a Server Action or Route Handler. Returns
 * null when neither header is present (e.g. local dev without a proxy in
 * front) rather than guessing, since a wrong IP would let one visitor's
 * limit bleed into another's.
 */
export async function getClientIp(): Promise<string | null> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }
  return h.get("x-real-ip");
}
