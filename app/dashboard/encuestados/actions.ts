"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { translateError } from "@/lib/errors";
import { getServerLocale } from "@/lib/server-locale";
import { studentInputSchema, type StudentInput } from "@/lib/validations/user";
import {
  buscarUsuariosMoodle,
  matricularUsuarioIndividual,
  registrarEstudiantesCsv,
  type BatchRegistrationResult,
} from "@/services/userService";
import { obtenerCursosProfesor } from "@/services/courseService";
import {
  desmatricularUsuarioCurso,
  esProfesorEnCurso,
} from "@/services/adminService";
import type {
  MatricularUsuarioActionResult,
  BuscarUsuariosActionResult,
} from "@/types/encuestado";

async function requireUserId(): Promise<number> {
  const cookieStore = await cookies();
  const userIdCookie = cookieStore.get("user_id")?.value;
  const userId = Number(userIdCookie);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error(translateError(await getServerLocale(), "enc.invalidSession"));
  }

  return userId;
}

async function ensureCourseOwnership(
  userId: number,
  courseId: number,
): Promise<void> {
  const locale = await getServerLocale();
  if (!Number.isInteger(courseId) || courseId <= 0) {
    throw new Error(translateError(locale, "enc.invalidCourse"));
  }

  const courses = await obtenerCursosProfesor(userId);
  const allowed = courses.find((course) => course.id === courseId);

  if (!allowed) {
    throw new Error(translateError(locale, "enc.noEnrollPermission"));
  }
}

export async function buscarUsuariosAction(
  query: string,
): Promise<BuscarUsuariosActionResult> {
  const locale = await getServerLocale();
  try {
    await requireUserId();
    const users = await buscarUsuariosMoodle(query, locale);
    return { ok: true, message: "OK", users };
  } catch (error) {
    console.error("[buscarUsuariosAction]", error);
    return {
      ok: false,
      message:
        error instanceof Error && error.message.includes("Sesion")
          ? translateError(locale, "enc.invalidSession")
          : translateError(locale, "enc.searchFailed"),
      users: [],
    };
  }
}

interface MatricularUsuarioPayload {
  courseId: number;
  mode: "existing" | "new";
  existingUserId?: number;
  newUser?: StudentInput;
}

export async function matricularUsuarioAction(
  payload: MatricularUsuarioPayload,
): Promise<MatricularUsuarioActionResult> {
  const locale = await getServerLocale();
  let userId: number;
  try {
    userId = await requireUserId();
  } catch {
    return {
      ok: false,
      message: translateError(locale, "enc.invalidSession"),
    };
  }

  if (!payload || (payload.mode !== "existing" && payload.mode !== "new")) {
    return { ok: false, message: translateError(locale, "enc.invalidRequest") };
  }

  if (payload.mode === "existing") {
    if (
      !Number.isInteger(payload.existingUserId) ||
      !payload.existingUserId ||
      payload.existingUserId <= 0
    ) {
      return { ok: false, message: translateError(locale, "enc.selectExistingUser") };
    }
  }

  if (payload.mode === "new") {
    if (!payload.newUser) {
      return {
        ok: false,
        message: translateError(locale, "enc.newUserDataRequired"),
      };
    }
    const parsed = studentInputSchema(locale).safeParse(payload.newUser);
    if (!parsed.success) {
      return {
        ok: false,
        message:
          parsed.error.issues[0]?.message ??
          translateError(locale, "enc.newUserInvalidData"),
      };
    }
    payload.newUser = parsed.data;
  }

  try {
    await ensureCourseOwnership(userId, payload.courseId);
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : translateError(locale, "enc.noPermissions"),
    };
  }

  try {
    const result = await matricularUsuarioIndividual(payload, locale);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/encuestados");
    revalidatePath("/dashboard/encuestados/matricular");
    revalidatePath(`/dashboard/cursos/${payload.courseId}`);
    revalidatePath(`/dashboard/cursos/${payload.courseId}/analitica`);

    return {
      ok: true,
      message: result.message,
      status: result.status,
      user: result.user,
    };
  } catch (error) {
    console.error("[matricularUsuarioAction]", error);
    return {
      ok: false,
      message: translateError(locale, "enc.enrollFailed"),
    };
  }
}

export async function desmatricularUsuarioAction(
  courseId: number,
  targetUserId: number,
): Promise<MatricularUsuarioActionResult> {
  const locale = await getServerLocale();
  let userId: number;
  try {
    userId = await requireUserId();
  } catch {
    return {
      ok: false,
      message: translateError(locale, "enc.invalidSession"),
    };
  }

  if (!Number.isInteger(courseId) || courseId <= 0) {
    return { ok: false, message: translateError(locale, "enc.invalidCourse") };
  }

  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    return { ok: false, message: translateError(locale, "enc.invalidUser") };
  }

  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;

  if (role !== "ADMIN") {
    try {
      await ensureCourseOwnership(userId, courseId);
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error ? error.message : translateError(locale, "enc.noPermissions"),
      };
    }
  }

  const isTeacher = await esProfesorEnCurso(targetUserId, courseId);
  if (isTeacher) {
    return {
      ok: false,
      message: translateError(locale, "enc.cannotUnenrollTeacher"),
    };
  }

  try {
    await desmatricularUsuarioCurso(targetUserId, courseId);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/encuestados");
    revalidatePath("/dashboard/encuestados/matricular");
    revalidatePath(`/dashboard/cursos/${courseId}`);

    return {
      ok: true,
      message: translateError(locale, "enc.unenrolled"),
    };
  } catch (error) {
    console.error("[desmatricularUsuarioAction]", error);
    return {
      ok: false,
      message: translateError(locale, "enc.unenrollFailed"),
    };
  }
}

export async function registrarEstudiantesCsvAction(
  courseId: number,
  users: StudentInput[],
): Promise<{ ok: boolean; message: string; result?: BatchRegistrationResult }> {
  const locale = await getServerLocale();
  try {
    const userId = await requireUserId();
    await ensureCourseOwnership(userId, courseId);

    const result = await registrarEstudiantesCsv(users, courseId, locale);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/encuestados");
    revalidatePath("/dashboard/encuestados/matricular");
    revalidatePath(`/dashboard/cursos/${courseId}`);

    return { ok: true, message: translateError(locale, "enc.batchCompleted"), result };
  } catch (error) {
    console.error("[registrarEstudiantesCsvAction]", error);
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : translateError(locale, "enc.batchFailed"),
    };
  }
}
