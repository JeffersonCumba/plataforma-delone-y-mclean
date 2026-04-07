import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CoursesGrid } from "@/app/dashboard/_components/courses-grid";
import { obtenerCursosProfesor } from "@/services/courseService";

export default async function DashboardIndexPage() {
  const cookieStore = await cookies();
  const userIdCookie = cookieStore.get("user_id")?.value;
  const userId = Number(userIdCookie);

  if (!Number.isInteger(userId) || userId <= 0) {
    redirect("/login");
  }

  const courses = await obtenerCursosProfesor(userId);

  return (
    <section className="space-y-6">
      <Card className="border-slate-200/80 bg-white/90 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl">Resumen del dashboard</CardTitle>
            <p className="text-sm text-slate-600">
              Vista general con los cursos disponibles del profesor.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/dashboard/cursos">Ver todos los cursos</Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <CoursesGrid userId={userId} limit={3} courses={courses} />
        </CardContent>
      </Card>
    </section>
  );
}
