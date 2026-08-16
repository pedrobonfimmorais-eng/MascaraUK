/**
 * Public-site date/time formatting: en-GB locale, Europe/London timezone
 * (correctly handles the UK's daylight-saving switch since it's a named
 * IANA zone, not a fixed offset). Dates are stored in the database as
 * standard UTC timestamps — only the display layer converts them.
 */
const PUBLIC_LOCALE = "en-GB";
const PUBLIC_TIMEZONE = "Europe/London";

export function formatPublicDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(PUBLIC_LOCALE, { timeZone: PUBLIC_TIMEZONE, day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function formatPublicTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(PUBLIC_LOCALE, { timeZone: PUBLIC_TIMEZONE, hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

export function formatPublicDateTime(value: string | Date): string {
  return `${formatPublicDate(value)} ${formatPublicTime(value)}`;
}

/** Admin panel keeps Brazilian Portuguese date formatting (also day-first) and the server's local timezone. */
export function formatAdminDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("pt-BR");
}

export function formatAdminDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("pt-BR");
}
