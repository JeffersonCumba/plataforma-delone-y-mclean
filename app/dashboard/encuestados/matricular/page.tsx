import { CSVUploader } from "@/app/dashboard/_components/CSVUploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { obtenerCursosProfesor } from "@/services/courseService";
import { requireAuth } from "@/lib/auth";
import { getServerLocale } from "@/lib/server-locale";
import { getTranslations } from "next-intl/server";

export default async function DashboardEncuestadosMatricularPage() {
  const { userId } = await requireAuth();
  const locale = await getServerLocale();
  const t = await getTranslations("matricular");

  const courses = await obtenerCursosProfesor(userId, locale);

  return (
    <section className="space-y-6">
      <Card className="border-slate-200/80 bg-white/90 shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{t("title")}</CardTitle>
              <p className="text-sm text-slate-600">
                {t("description")}
              </p>
            </div>
            <div>
              <a href="/documentos/ejemplo.csv" download>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  {t("downloadExampleCsv")}
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
