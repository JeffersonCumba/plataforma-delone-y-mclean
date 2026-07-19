import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, CheckCircle, Clock, RefreshCw, Users, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { obtenerCursosDeProfesor } from "@/services/adminService";
import { getTeacherTrialInfo, getTrialDays } from "@/services/trialService";
import type { MoodleCourse } from "@/types/course";
import { TrialTimerHorizontal } from "@/app/dashboard/_components/trial-timer";

export default async function ProfesorDashboardPage() {
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

  const daysRemaining = trialInfo?.daysRemaining ?? TRIAL_DAYS;
  const isExpired = trialInfo?.isExpired ?? false;
  const isWarningPeriod = trialInfo?.isWarningPeriod ?? false;
  const trialEndsAt = trialInfo?.trialEndsAt ?? null;

  return (
    <section className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Mi Panel</h1>
            <p className="text-sm text-slate-600">
              Cursos asignados y período de prueba.
            </p>
          </div>
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
        </div>

        {isExpired && (
          <div className="mt-4 p-4 rounded-xl border-2 border-rose-200 bg-rose-50">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-rose-800">Tu período de prueba ha expirado</h3>
                <p className="text-sm text-rose-700 mt-1">
                  Tu cuenta y todos los datos asociados (cursos, estudiantes, encuestas) han sido eliminados permanentemente.
                  Contacta al administrador para renovar tu acceso.
                </p>
              </div>
            </div>
          </div>
        )}

        {isWarningPeriod && !isExpired && (
          <div className="mt-4 p-4 rounded-xl border-2 border-amber-200 bg-amber-50 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-amber-800">¡Atención! Tu prueba está por expirar</h3>
                <p className="text-amber-700 mt-1">
                  Quedan <strong>{daysRemaining} día(s)</strong> para que finalice tu período de prueba de {TRIAL_DAYS} días.
                  Tu cuenta y todos los datos serán eliminados automáticamente al llegar a 0 días.
                </p>
                <p className="text-amber-700 mt-2 text-sm">
                  Contacta al administrador para renovar tu suscripción y conservar tus cursos y datos.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200/80 bg-white/95 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Cursos Activos</CardTitle>
            <BookOpen className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">{courses.length}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/95 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Período de Prueba</CardTitle>
            <Clock className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold text-slate-900">{daysRemaining} / {TRIAL_DAYS} días</p>
                <p className="text-sm text-slate-500">
                  {isExpired ? "Expirado" : isWarningPeriod ? "¡Por expirar!" : "Activo"}
                </p>
              </div>
              <TrialTimerHorizontal
                daysRemaining={daysRemaining}
                isExpired={isExpired}
                isWarningPeriod={isWarningPeriod}
                trialEndsAt={trialEndsAt}
                trialDays={TRIAL_DAYS}
                showLabel={false}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/95 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Estado de la Cuenta</CardTitle>
            <Users className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <span className={cn(
                "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ring-1",
                isExpired && "bg-rose-50 text-rose-700 ring-rose-200",
                isWarningPeriod && "bg-amber-50 text-amber-700 ring-amber-200",
                !isExpired && !isWarningPeriod && "bg-emerald-50 text-emerald-700 ring-emerald-200",
              )}>
                {isExpired ? (
                  <>
                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                    Expirada
                  </>
                ) : isWarningPeriod ? (
                  <>
                    <AlertTriangle className="mr-1.5 h-3.5 w-3.5 animate-pulse" />
                    Por expirar
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                    Activa
                  </>
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200/80 bg-white/95 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Mis Cursos</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/cursos">
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualizar
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-slate-600">
              No tienes cursos asignados todavía.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nombre Corto</th>
                    <th className="px-4 py-3 font-medium">Nombre Completo</th>
                    <th className="px-4 py-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course: MoodleCourse) => (
                    <tr key={course.id} className="border-t border-slate-200 bg-white text-slate-800">
                      <td className="px-4 py-3 font-medium">{course.shortname}</td>
                      <td className="px-4 py-3">{course.fullname}</td>
                      <td className="px-4 py-3">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                        >
                          <Link href={`/dashboard/cursos/${course.id}`}>
                            <BookOpen className="mr-1 h-3.5 w-3.5" />
                            Ver Analítica
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}