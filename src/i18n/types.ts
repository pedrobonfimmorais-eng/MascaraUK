import type pt from "./pt";

/**
 * pt.ts is declared with `as const` so every leaf is a string literal type
 * (nice for catching typos). That would force every other locale to use the
 * exact same Portuguese words, so this widens each leaf back to `string`
 * while keeping the nested key structure intact.
 */
type Widen<T> = T extends string ? string : { [K in keyof T]: Widen<T[K]> };

/**
 * The Portuguese dictionary is the source of truth for shape.
 * en.ts (and any future locale) must satisfy this exact structure.
 */
export type Dictionary = Widen<typeof pt>;

export type Locale = "pt" | "en";

export const locales: Locale[] = ["pt", "en"];

export const defaultLocale: Locale = "pt";
