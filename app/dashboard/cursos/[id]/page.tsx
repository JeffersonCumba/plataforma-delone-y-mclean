import { redirect } from "next/navigation";

import { CourseAnalyticsPanel } from "@/app/dashboard/_components/course-analytics-panel";
import { getCourseAnalyticsData } from "@/services/courseAnalyticsService";
import { obtenerCursosProfesor } from "@/services/courseService";
import { requireAuth } from "@/lib/auth";
import { getServerLocale } from "@/lib/server-locale";

export default async function CourseOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const locale = await getServerLocale();
  const { userId, role } = await requireAuth();

  if (role === "ADMIN") {
    redirect("/dashboard/admin/cursos");
  }

  const { id } = await params;
  const courseId = Number(id);

  if (!Number.isInteger(courseId) || courseId <= 0) {
    redirect("/dashboard/cursos");
  }

  const courses = await obtenerCursosProfesor(userId, locale);
  const currentCourse = courses.find((course) => course.id === courseId);
  if (!currentCourse) {
    redirect("/dashboard/cursos");
  }
  const courseName = currentCourse.fullname;

  let analytics: Awaited<ReturnType<typeof getCourseAnalyticsData>>;

  try {
    analytics = await getCourseAnalyticsData(courseId, locale);
  } catch (error) {
    console.error("Error obteniendo analytics del curso:", error);
    redirect("/dashboard/cursos?error=Error al cargar analytics");
  }

  return (
    <section className="space-y-6">
      <CourseAnalyticsPanel
        courseId={courseId}
        courseName={courseName}
        analytics={analytics}
      />
    </section>
  );
}
