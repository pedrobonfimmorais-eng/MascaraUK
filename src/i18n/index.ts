import pt from "./pt";
import en from "./en";
import { defaultLocale, locales } from "./types";
import type { Dictionary, Locale } from "./types";

export type { Dictionary, Locale };
export { defaultLocale, locales };

const dictionaries: Record<Locale, Dictionary> = { pt, en };

/**
 * Active locale for the whole site. Only "pt" is exposed to visitors today.
 * Changing this single value (or wiring it to a route/user preference later)
 * switches every page that reads text through `t()`.
 */
export function getActiveLocale(): Locale {
  return defaultLocale;
}

export function getDictionary(locale: Locale = getActiveLocale()): Dictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}

type PathsToStringProps<T> = T extends string
  ? []
  : {
      [K in Extract<keyof T, string>]: [K, ...PathsToStringProps<T[K]>];
    }[Extract<keyof T, string>];

type Join<T extends string[]> = T extends [infer F, ...infer R]
  ? F extends string
    ? R extends string[]
      ? R["length"] extends 0
        ? F
        : `${F}.${Join<R>}`
      : never
    : never
  : never;

/** Dot-notation key into the dictionary, e.g. "product.addToCart". */
export type TranslationKey = Join<PathsToStringProps<Dictionary>>;

function resolvePath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Translation helper. Usage: t("product.addToCart") or
 * t("products.resultsCount", { count: 12 }).
 */
export function t(
  key: TranslationKey,
  vars?: Record<string, string | number>,
  locale: Locale = getActiveLocale()
): string {
  const dictionary = getDictionary(locale);
  const value = resolvePath(dictionary, key);

  if (typeof value !== "string") {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[i18n] Missing translation for key: "${key}"`);
    }
    return key;
  }

  if (!vars) return value;

  return Object.entries(vars).reduce(
    (text, [varName, varValue]) => text.replaceAll(`{${varName}}`, String(varValue)),
    value
  );
}
