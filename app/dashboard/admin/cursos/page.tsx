import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminCursosTable } from "@/app/dashboard/_components/admin-cursos-table";
import { obtenerTodosLosCursos } from "@/services/adminService";

export default async function AdminCursosPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;

  if (role !== "ADMIN") {
    redirect("/dashboard/cursos");
  }

  const cursos = await obtenerTodosLosCursos();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Cursos</h1>
        <p className="text-sm text-slate-600">
          Gestión de todos los cursos creados en Moodle.
        </p>
      </div>

      <Card className="border-slate-200/80 bg-white/90 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Listado de Cursos</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminCursosTable cursos={cursos} />
        </CardContent>
      </Card>
    </section>
  );
}
