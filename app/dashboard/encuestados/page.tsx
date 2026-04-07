import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { obtenerCursosProfesor } from "@/services/courseService";
import { obtenerEncuestadosPorCurso } from "@/services/respondentService";

interface SurveyRespondentRow {
  id: number;
  username: string;
  fullname: string;
  email: string;
  courseName: string;
}

export default async function DashboardEncuestadosPage() {
  const cookieStore = await cookies();
  const userIdCookie = cookieStore.get("user_id")?.value;
  const userId = Number(userIdCookie);

  if (!Number.isInteger(userId) || userId <= 0) {
    redirect("/login");
  }

  const courses = await obtenerCursosProfesor(userId);

  const respondentsByCourse = await Promise.all(
    courses.map(async (course) => {
      const respondents = await obtenerEncuestadosPorCurso(course.id);

      return respondents.map<SurveyRespondentRow>((respondent) => ({
        id: respondent.id,
        username: respondent.username,
        fullname: respondent.fullname,
        email: respondent.email ?? "Sin email",
        courseName: course.fullname,
      }));
    }),
  );

  const respondents = respondentsByCourse.flat();

  return (
    <section className="space-y-6">
      <Card className="border-slate-200/80 bg-white/90 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl">Encuestados</CardTitle>
            <p className="text-sm text-slate-600">
              Tabla general de usuarios matriculados en tus cursos.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/dashboard/encuestados/matricular">Matricular</Link>
          </Button>
        </CardHeader>

        <CardContent>
          {respondents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-slate-600">
              No hay encuestados matriculados por el momento.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-190 text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Usuario</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Curso</th>
                  </tr>
                </thead>
                <tbody>
                  {respondents.map((row) => (
                    <tr
                      key={`${row.id}-${row.courseName}`}
                      className="border-t border-slate-200 bg-white text-slate-800"
                    >
                      <td className="px-4 py-3">{row.fullname}</td>
                      <td className="px-4 py-3">{row.username}</td>
                      <td className="px-4 py-3">{row.email}</td>
                      <td className="px-4 py-3">{row.courseName}</td>
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
