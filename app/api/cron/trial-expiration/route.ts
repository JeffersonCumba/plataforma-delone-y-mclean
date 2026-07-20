import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { fetchMoodle } from "@/lib/moodle";
import { getCourseAnalyticsData } from "@/services/courseAnalyticsService";
import { sendTrialExpiringEmail, sendTrialExpiredEmail } from "@/services/emailService";
import { markTeacherExpired } from "@/services/trialService";
import { buildEmptyAnalyticsData } from "@/lib/analytics-helpers";
import { TRIAL_WARNING_DAYS, MOODLE_TEACHER_ROLE_ID } from "@/lib/constants";
import type { AnalyticsData } from "@/types/analytics";
import type { TrialInfo, TeacherInfo } from "@/types/trial";
import type { PoolConnection } from "mysql2/promise";

const TRIAL_CRON_SECRET = process.env.TRIAL_CRON_SECRET;
const PYTHON_API_URL =
  process.env.NEXT_PUBLIC_PYTHON_API_URL ?? "http://localhost:8000";

function isAdminTeacher(teacher: TeacherInfo): boolean {
  const username = teacher.username.trim().toLowerCase();
  const adminEmail = process.env.MOODLE_ADMIN_EMAIL?.trim().toLowerCase();

  return (
    username === "admin" ||
    Boolean(adminEmail && teacher.email.trim().toLowerCase() === adminEmail)
  );
}

async function getTeachersNeedingWarning(
  conn: PoolConnection,
): Promise<(TrialInfo & TeacherInfo)[]> {
  const [rows] = await conn.execute(
    `SELECT t.user_id, t.trial_start_date, t.trial_ends_at, t.warning_sent,
            u.username, u.firstname, u.lastname, u.email
        FROM mdl_user_trial t
        JOIN mdl_user u ON u.id = t.user_id
       WHERE t.deleted_at IS NULL
         AND t.status NOT IN ('EXPIRED', 'CANCELLED')
         AND t.warning_sent = FALSE
         AND u.deleted = 0
         AND t.trial_ends_at IS NOT NULL
         AND t.trial_ends_at <= DATE_ADD(NOW(), INTERVAL ? DAY)
         AND t.trial_ends_at > NOW()`,
    [TRIAL_WARNING_DAYS],
  );

  return (rows as (TrialInfo & TeacherInfo)[]).filter(
    (teacher) => !isAdminTeacher(teacher),
  );
}

async function getExpiredTeachers(
  conn: PoolConnection,
): Promise<(TrialInfo & TeacherInfo)[]> {
  const [rows] = await conn.execute(
    `SELECT t.user_id, t.trial_start_date, t.trial_ends_at, t.warning_sent,
            u.username, u.firstname, u.lastname, u.email
        FROM mdl_user_trial t
        JOIN mdl_user u ON u.id = t.user_id
       WHERE t.deleted_at IS NULL
         AND t.status NOT IN ('EXPIRED', 'CANCELLED')
         AND u.deleted = 0
         AND t.trial_ends_at IS NOT NULL
         AND t.trial_ends_at <= NOW()`,
  );

  return (rows as (TrialInfo & TeacherInfo)[]).filter(
    (teacher) => !isAdminTeacher(teacher),
  );
}

async function getTeacherCourses(
  conn: PoolConnection,
  userId: number,
  roleId: number = MOODLE_TEACHER_ROLE_ID,
): Promise<number[]> {
  const [rows] = await conn.execute(
    `SELECT DISTINCT ctx.instanceid AS courseid
        FROM mdl_role_assignments ra
        JOIN mdl_context ctx ON ctx.id = ra.contextid AND ctx.contextlevel = 50
       WHERE ra.roleid = ?
         AND ra.userid = ?`,
    [roleId, userId],
  );

  return (rows as { courseid: number }[]).map((r) => r.courseid);
}

async function getCourseName(
  conn: PoolConnection,
  courseId: number,
): Promise<string> {
  const [rows] = await conn.execute(
    `SELECT fullname FROM mdl_course WHERE id = ?`,
    [courseId],
  );
  const row = (rows as { fullname: string }[])[0];
  return row?.fullname ?? `Curso ${courseId}`;
}

async function fetchReport(
  endpoint: string,
  payload: Record<string, unknown>,
): Promise<Buffer | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`${PYTHON_API_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch (error) {
    console.error(`Error en fetchReport ${endpoint}:`, error);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function generateReportsForTeacher(
  conn: PoolConnection,
  teacherId: number,
  teacherName: string,
): Promise<{ excel: Buffer; pdf: Buffer } | null> {
  try {
    const courseIds = await getTeacherCourses(conn, teacherId);

    const analyticsCandidates = await Promise.allSettled(
      courseIds.map(async (courseId) => {
        const courseName = await getCourseName(conn, courseId);
        const data = await getCourseAnalyticsData(courseId);
        return { courseId, courseName, data };
      }),
    );

    const analyticsList = analyticsCandidates
      .filter(
        (result): result is PromiseFulfilledResult<{ courseId: number; courseName: string; data: AnalyticsData }> =>
          result.status === "fulfilled",
      )
      .map((result) => ({
        courseId: result.value.courseId,
        courseName: result.value.courseName,
        analytics: result.value.data,
      }));

    if (analyticsList.length === 0) {
      analyticsList.push({
        courseId: 0,
        courseName: `${teacherName} - Backup Completo`,
        analytics: buildEmptyAnalyticsData(),
      });
    }

    const multiPayload = analyticsList.map((c) => ({
      courseId: c.courseId,
      courseName: c.courseName,
      analytics: c.analytics,
      aiInterpretations: {
        satisfaction: "",
        descriptive: "",
        betas: "",
        frequencies: "",
        critical: "",
      },
    }));

    const payload = {
      courseId: 0,
      courseName: `${teacherName} - Backup Completo`,
      analytics: multiPayload,
    };

    const [excel, pdf] = await Promise.all([
      fetchReport("/api/export/excel/multi", payload),
      fetchReport("/api/export/pdf/multi", payload),
    ]);

    if (!excel || !pdf) return null;
    return { excel, pdf };
  } catch (error) {
    console.error(`Error generando reportes para profesor ${teacherId}:`, error);
    return null;
  }
}

async function deleteTeacherAndData(
  conn: PoolConnection,
  userId: number,
): Promise<boolean> {
  const courses = await getTeacherCourses(conn, userId);
  console.log(`Eliminando datos del profesor ${userId}: ${courses.length} curso(s)`);

  let allDeleted = true;

  for (const courseId of courses) {
    try {
      await fetchMoodle<unknown>("core_course_delete_courses", {
        "courseids[0]": String(courseId),
      });
      console.log(`Curso ${courseId} eliminado`);
    } catch (error) {
      console.error(`Error eliminando curso ${courseId} del profesor ${userId}:`, error);
      allDeleted = false;
    }
  }

  try {
    await fetchMoodle<unknown>("core_user_delete_users", {
      "userids[0]": String(userId),
    });
    console.log(`Usuario ${userId} eliminado de Moodle`);
  } catch (error) {
    console.error(`Error eliminando usuario ${userId} de Moodle:`, error);
    allDeleted = false;
  }

  if (allDeleted) {
    await markTeacherExpired(userId);
    console.log(`Trial marcado como expirado para el profesor ${userId}`);
  } else {
    console.error(
      `CRITICAL: No se pudieron eliminar todos los datos de Moodle para ${userId}. No se marca como expirado, se reintentara en el proximo cron.`,
    );
  }

  return allDeleted;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = request.headers.get("x-cron-secret");

  if (TRIAL_CRON_SECRET && cronSecret !== TRIAL_CRON_SECRET) {
    if (authHeader !== `Bearer ${TRIAL_CRON_SECRET}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  let warningsSent = 0;
  let expiredDeleted = 0;

  try {
    const conn = await pool.getConnection();

    try {
      const teachersNeedingWarning = await getTeachersNeedingWarning(conn);
      console.log(`Profesores necesitan aviso: ${teachersNeedingWarning.length}`);

      for (const teacher of teachersNeedingWarning) {
        const trialEndsAt = new Date(teacher.trial_ends_at);
        const now = new Date();
        const diffMs = trialEndsAt.getTime() - now.getTime();
        const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        const safeName = `${teacher.firstname} ${teacher.lastname}`.trim();

        const reports = await generateReportsForTeacher(conn, teacher.user_id, safeName);

        if (!reports) {
          console.log(`No se generaron respaldos para el profesor ${teacher.user_id}, se enviara aviso sin adjuntos`);
        }

        const result = await sendTrialExpiringEmail(
          teacher.email,
          safeName,
          daysRemaining,
          reports?.excel,
          reports?.pdf,
        );

        if (result.ok) {
          await conn.execute(
            `UPDATE mdl_user_trial SET warning_sent = TRUE, status = 'WARNING', warning_sent_at = NOW() WHERE user_id = ?`,
            [teacher.user_id],
          );
          await conn.execute(
            `INSERT INTO mdl_trial_audit_log (user_id, action, details) VALUES (?, 'WARNING_SENT', ?)`,
            [teacher.user_id, JSON.stringify({ daysRemaining })],
          );
          warningsSent++;
          console.log(`Aviso enviado al profesor ${teacher.user_id}`);
        } else {
          console.log(`Fallo envio de aviso al profesor ${teacher.user_id}: ${result.message}`);
        }
      }

      const expiredTeachers = await getExpiredTeachers(conn);
      console.log(`Profesores expirados: ${expiredTeachers.length}`);

      for (const teacher of expiredTeachers) {
        try {
          const safeName = `${teacher.firstname} ${teacher.lastname}`.trim();

          let reports: { excel: Buffer; pdf: Buffer } | null = null;
          for (let attempt = 1; attempt <= 3; attempt++) {
            reports = await generateReportsForTeacher(conn, teacher.user_id, safeName);
            if (reports) break;
            if (attempt < 3) {
              await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
          }

          const result = await sendTrialExpiredEmail(
            teacher.email,
            safeName,
            reports?.excel,
            reports?.pdf,
          );

          if (!result.ok) {
            console.log(`Fallo envio de expiracion al profesor ${teacher.user_id}: ${result.message}. No se eliminaron datos, se reintentara en el proximo cron.`);
            continue;
          }

          const deleted = await deleteTeacherAndData(conn, teacher.user_id);
          if (deleted) {
            expiredDeleted++;
          }
          console.log(`Correo de expiracion enviado al profesor ${teacher.user_id}`);
        } catch (error) {
          console.error(`Error procesando profesor expirado ${teacher.user_id}:`, error);
        }
      }

      return NextResponse.json({
        success: true,
        warningsSent,
        expiredDeleted,
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Error en cron de expiracion:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
