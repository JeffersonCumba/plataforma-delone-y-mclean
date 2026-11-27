"use client";

import { DEFAULT_LOCALE, isSupportedLocale, LOCALE_COOKIE } from "@/i18n/locales";

export type CopyCourseLinkResult = "copied" | "missing-base" | "failed";

function readDropdownLanguage(): string {
  if (typeof document === "undefined") return DEFAULT_LOCALE;

  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]*)`),
  );
  if (!match) return DEFAULT_LOCALE;

  try {
    const raw = (match[1] ?? "").replace(/^"|"$/g, "");
    const decoded = raw.includes("%") ? decodeURIComponent(raw) : raw;
    return isSupportedLocale(decoded) ? decoded : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

function getMoodleBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_MOODLE_BASE_URL?.trim() ?? "").replace(
    /\/+$/,
    "",
  );
}

export function getMoodleCourseUrl(courseId: number): string | null {
  const base = getMoodleBaseUrl();
  if (!base) {
    return null;
  }
  const lang = readDropdownLanguage();
  return `${base}/course/view.php?id=${courseId}&lang=${lang}`;
}

export async function copyMoodleCourseLink(
  courseId: number,
): Promise<CopyCourseLinkResult> {
  const url = getMoodleCourseUrl(courseId);
  if (!url) {
    return "missing-base";
  }

  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}
