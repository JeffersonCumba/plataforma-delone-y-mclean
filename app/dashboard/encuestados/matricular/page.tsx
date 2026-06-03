import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CSVUploader } from "@/app/dashboard/_components/CSVUploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { obtenerCursosProfesor } from "@/services/courseService";

export default async function DashboardEncuestadosMatricularPage() {
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
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">Matricular Encuestados</CardTitle>
              <p className="text-sm text-slate-600">
                Carga un CSV para registrar estudiantes y matricularlos al curso
                seleccionado.
              </p>
            </div>
            <div>
              <a href="/documentos/ejemplo.csv" download>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Descargar ejemplo CSV
                </Button>
              </a>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CSVUploader courses={courses} />
        </CardContent>
      </Card>
    </section>
  );
}
