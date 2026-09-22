"use server";

import { revalidatePath } from "next/cache";

import { fetchMoodle } from "@/lib/moodle";
import { translateError } from "@/lib/errors";
import { getServerLocale } from "@/lib/server-locale";
import { getServerSession } from "@/lib/session";
import {
  createCourseSchema,
  updateCourseNameSchema,
} from "@/lib/validations/course";
import { MAX_COURSES_PER_USER } from "@/lib/constants";
import {
  CourseCreationBusyError,
  CourseIdentifierConflictError,
  crearCursoProfesor,
  obtenerCursosProfesor,
  syncFeedbackLanguageInCourse,
  updateMoodleCourseName,
} from "@/services/courseService";
import { obtenerTodosLosCursos } from "@/services/adminService";

export interface CreateCourseActionResult {
  ok: boolean;
  message: string;
}

export interface DeleteCourseActionResult {
  ok: boolean;
  message: string;
}

export async function updateCourseNameAction(
  courseId: number,
  payload: unknown,
): Promise<{ ok: boolean; message: string; fullname?: string }> {
  const locale = await getServerLocale();
  const session = await getServerSession();
  if (!session) {
    return { ok: false, message: translateError(locale, "session.invalid") };
  }

  if (!Number.isInteger(courseId) || courseId <= 0) {
    return { ok: false, message: translateError(locale, "course.invalid") };
  }

  const parsed = updateCourseNameSchema(locale).safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ??
        translateError(locale, "course.invalidData"),
    };
  }

  const courses = session.role === "ADMIN"
    ? await obtenerTodosLosCursos()
    : await obtenerCursosProfesor(session.userId, locale);
  const allowedCourse = courses.find((course) => course.id === courseId);
  if (!allowedCourse) {
    return { ok: false, message: translateError(locale, "course.updateForbidden") };
  }

  if (allowedCourse.fullname.trim() === parsed.data.fullname) {
    return {
      ok: true,
      message: translateError(locale, "course.nameUpdated", {
        name: parsed.data.fullname,
      }),
      fullname: parsed.data.fullname,
    };
  }

  try {
    await updateMoodleCourseName(courseId, parsed.data.fullname, locale);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/cursos");
    revalidatePath(`/dashboard/cursos/${courseId}`);
    revalidatePath(`/dashboard/cursos/${courseId}/analitica`);

    return {
      ok: true,
      message: translateError(locale, "course.nameUpdated", {
        name: parsed.data.fullname,
      }),
      fullname: parsed.data.fullname,
    };
  } catch (error) {
    console.error("[updateCourseNameAction]", error);
    if (
      error instanceof CourseIdentifierConflictError ||
      error instanceof CourseCreationBusyError
    ) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: translateError(locale, "course.updateFailed") };
  }
}

export async function updateCourseSurveyLanguageAction(
  courseId: number,
  language: "es" | "en" | "pt",
): Promise<{ ok: boolean; message: string }> {
  const locale = await getServerLocale();
  const session = await getServerSession();
  if (!session) return { ok: false, message: translateError(locale, "session.invalid") };
  if (!Number.isInteger(courseId) || courseId <= 0) {
    return { ok: false, message: translateError(locale, "course.invalid") };
  }
  if (!(["es", "en", "pt"] as const).includes(language)) {
    return { ok: false, message: translateError(locale, "course.invalidData") };
  }

  const courses = session.role === "ADMIN"
    ? await obtenerTodosLosCursos()
    : await obtenerCursosProfesor(session.userId, locale);
  if (!courses.some((course) => course.id === courseId)) {
    return { ok: false, message: translateError(locale, "course.languageForbidden") };
  }

  try {
    const updated = await syncFeedbackLanguageInCourse(courseId, language);
    revalidatePath(`/dashboard/cursos/${courseId}`);
    return {
      ok: true,
      message: translateError(locale, "course.languageUpdated", { count: updated }),
    };
  } catch (error) {
    console.error("[updateCourseSurveyLanguageAction]", error);
    return { ok: false, message: translateError(locale, "course.languageUpdateFailed") };
  }
}

export async function createCourseAction(
  payload: unknown,
): Promise<CreateCourseActionResult> {
  const locale = await getServerLocale();
  const session = await getServerSession();
  if (!session) {
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

  if (session.role === "EVALUADOR") {
    const courses = await obtenerCursosProfesor(session.userId, locale);
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
    const course = await crearCursoProfesor(session.userId, parsed.data, locale);

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
    if (
      error instanceof CourseIdentifierConflictError ||
      error instanceof CourseCreationBusyError
    ) {
      return { ok: false, message: error.message };
    }
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
  const session = await getServerSession();
  if (!session) {
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

  const courses = await obtenerCursosProfesor(session.userId, locale);
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
