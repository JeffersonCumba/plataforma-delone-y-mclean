import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { fetchMoodle } from "@/lib/moodle";
import { getCourseAnalyticsData } from "@/services/courseAnalyticsService";
import { sendTrialExpiringEmail, sendTrialExpiredEmail } from "@/services/emailService";
import { markTeacherExpired } from "@/services/trialService";
import type { AnalyticsData, DimensionKey } from "@/types/analytics";
import type { PoolConnection } from "mysql2/promise";

const MOODLE_TEACHER_ROLE_ID = Number(process.env.MOODLE_TEACHER_ROLE_ID ?? 4);
const MOODLE_STUDENT_ROLE_ID = Number(process.env.MOODLE_STUDENT_ROLE_ID ?? 5);

const TRIAL_DAYS = Number(process.env.TRIAL_DAYS ?? 30);
const TRIAL_WARNING_DAYS = Number(process.env.TRIAL_WARNING_DAYS ?? 3);
const TRIAL_CRON_SECRET = process.env.TRIAL_CRON_SECRET;
const PYTHON_API_URL =
  process.env.NEXT_PUBLIC_PYTHON_API_URL ?? "http://localhost:8000";

interface TrialInfo {
  user_id: number;
  trial_start_date: Date;
  trial_ends_at: Date;
  warning_sent: boolean;
  deleted_at: Date | null;
}

interface TeacherInfo {
  user_id: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
}

function isAdminTeacher(teacher: TeacherInfo): boolean {
  const username = teacher.username.trim().toLowerCase();
  const adminEmail = process.env.MOODLE_ADMIN_EMAIL?.trim().toLowerCase();

  return (
    username === "admin" ||
    Boolean(adminEmail && teacher.email.trim().toLowerCase() === adminEmail)
  );
}

function buildEmptyAnalyticsData(): AnalyticsData {
  const emptyR2 = {} as Partial<Record<DimensionKey, number>>;

  return {
    totalSurveys: 0,
    totalRespondents: 0,
    responseRate: 0,
    cronbachAlpha: 0,
    promediosDimensiones: {
      calidad_sys: 0,
      calidad_info: 0,
      calidad_serv: 0,
      uso_sistema: 0,
      satis_user: 0,
      benef_netos: 0,
    },
    dimensionChartData: [],
    betaCoefficients: [],
    criticalQuestions: [],
    satisfactionDistribution: [],
    questionFrequencies: [],
    deloneMcleanModel: {
      sampleSize: 0,
      bootstrapSamples: 0,
      structuralPaths: [],
      constructReliability: [],
      discriminantValidity: [],
      rSquared: emptyR2,
    },
  };
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

async function getCourseStudents(
  conn: PoolConnection,
  courseId: number,
): Promise<number[]> {
  const [rows] = await conn.execute(
    `SELECT DISTINCT ue.userid AS userid
        FROM mdl_user_enrolments ue
        JOIN mdl_enrol e ON e.id = ue.enrolid
       WHERE e.courseid = ?`,
    [courseId],
  );

  return (rows as { userid: number }[]).map((r) => r.userid);
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
  try {
    const res = await fetch(`${PYTHON_API_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

async function generateReportsForTeacher(
  conn: PoolConnection,
  teacherId: number,
  teacherName: string,
): Promise<{ excel: Buffer; pdf: Buffer } | null> {
  try {
    const courseIds = await getTeacherCourses(conn, teacherId);
    const courseNames: Record<number, string> = {};

    const analyticsCandidates = await Promise.allSettled(
      courseIds.map(async (courseId) => {
        const courseName = await getCourseName(conn, courseId);
        courseNames[courseId] = courseName;
        return getCourseAnalyticsData(courseId);
      }),
    );

    const analyticsList = analyticsCandidates
      .filter(
        (result): result is PromiseFulfilledResult<AnalyticsData> =>
          result.status === "fulfilled",
      )
      .map((result, index) => ({
        courseId: courseIds[index],
        courseName: courseNames[courseIds[index]] ?? `Curso ${courseIds[index]}`,
        analytics: result.value,
      }));

    if (analyticsList.length === 0) {
      const empty = buildEmptyAnalyticsData();
      analyticsList.push({
        courseId: 0,
        courseName: `${teacherName} - Backup Completo`,
        analytics: empty,
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
  } catch {
    return null;
  }
}

async function deleteTeacherAndData(
  conn: PoolConnection,
  userId: number,
): Promise<void> {
  const courses = await getTeacherCourses(conn, userId);
  console.log(`Eliminando datos del profesor ${userId}: ${courses.length} curso(s)`);

  for (const courseId of courses) {
    try {
      await fetchMoodle<unknown>("core_course_delete_courses", {
        "courseids[0]": String(courseId),
      });
      console.log(`Curso ${courseId} eliminado`);
    } catch {
      console.log(`Error eliminando curso ${courseId} del profesor ${userId}`);
    }
  }

  for (const courseId of courses) {
    try {
      const students = await getCourseStudents(conn, courseId);
      for (const studentId of students) {
        try {
          await fetchMoodle<unknown>("enrol_manual_unenrol_users", {
            "unenrolments[0][roleid]": String(MOODLE_STUDENT_ROLE_ID),
            "unenrolments[0][userid]": String(studentId),
            "unenrolments[0][courseid]": String(courseId),
          });
        } catch {
          console.log(`Error desmatriculando alumno ${studentId} del curso ${courseId}`);
        }
      }
    } catch {
      console.log(`Error obteniendo alumnos del curso ${courseId}`);
    }
  }

  try {
    await fetchMoodle<unknown>("core_user_delete_users", {
      "userids[0]": String(userId),
    });
    console.log(`Usuario ${userId} eliminado de Moodle`);
  } catch {
    console.log(`Error eliminando usuario ${userId} de Moodle`);
  }

  await markTeacherExpired(userId);
  console.log(`Trial marcado como expirado para el profesor ${userId}`);
}

async function markWarningSent(
  conn: PoolConnection,
  userId: number,
): Promise<void> {
  await conn.execute(
    `UPDATE mdl_user_trial SET warning_sent = TRUE, status = 'WARNING', warning_sent_at = NOW() WHERE user_id = ?`,
    [userId],
  );
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

        if (reports) {
          const result = await sendTrialExpiringEmail(
            teacher.email,
            safeName,
            daysRemaining,
            reports.excel,
            reports.pdf,
          );

          if (result.ok) {
            await markWarningSent(conn, teacher.user_id);
            await conn.execute(
              `INSERT INTO mdl_trial_audit_log (user_id, action, details) VALUES (?, 'WARNING_SENT', ?)`,
              [teacher.user_id, JSON.stringify({ daysRemaining })],
            );
            warningsSent++;
            console.log(`Aviso enviado al profesor ${teacher.user_id}`);
          } else {
            console.log(`Fallo envio de aviso al profesor ${teacher.user_id}: ${result.message}`);
          }
        } else {
          console.log(`No se generaron respaldos para el profesor ${teacher.user_id}`);
        }
      }

      const expiredTeachers = await getExpiredTeachers(conn);
      console.log(`Profesores expirados: ${expiredTeachers.length}`);

      for (const teacher of expiredTeachers) {
        try {
          await deleteTeacherAndData(conn, teacher.user_id);

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

          if (result.ok) {
            expiredDeleted++;
            console.log(`Correo de expiracion enviado al profesor ${teacher.user_id}`);
          } else {
            console.log(`Fallo envio de expiracion al profesor ${teacher.user_id}: ${result.message}`);
          }
        } catch (error) {
          console.log(`Error procesando profesor expirado ${teacher.user_id}:`, error);
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
