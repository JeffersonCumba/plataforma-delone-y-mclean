"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { fetchMoodle } from "@/lib/moodle";
import { registerUserSchema } from "@/lib/validations/user";
import { crearCursoProfesor, obtenerCursosProfesor } from "@/services/courseService";
import { registrarUsuario } from "@/services/userService";
import { markTeacherDeleted, getTrialDays } from "@/services/trialService";
import {
  eliminarUsuarioMoodle,
  actualizarUsuarioMoodle,
  type UpdateUserInput,
} from "@/services/adminService";

export interface AdminActionResult {
  ok: boolean;
  message: string;
}

async function requireAdmin(): Promise<void> {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;
  if (role !== "ADMIN") {
    throw new Error("Acceso denegado. Se requiere rol de administrador.");
  }
}

export async function eliminarProfesorAction(
  userId: number,
): Promise<AdminActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, message: "No tienes permisos de administrador." };
  }

  if (!Number.isInteger(userId) || userId <= 0) {
    return { ok: false, message: "ID de usuario invalido." };
  }

  try {
    await eliminarUsuarioMoodle(userId);
    await markTeacherDeleted(userId);

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/admin/profesores");

    return { ok: true, message: "Profesor eliminado correctamente de Moodle." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el profesor.",
    };
  }
}

export async function eliminarCursoAction(
  courseId: number,
): Promise<AdminActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, message: "No tienes permisos de administrador." };
  }

  if (!Number.isInteger(courseId) || courseId <= 0) {
    return { ok: false, message: "ID de curso invalido." };
  }

  try {
    await fetchMoodle<unknown>("core_course_delete_courses", {
      "courseids[0]": String(courseId),
    });

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/admin/cursos");
    revalidatePath("/dashboard/cursos");

    return { ok: true, message: "Curso eliminado correctamente de Moodle." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el curso.",
    };
  }
}

export async function crearProfesorAction(
  input: unknown,
): Promise<AdminActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, message: "No tienes permisos de administrador." };
  }

  const parsed = registerUserSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ?? "Datos de registro inválidos.",
    };
  }

  try {
    await registrarUsuario(parsed.data);

    const trialDays = await getTrialDays();
    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/admin/profesores");

    return {
      ok: true,
      message: `Profesor ${parsed.data.username} creado correctamente con período de prueba de ${trialDays} días.`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo crear el profesor.",
    };
  }
}

export async function actualizarProfesorAction(
  userId: number,
  input: UpdateUserInput,
): Promise<AdminActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, message: "No tienes permisos de administrador." };
  }

  if (!Number.isInteger(userId) || userId <= 0) {
    return { ok: false, message: "ID de usuario invalido." };
  }

  try {
    await actualizarUsuarioMoodle(userId, input);

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/admin/profesores");

    return { ok: true, message: "Profesor actualizado correctamente." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el profesor.",
    };
  }
}

export async function ejecutarCronExpiracionAction(): Promise<AdminActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, message: "No tienes permisos de administrador." };
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const secret = process.env.TRIAL_CRON_SECRET;

    const res = await fetch(`${baseUrl}/api/cron/trial-expiration`, {
      method: "GET",
      headers: secret ? { "x-cron-secret": secret } : {},
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        ok: false,
        message: `El cron respondio con estado ${res.status}.`,
      };
    }

    const data = (await res.json()) as {
      warningsSent?: number;
      expiredDeleted?: number;
    };

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/admin/profesores");

    return {
      ok: true,
      message: `Cron ejecutado: ${data.warningsSent ?? 0} avisos y ${data.expiredDeleted ?? 0} cuentas eliminadas.`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo ejecutar el cron de expiracion.",
    };
  }
}

export async function crearCursoAction(
  input: unknown,
): Promise<AdminActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, message: "No tienes permisos de administrador." };
  }

  const cookieStore = await cookies();
  const userIdCookie = cookieStore.get("user_id")?.value;
  const userId = Number(userIdCookie);

  if (!Number.isInteger(userId) || userId <= 0) {
    return { ok: false, message: "Sesion invalida." };
  }

  try {
    const course = await crearCursoProfesor(userId, input as any);

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/admin/cursos");
    revalidatePath("/dashboard/cursos");

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
          : "No se pudo crear el curso.",
    };
  }
}
