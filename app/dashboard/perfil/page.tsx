import { type RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { ProfileClient } from "@/app/dashboard/profesor/perfil/profile-client";
import { obtenerCursosDeProfesor } from "@/services/adminService";
import { getTeacherTrialInfo, getTrialDays } from "@/services/trialService";
import { requireAuth } from "@/lib/auth";

export default async function PerfilPage() {
  const { userId: profileId, role } = await requireAuth();

  const [rows] = await pool.execute<(RowDataPacket & { username: string; firstname: string; lastname: string; email: string })[]>(
    `SELECT username, firstname, lastname, email FROM mdl_user WHERE id = ? AND deleted = 0`,
    [profileId],
  );
  const user = rows[0] || { username: "", firstname: "", lastname: "", email: "" };

  if (role === "EVALUADOR") {
    const [courses, trialInfo, TRIAL_DAYS] = await Promise.all([
      obtenerCursosDeProfesor(profileId),
      getTeacherTrialInfo(profileId),
      getTrialDays(),
    ]);

    const daysRemaining = trialInfo?.daysRemaining ?? TRIAL_DAYS;
    const isExpired = trialInfo?.isExpired ?? false;
    const isWarningPeriod = trialInfo?.isWarningPeriod ?? false;
    const trialEndsAt = trialInfo?.trialEndsAt ?? null;
    const trialStartDate = trialInfo?.trialStartDate ?? null;

    return (
      <ProfileClient
        courses={courses}
        trialDays={TRIAL_DAYS}
        trialInfo={{ daysRemaining, isExpired, isWarningPeriod, trialEndsAt, trialStartDate }}
        user={{ username: user.username, firstname: user.firstname, lastname: user.lastname, email: user.email }}
      />
    );
  }

  return (
    <ProfileClient
      courses={[]}
      trialDays={0}
      trialInfo={{ daysRemaining: 0, isExpired: false, isWarningPeriod: false, trialEndsAt: null, trialStartDate: null }}
      user={{ username: user.username, firstname: user.firstname, lastname: user.lastname, email: user.email }}
    />
  );
}
