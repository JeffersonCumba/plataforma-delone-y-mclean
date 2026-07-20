import Link from "next/link";
import { Upload, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EncuestadosTable } from "@/app/dashboard/_components/encuestados-table";
import type { EncuestadoRow } from "@/types/encuestado";
import { MatricularUsuarioDialog } from "@/app/dashboard/_components/matricular-usuario-dialog";
import { obtenerCursosProfesor } from "@/services/courseService";
import { obtenerEncuestadosPorCurso } from "@/services/respondentService";
import { obtenerIdsProfesoresDeCursos } from "@/services/adminService";
import type { MoodleCourse } from "@/types/course";

import { requireAuth } from "@/lib/auth";

export default async function DashboardEncuestadosPage() {
  const { userId } = await requireAuth();

  const courses: MoodleCourse[] = await obtenerCursosProfesor(userId);

  const respondentsByCourse = await Promise.all(
    courses.map(async (course) => {
      const respondents = await obtenerEncuestadosPorCurso(course.id);

      return respondents.map<EncuestadoRow>((respondent) => ({
        id: respondent.id,
        username: respondent.username,
        fullname: respondent.fullname,
        email: respondent.email ?? "Sin email",
        courseId: course.id,
        courseName: course.fullname,
      }));
    }),
  );

  const respondents = respondentsByCourse.flat();

  const teacherMap = courses.length > 0
    ? await obtenerIdsProfesoresDeCursos(courses.map((c) => c.id))
    : new Map<number, Set<number>>();

  return (
    <section className="space-y-6">
      <Card className="border-slate-200/80 bg-white/90 shadow-sm">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-2xl">Encuestados</CardTitle>
            <p className="text-sm text-slate-600">
              Tabla general de usuarios matriculados en los cursos.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="lg">
              <Link href="/dashboard/encuestados/matricular">
                <Upload className="mr-2 h-4 w-4" />
                Matricular CSV
              </Link>
            </Button>
            <MatricularUsuarioDialog
              courses={courses}
              trigger={
                <Button size="lg">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Matricular usuario
                </Button>
              }
            />
          </div>
        </CardHeader>

        <CardContent>
          {respondents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-slate-600">
              No hay encuestados matriculados por el momento.
            </div>
          ) : (
            <EncuestadosTable rows={respondents} courses={courses} teacherMap={teacherMap} />
          )}
        </CardContent>
      </Card>
    </section>
  );
}
