"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { fetchMoodle } from "@/lib/moodle";
import { translateError } from "@/lib/errors";
import { getServerLocale } from "@/lib/server-locale";
import { createCourseSchema } from "@/lib/validations/course";
import { MAX_COURSES_PER_USER } from "@/lib/constants";
import {
  crearCursoProfesor,
  obtenerCursosProfesor,
} from "@/services/courseService";

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
  const locale = await getServerLocale();
  const cookieStore = await cookies();
  const userIdCookie = cookieStore.get("user_id")?.value;
  const userId = Number(userIdCookie);

  if (!Number.isInteger(userId) || userId <= 0) {
    return {
      ok: false,
      message: translateError(locale, "session.invalid"),
    };
  }

  const parsed = createCourseSchema(locale).safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ??
        translateError(locale, "course.invalidData"),
    };
  }

  const roleCookie = cookieStore.get("user_role")?.value;

  if (roleCookie === "EVALUADOR") {
    const courses = await obtenerCursosProfesor(userId, locale);
    if (courses.length >= MAX_COURSES_PER_USER) {
      return {
        ok: false,
        message: translateError(locale, "course.limitReached", {
          max: MAX_COURSES_PER_USER,
        }),
      };
    }
  }

  try {
    const course = await crearCursoProfesor(userId, parsed.data, locale);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/cursos");
    revalidatePath(`/dashboard/cursos/${course.id}/analitica`);
    revalidatePath(`/dashboard/cursos/${course.id}`);

    return {
      ok: true,
      message: translateError(locale, "course.created", {
        name: course.fullname ?? parsed.data.fullname,
      }),
    };
  } catch (error) {
    console.error("[createCourseAction]", error);
    return {
      ok: false,
      message: translateError(locale, "course.createGenericFailed"),
    };
  }
}

export async function deleteCourseAction(
  courseId: number,
): Promise<DeleteCourseActionResult> {
  const locale = await getServerLocale();
  const cookieStore = await cookies();
  const userIdCookie = cookieStore.get("user_id")?.value;
  const userId = Number(userIdCookie);

  if (!Number.isInteger(userId) || userId <= 0) {
    return {
      ok: false,
      message: translateError(locale, "session.invalid"),
    };
  }

  if (!Number.isInteger(courseId) || courseId <= 0) {
    return {
      ok: false,
      message: translateError(locale, "course.invalid"),
    };
  }

  const courses = await obtenerCursosProfesor(userId, locale);
  const allowedCourse = courses.find((course) => course.id === courseId);

  if (!allowedCourse) {
    return {
      ok: false,
      message: translateError(locale, "course.deleteForbidden"),
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
      message: translateError(locale, "course.deleted", {
        name: allowedCourse.fullname,
      }),
    };
  } catch (error) {
    console.error("[deleteCourseAction]", error);
    return {
      ok: false,
      message: translateError(locale, "course.deleteFailed"),
    };
  }
}
