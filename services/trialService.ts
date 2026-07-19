"use server";

import { type RowDataPacket, type ResultSetHeader } from "mysql2";
import { pool } from "@/lib/db";
import { TRIAL_DAYS, TRIAL_WARNING_DAYS } from "@/lib/constants";

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
       WHERE user_id = ? AND deleted_at IS NULL AND status NOT IN ('EXPIRED', 'CANCELLED')`,
    [userId],
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  const now = new Date();
  const trialEndsAt = new Date(row.trial_ends_at);
  const diffMs = trialEndsAt.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const isExpired = daysRemaining === 0;
  const isWarningPeriod = daysRemaining <= TRIAL_WARNING_DAYS && daysRemaining > 0;

  return {
    userId: row.user_id,
    trialStartDate: new Date(row.trial_start_date),
    trialEndsAt,
    daysRemaining,
    isExpired,
    warningSent: row.warning_sent,
    isWarningPeriod,
    status: row.status,
  };
}

export async function getAllTeachersTrialInfo(): Promise<TeacherTrialInfo[]> {
  const [rows] = await pool.execute<TrialRow[]>(
    `SELECT user_id, trial_start_date, trial_ends_at, warning_sent, deleted_at, status, warning_sent_at, expired_at
        FROM mdl_user_trial
       WHERE deleted_at IS NULL AND status NOT IN ('EXPIRED', 'CANCELLED')`,
  );

  const now = new Date();
  const results: TeacherTrialInfo[] = [];

  for (const row of rows) {
    if (await isAdminUser(row.user_id)) continue;

    const trialEndsAt = new Date(row.trial_ends_at);
    const diffMs = trialEndsAt.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const isExpired = daysRemaining === 0;
    const isWarningPeriod = daysRemaining <= TRIAL_WARNING_DAYS && daysRemaining > 0;

    results.push({
      userId: row.user_id,
      trialStartDate: new Date(row.trial_start_date),
      trialEndsAt,
      daysRemaining,
      isExpired,
      warningSent: row.warning_sent,
      isWarningPeriod,
      status: row.status,
    });
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
  return all.filter((t) => t.isWarningPeriod && !t.warningSent);
}

export async function getExpiredTeachers(): Promise<TeacherTrialInfo[]> {
  const all = await getAllTeachersTrialInfo();
  return all.filter((t) => t.isExpired);
}

export async function getTrialDays(): Promise<number> {
  return TRIAL_DAYS;
}

export async function getWarningDays(): Promise<number> {
  return TRIAL_WARNING_DAYS;
}