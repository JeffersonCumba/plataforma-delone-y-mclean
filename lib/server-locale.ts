import "server-only";

import { cookies } from "next/headers";

import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  LOCALE_COOKIE,
  type Locale,
} from "@/i18n/locales";

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  return isSupportedLocale(raw) ? raw : DEFAULT_LOCALE;
}
