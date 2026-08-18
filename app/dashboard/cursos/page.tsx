import { CoursesGrid } from "@/app/dashboard/_components/courses-grid";
import { CreateCourseForm } from "@/app/dashboard/_components/create-course-form";
import { obtenerCursosProfesor } from "@/services/courseService";
import { requireAuth } from "@/lib/auth";
import { getServerLocale } from "@/lib/server-locale";
import { getTranslations } from "next-intl/server";

export default async function DashboardCursosPage() {
  const { userId } = await requireAuth();
  const locale = await getServerLocale();
  const t = await getTranslations("courses");

  const cursos = await obtenerCursosProfesor(userId, locale);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{t("title")}</h1>
        <p className="text-sm text-slate-600">
          {t("description")}
        </p>
      </div>

      <CreateCourseForm courseCount={cursos.length} />

      <CoursesGrid courses={cursos} />
    </section>
  );
}
