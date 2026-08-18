import "server-only";

import type { Locale } from "@/i18n/locales";
import { fetchMoodle } from "@/lib/moodle";
import { translateError } from "@/lib/errors";

export interface MoodleEnrolledUser {
  id: number;
  username: string;
  fullname: string;
  email?: string;
}

export async function obtenerEncuestadosPorCurso(
  courseId: number,
  locale: Locale,
): Promise<MoodleEnrolledUser[]> {
  if (!Number.isInteger(courseId) || courseId <= 0) {
    throw new Error(translateError(locale, "respondent.invalidCourseId"));
  }

  const users = await fetchMoodle<MoodleEnrolledUser[]>(
    "core_enrol_get_enrolled_users",
    {
      courseid: String(courseId),
    },
  );

  return Array.isArray(users) ? users : [];
}
