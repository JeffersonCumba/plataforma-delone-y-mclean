import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import { ProfileClient } from "./profile-client";
import { obtenerCursosDeProfesor } from "@/services/adminService";
import { getTeacherTrialInfo, getTrialDays } from "@/services/trialService";

export default async function ProfesorPerfilPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;
  const userId = cookieStore.get("user_id")?.value;

  if (role !== "EVALUADOR" || !userId) {
    redirect("/dashboard/cursos");
  }

  const teacherId = Number(userId);

  const [courses, trialInfo, TRIAL_DAYS] = await Promise.all([
    obtenerCursosDeProfesor(teacherId),
    getTeacherTrialInfo(teacherId),
    getTrialDays(),
  ]);

  const [rows] = await pool.execute(
    `SELECT username, firstname, lastname, email FROM mdl_user WHERE id = ?`,
    [teacherId]
  );
  const user = (rows as any[])[0] || { username: "", firstname: "", lastname: "", email: "" };

  const daysRemaining = trialInfo?.daysRemaining ?? TRIAL_DAYS;
  const isExpired = trialInfo?.isExpired ?? false;
  const isWarningPeriod = trialInfo?.isWarningPeriod ?? false;
  const trialEndsAt = trialInfo?.trialEndsAt ?? null;
  const trialStartDate = trialInfo?.trialStartDate ?? null;

  return <ProfileClient
    courses={courses}
    trialDays={TRIAL_DAYS}
    trialInfo={{
      daysRemaining,
      isExpired,
      isWarningPeriod,
      trialEndsAt,
      trialStartDate,
    }}
    user={{
      username: user.username,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
    }}
  />;
}