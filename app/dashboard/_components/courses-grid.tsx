import Link from "next/link";
import { FolderClosed } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { MoodleCourse } from "@/services/courseService";
import { obtenerCursosProfesor } from "@/services/courseService";

function cleanSummary(summary?: string): string {
  if (!summary) {
    return "Sin descripcion disponible";
  }

  return summary.replace(/<[^>]*>/g, "").trim() || "Sin descripcion disponible";
}

export function CoursesSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="border-slate-200/80 bg-white/90">
          <CardHeader className="space-y-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export async function CoursesGrid({
  userId,
  limit,
  courses,
}: {
  userId: number;
  limit?: number;
  courses?: MoodleCourse[];
}) {
  const cursos = courses ?? (await obtenerCursosProfesor(userId));
  const visibleCourses =
    typeof limit === "number" ? cursos.slice(0, limit) : cursos;

  if (visibleCourses.length === 0) {
    return (
      <Card className="border-dashed border-slate-300 bg-white/80">
        <CardContent className="py-10 text-center text-slate-600">
          No hay cursos asignados para este profesor.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {visibleCourses.map((curso) => (
        <Card key={curso.id} className="border-slate-200/80 bg-white/90">
          <CardHeader className="space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
              <FolderClosed className="h-5 w-5" />
            </div>
            <CardTitle className="line-clamp-2 text-lg leading-6">
              {curso.fullname}
            </CardTitle>
            <p className="text-xs text-slate-500">{curso.shortname}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="line-clamp-3 text-sm text-slate-600">
              {cleanSummary(curso.summary)}
            </p>
            <Button asChild className="w-full" size="lg">
              <Link href={`/dashboard/cursos/${curso.id}/analitica`}>
                Ver analítica
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
