import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  Activity,
  BookOpen,
  CheckCircle,
  ClipboardList,
  Clock,
  GraduationCap,
  Plus,
  UserCheck,
  UsersRound,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { obtenerCursosDeProfesor, obtenerEstadisticasGenerales, obtenerEstudiantesDeProfesor, obtenerEncuestasDeProfesor } from "@/services/adminService";
import { getTeacherTrialInfo, getTrialDays } from "@/services/trialService";
import { TrialTimerHorizontal } from "@/app/dashboard/_components/trial-timer";

export default async function DashboardIndexPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value as "ADMIN" | "EVALUADOR" | undefined;
  const userIdCookie = cookieStore.get("user_id")?.value;
  const userId = Number(userIdCookie);

  if (!role || !Number.isInteger(userId) || userId <= 0) {
    return redirect("/login");
  }

  if (role === "ADMIN") {
    const stats = await obtenerEstadisticasGenerales();

    return (
      <section className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Panel General</h1>
          <p className="text-sm text-slate-500">Resumen general de la plataforma.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Profesores</CardTitle>
              <GraduationCap className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">{stats.totalProfesores}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Cursos</CardTitle>
              <BookOpen className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">{stats.totalCursos}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Estudiantes</CardTitle>
              <UsersRound className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">{stats.totalEstudiantes}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Encuestas</CardTitle>
              <ClipboardList className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">{stats.totalEncuestas}</p>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Acceso rápido</h2>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/admin/profesores">
                <GraduationCap className="mr-2 h-4 w-4" />
                Profesores
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/admin/cursos">
                <BookOpen className="mr-2 h-4 w-4" />
                Cursos
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/admin/alumnos">
                <UserCheck className="mr-2 h-4 w-4" />
                Alumnos
              </Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const [courses, trialInfo, TRIAL_DAYS, totalStudents, totalSurveys] = await Promise.all([
    obtenerCursosDeProfesor(userId),
    getTeacherTrialInfo(userId),
    getTrialDays(),
    obtenerEstudiantesDeProfesor(userId),
    obtenerEncuestasDeProfesor(userId),
  ]);

  const daysRemaining = trialInfo?.daysRemaining ?? TRIAL_DAYS;
  const isExpired = trialInfo?.isExpired ?? false;
  const isWarningPeriod = trialInfo?.isWarningPeriod ?? false;
  const trialEndsAt = trialInfo?.trialEndsAt ?? null;

  return (
    <section className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Mi Panel</h1>
          <p className="text-sm text-slate-500">Resumen de tus cursos y período de prueba.</p>
        </div>
        <TrialTimerHorizontal
          daysRemaining={daysRemaining}
          isExpired={isExpired}
          isWarningPeriod={isWarningPeriod}
          trialEndsAt={trialEndsAt}
          trialDays={TRIAL_DAYS}
          showLabel
        />
      </div>

      {isExpired && (
        <div className="rounded-xl border-2 border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-100">
              <XCircle className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-rose-800">Tu período de prueba ha expirado</h3>
              <p className="mt-1 text-sm text-rose-700">
                Tu cuenta y todos los datos asociados han sido eliminados permanentemente.
                Contacta al administrador para renovar tu acceso.
              </p>
            </div>
          </div>
        </div>
      )}

      {isWarningPeriod && !isExpired && (
        <div className="animate-pulse rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-amber-800">¡Atención! Tu prueba está por expirar</h3>
              <p className="mt-1 text-amber-700">
                Quedan <strong>{daysRemaining} día(s)</strong> para que finalice tu período de prueba.
                Contacta al administrador para renovar tu suscripción.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Cursos Activos</CardTitle>
            <BookOpen className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">{courses.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Estudiantes</CardTitle>
            <UsersRound className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">{totalStudents}</p>
            <p className="text-xs text-slate-500">Matriculados en tus cursos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Encuestas</CardTitle>
            <ClipboardList className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">{totalSurveys}</p>
            <p className="text-xs text-slate-500">Completadas por tus estudiantes</p>
          </CardContent>
        </Card>

        <Card>
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
              <span className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                isExpired && "bg-rose-100 text-rose-700",
                isWarningPeriod && "bg-amber-100 text-amber-700",
                !isExpired && !isWarningPeriod && "bg-emerald-100 text-emerald-700",
              )}>
                {isExpired ? (
                  <><XCircle className="mr-1 h-3 w-3" /> Expirada</>
                ) : isWarningPeriod ? (
                  <><AlertTriangle className="mr-1 h-3 w-3 animate-pulse" /> Por expirar</>
                ) : (
                  <><CheckCircle className="mr-1 h-3 w-3" /> Activa</>
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Acceso rápido</h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="default" size="sm">
            <Link href="/dashboard/cursos">
              <BookOpen className="mr-2 h-4 w-4" />
              Mis Cursos
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/encuestados">
              <UsersRound className="mr-2 h-4 w-4" />
              Encuestados
            </Link>
          </Button>
        </div>
      </div>

      {courses.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Tus Cursos</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/cursos">
                  <Activity className="mr-2 h-4 w-4" />
                  Ver todos
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
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
                  {courses.slice(0, 5).map((course) => (
                    <tr key={course.id} className="border-t border-slate-200 bg-white text-slate-800">
                      <td className="px-4 py-3 font-medium">{course.shortname}</td>
                      <td className="px-4 py-3">{course.fullname}</td>
                      <td className="px-4 py-3">
                        <Button asChild variant="ghost" size="sm" className="h-8 px-2">
                          <Link href={`/dashboard/cursos/${course.id}`}>
                            <BookOpen className="mr-1 h-3.5 w-3.5" />
                            Analítica
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
