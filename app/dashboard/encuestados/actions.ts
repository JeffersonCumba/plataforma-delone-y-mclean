"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

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
    throw new Error("Sesion invalida. Vuelve a iniciar sesion.");
  }

  return userId;
}

async function ensureCourseOwnership(
  userId: number,
  courseId: number,
): Promise<void> {
  if (!Number.isInteger(courseId) || courseId <= 0) {
    throw new Error("Curso invalido.");
  }

  const courses = await obtenerCursosProfesor(userId);
  const allowed = courses.find((course) => course.id === courseId);

  if (!allowed) {
    throw new Error("No tienes permisos para matricular en este curso.");
  }
}

export async function buscarUsuariosAction(
  query: string,
): Promise<BuscarUsuariosActionResult> {
  await requireUserId();

  try {
    const users = await buscarUsuariosMoodle(query);
    return { ok: true, message: "OK", users };
  } catch (error) {
    console.error("[buscarUsuariosAction]", error);
    return {
      ok: false,
      message: "No fue posible buscar usuarios.",
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
  let userId: number;
  try {
    userId = await requireUserId();
  } catch {
    return {
      ok: false,
      message: "Sesion invalida. Vuelve a iniciar sesion.",
    };
  }

  if (!payload || (payload.mode !== "existing" && payload.mode !== "new")) {
    return { ok: false, message: "Solicitud invalida." };
  }

  if (payload.mode === "existing") {
    if (
      !Number.isInteger(payload.existingUserId) ||
      !payload.existingUserId ||
      payload.existingUserId <= 0
    ) {
      return { ok: false, message: "Selecciona un usuario existente." };
    }
  }

  if (payload.mode === "new") {
    if (!payload.newUser) {
      return {
        ok: false,
        message: "Datos del nuevo usuario son obligatorios.",
      };
    }
    const parsed = studentInputSchema.safeParse(payload.newUser);
    if (!parsed.success) {
      return {
        ok: false,
        message:
          parsed.error.issues[0]?.message ??
          "Datos del nuevo usuario invalidos.",
      };
    }
    payload.newUser = parsed.data;
  }

  try {
    await ensureCourseOwnership(userId, payload.courseId);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No tienes permisos.",
    };
  }

  try {
    const result = await matricularUsuarioIndividual(payload);

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
      message: "No se pudo matricular al usuario. Verifica los datos e intenta de nuevo.",
    };
  }
}

export async function desmatricularUsuarioAction(
  courseId: number,
  targetUserId: number,
): Promise<MatricularUsuarioActionResult> {
  let userId: number;
  try {
    userId = await requireUserId();
  } catch {
    return {
      ok: false,
      message: "Sesion invalida. Vuelve a iniciar sesion.",
    };
  }

  if (!Number.isInteger(courseId) || courseId <= 0) {
    return { ok: false, message: "Curso invalido." };
  }

  if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
    return { ok: false, message: "Usuario invalido." };
  }

  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;

  if (role !== "ADMIN") {
    try {
      await ensureCourseOwnership(userId, courseId);
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "No tienes permisos.",
      };
    }
  }

  const isTeacher = await esProfesorEnCurso(targetUserId, courseId);
  if (isTeacher) {
    return {
      ok: false,
      message:
        "No se puede desmatricular a un profesor del curso. Elimine su rol de profesor primero.",
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
      message: "Usuario desmatriculado correctamente.",
    };
  } catch (error) {
    console.error("[desmatricularUsuarioAction]", error);
    return {
      ok: false,
      message: "No se pudo desmatricular al usuario. Intenta de nuevo mas tarde.",
    };
  }
}

export async function registrarEstudiantesCsvAction(
  courseId: number,
  users: StudentInput[],
): Promise<{ ok: boolean; message: string; result?: BatchRegistrationResult }> {
  try {
    const userId = await requireUserId();
    await ensureCourseOwnership(userId, courseId);

    const result = await registrarEstudiantesCsv(users, courseId);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/encuestados");
    revalidatePath("/dashboard/encuestados/matricular");
    revalidatePath(`/dashboard/cursos/${courseId}`);

    return { ok: true, message: "Matriculacion masiva completada.", result };
  } catch (error) {
    console.error("[registrarEstudiantesCsvAction]", error);
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo completar la matriculacion masiva.",
    };
  }
}
