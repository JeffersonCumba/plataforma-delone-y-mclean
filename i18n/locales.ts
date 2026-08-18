export const LOCALE_COOKIE = "NEXT_LOCALE";
export const SUPPORTED_LOCALES = ["es", "en", "pt"] as const;
export const DEFAULT_LOCALE = "es";

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export function isSupportedLocale(
  value: string | undefined | null,
): value is Locale {
  return (
    typeof value === "string" &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}