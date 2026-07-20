import { CoursesGrid } from "@/app/dashboard/_components/courses-grid";
import { CreateCourseForm } from "@/app/dashboard/_components/create-course-form";
import { obtenerCursosProfesor } from "@/services/courseService";
import { requireAuth } from "@/lib/auth";

export default async function DashboardCursosPage() {
  const { userId } = await requireAuth();

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
