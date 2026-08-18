"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { type RowDataPacket } from "mysql2";
import { fetchMoodle } from "@/lib/moodle";
import { pool } from "@/lib/db";
import { translateError } from "@/lib/errors";
import { getServerLocale } from "@/lib/server-locale";
import { registerUserSchema } from "@/lib/validations/user";
import { obtenerCursosProfesor } from "@/services/courseService";
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
    throw new Error(translateError(await getServerLocale(), "admin.accessDenied"));
  }
}

export async function eliminarProfesorAction(
  userId: number,
): Promise<AdminActionResult> {
  const locale = await getServerLocale();
  try {
    await requireAdmin();
  } catch {
    return { ok: false, message: translateError(locale, "admin.noPermissions") };
  }

  if (!Number.isInteger(userId) || userId <= 0) {
    return { ok: false, message: translateError(locale, "admin.invalidUserId") };
  }

  try {
    await eliminarUsuarioMoodle(userId);
    await markTeacherDeleted(userId);

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/admin/profesores");

    return { ok: true, message: translateError(locale, "admin.profesorDeleted") };
  } catch (error) {
    console.error("[eliminarProfesorAction]", error);
    return {
      ok: false,
      message: translateError(locale, "admin.profesorDeleteFailed"),
    };
  }
}

export async function eliminarCursoAction(
  courseId: number,
): Promise<AdminActionResult> {
  const locale = await getServerLocale();
  try {
    await requireAdmin();
  } catch {
    return { ok: false, message: translateError(locale, "admin.noPermissions") };
  }

  if (!Number.isInteger(courseId) || courseId <= 0) {
    return { ok: false, message: translateError(locale, "admin.invalidCourseId") };
  }

  try {
    await fetchMoodle<unknown>("core_course_delete_courses", {
      "courseids[0]": String(courseId),
    });

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/admin/cursos");
    revalidatePath("/dashboard/cursos");

    return { ok: true, message: translateError(locale, "admin.courseDeleted") };
  } catch (error) {
    console.error("[eliminarCursoAction]", error);
    return {
      ok: false,
      message: translateError(locale, "admin.courseDeleteFailed"),
    };
  }
}

export async function crearProfesorAction(
  input: unknown,
): Promise<AdminActionResult> {
  const locale = await getServerLocale();
  try {
    await requireAdmin();
  } catch {
    return { ok: false, message: translateError(locale, "admin.noPermissions") };
  }

  const parsed = registerUserSchema(locale).safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message:
        parsed.error.issues[0]?.message ??
        translateError(locale, "admin.registerInvalidData"),
    };
  }

  try {
    await registrarUsuario(parsed.data, locale);

    const trialDays = await getTrialDays();
    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/admin/profesores");

    return {
      ok: true,
      message: translateError(locale, "admin.profesorCreated", {
        username: parsed.data.username,
        days: trialDays,
      }),
    };
  } catch (error) {
    console.error("[crearProfesorAction]", error);
    return {
      ok: false,
      message: translateError(locale, "admin.profesorCreateFailed"),
    };
  }
}

export async function actualizarProfesorAction(
  userId: number,
  input: UpdateUserInput,
): Promise<AdminActionResult> {
  const locale = await getServerLocale();
  try {
    await requireAdmin();
  } catch {
    return { ok: false, message: translateError(locale, "admin.noPermissions") };
  }

  if (!Number.isInteger(userId) || userId <= 0) {
    return { ok: false, message: translateError(locale, "admin.invalidUserId") };
  }

  try {
    await actualizarUsuarioMoodle(userId, input);

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/admin/profesores");

    return { ok: true, message: translateError(locale, "admin.profesorUpdated") };
  } catch (error) {
    console.error("[actualizarProfesorAction]", error);
    return {
      ok: false,
      message: translateError(locale, "admin.profesorUpdateFailed"),
    };
  }
}

export async function ejecutarCronExpiracionAction(): Promise<AdminActionResult> {
  const locale = await getServerLocale();
  try {
    await requireAdmin();
  } catch {
    return { ok: false, message: translateError(locale, "admin.noPermissions") };
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
        message: translateError(locale, "admin.cronResponded", {
          status: res.status,
        }),
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
      message: translateError(locale, "admin.cronExecuted", {
        warnings: data.warningsSent ?? 0,
        deleted: data.expiredDeleted ?? 0,
      }),
    };
  } catch (error) {
    console.error("[ejecutarCronExpiracionAction]", error);
    return {
      ok: false,
      message: translateError(locale, "admin.cronExecuteFailed"),
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
  const locale = await getServerLocale();
  console.log(`[simularWarningAction] Iniciando para userId=${userId}`);

  try {
    await requireAdmin();
  } catch {
    console.log(`[simularWarningAction] Fallo por permisos`);
    return { ok: false, message: translateError(locale, "admin.noPermissions") };
  }

  if (!Number.isInteger(userId) || userId <= 0) {
    return { ok: false, message: translateError(locale, "admin.invalidUserId") };
  }

  try {
    const [userRows] = await pool.execute<UserRow[]>(
      `SELECT id, username, firstname, lastname, email FROM mdl_user WHERE id = ? LIMIT 1`,
      [userId],
    );
    const user = userRows[0];
    if (!user) {
      console.log(`[simularWarningAction] Usuario ${userId} no encontrado en DB`);
      return { ok: false, message: translateError(locale, "admin.userNotFound") };
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

    const msg = translateError(locale, "admin.warningSimulated", {
      emailStatus: emailResult.ok
        ? "enviado"
        : translateError(locale, "admin.emailFailed", {
            message: emailResult.message,
          }),
    });
    console.log(`[simularWarningAction] Finalizado: ${msg}`);
    return { ok: true, message: msg };
  } catch (error) {
    console.error(`[simularWarningAction] Error:`, error);
    return { ok: false, message: translateError(locale, "admin.warningSimulateFailed") };
  }
}

export async function simularExpiracionAction(
  userId: number,
): Promise<AdminActionResult> {
  const locale = await getServerLocale();
  console.log(`[simularExpiracionAction] Iniciando para userId=${userId}`);

  try {
    await requireAdmin();
  } catch {
    console.log(`[simularExpiracionAction] Fallo por permisos`);
    return { ok: false, message: translateError(locale, "admin.noPermissions") };
  }

  if (!Number.isInteger(userId) || userId <= 0) {
    return { ok: false, message: translateError(locale, "admin.invalidUserId") };
  }

  try {
    const [userRows] = await pool.execute<UserRow[]>(
      `SELECT id, username, firstname, lastname, email FROM mdl_user WHERE id = ? AND deleted = 0 LIMIT 1`,
      [userId],
    );
    const user = userRows[0];
    if (!user) {
      console.log(`[simularExpiracionAction] Usuario ${userId} no encontrado o eliminado`);
      return { ok: false, message: translateError(locale, "admin.userNotFound") };
    }
    console.log(`[simularExpiracionAction] Usuario: ${safeName(user)} <${user.email}>`);

    console.log(`[simularExpiracionAction] Enviando correo de expiracion a ${user.email}...`);
    const emailResult = await sendTrialExpiredEmail(user.email, safeName(user));
    console.log(`[simularExpiracionAction] Resultado del correo:`, emailResult);

    if (!emailResult.ok) {
      console.log(`[simularExpiracionAction] El correo fallo, se cancela la eliminacion`);
      return { ok: false, message: translateError(locale, "admin.expirationEmailFailed", { message: emailResult.message }) };
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

    const msg = translateError(locale, "admin.expirationSimulated", {
      count: courses.length,
    });
    console.log(`[simularExpiracionAction] Finalizado: ${msg}`);
    return { ok: true, message: msg };
  } catch (error) {
    console.error(`[simularExpiracionAction] Error:`, error);
    return {
      ok: false,
      message: translateError(locale, "admin.expirationSimulateFailed"),
    };
  }
}
