import Link from "next/link";
import { getTranslations } from "next-intl/server";
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
import { EmailVerificationBanner } from "@/components/email-verification-banner";
import { isEmailVerified } from "@/services/emailVerificationService";

import { requireAuth } from "@/lib/auth";

export default async function DashboardIndexPage() {
  const { userId, role, email } = await requireAuth();
  const t = await getTranslations("dashboard");

  if (role === "ADMIN") {
    const stats = await obtenerEstadisticasGenerales();

    return (
      <section className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t("adminPanelTitle")}</h1>
          <p className="text-sm text-slate-500">{t("adminPanelDescription")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{t("profesores")}</CardTitle>
              <GraduationCap className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">{stats.totalProfesores}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{t("courses")}</CardTitle>
              <BookOpen className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">{stats.totalCursos}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{t("estudiantes")}</CardTitle>
              <UsersRound className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">{stats.totalEstudiantes}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{t("encuestas")}</CardTitle>
              <ClipboardList className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-slate-900">{stats.totalEncuestas}</p>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">{t("quickAccess")}</h2>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/admin/profesores">
                <GraduationCap className="mr-2 h-4 w-4" />
                {t("profesores")}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/admin/cursos">
                <BookOpen className="mr-2 h-4 w-4" />
                {t("courses")}
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/admin/alumnos">
                <UserCheck className="mr-2 h-4 w-4" />
                {t("estudiantes")}
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

  const emailVerified = await isEmailVerified(userId);

  return (
    <section className="space-y-8">
      {!emailVerified && role === "EVALUADOR" && (
        <EmailVerificationBanner email={email} />
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t("myPanelTitle")}</h1>
          <p className="text-sm text-slate-500">{t("myPanelDescription")}</p>
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
              <h3 className="text-lg font-semibold text-rose-800">{t("trialExpiredTitle")}</h3>
              <p className="mt-1 text-sm text-rose-700">
                {t("trialExpiredDescription")}
              </p>
            </div>
          </div>
        </div>
      )}

      {isWarningPeriod && !isExpired && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 animate-pulse" style={{ animationIterationCount: 1 }}>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-200/40">
              <AlertTriangle className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800">{t("trialWarningTitle")}</h3>
              <p className="mt-1 text-slate-600">
                {t.rich("trialWarningDays", {
                  days: daysRemaining,
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">{t("activeCourses")}</CardTitle>
            <BookOpen className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">{courses.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">{t("estudiantes")}</CardTitle>
            <UsersRound className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">{totalStudents}</p>
            <p className="text-xs text-slate-500">{t("enrolledStudents")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">{t("encuestas")}</CardTitle>
            <ClipboardList className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">{totalSurveys}</p>
            <p className="text-xs text-slate-500">{t("completedSurveys")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">{t("trialPeriod")}</CardTitle>
            <Clock className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold text-slate-900">{t("daysOfTrial", { days: daysRemaining, trialDays: TRIAL_DAYS })}</p>
                <p className="text-sm text-slate-500">
                  {isExpired ? t("expired") : isWarningPeriod ? t("aboutToExpire") : t("active")}
                </p>
              </div>
              <span className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                isExpired && "bg-rose-100 text-rose-700",
                isWarningPeriod && "bg-amber-100 text-amber-700",
                !isExpired && !isWarningPeriod && "bg-emerald-100 text-emerald-700",
              )}>
                {isExpired ? (
                  <><XCircle className="mr-1 h-3 w-3" /> {t("expiredBadge")}</>
                ) : isWarningPeriod ? (
                  <><AlertTriangle className="mr-1 h-3 w-3 text-slate-600 animate-pulse" style={{ animationIterationCount: 1 }} /> {t("aboutToExpireBadge")}</>
                ) : (
                  <><CheckCircle className="mr-1 h-3 w-3" /> {t("activeBadge")}</>
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">{t("quickAccess")}</h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="default" size="sm">
            <Link href="/dashboard/cursos">
              <BookOpen className="mr-2 h-4 w-4" />
              {t("myCourses")}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/encuestados">
              <UsersRound className="mr-2 h-4 w-4" />
              {t("encuestados")}
            </Link>
          </Button>
        </div>
      </div>

      {courses.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{t("yourCourses")}</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/cursos">
                  <Activity className="mr-2 h-4 w-4" />
                  {t("viewAll")}
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t("shortName")}</th>
                    <th className="px-4 py-3 font-medium">{t("fullName")}</th>
                    <th className="px-4 py-3 font-medium">{t("actions")}</th>
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
                            {t("analytics")}
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
