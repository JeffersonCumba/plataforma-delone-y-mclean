import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CourseAnalyticsPanel } from "@/app/dashboard/_components/course-analytics-panel";
import { getCourseAnalyticsData } from "@/services/courseAnalyticsService";
import { obtenerCursosProfesor } from "@/services/courseService";
import { obtenerTodosLosCursos } from "@/services/adminService";

export default async function CourseOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const userIdCookie = cookieStore.get("user_id")?.value;
  const userId = Number(userIdCookie);
  const role = cookieStore.get("user_role")?.value;

  if (!Number.isInteger(userId) || userId <= 0) {
    redirect("/login");
  }

  const { id } = await params;
  const courseId = Number(id);

  if (!Number.isInteger(courseId) || courseId <= 0) {
    redirect("/dashboard/cursos");
  }

  let courseName: string;

  if (role === "ADMIN") {
    const allCourses = await obtenerTodosLosCursos();
    const found = allCourses.find((c) => c.id === courseId);
    if (!found) {
      redirect("/dashboard/cursos");
    }
    courseName = found.fullname;
  } else {
    const courses = await obtenerCursosProfesor(userId);
    const currentCourse = courses.find((course) => course.id === courseId);
    if (!currentCourse) {
      redirect("/dashboard/cursos");
    }
    courseName = currentCourse.fullname;
  }

  let analytics: Awaited<ReturnType<typeof getCourseAnalyticsData>>;

  try {
    analytics = await getCourseAnalyticsData(courseId);
  } catch (error) {
    console.error("Error obteniendo analytics del curso:", error);
    redirect("/dashboard/cursos?error=Error al cargar analytics");
  }

  return (
    <CourseAnalyticsPanel
      courseId={courseId}
      courseName={courseName}
      analytics={analytics}
    />
  );
}
