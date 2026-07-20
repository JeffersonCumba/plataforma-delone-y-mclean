"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { type RowDataPacket } from "mysql2";
import { fetchMoodle, MoodleApiError } from "@/lib/moodle";
import { pool } from "@/lib/db";
import { createCourseSchema } from "@/lib/validations/course";
import { registerUserSchema } from "@/lib/validations/user";
import { crearCursoProfesor, obtenerCursosProfesor } from "@/services/courseService";
import { registrarUsuario } from "@/services/userService";
import { markTeacherDeleted, markTeacherExpired, getTrialDays } from "@/services/trialService";
import { sendTrialExpiringEmail, sendTrialExpiredEmail } from "@/services/emailService";
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

interface UserRow extends RowDataPacket {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
}

function safeName(row: UserRow): string {
  return `${row.firstname ?? ""} ${row.lastname ?? ""}`.trim() || row.username;
}

export async function simularWarningAction(
  userId: number,
): Promise<AdminActionResult> {
  console.log(`[simularWarningAction] Iniciando para userId=${userId}`);

  try {
    await requireAdmin();
  } catch {
    console.log(`[simularWarningAction] Fallo por permisos`);
    return { ok: false, message: "No tienes permisos de administrador." };
  }

  if (!Number.isInteger(userId) || userId <= 0) {
    return { ok: false, message: "ID de usuario invalido." };
  }

  try {
    const [userRows] = await pool.execute<UserRow[]>(
      `SELECT id, username, firstname, lastname, email FROM mdl_user WHERE id = ? LIMIT 1`,
      [userId],
    );
    const user = userRows[0];
    if (!user) {
      console.log(`[simularWarningAction] Usuario ${userId} no encontrado en DB`);
      return { ok: false, message: "Usuario no encontrado." };
    }
    console.log(`[simularWarningAction] Usuario: ${safeName(user)} <${user.email}>`);

    const warningEnd = new Date();
    warningEnd.setDate(warningEnd.getDate() + 3);
    console.log(`[simularWarningAction] Trial se movera a ${warningEnd.toISOString()}`);

    await pool.execute(
      `UPDATE mdl_user_trial
          SET trial_ends_at = ?, warning_sent = FALSE, status = 'ACTIVE', deleted_at = NULL
        WHERE user_id = ?`,
      [warningEnd, userId],
    );
    console.log(`[simularWarningAction] Trial actualizado en DB`);

    console.log(`[simularWarningAction] Enviando correo de advertencia a ${user.email}...`);
    const emailResult = await sendTrialExpiringEmail(user.email, safeName(user), 3);
    console.log(`[simularWarningAction] Resultado del correo:`, emailResult);

    if (emailResult.ok) {
      await pool.execute(
        `UPDATE mdl_user_trial SET warning_sent = TRUE, status = 'WARNING', warning_sent_at = NOW() WHERE user_id = ?`,
        [userId],
      );
      console.log(`[simularWarningAction] warning_sent marcado en DB`);
    }

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/admin/profesores");

    const msg = `Advertencia simulada: trial a 3 dias, correo ${emailResult.ok ? "enviado" : "fallo: " + emailResult.message}`;
    console.log(`[simularWarningAction] Finalizado: ${msg}`);
    return { ok: true, message: msg };
  } catch (error) {
    console.error(`[simularWarningAction] Error:`, error);
    return { ok: false, message: "No se pudo simular la advertencia. Revisa los logs." };
  }
}

export async function simularExpiracionAction(
  userId: number,
): Promise<AdminActionResult> {
  console.log(`[simularExpiracionAction] Iniciando para userId=${userId}`);

  try {
    await requireAdmin();
  } catch {
    console.log(`[simularExpiracionAction] Fallo por permisos`);
    return { ok: false, message: "No tienes permisos de administrador." };
  }

  if (!Number.isInteger(userId) || userId <= 0) {
    return { ok: false, message: "ID de usuario invalido." };
  }

  try {
    const [userRows] = await pool.execute<UserRow[]>(
      `SELECT id, username, firstname, lastname, email FROM mdl_user WHERE id = ? LIMIT 1`,
      [userId],
    );
    const user = userRows[0];
    if (!user) {
      console.log(`[simularExpiracionAction] Usuario ${userId} no encontrado en DB`);
      return { ok: false, message: "Usuario no encontrado." };
    }
    console.log(`[simularExpiracionAction] Usuario: ${safeName(user)} <${user.email}>`);

    console.log(`[simularExpiracionAction] Enviando correo de expiracion a ${user.email}...`);
    const emailResult = await sendTrialExpiredEmail(user.email, safeName(user));
    console.log(`[simularExpiracionAction] Resultado del correo:`, emailResult);

    if (!emailResult.ok) {
      console.log(`[simularExpiracionAction] El correo fallo, se cancela la eliminacion`);
      return { ok: false, message: `El correo de expiracion no pudo enviarse: ${emailResult.message}. No se eliminaron datos.` };
    }
    console.log(`[simularExpiracionAction] Correo enviado, procediendo con eliminacion...`);

    const courses = await obtenerCursosProfesor(userId);
    console.log(`[simularExpiracionAction] Cursos encontrados: ${courses.length}`);

    for (const course of courses) {
      console.log(`[simularExpiracionAction] Eliminando curso ${course.id} (${course.fullname})...`);
      try {
        await fetchMoodle<unknown>("core_course_delete_courses", {
          "courseids[0]": String(course.id),
        });
        console.log(`[simularExpiracionAction] Curso ${course.id} eliminado`);
      } catch (e) {
        console.error(`[simularExpiracionAction] Error eliminando curso ${course.id}:`, e);
      }
    }

    console.log(`[simularExpiracionAction] Eliminando usuario ${userId} de Moodle...`);
    try {
      await eliminarUsuarioMoodle(userId);
      console.log(`[simularExpiracionAction] Usuario ${userId} eliminado de Moodle`);
    } catch (e) {
      console.error(`[simularExpiracionAction] Error eliminando usuario ${userId}:`, e);
    }

    console.log(`[simularExpiracionAction] Marcando trial como expirado...`);
    await markTeacherExpired(userId);
    console.log(`[simularExpiracionAction] Trial marcado como EXPIRED`);

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/admin/profesores");

    const msg = `Expiracion simulada: correo enviado, ${courses.length} curso(s) y usuario eliminados.`;
    console.log(`[simularExpiracionAction] Finalizado: ${msg}`);
    return { ok: true, message: msg };
  } catch (error) {
    console.error(`[simularExpiracionAction] Error:`, error);
    return {
      ok: false,
      message: "No se pudo simular la expiracion. Revisa los logs.",
    };
  }
}
