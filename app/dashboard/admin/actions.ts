"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { fetchMoodle, MoodleApiError } from "@/lib/moodle";
import { createCourseSchema } from "@/lib/validations/course";
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
    console.error("[eliminarProfesorAction]", error);
    return {
      ok: false,
      message: "No se pudo eliminar el profesor. Intenta de nuevo mas tarde.",
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
    console.error("[eliminarCursoAction]", error);
    return {
      ok: false,
      message: "No se pudo eliminar el curso. Intenta de nuevo mas tarde.",
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
        parsed.error.issues[0]?.message ?? "Datos de registro invalidos.",
    };
  }

  try {
    await registrarUsuario(parsed.data);

    const trialDays = await getTrialDays();
    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/admin/profesores");

    return {
      ok: true,
      message: `Profesor ${parsed.data.username} creado correctamente con periodo de prueba de ${trialDays} dias.`,
    };
  } catch (error) {
    console.error("[crearProfesorAction]", error);
    return {
      ok: false,
      message: "No se pudo crear el profesor. Verifica los datos e intenta de nuevo.",
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
    console.error("[actualizarProfesorAction]", error);
    return {
      ok: false,
      message: "No se pudo actualizar el profesor. Intenta de nuevo mas tarde.",
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
    console.error("[ejecutarCronExpiracionAction]", error);
    return {
      ok: false,
      message: "No se pudo ejecutar el cron de expiracion. Intenta de nuevo mas tarde.",
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

  const parsed = createCourseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Datos invalidos para crear el curso.",
    };
  }

  const cookieStore = await cookies();
  const userIdCookie = cookieStore.get("user_id")?.value;
  const userId = Number(userIdCookie);

  if (!Number.isInteger(userId) || userId <= 0) {
    return { ok: false, message: "Sesion invalida." };
  }

  try {
    const course = await crearCursoProfesor(userId, parsed.data);

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/admin/cursos");
    revalidatePath("/dashboard/cursos");

    return {
      ok: true,
      message: `Curso ${course.fullname ?? parsed.data.fullname} creado con encuesta base.`,
    };
  } catch (error) {
    console.error("[admin crearCursoAction]", error);
    return {
      ok: false,
      message: "No se pudo crear el curso. Verifica los datos e intenta de nuevo.",
    };
  }
}
