import { z } from "zod";

import { type Locale } from "@/i18n/locales";
import { translateError } from "@/lib/errors";

export function createCourseSchema(locale: Locale) {
  return z.object({
    fullname: z
      .string()
      .trim()
      .min(5, translateError(locale, "validation.courseFullnameMin"))
      .max(100, translateError(locale, "validation.courseFullnameMax")),
    shortname: z
      .string()
      .trim()
      .min(3, translateError(locale, "validation.courseShortnameMin"))
      .max(100, translateError(locale, "validation.courseShortnameMax")),
    summary: z
      .string()
      .trim()
      .max(2000, translateError(locale, "validation.courseSummaryMax"))
      .optional()
      .default(""),
  });
}

export type CreateCourseInput = z.infer<ReturnType<typeof createCourseSchema>>;