"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { fetchMoodle } from "@/lib/moodle";
import { createCourseSchema } from "@/lib/validations/course";
import { crearCursoProfesor } from "@/services/courseService";
import { obtenerCursosProfesor } from "@/services/courseService";

export interface CreateCourseActionResult {
  ok: boolean;
  message: string;
}

export interface DeleteCourseActionResult {
  ok: boolean;
  message: string;
}

export async function createCourseAction(
  payload: unknown,
): Promise<CreateCourseActionResult> {
  const cookieStore = await cookies();
  const userIdCookie = cookieStore.get("user_id")?.value;
  const userId = Number(userIdCookie);

  if (!Number.isInteger(userId) || userId <= 0) {
    return {
      ok: false,
      message: "Sesion invalida. Vuelve a iniciar sesion.",
    };
  }

  const parsed = createCourseSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? "Datos invalidos para crear curso",
    };
  }

  try {
    const course = await crearCursoProfesor(userId, parsed.data);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/cursos");
    revalidatePath(`/dashboard/cursos/${course.id}/analitica`);
    revalidatePath(`/dashboard/cursos/${course.id}`);

    return {
      ok: true,
      message: `Curso ${course.fullname} creado con encuesta base.`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo crear el curso en Moodle",
    };
  }
}

export async function deleteCourseAction(
  courseId: number,
): Promise<DeleteCourseActionResult> {
  const cookieStore = await cookies();
  const userIdCookie = cookieStore.get("user_id")?.value;
  const userId = Number(userIdCookie);

  if (!Number.isInteger(userId) || userId <= 0) {
    return {
      ok: false,
      message: "Sesion invalida. Vuelve a iniciar sesion.",
    };
  }

  if (!Number.isInteger(courseId) || courseId <= 0) {
    return {
      ok: false,
      message: "Curso invalido.",
    };
  }

  const courses = await obtenerCursosProfesor(userId);
  const allowedCourse = courses.find((course) => course.id === courseId);

  if (!allowedCourse) {
    return {
      ok: false,
      message: "No tienes permisos para eliminar este curso.",
    };
  }

  try {
    await fetchMoodle<unknown>("core_course_delete_courses", {
      "courseids[0]": String(courseId),
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/cursos");
    revalidatePath(`/dashboard/cursos/${courseId}`);
    revalidatePath(`/dashboard/cursos/${courseId}/analitica`);

    return {
      ok: true,
      message: `Curso ${allowedCourse.fullname} eliminado correctamente.`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el curso en Moodle.",
    };
  }
}
