import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, BookOpen, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pool } from "@/lib/db";
import { obtenerCursosDeProfesor } from "@/services/adminService";
import { getTeacherTrialInfo, getTrialDays } from "@/services/trialService";
import type { RowDataPacket } from "mysql2";
import { TrialTimerHorizontal } from "@/app/dashboard/_components/trial-timer";

interface ProfesorInfoRow extends RowDataPacket {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
}

export default async function AdminProfesorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;

  if (role !== "ADMIN") {
    redirect("/dashboard/cursos");
  }

  const { id } = await params;
  const teacherId = Number(id);

  if (!Number.isInteger(teacherId) || teacherId <= 0) {
    redirect("/dashboard/admin/profesores");
  }

  const [rows] = await pool.execute<ProfesorInfoRow[]>(
    `SELECT id, username, firstname, lastname, email
       FROM mdl_user
      WHERE id = ? AND deleted = 0
      LIMIT 1`,
    [teacherId],
  );

  const profesor = rows[0];
  if (!profesor) {
    redirect("/dashboard/admin/profesores");
  }

  const isAdminUser =
    profesor.username.toLowerCase() === "admin" ||
    (process.env.MOODLE_ADMIN_EMAIL &&
      profesor.email.toLowerCase() ===
        process.env.MOODLE_ADMIN_EMAIL!.toLowerCase());

  const [trialInfo, cursos, TRIAL_DAYS] = await Promise.all([
    isAdminUser ? Promise.resolve(null) : getTeacherTrialInfo(teacherId),
    obtenerCursosDeProfesor(teacherId),
    getTrialDays(),
  ]);

  const daysRemaining = trialInfo?.daysRemaining ?? TRIAL_DAYS;
  const isExpired = trialInfo?.isExpired ?? false;
  const isWarningPeriod = trialInfo?.isWarningPeriod ?? false;
  const trialEndsAt = trialInfo?.trialEndsAt ?? null;

  return (
    <section className="space-y-6">
      <Button
        asChild
        variant="ghost"
        className="w-fit px-0 text-slate-600 hover:bg-transparent hover:text-slate-950"
      >
        <Link href="/dashboard/admin/profesores">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Profesores
        </Link>
      </Button>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Profesor: {profesor.firstname} {profesor.lastname}
          </h1>
          <p className="text-sm text-slate-600">@{profesor.username}</p>
        </div>

        {trialInfo && (
          <div className="flex items-center gap-4">
            <TrialTimerHorizontal
              daysRemaining={daysRemaining}
              isExpired={isExpired}
              isWarningPeriod={isWarningPeriod}
              trialEndsAt={trialEndsAt}
              trialDays={TRIAL_DAYS}
              showLabel={true}
            />
          </div>
        )}
      </div>

      {trialInfo && isExpired && (
        <div className="rounded-xl border-2 border-rose-200 bg-rose-50/80 p-6 text-center">
          <h2 className="text-xl font-semibold text-rose-800">
            Período de prueba expirado
          </h2>
          <p className="mt-1 text-rose-700">
            La cuenta de este profesor ha expirado y sus datos han sido
            eliminados.
          </p>
        </div>
      )}

      {trialInfo && isWarningPeriod && !isExpired && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 animate-pulse" style={{ animationIterationCount: 1 }}>
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-slate-600 flex-shrink-0" />
            <div>
              <h2 className="font-semibold text-slate-800">
                ¡Atención! Prueba por expirar
              </h2>
              <p className="text-slate-600 mt-1">
                Quedan <strong>{daysRemaining} día(s)</strong> para que finalice
                la prueba de 30 días. Contacta al profesor para renovar su
                suscripción.
              </p>
            </div>
          </div>
        </div>
      )}

      <Card className="border-slate-200/80 bg-white/90 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Perfil del Profesor</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Usuario
              </dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">
                {profesor.username}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Nombre completo
              </dt>
              <dd className="mt-1 text-sm text-slate-900">
                {profesor.firstname} {profesor.lastname}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Correo
              </dt>
              <dd className="mt-1 text-sm text-slate-600">{profesor.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Cursos asignados
              </dt>
              <dd className="mt-1 text-sm text-slate-900">{cursos.length}</dd>
            </div>
            {trialInfo && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Período de prueba
                </dt>
                <dd className="mt-1">
                  <TrialTimerHorizontal
                    daysRemaining={daysRemaining}
                    isExpired={isExpired}
                    isWarningPeriod={isWarningPeriod}
                    trialEndsAt={trialEndsAt}
                    trialDays={TRIAL_DAYS}
                    showLabel={true}
                  />
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 bg-white/90 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Cursos del Profesor</CardTitle>
        </CardHeader>
        <CardContent>
          {cursos.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-slate-600">
              Este profesor no tiene cursos asignados.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {cursos.map((curso) => (
                <Link
                  key={curso.id}
                  href={`/dashboard/cursos/${curso.id}`}
                  className="group block rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {curso.fullname}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {curso.shortname}
                  </p>
                  <div className="mt-3 flex items-center text-xs font-medium text-cyan-700">
                    <span className="group relative inline-block cursor-pointer py-0.5">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        Ver analítica
                      </span>

                      <span className="absolute bottom-0 left-0 h-px w-0 bg-cyan-700 transition-all duration-300 ease-out group-hover:w-full"></span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
