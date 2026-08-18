"use client";

import { toast } from "sonner";

import { DEFAULT_LOCALE, isSupportedLocale, LOCALE_COOKIE } from "@/i18n/locales";

function readDropdownLanguage(): string {
  if (typeof document === "undefined") return DEFAULT_LOCALE;

  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]*)`),
  );
  if (!match) return DEFAULT_LOCALE;

  const raw = (match[1] ?? "").replace(/^"|"$/g, "");
  const decoded = raw.includes("%") ? decodeURIComponent(raw) : raw;
  return isSupportedLocale(decoded) ? decoded : DEFAULT_LOCALE;
}

export function getMoodleLoginUrl(): string {
  const base = process.env.NEXT_PUBLIC_MOODLE_BASE_URL?.trim() ?? "";
  if (!base) {
    return "/login/index.php";
  }
  const lang = readDropdownLanguage();
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}lang=${lang}`;
}

export async function copyMoodleLoginLink(): Promise<boolean> {
  const url = getMoodleLoginUrl();

  if (!url || url === "/login/index.php") {
    toast.error("No hay URL base configurada para Moodle");
    return false;
  }

  try {
    await navigator.clipboard.writeText(url);
    toast.success("Enlace copiado");
    return true;
  } catch {
    toast.error("No se pudo copiar el enlace");
    return false;
  }
}
