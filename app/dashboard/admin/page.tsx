import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, ClipboardList, GraduationCap, UserCheck, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { obtenerEstadisticasGenerales } from "@/services/adminService";
import { getTranslations } from "next-intl/server";

export default async function AdminOverviewPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;
  const t = await getTranslations("admin");

  if (role !== "ADMIN") {
    redirect("/dashboard/cursos");
  }

  const stats = await obtenerEstadisticasGenerales();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          {t("panelTitle")}
        </h1>
        <p className="text-sm text-slate-600">
          {t("panelDescription")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-slate-200/80 bg-white/95 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              {t("profesores")}
            </CardTitle>
            <GraduationCap className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">
              {stats.totalProfesores}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/95 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              {t("courses")}
            </CardTitle>
            <BookOpen className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">
              {stats.totalCursos}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/95 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              {t("estudiantes")}
            </CardTitle>
            <Users className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">
              {stats.totalEstudiantes}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/95 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              {t("encuestas")}
            </CardTitle>
            <ClipboardList className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-slate-900">
              {stats.totalEncuestas}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200/80 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t("alumnosManagement")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              {t("alumnosManagementDesc")}
            </p>
            <Button asChild>
              <Link href="/dashboard/admin/alumnos">
                <UserCheck className="mr-2 h-4 w-4" />
                {t("goToAlumnos")}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t("profesoresManagement")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              {t("profesoresManagementDesc")}
            </p>
            <Button asChild>
              <Link href="/dashboard/admin/profesores">
                <GraduationCap className="mr-2 h-4 w-4" />
                {t("goToProfesores")}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t("coursesManagement")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              {t("coursesManagementDesc")}
            </p>
            <Button asChild>
              <Link href="/dashboard/admin/cursos">
                <BookOpen className="mr-2 h-4 w-4" />
                {t("goToCourses")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
