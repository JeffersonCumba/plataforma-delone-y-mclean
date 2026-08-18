import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminAlumnosTable } from "@/app/dashboard/_components/admin-alumnos-table";
import { obtenerTodosLosAlumnos } from "@/services/adminService";
import { getTranslations } from "next-intl/server";

export default async function AdminAlumnosPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;
  const t = await getTranslations("adminAlumnos");

  if (role !== "ADMIN") {
    redirect("/dashboard/cursos");
  }

  const alumnos = await obtenerTodosLosAlumnos();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{t("title")}</h1>
        <p className="text-sm text-slate-600">{t("description")}</p>
      </div>

      <Card className="border-slate-200/80 bg-white/90 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">{t("listTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminAlumnosTable alumnos={alumnos} />
        </CardContent>
      </Card>
    </section>
  );
}
