import "server-only";

import { fetchMoodle } from "@/lib/moodle";

export interface MoodleEnrolledUser {
  id: number;
  username: string;
  fullname: string;
  email?: string;
}

export async function obtenerEncuestadosPorCurso(
  courseId: number,
): Promise<MoodleEnrolledUser[]> {
  if (!Number.isInteger(courseId) || courseId <= 0) {
    throw new Error("El courseId no es valido para consultar encuestados");
  }

  const users = await fetchMoodle<MoodleEnrolledUser[]>(
    "core_enrol_get_enrolled_users",
    {
      courseid: String(courseId),
    },
  );

  return Array.isArray(users) ? users : [];
}
