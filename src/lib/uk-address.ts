/**
 * UK postcode normalisation/validation. Deliberately loose: it catches
 * obviously malformed input (wrong character set, wrong length) without
 * pretending to validate against the full Royal Mail postcode list, which
 * changes over time and isn't something this store should hardcode. The
 * customer's own confirmation at checkout is still the final check.
 */

// Simplified version of the standard UK postcode pattern (covers all known
// formats: A9 9AA, A99 9AA, A9A 9AA, AA9 9AA, AA99 9AA, AA9A 9AA).
const UK_POSTCODE_REGEX = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s*[0-9][A-Z]{2}$/;

/** Uppercases, collapses whitespace, and inserts the single space before the last 3 characters — "sw1a1aa" -> "SW1A 1AA". */
export function normalisePostcode(raw: string): string {
  const compact = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (compact.length < 5) return compact;
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

export function isValidUkPostcode(raw: string): boolean {
  const normalised = normalisePostcode(raw);
  return UK_POSTCODE_REGEX.test(normalised);
}
