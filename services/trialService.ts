"use server";

import { type RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import {
  MOODLE_TEACHER_ROLE_ID,
  TRIAL_DAYS,
  TRIAL_WARNING_DAYS,
} from "@/lib/constants";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

interface TrialRow extends RowDataPacket {
  user_id: number;
  trial_start_date: Date;
  trial_ends_at: Date;
  warning_sent: boolean;
  deleted_at: Date | null;
  status: "ACTIVE" | "WARNING" | "EXPIRED" | "CANCELLED";
  warning_sent_at: Date | null;
  expired_at: Date | null;
}

interface MoodleUserCreationRow extends RowDataPacket {
  user_id: number;
  timecreated: number;
}

export interface TeacherTrialInfo {
  userId: number;
  trialStartDate: Date;
  trialEndsAt: Date;
  daysRemaining: number;
  isExpired: boolean;
  warningSent: boolean;
  isWarningPeriod: boolean;
  status: string;
}

function buildTrialInfo({
  userId,
  trialStartDate,
  trialEndsAt,
  warningSent,
  status,
}: {
  userId: number;
  trialStartDate: Date;
  trialEndsAt: Date;
  warningSent: boolean;
  status: TrialRow["status"];
}): TeacherTrialInfo {
  const daysRemaining = Math.max(
    0,
    Math.ceil((trialEndsAt.getTime() - Date.now()) / MS_PER_DAY),
  );
  const isExpired =
    daysRemaining === 0 || status === "EXPIRED" || status === "CANCELLED";

  return {
    userId,
    trialStartDate,
    trialEndsAt,
    daysRemaining,
    isExpired,
    warningSent,
    isWarningPeriod:
      !isExpired && daysRemaining <= TRIAL_WARNING_DAYS && daysRemaining > 0,
    status,
  };
}

function buildTrialFromMoodleCreation(
  userId: number,
  timecreated: number,
): TeacherTrialInfo {
  const trialStartDate = new Date(timecreated * 1000);
  const trialEndsAt = new Date(
    trialStartDate.getTime() + TRIAL_DAYS * MS_PER_DAY,
  );

  return buildTrialInfo({
    userId,
    trialStartDate,
    trialEndsAt,
    warningSent: false,
    status: trialEndsAt.getTime() <= Date.now() ? "EXPIRED" : "ACTIVE",
  });
}

async function persistTrialFromMoodleCreation(userId: number): Promise<void> {
  await pool.execute(
    `INSERT IGNORE INTO mdl_user_trial
       (user_id, trial_start_date, trial_ends_at, warning_sent, deleted_at, status)
     SELECT id,
            FROM_UNIXTIME(timecreated),
            TIMESTAMPADD(DAY, ?, FROM_UNIXTIME(timecreated)),
            FALSE,
            NULL,
            'ACTIVE'
       FROM mdl_user
      WHERE id = ? AND deleted = 0`,
    [TRIAL_DAYS, userId],
  );
}

async function isAdminUser(userId: number): Promise<boolean> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT username, email FROM mdl_user WHERE id = ? AND deleted = 0 LIMIT 1`,
    [userId],
  );
  const user = rows[0];
  if (!user) return false;

  const isAdminByUsername = user.username.toLowerCase() === "admin";
  const adminEmail = process.env.MOODLE_ADMIN_EMAIL?.trim().toLowerCase();
  const isAdminByEmail = Boolean(adminEmail && user.email.toLowerCase() === adminEmail);

  return isAdminByUsername || isAdminByEmail;
}

async function writeAuditLog(userId: number, action: string, details?: Record<string, unknown>): Promise<void> {
  try {
    await pool.execute(
      `INSERT INTO mdl_trial_audit_log (user_id, action, details) VALUES (?, ?, ?)`,
      [userId, action, details ? JSON.stringify(details) : null],
    );
  } catch {
    // non-critical
  }
}

export async function initializeTrialForTeacher(userId: number): Promise<void> {
  if (await isAdminUser(userId)) {
    return;
  }

  const trialStartDate = new Date();
  const trialEndsAt = new Date(trialStartDate);
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  const [existing] = await pool.execute<TrialRow[]>(
    `SELECT user_id FROM mdl_user_trial WHERE user_id = ?`,
    [userId],
  );
  if (existing.length > 0) return;

  await pool.execute(
    `INSERT INTO mdl_user_trial (user_id, trial_start_date, trial_ends_at, warning_sent, deleted_at, status)
     VALUES (?, ?, ?, FALSE, NULL, 'ACTIVE')`,
    [userId, trialStartDate, trialEndsAt],
  );

  await writeAuditLog(userId, "TRIAL_INITIALIZED", { trialDays: TRIAL_DAYS, trialEndsAt: trialEndsAt.toISOString() });
}

export async function getTeacherTrialInfo(userId: number): Promise<TeacherTrialInfo | null> {
  if (await isAdminUser(userId)) {
    return null;
  }

  const [rows] = await pool.execute<TrialRow[]>(
    `SELECT user_id, trial_start_date, trial_ends_at, warning_sent, deleted_at, status, warning_sent_at, expired_at
        FROM mdl_user_trial
       WHERE user_id = ?
       LIMIT 1`,
    [userId],
  );

  if (rows.length === 0) {
    const [users] = await pool.execute<MoodleUserCreationRow[]>(
      `SELECT id AS user_id, timecreated
         FROM mdl_user
        WHERE id = ? AND deleted = 0
        LIMIT 1`,
      [userId],
    );

    if (!users[0]) return null;

    await persistTrialFromMoodleCreation(users[0].user_id);
    return buildTrialFromMoodleCreation(users[0].user_id, users[0].timecreated);
  }

  const row = rows[0];
  return buildTrialInfo({
    userId: row.user_id,
    trialStartDate: new Date(row.trial_start_date),
    trialEndsAt: new Date(row.trial_ends_at),
    warningSent: row.warning_sent,
    status: row.status,
  });
}

export async function getAllTeachersTrialInfo(): Promise<TeacherTrialInfo[]> {
  const [rows] = await pool.execute<TrialRow[]>(
    `SELECT user_id, trial_start_date, trial_ends_at, warning_sent, deleted_at, status, warning_sent_at, expired_at
        FROM mdl_user_trial`,
  );

  const results: TeacherTrialInfo[] = [];
  const registeredUserIds = new Set(rows.map((row) => row.user_id));

  for (const row of rows) {
    if (await isAdminUser(row.user_id)) continue;

    results.push(buildTrialInfo({
      userId: row.user_id,
      trialStartDate: new Date(row.trial_start_date),
      trialEndsAt: new Date(row.trial_ends_at),
      warningSent: row.warning_sent,
      status: row.status,
    }));
  }

  const [teachersWithoutTrial] = await pool.execute<MoodleUserCreationRow[]>(
    `SELECT DISTINCT u.id AS user_id, u.timecreated
       FROM mdl_role_assignments ra
       JOIN mdl_context ctx ON ctx.id = ra.contextid AND ctx.contextlevel = 50
       JOIN mdl_user u ON u.id = ra.userid
      WHERE ra.roleid = ?
        AND u.deleted = 0
        AND u.suspended = 0`,
    [MOODLE_TEACHER_ROLE_ID],
  );

  for (const teacher of teachersWithoutTrial) {
    if (registeredUserIds.has(teacher.user_id)) continue;
    if (await isAdminUser(teacher.user_id)) continue;

    await persistTrialFromMoodleCreation(teacher.user_id);
    results.push(
      buildTrialFromMoodleCreation(teacher.user_id, teacher.timecreated),
    );
  }

  return results;
}

export async function markWarningSent(userId: number): Promise<void> {
  await pool.execute(
    `UPDATE mdl_user_trial SET warning_sent = TRUE, status = 'WARNING', warning_sent_at = NOW() WHERE user_id = ?`,
    [userId],
  );
  await writeAuditLog(userId, "WARNING_SENT");
}

export async function markTeacherDeleted(userId: number): Promise<void> {
  await pool.execute(
    `UPDATE mdl_user_trial SET deleted_at = NOW(), status = 'CANCELLED' WHERE user_id = ?`,
    [userId],
  );
  await writeAuditLog(userId, "TEACHER_DELETED");
}

export async function markTeacherExpired(userId: number): Promise<void> {
  await pool.execute(
    `UPDATE mdl_user_trial SET deleted_at = NOW(), status = 'EXPIRED', expired_at = NOW() WHERE user_id = ?`,
    [userId],
  );
  await writeAuditLog(userId, "TRIAL_EXPIRED");
}

export async function getTeachersNeedingWarning(): Promise<TeacherTrialInfo[]> {
  const all = await getAllTeachersTrialInfo();
  return all.filter(
    (t) =>
      ["ACTIVE", "WARNING"].includes(t.status) &&
      t.isWarningPeriod &&
      !t.warningSent,
  );
}

export async function getExpiredTeachers(): Promise<TeacherTrialInfo[]> {
  const all = await getAllTeachersTrialInfo();
  return all.filter(
    (t) => ["ACTIVE", "WARNING"].includes(t.status) && t.isExpired,
  );
}

export async function getTrialDays(): Promise<number> {
  return TRIAL_DAYS;
}

export async function getWarningDays(): Promise<number> {
  return TRIAL_WARNING_DAYS;
}
