import type { Locale } from "@/i18n/locales";
import es from "@/messages/es.json";
import en from "@/messages/en.json";
import pt from "@/messages/pt.json";

const DICTIONARIES: Record<Locale, typeof es> = { es, en, pt };
const DEFAULT_LOCALE: Locale = "es";

export type { Locale } from "@/i18n/locales";
export type ErrorParams = Record<string, string | number>;

export function translateError(
  locale: Locale,
  key: string,
  params?: ErrorParams,
): string {
  const dictionary = DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];

  const resolve = (root: { errors?: Record<string, unknown> }): string | undefined =>
    key.split(".").reduce<unknown>(
      (acc: unknown, segment) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[segment]
          : undefined,
      root.errors,
    ) as string | undefined;

  let message =
    resolve(dictionary) ?? resolve(DICTIONARIES[DEFAULT_LOCALE]) ?? key;

  if (params) {
    for (const [name, value] of Object.entries(params)) {
      message = message.replaceAll(`{${name}}`, String(value));
    }
  }

  return message;
}
