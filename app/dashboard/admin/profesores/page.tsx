import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminProfesoresTable } from "@/app/dashboard/_components/admin-profesores-table";
import { obtenerTodosLosProfesores } from "@/services/adminService";
import { getTranslations } from "next-intl/server";

export default async function AdminProfesoresPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;
  const t = await getTranslations("adminProfesores");

  if (role !== "ADMIN") {
    redirect("/dashboard/cursos");
  }

  const profesores = await obtenerTodosLosProfesores();

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
          <AdminProfesoresTable profesores={profesores} />
        </CardContent>
      </Card>
    </section>
  );
}
