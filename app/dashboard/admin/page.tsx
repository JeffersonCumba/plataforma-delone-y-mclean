import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, ClipboardList, GraduationCap, UserCheck, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { obtenerEstadisticasGenerales } from "@/services/adminService";

export default async function AdminOverviewPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;

  if (role !== "ADMIN") {
    redirect("/dashboard/cursos");
  }

  const stats = await obtenerEstadisticasGenerales();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Panel de Administración
        </h1>
        <p className="text-sm text-slate-600">
          Resumen general de la plataforma DeLone y McLean.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-slate-200/80 bg-white/95 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Profesores
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
              Cursos
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
              Estudiantes
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
              Encuestas
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
            <CardTitle className="text-lg">Gestión de Alumnos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              Administra los alumnos registrados en la plataforma: crea,
              consulta y elimina cuentas de estudiante.
            </p>
            <Button asChild>
              <Link href="/dashboard/admin/alumnos">
                <UserCheck className="mr-2 h-4 w-4" />
                Ir a Alumnos
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Gestión de Profesores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              Administra los profesores registrados en la plataforma: crea,
              consulta y elimina cuentas de profesor.
            </p>
            <Button asChild>
              <Link href="/dashboard/admin/profesores">
                <GraduationCap className="mr-2 h-4 w-4" />
                Ir a Profesores
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Gestión de Cursos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              Visualiza todos los cursos creados en Moodle, sus profesores
              asignados y métricas de participación.
            </p>
            <Button asChild>
              <Link href="/dashboard/admin/cursos">
                <BookOpen className="mr-2 h-4 w-4" />
                Ir a Cursos
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
