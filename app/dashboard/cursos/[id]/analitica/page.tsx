import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AnalyticsChart } from "@/app/dashboard/_components/analytics-chart";
import { RefreshAnalyticsButton } from "@/app/dashboard/_components/refresh-analytics-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { obtenerCursosProfesor } from "@/services/courseService";
import { getAnalyticsData } from "@/services/analyticsService";

export default async function CourseAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const userIdCookie = cookieStore.get("user_id")?.value;
  const userId = Number(userIdCookie);

  if (!Number.isInteger(userId) || userId <= 0) {
    redirect("/login");
  }

  const { id } = await params;
  const courseId = Number(id);

  if (!Number.isInteger(courseId) || courseId <= 0) {
    redirect("/dashboard/cursos");
  }

  const courses = await obtenerCursosProfesor(userId);
  const currentCourse = courses.find((course) => course.id === courseId);

  if (!currentCourse) {
    redirect("/dashboard/cursos");
  }

  const analytics = await getAnalyticsData(courseId);
  console.log("🚀 ~ CourseAnalyticsPage ~ analytics:", analytics)

  return (
    <section className="space-y-6">
      <Card className="border-slate-200/80 bg-white/90 shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-2">
            <CardTitle className="text-2xl">
              Análisis de Éxito DeLone &amp; McLean
            </CardTitle>
            <p className="text-sm text-slate-600">
              {currentCourse?.fullname ?? `Curso ${courseId}`}
            </p>
            <p className="text-sm text-slate-500">
              Total de encuestas respondidas: {analytics.totalRespondidas}
            </p>
          </div>
          <RefreshAnalyticsButton />
        </CardHeader>
        <CardContent>
          <AnalyticsChart data={analytics.chartData} />
        </CardContent>
      </Card>
    </section>
  );
}
