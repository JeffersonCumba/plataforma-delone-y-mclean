import "server-only";

import { fetchMoodle } from "@/lib/moodle";

export interface MoodleCourse {
  id: number;
  fullname: string;
  shortname: string;
  summary: string;
  idnumber: string;
}

export async function obtenerCursosProfesor(
  userId: number,
): Promise<MoodleCourse[]> {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("El userId no es valido para consultar cursos");
  }

  const courses = await fetchMoodle<MoodleCourse[]>(
    "core_enrol_get_users_courses",
    {
      userid: String(userId),
    },
  );

  return Array.isArray(courses) ? courses : [];
}
