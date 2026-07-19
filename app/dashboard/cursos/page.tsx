import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CoursesGrid } from "@/app/dashboard/_components/courses-grid";
import { CreateCourseForm } from "@/app/dashboard/_components/create-course-form";
import { obtenerCursosProfesor } from "@/services/courseService";

export default async function DashboardCursosPage() {
  const cookieStore = await cookies();
  const userIdCookie = cookieStore.get("user_id")?.value;
  const userId = Number(userIdCookie);

  if (!Number.isInteger(userId) || userId <= 0) {
    redirect("/login");
  }

  const cursos = await obtenerCursosProfesor(userId);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Cursos</h1>
        <p className="text-sm text-slate-600">
          Listado completo de cursos disponibles.
        </p>
      </div>

      <CreateCourseForm />

      <CoursesGrid courses={cursos} />
    </section>
  );
}
