import { type RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { ProfileClient } from "@/app/dashboard/profesor/perfil/profile-client";
import { obtenerCursosDeProfesor } from "@/services/adminService";
import { getTeacherTrialInfo, getTrialDays } from "@/services/trialService";
import { requireAuth } from "@/lib/auth";

interface ProfileUserRow extends RowDataPacket {
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  timecreated: number;
}

export default async function PerfilPage() {
  const { userId: profileId, role } = await requireAuth();

  const [rows] = await pool.execute<ProfileUserRow[]>(
    `SELECT username, firstname, lastname, email, timecreated FROM mdl_user WHERE id = ? AND deleted = 0`,
    [profileId],
  );
  const user = rows[0] || {
    username: "",
    firstname: "",
    lastname: "",
    email: "",
    timecreated: 0,
  };

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

    return (
      <ProfileClient
        courses={courses}
        trialDays={TRIAL_DAYS}
        trialInfo={{ daysRemaining, isExpired, isWarningPeriod, trialEndsAt }}
        user={{
          username: user.username,
          firstname: user.firstname,
          lastname: user.lastname,
          email: user.email,
          createdAt: user.timecreated || null,
        }}
      />
    );
  }

  return (
    <ProfileClient
      courses={[]}
      trialDays={0}
      trialInfo={{
        daysRemaining: 0,
        isExpired: false,
        isWarningPeriod: false,
        trialEndsAt: null,
      }}
      user={{
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        createdAt: user.timecreated || null,
      }}
    />
  );
}
