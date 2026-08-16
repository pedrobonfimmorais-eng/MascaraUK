/**
 * Validates a redirect target supplied by the browser (query param or form
 * field) so it can only ever point inside this site. `startsWith("/")`
 * alone is not enough: "//evil.com" and "/\evil.com" also start with "/"
 * but browsers treat them as protocol-relative URLs to an external host.
 */
export function safeRedirectPath(candidate: string | null | undefined, fallback = "/minha-conta"): string {
  if (!candidate) return fallback;
  if (!candidate.startsWith("/")) return fallback;
  if (candidate.startsWith("//") || candidate.startsWith("/\\")) return fallback;
  return candidate;
}
