import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import {
  CoursesGrid,
  CoursesSkeleton,
} from "@/app/dashboard/_components/courses-grid";

export default async function DashboardCursosPage() {
  const cookieStore = await cookies();
  const userIdCookie = cookieStore.get("user_id")?.value;
  const userId = Number(userIdCookie);

  if (!Number.isInteger(userId) || userId <= 0) {
    redirect("/login");
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Cursos</h1>
        <p className="text-sm text-slate-600">
          Listado completo de cursos disponibles para el profesor.
        </p>
      </div>

      <Suspense fallback={<CoursesSkeleton />}>
        <CoursesGrid userId={userId} />
      </Suspense>
    </section>
  );
}
