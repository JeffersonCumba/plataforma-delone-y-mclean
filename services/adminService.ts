import "server-only";

import { type RowDataPacket } from "mysql2";

import { pool } from "@/lib/db";
import { fetchMoodle } from "@/lib/moodle";
import type { MoodleCourse } from "@/services/courseService";
import type { AdminStats, AdminCursoRow, ProfesorRow } from "@/types/admin";
import { getAllTeachersTrialInfo, getTrialDays } from "@/services/trialService";

const MOODLE_TEACHER_ROLE_ID = Number(process.env.MOODLE_TEACHER_ROLE_ID ?? 4);
const MOODLE_STUDENT_ROLE_ID = Number(process.env.MOODLE_STUDENT_ROLE_ID ?? 5);

interface CourseRow extends RowDataPacket {
  id: number;
  fullname: string;
  shortname: string;
  summary: string;
  idnumber: string;
  timecreated: number;
}

interface TeacherAssignmentRow extends RowDataPacket {
  courseid: number;
  teacherName: string;
}

interface TeacherCountRow extends RowDataPacket {
  userid: number;
  courseCount: number;
}

interface ProfesorBaseRow extends RowDataPacket {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
}

interface CountRow extends RowDataPacket {
  total: number;
}

interface TeacherIdRow extends RowDataPacket {
  courseid: number;
  userid: number;
}

interface SurveyCountRow extends RowDataPacket {
  course: number;
  total: number;
}

interface StudentCountRow extends RowDataPacket {
  courseid: number;
  total: number;
}

export async function obtenerTodosLosCursos(): Promise<AdminCursoRow[]> {
  const [courseRows] = await pool.execute<CourseRow[]>(
    `SELECT id, fullname, shortname, summary, idnumber, timecreated
       FROM mdl_course
      WHERE id != 1
      ORDER BY timecreated DESC`,
  );

  if (courseRows.length === 0) {
    return [];
  }

  const courseIds = courseRows.map((c) => c.id);

  const [teacherRows] = await pool.execute<TeacherAssignmentRow[]>(
    `SELECT ctx.instanceid AS courseid,
            GROUP_CONCAT(DISTINCT CONCAT(u.firstname, ' ', u.lastname) SEPARATOR ', ') AS teacherName
       FROM mdl_role_assignments ra
       JOIN mdl_context ctx ON ctx.id = ra.contextid AND ctx.contextlevel = 50
       JOIN mdl_user u ON u.id = ra.userid AND u.deleted = 0
      WHERE ra.roleid = ?
        AND ctx.instanceid IN (${courseIds.map(() => "?").join(",")})
      GROUP BY ctx.instanceid`,
    [MOODLE_TEACHER_ROLE_ID, ...courseIds],
  );

  const teacherMap = new Map<number, string>(
    teacherRows.map((r) => [r.courseid, r.teacherName]),
  );

  const [surveyRows] = await pool.execute<SurveyCountRow[]>(
    `SELECT f.course, COUNT(fc.id) AS total
       FROM mdl_feedback_completed fc
       JOIN mdl_feedback f ON f.id = fc.feedback
      WHERE f.course IN (${courseIds.map(() => "?").join(",")})
      GROUP BY f.course`,
    [...courseIds],
  );

  const surveyMap = new Map<number, number>(
    surveyRows.map((r) => [r.course, r.total]),
  );

  const [studentRows] = await pool.execute<StudentCountRow[]>(
    `SELECT e.courseid, COUNT(ue.userid) AS total
       FROM mdl_enrol e
       JOIN mdl_user_enrolments ue ON ue.enrolid = e.id
      WHERE e.courseid IN (${courseIds.map(() => "?").join(",")})
      GROUP BY e.courseid`,
    [...courseIds],
  );

  const studentMap = new Map<number, number>(
    studentRows.map((r) => [r.courseid, r.total]),
  );

  return courseRows.map((course) => ({
    id: course.id,
    fullname: course.fullname,
    shortname: course.shortname,
    teacherName: teacherMap.get(course.id) ?? "Sin profesor",
    studentCount: studentMap.get(course.id) ?? 0,
    surveyCount: surveyMap.get(course.id) ?? 0,
    timecreated: course.timecreated,
  }));
}

export async function obtenerTodosLosProfesores(): Promise<ProfesorRow[]> {
  const [profesorRows] = await pool.execute<ProfesorBaseRow[]>(
    `SELECT DISTINCT u.id, u.username, u.firstname, u.lastname, u.email
       FROM mdl_role_assignments ra
       JOIN mdl_context ctx ON ctx.id = ra.contextid AND ctx.contextlevel = 50
       JOIN mdl_user u ON u.id = ra.userid
      WHERE ra.roleid = ?
        AND u.deleted = 0
        AND u.suspended = 0
        AND u.username NOT IN ('guest')
      ORDER BY u.firstname, u.lastname`,
    [MOODLE_TEACHER_ROLE_ID],
  );

  if (profesorRows.length === 0) {
    return [];
  }

  const userIds = profesorRows.map((p) => p.id);

  const [countRows] = await pool.execute<TeacherCountRow[]>(
    `SELECT ra.userid, COUNT(DISTINCT ctx.instanceid) AS courseCount
       FROM mdl_role_assignments ra
       JOIN mdl_context ctx ON ctx.id = ra.contextid AND ctx.contextlevel = 50
      WHERE ra.roleid = ?
        AND ra.userid IN (${userIds.map(() => "?").join(",")})
      GROUP BY ra.userid`,
    [MOODLE_TEACHER_ROLE_ID, ...userIds],
  );

  const countMap = new Map<number, number>(
    countRows.map((r) => [r.userid, r.courseCount]),
  );

  const [trialInfoMap, TRIAL_DAYS] = await Promise.all([
    getAllTeachersTrialInfo(),
    getTrialDays(),
  ]);
  const trialMap = new Map(trialInfoMap.map((t) => [t.userId, t]));

  return profesorRows.map((user) => {
    const trialInfo = trialMap.get(user.id);
    const isAdmin = user.username.toLowerCase() === "admin" || 
      (process.env.MOODLE_ADMIN_EMAIL && user.email.toLowerCase() === process.env.MOODLE_ADMIN_EMAIL!.toLowerCase());
    
    if (isAdmin) {
      return {
        id: user.id,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        fullname: `${user.firstname} ${user.lastname}`.trim(),
        email: user.email,
        courseCount: countMap.get(user.id) ?? 0,
        trialStartDate: null,
        trialEndsAt: null,
        trialDaysRemaining: 0,
        trialTotalDays: TRIAL_DAYS,
        trialIsExpired: false,
        trialIsWarningPeriod: false,
        trialWarningSent: false,
      };
    }

    return {
      id: user.id,
      username: user.username,
      firstname: user.firstname,
      lastname: user.lastname,
      fullname: `${user.firstname} ${user.lastname}`.trim(),
      email: user.email,
      courseCount: countMap.get(user.id) ?? 0,
      trialStartDate: trialInfo?.trialStartDate ?? null,
      trialEndsAt: trialInfo?.trialEndsAt ?? null,
      trialDaysRemaining: trialInfo?.daysRemaining ?? TRIAL_DAYS,
      trialTotalDays: TRIAL_DAYS,
      trialIsExpired: trialInfo?.isExpired ?? false,
      trialIsWarningPeriod: trialInfo?.isWarningPeriod ?? false,
      trialWarningSent: trialInfo?.warningSent ?? false,
    };
  });
}

export async function obtenerTodosLosAlumnos(): Promise<ProfesorRow[]> {
  const TRIAL_DAYS = await getTrialDays();

  const [alumnoRows] = await pool.execute<ProfesorBaseRow[]>(
    `SELECT DISTINCT u.id, u.username, u.firstname, u.lastname, u.email
       FROM mdl_role_assignments ra
       JOIN mdl_context ctx ON ctx.id = ra.contextid AND ctx.contextlevel = 50
       JOIN mdl_user u ON u.id = ra.userid
      WHERE ra.roleid = ?
        AND u.deleted = 0
        AND u.suspended = 0
        AND u.username NOT IN ('guest')
      ORDER BY u.firstname, u.lastname`,
    [MOODLE_STUDENT_ROLE_ID],
  );

  if (alumnoRows.length === 0) {
    return [];
  }

  const userIds = alumnoRows.map((p) => p.id);

  const [countRows] = await pool.execute<TeacherCountRow[]>(
    `SELECT ue.userid, COUNT(DISTINCT e.courseid) AS courseCount
       FROM mdl_user_enrolments ue
       JOIN mdl_enrol e ON e.id = ue.enrolid
      WHERE ue.userid IN (${userIds.map(() => "?").join(",")})
      GROUP BY ue.userid`,
    [...userIds],
  );

  const countMap = new Map<number, number>(
    countRows.map((r) => [r.userid, r.courseCount]),
  );

  return alumnoRows.map((user) => ({
    id: user.id,
    username: user.username,
    firstname: user.firstname,
    lastname: user.lastname,
    fullname: `${user.firstname} ${user.lastname}`.trim(),
    email: user.email,
    courseCount: countMap.get(user.id) ?? 0,
    trialStartDate: null,
    trialEndsAt: null,
    trialDaysRemaining: 0,
    trialTotalDays: TRIAL_DAYS,
    trialIsExpired: false,
    trialIsWarningPeriod: false,
    trialWarningSent: false,
  }));
}

export async function obtenerEstadisticasGenerales(): Promise<AdminStats> {
  const [profesorCount] = await pool.execute<CountRow[]>(
    `SELECT COUNT(DISTINCT ra.userid) AS total
       FROM mdl_role_assignments ra
       JOIN mdl_context ctx ON ctx.id = ra.contextid AND ctx.contextlevel = 50
      WHERE ra.roleid = ?`,
    [MOODLE_TEACHER_ROLE_ID],
  );

  const [cursoCount] = await pool.execute<CountRow[]>(
    "SELECT COUNT(*) AS total FROM mdl_course WHERE id != 1",
  );

  const [studentCount] = await pool.execute<CountRow[]>(
    `SELECT COUNT(DISTINCT ra.userid) AS total
       FROM mdl_role_assignments ra
       JOIN mdl_context ctx ON ctx.id = ra.contextid AND ctx.contextlevel = 50
      WHERE ra.roleid = ?`,
    [MOODLE_STUDENT_ROLE_ID],
  );

  const [surveyCount] = await pool.execute<CountRow[]>(
    `SELECT COUNT(*) AS total
       FROM mdl_feedback_completed fc
       JOIN mdl_feedback f ON f.id = fc.feedback
      WHERE f.course != 0`,
  );

  return {
    totalProfesores: profesorCount[0]?.total ?? 0,
    totalCursos: cursoCount[0]?.total ?? 0,
    totalEstudiantes: studentCount[0]?.total ?? 0,
    totalEncuestas: surveyCount[0]?.total ?? 0,
  };
}

export async function obtenerCursosDeProfesor(
  teacherId: number,
): Promise<MoodleCourse[]> {
  const [courseRows] = await pool.execute<CourseRow[]>(
    `SELECT c.id, c.fullname, c.shortname, c.summary, c.idnumber
       FROM mdl_course c
       JOIN mdl_context ctx ON ctx.contextlevel = 50 AND ctx.instanceid = c.id
       JOIN mdl_role_assignments ra ON ra.contextid = ctx.id
      WHERE ra.roleid = ?
        AND ra.userid = ?
        AND c.id != 1
      ORDER BY c.fullname`,
    [MOODLE_TEACHER_ROLE_ID, teacherId],
  );

  return courseRows.map((c) => ({
    id: c.id,
    fullname: c.fullname,
    shortname: c.shortname,
    summary: c.summary,
    idnumber: c.idnumber,
  }));
}

export async function eliminarUsuarioMoodle(userId: number): Promise<void> {
  await fetchMoodle<unknown>("core_user_delete_users", {
    "userids[0]": String(userId),
  });
}

export interface UpdateUserInput {
  username?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  password?: string;
}

export async function actualizarUsuarioMoodle(
  userId: number,
  input: UpdateUserInput,
): Promise<void> {
  const params: Record<string, string> = {
    "users[0][id]": String(userId),
  };

  if (input.username !== undefined) {
    params["users[0][username]"] = input.username;
  }
  if (input.firstname !== undefined) {
    params["users[0][firstname]"] = input.firstname;
  }
  if (input.lastname !== undefined) {
    params["users[0][lastname]"] = input.lastname;
  }
  if (input.email !== undefined) {
    params["users[0][email]"] = input.email;
  }
  if (input.password !== undefined) {
    params["users[0][password]"] = input.password;
  }

  await fetchMoodle<unknown>("core_user_update_users", params);
}

export async function obtenerIdsProfesoresDeCursos(
  courseIds: number[],
): Promise<Map<number, Set<number>>> {
  if (courseIds.length === 0) {
    return new Map();
  }

  const [rows] = await pool.execute<TeacherIdRow[]>(
    `SELECT DISTINCT ctx.instanceid AS courseid, ra.userid
       FROM mdl_role_assignments ra
       JOIN mdl_context ctx ON ctx.id = ra.contextid AND ctx.contextlevel = 50
      WHERE ra.roleid = ?
        AND ctx.instanceid IN (${courseIds.map(() => "?").join(",")})`,
    [MOODLE_TEACHER_ROLE_ID, ...courseIds],
  );

  const map = new Map<number, Set<number>>();
  for (const row of rows) {
    if (!map.has(row.courseid)) {
      map.set(row.courseid, new Set());
    }
    map.get(row.courseid)!.add(row.userid);
  }
  return map;
}

export async function esProfesorEnCurso(
  userId: number,
  courseId: number,
): Promise<boolean> {
  const [rows] = await pool.execute<CountRow[]>(
    `SELECT COUNT(*) AS total
       FROM mdl_role_assignments ra
       JOIN mdl_context ctx ON ctx.id = ra.contextid AND ctx.contextlevel = 50
      WHERE ra.roleid = ?
        AND ra.userid = ?
        AND ctx.instanceid = ?`,
    [MOODLE_TEACHER_ROLE_ID, userId, courseId],
  );

  return (rows[0]?.total ?? 0) > 0;
}

export async function desmatricularUsuarioCurso(
  userId: number,
  courseId: number,
): Promise<void> {
  const studentRoleId = Number(process.env.MOODLE_STUDENT_ROLE_ID ?? 5);

  const result = await fetchMoodle<unknown>("enrol_manual_unenrol_users", {
    "unenrolments[0][roleid]": String(studentRoleId),
    "unenrolments[0][userid]": String(userId),
    "unenrolments[0][courseid]": String(courseId),
  });
}
