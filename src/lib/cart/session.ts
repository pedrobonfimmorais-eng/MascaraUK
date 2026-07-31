import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const GUEST_CART_COOKIE = "mascarauk_guest_cart";
const SIXTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 60;

/**
 * Read-only lookup — safe to call from Server Components. Returns null
 * when the visitor has no guest cart cookie yet (nothing to show).
 */
export async function getGuestSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(GUEST_CART_COOKIE)?.value ?? null;
}

/**
 * Reads or creates the guest cart cookie. Mutates cookies, so this may
 * only be called from a Server Action or Route Handler, never from a
 * Server Component render.
 */
export async function getOrCreateGuestSessionId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(GUEST_CART_COOKIE)?.value;
  if (existing) return existing;

  const sessionId = randomUUID();
  cookieStore.set(GUEST_CART_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SIXTY_DAYS_IN_SECONDS,
    path: "/",
  });
  return sessionId;
}

/** Called after a guest cart has been merged into a freshly logged-in account. */
export async function clearGuestSessionId(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(GUEST_CART_COOKIE);
}
